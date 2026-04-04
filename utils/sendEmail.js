const nodemailer = require('nodemailer');

/**
 * Sends an email using Nodemailer with Gmail SMTP.
 * Includes TLS bypass for compatibility with cloud environments like Render.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  // 1. Validation: Ensure credentials exist to prevent runtime crashes
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[sendEmail] ⚠️ EMAIL_USER or EMAIL_PASS missing in environment variables — skipping email.');
    return { skipped: true };
  }

  // 2. Create Transporter
  // Using port 465 (SSL) is generally more stable on cloud platforms than 587 (TLS)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Should be a 16-character Google App Password
    },
    tls: {
      // This allows the connection even if the SSL certificate doesn't match perfectly
      // Highly recommended for Render/Heroku deployments
      rejectUnauthorized: false, 
    },
  });

  // 3. Define Mail Options
  const mailOptions = {
    from: `"Flight Booking System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: html || `<p>${text || ''}</p>`,
    text: text || '',
  };

  // 4. Send the Email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[sendEmail] ✅ Email sent successfully to: ${to}`);
    console.log(`[sendEmail] 🆔 Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    // Detailed error logging for easier debugging in cloud logs
    console.error('[sendEmail] ❌ Critical Error:');
    console.error(` - Destination: ${to}`);
    console.error(` - Error Message: ${err.message}`);
    console.error(` - Error Code: ${err.code}`);
    
    // Rethrow the error so the controller can handle the failure (e.g., alert the user)
    throw err;
  }
};

module.exports = sendEmail;