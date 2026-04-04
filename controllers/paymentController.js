const Booking          = require('../models/Booking');
const sendBookingEmail = require('../utils/emailService');

exports.createPaymentIntent = async (req, res) => {
  try {
    const { bookingId, amount, currency, paymentMethod } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ message: 'bookingId and amount are required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const clientSecret = `pi_${Math.random().toString(36).substring(2)}_secret_${Date.now()}`;

    console.log(`[PaymentIntent] Created for booking ${bookingId} | Amount: ${amount} ${currency || 'INR'}`);

    return res.status(200).json({
      clientSecret,
      bookingId,
      amount,
      currency:      currency      || 'INR',
      paymentMethod: paymentMethod || 'card',
      status:        'requires_confirmation',
    });

  } catch (err) {
    console.error('[createPaymentIntent Error]:', err.message);
    return res.status(500).json({ message: 'Failed to create payment intent', error: err.message });
  }
};


exports.confirmPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId is required' });
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { paymentStatus: 'Completed' },
      { new: true }
    ).populate('flight');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const recipientEmail = booking.passengerDetails?.email;
    if (recipientEmail) {
      sendBookingEmail(recipientEmail, booking)
        .catch(err => console.error('[email] confirm error:', err.message));
    }

    console.log(`[PaymentConfirm] Booking ${bookingId} → Completed. Email queued to ${recipientEmail}`);

    return res.status(200).json({
      message: 'Payment confirmed successfully. Booking confirmation email sent.',
      booking,
    });

  } catch (err) {
    console.error('[confirmPayment Error]:', err.message);
    return res.status(500).json({ message: 'Payment confirmation failed', error: err.message });
  }
};
