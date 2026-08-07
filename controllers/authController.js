const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const { sendVerificationCode } = require('../services/email');

const db = new Database(path.join(__dirname, '../app.db'));

function generate6DigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function expiresInMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

const register = async (req, res) => {
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
};

const login = async (req, res) => {
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
};

const verify = async (req, res) => {
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
};

const forgotPassword = async (req, res) => {
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
};

const resetPassword = async (req, res) => {
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
};

module.exports = {
  register,
  login,
  verify,
  forgotPassword,
  resetPassword
};