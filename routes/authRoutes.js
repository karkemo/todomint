const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate');
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

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/verify', validate(verifyCodeSchema), verify);
router.post('/auth/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/auth/reset-password', validate(resetPasswordSchema), resetPassword);

module.exports = router;