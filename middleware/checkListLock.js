const { isListLocked } = require('../utils/lockHelper');
const { createClient } = require('@libsql/client');
require('dotenv').config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const checkListLock = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userId = req.session.userId;
    let listId = req.params.listId || req.body.list_id || req.body.listId;

    if (!listId && req.params.id) {
      const todoResult = await db.execute({
        sql: 'SELECT list_id FROM todos WHERE id = ?',
        args: [req.params.id]
      });
      if (todoResult.rows.length > 0) {
        listId = todoResult.rows[0].list_id;
      }
    }

    if (listId) {
      const { isLocked } = await isListLocked(userId, listId);
      if (isLocked) {
        return res.status(402).json({
          error: 'these lists are in read only mode, upgrade to activate them',
          isLocked: true
        });
      }
    }

    next();
  } catch (err) {
    console.error('Error in checkListLock:', err);
    res.status(500).json({ error: 'Server error checking list permissions' });
  }
};

const checkCreateListLock = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userId = req.session.userId;

    const userResult = await db.execute({
      sql: 'SELECT trial_ends_at, subscription_status, plan FROM users WHERE id = ?',
      args: [userId]
    });
    const user = userResult.rows[0];

    const now = new Date();
    const trialEnd = user?.trial_ends_at ? new Date(user.trial_ends_at) : null;
    const isTrialExpired = trialEnd ? now > trialEnd : false;

    if (isTrialExpired && user.subscription_status !== 'active' && user.plan !== 'pro') {
      const countResult = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM lists WHERE user_id = ?',
        args: [userId]
      });
      const listCount = Number(countResult.rows[0].count);

      if (listCount >= 3) {
        return res.status(402).json({
          error: "Free trail have been ended, you can't create more than three lists",
          isLocked: true
        });
      }
    }

    next();
  } catch (err) {
    console.error('Error in checkCreateListLock:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { checkListLock, checkCreateListLock };