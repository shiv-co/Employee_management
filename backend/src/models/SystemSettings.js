const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'system',
      unique: true,
      immutable: true
    },
    officeStartTime: {
      type: String,
      default: '09:30'
    },
    lateAfter: {
      type: String,
      default: '10:30'
    },
    officeEndTime: {
      type: String,
      default: '18:00'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
