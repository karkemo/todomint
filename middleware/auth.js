const { createClient } = require('@libsql/client');
require('dotenv').config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function isAuthenticated(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }

  try {
    const result = await db.execute({
      sql: 'SELECT id, is_verified FROM users WHERE id = ?',
      args: [req.session.userId]
    });
    const user = result.rows[0];

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

async function isGuest(req, res, next) {
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
      return res.redirect('/verify');
    } catch (err) {
      console.error('isGuest middleware error:', err);
      return res.redirect('/login');
    }
  }
  next();
}

module.exports = {
  isAuthenticated,
  isGuest
};