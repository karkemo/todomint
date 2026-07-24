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
    password TEXT NOT NULL
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
    list_id INTEGER NOT NULL,
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
  );
`);

function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/register');
}

function isGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
}

// post register data
app.post('/register', isGuest ,async (req, res) => {
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

    const insert = db.prepare('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)');
    insert.run(userId, name.trim(), email.toLowerCase().trim(), hashedPassword);

    req.session.userId = userId;
    req.session.userName = name;

    res.redirect('/dashboard');

  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).send('Error while trying to sign up');
  }
});

// post login data
app.post('/login', async (req, res) => {
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

// temp path
app.post('/api/users', async (req, res) => {
  const { name, email, password } = req.body;
  const userId = randomUUID();
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const insert = db.prepare('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)');
    insert.run(userId, name, email, hashedPassword);
    res.json({ success: true, id: userId });
  } catch (err) {
    res.status(400).json({ error: "wrong data or email exists" });
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'register.html'));
});

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'dashboard.html'));
});

app.get('/login', (req, res) => {
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