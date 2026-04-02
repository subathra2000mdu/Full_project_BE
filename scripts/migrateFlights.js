require('dotenv').config();
const mongoose = require('mongoose');
const Flight = require('../models/Flight');

const iataMap = {
  // Departure name patterns → IATA code
  "madras": "MAA",
  "chennai": "MAA",
  "mumbai": "BOM",
  "chhatrapati": "BOM",
  "sahar": "BOM",
  "delhi": "DEL",
  "indira gandhi": "DEL",
  "bangalore": "BLR",
  "bengaluru": "BLR",
  "kempegowda": "BLR",
  "hyderabad": "HYD",
  "rajiv gandhi": "HYD",
  "kolkata": "CCU",
  "netaji": "CCU",
  "cochin": "COK",
  "kochi": "COK",
  "ahmedabad": "AMD",
  "pune": "PNQ",
  "goa": "GOI"
};

const getIataFromName = (locationName) => {
  if (!locationName) return null;
  const lower = locationName.toLowerCase();
  for (const [keyword, iata] of Object.entries(iataMap)) {
    if (lower.includes(keyword)) return iata;
  }
  return null;
};

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const flights = await Flight.find({
    $or: [
      { departureIata: { $exists: false } },
      { arrivalIata: { $exists: false } },
      { departureIata: null },
      { arrivalIata: null }
    ]
  });

  console.log(`Found ${flights.length} flights to migrate`);

  let updated = 0;
  for (const flight of flights) {
    const depIata = flight.departureIata || getIataFromName(flight.departureLocation);
    const arrIata = flight.arrivalIata || getIataFromName(flight.arrivalLocation);

    if (depIata || arrIata) {
      await Flight.findByIdAndUpdate(flight._id, {
        departureIata: depIata || flight.departureIata,
        arrivalIata: arrIata || flight.arrivalIata
      });
      updated++;
      console.log(`Updated: ${flight.flightNumber} → ${depIata} to ${arrIata}`);
    }
  }

  console.log(`✅ Migration complete. Updated ${updated} flights.`);
  mongoose.disconnect();
};

migrate().catch(console.error);