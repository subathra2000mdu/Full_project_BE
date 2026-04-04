const mongoose = require('mongoose');

const FlightSchema = new mongoose.Schema({
  airline: { type: String, required: true },
  flightNumber: { type: String, required: true, unique: true }, 
  departureLocation: { type: String, required: true },  
  arrivalLocation: { type: String, required: true },    
  departureIata: { type: String }, 
  arrivalIata: { type: String },   
  departureTime: { type: Date, required: true },      
  price: { type: Number, default: 5000 },            
  seatsAvailable: { type: Number, default: 75 },   
  status: { type: String, default: 'scheduled' }        
}, { timestamps: true });

module.exports = mongoose.model('Flight', FlightSchema);