const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const { getRegisteredFaces } = require('../services/db');

// Check if an image contains a face
router.post('/check-face', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }
    
    // Remove data URL prefix
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    
    // Spawn Python process to check for face
    const pythonProcess = spawn('python', [
      path.join(__dirname, '../../python/face_recognition_service.py'),
      '--check-face'
    ]);
    
    let result = '';
    
    // Send base64 image to Python process
    pythonProcess.stdin.write(base64Image);
    pythonProcess.stdin.end();
    
    // Collect data from Python process
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ 
          success: false, 
          message: 'Error processing image' 
        });
      }
      
      try {
        const parsedResult = JSON.parse(result);
        return res.json({
          success: true,
          faceDetected: parsedResult.faceDetected
        });
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error parsing face detection result' 
        });
      }
    });
    
    // Handle Python process errors
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python error: ${data}`);
    });
    
  } catch (error) {
    console.error('API error in check-face:', error);
    res.status(500).json({ 
      success: false, 
      message: `Server error: ${error.message}` 
    });
  }
});

// Register a face
router.post('/register-face', async (req, res) => {
  try {
    const { name, image } = req.body;
    
    if (!name || !image) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and image are required' 
      });
    }
    
    // Remove data URL prefix
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    
    // Spawn Python process to register face
    const pythonProcess = spawn('python', [
      path.join(__dirname, '../../python/face_recognition_service.py'),
      '--register-face',
      name
    ]);
    
    let result = '';
    
    // Send base64 image to Python process
    pythonProcess.stdin.write(base64Image);
    pythonProcess.stdin.end();
    
    // Collect data from Python process
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ 
          success: false, 
          message: 'Error registering face' 
        });
      }
      
      try {
        const parsedResult = JSON.parse(result);
        return res.json({
          success: true,
          message: parsedResult.message,
          id: parsedResult.id
        });
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error parsing registration result' 
        });
      }
    });
    
    // Handle Python process errors
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python error: ${data}`);
    });
    
  } catch (error) {
    console.error('API error in register-face:', error);
    res.status(500).json({ 
      success: false, 
      message: `Server error: ${error.message}` 
    });
  }
});

// Get all registered faces
router.get('/registered-faces', async (req, res) => {
  try {
    const faces = await getRegisteredFaces();
    res.json({ success: true, faces });
  } catch (error) {
    console.error('Error getting registered faces:', error);
    res.status(500).json({ 
      success: false, 
      message: `Server error: ${error.message}` 
    });
  }
});

module.exports = router;
