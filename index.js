const { registerSchema, loginSchema } = require('./schemas/auth_schema.js');
const {
  updateNameSchema,
  updateEmailSchema,
  updatePasswordSchema,
  updateCompletedActionSchema,
  verifyCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('./schemas/settings_schema.js');
const {
  createTodoSchema,
  updateTodoStatusSchema,
  updateTodoDetailsSchema,
  deleteTodoSchema,
  createListSchema,
  updateListSchema,
  deleteListSchema
} = require('./schemas/todo_list_schema.js');
const express = require('express');
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { sendVerificationCode, sendEmailChangeNotification } = require('./services/email');
const { resolveCompletedTodoAction } = require('./services/completed_todos_action');
const { validate } = require('./middleware/validate');

const app = express();
const PORT = 3000;
const db = new Database('app.db');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'todo-app-secret-key-12345',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, secure: false }
}));

app.use(express.static(path.join(__dirname, 'src')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

db.pragma('foreign_keys = ON');

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    verification_code TEXT,
    code_expires_at DATETIME,
    completed_todos_action TEXT DEFAULT 'keep',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0,
    due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    list_id INTEGER NOT NULL,
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
  );
`);

ensureColumn('users', 'completed_todos_action', "TEXT DEFAULT 'keep'");
ensureColumn('users', 'pending_email', 'TEXT');

function isAuthenticated(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }

  try {
    const user = db.prepare('SELECT id, is_verified FROM users WHERE id = ?').get(req.session.userId);
    if (!user) return res.redirect('/login');
    if (user.is_verified !== 1 && user.is_verified !== '1') {
      return res.redirect('/verify');
    }
    return next();
  } catch (err) {
    console.error('isAuthenticated middleware error:', err);
    return res.redirect('/login');
  }
}

function isGuest(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const user = db.prepare('SELECT is_verified FROM users WHERE id = ?').get(req.session.userId);
      if (user && (user.is_verified === 1 || user.is_verified === '1')) {
        return res.redirect('/dashboard');
      }
      return res.redirect('/verify');
    } catch (err) {
      console.error('isGuest middleware error:', err);
      return res.redirect('/login');
    }
  }
  next();
}

function generate6DigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function expiresInMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

// Settings routes protected by validate(...)
app.post('/api/settings/name', isAuthenticated, validate(updateNameSchema), async (req, res) => {
  const { newName } = req.body;

  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(newName, req.session.userId);

    return res.json({ 
      success: true, 
      message: 'Name updated successfully', 
      name: newName 
    });

  } catch (error) {
    console.error('Error updating name:', error);
    return res.status(500).json({ error: 'Internal server error while updating name' });
  }
});

app.post('/api/settings/email', isAuthenticated, validate(updateEmailSchema), async (req, res) => {
  const { newEmail, currentPassword } = req.body;

  try {
    const normalizedNewEmail = newEmail;
    const user = db.prepare('SELECT id, email, password FROM users WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (user.email.toLowerCase() === normalizedNewEmail) {
      return res.status(400).json({ error: 'New email must be different from current email' });
    }

    const existingEmailUser = db.prepare('SELECT id FROM users WHERE (email = ? OR pending_email = ?) AND id != ?').get(normalizedNewEmail, normalizedNewEmail, user.id);
    if (existingEmailUser) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    const code = generate6DigitCode();
    const expiresAt = expiresInMinutes(10);
    db.prepare('UPDATE users SET pending_email = ?, is_verified = 0, verification_code = ?, code_expires_at = ? WHERE id = ?')
      .run(normalizedNewEmail, code, expiresAt, user.id);

    try {
      await sendVerificationCode(normalizedNewEmail, code);
    } catch (err) {
      console.error('Error sending verification email on email change:', err);
    }

    try {
      await sendEmailChangeNotification(user.email, normalizedNewEmail);
    } catch (err) {
      console.error('Error sending email change notification to old email:', err);
    }

    return res.json({ success: true, requireVerification: true, email: normalizedNewEmail });
  } catch (err) {
    console.error('Email change error:', err);
    return res.status(500).json({ error: 'Failed to update email' });
  }
});

app.post('/api/settings/password', isAuthenticated, validate(updatePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.session.userId);

    return res.json({ success: true });
  } catch (err) {
    console.error('Password change error:', err);
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

app.patch('/api/settings/completed-action', isAuthenticated, validate(updateCompletedActionSchema), async (req, res) => {
  const { action } = req.body;

  try {
    db.prepare('UPDATE users SET completed_todos_action = ? WHERE id = ?').run(action, req.session.userId);
    return res.json({ success: true, action });
  } catch (err) {
    console.error('Completed action update error:', err);
    return res.status(500).json({ error: 'Failed to save preference' });
  }
});

// Auth & Verification API routes
app.post('/api/register', validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const checkUser = db.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = checkUser.get(email);

    if (existingUser) {
      return res.status(400).json({ error: 'This email is not available' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    const code = generate6DigitCode();
    const expiresAt = expiresInMinutes(10);

    const createUserWithDefaultList = db.transaction((id, userName, userEmail, userPassword, vcode, vexp) => {
      const insertUser = db.prepare('INSERT INTO users (id, name, email, password, is_verified, verification_code, code_expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
      insertUser.run(id, userName, userEmail, userPassword, 0, vcode, vexp);

      const insertList = db.prepare('INSERT INTO lists (title, user_id) VALUES (?, ?)');
      insertList.run('Default', id);
    });

    createUserWithDefaultList(userId, name, email, hashedPassword, code, expiresAt);

    try {
      await sendVerificationCode(email, code);
    } catch (err) {
      console.error('Error sending verification email:', err);
    }

    return res.status(201).json({ requireVerification: true, email });
  } catch (err) {
    console.error('Registration Error (API):', err);
    return res.status(500).json({ error: 'Error while trying to sign up' });
  }
});

app.post('/api/login', validate(loginSchema), async (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ success: true, message: 'Already authenticated' });
  }

  const { email, password } = req.body;

  try {
    const checkUser = db.prepare('SELECT id, name, password, is_verified FROM users WHERE email = ?');
    const existingUser = checkUser.get(email);

    if (!existingUser || !existingUser.password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (existingUser.is_verified === 0 || existingUser.is_verified === '0') {
      const code = generate6DigitCode();
      const expiresAt = expiresInMinutes(10);

      const update = db.prepare('UPDATE users SET verification_code = ?, code_expires_at = ? WHERE id = ?');
      update.run(code, expiresAt, existingUser.id);

      try {
        await sendVerificationCode(email, code);
      } catch (err) {
        console.error('Error sending verification email (login):', err);
      }

      return res.status(200).json({ requireVerification: true, email });
    }

    req.session.userId = existingUser.id;
    req.session.userName = existingUser.name;

    return res.json({ success: true, message: 'Logged in' });
  } catch (err) {
    console.error('Login Error (API):', err);
    return res.status(500).json({ error: 'Error while trying to log in' });
  }
});

app.post('/api/verify', validate(verifyCodeSchema), async (req, res) => {
  const { email, code, type } = req.body;

  try {
    const normalizedEmail = email;
    const user = db.prepare('SELECT id, name, email, pending_email, verification_code, code_expires_at FROM users WHERE email = ? OR pending_email = ?').get(normalizedEmail, normalizedEmail);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.verification_code || !user.code_expires_at) {
      return res.status(400).json({ error: 'No verification code set' });
    }

    const now = new Date();
    const expiresAt = new Date(user.code_expires_at);
    if (isNaN(expiresAt.getTime()) || now > expiresAt) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    if (String(code) !== String(user.verification_code)) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (user.pending_email) {
      if (normalizedEmail !== user.pending_email.toLowerCase().trim()) {
        return res.status(400).json({ error: 'Please verify the new email address from the verification email.' });
      }
    } else if (normalizedEmail !== user.email.toLowerCase().trim()) {
      return res.status(400).json({ error: 'Email does not match the current account email.' });
    }

    if (type === 'reset') {
      db.prepare('UPDATE users SET verification_code = NULL, code_expires_at = NULL WHERE id = ?').run(user.id);
      return res.json({ success: true, redirectTo: '/create-password' });
    }

    let update;
    if (user.pending_email) {
      update = db.prepare('UPDATE users SET email = pending_email, pending_email = NULL, is_verified = 1, verification_code = NULL, code_expires_at = NULL WHERE id = ?');
    } else {
      update = db.prepare('UPDATE users SET is_verified = 1, verification_code = NULL, code_expires_at = NULL WHERE id = ?');
    }
    update.run(user.id);

    req.session.userId = user.id;
    req.session.userName = user.name;
    delete req.session.pendingUserId;
    delete req.session.pendingUserName;

    return res.json({ success: true, redirectTo: '/dashboard' });
  } catch (err) {
    console.error('Error verifying code:', err);
    return res.status(500).json({ error: 'Failed to verify code' });
  }
});

app.post('/api/auth/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body;

  try {
    const normalizedEmail = email;
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      return res.json({ success: true });
    }

    const code = generate6DigitCode();
    const expiresAt = expiresInMinutes(10);

    db.prepare('UPDATE users SET verification_code = ?, code_expires_at = ? WHERE id = ?')
      .run(code, expiresAt, user.id);

    try {
      await sendVerificationCode(normalizedEmail, code);
    } catch (err) {
      console.error('Error sending forgot-password email:', err);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process request' });
  }
});

app.post('/api/auth/reset-password', validate(resetPasswordSchema), async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const normalizedEmail = email;
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, verification_code = NULL, code_expires_at = NULL, is_verified = 1 WHERE id = ?')
      .run(hashed, user.id);

    return res.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Other user & todo routes
app.get('/api/user/name', isAuthenticated, (req, res) => {
  try {
    const userId = req.session.userId; 
    const data = db.prepare('SELECT name FROM users WHERE id = ?');
    const user = data.get(userId);

    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.json({ name: user.name });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Error while trying to fetch username' });
  }
});

app.delete('/api/user', isAuthenticated, (req, res) => {
  try {
    const userId = req.session.userId;
    
    const userExist = db.prepare(`SELECT id FROM users WHERE id = ?`).get(userId);
    if (!userExist) return res.status(404).json({ error: 'User not found' });

    const deleteUser = db.prepare(`DELETE FROM users WHERE id = ?`);
    deleteUser.run(userId);

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
});

app.get('/api/todos', isAuthenticated, (req, res) => {
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
});

app.post('/api/todos', isAuthenticated, validate(createTodoSchema), (req, res) => {
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
});

app.delete('/api/todos', isAuthenticated, (req, res) => {
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
});

app.patch('/api/todos/:id', isAuthenticated, validate(updateTodoStatusSchema), (req, res) => {
  // id is guaranteed to be a valid positive integer here
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
    
    // ... rest of completed_todos_action logic ...

    const updateTodo = db.prepare('UPDATE todos SET is_completed = ? WHERE id = ?');
    updateTodo.run(completedValue, todoId);

    const updatedTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId);
    res.json(updatedTodo);
  } catch (err) {
    console.error('Error updating todo:', err.message);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.delete('/api/todos/:id', isAuthenticated, validate(deleteTodoSchema), (req, res) => {
  const todoId = req.params.id; // Automatically parsed by Zod

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
});

app.patch('/api/todos/:id/details', isAuthenticated, validate(updateTodoDetailsSchema), (req, res) => {
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
});

// List Management Routes
app.get('/api/lists', isAuthenticated, (req, res) => {
  try {
    const userId = req.session.userId;
    const stmt = db.prepare('SELECT id, title FROM lists WHERE user_id = ?');
    const lists = stmt.all(userId);

    res.json(lists);
  } catch (err) {
    console.error('Error fetching lists:', err);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

app.post('/api/lists', isAuthenticated, validate(createListSchema), (req, res) => {
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
});

app.delete('/api/lists/:id', isAuthenticated, validate(deleteListSchema), (req, res) => {
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
});

app.patch('/api/lists/:id', isAuthenticated, validate(updateListSchema), (req, res) => {
  const listId = req.params.id; // Automatically parsed by Zod
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
});

// HTML Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.get('/register', isGuest, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'register.html'));
});

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'dashboard.html'));
});

app.get('/login', isGuest, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'login.html'));
});

app.get('/forgot-password', isGuest, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'forgot-password.html'));
});

app.get('/create-password', isGuest, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'create-password.html'));
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

app.get('/profile', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'profile.html'));
});

app.get('/settings', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'settings.html'));
});

app.get('/report', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'report.html'));
});

app.get('/verify', (req, res) => {
  if (req.session && req.session.userId) {
    try {
      const user = db.prepare('SELECT is_verified FROM users WHERE id = ?').get(req.session.userId);
      if (user && (user.is_verified === 1 || user.is_verified === '1')) {
        return res.redirect('/dashboard');
      }
    } catch (err) {
      console.error('Error fetching user for /verify:', err);
      return res.redirect('/login');
    }
  }

  res.sendFile(path.join(__dirname, 'src', 'verify.html'));
});

app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email FROM users').all();
  res.json(users);
});

app.get('/api/user', (req, res) => {
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
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Running on http://localhost:${PORT}`);
});