const nodemailer = require('nodemailer');

// Helper to handle delays for retries
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates a fresh transporter.
 * Forcing family: 4 is essential on Render to avoid IPv6 connection issues.
 */
const createTransporter = () =>
  nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // Use STARTTLS (standard for port 587)
    auth: {
      user: process.env.BREVO_SMTP_USER, // Your Brevo email
      pass: process.env.BREVO_API_KEY,  // Your Brevo SMTP Master Password
    },
    family: 4, 
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: { rejectUnauthorized: false },
  });

/**
 * sendEmail
 * A generic, reusable function with built-in retry logic.
 */
const sendEmail = async ({ to, subject, html, text, attempts = 3 }) => {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_API_KEY) {
    console.warn('⚠️  Brevo credentials missing in .env — skipping email.');
    return { skipped: true };
  }

  const mailOptions = {
    from: `"Flight Booking System" <${process.env.BREVO_SMTP_USER}>`,
    to,
    subject,
    html: html || `<p>${text || ''}</p>`,
    text: text || '',
  };

  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      const transporter = createTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to: ${to} (Attempt ${i})`);
      return info;
    } catch (err) {
      lastError = err;
      console.error(`❌ Attempt ${i} failed: ${err.message}`);
      if (i < attempts) await wait(3000); // Wait 3 seconds before retrying
    }
  }

  throw new Error(`All email retries failed: ${lastError.message}`);
};

module.exports = sendEmail;