const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./authRoutes');
const employeeRoutes = require('./employeeRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const taskRoutes = require('./taskRoutes');
const reportRoutes = require('./reportRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const leaveRoutes = require('./leaveRoutes');
const notificationRoutes = require('./notificationRoutes');
const todoRoutes = require('./todoRoutes');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: Date.now()
  });
});

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/tasks', taskRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/leaves', leaveRoutes);
router.use('/notifications', notificationRoutes);
router.use('/todos', todoRoutes);

module.exports = router;

