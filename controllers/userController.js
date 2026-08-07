const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../app.db'));

const getUserName = (req, res) => {
  try {
    const userId = req.session.userId; 
    const data = db.prepare('SELECT name FROM users WHERE id = ?');
    const user = data.get(userId);

    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.json({ name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error while trying to fetch username' });
  }
};

const deleteUser = (req, res) => {
  try {
    const userId = req.session.userId;
    
    const userExist = db.prepare(`SELECT id FROM users WHERE id = ?`).get(userId);
    if (!userExist) return res.status(404).json({ error: 'User not found' });

    const deleteUserStmt = db.prepare(`DELETE FROM users WHERE id = ?`);
    deleteUserStmt.run(userId);

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

const getAllUsers = (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email FROM users').all();
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const getCurrentUser = (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = db.prepare('SELECT id, name, email, completed_todos_action, created_at FROM users WHERE id = ?').get(req.session.userId);
    
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
  getAllUsers,
  getCurrentUser
};