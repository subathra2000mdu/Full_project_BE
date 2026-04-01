const axios = require('axios');
const Flight = require('../models/Flight');

const FLIGHT_API_URL = process.env.AVIATIONSTACK_BASE_URL;
const API_KEY = process.env.AVIATIONSTACK_KEY;

// 1. Search Flights (Using External API)
exports.searchFlights = async (req, res) => {
  try {
    const { from, to } = req.query; 
    const response = await axios.get(FLIGHT_API_URL, {
      params: { access_key: API_KEY, dep_iata: from, arr_iata: to }
    });

    const results = response.data.data.map(f => ({
      airline: f.airline.name,
      flightNumber: f.flight.iata,
      departure: f.departure.airport,
      arrival: f.arrival.airport,
      status: f.flight_status,
      departureTime: f.departure.scheduled,
      price: 5000, 
      seatsAvailable: 75
    }));

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: "Failed to connect to Flight API", error: err.message });
  }
};

// 2. Get All Flights (From your MongoDB)
exports.getAllFlights = async (req, res) => {
  try {
    const flights = await Flight.find();
    res.status(200).json(flights);
  } catch (err) {
    res.status(500).json({ message: "Error fetching flights" });
  }
};

// 3. Add Flight (Admin tool for MongoDB)
exports.addFlight = async (req, res) => {
  try {
    const newFlight = new Flight(req.body);
    await newFlight.save();
    res.status(201).json(newFlight);
  } catch (err) {
    res.status(400).json({ message: "Error adding flight", error: err.message });
  }
};

// 4. Update Status (Real-time update for MongoDB)
exports.updateStatus = async (req, res) => {
  try {
    const updated = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};