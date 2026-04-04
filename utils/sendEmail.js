const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[sendEmail] EMAIL_USER or EMAIL_PASS missing — skipping.');
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    const info = await transporter.sendMail({
      from:    `"Flight Booking System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html:    html || `<p>${text || ''}</p>`,
      text:    text || '',
    });
    console.log(`[sendEmail] Sent to ${to} id: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('[sendEmail] Error:', err.message, 'code:', err.code);
    throw err;
  }
};

module.exports = sendEmail;
