const nodemailer = require('nodemailer');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createTransporter = () =>
  nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
    family: 4, // ✅ FIX (forces IPv4)
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

// Retry wrapper
const sendWithRetry = async (mailOptions, attempts = 3, delayMs = 3000) => {
  let lastError;

  for (let i = 1; i <= attempts; i++) {
    try {
      const transporter = createTransporter();

      await transporter.verify(); // ✅ check connection
      console.log("✅ SMTP Connected");

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent | Attempt ${i} | To: ${mailOptions.to}`);
      return info;

    } catch (err) {
      lastError = err;
      console.error(`❌ Attempt ${i} failed: ${err.message}`);

      if (i < attempts) {
        console.log(`Retrying in ${delayMs / 1000}s...`);
        await wait(delayMs);
      }
    }
  }

  throw lastError;
};

// MAIN FUNCTION
const sendBookingEmail = async (toEmail, booking) => {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    console.error('❌ Brevo credentials missing');
    return;
  }

  if (!toEmail) {
    console.warn('⚠️ No recipient email');
    return;
  }

  const ref =
    booking.bookingReference ||
    booking._id?.toString().slice(-8).toUpperCase() ||
    'N/A';

  const isCancel = booking.paymentStatus === 'Cancelled';

  const subject = isCancel
    ? `Booking Cancelled - #${ref}`
    : `Booking Confirmed - #${ref}`;

  const mailOptions = {
    from: `"Flight Booking System" <${process.env.BREVO_SMTP_USER}>`,
    to: toEmail,
    subject,
    html: `<h2>${subject}</h2><p>Booking Ref: ${ref}</p>`,
    text: `Booking Ref: ${ref}`,
  };

  try {
    await sendWithRetry(mailOptions);
  } catch (err) {
    console.error('❌ All retries failed:', err.message);
  }
};

module.exports = sendBookingEmail;