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
app.use('/api/groups', require('./routes/groups'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AuraChat API is running 🚀', timestamp: new Date() });
});

// ─────────────────────────────────────────────────────────────
//  Socket.io Real-Time Logic
// ─────────────────────────────────────────────────────────────

const User = require('./models/User');
const FriendRequest = require('./models/FriendRequest');
const Message = require('./models/Message');
const Group = require('./models/Group');

// Map: userId -> socketId
const onlineUsers = new Map();

/**
 * @desc Check if two users have an accepted friendship
 * @param {string} userA
 * @param {string} userB
 * @returns {Promise<boolean>}
 */
async function checkFriendship(userA, userB) {
  if (userA === userB) return true; // self-message always allowed
  const friendship = await FriendRequest.findOne({
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA },
    ],
    status: 'accepted',
  });
  return !!friendship;
}

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ── User goes online ──────────────────────────────────────
  socket.on('user:online', async (userId) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;

    console.log(`✅ User ${userId} joined onlineUsers with socket ${socket.id}`);
    console.log(`📊 Current Online Users (${onlineUsers.size}):`, Array.from(onlineUsers.keys()));

    try {
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    } catch (e) { /* ignore */ }

    // Join all group rooms for this user
    try {
      const userGroups = await Group.find({ members: userId }).select('_id');
      userGroups.forEach((g) => {
        socket.join(`group:${g._id}`);
        console.log(`🏠 User ${userId} joined room group:${g._id}`);
      });
    } catch (e) { console.error('Group room join error:', e); }

    // Broadcast online status to all connected clients
    io.emit('user:status', { userId, isOnline: true });
    console.log(`👤 User online: ${userId}`);
  });

  // ── Join a group room dynamically (when group is created/user added) ──
  socket.on('group:join', (groupId) => {
    socket.join(`group:${groupId}`);
    console.log(`🏠 Socket ${socket.id} joined room group:${groupId}`);
  });

  socket.on('group:leave', (groupId) => {
    socket.leave(`group:${groupId}`);
    console.log(`🚪 Socket ${socket.id} left room group:${groupId}`);
  });

  // ── Group message broadcast ────────────────────────────────
  socket.on('group:message', (message) => {
    const groupId = message.group?._id || message.group;
    if (!groupId) return;
    console.log(`💬 Broadcasting group message to room group:${groupId}`);
    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(`group:${groupId}`).emit('group:message', message);
  });

  // ── Group typing indicators ────────────────────────────────
  socket.on('group:typing:start', ({ groupId, senderId, senderName }) => {
    socket.to(`group:${groupId}`).emit('group:typing:start', { groupId, senderId, senderName });
  });

  socket.on('group:typing:stop', ({ groupId, senderId }) => {
    socket.to(`group:${groupId}`).emit('group:typing:stop', { groupId, senderId });
  });

  // ── Group member events ────────────────────────────────────
  socket.on('group:member-added', ({ groupId, newMember }) => {
    // Let the newly added member know they should join the room
    const newMemberSocket = onlineUsers.get(newMember._id || newMember);
    if (newMemberSocket) {
      io.to(newMemberSocket).emit('group:added', { groupId });
    }
    io.to(`group:${groupId}`).emit('group:member-added', { groupId, newMember });
  });

  socket.on('group:member-removed', ({ groupId, removedUserId }) => {
    const removedSocket = onlineUsers.get(removedUserId);
    if (removedSocket) {
      io.to(removedSocket).emit('group:removed', { groupId });
    }
    io.to(`group:${groupId}`).emit('group:member-removed', { groupId, removedUserId });
  });

  // ── Send message via socket (real-time delivery) ──────────
  socket.on('message:send', async (message) => {
    const receiverId = message.receiver?._id || message.receiver;
    const senderId = message.sender?._id || message.sender;

    console.log(`📩 Server received message:send | From: ${senderId} | To: ${receiverId}`);

    // Friendship check (skip for self-messages)
    const isSelf = senderId === receiverId;
    if (!isSelf) {
      const areFriends = await checkFriendship(senderId, receiverId);
      if (!areFriends) {
        console.log(`🚫 Blocked message from ${senderId} to ${receiverId} — not friends`);
        socket.emit('message:error', {
          error: 'You must be friends to message this user.',
          receiverId,
        });
        return;
      }
    }

    if (isSelf) {
      // Self-message: echo back to sender's own socket
      socket.emit('message:receive', message);
    } else {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        console.log(`🚀 Routing message to socket: ${receiverSocketId}`);
        io.to(receiverSocketId).emit('message:receive', message);
      } else {
        console.log(`⚠️ Receiver ${receiverId} is NOT in onlineUsers map. Delivery skipped.`);
      }
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

  // ── Mark messages as read (with DB update) ────────────────
  socket.on('message:mark-read', async ({ senderId, receiverId }) => {
    try {
      // Mark all unread messages from senderId to receiverId as read
      await Message.updateMany(
        { sender: senderId, receiver: receiverId, read: false },
        { read: true, readAt: new Date() }
      );

      // Notify the original sender that their messages were read (read receipt)
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('message:read-ack', { readBy: receiverId });
      }
    } catch (e) {
      console.error('message:mark-read error:', e);
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
