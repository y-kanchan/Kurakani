const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  sendMessage,
  getConversation,
  getSelfMessages,
  markRead,
  markReadBulk,
  deleteMessage,
  getUnreadCounts,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { requireFriendship } = require('../middleware/requireFriendship');

// Multer for voice and image files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'voice') {
      cb(null, path.join(__dirname, '..', 'uploads', 'voices'));
    } else {
      cb(null, path.join(__dirname, '..', 'uploads', 'images'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'voice') {
    if (file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio files allowed for voice'), false);
  } else if (file.fieldname === 'image') {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

const uploadFields = upload.fields([
  { name: 'voice', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

// Static routes (must come before parameterized routes)
router.get('/unread', protect, getUnreadCounts);
router.get('/self', protect, getSelfMessages);
router.post('/mark-read', protect, markReadBulk);

// Message CRUD
router.post('/', protect, uploadFields, requireFriendship, sendMessage);
router.get('/:userId', protect, getConversation);
router.put('/read/:senderId', protect, markRead);
router.delete('/:messageId', protect, deleteMessage);

module.exports = router;
