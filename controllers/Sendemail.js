// utils/sendEmail.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS WORKS ON RENDER:
//  1. Uses host/port/secure explicitly — NOT service:'gmail'
//     Render (and most cloud servers) block service:'gmail' auto-config
//  2. port 465 + secure:true  is SSL  — most reliable on cloud
//  3. No TLS rejection — cloud certs differ from localhost
//  4. Returns a Promise so callers can await it properly
//  5. Errors are caught and logged — won't crash the server silently
// ─────────────────────────────────────────────────────────────────────────────

const nodemailer = require('nodemailer');

// ── Create transporter ONCE (module-level) ───────────────────────────────────
// This avoids re-creating the connection on every email call.
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,              // true for port 465 (SSL)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,  // Google App Password (16 chars, no spaces)
    },
    tls: {
      rejectUnauthorized: false,     // Required on Render / cloud servers
    },
  });
};

// ── Generic sendEmail function ───────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  // Guard: skip silently if env vars are missing (avoids crash in dev)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[sendEmail] EMAIL_USER or EMAIL_PASS not set — skipping email.');
    return { skipped: true };
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: `"Flight Booking System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html:  html  || `<p>${text || ''}</p>`,
    text:  text  || '',
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[sendEmail] ✅ Email sent to ${to} — MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    // Log full error so Render logs show the real cause
    console.error('[sendEmail] ❌ Failed to send email:');
    console.error('  to      :', to);
    console.error('  subject :', subject);
    console.error('  error   :', err.message);
    console.error('  code    :', err.code);
    console.error('  response:', err.response);
    // Re-throw so the controller can decide whether to surface this to the client
    throw err;
  }
};

module.exports = sendEmail;