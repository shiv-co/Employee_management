const ExcelJS = require('exceljs');
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
const normalizeRemark = (remark) => (remark || '').trim();

const dueDateSort = [
  {
    $addFields: {
      statusSort: {
        $switch: {
          branches: [
            { case: { $in: ['$status', ['Pending', 'todo']] }, then: 1 },
            { case: { $in: ['$status', ['In Progress', 'in-progress']] }, then: 2 },
            { case: { $in: ['$status', ['Completed', 'done']] }, then: 3 }
          ],
          default: 99
        }
      }
    }
  },
  { $sort: { statusSort: 1, createdAt: -1 } }
];

const applyTaskUpdates = (task, updates, isAdmin) => {
  const employeeAllowed = ['status', 'title', 'description', 'priority', 'deadline', 'dueDate', 'dueTime', 'remark'];
  const adminAllowed = ['title', 'description', 'assignedTo', 'priority', 'status', 'deadline', 'dueDate', 'dueTime', 'taskType', 'remark'];
  const allowed = isAdmin ? adminAllowed : employeeAllowed;

  allowed.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      if (field === 'status') task[field] = normalizeStatus(updates[field]);
      else if (field === 'priority') task[field] = normalizePriority(updates[field]);
      else if (field === 'deadline' || field === 'dueDate') {
        const normalizedDueDate = normalizeDueDate(updates.deadline, updates.dueDate);
        task.deadline = normalizedDueDate;
        task.dueDate = normalizedDueDate;
      } else if (field === 'dueTime') {
        task.dueTime = normalizeDueTime(updates.dueTime);
      } else if (field === 'remark') {
        task.remark = normalizeRemark(updates.remark);
      } else {
        task[field] = updates[field];
      }
    }
  });
};

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
    createdBy: req.user._id,
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

const createPersonalTask = asyncHandler(async (req, res) => {
  req.body = {
    ...req.body,
    taskType: 'personal',
    assignedTo: req.user._id
  };

  return createTask(req, res);
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

  const populatedTasks = await Task.populate(tasks, [
    { path: 'assignedBy', select: 'name email role' },
    { path: 'createdBy', select: 'name email role' }
  ]);

  const normalizedTasks = populatedTasks.map((task) => ({
    ...task,
    createdBy: task.createdBy || task.assignedBy
  }));

  res.status(200).json({ success: true, data: normalizedTasks });
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
    .populate('assignedBy', 'name email role')
    .populate('createdBy', 'name email role')
    .sort({ createdAt: -1 });

  const normalizedTasks = tasks.map((task) => ({
    ...task.toObject(),
    createdBy: task.createdBy || task.assignedBy
  }));

  res.status(200).json({ success: true, data: normalizedTasks });
});

const exportTasks = asyncHandler(async (_req, res) => {
  const tasks = await Task.find({})
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Tasks');

  worksheet.columns = [
    { header: 'Task Title', key: 'title', width: 30 },
    { header: 'Assigned To', key: 'assignedTo', width: 28 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Priority', key: 'priority', width: 18 },
    { header: 'Assigned Date', key: 'assignedDate', width: 24 },
    { header: 'Deadline', key: 'deadline', width: 24 }
  ];

  tasks.forEach((task) => {
    worksheet.addRow({
      title: task.title,
      assignedTo: task.assignedTo?.name || '-',
      status: normalizeStatus(task.status),
      priority: normalizePriority(task.priority),
      assignedDate: task.createdAt ? new Date(task.createdAt).toLocaleString() : '-',
      deadline: task.deadline ? new Date(task.deadline).toLocaleString() : '-'
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="tasks-report.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
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

  applyTaskUpdates(task, req.body, isAdmin);
  await task.save();

  res.status(200).json({ success: true, message: 'Task updated', data: task });
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status, remark } = req.body;
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
  if (Object.prototype.hasOwnProperty.call(req.body, 'remark')) {
    task.remark = normalizeRemark(remark);
  }
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

const updateTodo = asyncHandler(async (req, res) => {
  const todo = await Task.findById(req.params.id);

  if (!todo || todo.taskType !== 'personal') {
    throw new ApiError(404, 'Todo not found');
  }

  const isOwner = todo.assignedTo.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Not authorized to update this todo');
  }

  applyTaskUpdates(todo, req.body, false);
  await todo.save();

  res.status(200).json({ success: true, message: 'Todo updated', data: todo });
});

const deleteTodo = asyncHandler(async (req, res) => {
  const todo = await Task.findById(req.params.id);

  if (!todo || todo.taskType !== 'personal') {
    throw new ApiError(404, 'Todo not found');
  }

  const isOwner = todo.assignedTo.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Not authorized to delete this todo');
  }

  await todo.deleteOne();

  res.status(200).json({ success: true, message: 'Todo deleted successfully' });
});

module.exports = {
  createTask,
  createPersonalTask,
  listMyTasks,
  listTasks,
  exportTasks,
  updateTask,
  updateTaskStatus,
  deleteTask,
  updateTodo,
  deleteTodo
};
