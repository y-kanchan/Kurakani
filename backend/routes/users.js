const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { searchUsers, updateProfile, getUserById } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Configure multer for profile pic uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'profiles'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

router.get('/search', protect, searchUsers);
router.put('/profile', protect, upload.single('profilePic'), updateProfile);
router.get('/:id', protect, getUserById);

module.exports = router;
