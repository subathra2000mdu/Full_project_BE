const cron = require('node-cron');
const axios = require('axios');
const Booking = require('../models/Booking');
const sendBookingEmail = require('./emailService');

// ════════════════════════════════════════════════════════════════════════════
// NEW: KEEP-ALIVE CRON (Added to prevent Render sleep)
// ════════════════════════════════════════════════════════════════════════════
const RENDER_URL = process.env.RENDER_URL || 'https://flight-booking-p4qy.onrender.com';

if (process.env.NODE_ENV === 'production') {
    cron.schedule('*/14 * * * *', async () => {
        try {
            // Pings the /health endpoint we added to app.js
            await axios.get(`${RENDER_URL}/health`, { timeout: 10000 });
            console.log(`[KEEP-ALIVE] Self-ping successful @ ${new Date().toISOString()}`);
        } catch (err) {
            console.warn(`[KEEP-ALIVE] Self-ping failed: ${err.message}`);
        }
    });
}

// ════════════════════════════════════════════════════════════════════════════
// YOUR ORIGINAL CODE (Unchanged)
// ════════════════════════════════════════════════════════════════════════════
cron.schedule('0 * * * *', async () => {
    console.log('--- [CRON] Starting Flight Status Sync ---');

    try {
        const upcomingBookings = await Booking.find({
            paymentStatus: 'Completed',
        }).populate('flight');

        if (upcomingBookings.length === 0) {
            return console.log('[CRON] No active bookings to track.');
        }

        for (const booking of upcomingBookings) {
            try {
                const flightNum = booking.flight.flightNumber;

                const response = await axios.get(`${process.env.AVIATIONSTACK_BASE_URL}/flights`, {
                    params: {
                        access_key: process.env.AVIATIONSTACK_KEY,
                        flight_iata: flightNum
                    },
                    timeout: 5000 
                });

                const flightData = response.data?.data?.[0];

                if (flightData) {
                    const currentStatus = flightData.flight_status; 
                    
                    if (currentStatus === 'delayed' || currentStatus === 'cancelled') {
                        console.log(`[ALERT] Flight ${flightNum} is ${currentStatus}.`);
                        
                        await sendBookingEmail(booking.passengerDetails.email, {
                            ...booking._doc,
                            updateType: 'Status Change',
                            newStatus: currentStatus
                        });
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (innerError) {
                console.error(`[CRON] Error tracking Flight ${booking.flight.flightNumber}:`, innerError.message);
                
                continue; 
            }
        }
        console.log('--- [CRON] Sync Completed ---');
    } catch (error) {
        console.error('--- [CRON] Critical Failure:', error.message);
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});