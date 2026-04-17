const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

// @desc    Send friend request
// @route   POST /api/friends/request
// @access  Private
const sendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;

    if (!receiverId) return res.status(400).json({ message: 'Receiver ID required' });
    if (receiverId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: 'User not found' });

    // Check if already friends
    if (req.user.friends.includes(receiverId)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    // Check existing request
    const existing = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { sender: receiverId, receiver: req.user._id },
      ],
    });

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(400).json({ message: 'Friend request already sent' });
      }
      if (existing.status === 'accepted') {
        return res.status(400).json({ message: 'Already friends' });
      }
      // If rejected, allow re-sending
      existing.status = 'pending';
      existing.sender = req.user._id;
      existing.receiver = receiverId;
      await existing.save();
      const populated = await FriendRequest.findById(existing._id)
        .populate('sender', 'username displayName profilePic')
        .populate('receiver', 'username displayName profilePic');
      return res.status(201).json({ message: 'Friend request sent', request: populated });
    }

    const request = await FriendRequest.create({
      sender: req.user._id,
      receiver: receiverId,
    });

    const populated = await FriendRequest.findById(request._id)
      .populate('sender', 'username displayName profilePic')
      .populate('receiver', 'username displayName profilePic');

    res.status(201).json({ message: 'Friend request sent', request: populated });
  } catch (error) {
    console.error('Send request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get pending friend requests (received)
// @route   GET /api/friends/requests
// @access  Private
const getRequests = async (req, res) => {
  try {
    const received = await FriendRequest.find({
      receiver: req.user._id,
      status: 'pending',
    }).populate('sender', 'username displayName profilePic isOnline lastSeen');

    const sent = await FriendRequest.find({
      sender: req.user._id,
      status: 'pending',
    }).populate('receiver', 'username displayName profilePic isOnline lastSeen');

    res.json({ received, sent });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Accept friend request
// @route   PUT /api/friends/accept/:requestId
// @access  Private
const acceptRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    request.status = 'accepted';
    await request.save();

    // Add each other as friends
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { friends: request.sender },
    });
    await User.findByIdAndUpdate(request.sender, {
      $addToSet: { friends: req.user._id },
    });

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reject friend request
// @route   PUT /api/friends/reject/:requestId
// @access  Private
const rejectRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get friends list
// @route   GET /api/friends
// @access  Private
const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      'friends',
      'username displayName profilePic isOnline lastSeen status bio'
    );
    res.json(user.friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove friend
// @route   DELETE /api/friends/:friendId
// @access  Private
const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    await User.findByIdAndUpdate(req.user._id, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: req.user._id } });
    // Clean up accepted friend request record
    await FriendRequest.deleteMany({
      $or: [
        { sender: req.user._id, receiver: friendId },
        { sender: friendId, receiver: req.user._id },
      ],
    });
    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Get friendship status between current user and a target user
 * @route   GET /api/friends/status/:userId
 * @access  Private
 * @returns {{ status: 'accepted' | 'pending' | 'incoming' | 'none' }}
 */
const getFriendshipStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    // Self check
    if (userId === req.user._id.toString()) {
      return res.json({ status: 'self' });
    }

    // Check if already friends via User.friends array
    const currentUser = await User.findById(req.user._id);
    if (currentUser.friends.includes(userId)) {
      return res.json({ status: 'accepted' });
    }

    // Check for pending friend requests
    const request = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id },
      ],
    });

    if (!request) {
      return res.json({ status: 'none' });
    }

    if (request.status === 'accepted') {
      return res.json({ status: 'accepted' });
    }

    if (request.status === 'pending') {
      // Determine direction
      if (request.sender.toString() === req.user._id.toString()) {
        return res.json({ status: 'pending', requestId: request._id }); // I sent it
      } else {
        return res.json({ status: 'incoming', requestId: request._id }); // They sent it
      }
    }

    // Rejected — treat as none so user can re-send
    return res.json({ status: 'none' });
  } catch (error) {
    console.error('Get friendship status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { sendRequest, getRequests, acceptRequest, rejectRequest, getFriends, removeFriend, getFriendshipStatus };
