const express = require('express');
const cors    = require('cors');

const app = express();

const authRouter    = require("./routers/authrouter");
const flightRouter  = require("./routers/flightRouter");
const bookingRouter = require("./routers/bookingRouter");
const paymentRouter = require("./routers/paymentRouter");
const adminRouter   = require("./routers/adminRouter");

app.get('/health', (req, res) => {
  res.status(200).json({
    status:  'ok',
    time:    new Date().toISOString(),
    uptime:  Math.floor(process.uptime()),
    memory:  process.memoryUsage().heapUsed,
  });
});

app.get('/ping', (req, res) => res.status(200).send('pong'));

const allowedOrigins = [
  'https://theflightbooking.netlify.app',  
].filter(Boolean); 

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`CORS blocked request from: ${origin}`);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials:          true,
  methods:              ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:       ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));

app.use(express.json());

app.use("/api/auth/payments", paymentRouter);
app.use("/api/auth/admin",    adminRouter);
app.use("/api/auth",          authRouter);
app.use("/api/auth/flights",  flightRouter);
app.use("/api/auth/bookings", bookingRouter);

require('./utils/cronJobs');

module.exports = app;