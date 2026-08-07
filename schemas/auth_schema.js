// const { z } = require('zod');

// const loginSchema = z.object({
//   body: z.object({
//     email: z
//       .string({ required_error: 'Email is required' })
//       .trim()
//       .toLowerCase()
//       .email('Invalid email address'),
//     password: z
//       .string({ required_error: 'Password is required' })
//       .min(1, 'Password is required')
//   })
// });

// const registerSchema = z.object({
//   body: z.object({
//     name: z
//       .string({ required_error: 'Name is required' })
//       .trim()
//       .min(2, 'Name must be at least 2 characters'),
//     email: z
//       .string({ required_error: 'Email is required' })
//       .trim()
//       .toLowerCase()
//       .email('Invalid email address'),
//     password: z
//       .string({ required_error: 'Password is required' })
//       .min(6, 'Password must be at least 6 characters long')
//   })
// });

// module.exports = {
//   loginSchema,
//   registerSchema
// };

// schemas/auth_schema.js
const { z } = require('zod');

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
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters long')
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
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(6, 'New password must be at least 6 characters long')
  })
});

module.exports = {
  loginSchema,
  registerSchema,
  verifyCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};