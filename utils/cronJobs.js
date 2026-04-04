// utils/cronJobs.js
//
// Prevents Render free-tier cold starts by self-pinging every 14 minutes.
// Render spins down services after 15 min of inactivity.
// Pinging at 14 min means the server never reaches the sleep threshold.
//
// This file is already required in your app.js:  require('./utils/cronJobs');
// No other setup needed — just make sure RENDER_URL is set in Render env vars.

const cron = require('node-cron'); // npm install node-cron
const http = require('http');
const https = require('https');

const RENDER_URL = 'https://flight-booking-p4qy.onrender.com';
const NODE_ENV   = process.env.NODE_ENV   || 'development';

// Only run in production — skip during local development
if (NODE_ENV === 'production' && RENDER_URL) {

  // Self-ping every 14 minutes
  cron.schedule('*/14 * * * *', () => {
    const pingUrl = `${RENDER_URL}/health`;
    const client  = pingUrl.startsWith('https') ? https : http;

    const req = client.get(pingUrl, { timeout: 10000 }, (res) => {
      console.log(
        `[keep-alive] Self-ping → ${pingUrl} | Status: ${res.statusCode} | ${new Date().toISOString()}`
      );
    });

    req.on('error', (err) => {
      console.warn(`[keep-alive] Self-ping failed: ${err.message}`);
    });

    req.on('timeout', () => {
      console.warn('[keep-alive] Self-ping timed out');
      req.destroy();
    });
  });

  console.log(`🔄 Keep-alive cron scheduled (every 14 min) → ${RENDER_URL}/health`);

} else if (NODE_ENV === 'production' && !RENDER_URL) {
  console.warn('⚠️  RENDER_URL not set — keep-alive cron will not run.');
  console.warn('   Add RENDER_URL=https://your-app.onrender.com to Render env vars.');
} else {
  console.log('ℹ️  Keep-alive cron skipped (not production).');
}