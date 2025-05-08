#!/usr/bin/env python3
import base64
import json
import sys
import subprocess
import os

# This is a base64 encoded JPEG of a simple face
# It's a pre-generated image of a basic face shape with eyes and mouth
test_base64 = "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"

import argparse

parser = argparse.ArgumentParser(description='Test face recognition service')
parser.add_argument('--test-type', choices=['check', 'register', 'recognize', 'rag'], required=True, 
                    help='Type of test to run')

args = parser.parse_args()

if args.test_type == 'check':
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
    
elif args.test_type == 'register':
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
    
    if stderr:
        print(f"Error: {stderr.decode('utf-8')}")
    
elif args.test_type == 'recognize':
    # Test with recognize command
    print("Testing face recognition...")
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
    
    if stderr:
        print(f"Error: {stderr.decode('utf-8')}")
    
elif args.test_type == 'rag':
    # Test RAG service with a query
    print("Testing RAG service...")
    query = "When was TestPerson registered?"
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
    
    if stderr:
        print(f"Error: {stderr.decode('utf-8')}")