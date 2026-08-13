const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate');
const {
  updateNameSchema,
  updateEmailSchema,
  updatePasswordSchema,
  updateCompletedActionSchema
} = require('../schemas/settings_schema');
const {
  updateName,
  updateEmail,
  updatePassword,
  updateCompletedAction,
  updatePreferredFont
} = require('../controllers/settingsController');

router.post('/name', validate(updateNameSchema), updateName);
router.post('/email', validate(updateEmailSchema), updateEmail);
router.post('/password', validate(updatePasswordSchema), updatePassword);
router.patch('/completed-action', validate(updateCompletedActionSchema), updateCompletedAction);
router.patch('/font', updatePreferredFont);

module.exports = router;