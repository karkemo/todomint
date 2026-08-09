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
const { checkListLock } = require('../middleware/checkListLock');

router.get('/', getTodos);
router.post('/', validate(createTodoSchema), createTodo, checkListLock);
router.delete('/', deleteAllTodos);
router.patch('/:id', validate(updateTodoStatusSchema), updateTodoStatus, checkListLock);
router.patch('/:id/details', validate(updateTodoDetailsSchema), updateTodo, checkListLock);
router.delete('/:id', validate(deleteTodoSchema), deleteTodo);

module.exports = router;