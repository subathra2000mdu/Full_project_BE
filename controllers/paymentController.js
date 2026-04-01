const Booking = require('../models/Booking');
const sendBookingEmail = require('../utils/emailService');


exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, bookingId } = req.body;

        const mockClientSecret = `pi_mock_${Math.random().toString(36).substring(7)}_secret_${bookingId}`;

        res.status(200).json({
            clientSecret: mockClientSecret,
            message: "Development Mode: Payment Intent Simulated Successfully",
            amount: amount
        });
    } catch (err) {
        res.status(500).json({ message: "Payment Simulation Failed", error: err.message });
    }
};


exports.confirmPaymentStatus = async (req, res) => {
    try {
        const { bookingId } = req.body;

        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { paymentStatus: 'Completed' },
            { new: true }
        ).populate('flight');

        if (!updatedBooking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.status(200).json({
            message: "Payment successful! Your booking is now confirmed.",
            booking: updatedBooking
        });
    } catch (err) {
        res.status(500).json({ message: "Confirmation Error", error: err.message });
    }
};

exports.confirmPaymentStatus = async (req, res) => {
    try {
        const { bookingId } = req.body;

        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { paymentStatus: 'Completed' },
            { new: true }
        ).populate('flight');

        if (!updatedBooking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        await sendBookingEmail(updatedBooking.passengerDetails.email, updatedBooking);

        res.status(200).json({
            message: "Payment successful and Confirmation Email Sent!",
            booking: updatedBooking
        });
    } catch (err) {
        res.status(500).json({ message: "Confirmation Error", error: err.message });
    }
};