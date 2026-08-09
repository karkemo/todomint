// const path = require('path');
// const Database = require('better-sqlite3');
// const db = new Database(path.join(__dirname, '../app.db'));

// const getLists = (req, res) => {
//   try {
//     const userId = req.session.userId;
//     const stmt = db.prepare('SELECT id, title FROM lists WHERE user_id = ?');
//     const lists = stmt.all(userId);

//     res.json(lists);
//   } catch (err) {
//     console.error('Error fetching lists:', err);
//     res.status(500).json({ error: 'Failed to fetch lists' });
//   }
// }

// const createList = (req, res) => {
//   try {
//     const userId = req.session.userId;
//     const { title } = req.body;

//     const stmt = db.prepare('INSERT INTO lists (title, user_id) VALUES (?, ?)');
//     const result = stmt.run(title, userId);

//     res.status(201).json({ id: result.lastInsertRowid, title });
//   } catch (err) {
//     console.error('Error creating list:', err);
//     res.status(500).json({ error: 'Failed to create list' });
//   }
// }

// const deleteList = (req, res) => {
//   const listId = req.params.id;

//   try {
//     const checkList = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?');
//     const listExists = checkList.get(listId, req.session.userId);

//     if (!listExists) {
//       return res.status(404).json({ error: 'List not found' });
//     }

//     const deleteList = db.prepare('DELETE FROM lists WHERE id = ?');
//     deleteList.run(listId);

//     res.json({ success: true, id: listId });
//   } catch (err) {
//     console.error('Error deleting list:', err.message);
//     res.status(500).json({ error: 'Failed to delete list' });
//   }
// }

// const updateList = (req, res) => {
//   const listId = req.params.id;
//   const { title } = req.body;

//   try {
//     const checkList = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?');
//     const listExists = checkList.get(listId, req.session.userId);

//     if (!listExists) {
//       return res.status(404).json({ error: 'List not found or unauthorized' });
//     }

//     const updateList = db.prepare('UPDATE lists SET title = ? WHERE id = ?');
//     updateList.run(title, listId);

//     res.json({ success: true, id: listId, title });
//   } catch (err) {
//     console.error('Error updating list:', err.message);
//     res.status(500).json({ error: 'Failed to update list' });
//   }
// }

// module.exports = {
//   getLists,
//   createList,
//   deleteList,
//   updateList
// }

const { createClient } = require('@libsql/client');
require('dotenv').config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// const getLists = async (req, res) => {
//   try {
//     const userId = req.session.userId;
//     const result = await db.execute({
//       sql: 'SELECT id, title FROM lists WHERE user_id = ?',
//       args: [userId]
//     });

//     res.json(result.rows);
//   } catch (err) {
//     console.error('Error fetching lists:', err);
//     res.status(500).json({ error: 'Failed to fetch lists' });
//   }
// };

const getLists = async (req, res) => {
  try {
    const userId = req.session.userId;

    const userResult = await db.execute({
      sql: 'SELECT trial_ends_at, subscription_status, plan FROM users WHERE id = ?',
      args: [userId]
    });
    const user = userResult.rows[0];

    const listsResult = await db.execute({
      sql: 'SELECT * FROM lists WHERE user_id = ? ORDER BY id ASC',
      args: [userId]
    });

    const now = new Date();
    const trialEnd = user?.trial_ends_at ? new Date(user.trial_ends_at) : null;
    const isTrialExpired = trialEnd ? now > trialEnd : false;
    const isPro = user?.subscription_status === 'active' || user?.plan === 'pro';

    const listsWithLockStatus = listsResult.rows.map((list, index) => {
      const isLocked = isTrialExpired && !isPro && index >= 3;
      return {
        ...list,
      };
    });

    res.json(listsWithLockStatus);
  } catch (err) {
    console.error('Error fetching lists:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

const createList = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { title } = req.body;

    const result = await db.execute({
      sql: 'INSERT INTO lists (title, user_id) VALUES (?, ?)',
      args: [title, userId]
    });

    res.status(201).json({ id: Number(result.lastInsertRowid), title });
  } catch (err) {
    console.error('Error creating list:', err);
    res.status(500).json({ error: 'Failed to create list' });
  }
};

const deleteList = async (req, res) => {
  const listId = req.params.id;

  try {
    const checkList = await db.execute({
      sql: 'SELECT id FROM lists WHERE id = ? AND user_id = ?',
      args: [listId, req.session.userId]
    });

    if (checkList.rows.length === 0) {
      return res.status(404).json({ error: 'List not found' });
    }

    await db.execute({
      sql: 'DELETE FROM lists WHERE id = ?',
      args: [listId]
    });

    res.json({ success: true, id: listId });
  } catch (err) {
    console.error('Error deleting list:', err.message);
    res.status(500).json({ error: 'Failed to delete list' });
  }
};

const updateList = async (req, res) => {
  const listId = req.params.id;
  const { title } = req.body;

  try {
    const checkList = await db.execute({
      sql: 'SELECT id FROM lists WHERE id = ? AND user_id = ?',
      args: [listId, req.session.userId]
    });

    if (checkList.rows.length === 0) {
      return res.status(404).json({ error: 'List not found or unauthorized' });
    }

    await db.execute({
      sql: 'UPDATE lists SET title = ? WHERE id = ?',
      args: [title, listId]
    });

    res.json({ success: true, id: listId, title });
  } catch (err) {
    console.error('Error updating list:', err.message);
    res.status(500).json({ error: 'Failed to update list' });
  }
};

module.exports = {
  getLists,
  createList,
  deleteList,
  updateList
};