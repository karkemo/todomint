const { createClient } = require('@libsql/client');
require('dotenv').config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function isListLocked(userId, listId) {
  const userResult = await db.execute({
    sql: 'SELECT trial_ends_at, subscription_status, plan FROM users WHERE id = ?',
    args: [userId]
  });
  const user = userResult.rows[0];

  if (!user) return { isLocked: false, isTrialExpired: false };

  if (user.subscription_status === 'active' || user.plan === 'pro') {
    return { isLocked: false, isTrialExpired: false };
  }

  const now = new Date();
  const trialEnd = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
  const isTrialExpired = trialEnd ? now > trialEnd : false;

  if (!isTrialExpired) {
    return { isLocked: false, isTrialExpired: false };
  }

  const listsResult = await db.execute({
    sql: 'SELECT id FROM lists WHERE user_id = ? ORDER BY id ASC',
    args: [userId]
  });

  const userLists = listsResult.rows;
  const listIndex = userLists.findIndex(row => Number(row.id) === Number(listId));

  const isLocked = listIndex >= 3;

  return { isLocked, isTrialExpired };
}

module.exports = { isListLocked };