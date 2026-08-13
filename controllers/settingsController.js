const bcrypt = require('bcrypt');
const { createClient } = require('@libsql/client');
const { sendVerificationCode, sendEmailChangeNotification } = require('../services/email');
require('dotenv').config();

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

const updateName = async (req, res) => {
  const { newName } = req.body;

  try {
    const result = await db.execute({
      sql: 'SELECT id FROM users WHERE id = ?',
      args: [req.session.userId]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.execute({
      sql: 'UPDATE users SET name = ? WHERE id = ?',
      args: [newName, req.session.userId]
    });

    return res.json({
      success: true,
      message: 'Name updated successfully',
      name: newName
    });
  } catch (error) {
    console.error('Error updating name:', error);
    return res.status(500).json({ error: 'Internal server error while updating name' });
  }
};

const updateEmail = async (req, res) => {
  const { newEmail, currentPassword } = req.body;

  try {
    const normalizedNewEmail = newEmail;
    const result = await db.execute({
      sql: 'SELECT id, email, password FROM users WHERE id = ?',
      args: [req.session.userId]
    });
    const user = result.rows[0];

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (user.email.toLowerCase() === normalizedNewEmail) {
      return res.status(400).json({ error: 'New email must be different from current email' });
    }

    const checkExisting = await db.execute({
      sql: 'SELECT id FROM users WHERE (email = ? OR pending_email = ?) AND id != ?',
      args: [normalizedNewEmail, normalizedNewEmail, user.id]
    });

    if (checkExisting.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    const code = generate6DigitCode();
    const expiresAt = expiresInMinutes(10);

    await db.execute({
      sql: 'UPDATE users SET pending_email = ?, is_verified = 0, verification_code = ?, code_expires_at = ? WHERE id = ?',
      args: [normalizedNewEmail, code, expiresAt, user.id]
    });

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
};

const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const result = await db.execute({
      sql: 'SELECT password FROM users WHERE id = ?',
      args: [req.session.userId]
    });
    const user = result.rows[0];

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE id = ?',
      args: [hashedPassword, req.session.userId]
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Password change error:', err);
    return res.status(500).json({ error: 'Failed to update password' });
  }
};

const updateCompletedAction = async (req, res) => {
  const { action } = req.body;

  try {
    await db.execute({
      sql: 'UPDATE users SET completed_todos_action = ? WHERE id = ?',
      args: [action, req.session.userId]
    });
    return res.json({ success: true, action });
  } catch (err) {
    console.error('Completed action update error:', err);
    return res.status(500).json({ error: 'Failed to save preference' });
  }
};

// NEW
const updatePreferredFont = async (req, res) => {
  const { font } = req.body;
  const allowedFonts = ['sans-serif', 'audiowide', 'cursive'];
  if (!font || !allowedFonts.includes(font)) {
    return res.status(400).json({ error: 'Invalid font selection' });
  }

  try {
    await db.execute({
      sql: 'UPDATE users SET preferred_font = ? WHERE id = ?',
      args: [font, req.session.userId]
    });
    return res.json({ success: true, font });
  } catch (err) {
    console.error('Preferred font update error:', err);
    return res.status(500).json({ error: 'Failed to save font preference' });
  }
};

module.exports = {
  updateName,
  updateEmail,
  updatePassword,
  updateCompletedAction,
  updatePreferredFont
};