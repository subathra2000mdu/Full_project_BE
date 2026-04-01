const mongoose = require('mongoose');

const FlightSchema = new mongoose.Schema({
  airline: { type: String, required: true },
  flightNumber: { type: String, required: true },
  departureLocation: { type: String, required: true },  
  arrivalLocation: { type: String, required: true },    
  departureTime: { type: Date, required: true },      
  arrivalTime: { type: Date, required: true },        
  price: { type: Number, required: true },            
  bookingClass: { type: String, enum: ['Economy', 'Business', 'First'], default: 'Economy' }, 
  seatsAvailable: { type: Number, required: true },   
  status: { type: String, default: 'On Time' }        
});

module.exports = mongoose.model('Flight', FlightSchema);