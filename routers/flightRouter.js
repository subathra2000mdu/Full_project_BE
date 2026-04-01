const express = require('express');
const router = express.Router();
const { 
    searchFlights, 
    getAllFlights, 
    updateStatus, 
    addFlight 
} = require('../controllers/flightController');


router.get('/search', searchFlights);
router.get('/', getAllFlights);
router.post('/add', addFlight);
router.patch('/status/:id', updateStatus); 

module.exports = router;