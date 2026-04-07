const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware'); 


router.use(authMiddleware);


router.post('/reserve', bookingController.createBooking); 
router.get('/my-history', bookingController.getMyBookings);
router.get('/history', bookingController.getMyBookings);
router.patch('/update/:id', bookingController.updateBooking);
router.get('/download/:id', bookingController.downloadItinerary);
router.delete('/cancel/:id', bookingController.cancelBooking);
router.get('/admin/analytics', bookingController.getBookingStats);

module.exports = router;