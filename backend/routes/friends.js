const express = require('express');
const router = express.Router();
const {
  sendRequest,
  getRequests,
  acceptRequest,
  rejectRequest,
  getFriends,
  removeFriend,
  getFriendshipStatus,
} = require('../controllers/friendController');
const { protect } = require('../middleware/auth');

router.post('/request', protect, sendRequest);
router.get('/requests', protect, getRequests);
router.put('/accept/:requestId', protect, acceptRequest);
router.put('/reject/:requestId', protect, rejectRequest);
router.get('/status/:userId', protect, getFriendshipStatus);
router.get('/', protect, getFriends);
router.delete('/:friendId', protect, removeFriend);

module.exports = router;
