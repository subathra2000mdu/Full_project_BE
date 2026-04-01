const flightApi = require('../utils/flightApi'); 
const Flight = require('../models/Flight');

exports.searchFlights = async (req, res) => {
  try {
    const { from, to } = req.query; 
    
    const response = await flightApi.get('/flights', {
      params: { dep_iata: from, arr_iata: to }
    });

    const externalFlights = response.data.data || [];

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

exports.getAllFlights = async (req, res) => {
  try {
    const flights = await Flight.find();
    res.status(200).json(flights);
  } catch (err) {
    res.status(500).json({ message: "Fetch Error" });
  }
};

exports.addFlight = async (req, res) => {
  try {
    const newFlight = new Flight(req.body);
    await newFlight.save();
    res.status(201).json(newFlight);
  } catch (err) {
    res.status(400).json({ message: "Error adding flight", error: err.message });
  }
};

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