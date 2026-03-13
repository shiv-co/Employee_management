const mongoose = require('mongoose');

const attendanceCorrectionSchema = new mongoose.Schema(
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
    requestType: {
      type: String,
      enum: ['correction', 'manual-entry'],
      default: 'correction'
    },
    correctCheckIn: {
      type: Date,
      default: null
    },
    correctCheckOut: {
      type: Date,
      default: null
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewNote: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AttendanceCorrection', attendanceCorrectionSchema);
