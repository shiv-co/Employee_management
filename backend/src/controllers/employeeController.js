const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const phoneRegex = /^\+?[0-9]{10,15}$/;

const normalizePhoneNumber = (value = '') => value.trim();

const validatePhoneNumber = (value) => {
  if (value && !phoneRegex.test(value)) {
    throw new ApiError(400, 'Invalid mobile number format');
  }
};

const toSafeUser = (userDoc) => ({
  id: userDoc._id,
  name: userDoc.name,
  email: userDoc.email,
  role: userDoc.role,
  department: userDoc.department,
  designation: userDoc.designation,
  mobileNumber: userDoc.mobileNumber || '',
  dob: userDoc.dob,
  isActive: userDoc.isActive,
  createdAt: userDoc.createdAt,
  updatedAt: userDoc.updatedAt
});

const createEmployee = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role = 'employee',
    department = '',
    designation = '',
    mobileNumber = '',
    dob = null
  } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  const normalizedMobileNumber = normalizePhoneNumber(mobileNumber);
  validatePhoneNumber(normalizedMobileNumber);

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    throw new ApiError(409, 'Email already exists');
  }

  const user = new User({
    name,
    email: email.toLowerCase().trim(),
    role,
    department,
    designation,
    mobileNumber: normalizedMobileNumber,
    dob: dob || null
  });
  await user.setPassword(password);
  await user.save();

  res.status(201).json({ success: true, message: 'Employee created', data: toSafeUser(user) });
});

const listEmployees = asyncHandler(async (req, res) => {
  const { isActive, department, role } = req.query;

  const query = {};
  if (typeof isActive === 'string') query.isActive = isActive === 'true';
  if (department) query.department = department;
  if (role) query.role = role;

  const users = await User.find(query)
    .select('-passwordHash')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: users.map(toSafeUser) });
});

const getEmployeeById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) {
    throw new ApiError(404, 'Employee not found');
  }

  res.status(200).json({ success: true, data: toSafeUser(user) });
});

const updateEmployee = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'department', 'designation', 'role', 'isActive', 'mobileNumber', 'dob'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = req.body[field];
    }
  });

  if (Object.prototype.hasOwnProperty.call(updates, 'mobileNumber')) {
    updates.mobileNumber = normalizePhoneNumber(updates.mobileNumber || '');
    validatePhoneNumber(updates.mobileNumber);
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  }).select('-passwordHash');

  if (!user) {
    throw new ApiError(404, 'Employee not found');
  }

  res.status(200).json({ success: true, message: 'Employee updated', data: toSafeUser(user) });
});

const updateEmployeeStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    throw new ApiError(400, 'isActive must be a boolean');
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true, runValidators: true }
  ).select('-passwordHash');

  if (!user) {
    throw new ApiError(404, 'Employee not found');
  }

  res.status(200).json({ success: true, message: 'Employee status updated', data: toSafeUser(user) });
});

const deleteEmployee = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'Employee not found');
  }

  await user.deleteOne();

  res.status(200).json({ success: true, message: 'Employee deleted successfully' });
});

module.exports = {
  createEmployee,
  listEmployees,
  getEmployeeById,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
  toSafeUser,
  validatePhoneNumber,
  normalizePhoneNumber
};
