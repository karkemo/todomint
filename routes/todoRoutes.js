// routes/todoRoutes.js
const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate');
const {
  createTodoSchema,
  updateTodoStatusSchema,
  updateTodoDetailsSchema,
  deleteTodoSchema
} = require('../schemas/todo_list_schema');
const {
  getTodos,
  createTodo,
  deleteAllTodos,
  updateTodoStatus,
  deleteTodo,
  updateTodo
} = require('../controllers/todoController');

router.get('/', getTodos);
router.post('/', validate(createTodoSchema), createTodo);
router.delete('/', deleteAllTodos);
router.patch('/:id', validate(updateTodoStatusSchema), updateTodoStatus);
router.patch('/:id/details', validate(updateTodoDetailsSchema), updateTodo);
router.delete('/:id', validate(deleteTodoSchema), deleteTodo);

module.exports = router;