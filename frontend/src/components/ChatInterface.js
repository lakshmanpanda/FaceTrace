import React, { useState, useEffect, useRef } from 'react';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    socketRef.current = new WebSocket(wsUrl);
    
    // Set up event handlers
    socketRef.current.onopen = () => {
      console.log('WebSocket connection established for chat');
      // Add welcome message
      setMessages([
        {
          sender: 'bot',
          text: 'Hello! I can answer questions about face registration activities. For example, try asking: "Who was the last person registered?" or "How many people are currently registered?"'
        }
      ]);
    };
    
    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'CHAT_RESPONSE') {
          setMessages(prevMessages => [
            ...prevMessages,
            { sender: 'bot', text: data.message }
          ]);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
        setError('Error processing message from server');
        setIsLoading(false);
      }
    };
    
    socketRef.current.onclose = () => {
      console.log('WebSocket connection closed for chat');
    };
    
    socketRef.current.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('WebSocket connection error');
    };
    
    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending message
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    // Add user message to chat
    setMessages(prevMessages => [
      ...prevMessages,
      { sender: 'user', text: inputMessage }
    ]);
    
    // Set loading state
    setIsLoading(true);
    
    // Send message to server via WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'CHAT_QUERY',
        message: inputMessage
      }));
    } else {
      setError('WebSocket connection not available');
      setIsLoading(false);
    }
    
    // Clear input
    setInputMessage('');
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="chat-interface">
      <h2>AI Assistant Chat</h2>
      <p className="instructions">
        Ask questions about face registration activities using natural language.
      </p>
      
      {error && <div className="error">{error}</div>}
      
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          
          {isLoading && (
            <div className="loading">
              <i className="fas fa-spinner fa-spin"></i> Thinking...
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask something about face registration..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="chat-send-btn"
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
