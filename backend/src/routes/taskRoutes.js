const express = require('express');
const {
  createTask,
  listMyTasks,
  listTasks,
  exportTasks,
  updateTask,
  updateTaskStatus,
  deleteTask,
  updateTodo,
  deleteTodo
} = require('../controllers/taskController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('employee', 'admin'), createTask);
router.get('/me', authorize('employee', 'admin'), listMyTasks);
router.get('/export', authorize('admin'), exportTasks);
router.get('/', authorize('admin'), listTasks);
router.put('/:id', authorize('admin'), updateTask);
router.patch('/:id', authorize('employee', 'admin'), updateTask);
router.patch('/:id/status', authorize('employee', 'admin'), updateTaskStatus);
router.delete('/:id', authorize('admin'), deleteTask);

module.exports = router;
