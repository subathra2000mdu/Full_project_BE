const Booking = require('../models/Booking');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const sendBookingEmail = require('../utils/emailService');


const createBooking = async (req, res) => {
  try {
    const { flightId, passengerDetails, seatPreference } = req.body;
    
    const userId = req.user?._id || req.user?.id; 

    if (!userId) {
      return res.status(400).json({ message: "User ID is required for booking." });
    }

    const newBooking = new Booking({
      user: userId,
      flight: flightId,
      passengerDetails,
      seatPreference: seatPreference || 'Window'
    });

    const saved = await newBooking.save();
    const populated = await Booking.findById(saved._id).populate('flight');
    res.status(201).json({ itinerary: populated });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


const getMyBookings = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id; 
    const bookings = await Booking.find({ user: userId }).populate('flight');
    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('flight');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    if (req.body.paymentStatus === 'Completed' && booking.passengerDetails?.email) {
      sendBookingEmail(booking.passengerDetails.email, booking).catch(console.error);
    }
    res.status(200).json({ message: 'Update successful', updatedBooking: booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const downloadItinerary = async (req, res) => { /* PDF logic here */ res.send("PDF Generated"); };
const cancelBooking = async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Cancelled' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
const getBookingStats = async (req, res) => { res.json({ stats: "ok" }); };


module.exports = { 
  createBooking, 
  updateBooking, 
  downloadItinerary, 
  getMyBookings, 
  cancelBooking, 
  getBookingStats 
};