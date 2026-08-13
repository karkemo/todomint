// // index.js

// const express = require('express');
// // const Database = require('better-sqlite3');
// const { createClient } = require('@libsql/client'); // new
// const path = require('path');
// const session = require('express-session');
// const helmet = require('helmet');
// require('dotenv').config();
// const SQLiteStore = require('connect-sqlite3')(session);
// const fs = require('fs');
// const serverless = require('serverless-http');

// const { isAuthenticated, isGuest } = require('./middleware/auth');

// const todoRoutes = require('./routes/todoRoutes');
// const listRoutes = require('./routes/listRoutes');
// const settingsRoutes = require('./routes/settingsRoutes');
// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// const reportRoutes = require('./routes/reportRoutes');

// const noCache = require('./middleware/noCache');

// // create folders if not found
// fs.mkdirSync('./data/data', { recursive: true });
// fs.mkdirSync('./data/sessions', { recursive: true });

// const app = express();
// // const PORT = process.env.PORT || 3000;

// // IF ENV IS PRODUCTION
// if (process.env.NODE_ENV === 'production') {
//   module.exports = serverless(app);
// } else {
//   const PORT = process.env.PORT || 3000;
//   app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
//   });
// }

// const db = createClient({
//   url: 'file:./data/data/app.db', // all data
//   syncUrl: process.env.TURSO_DATABASE_URL,
//   authToken: process.env.TURSO_AUTH_TOKEN,
//   syncInterval: 60
// });

// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// app.set('trust proxy', 1);
// app.use(helmet({
//   contentSecurityPolicy: false
// }));

// app.use(session({
//   store: new SQLiteStore({ db: 'sessions.db', dir: './data/sessions' }), // session data
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     maxAge: 24 * 60 * 60 * 1000,
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     sameSite: 'lax'
//   }
// }));

// app.use(express.static(path.join(__dirname, 'src')));
// app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// async function initDb() {
//   try {

//     const timeout = new Promise((_, reject) =>
//       setTimeout(() => reject(new Error('Turso connection timeout')), 5000)
//     );

//     await Promise.race([
//       db.execute('PRAGMA foreign_keys = ON;'),
//       timeout
//     ]);

//     await db.execute(`
//       CREATE TABLE IF NOT EXISTS users (
//         id TEXT PRIMARY KEY,
//         name TEXT NOT NULL,
//         email TEXT UNIQUE NOT NULL,
//         password TEXT NOT NULL,
//         is_verified INTEGER DEFAULT 0,
//         verification_code TEXT,
//         code_expires_at DATETIME,
//         completed_todos_action TEXT DEFAULT 'keep',
//         preferred_font TEXT DEFAULT 'sans-serif',
//         pending_email TEXT,
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//         trial_ends_at TEXT,
//         subscription_status TEXT DEFAULT 'trail',
//         plan TEXT DEFAULT 'free'
//       );
//     `);

//     await db.execute(`
//       CREATE TABLE IF NOT EXISTS lists (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         title TEXT NOT NULL,
//         user_id TEXT NOT NULL,
//         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
//       );
//     `);

//     await db.execute(`
//       CREATE TABLE IF NOT EXISTS todos (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         title TEXT NOT NULL,
//         is_completed INTEGER DEFAULT 0,
//         due_date TEXT,
//         due_time TEXT,
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//         priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
//         list_id INTEGER NOT NULL,
//         FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
//       );
//     `);

//     await db.execute(`
//       CREATE TABLE IF NOT EXISTS reports (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         user_id TEXT,
//         email TEXT NOT NULL,
//         type TEXT NOT NULL, -- 'bug', 'feedback', 'feature_request',
//         title TEXT NOT NULL,
//         description TEXT NOT NULL,
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (user_id) REFERENCES users(id)
//       );
//     `);


//     console.log('Turso Database initialized successfully.');
//   } catch (err) {
//     console.error('Failed to initialize Turso DB:', err);
//   }
// }

// initDb();

// function generate6DigitCode() {
//   return String(Math.floor(100000 + Math.random() * 900000));
// }

// function expiresInMinutes(minutes) {
//   return new Date(Date.now() + minutes * 60 * 1000).toISOString();
// }

// app.use('/api', authRoutes);
// app.use('/api', userRoutes);
// app.use('/api/settings', isAuthenticated, settingsRoutes);
// app.use('/api/todos', isAuthenticated, todoRoutes);
// app.use('/api/lists', isAuthenticated, listRoutes);
// app.use('/api/reports', isAuthenticated, reportRoutes);

// // HTML Page Routes
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'index.html'));
// });

// app.get('/register', isGuest, (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'register.html'));
// });

// app.get('/dashboard', isAuthenticated, noCache, (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'dashboard.html'));
// });

// app.get('/login', isGuest, (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'login.html'));
// });

// app.get('/forgot-password', isGuest, (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'forgot-password.html'));
// });

// app.get('/create-password', isGuest, (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'create-password.html'));
// });

// app.get('/privacy', (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'privacy-policy.html'));
// })

// app.get('/terms', (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'terms-of-service.html'));
// })

// app.get('/contact', (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'contact.html'));
// })

// app.get('/help', (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'help.html'))
// })

// app.get('/logout', (req, res) => {
//   req.session.destroy((err) => {
//     if (err) {
//       console.error('Logout error:', err);
//     }
//     res.clearCookie('connect.sid');
//     res.redirect('/');
//   });
// });

// app.get('/profile', isAuthenticated, noCache, (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'profile.html'));
// });

// app.get('/settings', isAuthenticated, noCache, (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'settings.html'));
// });

// app.get('/report', isAuthenticated, (req, res) => {
//   res.sendFile(path.join(__dirname, 'src', 'report.html'));
// });

// app.get('/verify', async (req, res) => {
//   if (req.session && req.session.userId) {
//     try {
//       const result = await db.execute({
//         sql: 'SELECT is_verified FROM users WHERE id = ?',
//         args: [req.session.userId]
//       });
//       const user = result.rows[0];

//       if (user && (user.is_verified === 1 || user.is_verified === '1')) {
//         return res.redirect('/dashboard');
//       }
//     } catch (err) {
//       console.error('Error fetching user for /verify:', err);
//       return res.redirect('/login');
//     }
//   }

//   res.sendFile(path.join(__dirname, 'src', 'verify.html'));
// });

// app.get('/api/users', async (req, res) => {
//   try {
//     const result = await db.execute('SELECT id, name, email FROM users');
//     res.json(result.rows);
//   } catch (err) {
//     res.status(500).json({ error: 'Database error' });
//   }
// });

// app.get('/api/user', async (req, res) => {
//   if (!req.session || !req.session.userId) {
//     return res.status(401).json({ error: 'Unauthorized' });
//   }

//   try {
//     const result = await db.execute({
//       sql: 'SELECT id, name, email, completed_todos_action, preferred_font, created_at FROM users WHERE id = ?',
//       args: [req.session.userId]
//     });

//     const user = result.rows[0];

//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     res.json(user);
//   } catch (err) {
//     res.status(500).json({ error: 'Database error' });
//   }
// });

// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`Running on http://localhost:${PORT}`);
// });



// index.js

const express = require('express');
const { createClient } = require('@libsql/client');
const path = require('path');
const cookieSession = require('cookie-session');
const helmet = require('helmet');
require('dotenv').config();
const fs = require('fs');
const serverless = require('serverless-http');

const { isAuthenticated, isGuest } = require('./middleware/auth');

const todoRoutes = require('./routes/todoRoutes');
const listRoutes = require('./routes/listRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');

const noCache = require('./middleware/noCache');

// إنشاء المجلدات محلياً فقط (تجنباً لمشاكل Read-only على Vercel)
if (process.env.NODE_ENV !== 'production') {
  try {
    fs.mkdirSync('./data/data', { recursive: true });
    fs.mkdirSync('./data/sessions', { recursive: true });
  } catch (err) {
    console.log('Local dir creation skipped');
  }
}

const app = express();

// IF ENV IS PRODUCTION (Vercel Serverless Export)
if (process.env.NODE_ENV === 'production') {
  module.exports = serverless(app);
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

const db = createClient({
  // url: process.env.NODE_ENV === 'production' ? process.env.TURSO_DATABASE_URL : 'file:./data/data/app.db',
  // syncUrl: process.env.TURSO_DATABASE_URL,
  url: process.env.NODE_ENV === 'production' 
    ? process.env.TURSO_DATABASE_URL 
    : 'file:./data/data/app.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncInterval: 60
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false
}));

// إعداد الجلسات باستخدام الكوكيز المشفرة (متوافق مع Vercel)
app.use(
  cookieSession({
    name: 'todo-session',
    keys: [process.env.SESSION_SECRET || 'fallback-secret-key'],
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })
);

// توافقية دالة تسجيل الخروج القديمة مع نظام الـ cookies
app.use((req, res, next) => {
  if (req.session && !req.session.destroy) {
    req.session.destroy = (cb) => {
      req.session = null;
      if (cb) cb();
    };
  }
  next();
});

app.use(express.static(path.join(__dirname, 'src')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

async function initDb() {
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Turso connection timeout')), 5000)
    );

    await Promise.race([
      db.execute('PRAGMA foreign_keys = ON;'),
      timeout
    ]);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_verified INTEGER DEFAULT 0,
        verification_code TEXT,
        code_expires_at DATETIME,
        completed_todos_action TEXT DEFAULT 'keep',
        preferred_font TEXT DEFAULT 'sans-serif',
        pending_email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        trial_ends_at TEXT,
        subscription_status TEXT DEFAULT 'trail',
        plan TEXT DEFAULT 'free'
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        user_id TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        is_completed INTEGER DEFAULT 0,
        due_date TEXT,
        due_time TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
        list_id INTEGER NOT NULL,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        email TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    console.log('Turso Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Turso DB:', err);
  }
}

initDb();

function generate6DigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function expiresInMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api/settings', isAuthenticated, settingsRoutes);
app.use('/api/todos', isAuthenticated, todoRoutes);
app.use('/api/lists', isAuthenticated, listRoutes);
app.use('/api/reports', isAuthenticated, reportRoutes);

// HTML Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.get('/register', isGuest, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'register.html'));
});

app.get('/dashboard', isAuthenticated, noCache, (req, res) => {
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

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'privacy-policy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'terms-of-service.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'contact.html'));
});

app.get('/help', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'help.html'));
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('todo-session');
    res.redirect('/');
  });
});

app.get('/profile', isAuthenticated, noCache, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'profile.html'));
});

app.get('/settings', isAuthenticated, noCache, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'settings.html'));
});

app.get('/report', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'report.html'));
});

app.get('/verify', async (req, res) => {
  if (req.session && req.session.userId) {
    try {
      const result = await db.execute({
        sql: 'SELECT is_verified FROM users WHERE id = ?',
        args: [req.session.userId]
      });
      const user = result.rows[0];

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

app.get('/api/users', async (req, res) => {
  try {
    const result = await db.execute('SELECT id, name, email FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/user', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await db.execute({
      sql: 'SELECT id, name, email, completed_todos_action, preferred_font, created_at FROM users WHERE id = ?',
      args: [req.session.userId]
    });

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Database error' });
  }
});