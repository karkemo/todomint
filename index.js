const express = require('express');
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

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
app.get('/profile', isAuthenticated, (req, res) => {
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

function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

function isGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
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

    const createUserWithDefaultList = db.transaction((id, userName, userEmail, userPassword) => {
      const insertUser = db.prepare('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)');
      insertUser.run(id, userName, userEmail, userPassword);

      const insertList = db.prepare('INSERT INTO lists (title, user_id) VALUES (?, ?)');
      insertList.run('Default', id);
    });

    createUserWithDefaultList(userId, name.trim(), email.toLowerCase().trim(), hashedPassword);

    req.session.userId = userId;
    req.session.userName = name;

    res.redirect('/dashboard');

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

    req.session.userId = existingUser.id;
    req.session.userName = existingUser.name;

    res.redirect('/dashboard');

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).send('Error while trying to log in');
  }
});

// post new todo
// app.post('/api/todos', (req, res) => {
//   const { title, is_completed, due_date, priority, list_id } = req.body;
  
//   if (!title || !list_id) {
//     return res.status(400).json({ error: "Title and list id are required" })
//   }

//   try {
//     const stmt = db.prepare(`
//       INSERT INTO todos (title, priority, due_date, list_id, is_completed)
//       VALUES (?, ?, ?, ?, ?)
//     `);

//     const cleanPriority = priority ? priority.toLowerCase() : 'medium';

//     const info = stmt.run(
//       title.trim(),
//       priority ? priority.toLowerCase() : 'medium',
//       due_date || null,
//       list_id,
//       is_completed ? 1 : 0
//     );

//     res.status(201).json({
//       id: info.lastInsertRowid,
//       title,
//       priority: priority ? priority.toLowerCase() : 'medium',
//       due_date: due_date || null,
//       list_id,
//       is_completed: is_completed ? 1 : 0
//     });
//   } catch (error) {
//     console.error('Error inserting todo:', err.message);
//     if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
//       return res.status(400).json({ error: 'Invalid list_id. List does not exist.' });
//     }

//     res.status(500).json({ error: 'Failed to create todo' });
//   }
// })

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

// temp path
// app.post('/api/users', async (req, res) => {
//   const { name, email, password } = req.body;
//   const userId = randomUUID();
//   try {
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const insert = db.prepare('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)');
//     insert.run(userId, name, email, hashedPassword);
//     res.json({ success: true, id: userId });
//   } catch (err) {
//     res.status(400).json({ error: "wrong data or email exists" });
//   }
// });

// pages
app.get('/api/hello', (req, res) => {
  res.json({ message: "Hello, World!" });
});

app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email FROM users').all();
  res.json(users);
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

// host on localhost
app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});