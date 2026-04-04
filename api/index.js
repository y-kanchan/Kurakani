const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// Import backend server modules
require('dotenv').config();
const connectDB = require('../backend/config/db');

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);

// Setup Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure upload directories exist
const uploadDirs = ['uploads/profiles', 'uploads/voices', 'uploads/images'];
uploadDirs.forEach((dir) => {
  const fullPath = path.join(__dirname, '../backend', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../backend/uploads')));

// API Routes
app.use('/api/auth', require('../backend/routes/auth'));
app.use('/api/users', require('../backend/routes/users'));
app.use('/api/friends', require('../backend/routes/friends'));
app.use('/api/messages', require('../backend/routes/messages'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AuraChat API is running 🚀', timestamp: new Date() });
});

// Socket.io Real-Time Logic
const User = require('../backend/models/User');
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('user:online', async (userId) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;

    try {
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    } catch (e) { /* ignore */ }

    io.emit('user:status', { userId, isOnline: true });
    console.log(`👤 User online: ${userId}`);
  });

  socket.on('message:send', (message) => {
    const receiverSocketId = onlineUsers.get(message.receiver?._id || message.receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message:receive', message);
    }
    socket.emit('message:sent', message);
  });

  socket.on('typing:start', ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:start', { senderId });
    }
  });

  socket.on('typing:stop', ({ senderId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:stop', { senderId });
    }
  });

  socket.on('message:read', ({ senderId, receiverId }) => {
    const senderSocketId = onlineUsers.get(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('message:read', { receiverId });
    }
  });

  // WebRTC Signaling
  socket.on('call:initiate', ({ to, from, callType, offer, callerInfo }) => {
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call:incoming', {
        from,
        callType,
        offer,
        callerInfo,
      });
    } else {
      socket.emit('call:unavailable', { to });
    }
  });

  socket.on('call:answer', ({ to, from, answer }) => {
    const callerSocketId = onlineUsers.get(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:answered', { from, answer });
    }
  });

  socket.on('call:reject', ({ to, from }) => {
    const callerSocketId = onlineUsers.get(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:rejected', { from });
    }
  });

  socket.on('call:end', ({ to }) => {
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call:ended');
    }
  });

  socket.on('call:ice-candidate', ({ to, candidate }) => {
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call:ice-candidate', { candidate });
    }
  });

  socket.on('friend:request', ({ to, request }) => {
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('friend:request', request);
    }
  });

  socket.on('friend:accepted', ({ to, friend }) => {
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('friend:accepted', friend);
    }
  });

  socket.on('disconnect', async () => {
    const userId = socket.userId;
    if (userId) {
      onlineUsers.delete(userId);
      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
      } catch (e) { /* ignore */ }
      io.emit('user:status', { userId, isOnline: false, lastSeen: new Date() });
      console.log(`👤 User offline: ${userId}`);
    }
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Export for Vercel
module.exports = (req, res) => {
  app(req, res);
};
