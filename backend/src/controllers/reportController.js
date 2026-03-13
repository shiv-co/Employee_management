const DailyReport = require('../models/DailyReport');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { notifyAdmins } = require('../utils/notification');

const getToday = () => new Date().toISOString().slice(0, 10);

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
};

const submitDailyReport = asyncHandler(async (req, res) => {
  const {
    date = getToday(),
    completedTasks = [],
    tasksInProgress = [],
    blockers = '',
    tomorrowsPlan = '',
    summary = '',
    tasksWorkedOn = [],
    nextDayPlan = ''
  } = req.body;

  const normalizedCompletedTasks = normalizeArray(completedTasks);
  const normalizedInProgressTasks = normalizeArray(tasksInProgress);
  const derivedSummary = summary || [...normalizedCompletedTasks, ...normalizedInProgressTasks].join(', ');

  if (!derivedSummary && !normalizedCompletedTasks.length && !normalizedInProgressTasks.length) {
    throw new ApiError(400, 'At least one report detail is required');
  }

  const report = await DailyReport.findOneAndUpdate(
    { employeeId: req.user._id, date },
    {
      employeeId: req.user._id,
      date,
      completedTasks: normalizedCompletedTasks,
      tasksInProgress: normalizedInProgressTasks,
      blockers,
      tomorrowsPlan: tomorrowsPlan || nextDayPlan,
      summary: derivedSummary,
      tasksWorkedOn,
      nextDayPlan: tomorrowsPlan || nextDayPlan
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true
    }
  );

  await notifyAdmins({
    type: 'daily_report_submitted',
    message: `${req.user.name} submitted daily report for ${date}`,
    meta: { reportId: report._id, employeeId: req.user._id }
  });

  res.status(200).json({ success: true, message: 'Daily report submitted', data: report });
});

const getMyReports = asyncHandler(async (req, res) => {
  const { date, from, to } = req.query;

  const query = { employeeId: req.user._id };
  if (date) {
    query.date = date;
  } else if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }

  const reports = await DailyReport.find(query).sort({ date: -1 });

  res.status(200).json({ success: true, data: reports });
});

const getReports = asyncHandler(async (req, res) => {
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

  const reports = await DailyReport.find(query)
    .populate('employeeId', 'name email department')
    .sort({ date: -1, createdAt: -1 });

  res.status(200).json({ success: true, data: reports });
});

const updateReport = asyncHandler(async (req, res) => {
  const report = await DailyReport.findById(req.params.id);
  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  const isOwner = report.employeeId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Not authorized to update this report');
  }

  const reportDate = new Date(`${report.date}T00:00:00.000Z`);
  const todayDate = new Date(`${getToday()}T00:00:00.000Z`);
  const ownerCanEdit = isOwner && reportDate.getTime() === todayDate.getTime();

  if (!isAdmin && !ownerCanEdit) {
    throw new ApiError(403, 'Employees can only update today\'s report');
  }

  const allowed = [
    'completedTasks',
    'tasksInProgress',
    'blockers',
    'tomorrowsPlan',
    'summary',
    'tasksWorkedOn',
    'nextDayPlan'
  ];

  allowed.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      if (field === 'completedTasks' || field === 'tasksInProgress') {
        report[field] = normalizeArray(req.body[field]);
      } else {
        report[field] = req.body[field];
      }
    }
  });

  if (req.body.tomorrowsPlan) {
    report.nextDayPlan = req.body.tomorrowsPlan;
  }
  if (req.body.nextDayPlan) {
    report.tomorrowsPlan = req.body.nextDayPlan;
  }

  await report.save();

  res.status(200).json({ success: true, message: 'Report updated', data: report });
});

module.exports = {
  submitDailyReport,
  getMyReports,
  getReports,
  updateReport
};
