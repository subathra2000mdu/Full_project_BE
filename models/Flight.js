const mongoose = require('mongoose');

const FlightSchema = new mongoose.Schema({
  airline: { type: String, required: true },
  flightNumber: { type: String, required: true, unique: true }, 
  departureLocation: { type: String, required: true },  
  arrivalLocation: { type: String, required: true },    
  departureTime: { type: Date, required: true },      
  arrivalTime: { type: Date },       
  price: { type: Number, required: true, default: 5000 },            
  bookingClass: { type: String, enum: ['Economy', 'Business', 'First'], default: 'Economy' }, 
  seatsAvailable: { type: Number, required: true, default: 75 },   
  status: { type: String, default: 'scheduled' }        
}, { timestamps: true });

module.exports = mongoose.model('Flight', FlightSchema);