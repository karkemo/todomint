const { z } = require('zod');

const updateNameSchema = z.object({
  newName: z
    .string({ required_error: 'New name is required' })
    .trim()
    .min(2, 'Name must be between 2 and 50 characters')
    .max(50, 'Name must be between 2 and 50 characters')
});

const updateEmailSchema = z.object({
  newEmail: z
    .string({ required_error: 'New email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  currentPassword: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password is required')
});

const updatePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password is required'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(6, 'New password must be at least 6 characters long')
});

const updateCompletedActionSchema = z.object({
  action: z.enum(['keep', 'delete', 'move'], {
    errorMap: () => ({ message: 'Invalid completed todos action' })
  })
});

const verifyCodeSchema = z.object({
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
});

const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Valid email is required')
});

const resetPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Valid email is required'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(6, 'New password must be at least 6 characters long')
});

module.exports = {
  updateNameSchema,
  updateEmailSchema,
  updatePasswordSchema,
  updateCompletedActionSchema,
  verifyCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};