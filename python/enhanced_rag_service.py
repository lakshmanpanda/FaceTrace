#!/usr/bin/env python3
import os
import sys
import json
import logging
import argparse
import time
from datetime import datetime
import psycopg2
import psycopg2.extras
import cohere
import faiss
import numpy as np

# LangChain imports
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_cohere import CohereEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import Cohere
from langchain.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("enhanced_rag_service")

# Database connection parameters from environment variables
db_params = {
    "host": os.getenv("PGHOST", "localhost"),
    "database": os.getenv("PGDATABASE", "postgres"),
    "user": os.getenv("PGUSER", "postgres"),
    "password": os.getenv("PGPASSWORD", "lakshman&66"),
    "port": os.getenv("PGPORT", "5432")
}

# Get Cohere API Key from environment or use the provided one
COHERE_API_KEY = os.getenv("COHERE_API_KEY", "v1mBXtR48OllAMPADPuMxoApU1FecoZ9yvSbLfrd")

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
        
        return [dict(face) for face in faces]
    except Exception as e:
        logger.error(f"Error getting face registration data: {e}")
        raise

def create_documents_from_face_data():
    """Create LangChain documents from face registration data."""
    try:
        face_data = get_face_registration_data()
        documents = []
        
        # Also create a comprehensive overview document
        if face_data:
            overview = "Face Recognition System Overview:\n"
            overview += f"Total registered faces: {len(face_data)}\n"
            overview += f"First registration: {face_data[-1]['created_at']}\n"
            overview += f"Latest registration: {face_data[0]['created_at']}\n"
            overview += "Registered people:\n"
            
            for idx, face in enumerate(face_data, 1):
                # Add to overview
                overview += f"{idx}. {face['name']} (ID: {face['id']}, Registered: {face['created_at']})\n"
                
                # Create individual documents
                content = (
                    f"Person Information:\n"
                    f"Name: {face['name']}\n"
                    f"ID: {face['id']}\n"
                    f"Registration Date: {face['created_at']}\n"
                )
                
                doc = Document(
                    page_content=content,
                    metadata={"id": face['id'], "name": face['name'], "type": "person"}
                )
                documents.append(doc)
        
            # Add overview document
            overview_doc = Document(
                page_content=overview,
                metadata={"type": "overview"}
            )
            documents.append(overview_doc)
        
        # Split into smaller chunks if needed
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        split_docs = text_splitter.split_documents(documents)
        
        return split_docs
    except Exception as e:
        logger.error(f"Error creating documents: {e}")
        raise

def initialize_rag_system():
    """Initialize the RAG system with LangChain + FAISS + Cohere."""
    try:
        # Create documents
        documents = create_documents_from_face_data()
        
        if not documents:
            logger.warning("No face registration data found")
            return None
        
        # Initialize embeddings with Cohere
        embeddings = CohereEmbeddings(
            model="embed-english-v3.0", 
            cohere_api_key=COHERE_API_KEY,
            user_agent="FaceRecognitionPlatform/1.0"
        )
        
        # Create vector store
        vector_store = FAISS.from_documents(documents, embeddings)
        
        # Create Cohere LLM instance
        llm = Cohere(
            model="command", 
            cohere_api_key=COHERE_API_KEY,
            temperature=0.1,
            client=None  # Let the library create the client
        )
        
        # Create custom prompt template
        prompt_template = """
        You are an assistant for a face recognition system. Use the following pieces of context to answer the question. 
        If you don't know the answer, just say that you don't know, don't try to make up an answer.
        
        Context: {context}
        
        Question: {question}
        
        Answer:
        """
        
        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        
        # Create QA chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vector_store.as_retriever(search_kwargs={"k": 3}),
            chain_type_kwargs={"prompt": PROMPT},
            return_source_documents=True
        )
        
        return qa_chain
    except Exception as e:
        logger.error(f"Error initializing RAG system: {e}")
        raise

def process_query(query):
    """Process a query using the enhanced RAG system."""
    try:
        # Initialize system
        qa_chain = initialize_rag_system()
        
        if not qa_chain:
            return {
                "response": "I don't have any face registration data to answer questions about yet. Please register some faces first."
            }
        
        # Process query through the QA chain
        result = qa_chain({"query": query})
        
        # Format the response
        response = {
            "response": result["result"],
            "source_count": len(result["source_documents"]) if "source_documents" in result else 0
        }
        
        return response
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        return {
            "response": f"I'm sorry, I encountered an error while processing your question: {str(e)}"
        }

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description='Enhanced RAG Service with LangChain + FAISS + Cohere')
    parser.add_argument('--query', action='store_true', help='Process a query using enhanced RAG')
    
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
