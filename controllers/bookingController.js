// controllers/bookingController.js
// ─────────────────────────────────────────────────────────────────────────────
// Handles all booking operations:
//   POST   /api/auth/bookings/reserve        — create new booking
//   GET    /api/auth/bookings/my-history      — get user's bookings
//   PATCH  /api/bookings/update/:id           — update booking (cancel)
//   GET    /api/bookings/download/:id         — download PDF receipt
//   DELETE /api/bookings/delete/:id           — delete a booking
// ─────────────────────────────────────────────────────────────────────────────

const Booking      = require('../models/Booking');
const Flight       = require('../models/Flight');
const ActivityLog  = require('../models/ActivityLog');
const sendEmail    = require('../utils/sendEmail');
const { cancellationEmail } = require('../utils/emailTemplates');

// jsPDF for PDF generation
const { jsPDF }     = require('jspdf');
require('jspdf-autotable');

// ── Helper: generate booking reference ──────────────────────────────────────
const generateBookingRef = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/bookings/reserve
// ────────────────────────────────────────────────────────────────────────────
const reserveFlight = async (req, res) => {
  try {
    const { flightId, passengerDetails, seatPreference, passengers, bookingClass } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!flightId || !passengerDetails?.name || !passengerDetails?.email) {
      return res.status(400).json({ message: 'flightId, passenger name and email are required' });
    }

    const flight = await Flight.findById(flightId);
    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }
    if (flight.seatsAvailable < 1) {
      return res.status(400).json({ message: 'No seats available on this flight' });
    }

    // Decrement seat count
    flight.seatsAvailable = Math.max(0, flight.seatsAvailable - (passengers || 1));
    await flight.save();

    const booking = await Booking.create({
      user:             userId,
      flight:           flightId,
      passengerDetails: {
        name:  passengerDetails.name.trim(),
        email: passengerDetails.email.trim().toLowerCase(),
      },
      seatPreference:   seatPreference || 'Window',
      passengers:       passengers     || 1,
      bookingClass:     bookingClass   || 'Economy',
      paymentStatus:    'Pending',
      bookingReference: generateBookingRef(),
    });

    // Populate flight for the response
    await booking.populate('flight');

    // Log activity
    await ActivityLog.create({
      userId:    userId,
      bookingId: booking._id,
      action:    'Created',
      details: {
        passengerName: passengerDetails.name,
        flightNumber:  flight.flightNumber,
        status:        'Pending',
      },
    }).catch(e => console.warn('[reserveFlight] ActivityLog error:', e.message));

    return res.status(201).json(booking);
  } catch (err) {
    console.error('[reserveFlight] Error:', err.message);
    return res.status(500).json({ message: 'Reservation failed', error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/auth/bookings/my-history
// ────────────────────────────────────────────────────────────────────────────
const getMyHistory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const bookings = await Booking.find({ user: userId })
      .populate('flight')
      .sort({ createdAt: -1 });

    return res.status(200).json(bookings);
  } catch (err) {
    console.error('[getMyHistory] Error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch history', error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/update/:id
// Used for cancellation — sends cancellation email
// ────────────────────────────────────────────────────────────────────────────
const updateBooking = async (req, res) => {
  try {
    const { id }            = req.params;
    const { paymentStatus } = req.body;

    const booking = await Booking.findById(id).populate('flight');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const previousStatus = booking.paymentStatus;
    booking.paymentStatus = paymentStatus || booking.paymentStatus;
    await booking.save();

    console.log(`[updateBooking] Booking ${id} status: ${previousStatus} → ${booking.paymentStatus}`);

    // ── If this update is a CANCELLATION, send cancellation email ───────────
    if (paymentStatus === 'Cancelled' && previousStatus !== 'Cancelled') {
      const passengerEmail = booking.passengerDetails?.email;

      if (passengerEmail) {
        // Calculate refund (default 50% if no env var set)
        const cancellationRate = parseFloat(process.env.CANCELLATION_RATE || '50');
        const paidAmount       = booking.flight?.price || 0;
        const refundAmount     = Math.round(paidAmount * (cancellationRate / 100));

        const { subject, html } = cancellationEmail({
          passengerName:    booking.passengerDetails?.name    || 'Passenger',
          bookingReference: booking.bookingReference          || id.slice(-8).toUpperCase(),
          airline:          booking.flight?.airline           || 'N/A',
          flightNumber:     booking.flight?.flightNumber      || 'N/A',
          from:             booking.flight?.departureLocation || 'N/A',
          to:               booking.flight?.arrivalLocation   || 'N/A',
          paidAmount,
          refundAmount,
          cancellationRate,
        });

        // Fire and forget — email failure won't block the 200 response
        sendEmail({ to: passengerEmail, subject, html })
          .then(() => {
            console.log(`[updateBooking] ✅ Cancellation email sent to ${passengerEmail}`);
          })
          .catch((emailErr) => {
            console.error(`[updateBooking] ❌ Cancellation email failed for ${passengerEmail}:`, emailErr.message);
          });

        // Restore one seat to the flight
        if (booking.flight?._id) {
          await Flight.findByIdAndUpdate(booking.flight._id, {
            $inc: { seatsAvailable: booking.passengers || 1 }
          });
        }
      }

      // Log cancellation activity
      await ActivityLog.create({
        userId:    booking.user,
        bookingId: booking._id,
        action:    'Cancelled',
        details: {
          passengerName: booking.passengerDetails?.name,
          flightNumber:  booking.flight?.flightNumber,
          status:        'Cancelled',
        },
      }).catch(e => console.warn('[updateBooking] ActivityLog error:', e.message));
    }

    return res.status(200).json({ message: 'Booking updated successfully', booking });
  } catch (err) {
    console.error('[updateBooking] Error:', err.message);
    return res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/download/:id
// Generate and return PDF receipt
// ────────────────────────────────────────────────────────────────────────────
const downloadReceipt = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('flight');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(29, 78, 216);
    doc.text('Flight Booking Receipt', 105, 20, { align: 'center' });

    // Subtitle
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text('Flight Booking & Reservation System', 105, 28, { align: 'center' });

    // Divider
    doc.setDrawColor(29, 78, 216);
    doc.setLineWidth(0.5);
    doc.line(20, 32, 190, 32);

    // Booking details table
    doc.autoTable({
      startY: 38,
      head: [['Field', 'Details']],
      body: [
        ['Booking Reference', booking.bookingReference || booking._id.toString().slice(-8).toUpperCase()],
        ['Payment Status',    booking.paymentStatus    || 'N/A'],
        ['Passenger Name',    booking.passengerDetails?.name  || 'N/A'],
        ['Email',             booking.passengerDetails?.email || 'N/A'],
        ['Seat Preference',   booking.seatPreference          || 'N/A'],
        ['Booking Class',     booking.bookingClass            || 'Economy'],
        ['Passengers',        String(booking.passengers       || 1)],
        ['Airline',           booking.flight?.airline         || 'N/A'],
        ['Flight Number',     booking.flight?.flightNumber    || 'N/A'],
        ['Route',             `${booking.flight?.departureLocation || 'N/A'} → ${booking.flight?.arrivalLocation || 'N/A'}`],
        ['Departure',         booking.flight?.departureTime
          ? new Date(booking.flight.departureTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
          : 'N/A'
        ],
        ['Amount Paid',       `Rs. ${(booking.flight?.price || 0).toLocaleString('en-IN')}`],
        ['Booking Date',      new Date(booking.createdAt).toLocaleDateString('en-IN')],
      ],
      headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    });

    // Footer note
    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Thank you for booking with us. Have a safe flight!', 105, finalY, { align: 'center' });

    // Stream PDF as response
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${booking.bookingReference || booking._id}.pdf"`,
      'Content-Length':      pdfBuffer.length,
    });
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[downloadReceipt] Error:', err.message);
    return res.status(500).json({ message: 'Could not generate PDF', error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/bookings/delete/:id
// ────────────────────────────────────────────────────────────────────────────
const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    return res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (err) {
    console.error('[deleteBooking] Error:', err.message);
    return res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};

module.exports = {
  reserveFlight,
  getMyHistory,
  updateBooking,
  downloadReceipt,
  deleteBooking,
};