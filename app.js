const express = require('express');
const cors = require("cors");
const app = express(); // Initialize APP before using it

require('./utils/cronJobs');
const authRouter = require("./routers/authrouter");
const flightRouter = require("./routers/flightRouter");
const bookingRouter = require("./routers/bookingRouter");
const paymentRouter = require("./routers/paymentRouter");
const adminRouter = require("./routers/adminRouter");

// Now use the middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth/payments", paymentRouter);
app.use("/api/auth/admin", adminRouter);
app.use("/api/auth", authRouter);
app.use("/api/auth/flights", flightRouter);
app.use("/api/auth/bookings", bookingRouter);

module.exports = app;