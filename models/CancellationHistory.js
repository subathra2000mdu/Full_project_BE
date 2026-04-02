const mongoose = require('mongoose');

const cancellationHistorySchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    passengerName: String,
    flightNumber: String,
    refundAmount: Number,
    cancelledAt: { type: Date, default: Date.now },
    reason: { type: String, default: "User Requested" }
});

module.exports = mongoose.model('CancellationHistory', cancellationHistorySchema);