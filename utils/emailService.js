const https = require('https');

const buildEmailHTML = (booking, isCancel = false) => {
  const passenger = booking.passengerDetails?.name   || 'Passenger';
  const email     = booking.passengerDetails?.email  || '';
  const airline   = booking.flight?.airline           || 'N/A';
  const flightNum = booking.flight?.flightNumber      || 'N/A';
  const from      = booking.flight?.departureLocation || 'N/A';
  const to        = booking.flight?.arrivalLocation   || 'N/A';
  const price     = booking.flight?.price
    ? `Rs.${Number(booking.flight.price).toLocaleString('en-IN')}`
    : 'N/A';
  const ref  = booking.bookingReference
    || booking._id?.toString().slice(-8).toUpperCase()
    || 'N/A';
  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const status      = (booking.paymentStatus || 'Pending').toUpperCase();
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
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:30px 15px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;max-width:580px;width:100%;overflow:hidden;">
  <tr>
    <td style="background:${headerColor};padding:30px 36px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Flight Booking System</h1>
      <p style="color:rgba(255,255,255,0.88);margin:8px 0 0;font-size:14px;">${headerTitle} — ${headerSub}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:22px 36px 0;text-align:center;">
      <span style="display:inline-block;background:${statusBg};color:${statusColor};padding:7px 22px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:1px;border:1.5px solid ${statusColor};">
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

const sendViaBrevo = (mailOptions) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      sender:   { name: 'Flight Booking System', email: process.env.EMAIL_USER },
      to:       [{ email: mailOptions.to }],
      subject:  mailOptions.subject,
      htmlContent: mailOptions.html,
      textContent: mailOptions.text || '',
    });

    const options = {
      hostname: 'api.brevo.com',
      path:     '/v3/smtp/email',
      method:   'POST',
      headers: {
        'Content-Type':  'application/json',
        'api-key':       process.env.BREVO_API_KEY,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ [Email] Sent via Brevo API | To: ${mailOptions.to} | Status: ${res.statusCode}`);
          resolve({ statusCode: res.statusCode, body: data });
        } else {
          console.error(`❌ [Email] Brevo API error | Status: ${res.statusCode} | Body: ${data}`);
          reject(new Error(`Brevo API error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ [Email] Brevo request error: ${err.message}`);
      reject(err);
    });

    req.setTimeout(15000, () => {
      req.destroy(new Error('Brevo request timed out'));
    });

    req.write(payload);
    req.end();
  });
};

const sendBookingEmail = async (toEmail, booking) => {
  if (!process.env.BREVO_API_KEY) {
    console.error('❌ [Email] BREVO_API_KEY not set in Render environment variables');
    console.error('   → Sign up free at https://app.brevo.com → SMTP & API → API Keys');
    return;
  }
  if (!process.env.EMAIL_USER) {
    console.error('❌ [Email] EMAIL_USER not set (used as sender address)');
    return;
  }
  if (!toEmail) {
    console.warn('⚠️  [Email] No recipient email — skipping');
    return;
  }

  const isCancel = booking.paymentStatus === 'Cancelled';
  const ref      = booking.bookingReference
    || booking._id?.toString().slice(-8).toUpperCase()
    || 'N/A';

  const mailOptions = {
    to:      toEmail,
    subject: isCancel
      ? `Booking Cancelled - #${ref} | Flight Booking System`
      : `Booking Confirmed - #${ref} | Flight Booking System`,
    html: buildEmailHTML(booking, isCancel),
    text: [
      `Flight Booking ${isCancel ? 'Cancellation' : 'Confirmation'}`,
      '',
      `Booking Ref : #${ref}`,
      `Passenger   : ${booking.passengerDetails?.name   || 'N/A'}`,
      `Email       : ${booking.passengerDetails?.email  || 'N/A'}`,
      `Airline     : ${booking.flight?.airline           || 'N/A'}`,
      `Flight No   : ${booking.flight?.flightNumber      || 'N/A'}`,
      `From        : ${booking.flight?.departureLocation || 'N/A'}`,
      `To          : ${booking.flight?.arrivalLocation   || 'N/A'}`,
      `Fare        : INR ${booking.flight?.price         || 0}`,
      `Status      : ${(booking.paymentStatus || 'Pending').toUpperCase()}`,
      `Date        : ${new Date().toLocaleDateString('en-IN')}`,
    ].join('\n'),
  };

  try {
    await sendViaBrevo(mailOptions);
  } catch (err) {
    console.error('❌ [Email] Failed to send:', err.message);
  }
};

module.exports = sendBookingEmail;