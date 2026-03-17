const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const DailyReport = require('../models/DailyReport');
const asyncHandler = require('../utils/asyncHandler');

const getAdminOverview = asyncHandler(async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const startOfDay = new Date(`${today}T00:00:00.000Z`);

  const [
    totalEmployees,
    activeEmployees,
    employeesPresentToday,
    employeesLateToday,
    pendingTasks,
    tasksCompletedToday,
    doneTasks,
    todaysReports
  ] = await Promise.all([
    User.countDocuments({ role: 'employee' }),
    User.countDocuments({ role: 'employee', isActive: true }),
    Attendance.countDocuments({ date: today, checkInTime: { $ne: null } }),
    Attendance.countDocuments({ date: today, isLate: true }),
    Task.countDocuments({ status: { $in: ['Pending', 'In Progress', 'todo', 'in-progress'] } }),
    Task.countDocuments({ status: { $in: ['Completed', 'done'] }, updatedAt: { $gte: startOfDay } }),
    Task.countDocuments({ status: { $in: ['Completed', 'done'] } }),
    DailyReport.countDocuments({ date: today })
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalEmployees,
      activeEmployees,
      employeesPresentToday,
      employeesLateToday,
      tasksCompletedToday,
      pendingTasks,
      todaysReports,
      todaysAttendance: employeesPresentToday,
      openTasks: pendingTasks,
      doneTasks
    }
  });
});

const getAttendanceTrends = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const match = {};

  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;
  }

  const trends = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$date',
        checkIns: {
          $sum: {
            $cond: [{ $ne: ['$checkInTime', null] }, 1, 0]
          }
        },
        lateCheckIns: {
          $sum: {
            $cond: ['$isLate', 1, 0]
          }
        },
        totalMinutes: { $sum: '$totalWorkMinutes' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({ success: true, data: trends });
});

const getTaskMetrics = asyncHandler(async (_req, res) => {
  const metrics = await Task.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({ success: true, data: metrics });
});

const getReportCompliance = asyncHandler(async (req, res) => {
  const { date = new Date().toISOString().slice(0, 10) } = req.query;

  const [employeeCount, submittedCount] = await Promise.all([
    User.countDocuments({ role: 'employee', isActive: true }),
    DailyReport.countDocuments({ date })
  ]);

  res.status(200).json({
    success: true,
    data: {
      date,
      employeeCount,
      submittedCount,
      compliancePercent: employeeCount ? Math.round((submittedCount / employeeCount) * 100) : 0
    }
  });
});

const getRecentAssignedTasks = asyncHandler(async (_req, res) => {
  const tasks = await Task.find({ taskType: 'assigned' })
    .populate('assignedTo', 'name email department')
    .populate('assignedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(8);

  res.status(200).json({ success: true, data: tasks });
});

module.exports = {
  getAdminOverview,
  getAttendanceTrends,
  getTaskMetrics,
  getReportCompliance,
  getRecentAssignedTasks
};
