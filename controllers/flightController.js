const flightApi = require('../utils/flightApi'); // Using your separate axios instance
const Flight = require('../models/Flight');

// 1. Search & Sync with Live API
exports.searchFlights = async (req, res) => {
  try {
    const { from, to } = req.query; 
    
    // Using the instance logic you created
    const response = await flightApi.get('/flights', {
      params: { dep_iata: from, arr_iata: to }
    });

    const externalFlights = response.data.data || [];

    // Auto-Sync: Save or Update live flights in your MongoDB
    const flightOps = externalFlights.map(async (f) => {
      return await Flight.findOneAndUpdate(
        { flightNumber: f.flight.iata },
        {
          airline: f.airline.name,
          departureLocation: f.departure.airport,
          arrivalLocation: f.arrival.airport,
          departureTime: f.departure.scheduled,
          status: f.flight_status,
          price: 5000, 
          seatsAvailable: 75
        },
        { upsert: true, new: true }
      );
    });

    const synchronizedFlights = await Promise.all(flightOps);
    res.status(200).json(synchronizedFlights);
  } catch (err) {
    res.status(500).json({ message: "Sync Error", error: err.message });
  }
};

// 2. Get All Local Flights
exports.getAllFlights = async (req, res) => {
  try {
    const flights = await Flight.find();
    res.status(200).json(flights);
  } catch (err) {
    res.status(500).json({ message: "Fetch Error" });
  }
};

// 3. Add Manual Flight (Admin)
exports.addFlight = async (req, res) => {
  try {
    const newFlight = new Flight(req.body);
    await newFlight.save();
    res.status(201).json(newFlight);
  } catch (err) {
    res.status(400).json({ message: "Error adding flight", error: err.message });
  }
};

// 4. Update Flight Status (Real-time updates)
exports.updateStatus = async (req, res) => {
  try {
    const updated = await Flight.findByIdAndUpdate(
        req.params.id, 
        { status: req.body.status }, 
        { new: true }
    );
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};