#!/usr/bin/env python3
import base64
import json
import sys
import subprocess
import os

# Create test image with OpenCV
try:
    import cv2
    import numpy as np
    # Create a blank 100x100 black image
    img = np.zeros((100, 100, 3), np.uint8)
    # Draw a simple face shape
    cv2.circle(img, (50, 50), 30, (200, 200, 200), -1)  # Head
    cv2.circle(img, (40, 40), 5, (0, 0, 0), -1)         # Left eye
    cv2.circle(img, (60, 40), 5, (0, 0, 0), -1)         # Right eye
    cv2.ellipse(img, (50, 60), (15, 10), 0, 0, 180, (0, 0, 0), 2)  # Mouth
    
    # Encode the image to base64
    _, buffer = cv2.imencode('.jpg', img)
    test_base64 = base64.b64encode(buffer).decode('utf-8')
except ImportError:
    # A very small test image in base64 - a 10x10 gray square as fallback
    test_base64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAUABQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD36iiigAooooAKKKKACiiigAooooA//9k="

# Test with register-face command
print("Testing face registration...")
register_cmd = ["python", "face_recognition_service.py", "--register-face", "TestPerson"]
register_proc = subprocess.Popen(
    register_cmd, 
    stdin=subprocess.PIPE, 
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    cwd=os.path.dirname(os.path.abspath(__file__))
)

stdout, stderr = register_proc.communicate(input=test_base64.encode('utf-8'))
result = stdout.decode('utf-8')
print(f"Registration Result: {result}")

# Now test recognition with the registered face
print("\nTesting face recognition after registration...")
recognize_cmd = ["python", "face_recognition_service.py", "--recognize"]
recognize_proc = subprocess.Popen(
    recognize_cmd, 
    stdin=subprocess.PIPE, 
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    cwd=os.path.dirname(os.path.abspath(__file__))
)

stdout, stderr = recognize_proc.communicate(input=test_base64.encode('utf-8'))
result = stdout.decode('utf-8')
print(f"Recognition Result: {result}")

# Test RAG service with a query
print("\nTesting RAG service...")
query = "Who was registered last?"
rag_cmd = ["python", "rag_service.py", "--query"]
rag_proc = subprocess.Popen(
    rag_cmd, 
    stdin=subprocess.PIPE, 
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    cwd=os.path.dirname(os.path.abspath(__file__))
)

stdout, stderr = rag_proc.communicate(input=query.encode('utf-8'))
result = stdout.decode('utf-8')
print(f"RAG Result: {result}")