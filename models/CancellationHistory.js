const mongoose = require('mongoose');

const cancellationHistorySchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
  bookingId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  bookingReference: { type: String },
  reason:           { type: String, default: 'User requested cancellation' },
  refundAmount:     { type: Number, default: 0 },
  cancelledAt:      { type: Date,   default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('CancellationHistory', cancellationHistorySchema);