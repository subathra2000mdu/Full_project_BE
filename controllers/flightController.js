const Flight = require('../models/Flight');
const flightApi = require('../utils/flightApi');

const getAirportName = (iata) => {
  const airports = {
    MAA: "Chennai International Airport",
    BOM: "Chhatrapati Shivaji Maharaj International Airport",
    DEL: "Indira Gandhi International Airport",
    BLR: "Kempegowda International Airport",
    HYD: "Rajiv Gandhi International Airport",
    CCU: "Netaji Subhas Chandra Bose International Airport",
    COK: "Cochin International Airport",
    AMD: "Sardar Vallabhbhai Patel International Airport",
    PNQ: "Pune Airport",
    GOI: "Goa International Airport",
    VTZ: "Visakhapatnam Airport",
    IXC: "Chandigarh Airport",
    JAI: "Jaipur International Airport",
    TRV: "Trivandrum International Airport",
    IXB: "Bagdogra Airport"
  };
  return airports[iata?.toUpperCase()] || `${iata?.toUpperCase()} Airport`;
};

const buildISTDate = (dateStr, timeIST) => {
  const [hours, minutes] = timeIST.split(':').map(Number);
 
  const istMinutesFromMidnight = hours * 60 + minutes;
  
  const utcMinutesFromMidnight = istMinutesFromMidnight - 330;

  const base = new Date(`${dateStr}T00:00:00.000Z`);
  base.setUTCMinutes(base.getUTCMinutes() + utcMinutesFromMidnight);
  return base;
};

const seedDummyFlights = async (from, to, date) => {
  
  const baseDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
 

  const dummyFlights = [
    {
      airline: "IndiGo",
      flightNumber: `6E-${from}${to}-001`,
      departureLocation: getAirportName(from),
      arrivalLocation: getAirportName(to),
      departureIata: from.toUpperCase(),
      arrivalIata: to.toUpperCase(),
      departureTime: buildISTDate(baseDate, "09:00"), 
      price: 4500,
      seatsAvailable: 48,
      status: 'scheduled'
    },
    {
      airline: "Air India",
      flightNumber: `AI-${from}${to}-002`,
      departureLocation: getAirportName(from),
      arrivalLocation: getAirportName(to),
      departureIata: from.toUpperCase(),
      arrivalIata: to.toUpperCase(),
      departureTime: buildISTDate(baseDate, "10:30"), 
      price: 5800,
      seatsAvailable: 32,
      status: 'scheduled'
    },
    {
      airline: "SpiceJet",
      flightNumber: `SG-${from}${to}-003`,
      departureLocation: getAirportName(from),
      arrivalLocation: getAirportName(to),
      departureIata: from.toUpperCase(),
      arrivalIata: to.toUpperCase(),
      departureTime: buildISTDate(baseDate, "15:00"), 
      price: 3800,
      seatsAvailable: 65,
      status: 'scheduled'
    },
    {
      airline: "Vistara",
      flightNumber: `UK-${from}${to}-004`,
      departureLocation: getAirportName(from),
      arrivalLocation: getAirportName(to),
      departureIata: from.toUpperCase(),
      arrivalIata: to.toUpperCase(),
      departureTime: buildISTDate(baseDate, "17:30"),
      price: 6200,
      seatsAvailable: 20,
      status: 'scheduled'
    },
    {
      airline: "GoFirst",
      flightNumber: `G8-${from}${to}-005`,
      departureLocation: getAirportName(from),
      arrivalLocation: getAirportName(to),
      departureIata: from.toUpperCase(),
      arrivalIata: to.toUpperCase(),
      departureTime: buildISTDate(baseDate, "20:00"), 
      price: 3200,
      seatsAvailable: 55,
      status: 'scheduled'
    }
  ];

  const ops = dummyFlights.map(f =>
    Flight.findOneAndUpdate(
      { flightNumber: f.flightNumber },
      f,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  );

  const seeded = await Promise.all(ops);
  console.log(`✅ Seeded ${seeded.length} dummy flights for ${from} → ${to} on ${baseDate} (IST)`);
  return seeded;
};

const toISTDateString = (date) =>
  new Date(date).toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });

exports.searchFlights = async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "'from' and 'to' query params are required" });
    }

    const fromUpper = from.toUpperCase();
    const toUpper   = to.toUpperCase();
    
    const targetDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });

    let synchronizedFlights = [];
    let source = "";

    try {
      const response = await flightApi.get('/flights', {
        params: {
          dep_iata: fromUpper,
          flight_status: 'scheduled',
          limit: 50
        }
      });

      const externalFlights = (response.data?.data || [])
        .filter(f => f.arrival?.iata?.toUpperCase() === toUpper);

      if (externalFlights.length > 0) {
        const flightOps = externalFlights.map(async (f) => {
          const flightNum = f.flight?.iata || f.flight?.number || `FL-${Date.now()}`;
          let departureTime = f.departure?.scheduled ? new Date(f.departure.scheduled) : buildISTDate(targetDate, "06:00");

          return await Flight.findOneAndUpdate(
            { flightNumber: flightNum },
            {
              airline: f.airline?.name || "Unknown Airline",
              flightNumber: flightNum,
              departureLocation: f.departure?.airport || getAirportName(fromUpper),
              arrivalLocation:   f.arrival?.airport   || getAirportName(toUpper),
              departureIata: fromUpper,
              arrivalIata:   toUpper,
              departureTime,
              status: f.flight_status || 'scheduled',
              price: 3000 + Math.floor(Math.random() * 4000),
              seatsAvailable: Math.floor(Math.random() * 60) + 10
            },
            { upsert: true, new: true }
          );
        });
        synchronizedFlights = await Promise.all(flightOps);
        source = "aviationstack_api";
      }
    } catch (apiErr) {
      console.warn("⚠️ Aviationstack API Error:", apiErr.message);
    }

    if (synchronizedFlights.length === 0) {
      const allRouteFlights = await Flight.find({
        departureIata: fromUpper,
        arrivalIata: toUpper
      });

      synchronizedFlights = allRouteFlights.filter(f => 
        toISTDateString(f.departureTime) === targetDate
      );
      source = "mongodb";
    }

    if (synchronizedFlights.length === 0) {
      console.log(`🌱 Seeding dummy flights for ${targetDate}...`);
      synchronizedFlights = await seedDummyFlights(fromUpper, toUpper, targetDate);
      source = "seeded_dummy";
    }

    if (date) {
      synchronizedFlights = synchronizedFlights.filter(f => 
        toISTDateString(f.departureTime) === date
      );
    }

    console.log(`✅ Returning ${synchronizedFlights.length} flights (source: ${source})`);
    res.status(200).json(synchronizedFlights);

  } catch (err) {
    console.error("❌ Search Error:", err);
    res.status(500).json({ message: "Search Error", error: err.message });
  }
};


exports.getAllFlights = async (req, res) => {
  try {
    const flights = await Flight.find().sort({ createdAt: -1 });
    res.status(200).json(flights);
  } catch (err) {
    res.status(500).json({ message: "Fetch Error", error: err.message });
  }
};


exports.updateFlight = async (req, res) => {
  try {
    const updated = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Flight not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Update Error", error: err.message });
  }
};


exports.deleteFlight = async (req, res) => {
  try {
    const deleted = await Flight.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Flight not found" });
    res.status(200).json({ message: "Flight deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete Error", error: err.message });
  }
};

exports.addFlight = async (req, res) => {
  try {
    const {
      airline, flightNumber, departureLocation, arrivalLocation,
      departureIata, arrivalIata, departureTime, price, seatsAvailable, status
    } = req.body;

    const existing = await Flight.findOne({ flightNumber });
    if (existing) {
      return res.status(409).json({ message: "Flight with this number already exists" });
    }

    const newFlight = new Flight({
      airline,
      flightNumber,
      departureLocation,
      arrivalLocation,
      departureIata:  departureIata?.toUpperCase(),
      arrivalIata:    arrivalIata?.toUpperCase(),
      departureTime:  new Date(departureTime),
      price:          price          || 5000,
      seatsAvailable: seatsAvailable || 75,
      status:         status         || 'scheduled'
    });

    const saved = await newFlight.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "Add Flight Error", error: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    const validStatuses = ['scheduled', 'active', 'landed', 'cancelled', 'incident', 'diverted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updated = await Flight.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: "Flight not found" });

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Update Status Error", error: err.message });
  }
};