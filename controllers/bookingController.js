const Booking     = require('../models/Booking');
const Flight      = require('../models/Flight');
const ActivityLog = require('../models/Activitylog');
const sendEmail   = require('../utils/sendEmail');
const { paymentConfirmationEmail, cancellationEmail } = require('../utils/emailTemplates');
const { jsPDF }   = require('jspdf');
require('jspdf-autotable');

const generateBookingRef = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const logActivity = async (data) => {
  try { await ActivityLog.create(data); }
  catch (e) { console.warn('[ActivityLog] skip:', e.message); }
};

// Logic for POST /reserve
const createBooking = async (req, res) => {
  try {
    const { flightId, passengerDetails, passengers } = req.body;
    const userId = req.user?.id || req.user?._id;

    const flight = await Flight.findById(flightId);
    if (!flight || flight.seatsAvailable < 1) {
      return res.status(400).json({ message: 'Flight unavailable' });
    }

    flight.seatsAvailable -= (Number(passengers) || 1);
    await flight.save();

    const booking = await Booking.create({
      user: userId,
      flight: flightId,
      passengerDetails,
      bookingReference: generateBookingRef(),
      paymentStatus: 'Pending'
    });

    return res.status(201).json(booking);
  } catch (err) {
    return res.status(500).json({ message: 'Reservation failed', error: err.message });
  }
};

// Logic for GET /my-history
const getMyBookings = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const bookings = await Booking.find({ user: userId }).populate('flight');
    return res.status(200).json(bookings);
  } catch (err) {
    return res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

// Logic for DELETE /cancel/:id
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    return res.status(200).json({ message: 'Cancelled successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Cancel failed' });
  }
};

// Logic for PATCH /update/:id
const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.status(200).json(booking);
  } catch (err) {
    return res.status(500).json({ message: 'Update failed' });
  }
}

// Logic for GET /download/:id
const downloadItinerary = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('flight');
    const doc = new jsPDF();
    doc.text(`Booking Receipt: ${booking.bookingReference}`, 10, 10);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.set({ 'Content-Type': 'application/pdf' });
    return res.send(pdfBuffer);
  } catch (err) {
    return res.status(500).json({ message: 'PDF Error' });
  }
};

// Placeholder for Stats
const getBookingStats = async (req, res) => {
    return res.status(200).json({ message: "Stats feature coming soon" });
};

module.exports = { 
    createBooking, 
    getMyBookings, 
    cancelBooking, 
    updateBooking, 
    downloadItinerary, 
    getBookingStats 
};