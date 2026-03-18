const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  deleteNotification
} = require('../controllers/notificationController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/me', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllRead);
router.patch('/me/read-all', markAllRead);
router.put('/:id/read', markAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
