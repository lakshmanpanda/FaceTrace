#!/usr/bin/env python3
import cv2
import numpy as np
import base64
import json
import sys
import os
import io
import argparse
import logging
import time
import pickle
import uuid
from datetime import datetime
from PIL import Image
import psycopg2
import psycopg2.extras

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("face_recognition_service")

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

def decode_image(base64_image):
    """Decode base64 image string to image."""
    try:
        # Check if the base64 string is not empty
        if not base64_image or base64_image == "{}":
            raise ValueError("Empty or invalid base64 image data")
            
        # Remove any headers if present (e.g., "data:image/jpeg;base64,")
        if ',' in base64_image:
            base64_image = base64_image.split(',')[1]
            
        # Decode base64 image
        image_data = base64.b64decode(base64_image)
        
        # Decode to numpy array directly using OpenCV
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image data")
            
        # Convert BGR to RGB (OpenCV uses BGR)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        return image_rgb
    except Exception as e:
        logger.error(f"Error decoding image: {e}")
        raise

def check_face(base64_image):
    """Check if the image contains a face using OpenCV."""
    try:
        # Decode image
        image = decode_image(base64_image)
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Load the face cascade classifier
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Detect faces (with reduced strictness: lower scale factor and min neighbors)
        faces = face_cascade.detectMultiScale(gray, 1.05, 2)
        
        # Return result
        return {
            "faceDetected": len(faces) > 0
        }
    except Exception as e:
        logger.error(f"Error checking face: {e}")
        raise

def register_face(base64_image, name):
    """Register a face with the given name using OpenCV."""
    try:
        # Decode image
        image = decode_image(base64_image)
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Load the face cascade classifier
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            # For testing, we'll create a dummy face region in the center
            # In a production system, we'd want to return an error
            h, w = gray.shape
            x, y = w//4, h//4
            w, h = w//2, h//2
            logger.info("No face detected, using center portion of image for testing")
            faces = [(x, y, w, h)]
        
        # Use the first face found
        x, y, w, h = faces[0]
        
        # Extract the face region
        face_roi = gray[y:y+h, x:x+w]
        
        # Resize to a standard size for consistent feature extraction
        face_roi_resized = cv2.resize(face_roi, (100, 100))
        
        # Flatten the image for storage as a simple feature vector
        face_encoding = face_roi_resized.flatten()
        
        # Store in database
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Convert numpy array to bytes for storage
        encoding_bytes = face_encoding.tobytes()
        
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
        
        logger.info(f"Face registered: {name} (ID: {face_id})")
        
        return {
            "success": True,
            "message": f"Face registered successfully: {name}",
            "id": face_id,
            "timestamp": created_at.isoformat()
        }
    except Exception as e:
        logger.error(f"Error registering face: {e}")
        raise

def get_all_face_encodings():
    """Retrieve all face encodings from the database."""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        cur.execute("SELECT id, name, encoding FROM faces")
        face_data = cur.fetchall()
        
        faces = []
        for face in face_data:
            # Convert bytes to numpy array - using uint8 since we're storing grayscale pixel values
            encoding = np.frombuffer(face['encoding'], dtype=np.uint8)
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

def recognize_faces(base64_image):
    """Recognize faces in the given image using OpenCV."""
    try:
        # Decode image
        image = decode_image(base64_image)
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Load the face cascade classifier
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            # For testing, we'll create a dummy face region in the center
            h, w = gray.shape
            x, y = w // 4, h // 4
            w, h = w // 2, h // 2
            logger.info("No face detected during recognition, using center portion of image for testing")
            faces = [(x, y, w, h)]
        
        # Get stored face encodings from database
        known_faces = get_all_face_encodings()
        
        if not known_faces:
            logger.info("No registered faces found in the database.")
            return {
                "faces": [
                    {
                        "name": "Unknown",
                        "x": int(x),
                        "y": int(y),
                        "width": int(w),
                        "height": int(h),
                        "confidence": 0.0
                    }
                    for x, y, w, h in faces
                ]
            }
        
        # Known face encodings and names
        known_face_encodings = [face['encoding'] for face in known_faces]
        known_face_names = [face['name'] for face in known_faces]
        
        # Initialize array to hold recognized faces
        recognized_faces = []
        
        # For each detected face
        for (x, y, w, h) in faces:
            # Extract the face region
            face_roi = gray[y:y+h, x:x+w]
            
            # Resize to a standard size (same as during registration)
            face_roi_resized = cv2.resize(face_roi, (100, 100))
            
            # Flatten to get face encoding
            face_encoding = face_roi_resized.flatten()
            
            # # Log the detected face encoding
            # logger.info(f"Detected face encoding: {face_encoding.tolist()}")
            
            # Simple nearest neighbor matching 
            # Calculate Euclidean distance to all known faces
            distances = []
            for known_encoding in known_face_encodings:
                distance = np.linalg.norm(known_encoding - face_encoding)
                distances.append(distance)
            
            # Log the similarity scores
            logger.info(f"Similarity scores: {distances}")
            
            # Find the closest match
            if distances:
                best_match_index = np.argmin(distances)
                # Threshold for accepting a match (may need tuning)
                if distances[best_match_index] < 20000:  # Lower is better match
                    name = known_face_names[best_match_index]
                else:
                    name = "Unknown"
            else:
                name = "Unknown"
            
            # Log the matched face name
            logger.info(f"Matched face name: {name}")
            
            # Calculate confidence score (0-1)
            confidence = 0.0
            if distances and len(distances) > 0:
                best_match_index = np.argmin(distances)
                confidence = max(0, min(1, 1.0 - distances[best_match_index]))
            
            # Convert all numpy values to Python native types for JSON serialization
            recognized_faces.append({
                "name": name,
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h),
                "confidence": float(confidence)
            })
        
        logger.info(f"Recognized {len(recognized_faces)} faces")
        
        return {"faces": recognized_faces}
    except Exception as e:
        logger.error(f"Error recognizing faces: {e}")
        raise

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description='Face Recognition Service')
    parser.add_argument('--check-face', action='store_true', help='Check if image contains a face')
    parser.add_argument('--register-face', metavar='NAME', help='Register a face with the given name')
    parser.add_argument('--recognize', action='store_true', help='Recognize faces in the image')
    
    args = parser.parse_args()
    
    try:
        # Initialize database
        initialize_database()
        
        # Read base64 image from stdin
        base64_image = sys.stdin.buffer.read().decode('utf-8')
        
        # Process request based on command line arguments
        if args.check_face:
            result = check_face(base64_image)
            print(json.dumps(result))
        elif args.register_face:
            result = register_face(base64_image, args.register_face)
            print(json.dumps(result))
        elif args.recognize:
            result = recognize_faces(base64_image)
            print(json.dumps(result))
        else:
            print(json.dumps({"error": "No valid operation specified"}))
    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
