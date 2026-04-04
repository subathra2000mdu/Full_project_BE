
const paymentConfirmationEmail = ({
  passengerName, bookingReference, airline, flightNumber,
  from, to, departureTime, amount, seatPreference,
}) => {
  const fmtAmount = Number(amount || 0).toLocaleString('en-IN');
  const fmtDate   = departureTime
    ? new Date(departureTime).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Kolkata',
      })
    : 'N/A';

  const rows = [
    ['Booking Reference', `<strong style="color:#1d4ed8;font-size:15px;">${bookingReference || 'N/A'}</strong>`],
    ['Passenger Name',    passengerName  || 'N/A'],
    ['Airline',           `${airline || 'N/A'} - ${flightNumber || ''}`],
    ['Route',             `${from || 'N/A'} to ${to || 'N/A'}`],
    ['Departure',         fmtDate],
    ['Seat Preference',   seatPreference || 'N/A'],
    ['Amount Paid',       `<strong style="color:#16a34a;font-size:15px;">Rs. ${fmtAmount}</strong>`],
  ].map(([label, val], i) => `
    <tr>
      <td style="padding:10px 18px;background:${i%2===0?'#f8fafc':'#fff'};color:#64748b;font-size:13px;font-weight:600;width:42%;">${label}</td>
      <td style="padding:10px 18px;background:${i%2===0?'#f8fafc':'#fff'};color:#1e293b;font-size:14px;">${val}</td>
    </tr>`).join('');

  return {
    subject: `Booking Confirmed - ${bookingReference}`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#1d4ed8;padding:30px 40px;text-align:center;">
  <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Flight Booking System</h1>
  <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">Booking Confirmation</p>
</td></tr>
<tr><td style="padding:28px 40px 0;text-align:center;">
  <div style="background:#dcfce7;border:2px solid #16a34a;border-radius:40px;display:inline-block;padding:8px 22px;">
    <span style="color:#15803d;font-weight:800;font-size:14px;">Payment Successful</span>
  </div>
  <h2 style="color:#1e293b;font-size:20px;margin:16px 0 4px;">Hi ${passengerName || 'Passenger'},</h2>
  <p style="color:#64748b;margin:0;font-size:14px;">Your flight has been booked and confirmed!</p>
</td></tr>
<tr><td style="padding:22px 40px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
    <tr><td colspan="2" style="background:#1d4ed8;padding:12px 18px;">
      <span style="color:#fff;font-weight:700;font-size:13px;letter-spacing:1px;">BOOKING DETAILS</span>
    </td></tr>
    ${rows}
  </table>
</td></tr>
<tr><td style="padding:0 40px 22px;">
  <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:6px;padding:12px 16px;">
    <p style="margin:0;color:#1d4ed8;font-size:13px;font-weight:600;">
      Your PDF receipt can be downloaded anytime from the History page.
    </p>
  </div>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
  <p style="color:#94a3b8;font-size:12px;margin:0;">Flight Booking and Reservation System | 24/7 Support<br/>This is an automated message. Please do not reply.</p>
</td></tr>
</table></td></tr></table>
</body></html>`,
  };
};

const cancellationEmail = ({
  passengerName, bookingReference, airline, flightNumber,
  from, to, paidAmount, refundAmount, cancellationRate,
}) => {
  const fmtPaid   = Number(paidAmount   || 0).toLocaleString('en-IN');
  const fmtRefund = Number(refundAmount || 0).toLocaleString('en-IN');
  const rate      = cancellationRate || 50;

  const rows = [
    ['Booking Reference', `<strong style="color:#dc2626;font-size:15px;">${bookingReference || 'N/A'}</strong>`],
    ['Passenger Name',    passengerName  || 'N/A'],
    ['Flight',            `${airline || 'N/A'} - ${flightNumber || ''}`],
    ['Route',             `${from || 'N/A'} to ${to || 'N/A'}`],
    ['Amount Paid',       `Rs. ${fmtPaid}`],
    ['Refund Policy',     `${rate}% refund on cancellation`],
    ['Refund Amount',     `<strong style="color:#16a34a;font-size:15px;">Rs. ${fmtRefund}</strong>`],
  ].map(([label, val], i) => `
    <tr>
      <td style="padding:10px 18px;background:${i%2===0?'#f8fafc':'#fff'};color:#64748b;font-size:13px;font-weight:600;width:42%;">${label}</td>
      <td style="padding:10px 18px;background:${i%2===0?'#f8fafc':'#fff'};color:#1e293b;font-size:14px;">${val}</td>
    </tr>`).join('');

  return {
    subject: `Booking Cancelled - ${bookingReference}`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#dc2626;padding:30px 40px;text-align:center;">
  <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Flight Booking System</h1>
  <p style="color:#fecaca;margin:6px 0 0;font-size:13px;">Booking Cancellation</p>
</td></tr>
<tr><td style="padding:28px 40px 0;text-align:center;">
  <div style="background:#fee2e2;border:2px solid #dc2626;border-radius:40px;display:inline-block;padding:8px 22px;">
    <span style="color:#b91c1c;font-weight:800;font-size:14px;">Booking Cancelled</span>
  </div>
  <h2 style="color:#1e293b;font-size:20px;margin:16px 0 4px;">Hi ${passengerName || 'Passenger'},</h2>
  <p style="color:#64748b;margin:0;font-size:14px;">Your booking has been cancelled. Refund details are below.</p>
</td></tr>
<tr><td style="padding:22px 40px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;">
    <tr><td colspan="2" style="background:#dc2626;padding:12px 18px;">
      <span style="color:#fff;font-weight:700;font-size:13px;letter-spacing:1px;">CANCELLATION DETAILS</span>
    </td></tr>
    ${rows}
  </table>
</td></tr>
<tr><td style="padding:0 40px 22px;">
  <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;padding:12px 16px;">
    <p style="margin:0;color:#15803d;font-size:13px;font-weight:600;">
      Your refund of Rs. ${fmtRefund} will be processed within 5 to 7 business days.
    </p>
  </div>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
  <p style="color:#94a3b8;font-size:12px;margin:0;">Flight Booking and Reservation System | 24/7 Support<br/>This is an automated message. Please do not reply.</p>
</td></tr>
</table></td></tr></table>
</body></html>`,
  };
};

module.exports = { paymentConfirmationEmail, cancellationEmail };

