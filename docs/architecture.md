# Architecture Overview

## 1. Overview

This project is a Face Recognition Platform with Real-Time AI Q&A capabilities. The application allows users to register faces, perform real-time face recognition via webcam, and interact with an AI chatbot that can answer questions about registration data. The system leverages modern web technologies and machine learning to provide a seamless face recognition experience.

The platform is built with a clear separation of concerns between frontend, backend, and processing services, following a client-server architecture with specialized Python microservices for AI functionality.

## 2. System Architecture

The application follows a three-tier architecture:

1. **Frontend Layer**: A React-based web application that handles UI rendering and user interactions
2. **Backend Layer**: A Node.js Express server that provides API endpoints and WebSocket communication
3. **AI Services Layer**: Python-based services for face recognition and RAG (Retrieval-Augmented Generation)

### Architecture Diagram

```
┌─────────────┐      ┌──────────────────────────────────────┐
│             │      │                                      │
│   Frontend  │◄────►│         Backend (Node.js)            │
│   (React)   │      │     API + WebSocket + Routing        │
│             │      │                                      │
└─────────────┘      └───────────────┬──────────────────────┘
                                     │
                                     │
                     ┌───────────────▼──────────────────────┐
                     │                                      │
                     │          Python Services             │
                     │                                      │
      ┌──────────────┴───────────────┐     ┌───────────────┴──────────────┐
      │                              │     │                               │
      │  Face Recognition Service    │     │     RAG Service               │
      │                              │     │                               │
      └──────────────┬───────────────┘     └───────────────┬───────────────┘
                     │                                     │
                     │                                     │
                     └─────────────────┬─────────────────┬─┘
                                       │                 │
                                       │                 │
                     ┌─────────────────▼─────┐   ┌───────▼───────────────┐
                     │                       │   │                       │
                     │      PostgreSQL       │   │     Cohere API        │
                     │       Database        │   │                       │
                     │                       │   │                       │
                     └───────────────────────┘   └───────────────────────┘
```

### Communication Flow

- Frontend communicates with the backend through RESTful API calls and WebSocket connections
- Backend relays relevant requests to Python services via child processes or inter-process communication
- Python services interact with the PostgreSQL database and external APIs (Cohere)
- Results are sent back to the frontend through the backend server via WebSockets or API responses

## 3. Key Components

### 3.1 Frontend (React)

The frontend is built using React and is organized into components that handle specific functionalities:

- **Main Application (App.js)**: Manages tabs and high-level UI state
- **Registration Tab**: Handles face registration workflow
- **Recognition Tab**: Manages real-time face recognition via webcam
- **Chat Interface**: Provides an interface for AI-powered Q&A
- **WebcamCapture**: Reusable component for camera access and image capture

The frontend uses modern React patterns with hooks for state management and side effects. It communicates with the backend through fetch API for REST endpoints and WebSocket for real-time features.

### 3.2 Backend (Node.js)

The backend is built with Express.js and provides:

- **API Routes**: RESTful endpoints for face registration, verification, and other operations
- **WebSocket Server**: Real-time communication for face recognition and chat features
- **Process Management**: Spawns and manages Python processes for AI services
- **Database Integration**: Interfaces with PostgreSQL for data storage and retrieval

The backend serves as a bridge between the frontend and the specialized Python services, routing requests and formatting responses.

### 3.3 Python Services

#### 3.3.1 Face Recognition Service

This service handles all face recognition operations:
- Face detection in images
- Face encoding and feature extraction
- Face matching and recognition
- Storage and retrieval of face encodings

It utilizes the `face_recognition` Python library for core functionality.

#### 3.3.2 RAG Service

The Retrieval-Augmented Generation (RAG) service powers the AI chat functionality:
- Processes natural language queries about registered faces
- Retrieves relevant information from the database
- Uses Cohere's language models to generate contextually relevant responses
- Leverages FAISS for vector similarity search

This service uses `langchain` for RAG implementation and integrates with Cohere's API.

### 3.4 Database

The application uses PostgreSQL for data persistence:

**Schema**:
- `faces` table:
  - `id`: Serial primary key
  - `name`: VARCHAR(255) - The person's name
  - `encoding`: BYTEA - Binary face encoding data
  - `created_at`: TIMESTAMP - When the face was registered

The database stores face encodings as binary data, allowing for efficient retrieval during recognition operations.

## 4. Data Flow

### 4.1 Face Registration Flow

1. User captures image via webcam in the Registration tab
2. Image is sent to backend API endpoint
3. Backend forwards image to Python face recognition service
4. Service detects face, generates encoding, and stores in database
5. Confirmation is returned to frontend

### 4.2 Face Recognition Flow

1. WebSocket connection established between frontend and backend
2. Webcam frames are captured in the Recognition tab
3. Frames are sent to backend via WebSocket
4. Backend forwards frames to Python face recognition service
5. Service processes frames, compares with stored encodings
6. Recognition results sent back to frontend via WebSocket
7. Frontend displays bounding boxes and names over video feed

### 4.3 AI Chat Flow

1. User submits question in the Chat interface
2. Question is sent to backend via WebSocket
3. Backend forwards question to Python RAG service
4. RAG service:
   - Retrieves relevant face registration data from database
   - Generates embeddings and performs similarity search
   - Uses retrieved context to generate answer with Cohere
5. Response is sent back to frontend via WebSocket
6. Frontend displays the answer in the chat interface

## 5. External Dependencies

### 5.1 Core Dependencies

- **React**: Frontend UI library
- **Express.js**: Backend web framework
- **WebSocket**: Real-time communication protocol
- **face_recognition**: Python library for face detection and recognition
- **LangChain**: Framework for creating RAG applications
- **FAISS**: Facebook AI Similarity Search for efficient vector similarity search
- **Cohere API**: Provides language model capabilities for the chat feature
- **PostgreSQL**: Relational database for data storage

### 5.2 External Services

- **Cohere API**: Used by the RAG service to generate contextual responses to user queries

## 6. Deployment Strategy

The application is configured for deployment with the following considerations:

- **Development Environment**: Local development with separate frontend and backend servers
- **Production Environment**: Backend serves static frontend assets
- **Database**: PostgreSQL instance (configurable via environment variables)
- **Environment Variables**:
  - Database connection parameters (PGHOST, PGUSER, etc.)
  - Cohere API key for RAG functionality
  - PORT for the backend server

### 6.1 Containerization Potential

While not currently implemented, the application's architecture would be well-suited for containerization using Docker:
- Frontend container for the React application
- Backend container for the Node.js server
- Python services containers for the AI functionality
- PostgreSQL container for the database

This would allow for more flexible deployment options and better scalability.