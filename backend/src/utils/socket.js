let ioInstance = null;

const setIo = (io) => {
  ioInstance = io;
};

const getIo = () => ioInstance;

const emitNotification = (userId, notification) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(userId).emit('notification', notification);
};

module.exports = {
  setIo,
  getIo,
  emitNotification
};
