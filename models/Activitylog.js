// models/ActivityLog.js
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      required: false,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Booking',
      required: false,
    },
    action: {
      type: String,
      enum: ['Created', 'Booked', 'Cancelled', 'Updated', 'Paid', 'Downloaded'],
      default: 'Created',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);