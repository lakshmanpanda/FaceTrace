#!/usr/bin/env python3
import base64
import json
import sys
import subprocess
import os

# A very small test image in base64 - a 10x10 gray square
# This is just to test the image decoding functionality, not actual face detection
test_base64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAUABQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD36iiigAooooAKKKKACiiigAooooA//9k="

# Create real test case with OpenCV
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
    real_test_base64 = base64.b64encode(buffer).decode('utf-8')
    
    # Use the real test image
    test_base64 = real_test_base64
except ImportError:
    print("OpenCV not available, using fallback test image")

# Test with check-face command
print("Testing face detection...")
check_face_cmd = ["python", "face_recognition_service.py", "--check-face"]
check_face_proc = subprocess.Popen(
    check_face_cmd, 
    stdin=subprocess.PIPE, 
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    cwd=os.path.dirname(os.path.abspath(__file__))
)

stdout, stderr = check_face_proc.communicate(input=test_base64.encode('utf-8'))
result = stdout.decode('utf-8')
print(f"Result: {result}")

# Test with recognize command
print("\nTesting face recognition...")
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
print(f"Result: {result}")