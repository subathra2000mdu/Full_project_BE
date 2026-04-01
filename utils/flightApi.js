const axios = require('axios');

// Create a specialized instance for the Aviationstack API
const flightApi = axios.create({
    baseURL: process.env.AVIATIONSTACK_BASE_URL, // e.g., http://api.aviationstack.com/v1
    params: {
        access_key: process.env.AVIATIONSTACK_KEY // Automatically attaches key to every request
    }
});

module.exports = flightApi;