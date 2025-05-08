const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');

// Setup WebSocket server with handlers
const setupWebSocketServer = (wss) => {
  console.log('Setting up WebSocket server');
  
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'RECOGNIZE':
            handleRecognitionRequest(ws, data);
            break;
          
          case 'CHAT_QUERY':
            handleChatQuery(ws, data);
            break;
          
          default:
            console.warn(`Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        sendErrorResponse(ws, 'Invalid message format');
      }
    });
    
    // Handle connection close
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Ping clients periodically to keep connections alive
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    });
  }, 30000);
};

// Handle face recognition request
const handleRecognitionRequest = (ws, data) => {
  try {
    // Extract image data (remove data URL prefix)
    const base64Image = data.image.replace(/^data:image\/\w+;base64,/, '');
    
    // Spawn Python process for face recognition
    const pythonProcess = spawn('python', [
      path.join(__dirname, '../../python/face_recognition_service.py'),
      '--recognize'
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
        return sendErrorResponse(ws, 'Error processing recognition request');
      }
      
      try {
        const parsedResult = JSON.parse(result);
        
        // Send recognition results back to client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'RECOGNITION_RESULT',
            faces: parsedResult.faces
          }));
        }
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        sendErrorResponse(ws, 'Error parsing recognition result');
      }
    });
    
    // Handle Python process errors
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python error: ${data}`);
    });
    
  } catch (error) {
    console.error('Error handling recognition request:', error);
    sendErrorResponse(ws, `Server error: ${error.message}`);
  }
};

// Handle chat query for RAG
const handleChatQuery = (ws, data) => {
  try {
    // Send loading message to client
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CHAT_RESPONSE',
        message: "Thinking...",
        isLoading: true
      }));
    }
    
    // Spawn Python process for Enhanced RAG with LangChain + FAISS + Cohere
    const pythonProcess = spawn('python', [
      path.join(__dirname, '../../python/enhanced_rag_service.py'),
      '--query'
    ]);
    
    let result = '';
    
    // Send query to Python process
    pythonProcess.stdin.write(data.message);
    pythonProcess.stdin.end();
    
    // Collect data from Python process
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
    
    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return sendErrorResponse(ws, 'Error processing chat query');
      }
      
      try {
        const parsedResult = JSON.parse(result);
        
        // Send response back to client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'CHAT_RESPONSE',
            message: parsedResult.response,
            sourceCount: parsedResult.source_count || 0,
            isLoading: false
          }));
        }
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        sendErrorResponse(ws, 'Error parsing chat response');
      }
    });
    
    // Handle Python process errors
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python error: ${data}`);
    });
    
  } catch (error) {
    console.error('Error handling chat query:', error);
    sendErrorResponse(ws, `Server error: ${error.message}`);
  }
};

// Helper function to send error responses
const sendErrorResponse = (ws, errorMessage) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: errorMessage
    }));
  }
};

module.exports = {
  setupWebSocketServer
};
