const express = require('express');
const router = express.Router();
const { 
    createBooking, 
    getMyBookings, 
    cancelBooking,
    getBookingStats
} = require('../controllers/bookingController');

const authMiddleware = require('../middleware/authMiddleware'); 

router.post('/reserve', authMiddleware, createBooking); 

router.get('/my-history', authMiddleware, getMyBookings);

router.delete('/cancel/:id', authMiddleware, cancelBooking);

router.get('/admin/analytics', authMiddleware, getBookingStats);

module.exports = router;