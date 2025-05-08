import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { motion } from 'framer-motion'; // Import motion from framer-motion

const AnimatedCard = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    {children}
  </motion.div>
);

const RecognitionTab = () => {
  const [recognizedFaces, setRecognizedFaces] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const socketRef = useRef(null);
  const processingTimerRef = useRef(null);

  const THRESHOLD = 0.6; // Adjust this value based on testing

  // Initialize WebSocket connection when component mounts
  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    socketRef.current = new WebSocket(wsUrl);
    
    // Set up event handlers
    socketRef.current.onopen = () => {
      console.log('WebSocket connection established');
      // Start recognition when socket is open
      startRecognition();
    };
    
    socketRef.current.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'RECOGNITION_RESULT') {
          setRecognizedFaces(data.faces.map(face => ({
            name: face.name || 'Unknown',
            boundingBox: face.boundingBox,
            confidence: face.confidence || 0
          })));
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
    
    socketRef.current.onclose = () => {
      console.log('WebSocket connection closed. Attempting to reconnect...');
      setTimeout(() => {
        if (isActive) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const wsUrl = `${protocol}//${window.location.host}/ws`;
          socketRef.current = new WebSocket(wsUrl);
        }
      }, 1000);
    };
    
    socketRef.current.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('WebSocket connection error');
    };
    
    // Cleanup function
    return () => {
      setIsActive(false);
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Toggle active state to start/stop recognition
  useEffect(() => {
    if (isActive && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      captureAndRecognize();
    } else if (!isActive && processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
    }
  }, [isActive]);

  // Function to start face recognition
  const startRecognition = () => {
    setIsActive(true);
  };

  // Function to stop face recognition
  const stopRecognition = () => {
    setIsActive(false);
    setRecognizedFaces([]);
  };

  // Function to capture frame and send for recognition
  const captureAndRecognize = () => {
    if (!isActive || isProcessing) return;
    
    const startTime = performance.now();

    setIsProcessing(true);
    
    // Get the video element and create a canvas to capture the frame
    const video = document.querySelector('.webcam-video');
    
    if (!video || video.readyState !== 4) {
      console.warn('Video feed is not ready. Retrying...');
      setIsProcessing(false);
      if (isActive) {
        processingTimerRef.current = setTimeout(() => {
          captureAndRecognize();
        }, 500);
      }
      return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = canvas.toDataURL('image/jpeg');
    console.log('Captured image data size:', imageData.length);
    
    // Send image data to server via WebSocket for recognition
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'RECOGNIZE',
        image: imageData
      }));
    } else {
      setIsProcessing(false);
      setError('WebSocket connection not available');
    }

    const endTime = performance.now();
    console.log('Frame processing time:', endTime - startTime, 'ms');
  };

  const promptRegisterFace = (face) => {
    console.log('Prompting to register face:', face);
    // Add logic to handle face registration
  };

  return (
    <div className="recognition-tab">
      <h2 className="text-center">Live Face Recognition</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <div className="text-center mb-3">
        <Button
          variant={isActive ? "danger" : "primary"}
          onClick={isActive ? stopRecognition : startRecognition}
        >
          {isActive ? "Stop Recognition" : "Start Recognition"}
        </Button>
      </div>
      <div className="video-feed">
        <video className="webcam-video" autoPlay muted></video>
      </div>
      <div className="recognized-faces mt-4">
        <h3>Recognized Faces</h3>
        {recognizedFaces.length > 0 ? (
          <div className="d-flex flex-wrap">
            {recognizedFaces.map((face, index) => (
              <AnimatedCard key={index}>
                <Card className="m-2" style={{ width: '18rem' }}>
                  <Card.Body>
                    <Card.Title>{face.name}</Card.Title>
                    <Card.Text>
                      Confidence: {(face.confidence * 100).toFixed(2)}%
                    </Card.Text>
                    {face.name === "Unknown" && (
                      <Button variant="warning">Register Face</Button>
                    )}
                  </Card.Body>
                </Card>
              </AnimatedCard>
            ))}
          </div>
        ) : (
          <p>No faces currently recognized.</p>
        )}
      </div>
    </div>
  );
};

export default RecognitionTab;