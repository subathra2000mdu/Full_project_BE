const express = require('express');
const cors = require("cors");
const router = express.Router();
const authRouter = require("./routers/authrouter");
const flightRouter = require("./routers/flightRouter");
const bookingRouter = require("./routers/bookingRouter");

const app = express();
app.use(cors());
app.use(express.json());


app.use("/api/auth", authRouter);
app.use("/api/flights", flightRouter);
app.use("/api/bookings", bookingRouter);

module.exports = app;