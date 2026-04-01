const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default; 
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


exports.downloadItinerary = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('flight');
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.text("FLIGHT ITINERARY", 105, 20, { align: "center" });

        // Data for the table
        const tableData = [
            ["Booking Ref", booking.bookingReference],
            ["Passenger", booking.passengerDetails.name],
            ["Airline", booking.flight.airline],
            ["Flight No", booking.flight.flightNumber],
            ["From", booking.flight.departureLocation],
            ["To", booking.flight.arrivalLocation],
            ["Status", booking.paymentStatus]
        ];

        // FIX: Use the autoTable variable directly on the doc instance
        autoTable(doc, {
            startY: 40,
            head: [['Description', 'Details']],
            body: tableData,
            theme: 'striped'
        });

        const pdfOutput = doc.output("arraybuffer");
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=itinerary.pdf`);
        res.send(Buffer.from(pdfOutput));

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "PDF Generation Failed", error: err.message });
    }
};