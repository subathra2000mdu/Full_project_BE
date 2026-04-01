const Booking = require('../models/Booking');

// 1. Create Reservation
exports.createBooking = async (req, res) => {
  try {
    const { flightId, passengerName, passengerEmail, seatPreference } = req.body;

    const newBooking = new Booking({
      user: req.user.id,
      flight: flightId,
      passengerDetails: {
        name: passengerName || req.user.name,
        email: passengerEmail || req.user.email
      },
      seatPreference
    });

    await newBooking.save();
    const confirmed = await Booking.findById(newBooking._id).populate('flight');

    res.status(201).json({ message: "Reservation Successful", itinerary: confirmed });
  } catch (err) {
    res.status(400).json({ message: "Booking Failed", error: err.message });
  }
};

// 2. Get User History (Renamed to match router)
exports.getMyBookings = async (req, res) => {
  try {
    const history = await Booking.find({ user: req.user.id }).populate('flight');
    res.status(200).json(history);
  } catch (err) {
    res.status(500).json({ message: "Fetch Failed" });
  }
};

// 3. Cancel Booking
exports.cancelBooking = async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Booking Cancelled" });
  } catch (err) {
    res.status(500).json({ message: "Cancellation Failed" });
  }
};

// 4. Admin Stats
exports.getBookingStats = async (req, res) => {
  try {
    const total = await Booking.countDocuments();
    res.status(200).json({ totalBookings: total });
  } catch (err) {
    res.status(500).json({ message: "Stats Failed" });
  }
};

// controllers/bookingController.js

exports.cancelBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;

        // Find the booking and delete it
        const deletedBooking = await Booking.findByIdAndDelete(bookingId);

        if (!deletedBooking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.status(200).json({ 
            message: "Booking cancelled successfully", 
            cancelledId: bookingId 
        });
    } catch (err) {
        res.status(500).json({ 
            message: "Cancellation Failed", 
            error: err.message 
        });
    }
};
// Add this to your existing bookingController.js
exports.updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { passengerName, seatPreference } = req.body;

        // Find the booking and update only the provided fields
        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            { 
                "passengerDetails.name": passengerName, 
                seatPreference 
            },
            { new: true, runValidators: true }
        ).populate('flight');

        if (!updatedBooking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.status(200).json({
            message: "Booking updated successfully",
            updatedBooking
        });
    } catch (err) {
        res.status(500).json({ message: "Update failed", error: err.message });
    }
};