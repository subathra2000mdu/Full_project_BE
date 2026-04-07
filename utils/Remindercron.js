// utils/reminderCron.js
// Runs daily at 9 AM IST — finds bookings departing in next 24h — sends reminder emails
// Add to server.js: require('./utils/reminderCron');

const cron           = require('node-cron');
const Booking        = require('../models/Booking');
const sendBookingEmail = require('./emailService');

const sendFlightReminders = async () => {
  try {
    console.log('[Reminder] Running daily flight reminder job...');

    const now     = new Date();
    const in24h   = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const bookings = await Booking.find({
      paymentStatus: 'Completed',
    }).populate('flight');

    const upcoming = bookings.filter(b => {
      const dep = b.flight?.departureTime;
      if (!dep) return false;
      const d = new Date(dep);
      return d >= in24h && d <= in25h;
    });

    console.log(`[Reminder] Found ${upcoming.length} upcoming flights in next 24-25h`);

    for (const booking of upcoming) {
      const email = booking.passengerDetails?.email;
      if (!email) continue;

      // Build a reminder version — set paymentStatus label for template
      const reminderBooking = {
        ...booking.toObject(),
        paymentStatus: 'REMINDER',
      };

      sendBookingEmail(email, reminderBooking)
        .catch(e => console.error(`[Reminder] Email failed for ${email}:`, e.message));

      console.log(`[Reminder] Sent reminder to ${email} for flight ${booking.flight?.flightNumber}`);
    }
  } catch (err) {
    console.error('[Reminder] Cron error:', err.message);
  }
};

// Schedule: 9:00 AM IST daily (IST = UTC+5:30 → 03:30 UTC)
cron.schedule('30 3 * * *', sendFlightReminders, {
  timezone: 'Asia/Kolkata',
});

console.log('[Reminder] Flight reminder cron scheduled — daily at 9:00 AM IST');

module.exports = sendFlightReminders;