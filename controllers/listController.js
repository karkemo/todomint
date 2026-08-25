const { createClient } = require('@libsql/client');
require('dotenv').config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const getLists = async (req, res) => {
  try {
    const userId = req.session.userId;

    const listsResult = await db.execute({
      sql: 'SELECT * FROM lists WHERE user_id = ? ORDER BY id ASC',
      args: [userId]
    });

    res.json(listsResult.rows);
  } catch (err) {
    console.error('Error fetching lists:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

const createList = async (req, res) => {
  try {
    const userId = req.session?.userId;
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title) {
      return res.status(400).json({ error: 'List title is required' });
    }

    const result = await db.execute({
      sql: 'INSERT INTO lists (title, user_id) VALUES (?, ?)',
      args: [title, userId]
    });

    return res.status(201).json({ id: Number(result.lastInsertRowid), title });
  } catch (err) {
    console.error('Error creating list:', err);
    return res.status(500).json({
      error: 'Failed to create list',
      details: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
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