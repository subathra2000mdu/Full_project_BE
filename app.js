// app.js
//
// KEY FIX: CORS must explicitly allow your Netlify frontend URL.
// Without this, the browser blocks API responses when called from Netlify.
//
// Set FRONTEND_URL in Render environment variables:
//   FRONTEND_URL = https://your-site.netlify.app
//
// For local dev it falls back to allowing localhost:3000.

const express = require('express');
const cors    = require('cors');

const app = express();

// ── Import routers (unchanged from your original) ─────────────────────────────
const authRouter    = require("./routers/authrouter");
const flightRouter  = require("./routers/flightRouter");
const bookingRouter = require("./routers/bookingRouter");
const paymentRouter = require("./routers/paymentRouter");
const adminRouter   = require("./routers/adminRouter");

// ── Health / ping endpoints ───────────────────────────────────────────────────
// Must be defined BEFORE cors() and express.json() middleware
// so even a cold-start wake-up request gets a fast response.
app.get('/health', (req, res) => {
  res.status(200).json({
    status:  'ok',
    time:    new Date().toISOString(),
    uptime:  Math.floor(process.uptime()),
    memory:  process.memoryUsage().heapUsed,
  });
});

app.get('/ping', (req, res) => res.status(200).send('pong'));

// ── CORS configuration ────────────────────────────────────────────────────────
// Allows requests from:
//   - Your Netlify frontend (set FRONTEND_URL in Render env vars)
//   - localhost:3000 and localhost:5173 for local development
const allowedOrigins = [
  'https://theflightbooking.netlify.app',       // e.g. https://your-site.netlify.app
  //'http://localhost:3000',
  //'http://localhost:5173',
  //'http://localhost:3001',
].filter(Boolean); // remove undefined if FRONTEND_URL is not set

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
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

// ── Routes (unchanged from your original) ─────────────────────────────────────
app.use("/api/auth/payments", paymentRouter);
app.use("/api/auth/admin",    adminRouter);
app.use("/api/auth",          authRouter);
app.use("/api/auth/flights",  flightRouter);
app.use("/api/auth/bookings", bookingRouter);

// ── Keep-alive cron (prevents Render 15-min sleep) ────────────────────────────
require('./utils/cronJobs');

module.exports = app;