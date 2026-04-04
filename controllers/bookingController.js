// controllers/bookingController.js
// Requires emailService from:  ../utils/emailService
// Email is sent when paymentStatus is set to 'Cancelled' via PATCH /update/:id

const { jsPDF }        = require('jspdf');
const autoTable        = require('jspdf-autotable'); // patches jsPDF prototype → call doc.autoTable()
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

// ── GET /download/:id  — PDF receipt ─────────────────────────────────────────
// FIX: original code called autoTable(doc,...) as standalone function → undefined → 500
// jspdf-autotable patches jsPDF prototype, so use doc.autoTable() instead
const downloadItinerary = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('flight');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const doc = new jsPDF();

    // Blue header bar
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('FLIGHT ITINERARY', 105, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Flight Booking & Reservation System', 105, 30, { align: 'center' });

    // Booking reference badge
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(14, 48, 182, 14, 4, 4, 'F');
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Booking Reference: ${booking.bookingReference || booking._id.toString().slice(-8).toUpperCase()}`,
      105, 57, { align: 'center' }
    );

    const tableData = [
      ['Passenger Name',  booking.passengerDetails?.name           || 'N/A'],
      ['Passenger Email', booking.passengerDetails?.email          || 'N/A'],
      ['Airline',         booking.flight?.airline                   || 'N/A'],
      ['Flight No',       booking.flight?.flightNumber              || 'N/A'],
      ['From',            booking.flight?.departureLocation         || 'N/A'],
      ['To',              booking.flight?.arrivalLocation           || 'N/A'],
      ['Fare Amount',     `INR ${Number(booking.flight?.price || 0).toLocaleString('en-IN')}`],
      ['Seat Preference', booking.seatPreference                    || 'N/A'],
      ['Payment Status',  (booking.paymentStatus || 'Pending').toUpperCase()],
      ['Confirmed On',    new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      })],
    ];

    // ✅ Correct call: doc.autoTable() — NOT autoTable(doc, ...)
    doc.autoTable({
      startY:     70,
      head:       [['Description', 'Details']],
      body:       tableData,
      theme:      'striped',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontSize:  12,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize:    11,
        cellPadding: 6,
      },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
    });

    const finalY = doc.lastAutoTable?.finalY || 170;
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'This is a computer-generated document. No signature is required.',
      105, finalY + 16, { align: 'center' }
    );

    const pdfOutput = doc.output('arraybuffer');
    const filename  = `itinerary_${booking.bookingReference || booking._id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfOutput.byteLength);
    res.send(Buffer.from(pdfOutput));

  } catch (err) {
    console.error('[PDF Generation Error]:', err.message, err.stack);
    res.status(500).json({ message: 'PDF Generation Failed', error: err.message });
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