const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('EMAIL_USER or EMAIL_PASS missing — skipping email.');
    return { skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, 
    },
    tls: { rejectUnauthorized: false },
  });

  const mailOptions = {
    from: `"Flight Booking System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: html || `<p>${text || ''}</p>`,
    text: text || '',
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${to}`);
    return info;
  } catch (err) {
    console.error(`Email Error: ${err.message}`);
    throw err;
  }
};

module.exports = sendEmail;