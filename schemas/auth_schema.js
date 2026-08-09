const { z } = require('zod');

const passwordValidation = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required')
  })
});

const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address'),
    password: passwordValidation
  })
});

const verifyCodeSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address'),
    code: z
      .union([z.string(), z.number()])
      .transform((val) => String(val).trim())
      .refine((val) => val.length > 0, { message: 'Verification code is required' }),
    type: z.string().optional()
  })
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Valid email is required')
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Valid email is required'),
    newPassword: passwordValidation
  })
});

module.exports = {
  loginSchema,
  registerSchema,
  verifyCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};