const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    taskType: {
      type: String,
      enum: ['assigned', 'personal'],
      default: 'assigned'
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'low', 'medium', 'high'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'todo', 'in-progress', 'done'],
      default: 'Pending'
    },
    deadline: {
      type: Date,
      default: null
    },
    dueDate: {
      type: Date,
      default: null
    },
    dueTime: {
      type: String,
      default: ''
    },
    remark: {
      type: String,
      trim: true,
      default: ''
    },
    tags: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
