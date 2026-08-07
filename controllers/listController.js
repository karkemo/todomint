const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../app.db'));

const getLists = (req, res) => {
  try {
    const userId = req.session.userId;
    const stmt = db.prepare('SELECT id, title FROM lists WHERE user_id = ?');
    const lists = stmt.all(userId);

    res.json(lists);
  } catch (err) {
    console.error('Error fetching lists:', err);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
}

const createList = (req, res) => {
  try {
    const userId = req.session.userId;
    const { title } = req.body;

    const stmt = db.prepare('INSERT INTO lists (title, user_id) VALUES (?, ?)');
    const result = stmt.run(title, userId);

    res.status(201).json({ id: result.lastInsertRowid, title });
  } catch (err) {
    console.error('Error creating list:', err);
    res.status(500).json({ error: 'Failed to create list' });
  }
}

const deleteList = (req, res) => {
  const listId = req.params.id;

  try {
    const checkList = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?');
    const listExists = checkList.get(listId, req.session.userId);

    if (!listExists) {
      return res.status(404).json({ error: 'List not found' });
    }

    const deleteList = db.prepare('DELETE FROM lists WHERE id = ?');
    deleteList.run(listId);

    res.json({ success: true, id: listId });
  } catch (err) {
    console.error('Error deleting list:', err.message);
    res.status(500).json({ error: 'Failed to delete list' });
  }
}

const updateList = (req, res) => {
  const listId = req.params.id;
  const { title } = req.body;

  try {
    const checkList = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?');
    const listExists = checkList.get(listId, req.session.userId);

    if (!listExists) {
      return res.status(404).json({ error: 'List not found or unauthorized' });
    }

    const updateList = db.prepare('UPDATE lists SET title = ? WHERE id = ?');
    updateList.run(title, listId);

    res.json({ success: true, id: listId, title });
  } catch (err) {
    console.error('Error updating list:', err.message);
    res.status(500).json({ error: 'Failed to update list' });
  }
}

module.exports = {
  getLists,
  createList,
  deleteList,
  updateList
}