const express = require('express');
const router = express.Router();
const { createPaymentIntent, confirmPaymentStatus } = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create-intent', authMiddleware, createPaymentIntent);
router.post('/confirm', authMiddleware, confirmPaymentStatus);

module.exports = router;