const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;

    if (!receiverId) return res.status(400).json({ message: 'Receiver ID required' });
    if (!text && !req.files?.voice && !req.files?.image) {
      return res.status(400).json({ message: 'Message content required' });
    }

    const messageData = {
      sender: req.user._id,
      receiver: receiverId,
      text: text || '',
    };

    if (req.files?.voice) {
      messageData.voiceUrl = `/uploads/voices/${req.files.voice[0].filename}`;
    }
    if (req.files?.image) {
      messageData.imageUrl = `/uploads/images/${req.files.image[0].filename}`;
    }

    const message = await Message.create(messageData);
    const populated = await Message.findById(message._id)
      .populate('sender', 'username displayName profilePic')
      .populate('receiver', 'username displayName profilePic');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get conversation between two users
// @route   GET /api/messages/:userId
// @access  Private
const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id },
      ],
      deleted: false,
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', 'username displayName profilePic')
      .populate('receiver', 'username displayName profilePic');

    res.json(messages);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:senderId
// @access  Private
const markRead = async (req, res) => {
  try {
    const result = await Message.updateMany(
      {
        sender: req.params.senderId,
        receiver: req.user._id,
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );

    res.json({ message: 'Messages marked as read', count: result.modifiedCount });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a message (soft delete)
// @route   DELETE /api/messages/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    message.deleted = true;
    message.text = '';
    await message.save();

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get unread message counts per sender
// @route   GET /api/messages/unread
// @access  Private
const getUnreadCounts = async (req, res) => {
  try {
    const counts = await Message.aggregate([
      { $match: { receiver: req.user._id, read: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } },
    ]);
    res.json(counts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { sendMessage, getConversation, markRead, deleteMessage, getUnreadCounts };
