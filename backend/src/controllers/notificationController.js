const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly = 'false' } = req.query;
  const query = { userId: req.user._id };
  if (unreadOnly === 'true') {
    query.isRead = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({ success: true, data: notifications });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.status(200).json({ success: true, data: { unreadCount: count } });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }

  res.status(200).json({ success: true, data: notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { $set: { isRead: true } });
  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const result = await Notification.deleteOne({ _id: req.params.id, userId: req.user._id });
  if (!result.deletedCount) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }

  res.status(200).json({ success: true, message: 'Notification deleted' });
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  deleteNotification
};
