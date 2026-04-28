const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const buildFileUrl = (req, relativePath) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}/${relativePath.replace(/\\/g, '/')}`;
};

// ─── Create Group ─────────────────────────────────────────────────────────────
// POST /api/groups
exports.createGroup = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Parse memberIds — may arrive as JSON string or array
    let parsedMembers = [];
    if (typeof memberIds === 'string') {
      try { parsedMembers = JSON.parse(memberIds); } catch { parsedMembers = [memberIds]; }
    } else if (Array.isArray(memberIds)) {
      parsedMembers = memberIds;
    }

    // Always include the creator
    const members = [...new Set([req.user._id.toString(), ...parsedMembers])];

    // Validate all member IDs are valid users
    const users = await User.find({ _id: { $in: members } }).select('_id');
    if (users.length !== members.length) {
      return res.status(400).json({ message: 'One or more member IDs are invalid' });
    }

    let avatarUrl = '';
    if (req.files?.avatar?.[0]) {
      const file = req.files.avatar[0];
      avatarUrl = buildFileUrl(req, `uploads/profiles/${file.filename}`);
    }

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || '',
      avatar: avatarUrl,
      admin: req.user._id,
      members,
    });

    const populated = await Group.findById(group._id).populate(
      'members admin',
      'username displayName profilePic isOnline'
    );

    res.status(201).json(populated);
  } catch (err) {
    console.error('createGroup error:', err);
    res.status(500).json({ message: 'Failed to create group' });
  }
};

// ─── Get My Groups ─────────────────────────────────────────────────────────────
// GET /api/groups
exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members admin', 'username displayName profilePic isOnline')
      .sort({ updatedAt: -1 });

    // Attach last message to each group
    const enriched = await Promise.all(
      groups.map(async (g) => {
        const lastMsg = await Message.findOne({ group: g._id })
          .sort({ createdAt: -1 })
          .populate('sender', 'username displayName')
          .lean();
        return { ...g.toObject(), lastMessage: lastMsg };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('getMyGroups error:', err);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
};

// ─── Get Single Group ──────────────────────────────────────────────────────────
// GET /api/groups/:groupId
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate(
      'members admin pinnedMessage',
      'username displayName profilePic isOnline text createdAt'
    );
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Membership check
    const isMember = group.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });

    res.json(group);
  } catch (err) {
    console.error('getGroup error:', err);
    res.status(500).json({ message: 'Failed to fetch group' });
  }
};

// ─── Update Group (admin only) ─────────────────────────────────────────────────
// PUT /api/groups/:groupId
exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the admin can update the group' });
    }

    const { name, description } = req.body;
    if (name?.trim()) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();

    if (req.files?.avatar?.[0]) {
      const file = req.files.avatar[0];
      group.avatar = buildFileUrl(req, `uploads/profiles/${file.filename}`);
    }

    await group.save();
    const populated = await Group.findById(group._id).populate(
      'members admin',
      'username displayName profilePic isOnline'
    );
    res.json(populated);
  } catch (err) {
    console.error('updateGroup error:', err);
    res.status(500).json({ message: 'Failed to update group' });
  }
};

// ─── Delete Group (admin only) ─────────────────────────────────────────────────
// DELETE /api/groups/:groupId
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the admin can delete the group' });
    }

    await Message.deleteMany({ group: group._id });
    await group.deleteOne();

    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('deleteGroup error:', err);
    res.status(500).json({ message: 'Failed to delete group' });
  }
};

// ─── Add Member (admin only) ──────────────────────────────────────────────────
// POST /api/groups/:groupId/add-member
exports.addMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the admin can add members' });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const user = await User.findById(userId).select('_id username displayName profilePic');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const alreadyMember = group.members.some((m) => m.toString() === userId);
    if (alreadyMember) return res.status(400).json({ message: 'Already a member' });

    group.members.push(userId);
    await group.save();

    const populated = await Group.findById(group._id).populate(
      'members admin',
      'username displayName profilePic isOnline'
    );
    res.json(populated);
  } catch (err) {
    console.error('addMember error:', err);
    res.status(500).json({ message: 'Failed to add member' });
  }
};

// ─── Remove Member (admin only) ───────────────────────────────────────────────
// DELETE /api/groups/:groupId/member/:userId
exports.removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the admin can remove members' });
    }

    const { userId } = req.params;
    if (userId === group.admin.toString()) {
      return res.status(400).json({ message: 'Cannot remove the admin from the group' });
    }

    group.members = group.members.filter((m) => m.toString() !== userId);
    await group.save();

    const populated = await Group.findById(group._id).populate(
      'members admin',
      'username displayName profilePic isOnline'
    );
    res.json(populated);
  } catch (err) {
    console.error('removeMember error:', err);
    res.status(500).json({ message: 'Failed to remove member' });
  }
};

// ─── Leave Group (any member) ──────────────────────────────────────────────────
// POST /api/groups/:groupId/leave
exports.leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const userId = req.user._id.toString();
    const isMember = group.members.some((m) => m.toString() === userId);
    if (!isMember) return res.status(400).json({ message: 'You are not a member' });

    if (group.admin.toString() === userId && group.members.length > 1) {
      return res.status(400).json({
        message: 'Admin must transfer ownership or delete the group before leaving',
      });
    }

    group.members = group.members.filter((m) => m.toString() !== userId);

    // If last member leaves, delete group
    if (group.members.length === 0) {
      await Message.deleteMany({ group: group._id });
      await group.deleteOne();
      return res.json({ message: 'Left and group deleted (no remaining members)' });
    }

    await group.save();
    res.json({ message: 'Left group successfully' });
  } catch (err) {
    console.error('leaveGroup error:', err);
    res.status(500).json({ message: 'Failed to leave group' });
  }
};

// ─── Get Group Messages ────────────────────────────────────────────────────────
// GET /api/groups/:groupId/messages?page=1&limit=50
exports.getGroupMessages = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).select('members');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ group: req.params.groupId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username displayName profilePic')
      .lean();

    res.json(messages.reverse());
  } catch (err) {
    console.error('getGroupMessages error:', err);
    res.status(500).json({ message: 'Failed to fetch group messages' });
  }
};

// ─── Send Group Message ────────────────────────────────────────────────────────
// POST /api/groups/:groupId/messages
exports.sendGroupMessage = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).select('members');
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Not a member of this group' });

    const { text } = req.body;
    let voiceUrl = '';
    let imageUrl = '';

    if (req.files?.voice?.[0]) {
      const file = req.files.voice[0];
      voiceUrl = buildFileUrl(req, `uploads/voices/${file.filename}`);
    }
    if (req.files?.image?.[0]) {
      const file = req.files.image[0];
      imageUrl = buildFileUrl(req, `uploads/images/${file.filename}`);
    }

    if (!text?.trim() && !voiceUrl && !imageUrl) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const msg = await Message.create({
      sender: req.user._id,
      group: req.params.groupId,
      text: text?.trim() || '',
      voiceUrl,
      imageUrl,
    });

    const populated = await Message.findById(msg._id)
      .populate('sender', 'username displayName profilePic')
      .lean();

    // Update group's updatedAt for sorting
    await Group.findByIdAndUpdate(req.params.groupId, { updatedAt: new Date() });

    res.status(201).json(populated);
  } catch (err) {
    console.error('sendGroupMessage error:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

// ─── Pin Message ───────────────────────────────────────────────────────────────
// POST /api/groups/:groupId/pin
exports.pinMessage = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the admin can pin messages' });
    }
    group.pinnedMessage = req.body.messageId;
    await group.save();
    res.json({ pinnedMessage: group.pinnedMessage });
  } catch (err) {
    res.status(500).json({ message: 'Failed to pin message' });
  }
};

// ─── Unpin Message ─────────────────────────────────────────────────────────────
// POST /api/groups/:groupId/unpin
exports.unpinMessage = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the admin can unpin messages' });
    }
    group.pinnedMessage = null;
    await group.save();
    res.json({ pinnedMessage: null });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unpin message' });
  }
};
