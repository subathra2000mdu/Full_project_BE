// utils/emailTemplates.js
// ─────────────────────────────────────────────────────────────────────────────
// HTML email templates for:
//   1. paymentConfirmationEmail  — sent after successful payment
//   2. cancellationEmail         — sent after booking cancellation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Payment confirmation email HTML
 * @param {Object} params
 * @param {string} params.passengerName
 * @param {string} params.bookingReference
 * @param {string} params.airline
 * @param {string} params.flightNumber
 * @param {string} params.from
 * @param {string} params.to
 * @param {string} params.departureTime
 * @param {number} params.amount
 * @param {string} params.seatPreference
 */
const paymentConfirmationEmail = ({
  passengerName,
  bookingReference,
  airline,
  flightNumber,
  from,
  to,
  departureTime,
  amount,
  seatPreference,
}) => {
  const formattedAmount = Number(amount || 0).toLocaleString('en-IN');
  const formattedDate   = departureTime
    ? new Date(departureTime).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Kolkata',
      })
    : 'N/A';

  return {
    subject: `✅ Booking Confirmed — ${bookingReference}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Booking Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;">
                ✈️ Flight Booking System
              </h1>
              <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">Booking Confirmation</p>
            </td>
          </tr>

          <!-- Success badge -->
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <div style="display:inline-block;background:#dcfce7;border:2px solid #16a34a;border-radius:50px;padding:10px 28px;">
                <span style="color:#15803d;font-weight:800;font-size:15px;">✅ Payment Successful</span>
              </div>
              <h2 style="color:#1e293b;font-size:22px;margin:20px 0 4px;">Hi ${passengerName || 'Passenger'},</h2>
              <p style="color:#64748b;font-size:15px;margin:0;">Your flight has been booked and confirmed!</p>
            </td>
          </tr>

          <!-- Booking details -->
          <tr>
            <td style="padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;">
                <tr>
                  <td colspan="2" style="background:#1d4ed8;padding:14px 20px;">
                    <span style="color:#ffffff;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Booking Details</span>
                  </td>
                </tr>
                ${[
                  ['Booking Reference', `<strong style="color:#1d4ed8;font-size:16px;">${bookingReference || 'N/A'}</strong>`],
                  ['Passenger Name',    passengerName  || 'N/A'],
                  ['Airline',           `${airline || 'N/A'} · ${flightNumber || ''}`],
                  ['Route',             `${from || 'N/A'} → ${to || 'N/A'}`],
                  ['Departure',         formattedDate],
                  ['Seat Preference',   seatPreference || 'N/A'],
                  ['Amount Paid',       `<strong style="color:#16a34a;font-size:16px;">₹${formattedAmount}</strong>`],
                ].map(([label, value], i) => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:12px 20px;color:#64748b;font-size:13px;font-weight:600;width:40%;background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">${label}</td>
                  <td style="padding:12px 20px;color:#1e293b;font-size:14px;background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">${value}</td>
                </tr>`).join('')}
              </table>
            </td>
          </tr>

          <!-- Info note -->
          <tr>
            <td style="padding:0 40px 28px;">
              <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:6px;padding:14px 18px;">
                <p style="margin:0;color:#1d4ed8;font-size:13px;font-weight:600;">
                  📄 Your PDF receipt has been sent along with this email.<br/>
                  You can also download it anytime from the History page.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Flight Booking &amp; Reservation System &nbsp;•&nbsp; 24/7 Support Available<br/>
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
};

/**
 * Cancellation email HTML
 * @param {Object} params
 * @param {string} params.passengerName
 * @param {string} params.bookingReference
 * @param {string} params.airline
 * @param {string} params.flightNumber
 * @param {string} params.from
 * @param {string} params.to
 * @param {number} params.paidAmount
 * @param {number} params.refundAmount
 * @param {number} params.cancellationRate
 */
const cancellationEmail = ({
  passengerName,
  bookingReference,
  airline,
  flightNumber,
  from,
  to,
  paidAmount,
  refundAmount,
  cancellationRate,
}) => {
  const fmtPaid   = Number(paidAmount   || 0).toLocaleString('en-IN');
  const fmtRefund = Number(refundAmount || 0).toLocaleString('en-IN');
  const rate      = cancellationRate || 50;

  return {
    subject: `❌ Booking Cancelled — ${bookingReference}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Booking Cancelled</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;">
                ✈️ Flight Booking System
              </h1>
              <p style="color:#fecaca;margin:8px 0 0;font-size:14px;">Booking Cancellation</p>
            </td>
          </tr>

          <!-- Cancellation badge -->
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <div style="display:inline-block;background:#fee2e2;border:2px solid #dc2626;border-radius:50px;padding:10px 28px;">
                <span style="color:#b91c1c;font-weight:800;font-size:15px;">❌ Booking Cancelled</span>
              </div>
              <h2 style="color:#1e293b;font-size:22px;margin:20px 0 4px;">Hi ${passengerName || 'Passenger'},</h2>
              <p style="color:#64748b;font-size:15px;margin:0;">
                Your booking has been cancelled. Refund details are below.
              </p>
            </td>
          </tr>

          <!-- Cancellation details -->
          <tr>
            <td style="padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;">
                <tr>
                  <td colspan="2" style="background:#dc2626;padding:14px 20px;">
                    <span style="color:#ffffff;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:1px;">Cancellation Details</span>
                  </td>
                </tr>
                ${[
                  ['Booking Reference', `<strong style="color:#dc2626;font-size:16px;">${bookingReference || 'N/A'}</strong>`],
                  ['Passenger Name',    passengerName  || 'N/A'],
                  ['Flight',            `${airline || 'N/A'} · ${flightNumber || ''}`],
                  ['Route',             `${from || 'N/A'} → ${to || 'N/A'}`],
                  ['Amount Paid',       `₹${fmtPaid}`],
                  ['Refund Policy',     `${rate}% refund on cancellation`],
                  ['Refund Amount',     `<strong style="color:#16a34a;font-size:16px;">₹${fmtRefund}</strong>`],
                ].map(([label, value], i) => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="padding:12px 20px;color:#64748b;font-size:13px;font-weight:600;width:40%;background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">${label}</td>
                  <td style="padding:12px 20px;color:#1e293b;font-size:14px;background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">${value}</td>
                </tr>`).join('')}
              </table>
            </td>
          </tr>

          <!-- Refund note -->
          <tr>
            <td style="padding:0 40px 28px;">
              <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;padding:14px 18px;">
                <p style="margin:0;color:#15803d;font-size:13px;font-weight:600;">
                  💰 Your refund of ₹${fmtRefund} will be processed within 5–7 business days<br/>
                  to your original payment method.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Flight Booking &amp; Reservation System &nbsp;•&nbsp; 24/7 Support Available<br/>
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
};

module.exports = { paymentConfirmationEmail, cancellationEmail };