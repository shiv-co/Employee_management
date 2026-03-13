const express = require('express');
const {
  createEmployee,
  listEmployees,
  getEmployeeById,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee
} = require('../controllers/employeeController');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect, authorize('admin'));

router.post('/', createEmployee);
router.get('/', listEmployees);
router.get('/:id', getEmployeeById);
router.patch('/:id', updateEmployee);
router.patch('/:id/status', updateEmployeeStatus);
router.delete('/:id', deleteEmployee);

module.exports = router;
