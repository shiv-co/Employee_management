const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitNotification } = require('./socket');

const createNotification = async ({ userId, type, message, meta = {} }) => {
  const notification = await Notification.create({ userId, type, message, meta });
  emitNotification(String(userId), notification);
  return notification;
};

const notifyAdmins = async ({ type, message, meta = {} }) => {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  if (!admins.length) return;

  const payload = admins.map((admin) => ({
    userId: admin._id,
    type,
    message,
    meta
  }));

  const notifications = await Notification.insertMany(payload);
  notifications.forEach((notification) => {
    emitNotification(String(notification.userId), notification);
  });
};

module.exports = {
  createNotification,
  notifyAdmins
};
