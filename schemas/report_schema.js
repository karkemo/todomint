const { z } = require('zod');

const reportSchema = z.object({
  body: z.object({
    type: z.enum(['bug', 'feedback', 'suggestion'], {
      errorMap: () => ({ message: 'Invalid report type' })
    }),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .max(100, 'Email must be 100 characters or fewer')
      .email('Invalid email address'),
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title is required')
      .max(100, 'Title must be 100 characters or fewer'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(1, 'Description is required')
      .max(5000, 'Description must be 5000 characters or fewer')
  })
});

module.exports = { reportSchema };