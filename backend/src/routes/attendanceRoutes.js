const express = require('express');
const {
  checkIn,
  checkOut,
  submitManualAttendanceEntry,
  getMyAttendance,
  getAttendance,
  getTodayAttendanceDetails,
  getAttendanceSummary,
  submitCorrectionRequest,
  getMyCorrectionRequests,
  getCorrectionRequests,
  reviewCorrectionRequest
} = require('../controllers/attendanceController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

router.post('/check-in', authorize('employee', 'admin'), checkIn);
router.post('/check-out', authorize('employee', 'admin'), checkOut);
router.post('/manual-entry', authorize('employee', 'admin'), submitManualAttendanceEntry);
router.get('/me', authorize('employee', 'admin'), getMyAttendance);
router.get('/today', authorize('admin'), getTodayAttendanceDetails);
router.get('/', authorize('admin'), getAttendance);
router.get('/summary', authorize('admin'), getAttendanceSummary);

router.post('/corrections', authorize('employee', 'admin'), submitCorrectionRequest);
router.get('/corrections/me', authorize('employee', 'admin'), getMyCorrectionRequests);
router.get('/corrections', authorize('admin'), getCorrectionRequests);
router.patch('/corrections/:id/review', authorize('admin'), reviewCorrectionRequest);

module.exports = router;
