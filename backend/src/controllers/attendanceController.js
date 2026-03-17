const Attendance = require('../models/Attendance');
const AttendanceCorrection = require('../models/AttendanceCorrection');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { notifyAdmins } = require('../utils/notification');

const getToday = () => new Date().toISOString().slice(0, 10);

const detectLate = (dateValue) => {
  if (!dateValue) return false;
  const checkInDate = new Date(dateValue);
  const hh = checkInDate.getHours();
  const mm = checkInDate.getMinutes();
  return hh > 9 || (hh === 9 && mm > 45);
};

const deriveStatus = (hasCheckIn, isLate) => {
  if (!hasCheckIn) return 'Absent';
  return isLate ? 'Late' : 'Present';
};

const checkIn = asyncHandler(async (req, res) => {
  const date = getToday();

  let attendance = await Attendance.findOne({ employeeId: req.user._id, date });

  if (attendance && attendance.checkInTime) {
    throw new ApiError(409, 'Already checked in today');
  }

  if (!attendance) {
    attendance = new Attendance({ employeeId: req.user._id, date });
  }

  attendance.checkInTime = new Date();
  attendance.isLate = detectLate(attendance.checkInTime);
  attendance.status = deriveStatus(true, attendance.isLate);
  attendance.entrySource = 'instant';
  await attendance.save();

  res.status(200).json({ success: true, message: 'Check-in recorded', data: attendance });
});

const checkOut = asyncHandler(async (req, res) => {
  const date = getToday();

  const attendance = await Attendance.findOne({ employeeId: req.user._id, date });
  if (!attendance || !attendance.checkInTime) {
    throw new ApiError(400, 'Check-in required before check-out');
  }

  if (attendance.checkOutTime) {
    throw new ApiError(409, 'Already checked out today');
  }

  attendance.checkOutTime = new Date();
  attendance.totalWorkMinutes = Math.max(
    0,
    Math.round((attendance.checkOutTime - attendance.checkInTime) / (1000 * 60))
  );
  await attendance.save();

  res.status(200).json({ success: true, message: 'Check-out recorded', data: attendance });
});

const submitManualAttendanceEntry = asyncHandler(async (req, res) => {
  const { date, checkInTime, checkOutTime, note = '' } = req.body;
  if (!date || !checkInTime || !checkOutTime) {
    throw new ApiError(400, 'date, checkInTime and checkOutTime are required');
  }

  const correction = await AttendanceCorrection.create({
    employeeId: req.user._id,
    date,
    requestType: 'manual-entry',
    correctCheckIn: new Date(checkInTime),
    correctCheckOut: new Date(checkOutTime),
    note,
    status: 'pending'
  });

  await Attendance.findOneAndUpdate(
    { employeeId: req.user._id, date },
    {
      $set: {
        checkInTime: new Date(checkInTime),
        checkOutTime: new Date(checkOutTime),
        status: 'Manual Entry',
        entrySource: 'manual',
        notes: note
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await notifyAdmins({
    type: 'manual_attendance_requested',
    message: `${req.user.name} submitted manual attendance entry for ${date}`,
    meta: { correctionId: correction._id, employeeId: req.user._id }
  });

  res.status(201).json({ success: true, message: 'Manual attendance entry submitted for approval', data: correction });
});

const getMyAttendance = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const query = { employeeId: req.user._id };
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }

  const attendance = await Attendance.find(query).sort({ date: -1 });

  res.status(200).json({ success: true, data: attendance });
});

const getAttendance = asyncHandler(async (req, res) => {
  const { employeeId, date, from, to } = req.query;

  const query = {};
  if (employeeId) query.employeeId = employeeId;
  if (date) {
    query.date = date;
  } else if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }

  const records = await Attendance.find(query)
    .populate('employeeId', 'name email department designation')
    .sort({ date: -1, createdAt: -1 });

  res.status(200).json({ success: true, data: records });
});

const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const match = {};

  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = from;
    if (to) match.date.$lte = to;
  }

  const summary = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$employeeId',
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: {
            $cond: [{ $in: ['$status', ['Present', 'Late', 'present']] }, 1, 0]
          }
        },
        lateDays: {
          $sum: {
            $cond: ['$isLate', 1, 0]
          }
        },
        totalWorkMinutes: { $sum: '$totalWorkMinutes' }
      }
    }
  ]);

  res.status(200).json({ success: true, data: summary });
});

const submitCorrectionRequest = asyncHandler(async (req, res) => {
  const { date, correctCheckIn = null, correctCheckOut = null, note = '' } = req.body;

  if (!date) {
    throw new ApiError(400, 'date is required');
  }

  const correction = await AttendanceCorrection.create({
    employeeId: req.user._id,
    date,
    requestType: 'correction',
    correctCheckIn,
    correctCheckOut,
    note,
    status: 'pending'
  });

  await notifyAdmins({
    type: 'attendance_correction_requested',
    message: `${req.user.name} requested attendance correction for ${date}`,
    meta: { correctionId: correction._id, employeeId: req.user._id }
  });

  res.status(201).json({ success: true, message: 'Attendance correction request submitted', data: correction });
});

const getMyCorrectionRequests = asyncHandler(async (req, res) => {
  const corrections = await AttendanceCorrection.find({ employeeId: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: corrections });
});

const getCorrectionRequests = asyncHandler(async (_req, res) => {
  const corrections = await AttendanceCorrection.find({})
    .populate('employeeId', 'name department')
    .populate('reviewedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: corrections });
});

const reviewCorrectionRequest = asyncHandler(async (req, res) => {
  const { status, reviewNote = '' } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    throw new ApiError(400, 'status must be approved or rejected');
  }

  const correction = await AttendanceCorrection.findById(req.params.id);
  if (!correction) {
    throw new ApiError(404, 'Correction request not found');
  }

  correction.status = status;
  correction.reviewNote = reviewNote;
  correction.reviewedBy = req.user._id;
  await correction.save();

  if (status === 'approved') {
    const attendance = await Attendance.findOneAndUpdate(
      { employeeId: correction.employeeId, date: correction.date },
      {
        $set: {
          checkInTime: correction.correctCheckIn,
          checkOutTime: correction.correctCheckOut,
          notes: correction.note,
          entrySource: correction.requestType === 'manual-entry' ? 'manual' : 'instant'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    attendance.isLate = detectLate(attendance.checkInTime);
    attendance.status = deriveStatus(Boolean(attendance.checkInTime), attendance.isLate);
    if (attendance.checkInTime && attendance.checkOutTime) {
      attendance.totalWorkMinutes = Math.max(
        0,
        Math.round((attendance.checkOutTime - attendance.checkInTime) / (1000 * 60))
      );
    }
    await attendance.save();
  }

  if (status === 'rejected' && correction.requestType === 'manual-entry') {
    await Attendance.findOneAndUpdate(
      { employeeId: correction.employeeId, date: correction.date, status: 'Manual Entry' },
      { $set: { status: 'Absent' } }
    );
  }

  res.status(200).json({ success: true, message: `Correction request ${status}`, data: correction });
});

// comment 
module.exports = {
  checkIn,
  checkOut,
  submitManualAttendanceEntry,
  getMyAttendance,
  getAttendance,
  getAttendanceSummary,
  submitCorrectionRequest,
  getMyCorrectionRequests,
  getCorrectionRequests,
  reviewCorrectionRequest
};

