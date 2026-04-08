// utils/emailService.js
// Brevo SMTP — works on Render (IPv4, no port blocking)
//
// YOUR CREDENTIALS (already in your .env / Render env vars):
//   BREVO_SMTP_USER = subathra2000mdu@gmail.com   ← your Brevo login email
//   BREVO_API_KEY   = xsmtpsib-dd1bf5...           ← this IS the SMTP password
//
// ADD THIS ONE NEW VAR in Render → Environment:
//   BREVO_SMTP_USER = subathra2000mdu@gmail.com
//
// That's it. BREVO_API_KEY is already set and that IS the SMTP password.

const nodemailer = require('nodemailer');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createTransporter = () =>
  nodemailer.createTransport({
    host:    'smtp-relay.brevo.com',
    port:    587,
    secure:  false,
    auth: {
      user: process.env.BREVO_SMTP_USER || process.env.EMAIL_USER,
      // BREVO_API_KEY that starts with xsmtpsib- IS the SMTP password
      pass: process.env.BREVO_API_KEY,
    },
    family:            4,       // force IPv4 — Render blocks IPv6
    connectionTimeout: 20000,
    greetingTimeout:   20000,
    socketTimeout:     40000,
    tls: { rejectUnauthorized: false },
  });

const buildEmailHTML = (booking, isCancel = false) => {
  const ref      = booking.bookingReference || booking._id?.toString().slice(-8).toUpperCase() || 'N/A';
  const passenger= booking.passengerDetails?.name || 'Passenger';
  const airline  = booking.flight?.airline || 'N/A';
  const flightNo = booking.flight?.flightNumber || 'N/A';
  const from     = booking.flight?.from || booking.flight?.departureLocation || 'N/A';
  const to       = booking.flight?.to   || booking.flight?.arrivalLocation   || 'N/A';
  const rawPrice = typeof booking.flight?.price === 'object'
    ? (booking.flight.price.economy || 0)
    : (booking.flight?.price || 0);
  const price    = `Rs.${Number(rawPrice).toLocaleString('en-IN')}`;
  const date     = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const color    = isCancel ? '#dc2626' : '#1e40af';
  const title    = isCancel ? 'Booking Cancelled' : '✈ Booking Confirmed!';
  const message  = isCancel
    ? `Your booking <strong>#${ref}</strong> has been cancelled. Refund within 5-7 business days.`
    : `Your booking <strong>#${ref}</strong> is confirmed. Have a great flight!`;

  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
  <div style="background:${color};padding:28px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">${title}</h1>
  </div>
  <div style="padding:28px;">
    <p style="font-size:15px;color:#1e293b;">Dear <strong>${passenger}</strong>,</p>
    <p style="font-size:14px;color:#64748b;line-height:1.6;">${message}</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
      ${[
        ['Booking Reference', `#${ref}`],
        ['Airline',           airline],
        ['Flight Number',     flightNo],
        ['From',              from],
        ['To',                to],
        ['Fare Amount',       price],
        ['Class',             booking.bookingClass || 'Economy'],
        ['Passengers',        String(booking.passengers || 1)],
        ['Status',            (booking.paymentStatus || 'Pending').toUpperCase()],
        ['Date',              date],
      ].map(([label, value], idx) => `
      <tr style="background:${idx % 2 === 0 ? '#f8fafc' : '#fff'};">
        <td style="padding:10px 14px;font-weight:700;color:${color};width:42%;border-bottom:1px solid #f1f5f9;">${label}</td>
        <td style="padding:10px 14px;color:#0f172a;border-bottom:1px solid #f1f5f9;">${value}</td>
      </tr>`).join('')}
    </table>
    <p style="font-size:12px;color:#94a3b8;margin-top:20px;">
      ${isCancel ? 'For refund queries, contact our support team.' : 'Download your PDF receipt from the History page.'}
    </p>
  </div>
  <div style="background:#f8fafc;padding:16px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">&copy; ${new Date().getFullYear()} Flight Booking and Reservation System</p>
  </div>
</div>`;
};

const sendWithRetry = async (mailOptions, attempts = 3, delayMs = 3000) => {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      const transporter = createTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent | Attempt ${i} | To: ${mailOptions.to} | MsgId: ${info.messageId}`);
      return info;
    } catch (err) {
      lastError = err;
      console.error(`❌ Email attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) {
        console.log(`   Retrying in ${delayMs / 1000}s...`);
        await wait(delayMs);
      }
    }
  }
  throw lastError;
};

const sendBookingEmail = async (toEmailOrObj, booking) => {
  // Support both calling styles: sendBookingEmail(email, booking) or sendBookingEmail({to, booking})
  let toEmail = toEmailOrObj;
  if (toEmailOrObj && typeof toEmailOrObj === 'object' && toEmailOrObj.to) {
    toEmail  = toEmailOrObj.to;
    booking  = toEmailOrObj.booking || booking;
  }

  if (!process.env.BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY not set in environment variables');
    return;
  }
  if (!toEmail) {
    console.warn('⚠️  No recipient email — skipping');
    return;
  }

  const isCancel = booking?.paymentStatus === 'Cancelled' || booking?.bookingStatus === 'Cancelled';
  const ref      = booking?.bookingReference || booking?._id?.toString().slice(-8).toUpperCase() || 'N/A';

  const mailOptions = {
    from:    `"Flight Booking System" <${process.env.BREVO_SMTP_USER || process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: isCancel
      ? `Booking Cancelled - #${ref} | Flight Booking System`
      : `Booking Confirmed - #${ref} | Flight Booking System`,
    html:    buildEmailHTML(booking, isCancel),
    text:    `Flight Booking ${isCancel ? 'Cancellation' : 'Confirmation'} - Ref: #${ref}`,
  };

  try {
    await sendWithRetry(mailOptions, 3, 3000);
  } catch (err) {
    console.error('❌ All Brevo email retries failed (non-fatal):', err.message);
  }
};

module.exports = sendBookingEmail;