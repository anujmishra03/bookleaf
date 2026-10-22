import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { initSocketServer } from './sockets/socketHandler';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// 1. CORS Configuration
app.use(
  cors({
    origin: [FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 2. Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Socket.IO Real-Time Engine Setup
const io = new SocketIOServer(server, {
  cors: {
    origin: [FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
initSocketServer(io);

// 4. Interactive Swagger OpenAPI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 5. Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'BookLeaf Author Support & Communication API',
    version: '1.0.0',
  });
});

// 6. Mount REST API Routes
app.use('/api/v1', apiRoutes);

// 7. Centralized Error Handler
app.use(errorHandler);

// 8. Start HTTP Server
server.listen(PORT, () => {
  console.log(`🚀 BookLeaf Backend Server running on http://localhost:${PORT}`);
  console.log(`📚 OpenAPI / Swagger UI live at http://localhost:${PORT}/api-docs`);
});

export { app, server, io };
