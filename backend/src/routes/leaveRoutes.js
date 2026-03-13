const express = require('express');
const {
  createLeaveRequest,
  getMyLeaveRequests,
  getLeaveRequests,
  reviewLeaveRequest
} = require('../controllers/leaveController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('employee', 'admin'), createLeaveRequest);
router.get('/me', authorize('employee', 'admin'), getMyLeaveRequests);
router.get('/', authorize('admin'), getLeaveRequests);
router.patch('/:id/review', authorize('admin'), reviewLeaveRequest);

module.exports = router;
