const Attendance = require('../models/Attendance');
const AttendanceCorrection = require('../models/AttendanceCorrection');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { notifyAdmins } = require('../utils/notification');

const IST_TIME_ZONE = 'Asia/Kolkata';

const getISTParts = (date = new Date()) => {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  const partMap = formatted.reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  return {
    date: `${partMap.year}-${partMap.month}-${partMap.day}`,
    hour: Number(partMap.hour || 0),
    minute: Number(partMap.minute || 0)
  };
};

const getToday = () => getISTParts().date;

const parseAttendanceDateTime = (date, value) => {
  if (!value) return null;

  const normalized = String(value).trim();
  const timePart = normalized.includes('T') ? normalized.split('T')[1].slice(0, 5) : normalized.slice(0, 5);
  const [hours = '00', minutes = '00'] = timePart.split(':');

  return new Date(`${date}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00+05:30`);
};

const detectLate = (dateValue) => {
  if (!dateValue) return false;
  const { hour, minute } = getISTParts(new Date(dateValue));
  return hour > 9 || (hour === 9 && minute > 45);
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
  const { date, checkInTime, checkOutTime, checkIn, checkOut, note = '' } = req.body;
  if (!date) {
    throw new ApiError(400, 'date is required');
  }

  if (date !== getToday()) {
    throw new ApiError(400, 'Manual attendance allowed only for today');
  }

  const normalizedCheckIn = checkIn || checkInTime || null;
  const normalizedCheckOut = checkOut || checkOutTime || null;

  if (!normalizedCheckIn && !normalizedCheckOut) {
    throw new ApiError(400, 'At least one of checkIn or checkOut is required');
  }

  const parsedCheckIn = parseAttendanceDateTime(date, normalizedCheckIn);
  const parsedCheckOut = parseAttendanceDateTime(date, normalizedCheckOut);

  const correction = await AttendanceCorrection.create({
    employeeId: req.user._id,
    date,
    requestType: 'manual-entry',
    correctCheckIn: parsedCheckIn,
    correctCheckOut: parsedCheckOut,
    note,
    status: 'pending'
  });

  const attendance = await Attendance.findOne({ employeeId: req.user._id, date });
  const nextAttendance = attendance || new Attendance({ employeeId: req.user._id, date });

  if (parsedCheckIn) {
    nextAttendance.checkInTime = parsedCheckIn;
  }
  if (parsedCheckOut) {
    nextAttendance.checkOutTime = parsedCheckOut;
  }
  nextAttendance.status = 'Manual Entry';
  nextAttendance.entrySource = 'manual';
  nextAttendance.notes = note;
  nextAttendance.isLate = detectLate(nextAttendance.checkInTime);
  nextAttendance.totalWorkMinutes =
    nextAttendance.checkInTime && nextAttendance.checkOutTime
      ? Math.max(0, Math.round((nextAttendance.checkOutTime - nextAttendance.checkInTime) / (1000 * 60)))
      : 0;
  await nextAttendance.save();

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

  const parsedCheckIn = parseAttendanceDateTime(date, correctCheckIn);
  const parsedCheckOut = parseAttendanceDateTime(date, correctCheckOut);

  const correction = await AttendanceCorrection.create({
    employeeId: req.user._id,
    date,
    requestType: 'correction',
    correctCheckIn: parsedCheckIn,
    correctCheckOut: parsedCheckOut,
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

const getTodayAttendanceDetails = asyncHandler(async (_req, res) => {
  const today = getToday();

  const presentRecords = await Attendance.find({ date: today, checkInTime: { $ne: null } })
    .populate('employeeId', 'name email department')
    .sort({ checkInTime: 1 });

  const presentIds = presentRecords
    .map((record) => record.employeeId?._id)
    .filter(Boolean);

  const absentEmployees = await User.find({
    role: 'employee',
    isActive: true,
    _id: { $nin: presentIds }
  })
    .select('name email department')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    data: {
      present: presentRecords.map((record) => ({
        _id: record.employeeId?._id || record._id,
        name: record.employeeId?.name || 'Employee',
        email: record.employeeId?.email || '',
        department: record.employeeId?.department || '',
        checkInTime: record.checkInTime
      })),
      absent: absentEmployees.map((employee) => ({
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        department: employee.department || ''
      }))
    }
  });
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

  const { createNotification } = require('../utils/notification');
  await createNotification({
    userId: correction.employeeId,
    type: 'attendance',
    message:
      correction.requestType === 'manual-entry'
        ? `Your manual attendance request has been ${status}`
        : `Your attendance correction has been ${status}`,
    meta: { correctionId: correction._id, status, requestType: correction.requestType }
  });

  res.status(200).json({ success: true, message: `Correction request ${status}`, data: correction });
});

// comment 
module.exports = {
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
};

