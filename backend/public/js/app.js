document.addEventListener('DOMContentLoaded', () => {
    // Tab switching logic
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabName) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Initialize WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    // WebSocket event handlers
    socket.addEventListener('open', (event) => {
        console.log('WebSocket connection established');
    });
    
    socket.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
        showMessage('error', 'WebSocket connection error. Please refresh the page.');
    });
    
    socket.addEventListener('close', (event) => {
        console.log('WebSocket connection closed');
    });
    
    socket.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // Handle different message types
            switch (data.type) {
                case 'RECOGNITION_RESULT':
                    handleRecognitionResult(data.faces);
                    break;
                
                case 'CHAT_RESPONSE':
                    handleChatResponse(data.message, data.sourceCount || 0, data.isLoading || false);
                    break;
                
                case 'ERROR':
                    showMessage('error', data.message);
                    break;
                
                default:
                    console.warn('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });
    
    // ===== Registration Tab Logic =====
    
    const registrationVideo = document.getElementById('registration-video');
    const registrationCanvas = document.getElementById('registration-canvas');
    const capturedImageContainer = document.querySelector('.captured-image-container');
    const capturedImage = document.getElementById('captured-image');
    const personNameInput = document.getElementById('person-name');
    const captureBtn = document.getElementById('capture-btn');
    const recaptureBtn = document.getElementById('recapture-btn');
    const registerBtn = document.getElementById('register-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    let registrationStream = null;
    let capturedImageData = null;
    let faceDetected = false;
    
    // Initialize webcam for registration
    async function initRegistrationWebcam() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            };
            
            registrationStream = await navigator.mediaDevices.getUserMedia(constraints);
            registrationVideo.srcObject = registrationStream;
            
            registrationVideo.onloadedmetadata = () => {
                registrationCanvas.width = registrationVideo.videoWidth;
                registrationCanvas.height = registrationVideo.videoHeight;
            };
        } catch (error) {
            console.error('Error accessing webcam:', error);
            showMessage('error', 'Unable to access webcam. Please ensure camera permissions are granted.');
        }
    }
    
    // Capture image from webcam
    captureBtn.addEventListener('click', () => {
        if (registrationVideo.readyState === registrationVideo.HAVE_ENOUGH_DATA) {
            // Create a canvas to capture the frame
            const canvas = document.createElement('canvas');
            canvas.width = registrationVideo.videoWidth;
            canvas.height = registrationVideo.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(registrationVideo, 0, 0, canvas.width, canvas.height);
            
            // Get image data
            capturedImageData = canvas.toDataURL('image/jpeg');
            capturedImage.src = capturedImageData;
            
            // Show captured image and hide video
            registrationVideo.style.display = 'none';
            capturedImageContainer.style.display = 'block';
            
            // Check if the image contains a face
            checkForFace(capturedImageData);
        }
    });
    
    // Recapture image
    recaptureBtn.addEventListener('click', () => {
        capturedImageData = null;
        faceDetected = false;
        personNameInput.disabled = true;
        registerBtn.disabled = true;
        
        // Hide captured image and show video
        registrationVideo.style.display = 'block';
        capturedImageContainer.style.display = 'none';
    });
    
    // Reset registration form
    resetBtn.addEventListener('click', () => {
        capturedImageData = null;
        faceDetected = false;
        personNameInput.value = '';
        personNameInput.disabled = true;
        registerBtn.disabled = true;
        
        // Hide captured image, show video, and clear message
        registrationVideo.style.display = 'block';
        capturedImageContainer.style.display = 'none';
        document.getElementById('registration-message').style.display = 'none';
    });
    
    // Register face
    registerBtn.addEventListener('click', async () => {
        if (!capturedImageData) {
            showMessage('error', 'Please capture an image first.');
            return;
        }
        
        if (!personNameInput.value.trim()) {
            showMessage('error', 'Please enter a name for this person.');
            return;
        }
        
        if (!faceDetected) {
            showMessage('error', 'No face detected. Please capture a clear image with a face.');
            return;
        }
        
        try {
            registerBtn.disabled = true;
            registerBtn.textContent = 'Processing...';
            
            const response = await fetch('/api/register-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: personNameInput.value,
                    image: capturedImageData
                }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage('success', `${personNameInput.value} has been registered successfully!`);
                // Reset form after successful registration
                personNameInput.value = '';
                capturedImageData = null;
                faceDetected = false;
                personNameInput.disabled = true;
                
                // Hide captured image and show video
                registrationVideo.style.display = 'block';
                capturedImageContainer.style.display = 'none';
            } else {
                throw new Error(data.message || 'Failed to register face');
            }
        } catch (error) {
            console.error('Error registering face:', error);
            showMessage('error', `Error registering face: ${error.message}`);
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Register Face';
        }
    });
    
    // Check if image contains a face
    async function checkForFace(imageData) {
        try {
            const response = await fetch('/api/check-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                faceDetected = data.faceDetected;
                
                if (!faceDetected) {
                    showMessage('error', 'No face detected in the image. Please try again.');
                } else {
                    showMessage('success', 'Face detected! Enter a name and register.');
                    personNameInput.disabled = false;
                    registerBtn.disabled = !personNameInput.value.trim();
                }
            } else {
                throw new Error(data.message || 'Failed to check for face');
            }
        } catch (error) {
            console.error('Error checking for face:', error);
            showMessage('error', `Error checking for face: ${error.message}`);
            faceDetected = false;
        }
    }
    
    // Enable/disable register button based on name input
    personNameInput.addEventListener('input', () => {
        registerBtn.disabled = !faceDetected || !personNameInput.value.trim();
    });
    
    // ===== Recognition Tab Logic =====
    
    const recognitionVideo = document.getElementById('recognition-video');
    const recognitionCanvas = document.getElementById('recognition-canvas');
    const toggleRecognitionBtn = document.getElementById('toggle-recognition-btn');
    const facesList = document.getElementById('faces-list');
    
    let recognitionStream = null;
    let isRecognitionActive = false;
    let processingTimer = null;
    
    // Initialize webcam for recognition
    async function initRecognitionWebcam() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            };
            
            recognitionStream = await navigator.mediaDevices.getUserMedia(constraints);
            recognitionVideo.srcObject = recognitionStream;
            
            recognitionVideo.onloadedmetadata = () => {
                recognitionCanvas.width = recognitionVideo.videoWidth;
                recognitionCanvas.height = recognitionVideo.videoHeight;
            };
        } catch (error) {
            console.error('Error accessing webcam:', error);
            showMessage('error', 'Unable to access webcam. Please ensure camera permissions are granted.');
        }
    }
    
    // Toggle face recognition
    toggleRecognitionBtn.addEventListener('click', () => {
        isRecognitionActive = !isRecognitionActive;
        
        if (isRecognitionActive) {
            toggleRecognitionBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Recognition';
            toggleRecognitionBtn.classList.add('btn-danger');
            
            // Start recognition
            captureAndRecognize();
        } else {
            toggleRecognitionBtn.innerHTML = '<i class="fas fa-play"></i> Start Recognition';
            toggleRecognitionBtn.classList.remove('btn-danger');
            
            // Stop recognition
            if (processingTimer) {
                clearTimeout(processingTimer);
                processingTimer = null;
            }
            
            // Clear canvas and faces list
            const ctx = recognitionCanvas.getContext('2d');
            ctx.clearRect(0, 0, recognitionCanvas.width, recognitionCanvas.height);
            facesList.innerHTML = '<li class="face-item">No faces currently recognized</li>';
        }
    });
    
    // Capture frame and send for recognition
    function captureAndRecognize() {
        if (!isRecognitionActive) return;
        
        if (recognitionVideo.readyState === recognitionVideo.HAVE_ENOUGH_DATA) {
            // Create a canvas to capture the frame
            const canvas = document.createElement('canvas');
            canvas.width = recognitionVideo.videoWidth;
            canvas.height = recognitionVideo.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(recognitionVideo, 0, 0, canvas.width, canvas.height);
            
            // Get image data
            const imageData = canvas.toDataURL('image/jpeg');
            
            // Send image data to server via WebSocket for recognition
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'RECOGNIZE',
                    image: imageData
                }));
            } else {
                console.error('WebSocket not open for recognition');
                processingTimer = setTimeout(captureAndRecognize, 1000);
            }
        } else {
            processingTimer = setTimeout(captureAndRecognize, 1000);
        }
    }
    
    // Handle recognition results
    function handleRecognitionResult(faces) {
        // Draw face boxes on canvas
        const ctx = recognitionCanvas.getContext('2d');
        ctx.clearRect(0, 0, recognitionCanvas.width, recognitionCanvas.height);
        
        // Update faces list
        if (faces.length > 0) {
            facesList.innerHTML = '';
            
            faces.forEach(face => {
                // Draw box
                ctx.strokeStyle = '#3498db';
                ctx.lineWidth = 2;
                ctx.strokeRect(face.x, face.y, face.width, face.height);
                
                // Draw confidence score bar
                const barWidth = face.width;
                const barHeight = 5;
                const barY = face.y + face.height + 5;
                
                // Background bar
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.fillRect(face.x, barY, barWidth, barHeight);
                
                // Confidence bar
                ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
                ctx.fillRect(face.x, barY, barWidth * face.confidence, barHeight);
                
                // Draw background for name
                ctx.fillStyle = 'rgba(52, 152, 219, 0.7)';
                ctx.fillRect(face.x, face.y - 25, face.name.length * 8 + 60, 25);
                
                // Draw name and confidence
                ctx.fillStyle = '#ffffff';
                ctx.font = '16px Arial';
                ctx.fillText(`${face.name} (${Math.round(face.confidence * 100)}%)`, face.x + 5, face.y - 8);
                
                // Add to list
                const listItem = document.createElement('li');
                listItem.className = 'face-item';
                listItem.innerHTML = `${face.name} <span class="confidence">${Math.round(face.confidence * 100)}% confidence</span>`;
                facesList.appendChild(listItem);
            });
        } else {
            facesList.innerHTML = '<li class="face-item">No faces currently recognized</li>';
        }
        
        // Schedule next frame processing if active
        if (isRecognitionActive) {
            processingTimer = setTimeout(captureAndRecognize, 500);
        }
    }
    
    // ===== Chat Tab Logic =====
    
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    let isChatProcessing = false;
    
    // Send chat message
    function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Disable input while processing
        isChatProcessing = true;
        chatInput.disabled = true;
        chatSendBtn.disabled = true;
        
        // Add user message to chat
        const userMessageEl = document.createElement('div');
        userMessageEl.className = 'message user';
        userMessageEl.textContent = message;
        chatMessages.appendChild(userMessageEl);
        
        // Add loading indicator
        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading';
        loadingEl.innerHTML = '<div class="spinner"></div> Processing...';
        chatMessages.appendChild(loadingEl);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Send message to server via WebSocket
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'CHAT_QUERY',
                message: message
            }));
        } else {
            // Handle WebSocket error
            loadingEl.remove();
            const errorEl = document.createElement('div');
            errorEl.className = 'message bot error';
            errorEl.textContent = 'WebSocket connection not available. Please refresh the page.';
            chatMessages.appendChild(errorEl);
            
            isChatProcessing = false;
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
        }
        
        // Clear input
        chatInput.value = '';
    }
    
    // Handle chat responses
    function handleChatResponse(message, sourceCount = 0, isLoading = false) {
        // If it's a loading message, just update the loading indicator
        if (isLoading) {
            const loadingEl = document.querySelector('.loading');
            if (loadingEl) {
                loadingEl.innerHTML = '<div class="spinner"></div> ' + message;
            }
            return;
        }
        
        // Remove loading indicator
        const loadingEl = document.querySelector('.loading');
        if (loadingEl) loadingEl.remove();
        
        // Add bot message
        const botMessageEl = document.createElement('div');
        botMessageEl.className = 'message bot';
        
        // Format the message with markdown-like syntax (basic implementation)
        let formattedMessage = message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
            
        botMessageEl.innerHTML = formattedMessage;
        
        // Add source info badge if available
        if (sourceCount > 0) {
            const sourceBadge = document.createElement('div');
            sourceBadge.className = 'source-badge';
            sourceBadge.innerHTML = `<i class="fas fa-database"></i> Based on ${sourceCount} sources`;
            botMessageEl.appendChild(sourceBadge);
        }
        
        chatMessages.appendChild(botMessageEl);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Re-enable input
        isChatProcessing = false;
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
    }
    
    // Send button click
    chatSendBtn.addEventListener('click', sendChatMessage);
    
    // Enter key press
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // ===== Helper Functions =====
    
    // Show message in registration tab
    function showMessage(type, text) {
        const messageEl = document.getElementById('registration-message');
        messageEl.className = `message ${type}`;
        messageEl.textContent = text;
        messageEl.style.display = 'block';
    }
    
    // Initialize webcams when tabs are selected
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            if (tabName === 'registration' && !registrationStream) {
                initRegistrationWebcam();
            } else if (tabName === 'recognition' && !recognitionStream) {
                initRecognitionWebcam();
            }
        });
    });
    
    // Initialize registration webcam on page load
    initRegistrationWebcam();
});