const SystemSettings = require('../models/SystemSettings');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const DEFAULT_SETTINGS = {
  officeStartTime: '09:30',
  lateAfter: '10:30',
  officeEndTime: '18:00'
};

const isValidTimeString = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value || '');

const toMinutes = (value) => {
  const [hours, minutes] = String(value).split(':').map(Number);
  return hours * 60 + minutes;
};

const getOrCreateSettings = async () =>
  SystemSettings.findOneAndUpdate(
    { singletonKey: 'system' },
    { $setOnInsert: { singletonKey: 'system', ...DEFAULT_SETTINGS } },
    { new: true, upsert: true }
  );

const getSettings = asyncHandler(async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.status(200).json({ success: true, data: settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const { officeStartTime, lateAfter, officeEndTime } = req.body;

  if (![officeStartTime, lateAfter, officeEndTime].every(isValidTimeString)) {
    throw new ApiError(400, 'All office timing values must use HH:MM format');
  }

  if (toMinutes(lateAfter) <= toMinutes(officeStartTime)) {
    throw new ApiError(400, 'Late time must be after office start time');
  }

  const settings = await SystemSettings.findOneAndUpdate(
    { singletonKey: 'system' },
    {
      $set: {
        officeStartTime,
        lateAfter,
        officeEndTime
      },
      $setOnInsert: { singletonKey: 'system' }
    },
    { new: true, upsert: true }
  );

  res.status(200).json({ success: true, message: 'Settings updated', data: settings });
});

module.exports = {
  getSettings,
  updateSettings,
  getOrCreateSettings
};
