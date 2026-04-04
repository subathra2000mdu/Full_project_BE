const express = require('express');
const router = express.Router();
const { 
    createBooking, 
    getMyBookings, 
    cancelBooking,
    getBookingStats,
    updateBooking,
    downloadItinerary
} = require('../controllers/bookingController');

const authMiddleware = require('../middleware/authMiddleware'); 

// All routes use authMiddleware to ensure req.user exists
router.post('/reserve', authMiddleware, createBooking); 
router.get('/my-history', authMiddleware, getMyBookings);
router.delete('/cancel/:id', authMiddleware, cancelBooking);
router.get('/admin/analytics', authMiddleware, getBookingStats);
router.patch('/update/:id', authMiddleware, updateBooking);
router.get('/download/:id', authMiddleware, downloadItinerary);
router.get('/history', authMiddleware, getMyBookings);

module.exports = router;