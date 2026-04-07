const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const sendEmail = require('../utils//sendEmail');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, bookingId } = req.body;
    const options = {
      amount: Math.round(amount * 100), 
      currency: "INR",
      receipt: `receipt_${bookingId}`,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    res.status(500).json({ message: "Order Creation Failed" });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      { paymentStatus: 'Completed', razorpayOrderId: razorpay_order_id },
      { new: true }
    ).populate('flight');

    
    if (updatedBooking?.passengerDetails?.email) {
      await sendEmail({
        to: updatedBooking.passengerDetails.email,
        subject: "Flight Booking Confirmed",
        text: `Your flight ${updatedBooking.flight.flightNumber} is confirmed. Enjoy your trip!`
      });
    }

    res.status(200).json({ message: 'Success', booking: updatedBooking });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};