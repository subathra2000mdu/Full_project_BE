const nodemailer = require('nodemailer');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Always create fresh transporter per attempt — prevents stale IPv6 connections
const createTransporter = () =>
  nodemailer.createTransport({
    host:    'smtp-relay.brevo.com',
    port:    587,
    secure:  false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
    family:            4,       // CRITICAL: force IPv4 — Render free tier blocks IPv6
    connectionTimeout: 15000,
    greetingTimeout:   15000,
    socketTimeout:     30000,
    tls: { rejectUnauthorized: false },
  });

const sendWithRetry = async (mailOptions, attempts = 3, delayMs = 3000) => {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      const transporter = createTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent | Attempt ${i} | To: ${mailOptions.to}`);
      return info;
    } catch (err) {
      lastError = err;
      console.error(`❌ Email attempt ${i} failed: ${err.message}`);
      if (i < attempts) {
        console.log(`Retrying in ${delayMs / 1000}s...`);
        await wait(delayMs);
      }
    }
  }
  throw lastError;
};

/**
 * sendBookingEmail
 * Supports both calling styles used across controllers:
 *   sendBookingEmail(toEmail, booking)
 *   sendBookingEmail({ to, booking })
 */
const sendBookingEmail = async (toEmailOrObj, booking) => {
  // Normalise calling styles
  let toEmail = toEmailOrObj;
  if (toEmailOrObj && typeof toEmailOrObj === 'object' && toEmailOrObj.to) {
    toEmail = toEmailOrObj.to;
    booking = toEmailOrObj.booking || booking;
  }

  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    console.warn('⚠️  Brevo SMTP credentials missing — skipping email');
    return;
  }
  if (!toEmail) {
    console.warn('⚠️  No recipient email provided — skipping');
    return;
  }

  const snap     = booking?.flightSnapshot || {};
  const ref      = booking?.bookingReference
    || booking?._id?.toString().slice(-8).toUpperCase()
    || 'N/A';
  const isCancel =
    booking?.paymentStatus === 'Refunded' ||
    booking?.bookingStatus === 'Cancelled';

  const subject = isCancel
    ? `Booking Cancelled – #${ref}`
    : `Booking Confirmed – #${ref}`;

  const html = isCancel
    ? `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <div style="background:#dc2626;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0">Booking Cancelled</h1>
        </div>
        <div style="padding:24px">
          <p>Hi <strong>${booking?.passengerDetails?.name || 'Passenger'}</strong>,</p>
          <p>Your booking <strong>#${ref}</strong> has been cancelled and a refund has been initiated.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#fef2f2"><td style="padding:10px;font-weight:bold;color:#dc2626;width:40%">Reference</td><td style="padding:10px">${ref}</td></tr>
            <tr><td style="padding:10px;font-weight:bold;color:#dc2626">Route</td><td style="padding:10px">${snap.departureLocation || 'N/A'} → ${snap.arrivalLocation || 'N/A'}</td></tr>
            <tr style="background:#fef2f2"><td style="padding:10px;font-weight:bold;color:#dc2626">Amount</td><td style="padding:10px">Rs. ${(booking?.totalAmount || 0).toLocaleString('en-IN')}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px">Refund will be processed within 5–7 business days.</p>
        </div>
      </div>`
    : `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <div style="background:#1e40af;padding:20px;text-align:center">
          <h1 style="color:#fff;margin:0">✈ Booking Confirmed!</h1>
        </div>
        <div style="padding:24px">
          <p>Hi <strong>${booking?.passengerDetails?.name || 'Passenger'}</strong>,</p>
          <p>Your booking is confirmed. Here are your details:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#eff6ff"><td style="padding:10px;font-weight:bold;color:#1e40af;width:40%">Reference</td><td style="padding:10px">${ref}</td></tr>
            <tr><td style="padding:10px;font-weight:bold;color:#1e40af">Flight</td><td style="padding:10px">${snap.flightNumber || 'N/A'} – ${snap.airline || 'N/A'}</td></tr>
            <tr style="background:#eff6ff"><td style="padding:10px;font-weight:bold;color:#1e40af">Route</td><td style="padding:10px">${snap.departureLocation || 'N/A'} → ${snap.arrivalLocation || 'N/A'}</td></tr>
            <tr><td style="padding:10px;font-weight:bold;color:#1e40af">Date</td><td style="padding:10px">${snap.departureDate || 'N/A'}</td></tr>
            <tr style="background:#eff6ff"><td style="padding:10px;font-weight:bold;color:#1e40af">Departure</td><td style="padding:10px">${snap.departureTime || 'N/A'}</td></tr>
            <tr><td style="padding:10px;font-weight:bold;color:#1e40af">Class</td><td style="padding:10px">${booking?.bookingClass || 'Economy'}</td></tr>
            <tr style="background:#eff6ff"><td style="padding:10px;font-weight:bold;color:#1e40af">Passengers</td><td style="padding:10px">${booking?.passengers || 1}</td></tr>
            <tr><td style="padding:10px;font-weight:bold;color:#1e40af">Payment</td><td style="padding:10px">${booking?.paymentMethod || 'N/A'}</td></tr>
            <tr style="background:#eff6ff"><td style="padding:10px;font-weight:bold;color:#1e40af">Amount Paid</td><td style="padding:10px;font-weight:bold;color:#16b981">Rs. ${(booking?.totalAmount || 0).toLocaleString('en-IN')}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px">Thank you for choosing us. Have a great flight!</p>
        </div>
      </div>`;

  const mailOptions = {
    from:    `"Flight Booking System" <${process.env.BREVO_SMTP_USER}>`,
    to:      toEmail,
    subject,
    html,
    text: `${subject} – Booking Reference: ${ref}`,
  };

  try {
    await sendWithRetry(mailOptions);
  } catch (err) {
    // Non-fatal — payment already confirmed, don't crash the response
    console.error('❌ All email retries failed (non-fatal):', err.message);
  }
};

module.exports = sendBookingEmail;