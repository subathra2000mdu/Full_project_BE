// utils/emailService.js
// FINAL FIX — port 587 + STARTTLS + rejectUnauthorized:false
// Port 465 (SSL) is often blocked by Render's network.
// Port 587 (STARTTLS) works reliably on Render free tier.

const nodemailer = require('nodemailer');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createTransporter = () =>
  nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   587,        // STARTTLS — works on Render (465 SSL is often blocked)
    secure: false,      // false for 587, true only for 465
    requireTLS: true,   // force STARTTLS upgrade
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout:   15000,
    socketTimeout:     30000,
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    },
  });

// HTML email builder
const buildEmailHTML = (booking, isCancel = false) => {
  const status    = (booking.paymentStatus || 'Pending').toUpperCase();
  const passenger = booking.passengerDetails?.name           || 'Passenger';
  const email     = booking.passengerDetails?.email          || '';
  const airline   = booking.flight?.airline                   || 'N/A';
  const flightNum = booking.flight?.flightNumber              || 'N/A';
  const from      = booking.flight?.departureLocation         || 'N/A';
  const to        = booking.flight?.arrivalLocation           || 'N/A';
  const price     = booking.flight?.price
    ? `Rs.${Number(booking.flight.price).toLocaleString('en-IN')}`
    : 'N/A';
  const ref  = booking.bookingReference
    || booking._id?.toString().slice(-8).toUpperCase()
    || 'N/A';
  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const headerColor = isCancel ? '#dc2626' : '#2563eb';
  const statusColor = isCancel ? '#dc2626' : '#16a34a';
  const statusBg    = isCancel ? '#fef2f2' : '#f0fdf4';
  const headerTitle = isCancel ? 'Booking Cancelled' : 'Booking Confirmed!';
  const headerSub   = isCancel
    ? 'Your booking has been cancelled. Refund processed per our policy.'
    : 'Your flight is confirmed. Safe travels!';
  const bodyMsg = isCancel
    ? `Your booking <strong>#${ref}</strong> is cancelled. Refund within 5-7 business days.`
    : `Your booking <strong>#${ref}</strong> is confirmed. Itinerary below.`;
  const footerNote = isCancel
    ? 'For refund queries, contact our support team.'
    : 'Download PDF receipt from the History page anytime.';

  const rows = [
    ['Booking Reference', `#${ref}`],
    ['Passenger Name',    passenger],
    ['Email',             email],
    ['Airline',           airline],
    ['Flight Number',     flightNum],
    ['From',              from],
    ['To',                to],
    ['Fare Amount',       price],
    ['Date',              date],
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:30px 15px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;max-width:580px;width:100%;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:${headerColor};padding:30px 36px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">
        Flight Booking System
      </h1>
      <p style="color:rgba(255,255,255,0.88);margin:8px 0 0;font-size:14px;">
        ${headerTitle} — ${headerSub}
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:22px 36px 0;text-align:center;">
      <span style="display:inline-block;background:${statusBg};color:${statusColor};
        padding:7px 22px;border-radius:999px;font-size:12px;font-weight:800;
        letter-spacing:1px;border:1.5px solid ${statusColor};">
        ${status}
      </span>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 36px 8px;">
      <p style="margin:0;font-size:14px;color:#1e293b;font-weight:600;">Dear ${passenger},</p>
      <p style="margin:8px 0 0;font-size:13px;color:#64748b;line-height:1.6;">${bodyMsg}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <tr>
          <td colspan="2" style="padding:10px 18px;background:#eff6ff;font-size:11px;font-weight:800;color:#3b82f6;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">
            Flight Details
          </td>
        </tr>
        ${rows.map(([label, value], idx) => `
        <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'};">
          <td style="padding:10px 18px;font-size:12px;font-weight:700;color:#64748b;width:42%;border-bottom:1px solid #f1f5f9;">${label}</td>
          <td style="padding:10px 18px;font-size:12px;font-weight:800;color:#0f172a;border-bottom:1px solid #f1f5f9;">${value}</td>
        </tr>`).join('')}
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:6px 36px 24px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">${footerNote}</p>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 36px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">
        &copy; ${new Date().getFullYear()} Flight Booking and Reservation System. Do not reply to this email.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
};

// Retry wrapper — 3 attempts with 3s gap
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

// Main export
const sendBookingEmail = async (toEmail, booking) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ EMAIL_USER / EMAIL_PASS not set in environment variables');
    return;
  }
  if (!toEmail) {
    console.warn('⚠️  No recipient email — skipping send');
    return;
  }

  const isCancel = booking.paymentStatus === 'Cancelled';
  const ref      = booking.bookingReference
    || booking._id?.toString().slice(-8).toUpperCase()
    || 'N/A';

  const subject = isCancel
    ? `Booking Cancelled - #${ref} | Flight Booking System`
    : `Booking Confirmed - #${ref} | Flight Booking System`;

  const mailOptions = {
    from:    `"Flight Booking System" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject,
    html:    buildEmailHTML(booking, isCancel),
    text: [
      `Flight Booking ${isCancel ? 'Cancellation' : 'Confirmation'}`,
      '',
      `Booking Ref : #${ref}`,
      `Passenger   : ${booking.passengerDetails?.name  || 'N/A'}`,
      `Email       : ${booking.passengerDetails?.email || 'N/A'}`,
      `Airline     : ${booking.flight?.airline         || 'N/A'}`,
      `Flight No   : ${booking.flight?.flightNumber    || 'N/A'}`,
      `From        : ${booking.flight?.departureLocation || 'N/A'}`,
      `To          : ${booking.flight?.arrivalLocation   || 'N/A'}`,
      `Fare        : INR ${booking.flight?.price || 0}`,
      `Status      : ${(booking.paymentStatus || 'Pending').toUpperCase()}`,
      `Date        : ${new Date().toLocaleDateString('en-IN')}`,
    ].join('\n'),
  };

  try {
    await sendWithRetry(mailOptions, 3, 3000);
  } catch (err) {
    // Log but never throw — email failure must not crash the API response
    console.error('❌ All email retries failed:', err.message);
  }
};

module.exports = sendBookingEmail;