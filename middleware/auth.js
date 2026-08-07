const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../app.db'));

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

module.exports = {
  isAuthenticated,
  isGuest
};