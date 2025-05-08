import React, { useRef, useEffect, useState } from 'react';

const WebcamCapture = ({ onCapture, showFaceBoxes, faceBoxes, isRecording = true }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);

  // Initialize webcam on component mount
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const constraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        };
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
          setError(null);
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError('Unable to access webcam. Please ensure camera permissions are granted.');
      }
    };

    startWebcam();

    // Cleanup function to stop the webcam when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Draw face boxes on canvas if they are provided
  useEffect(() => {
    if (showFaceBoxes && canvasRef.current && faceBoxes && faceBoxes.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Adjust canvas dimensions to match video dimensions
      if (videoRef.current) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
      }
      
      // Draw each face box with name
      faceBoxes.forEach(face => {
        const { x, y, width, height, name } = face;
        
        // Draw box
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        
        // Draw background for name
        ctx.fillStyle = 'rgba(52, 152, 219, 0.7)';
        ctx.fillRect(x, y - 25, name ? name.length * 8 + 20 : 100, 25);
        
        // Draw name
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText(name || 'Unknown', x + 5, y - 8);
      });
    } else if (canvasRef.current) {
      // Clear canvas if no face boxes
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [faceBoxes, showFaceBoxes]);

  // Capture frame for face registration
  const captureFrame = () => {
    if (videoRef.current && videoRef.current.readyState === 4) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = canvas.toDataURL('image/jpeg');
      
      if (onCapture) {
        onCapture(imageData);
      }
    }
  };

  return (
    <div className="webcam-container">
      {error && <div className="error">{error}</div>}
      
      <video 
        ref={videoRef}
        className="webcam-video"
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
        }}
      />
      
      {showFaceBoxes && (
        <canvas 
          ref={canvasRef}
          className="face-canvas"
        />
      )}
      
      {!isRecording && (
        <div className="capture-controls">
          <button className="btn" onClick={captureFrame}>
            <i className="fas fa-camera"></i> Capture
          </button>
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;
