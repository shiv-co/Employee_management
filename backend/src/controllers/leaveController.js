const LeaveRequest = require('../models/LeaveRequest');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { createNotification, notifyAdmins } = require('../utils/notification');

const createLeaveRequest = asyncHandler(async (req, res) => {
  const { leaveType = 'Casual', startDate, endDate, reason } = req.body;

  if (!startDate || !endDate || !reason) {
    throw new ApiError(400, 'startDate, endDate, and reason are required');
  }

  const leaveRequest = await LeaveRequest.create({
    employeeId: req.user._id,
    leaveType,
    startDate,
    endDate,
    reason,
    status: 'pending'
  });

  await notifyAdmins({
    type: 'leave_requested',
    message: `${req.user.name} submitted a leave request`,
    meta: { leaveRequestId: leaveRequest._id, employeeId: req.user._id }
  });

  res.status(201).json({ success: true, message: 'Leave request submitted', data: leaveRequest });
});

const getMyLeaveRequests = asyncHandler(async (req, res) => {
  const requests = await LeaveRequest.find({ employeeId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: requests });
});

const getLeaveRequests = asyncHandler(async (_req, res) => {
  const requests = await LeaveRequest.find({})
    .populate('employeeId', 'name email department mobileNumber')
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: requests });
});

const reviewLeaveRequest = asyncHandler(async (req, res) => {
  const { status, reviewNote = '' } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    throw new ApiError(400, 'status must be approved or rejected');
  }

  const leaveRequest = await LeaveRequest.findById(req.params.id);
  if (!leaveRequest) {
    throw new ApiError(404, 'Leave request not found');
  }

  leaveRequest.status = status;
  leaveRequest.reviewNote = reviewNote;
  leaveRequest.reviewedBy = req.user._id;
  await leaveRequest.save();

  await createNotification({
    userId: leaveRequest.employeeId,
    type: 'leave_reviewed',
    message: `Your leave request has been ${status}`,
    meta: { leaveRequestId: leaveRequest._id, status }
  });

  res.status(200).json({ success: true, message: `Leave request ${status}`, data: leaveRequest });
});

module.exports = {
  createLeaveRequest,
  getMyLeaveRequests,
  getLeaveRequests,
  reviewLeaveRequest
};

