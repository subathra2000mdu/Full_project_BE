const express = require('express');
const cors = require("cors");
const router = express.Router();
require('./utils/cronJobs');
const authRouter = require("./routers/authrouter");
const flightRouter = require("./routers/flightRouter");
const bookingRouter = require("./routers/bookingRouter");
const paymentRouter = require("./routers/paymentRouter");
const adminRouter = require("./routers/adminRouter");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/payments", paymentRouter);
app.use("/api/admin", adminRouter);

app.use("/api/auth", authRouter);
app.use("/api/flights", flightRouter);
app.use("/api/bookings", bookingRouter);

module.exports = app;