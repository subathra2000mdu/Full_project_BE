const nodemailer = require('nodemailer');

const createTransporter = () =>
  nodemailer.createTransport({
    // Use direct IP to skip DNS lookup time
    host: '74.125.20.108', 
    port: 465,
    secure: true,
    // Disable pooling for faster one-off delivery on Render
    pool: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Optimized timeouts: 30s is plenty if the IP is correct
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 45000,
    family: 4, 
    tls: {
      rejectUnauthorized: false,
      servername: 'smtp.gmail.com',
    },
  });

// Simple HTML Builder to keep the payload light
const buildEmailHTML = (booking) => {
  const ref = booking.bookingReference || 'N/A';
  const passenger = booking.passengerDetails?.name || 'Passenger';
  
  return `
    <div style="font-family: Arial; padding: 20px; border: 1px solid #eee;">
      <h2 style="color: #2563eb;">Booking Confirmed!</h2>
      <p>Dear ${passenger}, your flight <b>#${ref}</b> is confirmed.</p>
      <p><b>Airline:</b> ${booking.flight?.airline || 'N/A'}</p>
      <p><b>Route:</b> ${booking.flight?.departureLocation} to ${booking.flight?.arrivalLocation}</p>
      <hr />
      <p style="font-size: 12px; color: #666;">Thank you for booking with us.</p>
    </div>
  `;
};

const sendBookingEmail = async (toEmail, booking) => {
  if (!toEmail || !process.env.EMAIL_USER) return;

  const mailOptions = {
    from: `"Flight Booking" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Confirmed: #${booking.bookingReference || 'Flight'}`,
    html: buildEmailHTML(booking),
  };

  const transporter = createTransporter();
  
  try {
    // We don't use retry logic here to prevent "queueing" lag
    await transporter.sendMail(mailOptions);
    console.log(`✅ [Email Service] Delivered to ${toEmail}`);
  } catch (err) {
    console.error(`❌ [Email Service] Error: ${err.message}`);
  } finally {
    transporter.close(); // Force close the connection immediately
  }
};

module.exports = sendBookingEmail;