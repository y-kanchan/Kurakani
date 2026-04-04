require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

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
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/messages', require('./routes/messages'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AuraChat API is running 🚀', timestamp: new Date() });
});

// ─────────────────────────────────────────────────────────────
//  Socket.io Real-Time Logic
// ─────────────────────────────────────────────────────────────

const User = require('./models/User');

// Map: userId -> socketId
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ── User goes online ──────────────────────────────────────
  socket.on('user:online', async (userId) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;

    try {
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    } catch (e) { /* ignore */ }

    // Broadcast online status to all connected clients
    io.emit('user:status', { userId, isOnline: true });
    console.log(`👤 User online: ${userId}`);
  });

  // ── Send message via socket (real-time delivery) ──────────
  socket.on('message:send', (message) => {
    const receiverSocketId = onlineUsers.get(message.receiver?._id || message.receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message:receive', message);
    }
    // Echo back to sender for multi-device sync
    socket.emit('message:sent', message);
  });

  // ── Typing indicator ──────────────────────────────────────
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

  // ── Read receipts ─────────────────────────────────────────
  socket.on('message:read', ({ senderId, receiverId }) => {
    const senderSocketId = onlineUsers.get(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('message:read', { receiverId });
    }
  });

  // ─────────────────────────────────────────────────────────
  //  WebRTC Signaling for Voice & Video Calls
  // ─────────────────────────────────────────────────────────

  // Incoming call
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
      // User not online — notify caller
      socket.emit('call:unavailable', { to });
    }
  });

  // Call accepted — send answer back to caller
  socket.on('call:answer', ({ to, from, answer }) => {
    const callerSocketId = onlineUsers.get(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:answered', { from, answer });
    }
  });

  // Call rejected
  socket.on('call:reject', ({ to, from }) => {
    const callerSocketId = onlineUsers.get(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call:rejected', { from });
    }
  });

  // Call ended
  socket.on('call:end', ({ to }) => {
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call:ended');
    }
  });

  // ICE candidate exchange
  socket.on('call:ice-candidate', ({ to, candidate }) => {
    const receiverSocketId = onlineUsers.get(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('call:ice-candidate', { candidate });
    }
  });

  // ── Friend request notification ───────────────────────────
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

  // ── Disconnect ────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 AuraChat Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   Client URL:  ${process.env.CLIENT_URL}`);
  console.log(`   API Base:    http://localhost:${PORT}/api\n`);
});
