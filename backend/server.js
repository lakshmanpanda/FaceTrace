const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { spawn } = require('child_process');
const apiRoutes = require('./routes/api');
const { setupWebSocketServer } = require('./services/websocket');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Define a route for the application page
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Catch-all route for other requests
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Set up WebSocket handlers
setupWebSocketServer(wss);

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  
  // Start Python face recognition service
  startPythonService('face_recognition_service.py');
  
  // Start Python Enhanced RAG service (using LangChain + FAISS + Cohere)
  startPythonService('enhanced_rag_service.py');
});

// Function to start Python services
function startPythonService(scriptName) {
  const pythonProcess = spawn('python', [path.join(__dirname, '../python', scriptName)]);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python ${scriptName} output: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python ${scriptName} error: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python ${scriptName} process exited with code ${code}`);
    
    // Restart the service if it exits unexpectedly
    if (code !== 0) {
      console.log(`Restarting ${scriptName}...`);
      setTimeout(() => {
        startPythonService(scriptName);
      }, 5000);
    }
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
