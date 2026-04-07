const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  action:    { type: String, enum: ['Created', 'Updated', 'Cancelled', 'Booked', 'Payment_Completed', 'Payment_Initiated', 'Payment_Failed'], required: true },
  details: {
    passengerName: String,
    flightNumber:  String,
    amount:        Number,
    status:        String,
  },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('History', historySchema);