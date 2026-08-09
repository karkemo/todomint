import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

export async function sendVerificationCode(toEmail, code) {
  try {
    const mailOptions = {
      from: `"Todo App" <karem.kemo.ragab@gmail.com>`,
      to: toEmail,
      subject: 'Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Account Verification</h2>
          <p>Your verification code is: <b style="font-size: 24px; color: #4F46E5;">${code}</b></p>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
}

export async function sendEmailChangeNotification(oldEmail, newEmail) {
  try {
    const mailOptions = {
      from: `"Todo App" <karem.kemo.ragab@gmail.com>`,
      to: oldEmail,
      subject: 'Email Change Requested',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Security Notification</h2>
          <p>A request was made to change your account email to <strong>${newEmail}</strong>.</p>
          <p>If you made this request, please verify the new address using the code sent there.</p>
          <p>If you did not request this change, please contact support immediately or reset your password.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email change notification sent to old email:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email change notification failed:', error);
    return false;
  }
}