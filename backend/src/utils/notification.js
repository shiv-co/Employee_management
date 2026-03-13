const Notification = require('../models/Notification');
const User = require('../models/User');

const createNotification = async ({ userId, type, message, meta = {} }) => {
  await Notification.create({ userId, type, message, meta });
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

  await Notification.insertMany(payload);
};

module.exports = {
  createNotification,
  notifyAdmins
};
