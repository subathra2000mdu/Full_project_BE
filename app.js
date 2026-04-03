const express = require('express');
const cors = require("cors");
// REMOVED: const initCronJobs = require('./utils/cronJobs'); 
// We will require it at the bottom instead.

const app = express(); 

const authRouter = require("./routers/authrouter");
const flightRouter = require("./routers/flightRouter");
const bookingRouter = require("./routers/bookingRouter");
const paymentRouter = require("./routers/paymentRouter");
const adminRouter = require("./routers/adminRouter");

// --- Health Check Endpoint (Keep-alive target) ---
// This is critical for the Render keep-alive cron job to hit.
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        time: new Date().toISOString(),
        uptime: process.uptime() 
    });
});

// --- Middleware ---
app.use(cors({
    // Added localhost:5173 which is the default Vite port for React
    origin: ["https://theflightbooking.netlify.app", "http://localhost:5173", "http://localhost:3001","*"],
    credentials: true,
}));
app.use(express.json());

// --- Routes ---
app.use("/api/auth/payments", paymentRouter);
app.use("/api/auth/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/auth/flights", flightRouter);
app.use("/api/auth/bookings", bookingRouter);

// --- Initialize Cron ---
// This executes the code in cronJobs.js immediately upon server start.
require('./utils/cronJobs');

module.exports = app;