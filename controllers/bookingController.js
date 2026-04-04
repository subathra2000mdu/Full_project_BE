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
// controllers/bookingController.js

const createBooking = async (req, res) => {
  try {
    // 1. Extract all possible fields from req.body
    const { 
      flightId, 
      passengerDetails, 
      passengers, 
      seatPreference, 
      bookingClass 
    } = req.body;

    // 2. Identify the User
    const userId = req.user?.id || req.user?._id;

    // 3. Validation: Ensure we have a flight and passenger info
    if (!flightId) {
      return res.status(400).json({ message: 'Flight ID is required' });
    }
    if (!passengerDetails || !passengerDetails.name || !passengerDetails.email) {
      return res.status(400).json({ message: 'Passenger name and email are required' });
    }

    // 4. Find the flight and check seat availability
    const flight = await Flight.findById(flightId);
    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    const requestedSeats = Number(passengers) || 1;
    if (flight.seatsAvailable < requestedSeats) {
      return res.status(400).json({ message: 'Not enough seats available' });
    }

    // 5. Update flight seats (Save to DB)
    flight.seatsAvailable = Math.max(0, flight.seatsAvailable - requestedSeats);
    await flight.save();

    // 6. Create the Booking with ALL required schema fields
    const booking = await Booking.create({
      user: userId,
      flight: flightId,
      passengerDetails: {
        name: passengerDetails.name.trim(),
        email: passengerDetails.email.trim().toLowerCase(),
      },
      passengers: requestedSeats,
      // Provide defaults so the DB doesn't reject the save
      seatPreference: seatPreference || 'Window',
      bookingClass: bookingClass || 'Economy',
      bookingReference: generateBookingRef(),
      paymentStatus: 'Pending',
    });

    // 7. Populate flight details so the frontend has the data immediately
    await booking.populate('flight');

    // 8. Log the activity (Optional but recommended)
    await logActivity({
      userId,
      bookingId: booking._id,
      action: 'Created',
      details: { passengerName: passengerDetails.name, flightNumber: flight.flightNumber },
    });

    return res.status(201).json(booking);

  } catch (err) {
    console.error('[createBooking Error]:', err.message);
    return res.status(500).json({ 
      message: 'Internal Server Error during reservation', 
      error: err.message 
    });
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