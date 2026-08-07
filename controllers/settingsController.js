const path = require('path');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../app.db'));
const { sendVerificationCode, sendEmailChangeNotification } = require('../services/email');

const updateName = (req, res) => {
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
}

const updateEmail = async (req, res) => {
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
}

const updatePassword = async (req, res) => {
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
}

const updateCompletedAction = (req, res) => {
  const { action } = req.body;

  try {
    db.prepare('UPDATE users SET completed_todos_action = ? WHERE id = ?').run(action, req.session.userId);
    return res.json({ success: true, action });
  } catch (err) {
    console.error('Completed action update error:', err);
    return res.status(500).json({ error: 'Failed to save preference' });
  }
}

module.exports = {
  updateName,
  updateEmail,
  updatePassword,
  updateCompletedAction
}