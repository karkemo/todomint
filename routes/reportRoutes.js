const express = require('express');
const router = express.Router();
const { validate } = require('../middleware/validate');
const { reportSchema } = require('../schemas/report_schema');
const { submitReport } = require('../controllers/reportController');

router.post('/', validate(reportSchema), submitReport);

module.exports = router;