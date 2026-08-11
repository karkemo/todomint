// schemas/todo_list_schema.js
const { z } = require('zod');

// Reusable parameter schema for any route that ends in /:id
const idParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'ID must be a number' })
    .int('ID must be an integer')
    .positive('ID must be a positive number')
});

// POST /api/todos
const createTodoSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).trim().min(1, 'Title cannot be empty'),
    list_id: z.union([z.string(), z.number()], { required_error: 'List ID is required' })
      .transform(Number)
      .refine((val) => !isNaN(val) && val > 0, { message: 'Invalid list ID' }),
    priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
    due_date: z.string().nullable().optional(),
    due_time: z.string(),
    is_completed: z.union([z.boolean(), z.number()]).optional()
  })
});

// PATCH & DELETE /api/todos/:id
const updateTodoStatusSchema = z.object({
  params: idParamSchema,
  body: z.object({
    is_completed: z.union([z.boolean(), z.number(), z.string()])
  })
});

// PATCH /api/todos/:id/details
const updateTodoDetailsSchema = z.object({
  params: idParamSchema,
  body: z.object({
    title: z.string().trim().min(1, 'Title cannot be empty').optional(),
    priority: z.enum(['low', 'medium', 'high']).optional()
  }).refine((data) => data.title !== undefined || data.priority !== undefined, {
    message: 'At least one field (title or priority) must be provided'
  })
});

// DELETE /api/todos/:id requires params only
const deleteTodoSchema = z.object({
  params: idParamSchema
});

// POST /api/lists
const createListSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'List title is required' })
      .trim()
      .min(1, 'List title cannot be empty')
      .max(100, 'List title cannot exceed 100 characters')
  })
});

// PATCH /api/lists/:id
const updateListSchema = z.object({
  params: idParamSchema,
  body: z.object({
    title: z.string({ required_error: 'List title is required' })
      .trim()
      .min(1, 'List title cannot be empty')
      .max(100, 'List title cannot exceed 100 characters')
  })
});

// DELETE /api/lists/:id
const deleteListSchema = z.object({
  params: idParamSchema
});

module.exports = {
  createTodoSchema,
  updateTodoStatusSchema,
  updateTodoDetailsSchema,
  deleteTodoSchema,
  createListSchema,
  updateListSchema,
  deleteListSchema
};