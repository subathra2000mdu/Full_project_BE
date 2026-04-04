const Booking   = require('../models/Booking');
const sendEmail = require('../utils/sendEmail');
const { paymentConfirmationEmail } = require('../utils/emailTemplates');

const generateRef = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// POST /api/payments/create-intent
const createPaymentIntent = async (req, res) => {
  try {
    const { bookingId, amount, currency, paymentMethod } = req.body;

    if (!bookingId) return res.status(400).json({ message: 'bookingId is required' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const clientSecret = `pi_${generateRef()}_secret_${generateRef()}`;

    return res.status(200).json({
      clientSecret,
      amount:   amount   || booking.flight?.price || 0,
      currency: currency || 'INR',
      paymentMethod,
      message:  'Payment intent created successfully',
    });
  } catch (err) {
    console.error('[createPaymentIntent]', err.message);
    return res.status(500).json({ message: 'Failed to create payment intent', error: err.message });
  }
};

// POST /api/payments/confirm
const confirmPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ message: 'bookingId is required' });

    const booking = await Booking.findById(bookingId).populate('flight');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.paymentStatus = 'Completed';
    await booking.save();

    console.log(`[confirmPayment] Booking ${bookingId} marked Completed`);

    // Send confirmation email (non-blocking)
    const passengerEmail = booking.passengerDetails?.email;
    if (passengerEmail) {
      const { subject, html } = paymentConfirmationEmail({
        passengerName:    booking.passengerDetails?.name    || 'Passenger',
        bookingReference: booking.bookingReference          || booking._id.toString().slice(-8).toUpperCase(),
        airline:          booking.flight?.airline           || 'N/A',
        flightNumber:     booking.flight?.flightNumber      || 'N/A',
        from:             booking.flight?.departureLocation || 'N/A',
        to:               booking.flight?.arrivalLocation   || 'N/A',
        departureTime:    booking.flight?.departureTime     || null,
        amount:           booking.flight?.price             || 0,
        seatPreference:   booking.seatPreference            || 'N/A',
      });

      sendEmail({ to: passengerEmail, subject, html })
        .then(() => console.log(`[confirmPayment] Confirmation email sent to ${passengerEmail}`))
        .catch(e  => console.error(`[confirmPayment] Email error: ${e.message}`));
    } else {
      console.warn('[confirmPayment] No passenger email found — skipping email.');
    }

    return res.status(200).json({
      message: 'Payment confirmed successfully! Booking confirmation email sent.',
      booking,
    });
  } catch (err) {
    console.error('[confirmPayment]', err.message);
    return res.status(500).json({ message: 'Payment confirmation failed', error: err.message });
  }
};

module.exports = { createPaymentIntent, confirmPayment };
