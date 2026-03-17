const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { createNotification } = require('../utils/notification');

const normalizeStatus = (status = 'Pending') => {
  const map = {
    todo: 'Pending',
    'in-progress': 'In Progress',
    done: 'Completed',
    Pending: 'Pending',
    'In Progress': 'In Progress',
    Completed: 'Completed'
  };

  return map[status] || status;
};

const normalizePriority = (priority = 'Medium') => {
  const map = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    Low: 'Low',
    Medium: 'Medium',
    High: 'High'
  };

  return map[priority] || priority;
};

const normalizeDueDate = (deadline, dueDate) => dueDate || deadline || null;
const normalizeDueTime = (dueTime) => dueTime || '';

const dueDateSort = [
  {
    $addFields: {
      dueDateSort: {
        $ifNull: [
          { $ifNull: ['$dueDate', '$deadline'] },
          new Date('9999-12-31T23:59:59.999Z')
        ]
      }
    }
  },
  { $sort: { dueDateSort: 1, createdAt: -1 } }
];

const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description = '',
    assignedTo,
    priority = 'Medium',
    status = 'Pending',
    deadline = null,
    dueDate = null,
    dueTime = '',
    taskType
  } = req.body;

  if (!title) {
    throw new ApiError(400, 'title is required');
  }

  let finalTaskType = taskType;
  let finalAssignedTo = assignedTo;

  if (req.user.role === 'admin') {
    if (!assignedTo) {
      throw new ApiError(400, 'assignedTo is required for admin assigned tasks');
    }
    if (!finalTaskType) finalTaskType = 'assigned';
  } else {
    finalTaskType = 'personal';
    finalAssignedTo = req.user._id;
  }

  const normalizedDueDate = normalizeDueDate(deadline, dueDate);

  const task = await Task.create({
    title,
    description,
    assignedTo: finalAssignedTo,
    assignedBy: req.user._id,
    taskType: finalTaskType,
    priority: normalizePriority(priority),
    status: normalizeStatus(status),
    deadline: normalizedDueDate,
    dueDate: normalizedDueDate,
    dueTime: normalizeDueTime(dueTime)
  });

  if (req.user.role === 'admin' && finalTaskType === 'assigned') {
    await createNotification({
      userId: finalAssignedTo,
      type: 'task_assigned',
      message: `A new task has been assigned: ${task.title}`,
      meta: { taskId: task._id }
    });
  }

  res.status(201).json({ success: true, message: 'Task created', data: task });
});

const listMyTasks = asyncHandler(async (req, res) => {
  const { status, priority, taskType } = req.query;
  const query = { assignedTo: req.user._id };
  if (status) query.status = normalizeStatus(status);
  if (priority) query.priority = normalizePriority(priority);
  if (taskType) query.taskType = taskType;

  const tasks = await Task.aggregate([
    { $match: query },
    ...dueDateSort
  ]);

  const populatedTasks = await Task.populate(tasks, { path: 'assignedBy', select: 'name email' });

  res.status(200).json({ success: true, data: populatedTasks });
});

const listTasks = asyncHandler(async (req, res) => {
  const { status, priority, assignedTo, taskType } = req.query;
  const query = {};
  if (status) query.status = normalizeStatus(status);
  if (priority) query.priority = normalizePriority(priority);
  if (assignedTo) query.assignedTo = assignedTo;
  if (taskType) query.taskType = taskType;

  const tasks = await Task.find(query)
    .populate('assignedTo', 'name email department')
    .populate('assignedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: tasks });
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  const isAssignee = task.assignedTo.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isAssignee && !isAdmin) {
    throw new ApiError(403, 'Not authorized to update this task');
  }

  const employeeAllowed = ['status', 'title', 'description', 'priority', 'deadline', 'dueDate', 'dueTime'];
  const adminAllowed = ['title', 'description', 'assignedTo', 'priority', 'status', 'deadline', 'dueDate', 'dueTime', 'taskType'];
  const allowed = isAdmin ? adminAllowed : employeeAllowed;

  allowed.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      if (field === 'status') task[field] = normalizeStatus(req.body[field]);
      else if (field === 'priority') task[field] = normalizePriority(req.body[field]);
      else if (field === 'deadline' || field === 'dueDate') {
        const normalizedDueDate = normalizeDueDate(req.body.deadline, req.body.dueDate);
        task.deadline = normalizedDueDate;
        task.dueDate = normalizedDueDate;
      } else if (field === 'dueTime') {
        task.dueTime = normalizeDueTime(req.body.dueTime);
      } else {
        task[field] = req.body[field];
      }
    }
  });

  await task.save();

  res.status(200).json({ success: true, message: 'Task updated', data: task });
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    throw new ApiError(400, 'status is required');
  }

  const task = await Task.findById(req.params.id);
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  const isAssignee = task.assignedTo.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isAssignee && !isAdmin) {
    throw new ApiError(403, 'Not authorized to update status');
  }

  task.status = normalizeStatus(status);
  await task.save();

  res.status(200).json({ success: true, message: 'Task status updated', data: task });
});

const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  await task.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Task deleted successfully'
  });
});

module.exports = {
  createTask,
  listMyTasks,
  listTasks,
  updateTask,
  updateTaskStatus,
  deleteTask
};
