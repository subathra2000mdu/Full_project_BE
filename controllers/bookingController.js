// controllers/bookingController.js
// Requires emailService from:  ../utils/emailService
// Email is sent when paymentStatus is set to 'Cancelled' via PATCH /update/:id

const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default; // patches jsPDF prototype → call doc.autoTable()
const Booking          = require('../models/Booking');
const Flight           = require('../models/Flight');
const sendBookingEmail = require('../utils/emailService'); // ← correct path

const generateBookingRef = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// ── POST /reserve ─────────────────────────────────────────────────────────────
const createBooking = async (req, res) => {
  try {
    const {
      flightId,
      passengerDetails,
      passengerName,
      passengerEmail,
      passengers,
      seatPreference,
      bookingClass,
    } = req.body;

    const userId     = req.user?.id || req.user?._id;
    const finalName  = passengerName  || passengerDetails?.name;
    const finalEmail = passengerEmail || passengerDetails?.email;

    if (!flightId) {
      return res.status(400).json({ message: 'Flight ID is required' });
    }
    if (!finalName || !finalEmail) {
      return res.status(400).json({
        message:  'Passenger name and email are required',
        received: { finalName, finalEmail },
      });
    }

    const flight = await Flight.findById(flightId);
    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    const requestedSeats = Number(passengers) || 1;
    if (flight.seatsAvailable < requestedSeats) {
      return res.status(400).json({ message: 'Not enough seats available' });
    }

    flight.seatsAvailable = Math.max(0, flight.seatsAvailable - requestedSeats);
    await flight.save();

    const booking = await Booking.create({
      user:   userId,
      flight: flightId,
      passengerDetails: {
        name:  finalName.trim(),
        email: finalEmail.trim().toLowerCase(),
      },
      passengers:       requestedSeats,
      seatPreference:   seatPreference || 'Window',
      bookingClass:     bookingClass   || 'Economy',
      bookingReference: generateBookingRef(),
      paymentStatus:    'Pending',
    });

    await booking.populate('flight');

    return res.status(201).json({
      message:   'Booking reserved successfully',
      itinerary: booking,
    });

  } catch (err) {
    console.error('[createBooking Error]:', err.message);
    return res.status(500).json({
      message: 'Internal Server Error during reservation',
      error:   err.message,
    });
  }
};

// ── PATCH /update/:id ─────────────────────────────────────────────────────────
// Called for:
//   - paymentStatus: 'Completed'  → from paymentController after payment confirm
//   - paymentStatus: 'Cancelled'  → from HomePage Cancel Ticket button
// Email is sent for BOTH statuses via utils/emailService.js
const updateBooking = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('flight');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Send cancellation email (fire-and-forget — never blocks response)
    const recipientEmail = booking.passengerDetails?.email;
    if (recipientEmail && (paymentStatus === 'Completed' || paymentStatus === 'Cancelled')) {
      sendBookingEmail(recipientEmail, booking)
        .catch(err => console.error('[email] fire-and-forget error:', err.message));
    }

    return res.status(200).json({
      message:        `Update successful. Email queued for: ${paymentStatus}`,
      updatedBooking: booking,
    });

  } catch (err) {
    console.error('[updateBooking Error]:', err.message);
    return res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

// ── GET /my-history ───────────────────────────────────────────────────────────
const getMyBookings = async (req, res) => {
  try {
    const userId   = req.user?.id || req.user?._id;
    const bookings = await Booking
      .find({ user: userId })
      .populate('flight')
      .sort({ createdAt: -1 });
    return res.status(200).json(bookings);
  } catch (err) {
    return res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

// ── DELETE /cancel/:id ────────────────────────────────────────────────────────
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    return res.status(200).json({ message: 'Cancelled successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Cancel failed', error: err.message });
  }
};

// ── Stats ─────────────────────────────────────────────────────────────────────
const getBookingStats = async (req, res) => {
  try {
    const total = await Booking.countDocuments();
    return res.status(200).json({ totalBookings: total });
  } catch (err) {
    return res.status(500).json({ message: 'Stats failed', error: err.message });
  }
};

const downloadItinerary = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('flight');
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.setTextColor(40, 116, 240); 
        doc.text("FLIGHT ITINERARY", 105, 20, { align: "center" });
        
        // FIX: Removed the ["---", "---"] lines to clean up the PDF
        const tableData = [
            ["Booking Ref", booking.bookingReference || "N/A"],
            ["Passenger", booking.passengerDetails?.name || "N/A"],
            ["Airline", booking.flight?.airline || "N/A"],
            ["Flight No", booking.flight?.flightNumber || "N/A"],
            ["From", booking.flight?.departureLocation || "N/A"],
            ["To", booking.flight?.arrivalLocation || "N/A"],
            ["Fare Amount", `INR ${booking.flight?.price || "0"}`],
            ["Payment Status", (booking.paymentStatus || "Pending").toUpperCase()],
            // FIX: Use new Date() to ensure "today's date" is always valid
            ["Confirmed On", new Date().toLocaleDateString('en-GB')] 
        ];

        autoTable(doc, {
            startY: 40,
            head: [['Description', 'Details']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 123, 255] },
            styles: { fontSize: 12, cellPadding: 5 }
        });

        const pdfOutput = doc.output("arraybuffer");
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=itinerary_${booking.bookingReference}.pdf`);
        res.send(Buffer.from(pdfOutput));

    } catch (err) {
        console.error("PDF Generation Error:", err);
        res.status(500).json({ message: "PDF Generation Failed" });
    }
};

module.exports = {
  createBooking,
  getMyBookings,
  cancelBooking,
  updateBooking,
  downloadItinerary,
  getBookingStats,
};