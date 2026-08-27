const { createClient } = require('@libsql/client');
require('dotenv').config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const getUserName = async (req, res) => {
  try {
    const userId = req.session.userId;
    const result = await db.execute({
      sql: 'SELECT name FROM users WHERE id = ?',
      args: [userId]
    });
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.json({ name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error while trying to fetch username' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.session.userId;

    const userExist = await db.execute({
      sql: 'SELECT id FROM users WHERE id = ?',
      args: [userId]
    });

    if (userExist.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [userId]
    });

    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true, id: userId });
    });
  } catch (error) {
    console.error('Error deleting user: ', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

const getCurrentUser = async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await db.execute({
      sql: 'SELECT id, name, email, completed_todos_action, created_at FROM users WHERE id = ?',
      args: [req.session.userId]
    });
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

module.exports = {
  getUserName,
  deleteUser,
  getCurrentUser
};