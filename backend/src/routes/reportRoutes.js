const express = require('express');
const {
  submitDailyReport,
  getMyReports,
  getReports,
  updateReport
} = require('../controllers/reportController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

router.post('/daily', authorize('employee', 'admin'), submitDailyReport);
router.get('/me', authorize('employee', 'admin'), getMyReports);
router.get('/', authorize('admin'), getReports);
router.patch('/:id', authorize('employee', 'admin'), updateReport);

module.exports = router;
