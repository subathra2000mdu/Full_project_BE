const express = require('express');
const router = express.Router();
// Import the names EXACTLY as they are written in the controller
const { createPaymentIntent, confirmPayment } = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create-intent', authMiddleware, createPaymentIntent);

// Change confirmPaymentStatus to confirmPayment
router.post('/confirm', authMiddleware, confirmPayment);

module.exports = router;