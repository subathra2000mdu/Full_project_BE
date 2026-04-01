const Booking = require('../models/Booking');

// 1. Simulate Creating a Payment Intent
exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, bookingId } = req.body;

        // Instead of calling Stripe API, we generate a fake secret
        // This bypasses the need for a real STRIPE_SECRET_KEY
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

// 2. Confirm Payment & Update Database
exports.confirmPaymentStatus = async (req, res) => {
    try {
        const { bookingId } = req.body;

        // In a real app, we'd verify the ID with Stripe here.
        // For your project, we immediately update the status to 'Completed'
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