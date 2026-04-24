import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './config/db';
import errorHandler from './middleware/errorHandler';

// ─── Import Route Files ─────────────────────────────────────────────
import weatherRoutes from './routes/weatherRoutes';
import farmerRoutes from './routes/farmerRoutes';
import farmRoutes from './routes/farmRoutes';
import activityRoutes from './routes/activityRoutes';
import reminderRoutes from './routes/reminderRoutes';
import marketRoutes from './routes/marketRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import officerRoutes from './routes/officerRoutes';
import schemeRoutes from './routes/schemeRoutes';
import chatRoutes from './routes/chatRoutes';
import diseaseRoutes from './routes/diseaseRoutes';
import sarvamRoutes from './routes/sarvamRoutes';
import consultantRoutes from './routes/consultantRoutes';
import soilHealthRoutes from './routes/soilHealthRoutes';
import cropProductivityRoutes from './routes/cropProductivityRoutes';
import { seedGlobalConsultants } from './controllers/officerController';

// ─── Create Express App ─────────────────────────────────────────────
const app: Express = express();
const server = http.createServer(app);

// ─── Socket.IO for WebRTC Signaling ─────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  },
});

// Track rooms and participants
const rooms = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Join a video call room
  socket.on('join-room', (roomId: string, userId: string) => {
    console.log(`📹 ${userId} joining room ${roomId}`);
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId)!.add(socket.id);

    // Notify others in the room
    socket.to(roomId).emit('user-joined', { userId, socketId: socket.id });

    // Send current participants to the joiner
    const participants = Array.from(rooms.get(roomId)!).filter(id => id !== socket.id);
    socket.emit('room-users', participants);
  });

  // WebRTC Signaling: relay offer
  socket.on('offer', (data: { roomId: string; offer: any; to: string }) => {
    console.log(`📤 Relaying offer from ${socket.id} to ${data.to}`);
    socket.to(data.to).emit('offer', {
      offer: data.offer,
      from: socket.id,
    });
  });

  // WebRTC Signaling: relay answer
  socket.on('answer', (data: { roomId: string; answer: any; to: string }) => {
    console.log(`📤 Relaying answer from ${socket.id} to ${data.to}`);
    socket.to(data.to).emit('answer', {
      answer: data.answer,
      from: socket.id,
    });
  });

  // WebRTC Signaling: relay ICE candidate
  socket.on('ice-candidate', (data: { roomId: string; candidate: any; to: string }) => {
    socket.to(data.to).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id,
    });
  });

  // Leave room
  socket.on('leave-room', (roomId: string) => {
    socket.leave(roomId);
    if (rooms.has(roomId)) {
      rooms.get(roomId)!.delete(socket.id);
      if (rooms.get(roomId)!.size === 0) {
        rooms.delete(roomId);
      }
    }
    socket.to(roomId).emit('user-left', { socketId: socket.id });
    console.log(`🚪 ${socket.id} left room ${roomId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    // Clean up from all rooms
    rooms.forEach((participants, roomId) => {
      if (participants.has(socket.id)) {
        participants.delete(socket.id);
        socket.to(roomId).emit('user-left', { socketId: socket.id });
        if (participants.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

// ─── Middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Connect Database ───────────────────────────────────────────────
connectDB().then(() => {
  seedGlobalConsultants();
});

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/weather', weatherRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/chatbot', chatRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/sarvam', sarvamRoutes);
app.use('/api/consultants', consultantRoutes);
app.use('/api/soil-health', soilHealthRoutes);
app.use('/api/crop-productivity', cropProductivityRoutes);

// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler (MUST be last) ───────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO ready for WebRTC signaling`);
});