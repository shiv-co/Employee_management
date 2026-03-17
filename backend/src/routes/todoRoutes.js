const express = require('express');
const { updateTodo, deleteTodo } = require('../controllers/taskController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect, authorize('employee', 'admin'));
router.put('/:id', updateTodo);
router.delete('/:id', deleteTodo);

module.exports = router;
