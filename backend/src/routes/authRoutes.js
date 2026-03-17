const express = require('express');
const { login, refresh, logout, me, updateMe } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, me);
router.patch('/me', protect, updateMe);

module.exports = router;
