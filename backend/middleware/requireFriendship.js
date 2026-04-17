const FriendRequest = require('../models/FriendRequest');

/**
 * @desc Middleware that ensures sender and receiver are accepted friends.
 *       Skips the check when the receiver is the sender themselves (self-note).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const requireFriendship = async (req, res, next) => {
  try {
    const receiverId = req.body.receiverId;

    // Allow self-messaging (Notes to Self)
    if (!receiverId || receiverId === req.user._id.toString()) {
      return next();
    }

    const friendship = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { requester: req.user._id, recipient: receiverId },
        { sender: receiverId, receiver: req.user._id },
        { requester: receiverId, recipient: req.user._id },
      ],
      status: 'accepted',
    });

    if (!friendship) {
      return res.status(403).json({
        message: 'You must be friends to message this user.',
      });
    }

    next();
  } catch (error) {
    console.error('requireFriendship error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { requireFriendship };
