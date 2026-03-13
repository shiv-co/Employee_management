const mongoose = require('mongoose');

const taskEntrySchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },
    text: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const dailyReportSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    date: {
      type: String,
      required: true
    },
    completedTasks: {
      type: [String],
      default: []
    },
    tasksInProgress: {
      type: [String],
      default: []
    },
    blockers: {
      type: String,
      trim: true,
      default: ''
    },
    tomorrowsPlan: {
      type: String,
      trim: true,
      default: ''
    },
    // Backward compatibility fields
    summary: {
      type: String,
      trim: true,
      default: ''
    },
    tasksWorkedOn: {
      type: [taskEntrySchema],
      default: []
    },
    nextDayPlan: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

dailyReportSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyReport', dailyReportSchema);
