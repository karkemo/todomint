const express = require('express');
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { sendVerificationCode } = require('./services/email');

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

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    verification_code TEXT,
    code_expires_at DATETIME,
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

// get user
app.get('/api/user', isAuthenticated, (req, res) => {
  try {
    const userId = req.session.userId;
    const data = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?');
    const user = data.get(userId);

    if (!user) {
      return res.status(404).json({error: 'user not found'});
    }

    res.json(user)
  } catch (err) {
    res.status(500).json({error: 'Error while trying to fetch data'});
    console.log(err);
  }
});

// get user name only
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

// post register data
app.post('/register', isGuest, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).send('All fields are required');
  }

  try {
    const checkUser = db.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = checkUser.get(email.toLowerCase().trim());

    if (existingUser) {
      return res.status(400).send('This email is not available');
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

    createUserWithDefaultList(userId, name.trim(), email.toLowerCase().trim(), hashedPassword, code, expiresAt);

    // store pending user id in session until verification completes
    req.session.pendingUserId = userId;
    req.session.pendingUserName = name;

    // send verification email (best-effort)
    try {
      await sendVerificationCode(email.toLowerCase().trim(), code);
    } catch (err) {
      console.error('Error sending verification email (register):', err);
    }

    return res.redirect('/verify');

  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).send('Error while trying to sign up');
  }
});

// post login data
app.post('/login', isGuest, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('All fields are required');
  }

  try {
    const checkUser = db.prepare('SELECT id, name, password FROM users WHERE email = ?');
    const existingUser = checkUser.get(email.toLowerCase().trim());

    if (!existingUser) {
      return res.status(400).send('Invalid email or password');
    }

    if (!existingUser.password) {
      return res.status(400).send('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);

    if (!isPasswordValid) {
      return res.status(400).send('Invalid email or password');
    }

    if (existingUser.is_verified === 0 || existingUser.is_verified === '0') {
      // generate new code, update DB, send email and redirect to verify page
      const code = generate6DigitCode();
      const expiresAt = expiresInMinutes(10);

      const update = db.prepare('UPDATE users SET verification_code = ?, code_expires_at = ? WHERE id = ?');
      update.run(code, expiresAt, existingUser.id);

      req.session.pendingUserId = existingUser.id;
      req.session.pendingUserName = existingUser.name;

      try {
        await sendVerificationCode(email.toLowerCase().trim(), code);
      } catch (err) {
        console.error('Error sending verification email (login):', err);
      }

      return res.redirect('/verify');
    }

    req.session.userId = existingUser.id;
    req.session.userName = existingUser.name;

    res.redirect('/dashboard');

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).send('Error while trying to log in');
  }
});

app.post('/api/todos', isAuthenticated, (req, res) => {
  const { title, is_completed, due_date, priority, list_id } = req.body;
  
  if (!title || !list_id) {
    return res.status(400).json({ error: "Title and list id are required" });
  }

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

    const cleanPriority = priority ? priority.toLowerCase() : 'medium';

    const info = stmt.run(
      title.trim(),
      cleanPriority,
      due_date || null,
      Number(list_id),
      is_completed ? 1 : 0
    );

    res.status(201).json({
      id: info.lastInsertRowid,
      title: title.trim(),
      priority: cleanPriority,
      due_date: due_date || null,
      list_id: Number(list_id),
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

app.patch('/api/todos/:id', isAuthenticated, (req, res) => {
  const todoId = Number(req.params.id);
  const { is_completed } = req.body;

  if (Number.isNaN(todoId)) {
    return res.status(400).json({ error: 'Invalid todo id' });
  }

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
});

app.delete('/api/todos/:id', isAuthenticated, (req, res) => {
  const todoId = Number(req.params.id);

  if (Number.isNaN(todoId)) {
    return res.status(400).json({ error: 'Invalid todo id' });
  }

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

// pages
app.get('/api/hello', (req, res) => {
  res.json({ message: "Hello, World!" });
});

app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email FROM users').all();
  res.json(users);
});

function generate6DigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function expiresInMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const checkUser = db.prepare('SELECT id FROM users WHERE email = ?');
    const existingUser = checkUser.get(email.toLowerCase().trim());

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

    createUserWithDefaultList(userId, name.trim(), email.toLowerCase().trim(), hashedPassword, code, expiresAt);

    // send verification email (don't block on failure)
    try {
      await sendVerificationCode(email.toLowerCase().trim(), code);
    } catch (err) {
      console.error('Error sending verification email:', err);
    }

    return res.status(201).json({ requireVerification: true, email: email.toLowerCase().trim() });
  } catch (err) {
    console.error('Registration Error (API):', err);
    return res.status(500).json({ error: 'Error while trying to sign up' });
  }
});

// API: login with verification handling
app.post('/api/login', async (req, res) => {
  // if already have active session
  if (req.session && req.session.userId) {
    return res.json({ success: true, message: 'Already authenticated' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const checkUser = db.prepare('SELECT id, name, password, is_verified FROM users WHERE email = ?');
    const existingUser = checkUser.get(email.toLowerCase().trim());

    if (!existingUser) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (!existingUser.password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (existingUser.is_verified === 0 || existingUser.is_verified === '0') {
      // generate new code, update DB, send email and prompt verification
      const code = generate6DigitCode();
      const expiresAt = expiresInMinutes(10);

      const update = db.prepare('UPDATE users SET verification_code = ?, code_expires_at = ? WHERE id = ?');
      update.run(code, expiresAt, existingUser.id);

      try {
        await sendVerificationCode(email.toLowerCase().trim(), code);
      } catch (err) {
        console.error('Error sending verification email (login):', err);
      }

      return res.status(200).json({ requireVerification: true, email: email.toLowerCase().trim() });
    }

    // verified -> create session
    req.session.userId = existingUser.id;
    req.session.userName = existingUser.name;

    return res.json({ success: true, message: 'Logged in' });
  } catch (err) {
    console.error('Login Error (API):', err);
    return res.status(500).json({ error: 'Error while trying to log in' });
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

app.patch('/api/todos/:id/details', isAuthenticated, (req, res) => {
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

    if (title !== undefined && title.trim() !== '') {
      updates.push('title = ?');
      params.push(title.trim());
    }

    if (priority !== undefined) {
      const cleanPriority = String(priority).toLowerCase();
      if (['low', 'medium', 'high'].includes(cleanPriority)) {
        updates.push('priority = ?');
        params.push(cleanPriority);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    params.push(todoId);
    const sql = `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...params);

    // Return the updated task
    const updatedTodo = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId);
    return res.json(updatedTodo);

  } catch (err) {
    console.error('PATCH /api/todos/:id/details error:', err);
    return res.status(500).json({ error: 'Failed to update todo details' });
  }
});

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

app.post('/api/lists', isAuthenticated, (req, res) => {
  try {
    const userId = req.session.userId;
    const { title } = req.body;
    const trimmedTitle = title?.trim();

    if (!trimmedTitle) {
      return res.status(400).json({ error: 'List title is required' });
    }

    const stmt = db.prepare('INSERT INTO lists (title, user_id) VALUES (?, ?)');
    const result = stmt.run(trimmedTitle, userId);

    res.status(201).json({ id: result.lastInsertRowid, title: trimmedTitle });
  } catch (err) {
    console.error('Error creating list:', err);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

app.delete('/api/lists/:id', isAuthenticated, (req, res) => {
  const listId = Number(req.params.id);

  if (Number.isNaN(listId)) {
    return res.status(400).json({ error: 'Invalid list id' });
  }

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

app.patch('/api/lists/:id', isAuthenticated, (req, res) => {
  const listId = Number(req.params.id);
  const { title } = req.body;
  const trimmedTitle = title?.trim();

  if (Number.isNaN(listId)) {
    return res.status(400).json({ error: 'Invalid list id' });
  }

  if (!trimmedTitle) {
    return res.status(400).json({ error: 'List title is required' });
  }

  try {
    const checkList = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?');
    const listExists = checkList.get(listId, req.session.userId);

    if (!listExists) {
      return res.status(404).json({ error: 'List not found or unauthorized' });
    }

    const updateList = db.prepare('UPDATE lists SET title = ? WHERE id = ?');
    updateList.run(trimmedTitle, listId);

    res.json({ success: true, id: listId, title: trimmedTitle });
  } catch (err) {
    console.error('Error updating list:', err.message);
    res.status(500).json({ error: 'Failed to update list' });
  }
})

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
})

// verify page (serve static html)
app.get('/verify', (req, res) => {
  // If logged in and verified -> dashboard; if logged in but not verified -> show verify page
  if (req.session && req.session.userId) {
    try {
      const user = db.prepare('SELECT is_verified FROM users WHERE id = ?').get(req.session.userId);
      if (user && (user.is_verified === 1 || user.is_verified === '1')) {
        return res.redirect('/dashboard');
      }
      // otherwise allow access to verify page
    } catch (err) {
      console.error('Error fetching user for /verify:', err);
      return res.redirect('/login');
    }
  }

  res.sendFile(path.join(__dirname, 'src', 'verify.html'));
});

// API: verify code
app.post('/api/verify', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  try {
    const user = db.prepare('SELECT id, name, verification_code, code_expires_at FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.verification_code || !user.code_expires_at) {
      return res.status(400).json({ error: 'No verification code set' });
    }

    const now = new Date();
    const expiresAt = new Date(user.code_expires_at);
    if (isNaN(expiresAt.getTime()) || now > expiresAt) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    if (String(code).trim() !== String(user.verification_code)) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const update = db.prepare('UPDATE users SET is_verified = 1, verification_code = NULL, code_expires_at = NULL WHERE id = ?');
    update.run(user.id);

    // establish session
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

// host on localhost
app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});