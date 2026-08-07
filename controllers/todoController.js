const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../app.db'));

const getTodos = (req, res) => {
  try {
    const userId = req.session.userId;
    const stmt = db.prepare(`
        SELECT todos.* 
        FROM todos 
        JOIN lists ON todos.list_id = lists.id 
        WHERE lists.user_id = ?
        ORDER BY todos.created_at DESC
      `);
    const todos = stmt.all(userId);
    res.json(todos);
  } catch (err) {
    console.error('Error fetching todos:', err);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
}

const createTodo = (req, res) => {
  const { title, is_completed, due_date, priority, list_id } = req.body;

  try {
    const checkList = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?');
    const listExists = checkList.get(list_id, req.session.userId);

    if (!listExists) {
      return res.status(403).json({ error: 'Unauthorized list access' });
    }

    const stmt = db.prepare(`
        INSERT INTO todos (title, priority, due_date, list_id, is_completed)
        VALUES (?, ?, ?, ?, ?)
      `);

    const info = stmt.run(
      title,
      priority,
      due_date || null,
      list_id,
      is_completed ? 1 : 0
    );

    res.status(201).json({
      id: info.lastInsertRowid,
      title,
      priority,
      due_date: due_date || null,
      list_id,
      is_completed: is_completed ? 1 : 0
    });
  } catch (err) {
    console.error('Error inserting todo:', err.message);

    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ error: 'Invalid list_id. List does not exist.' });
    }

    res.status(500).json({ error: 'Failed to create todo' });
  }
}

const deleteAllTodos = (req, res) => {
  const userId = req.session.userId;

  try {
    const stmt = db.prepare(`
        DELETE FROM todos 
        WHERE list_id IN (
          SELECT id FROM lists WHERE user_id = ?
        )
      `);

    const result = stmt.run(userId);

    return res.json({
      success: true,
      message: 'All todos deleted successfully',
      deletedCount: result.changes
    });
  } catch (error) {
    console.error('Error deleting todos:', error);
    return res.status(500).json({ error: 'Failed to delete todos' });
  }
}

const updateTodoStatus = (req, res) => {
  const todoId = req.params.id;
  const { is_completed } = req.body;

  try {
    const checkTodo = db.prepare(`
        SELECT todos.id
        FROM todos
        JOIN lists ON todos.list_id = lists.id
        WHERE todos.id = ? AND lists.user_id = ?
      `);
    const todoExists = checkTodo.get(todoId, req.session.userId);

    if (!todoExists) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const completedValue = is_completed === true || is_completed === 1 || is_completed === '1' ? 1 : 0;


    const updateTodo = db.prepare('UPDATE todos SET is_completed = ? WHERE id = ?');
    updateTodo.run(completedValue, todoId);

    const updatedTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId);
    res.json(updatedTodo);
  } catch (err) {
    console.error('Error updating todo:', err.message);
    res.status(500).json({ error: 'Failed to update todo' });
  }
}

const deleteTodo = (req, res) => {
  const todoId = req.params.id;

  try {
    const checkTodo = db.prepare(`
        SELECT todos.id
        FROM todos
        JOIN lists ON todos.list_id = lists.id
        WHERE todos.id = ? AND lists.user_id = ?
      `);
    const todoExists = checkTodo.get(todoId, req.session.userId);

    if (!todoExists) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const deleteTodo = db.prepare('DELETE FROM todos WHERE id = ?');
    deleteTodo.run(todoId);

    res.json({ success: true, id: todoId });
  } catch (err) {
    console.error('Error deleting todo:', err.message);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
}

const updateTodo = (req, res) => {
  const todoId = Number(req.params.id);
  const { title, priority } = req.body;

  if (Number.isNaN(todoId)) {
    return res.status(400).json({ error: 'Invalid todo id' });
  }

  try {
    const currentUserId = String(req.session.userId);

    const checkTodo = db.prepare(`
        SELECT todos.id 
        FROM todos 
        JOIN lists ON todos.list_id = lists.id 
        WHERE todos.id = ? AND lists.user_id = ?
      `);

    const todoExists = checkTodo.get(todoId, currentUserId);

    if (!todoExists) {
      return res.status(404).json({ error: 'Todo not found or unauthorized' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }

    params.push(todoId);
    const sql = `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...params);

    const updatedTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId);
    return res.json(updatedTodo);

  } catch (err) {
    console.error('PATCH /api/todos/:id/details error:', err);
    return res.status(500).json({ error: 'Failed to update todo details' });
  }
}

module.exports = {
  getTodos,
  createTodo,
  deleteTodo,
  deleteAllTodos,
  updateTodoStatus,
  updateTodo
}