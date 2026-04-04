const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// @desc    Search users by username or displayName
// @route   GET /api/users/search?q=query
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { displayName: { $regex: q, $options: 'i' } },
          ],
        },
      ],
    })
      .select('username displayName profilePic isOnline lastSeen status')
      .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { displayName, status, bio } = req.body;
    const updateData = { profileSetupComplete: true };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (status !== undefined) updateData.status = status;
    if (bio !== undefined) updateData.bio = bio;

    if (req.file) {
      // Delete old profile pic if not default
      if (req.user.profilePic && req.user.profilePic.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', req.user.profilePic);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updateData.profilePic = `/uploads/profiles/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      'username displayName profilePic isOnline lastSeen status bio'
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('GetUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { searchUsers, updateProfile, getUserById };
