const express = require('express');
const cors    = require('cors');

const app = express();

const authRouter    = require('./routers/authrouter');
const flightRouter  = require('./routers/flightRouter');
const bookingRouter = require('./routers/bookingRouter');
const paymentRouter = require('./routers/paymentRouter');
const adminRouter   = require('./routers/adminRouter');

app.get('/health', (req, res) =>
  res.status(200).json({ status: 'ok', time: new Date().toISOString(), uptime: Math.floor(process.uptime()) })
);
app.get('/ping', (req, res) => res.status(200).send('pong'));

const allowedOrigins = [
  'https://theflightbooking.netlify.app', 
  //'http://localhost:5173',
  //'http://localhost:3000',
  //'http://127.0.0.1:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`CORS blocked: ${origin}`);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials:          true,
  methods:              ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:       ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));

app.use(express.json());


app.use('/api/auth/payments', paymentRouter);
app.use('/api/auth/admin',    adminRouter);
app.use('/api/auth/flights',  flightRouter);
app.use('/api/auth/bookings', bookingRouter);
app.use('/api/auth',          authRouter);


module.exports = app;