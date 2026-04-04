// controllers/bookingController.js
//
// KEY FIXES:
//   1. updateBooking now sends email for BOTH 'Completed' AND 'Cancelled' status
//   2. Email is fired non-blocking (fire-and-forget with .catch) so a failed
//      email never blocks or crashes the API response
//   3. History log created on cancellation so Activity Logs show it
//   4. downloadItinerary uses today's date (reliable) not stored booking date

const { jsPDF }        = require("jspdf");
const autoTable        = require("jspdf-autotable").default;
const Booking          = require('../models/Booking');
const History          = require('../models/History');
const sendBookingEmail = require('../utils/emailService');

// ── Create / Reserve Booking ──────────────────────────────────────────────────
exports.createBooking = async (req, res) => {
  try {
    const { flightId, passengerName, passengerEmail, seatPreference } = req.body;

    const newBooking = new Booking({
      user:  req.user.id,
      flight: flightId,
      passengerDetails: {
        name:  passengerName  || req.user.name,
        email: passengerEmail || req.user.email,
      },
      seatPreference,
    });

    await newBooking.save();

    await History.create({
      userId:    req.user.id,
      bookingId: newBooking._id,
      action:    'Created',
      details:   { status: 'Pending' },
    });

    const confirmed = await Booking.findById(newBooking._id).populate('flight');
    res.status(201).json({ message: "Reservation Successful", itinerary: confirmed });

  } catch (err) {
    console.error("Create Booking Error:", err);
    res.status(400).json({ message: "Booking Failed", error: err.message });
  }
};

// ── Update Booking Status + Send Email ────────────────────────────────────────
// Called for BOTH payment confirmation (Completed) and cancellation (Cancelled).
// Email is fired non-blocking so a transient SMTP failure never affects
// the HTTP response the frontend is waiting for.
exports.updateBooking = async (req, res) => {
  try {
    const { id }            = req.params;
    const { paymentStatus } = req.body;

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { paymentStatus },
      { new: true }
    ).populate('flight');

    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // ── Log the status change to History ──────────────────────────────────────
    await History.create({
      userId:    req.user?.id || updatedBooking.user,
      bookingId: updatedBooking._id,
      action:    paymentStatus === 'Cancelled' ? 'Cancelled' : 'Updated',
      details:   { status: paymentStatus },
    }).catch(err => console.warn('History log failed:', err.message));
    // .catch so a failed history write never blocks the response

    // ── Send email for BOTH Completed AND Cancelled ───────────────────────────
    const recipientEmail =
      updatedBooking.passengerDetails?.email ||
      req.user?.email;

    if (recipientEmail) {
      // Fire-and-forget: non-blocking, errors logged but don't throw
      sendBookingEmail(recipientEmail, updatedBooking)
        .catch(err => console.error('[email] fire-and-forget error:', err.message));
    } else {
      console.warn('[email] No recipient email found for booking:', id);
    }

    res.status(200).json({
      message:        `Update successful. Email queued for status: ${paymentStatus}`,
      updatedBooking,
    });

  } catch (err) {
    console.error("Update Booking Error:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};

// ── Get My Bookings ───────────────────────────────────────────────────────────
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking
      .find({ user: req.user.id })
      .populate('flight')
      .sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (err) {
    console.error("Get Bookings Error:", err);
    res.status(500).json({ message: "Fetch Failed", error: err.message });
  }
};

// ── Cancel Booking (hard delete) ──────────────────────────────────────────────
exports.cancelBooking = async (req, res) => {
  try {
    const bookingId      = req.params.id;
    const deletedBooking = await Booking.findByIdAndDelete(bookingId);
    if (!deletedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.status(200).json({
      message:     "Booking cancelled successfully",
      cancelledId: bookingId,
    });
  } catch (err) {
    console.error("Cancel Booking Error:", err);
    res.status(500).json({ message: "Cancellation Failed", error: err.message });
  }
};

// ── Booking Stats ─────────────────────────────────────────────────────────────
exports.getBookingStats = async (req, res) => {
  try {
    const total = await Booking.countDocuments();
    res.status(200).json({ totalBookings: total });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ message: "Stats Failed", error: err.message });
  }
};

// ── Download PDF Itinerary ────────────────────────────────────────────────────
exports.downloadItinerary = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('flight');
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const doc = new jsPDF();

    // Header blue bar
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text("FLIGHT ITINERARY", 105, 18, { align: "center" });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text("Flight Booking & Reservation System", 105, 30, { align: "center" });

    // Booking reference badge
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(14, 48, 182, 14, 4, 4, 'F');
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Booking Reference: ${booking.bookingReference || booking._id.toString().slice(-8).toUpperCase()}`,
      105, 57, { align: "center" }
    );

    // Table data
    const tableData = [
      ["Passenger Name",  booking.passengerDetails?.name          || "N/A"],
      ["Passenger Email", booking.passengerDetails?.email         || "N/A"],
      ["Airline",         booking.flight?.airline                  || "N/A"],
      ["Flight No",       booking.flight?.flightNumber             || "N/A"],
      ["From",            booking.flight?.departureLocation        || "N/A"],
      ["To",              booking.flight?.arrivalLocation          || "N/A"],
      ["Fare Amount",     `INR ${Number(booking.flight?.price || 0).toLocaleString('en-IN')}`],
      ["Seat Preference", booking.seatPreference                   || "N/A"],
      ["Payment Status",  (booking.paymentStatus || "Pending").toUpperCase()],
      // Always use today — the date the PDF was generated
      ["Confirmed On",    new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      })],
    ];

    autoTable(doc, {
      startY:     70,
      head:       [["Description", "Details"]],
      body:       tableData,
      theme:      "striped",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontSize:  12,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize:    11,
        cellPadding: 6,
      },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
    });

    // Footer note
    const finalY = doc.lastAutoTable?.finalY || 170;
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.text(
      "This is a computer-generated document. No signature is required.",
      105, finalY + 16, { align: "center" }
    );

    // Send PDF response
    const pdfOutput = doc.output("arraybuffer");
    const filename  = `itinerary_${booking.bookingReference || booking._id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfOutput.byteLength);
    res.send(Buffer.from(pdfOutput));

  } catch (err) {
    console.error("PDF Generation Error:", err);
    res.status(500).json({ message: "PDF Generation Failed", error: err.message });
  }
};