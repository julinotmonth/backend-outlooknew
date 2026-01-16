const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  register,
  login,
  googleAuth,
  getMe,
  updateProfile,
  changePassword,
  checkEmail
} = require('../controllers/authController');

// Validation middleware
const validateRegister = [
  body('name').notEmpty().withMessage('Nama wajib diisi'),
  body('email').isEmail().withMessage('Email tidak valid'),
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter')
];

const validateLogin = [
  body('email').isEmail().withMessage('Email tidak valid'),
  body('password').notEmpty().withMessage('Password wajib diisi')
];

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/google', googleAuth);
router.get('/check-email', checkEmail);

// Protected routes
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
