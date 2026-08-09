const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  loginSchema,
  registerSchema,
  verifyCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../schemas/auth_schema');
const {
  register,
  login,
  verify,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/verify', authLimiter, validate(verifyCodeSchema), verify);
router.post('/auth/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

module.exports = router;