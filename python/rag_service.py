#!/usr/bin/env python3
import os
import sys
import json
import logging
import argparse
import time
import requests
from datetime import datetime
import psycopg2
import psycopg2.extras

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("rag_service")

# We'll use a keyword-based approach locally without any external API
# This allows us to work without requiring any API keys

# Database connection parameters from environment variables
db_params = {
    "host": os.getenv("PGHOST", "localhost"),
    "database": os.getenv("PGDATABASE", "postgres"),
    "user": os.getenv("PGUSER", "postgres"),
    "password": os.getenv("PGPASSWORD", "lakshman&66"),
    "port": os.getenv("PGPORT", "5432")
}

def get_db_connection():
    """Establish a database connection."""
    try:
        conn = psycopg2.connect(**db_params)
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise

def get_face_registration_data():
    """Get all face registration data from the database."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Query to get all face registration data
        cur.execute("""
            SELECT id, name, created_at
            FROM faces
            ORDER BY created_at DESC
        """)
        
        faces = cur.fetchall()
        
        cur.close()
        conn.close()
        
        # Format the data as text for RAG
        registration_data = []
        for face in faces:
            registration_text = (
                f"Person ID: {face['id']}, "
                f"Name: {face['name']}, "
                f"Registered at: {face['created_at'].isoformat()}"
            )
            registration_data.append(registration_text)
        
        return registration_data
    except Exception as e:
        logger.error(f"Error getting face registration data: {e}")
        raise

def initialize_rag_system():
    """Initialize a simple retrieval system (no vector search)."""
    try:
        # Get face registration data
        registration_texts = get_face_registration_data()
        
        if not registration_texts:
            logger.warning("No face registration data found")
            return None
        
        # Simplified approach without vector search
        # Just return the registration data
        return registration_texts
    except Exception as e:
        logger.error(f"Error initializing retrieval system: {e}")
        raise

def process_query(query):
    """Process a query using a simplified retrieval system."""
    try:
        # Initialize system
        registration_data = initialize_rag_system()
        
        if not registration_data:
            return {
                "response": "I don't have any face registration data to answer questions about yet. Please register some faces first."
            }
        
        # Check for common query patterns and augment with database queries
        query_lower = query.lower()
        
        # For "last person registered" query
        if "last person" in query_lower or "latest" in query_lower:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cur.execute("SELECT name, created_at FROM faces ORDER BY created_at DESC LIMIT 1")
            last_face = cur.fetchone()
            cur.close()
            conn.close()
            
            if last_face:
                # Return direct answer for simple queries
                return {
                    "response": f"The last person registered was {last_face['name']} at {last_face['created_at'].isoformat()}."
                }
        
        # For "how many people" query
        elif "how many" in query_lower or "count" in query_lower:
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM faces")
            count = cur.fetchone()[0]
            cur.close()
            conn.close()
            
            # Return direct answer for simple queries
            return {
                "response": f"There are currently {count} people registered in the system."
            }
        
        # For time-based queries about specific person
        elif "time" in query_lower or "when" in query_lower:
            # Extract person name from query
            potential_names = []
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cur.execute("SELECT DISTINCT name FROM faces")
            all_names = [row['name'].lower() for row in cur.fetchall()]
            
            for name in all_names:
                if name.lower() in query_lower:
                    potential_names.append(name)
            
            if potential_names:
                name_to_check = potential_names[0]  # Use the first matched name
                cur.execute(
                    "SELECT created_at FROM faces WHERE LOWER(name) = LOWER(%s) ORDER BY created_at ASC LIMIT 1",
                    (name_to_check,)
                )
                registration_time = cur.fetchone()
                
                if registration_time:
                    # Return direct answer for simple queries
                    return {
                        "response": f"{name_to_check} was registered at {registration_time['created_at'].isoformat()}."
                    }
            
            cur.close()
            conn.close()
        
        # For people names in the query
        elif "who" in query_lower or "person" in query_lower or "name" in query_lower:
            conn = get_db_connection()
            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cur.execute("SELECT name FROM faces ORDER BY created_at DESC")
            faces = cur.fetchall()
            cur.close()
            conn.close()
            
            if faces:
                names = [face['name'] for face in faces]
                unique_names = list(set(names))
                name_list = ", ".join(unique_names)
                return {
                    "response": f"The registered people are: {name_list}."
                }
        
        # Enhanced keyword matching for more complex queries
        
        # For recognition statistics
        if any(term in query_lower for term in ["statistic", "stats", "summary", "dashboard"]):
            conn = get_db_connection()
            cur = conn.cursor()
            
            # Get total count
            cur.execute("SELECT COUNT(*) FROM faces")
            total_count = cur.fetchone()[0]
            
            # Get unique names count
            cur.execute("SELECT COUNT(DISTINCT name) FROM faces")
            unique_count = cur.fetchone()[0]
            
            # Get first and last registration date
            cur.execute("SELECT MIN(created_at), MAX(created_at) FROM faces")
            date_range = cur.fetchone()
            first_date = date_range[0].isoformat() if date_range[0] else "N/A"
            last_date = date_range[1].isoformat() if date_range[1] else "N/A"
            
            cur.close()
            conn.close()
            
            return {
                "response": f"Face Recognition Statistics:\n- Total faces registered: {total_count}\n- Unique people registered: {unique_count}\n- First registration: {first_date}\n- Latest registration: {last_date}"
            }
            
        # Enhanced pattern matching for more complex queries
        # Provide all available data as a simple response
        data_info = "\n".join(registration_data)
        return {
            "response": f"I found the following registration information: \n{data_info}"
        }
        
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        return {
            "response": f"I'm sorry, I encountered an error while processing your question: {str(e)}"
        }

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description='RAG Service for Face Recognition')
    parser.add_argument('--query', action='store_true', help='Process a query using RAG')
    
    args = parser.parse_args()
    
    try:
        if args.query:
            # Read query from stdin
            query = sys.stdin.buffer.read().decode('utf-8')
            result = process_query(query)
            print(json.dumps(result))
        else:
            print(json.dumps({"error": "No valid operation specified"}))
    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
