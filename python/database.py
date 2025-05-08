#!/usr/bin/env python3
import os
import logging
import psycopg2
import psycopg2.extras
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("database")

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

def initialize_database():
    """Create necessary tables if they don't exist."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Create faces table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS faces (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                encoding BYTEA NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        cur.close()
        conn.close()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise

def store_face_encoding(name, encoding):
    """Store face encoding in database."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Convert numpy array to bytes for storage
        encoding_bytes = encoding.tobytes()
        
        # Insert into database
        cur.execute(
            "INSERT INTO faces (name, encoding) VALUES (%s, %s) RETURNING id, created_at",
            (name, psycopg2.Binary(encoding_bytes))
        )
        
        result = cur.fetchone()
        face_id, created_at = result
        
        conn.commit()
        cur.close()
        conn.close()
        
        logger.info(f"Face encoding stored: {name} (ID: {face_id})")
        
        return {
            "id": face_id,
            "name": name,
            "created_at": created_at.isoformat()
        }
    except Exception as e:
        logger.error(f"Error storing face encoding: {e}")
        raise

def get_face_encodings():
    """Retrieve all face encodings from the database."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("SELECT id, name, encoding FROM faces")
        face_data = cur.fetchall()
        
        faces = []
        for face in face_data:
            # Convert bytes to numpy array
            encoding = np.frombuffer(face['encoding'], dtype=np.float64)
            faces.append({
                'id': face['id'],
                'name': face['name'],
                'encoding': encoding
            })
        
        cur.close()
        conn.close()
        
        return faces
    except Exception as e:
        logger.error(f"Error retrieving face encodings: {e}")
        raise

def get_registered_faces():
    """Get all registered faces (metadata only)."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT id, name, created_at 
            FROM faces 
            ORDER BY created_at DESC
        """)
        
        faces = [dict(face) for face in cur.fetchall()]
        
        cur.close()
        conn.close()
        
        # Convert datetime to string for JSON serialization
        for face in faces:
            face['created_at'] = face['created_at'].isoformat()
        
        return faces
    except Exception as e:
        logger.error(f"Error retrieving registered faces: {e}")
        raise

def get_face_by_id(face_id):
    """Get face by ID."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT id, name, created_at 
            FROM faces 
            WHERE id = %s
        """, (face_id,))
        
        face = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if face:
            # Convert to dict and format datetime
            face_dict = dict(face)
            face_dict['created_at'] = face_dict['created_at'].isoformat()
            return face_dict
        else:
            return None
    except Exception as e:
        logger.error(f"Error retrieving face by ID: {e}")
        raise

def get_last_registered_face():
    """Get the last registered face."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("""
            SELECT id, name, created_at 
            FROM faces 
            ORDER BY created_at DESC 
            LIMIT 1
        """)
        
        face = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if face:
            # Convert to dict and format datetime
            face_dict = dict(face)
            face_dict['created_at'] = face_dict['created_at'].isoformat()
            return face_dict
        else:
            return None
    except Exception as e:
        logger.error(f"Error retrieving last registered face: {e}")
        raise

def get_face_count():
    """Get the total number of registered faces."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM faces")
        count = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return count
    except Exception as e:
        logger.error(f"Error counting faces: {e}")
        raise

# Initialize database when module is loaded
initialize_database()
