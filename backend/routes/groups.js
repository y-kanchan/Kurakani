const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/auth');
const {
  createGroup,
  getMyGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  getGroupMessages,
  sendGroupMessage,
  pinMessage,
  unpinMessage,
  addMember,
  removeMember,
  leaveGroup,
} = require('../controllers/groupController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'voice') {
      cb(null, path.join(__dirname, '..', 'uploads', 'voices'));
    } else if (file.fieldname === 'avatar') {
      cb(null, path.join(__dirname, '..', 'uploads', 'profiles'));
    } else {
      cb(null, path.join(__dirname, '..', 'uploads', 'images'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

const uploadGroupCreate = upload.fields([{ name: 'avatar', maxCount: 1 }]);
const uploadGroupMsg = upload.fields([
  { name: 'voice', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

// ── Group CRUD ────────────────────────────────────────────────────────────────
router.post('/', protect, uploadGroupCreate, createGroup);
router.get('/', protect, getMyGroups);
router.get('/:groupId', protect, getGroup);
router.put('/:groupId', protect, uploadGroupCreate, updateGroup);
router.delete('/:groupId', protect, deleteGroup);

// ── Messages ──────────────────────────────────────────────────────────────────
router.get('/:groupId/messages', protect, getGroupMessages);
router.post('/:groupId/messages', protect, uploadGroupMsg, sendGroupMessage);

// ── Pin / Unpin ────────────────────────────────────────────────────────────────
router.post('/:groupId/pin', protect, pinMessage);
router.post('/:groupId/unpin', protect, unpinMessage);

// ── Members ───────────────────────────────────────────────────────────────────
router.post('/:groupId/add-member', protect, addMember);
router.delete('/:groupId/member/:userId', protect, removeMember);
router.post('/:groupId/leave', protect, leaveGroup);

module.exports = router;
