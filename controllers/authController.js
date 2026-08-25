const { createClient } = require('@libsql/client');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const { sendVerificationCode } = require('../services/email');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function generate6DigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function expiresInMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const checkUser = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email]
    });

    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'This email is not available' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    const code = generate6DigitCode();
    const expiresAt = expiresInMinutes(10);
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    await db.batch([
      {
        sql: `INSERT INTO users (id, name, email, password, is_verified, verification_code, code_expires_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [userId, name, email, hashedPassword, 0, code, expiresAt]
      },
      {
        sql: 'INSERT INTO lists (title, user_id) VALUES (?, ?)',
        args: ['Default', userId]
      }
    ], 'write');

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
    const result = await db.execute({
      sql: 'SELECT id, name, password, is_verified FROM users WHERE email = ?',
      args: [email]
    });
    const existingUser = result.rows[0];

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

      await db.execute({
        sql: 'UPDATE users SET verification_code = ?, code_expires_at = ? WHERE id = ?',
        args: [code, expiresAt, existingUser.id]
      });

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

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const cleanCode = String(code).trim();

    const result = await db.execute({
      sql: 'SELECT id, name, email, pending_email, verification_code, code_expires_at FROM users WHERE LOWER(email) = ? OR LOWER(pending_email) = ?',
      args: [normalizedEmail, normalizedEmail]
    });
    
    const user = result.rows[0];

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.verification_code || !user.code_expires_at) {
      return res.status(400).json({ error: 'No verification code set' });
    }

    const rawExpires = user.code_expires_at;
    const expiresTimestamp = !isNaN(rawExpires) ? Number(rawExpires) : rawExpires;
    const expiresAt = new Date(expiresTimestamp);
    const now = new Date();

    if (isNaN(expiresAt.getTime()) || now > expiresAt) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    if (cleanCode !== String(user.verification_code).trim()) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (type === 'reset') {
      await db.execute({
        sql: 'UPDATE users SET verification_code = NULL, code_expires_at = NULL WHERE id = ?',
        args: [user.id]
      });

      req.session.resetUserId = user.id;

      return res.json({ success: true, redirectTo: '/create-password' });
    }

    if (user.pending_email) {
      const pendingClean = user.pending_email.toLowerCase().trim();
      if (normalizedEmail !== pendingClean) {
        return res.status(400).json({ error: 'Please verify the new email address sent to your inbox.' });
      }

      await db.execute({
        sql: 'UPDATE users SET email = pending_email, pending_email = NULL, is_verified = 1, verification_code = NULL, code_expires_at = NULL WHERE id = ?',
        args: [user.id]
      });
    } else {
      const emailClean = user.email ? user.email.toLowerCase().trim() : '';
      if (normalizedEmail !== emailClean) {
        return res.status(400).json({ error: 'Email does not match the account email.' });
      }

      await db.execute({
        sql: 'UPDATE users SET is_verified = 1, verification_code = NULL, code_expires_at = NULL WHERE id = ?',
        args: [user.id]
      });
    }

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
    const result = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [normalizedEmail]
    });
    const user = result.rows[0];

    if (!user) {
      return res.json({ success: true });
    }

    const code = generate6DigitCode();
    const expiresAt = expiresInMinutes(10);

    await db.execute({
      sql: 'UPDATE users SET verification_code = ?, code_expires_at = ? WHERE id = ?',
      args: [code, expiresAt, user.id]
    });

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
    const result = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [normalizedEmail]
    });
    const user = result.rows[0];

    if (!user) return res.status(404).json({ error: 'User not found' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.execute({
      sql: 'UPDATE users SET password = ?, verification_code = NULL, code_expires_at = NULL, is_verified = 1 WHERE id = ?',
      args: [hashed, user.id]
    });

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