const axios = require('axios');

const flightApi = axios.create({
    baseURL: process.env.AVIATIONSTACK_BASE_URL, 
    params: {
        access_key: process.env.AVIATIONSTACK_KEY 
    }
});

module.exports = flightApi;