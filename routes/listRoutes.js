const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate');
const {
  createListSchema,
  updateListSchema,
  deleteListSchema
} = require('../schemas/todo_list_schema');
const {
  getLists,
  createList,
  deleteList,
  updateList
} = require('../controllers/listController');

router.get('/', getLists);
router.post('/', validate(createListSchema), createList);
router.patch('/:id', validate(updateListSchema), updateList);
router.delete('/:id', validate(deleteListSchema), deleteList);

module.exports = router