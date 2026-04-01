const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default; 
const Booking = require('../models/Booking');


exports.createBooking = async (req, res) => {
  try {
    const { flightId, passengerName, passengerEmail, seatPreference } = req.body;
    
    const FLIGHT_CAPACITY = 150; 
    const currentBookedCount = await Booking.countDocuments({ flight: flightId });
    if (currentBookedCount >= FLIGHT_CAPACITY) {
      return res.status(400).json({ 
        message: "Booking Failed: This flight has no more available seats." 
      });
    }

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


exports.getMyBookings = async (req, res) => {
  try {
    const history = await Booking.find({ user: req.user.id }).populate('flight');
    res.status(200).json(history);
  } catch (err) {
    res.status(500).json({ message: "Fetch Failed" });
  }
};


exports.cancelBooking = async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Booking Cancelled" });
  } catch (err) {
    res.status(500).json({ message: "Cancellation Failed" });
  }
};


exports.getBookingStats = async (req, res) => {
  try {
    const total = await Booking.countDocuments();
    res.status(200).json({ totalBookings: total });
  } catch (err) {
    res.status(500).json({ message: "Stats Failed" });
  }
};

exports.cancelBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;

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


exports.updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { passengerName, seatPreference } = req.body;

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

        doc.setFontSize(20);
        doc.text("FLIGHT ITINERARY", 105, 20, { align: "center" });

        const tableData = [
            ["Booking Ref", booking.bookingReference],
            ["Passenger", booking.passengerDetails.name],
            ["Airline", booking.flight.airline],
            ["Flight No", booking.flight.flightNumber],
            ["From", booking.flight.departureLocation],
            ["To", booking.flight.arrivalLocation],
            ["Status", booking.paymentStatus]
        ];

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