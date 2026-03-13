const express = require('express');
const {
  getAdminOverview,
  getAttendanceTrends,
  getTaskMetrics,
  getReportCompliance
} = require('../controllers/dashboardController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/admin/overview', getAdminOverview);
router.get('/admin/attendance-trends', getAttendanceTrends);
router.get('/admin/task-metrics', getTaskMetrics);
router.get('/admin/report-compliance', getReportCompliance);

module.exports = router;
