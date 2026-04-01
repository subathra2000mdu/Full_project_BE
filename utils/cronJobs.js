const cron = require('node-cron');
const axios = require('axios');
const Booking = require('../models/Booking');
const sendBookingEmail = require('./emailService');

cron.schedule('0 * * * *', async () => {
    console.log('--- Checking for Flight Status Updates ---');

    try {
        const upcomingBookings = await Booking.find({
            paymentStatus: 'Completed',
        }).populate('flight');

        for (const booking of upcomingBookings) {
            const flightNum = booking.flight.flightNumber;

            const response = await axios.get(`${process.env.AVIATIONSTACK_BASE_URL}/flights`, {
                params: {
                    access_key: process.env.AVIATIONSTACK_KEY,
                    flight_iata: flightNum
                }
            });

            const flightData = response.data.data[0];

            if (flightData) {
                const currentStatus = flightData.flight_status; 
                
                if (currentStatus === 'delayed' || currentStatus === 'cancelled') {
                    console.log(`Alert: Flight ${flightNum} is ${currentStatus}. Sending email...`);
                    
                    await sendBookingEmail(booking.passengerDetails.email, {
                        ...booking._doc,
                        updateType: 'Status Change',
                        newStatus: currentStatus
                    });
                }
            }
        }
    } catch (error) {
        console.error('Cron Job Error:', error.message);
    }
});