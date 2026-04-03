const express = require('express');
const cors = require("cors");

const app = express(); 

const authRouter = require("./routers/authrouter");
const flightRouter = require("./routers/flightRouter");
const bookingRouter = require("./routers/bookingRouter");
const paymentRouter = require("./routers/paymentRouter");
const adminRouter = require("./routers/adminRouter");

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        time: new Date().toISOString(),
        uptime: process.uptime() 
    });
});


app.use(cors());
app.use(express.json());


app.use("/api/auth/payments", paymentRouter);
app.use("/api/auth/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/auth/flights", flightRouter);
app.use("/api/auth/bookings", bookingRouter);


require('./utils/cronJobs');

module.exports = app;