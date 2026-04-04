const nodemailer = require('nodemailer');
const dns = require('dns');

// Force DNS to resolve to IPv4 only - This is the standard fix for Render's network
dns.setDefaultResultOrder('ipv4first');

const sendBookingEmail = async (toEmail, booking) => {
  if (!toEmail || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Email credentials missing');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    // Forces the connection to use IPv4 directly in the socket
    family: 4, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Increased timeouts to handle Render free tier slowness
    connectionTimeout: 40000, 
    greetingTimeout: 40000,
    socketTimeout: 60000,
    tls: {
      rejectUnauthorized: false,
      servername: 'smtp.gmail.com'
    }
  });

  const ref = booking.bookingReference || booking._id?.toString().slice(-8).toUpperCase() || 'N/A';
  const passenger = booking.passengerDetails?.name || 'Passenger';

  const mailOptions = {
    from: `"Flight Booking System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Booking Confirmation - #${ref}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Flight Booking Confirmed!</h2>
        <p>Hi <b>${passenger}</b>,</p>
        <p>Your booking <b>#${ref}</b> has been successfully processed and completed.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><b>Airline:</b> ${booking.flight?.airline || 'N/A'}</p>
          <p style="margin: 5px 0;"><b>Flight No:</b> ${booking.flight?.flightNumber || 'N/A'}</p>
          <p style="margin: 5px 0;"><b>Route:</b> ${booking.flight?.departureLocation} to ${booking.flight?.arrivalLocation}</p>
          <p style="margin: 5px 0;"><b>Status:</b> COMPLETED</p>
        </div>
        <p style="font-size: 12px; color: #777;">This is a computer-generated document. No signature is required.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ [Email Service] Success: Sent to ${toEmail}`);
  } catch (err) {
    // This logs the specific error for debugging in Render
    console.error(`❌ [Email Service] Final Error: ${err.message}`);
  } finally {
    transporter.close();
  }
};

module.exports = sendBookingEmail;