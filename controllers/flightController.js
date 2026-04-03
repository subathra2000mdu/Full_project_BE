const Flight = require('../models/Flight');
const flightApi = require('../utils/flightApi');

// ─── Airport name lookup ───────────────────────────────────────────────────────
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

// ─── Build an IST-correct Date from a YYYY-MM-DD string + HH:MM (IST) ─────────
// e.g. buildISTDate("2026-04-10", "09:30") → Date object that is 09:30 IST
// IST = UTC+5:30, so we subtract 5h30m to get the UTC equivalent.
const buildISTDate = (dateStr, timeIST) => {
  const [hours, minutes] = timeIST.split(':').map(Number);
  // Total IST minutes from midnight
  const istMinutesFromMidnight = hours * 60 + minutes;
  // IST offset = 330 minutes ahead of UTC
  const utcMinutesFromMidnight = istMinutesFromMidnight - 330;

  // Parse the date as UTC midnight, then add the UTC minutes
  const base = new Date(`${dateStr}T00:00:00.000Z`);
  base.setUTCMinutes(base.getUTCMinutes() + utcMinutesFromMidnight);
  return base;
};

// ─── Seed dummy flights into MongoDB ──────────────────────────────────────────
// All departure times are expressed in IST so they display correctly in the UI.
const seedDummyFlights = async (from, to, date) => {
  // Default to today in IST if no date given
  const baseDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
  // 'sv-SE' locale returns "YYYY-MM-DD" — the cleanest way to get IST date string

  const dummyFlights = [
    {
      airline: "IndiGo",
      flightNumber: `6E-${from}${to}-001`,
      departureLocation: getAirportName(from),
      arrivalLocation: getAirportName(to),
      departureIata: from.toUpperCase(),
      arrivalIata: to.toUpperCase(),
      departureTime: buildISTDate(baseDate, "09:00"), // 9:00 AM IST
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
      departureTime: buildISTDate(baseDate, "10:30"), // 10:30 AM IST
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
      departureTime: buildISTDate(baseDate, "15:00"), // 3:00 PM IST
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
      departureTime: buildISTDate(baseDate, "17:30"), // 5:30 PM IST
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
      departureTime: buildISTDate(baseDate, "20:00"), // 8:00 PM IST
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

// ─── Helper: get YYYY-MM-DD in IST from a Date object ─────────────────────────
const toISTDateString = (date) =>
  new Date(date).toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });

// ─── MAIN: Search Flights ──────────────────────────────────────────────────────
exports.searchFlights = async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "'from' and 'to' query params are required" });
    }

    const fromUpper = from.toUpperCase();
    const toUpper   = to.toUpperCase();
    let synchronizedFlights = [];
    let source = "";

    // ── Step 1: Try Aviationstack API ──────────────────────────────────────────
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

      console.log(`🛫 Aviationstack returned ${externalFlights.length} flights for ${fromUpper}→${toUpper}`);

      if (externalFlights.length > 0) {
        // Use today's IST date as fallback if date not provided
        const baseDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });

        const flightOps = externalFlights.map(async (f) => {
          const flightNum = f.flight?.iata || f.flight?.number || `FL-${Date.now()}`;

          // For API flights: use the scheduled time if given, else build an IST time
          let departureTime;
          if (f.departure?.scheduled) {
            departureTime = new Date(f.departure.scheduled);
          } else {
            departureTime = buildISTDate(baseDate, "06:00"); // 6:00 AM IST fallback
          }

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
              status:         f.flight_status || 'scheduled',
              price:          3000 + Math.floor(Math.random() * 4000),
              seatsAvailable: Math.floor(Math.random() * 60) + 10
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        });

        synchronizedFlights = await Promise.all(flightOps);
        source = "aviationstack_api";
      }
    } catch (apiErr) {
      console.warn("⚠️  Aviationstack API Error:", apiErr.message);
    }

    // ── Step 2: Fallback to MongoDB ────────────────────────────────────────────
    if (synchronizedFlights.length === 0) {
      console.log("🔍 Checking local MongoDB...");
      synchronizedFlights = await Flight.find({
        departureIata: fromUpper,
        arrivalIata:   toUpper
      });

      // Secondary fallback: match by airport name patterns
      if (synchronizedFlights.length === 0) {
        const iataToName = {
          MAA: /madras|chennai|meenambakkam/i,
          BOM: /mumbai|chhatrapati|sahar/i,
          DEL: /delhi|indira gandhi/i,
          BLR: /bangalore|bengaluru|kempegowda/i,
          HYD: /hyderabad|rajiv gandhi/i,
          CCU: /kolkata|netaji/i,
          COK: /cochin|kochi/i,
          AMD: /ahmedabad|sardar/i,
          PNQ: /pune/i,
          GOI: /goa/i
        };

        const depPattern = iataToName[fromUpper];
        const arrPattern = iataToName[toUpper];

        if (depPattern && arrPattern) {
          synchronizedFlights = await Flight.find({
            departureLocation: { $regex: depPattern },
            arrivalLocation:   { $regex: arrPattern }
          });
          console.log(`📍 Found ${synchronizedFlights.length} flights by location name`);
        }
      }
      source = "mongodb";
    }

    // ── Step 3: Seed dummy data if still empty ─────────────────────────────────
    if (synchronizedFlights.length === 0) {
      console.log("🌱 No data found — seeding dummy flights...");
      synchronizedFlights = await seedDummyFlights(fromUpper, toUpper, date);
      source = "seeded_dummy";
    }

    // ── Step 4: Filter by date using IST comparison ────────────────────────────
    // Both the flight's departureTime and the user's selected date are compared
    // in IST to avoid UTC midnight crossover issues.
    if (date && synchronizedFlights.length > 0) {
      const filtered = synchronizedFlights.filter(f => {
        if (!f.departureTime) return true; // keep if no date set
        try {
          return toISTDateString(f.departureTime) === date;
          // date param is already "YYYY-MM-DD" from the frontend date input
        } catch {
          return true;
        }
      });

      // Only apply filter if it keeps at least one result
      if (filtered.length > 0) {
        synchronizedFlights = filtered;
      } else {
        // No flights match the date — return empty so frontend shows "no flights on date"
        synchronizedFlights = [];
      }
    }

    console.log(`✅ Returning ${synchronizedFlights.length} flights (source: ${source})`);
    res.status(200).json(synchronizedFlights);

  } catch (err) {
    console.error("❌ Search Error:", err);
    res.status(500).json({ message: "Search Error", error: err.message });
  }
};

// ─── Admin: Get All Flights ────────────────────────────────────────────────────
exports.getAllFlights = async (req, res) => {
  try {
    const flights = await Flight.find().sort({ createdAt: -1 });
    res.status(200).json(flights);
  } catch (err) {
    res.status(500).json({ message: "Fetch Error", error: err.message });
  }
};

// ─── Admin: Update Flight ──────────────────────────────────────────────────────
exports.updateFlight = async (req, res) => {
  try {
    const updated = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Flight not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Update Error", error: err.message });
  }
};

// ─── Admin: Delete Flight ──────────────────────────────────────────────────────
exports.deleteFlight = async (req, res) => {
  try {
    const deleted = await Flight.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Flight not found" });
    res.status(200).json({ message: "Flight deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Delete Error", error: err.message });
  }
};

// ─── Admin: Add Flight Manually ───────────────────────────────────────────────
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

// ─── Admin: Update Flight Status ──────────────────────────────────────────────
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