import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import { apiLimiter } from './middleware/security';
import { roomRouter } from './routes/rooms';
import { playlistRouter } from './routes/playlists';
import { searchRouter } from './routes/search';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { reportsRouter } from './routes/reports';
import { setupRoomSockets } from './sockets/roomSocket';
import { setupSyncSockets } from './sockets/syncSocket';
import { setupYoutubeSockets } from './sockets/youtubeSocket';
import { setupSignaling } from './webrtc/rtc';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
// Enable Helmet for Security Headers (Disable CSP if frontend connects from different domain without proper config)
app.use(helmet({ contentSecurityPolicy: false }));

// Enable gzip compression
app.use(compression());

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Serve static files (MP3s)
import path from 'path';
app.use('/music', express.static(path.join(__dirname, '../public/music')));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'syncora-backend',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/rooms', roomRouter);
app.use('/api/playlists', playlistRouter);
app.use('/api/search', searchRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reports', reportsRouter);

// Socket.io handlers
setupRoomSockets(io);
setupSyncSockets(io);
setupYoutubeSockets(io);
setupSignaling(io);

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`✨ Syncora backend running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io server ready`);
});

export { app, io };
