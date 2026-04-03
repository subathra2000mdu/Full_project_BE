// utils/emailService.js
// Production-ready nodemailer with Gmail App Password
// Key fixes for Render deployment:
//   1. Use host + port 465 + secure:true  (NOT service:'gmail' which is unreliable in prod)
//   2. Create a fresh transporter per send — avoids stale connection issues on Render cold starts
//   3. Wrap sendMail in a Promise so the server awaits completion before responding
//   4. Retry logic: 3 attempts with 2s delay between each

const nodemailer = require('nodemailer');

// ── Create a fresh transporter each time ─────────────────────────────────────
// Reason: Render spins down free-tier services after 15 min inactivity.
// A cached transporter created at startup may have a stale/dead TCP connection
// when the server wakes from sleep. Creating it fresh per-request avoids this.
const createTransporter = () =>
  nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   465,          // 465 = SSL/TLS  (587 = STARTTLS — use 465 for Render reliability)
    secure: true,         // true for port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password (16-char, no spaces)
    },
    // Increase timeouts — Render free tier can be slow to establish connections
    connectionTimeout: 10000,  // 10s
    greetingTimeout:   10000,
    socketTimeout:     15000,
    tls: {
      rejectUnauthorized: true, // keep TLS verification on
    },
  });

// ── Retry helper ──────────────────────────────────────────────────────────────
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendWithRetry = async (mailOptions, attempts = 3, delayMs = 2000) => {
  for (let i = 1; i <= attempts; i++) {
    try {
      const transporter = createTransporter();

      // Verify the connection before sending (throws immediately if auth fails)
      await transporter.verify();

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${mailOptions.to} | MessageId: ${info.messageId}`);
      return info;
    } catch (err) {
      console.error(`❌ Email attempt ${i}/${attempts} failed:`, err.message);
      if (i < attempts) {
        console.log(`   Retrying in ${delayMs / 1000}s...`);
        await wait(delayMs);
      } else {
        throw err; // Re-throw after all retries exhausted
      }
    }
  }
};

// ── Beautiful HTML email template ─────────────────────────────────────────────
const buildEmailHTML = (booking, isCancel = false) => {
  const status      = (booking.paymentStatus || 'Pending').toUpperCase();
  const passenger   = booking.passengerDetails?.name  || 'Passenger';
  const email       = booking.passengerDetails?.email || '';
  const airline     = booking.flight?.airline          || 'N/A';
  const flightNum   = booking.flight?.flightNumber     || 'N/A';
  const from        = booking.flight?.departureLocation || 'N/A';
  const to          = booking.flight?.arrivalLocation   || 'N/A';
  const price       = booking.flight?.price            ? `₹${Number(booking.flight.price).toLocaleString('en-IN')}` : 'N/A';
  const ref         = booking.bookingReference         || booking._id?.toString().slice(-8).toUpperCase() || 'N/A';
  const date        = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const headerColor  = isCancel ? '#dc2626' : '#2563eb';
  const statusColor  = isCancel ? '#dc2626' : '#16a34a';
  const statusBg     = isCancel ? '#fef2f2' : '#f0fdf4';
  const headerTitle  = isCancel ? '✈ Booking Cancelled' : '✈ Booking Confirmed!';
  const headerSub    = isCancel
    ? 'Your booking has been cancelled. Refund will be processed shortly.'
    : 'Your flight has been booked successfully. Safe travels!';

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
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:${headerColor};padding:32px 40px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">
                Flight Booking &amp; Reservation
              </h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">${headerSub}</p>
            </td>
          </tr>

          <!-- Status badge -->
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <span style="display:inline-block;background:${statusBg};color:${statusColor};
                padding:8px 24px;border-radius:999px;font-size:13px;font-weight:800;
                letter-spacing:1px;border:1.5px solid ${statusColor};">
                ${status}
              </span>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 40px 8px;">
              <p style="margin:0;font-size:16px;color:#1e293b;font-weight:600;">
                Dear ${passenger},
              </p>
              <p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.6;">
                ${isCancel
                  ? `Your booking <strong>#${ref}</strong> has been cancelled. If you paid, your refund will be processed within 5-7 business days.`
                  : `Your booking <strong>#${ref}</strong> is confirmed. Please find your itinerary details below.`
                }
              </p>
            </td>
          </tr>

          <!-- Flight details card -->
          <tr>
            <td style="padding:16px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f8fafc;border-radius:12px;border:1.5px solid #e2e8f0;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;background:#eff6ff;">
                    <p style="margin:0;font-size:12px;font-weight:800;color:#3b82f6;text-transform:uppercase;letter-spacing:1px;">
                      Flight Details
                    </p>
                  </td>
                </tr>
                ${[
                  ['Booking Reference', `#${ref}`],
                  ['Passenger Name',    passenger],
                  ['Email',             email],
                  ['Airline',           airline],
                  ['Flight Number',     flightNum],
                  ['From',              from],
                  ['To',                to],
                  ['Fare Amount',       price],
                  ['Date',              date],
                ].map(([label, value], idx) => `
                <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'};">
                  <td style="padding:12px 20px;font-size:13px;font-weight:700;color:#64748b;width:45%;">${label}</td>
                  <td style="padding:12px 20px;font-size:13px;font-weight:800;color:#0f172a;">${value}</td>
                </tr>`).join('')}
              </table>
            </td>
          </tr>

          <!-- Note -->
          <tr>
            <td style="padding:8px 40px 32px;">
              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;text-align:center;">
                ${isCancel
                  ? 'If you have any questions about your refund, please contact our support team.'
                  : 'You can download your PDF receipt from the History page. For support, reply to this email.'
                }
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                &copy; ${new Date().getFullYear()} Flight Booking &amp; Reservation System. All rights reserved.
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

// ── Main export ───────────────────────────────────────────────────────────────
const sendBookingEmail = async (toEmail, booking) => {
  // Guard: don't crash the payment flow if email config is missing
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  EMAIL_USER / EMAIL_PASS not set — skipping email send');
    return;
  }
  if (!toEmail) {
    console.warn('⚠️  No recipient email provided — skipping email send');
    return;
  }

  const isCancel = booking.paymentStatus === 'Cancelled';
  const subject  = isCancel
    ? `Booking Cancelled — #${booking.bookingReference || booking._id?.toString().slice(-8).toUpperCase()}`
    : `Booking Confirmed — #${booking.bookingReference || booking._id?.toString().slice(-8).toUpperCase()} ✅`;

  const mailOptions = {
    from:    `"Flight Booking System" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject,
    html:    buildEmailHTML(booking, isCancel),
    // Plain-text fallback for email clients that can't render HTML
    text: `
Flight Booking ${isCancel ? 'Cancellation' : 'Confirmation'}

Booking Reference : #${booking.bookingReference || 'N/A'}
Passenger         : ${booking.passengerDetails?.name || 'N/A'}
Airline           : ${booking.flight?.airline || 'N/A'}
Flight No         : ${booking.flight?.flightNumber || 'N/A'}
From              : ${booking.flight?.departureLocation || 'N/A'}
To                : ${booking.flight?.arrivalLocation || 'N/A'}
Fare              : INR ${booking.flight?.price || 0}
Status            : ${(booking.paymentStatus || 'Pending').toUpperCase()}
Date              : ${new Date().toLocaleDateString('en-IN')}
    `.trim(),
  };

  try {
    await sendWithRetry(mailOptions, 3, 2000);
  } catch (err) {
    // Log the error but don't throw — the payment is already confirmed,
    // we should NOT fail the HTTP response just because the email failed.
    console.error('❌ All email send attempts failed:', err.message);
  }
};

module.exports = sendBookingEmail;