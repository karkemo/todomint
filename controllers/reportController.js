// const { createClient } = require('@libsql/client');
// require('dotenv').config();

// const db = createClient({
//   url: process.env.TURSO_DATABASE_URL,
//   authToken: process.env.TURSO_AUTH_TOKEN,
// });

// const submitReport = async (req, res) => {
//   try {
//     const userId = req.session.userId;
//     const { type, email, title, description } = req.body;
  
//     const result = await db.execute({
//       sql: 'INSERT INTO reports (type, email, title, description, user_id) VALUES (?, ?, ?, ?, ?)',
//       args: [type, email, title, description, userId]
//     });
  
//     res.status(201).json({ id: Number(result.lastInsertRowid), type, title });
//   } catch (error) {
//     console.error('Error submitting report', error);
//     res.status(500).json({ error: 'Failed to submit report' })
//   }
// }

// module.exports = { submitReport };

const { createClient } = require('@libsql/client');
require('dotenv').config();
const { sendThankYouForReportNotification } = require('../services/email');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const submitReport = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { type, email, title, description } = req.body;

    const result = await db.execute({
      sql: 'INSERT INTO reports (type, email, title, description, user_id) VALUES (?, ?, ?, ?, ?)',
      args: [type, email, title, description, userId]
    });

    try {
      await sendThankYouForReportNotification(email);
    } catch (notifyError) {
      console.error('Failed to send thank-you notification:', notifyError);
    }

    res.status(201).json({
      id: Number(result.lastInsertRowid),
      type,
      title
    });
  } catch (error) {
    console.error('Error submitting report:', error);

    // NOTE: this only stays relevant if the `reports.email` UNIQUE constraint
    // is kept (see index.js fix below, which is the real fix — remove it).
    // const isUniqueViolation =
    //   error?.code === 'SQLITE_CONSTRAINT' ||
    //   /UNIQUE constraint failed/i.test(error?.message || '');

    // if (isUniqueViolation) {
    //   return res.status(409).json({
    //     error: 'A report with this email already exists.'
    //   });
    // }

    res.status(500).json({ error: 'Failed to submit report' });
  }
};

module.exports = { submitReport };