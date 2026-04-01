const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  flight: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', required: true },
  passengerDetails: {
    name: { type: String, required: true },
    email: { type: String, required: true }
  },
  seatPreference: { type: String }, 
  paymentStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }, 
  bookingReference: { 
    type: String, 
    unique: true, 
    default: () => Math.random().toString(36).substring(7).toUpperCase() 
  }, 
  itineraryPdfUrl: { type: String }, 
  createdAt: { type: Date, default: Date.now } 
});

module.exports = mongoose.model('Booking', BookingSchema);