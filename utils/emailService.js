const nodemailer = require('nodemailer');

const sendBookingEmail = async (toEmail, booking) => {
  if (!toEmail || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Email credentials missing');
    return;
  }

  // 1. Use a simplified transporter 
  // We use Port 465 with a very specific configuration to speed up the initial 'Hello'
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Forces IPv4 and increases the 'Greeting' time so it doesn't timeout early
    family: 4,
    greetingTimeout: 30000, 
    connectionTimeout: 30000,
    socketTimeout: 45000,
    debug: true, // This will show more info in your Render logs if it fails
    tls: {
      rejectUnauthorized: false,
      servername: 'smtp.gmail.com'
    }
  });

  const ref = booking.bookingReference || 'N/A';
  const passenger = booking.passengerDetails?.name || 'Passenger';

  const mailOptions = {
    from: `"Flight Booking" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Booking Confirmation - #${ref}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">Flight Confirmed!</h2>
        <p>Hi ${passenger},</p>
        <p>Your booking <b>#${ref}</b> has been successfully processed.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #777;">Thank you for choosing our service.</p>
      </div>
    `,
  };

  try {
    // We do NOT use 'await' in the controller, but we use it here to track the log
    await transporter.sendMail(mailOptions);
    console.log(`✅ [Email Service] Success: Sent to ${toEmail}`);
  } catch (err) {
    console.error(`❌ [Email Service] Final Error: ${err.message}`);
  } finally {
    transporter.close();
  }
};

module.exports = sendBookingEmail;