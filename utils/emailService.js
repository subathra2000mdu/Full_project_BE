// utils/emailService.js
//
// FIXES for production (Render deployment):
//   1. host + port 465 + secure:true  — explicit Gmail SSL config (NOT service:'gmail')
//   2. Fresh transporter per request  — avoids stale TCP after Render cold start
//   3. Increased timeouts             — Render can be slow waking up
//   4. Retry logic (3 attempts)       — network blips on Render free tier
//   5. Full HTML email for BOTH       — Completed AND Cancelled statuses
//   6. Non-blocking design            — email failure never crashes API response

const nodemailer = require('nodemailer');

// ── Create a fresh transporter each call ──────────────────────────────────────
// Reason: Render spins down after 15 min. A cached transporter has a dead TCP
// connection after wake-up. Fresh per-request avoids "ECONNRESET" errors.
const createTransporter = () =>
  nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   465,   // SSL/TLS — more reliable on Render than port 587 (STARTTLS)
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // 16-char Gmail App Password, no spaces
    },
    connectionTimeout: 10000, // 10s — allows for Render cold-start delay
    greetingTimeout:   10000,
    socketTimeout:     30000,
    tls: {
      rejectUnauthorized: true,
    },
  });

// ── Wait helper for retry delays ──────────────────────────────────────────────
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── HTML email builder — handles both Confirmed and Cancelled ─────────────────
const buildEmailHTML = (booking, isCancel = false) => {
  const status    = (booking.paymentStatus || 'Pending').toUpperCase();
  const passenger = booking.passengerDetails?.name  || 'Passenger';
  const email     = booking.passengerDetails?.email || '';
  const airline   = booking.flight?.airline          || 'N/A';
  const flightNum = booking.flight?.flightNumber     || 'N/A';
  const from      = booking.flight?.departureLocation || 'N/A';
  const to        = booking.flight?.arrivalLocation   || 'N/A';
  const price     = booking.flight?.price
    ? `₹${Number(booking.flight.price).toLocaleString('en-IN')}`
    : 'N/A';
  const ref  = booking.bookingReference
    || booking._id?.toString().slice(-8).toUpperCase()
    || 'N/A';
  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // Style values differ between confirmation and cancellation
  const headerColor  = isCancel ? '#dc2626' : '#2563eb';
  const statusColor  = isCancel ? '#dc2626' : '#16a34a';
  const statusBg     = isCancel ? '#fef2f2' : '#f0fdf4';
  const headerTitle  = isCancel ? 'Booking Cancelled' : 'Booking Confirmed!';
  const headerSub    = isCancel
    ? 'Your booking has been cancelled. Refund will be processed per our policy.'
    : 'Your flight has been booked successfully. Safe travels!';
  const bodyMessage  = isCancel
    ? `Your booking <strong>#${ref}</strong> has been cancelled. If you paid, your refund will be credited within 5–7 business days.`
    : `Your booking <strong>#${ref}</strong> is confirmed. Your itinerary details are below.`;
  const footerNote   = isCancel
    ? 'For refund queries, please contact our support team.'
    : 'Download your PDF receipt from the History page at any time.';

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

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flight Booking ${isCancel ? 'Cancellation' : 'Confirmation'}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;
                 box-shadow:0 4px 24px rgba(0,0,0,0.08);
                 max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:${headerColor};padding:32px 40px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">
                ✈ ${headerTitle}
              </h1>
              <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:14px;">
                ${headerSub}
              </p>
            </td>
          </tr>

          <!-- Status badge -->
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <span style="display:inline-block;
                background:${statusBg};color:${statusColor};
                padding:8px 24px;border-radius:999px;
                font-size:13px;font-weight:800;letter-spacing:1px;
                border:1.5px solid ${statusColor};">
                ${status}
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 40px 8px;">
              <p style="margin:0;font-size:15px;color:#1e293b;font-weight:600;">
                Dear ${passenger},
              </p>
              <p style="margin:10px 0 0;font-size:14px;color:#64748b;line-height:1.7;">
                ${bodyMessage}
              </p>
            </td>
          </tr>

          <!-- Details table -->
          <tr>
            <td style="padding:16px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border-radius:12px;border:1.5px solid #e2e8f0;overflow:hidden;">
                <tr>
                  <td colspan="2"
                    style="padding:12px 20px;background:#eff6ff;
                           font-size:12px;font-weight:800;
                           color:#3b82f6;text-transform:uppercase;letter-spacing:1px;
                           border-bottom:1px solid #e2e8f0;">
                    Flight Details
                  </td>
                </tr>
                ${rows.map(([label, value], idx) => `
                <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'};">
                  <td style="padding:11px 20px;font-size:13px;font-weight:700;
                             color:#64748b;width:45%;border-bottom:1px solid #f1f5f9;">
                    ${label}
                  </td>
                  <td style="padding:11px 20px;font-size:13px;font-weight:800;
                             color:#0f172a;border-bottom:1px solid #f1f5f9;">
                    ${value}
                  </td>
                </tr>`).join('')}
              </table>
            </td>
          </tr>

          <!-- Note -->
          <tr>
            <td style="padding:8px 40px 28px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7;">
                ${footerNote}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;
                       padding:18px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} Flight Booking &amp; Reservation System.
                This is an automated message — please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// ── Internal send with retry ──────────────────────────────────────────────────
const sendWithRetry = async (mailOptions, attempts = 3, delayMs = 2000) => {
  for (let i = 1; i <= attempts; i++) {
    try {
      const transporter = createTransporter();

      // Verify SMTP connection before attempting send
      await transporter.verify();

      const info = await transporter.sendMail(mailOptions);
      console.log(
        `✅ Email sent to ${mailOptions.to} | Attempt ${i} | MessageId: ${info.messageId}`
      );
      return info;
    } catch (err) {
      console.error(`❌ Email attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) {
        console.log(`   Retrying in ${delayMs / 1000}s...`);
        await wait(delayMs);
      } else {
        console.error('❌ All email retry attempts exhausted.');
        throw err; // Let caller handle / log
      }
    }
  }
};

// ── Main export ───────────────────────────────────────────────────────────────
const sendBookingEmail = async (toEmail, booking) => {
  // Guard: missing env vars
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ EMAIL_USER / EMAIL_PASS missing from environment variables!');
    console.error('   Add them to your Render environment variable settings.');
    return;
  }

  // Guard: no recipient
  if (!toEmail) {
    console.warn('⚠️  sendBookingEmail called with no recipient — skipping.');
    return;
  }

  const isCancel = booking.paymentStatus === 'Cancelled';
  const ref      = booking.bookingReference
    || booking._id?.toString().slice(-8).toUpperCase()
    || 'N/A';

  const subject = isCancel
    ? `❌ Booking Cancelled — #${ref} | Flight Booking System`
    : `✅ Booking Confirmed — #${ref} | Flight Booking System`;

  const mailOptions = {
    from:    `"Flight Booking System" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject,
    html:    buildEmailHTML(booking, isCancel),
    // Plain-text fallback
    text: [
      `Flight Booking ${isCancel ? 'Cancellation' : 'Confirmation'}`,
      '',
      `Booking Ref  : #${ref}`,
      `Passenger    : ${booking.passengerDetails?.name  || 'N/A'}`,
      `Email        : ${booking.passengerDetails?.email || 'N/A'}`,
      `Airline      : ${booking.flight?.airline         || 'N/A'}`,
      `Flight No    : ${booking.flight?.flightNumber    || 'N/A'}`,
      `From         : ${booking.flight?.departureLocation || 'N/A'}`,
      `To           : ${booking.flight?.arrivalLocation   || 'N/A'}`,
      `Fare         : INR ${booking.flight?.price || 0}`,
      `Status       : ${(booking.paymentStatus || 'Pending').toUpperCase()}`,
      `Date         : ${new Date().toLocaleDateString('en-IN')}`,
    ].join('\n'),
  };

  try {
    await sendWithRetry(mailOptions, 3, 2000);
  } catch (err) {
    // Email failure must never crash the payment/cancel API response
    console.error('❌ sendBookingEmail ultimately failed:', err.message);
  }
};

module.exports = sendBookingEmail;