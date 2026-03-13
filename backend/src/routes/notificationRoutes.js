const express = require('express');
const {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
} = require('../controllers/notificationController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/me', getMyNotifications);
router.patch('/me/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);

module.exports = router;
