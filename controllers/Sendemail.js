const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,             
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, 
    },
    tls: {
      rejectUnauthorized: false,    
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
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
    console.error('[sendEmail] ❌ Failed to send email:');
    console.error('  to      :', to);
    console.error('  subject :', subject);
    console.error('  error   :', err.message);
    console.error('  code    :', err.code);
    console.error('  response:', err.response);
    throw err;
  }
};

module.exports = sendEmail;