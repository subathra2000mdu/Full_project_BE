const Flight = require('../models/Flight');


exports.searchFlights = async (req, res) => {
  try {
    const { from, to, date, passengers } = req.query;
    const flights = await Flight.find({
      departureLocation: from,
      arrivalLocation: to,
      seatsAvailable: { $gte: passengers || 1 }
    });
    res.status(200).json(flights);
  } catch (err) {
    res.status(500).json({ message: "Search failed", error: err.message });
  }
};


exports.updateStatus = async (req, res) => {
  try {
    const flight = await Flight.findByIdAndUpdate(
      req.params.id, 
      { status: req.body.status, departureTime: req.body.newTime }, 
      { new: true }
    );
    res.status(200).json(flight);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};


exports.addFlight = async (req, res) => {
  try {
    const newFlight = new Flight(req.body);
    await newFlight.save();
    res.status(201).json(newFlight);
  } catch (err) {
    res.status(400).json({ message: "Failed to add flight" });
  }
};


exports.getAllFlights = async (req, res) => {
  try {
    const flights = await Flight.find();
    res.status(200).json(flights);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch flights" });
  }
};