const Booking     = require('../models/Booking');
const Flight      = require('../models/Flight');
const ActivityLog = require('../models/Activitylog');
const sendEmail   = require('../utils/sendEmail');
const { paymentConfirmationEmail, cancellationEmail } = require('../utils/emailTemplates');
const { jsPDF }   = require('jspdf');
require('jspdf-autotable');

const generateBookingRef = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const logActivity = async (data) => {
  try { await ActivityLog.create(data); }
  catch (e) { console.warn('[ActivityLog] skip:', e.message); }
};

// Logic for POST /reserve
// controllers/bookingController.js

// controllers/bookingController.js

const createBooking = async (req, res) => {
  try {
    // 1. Destructure everything sent from the frontend
    const { 
      flightId, 
      passengerDetails, // for nested objects
      passengerName,    // from your React formData
      passengerEmail,   // from your React formData
      passengers, 
      seatPreference, 
      bookingClass 
    } = req.body;

    const userId = req.user?.id || req.user?._id;

    // 2. Resolve the name and email (checks both formats)
    const finalName = passengerName || passengerDetails?.name;
    const finalEmail = passengerEmail || passengerDetails?.email;

    // 3. Strict Validation
    if (!flightId) {
      return res.status(400).json({ message: 'Flight ID is required' });
    }
    
    if (!finalName || !finalEmail) {
      return res.status(400).json({ 
        message: 'Passenger name and email are required',
        received: { finalName, finalEmail } // Helpful for debugging
      });
    }

    // 4. Find Flight
    const flight = await Flight.findById(flightId);
    if (!flight) {
      return res.status(404).json({ message: 'Flight not found' });
    }

    const requestedSeats = Number(passengers) || 1;
    if (flight.seatsAvailable < requestedSeats) {
      return res.status(400).json({ message: 'Not enough seats available' });
    }

    // 5. Update Flight Inventory
    flight.seatsAvailable = Math.max(0, flight.seatsAvailable - requestedSeats);
    await flight.save();

    // 6. Create Booking (matches your MongoDB Schema)
    const booking = await Booking.create({
      user: userId,
      flight: flightId,
      passengerDetails: {
        name: finalName.trim(),
        email: finalEmail.trim().toLowerCase(),
      },
      passengers: requestedSeats,
      seatPreference: seatPreference || 'Window',
      bookingClass: bookingClass || 'Economy',
      bookingReference: generateBookingRef(),
      paymentStatus: 'Pending',
    });

    // Populate flight info for the response
    await booking.populate('flight');

    // 7. Success Response
    return res.status(201).json({
      message: "Booking reserved successfully",
      itinerary: booking // Ensure this matches your frontend 'response.data.itinerary' check
    });

  } catch (err) {
    console.error('[createBooking Error]:', err.message);
    return res.status(500).json({ 
      message: 'Internal Server Error during reservation', 
      error: err.message 
    });
  }
};

// Logic for GET /my-history
const getMyBookings = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const bookings = await Booking.find({ user: userId }).populate('flight');
    return res.status(200).json(bookings);
  } catch (err) {
    return res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

// Logic for DELETE /cancel/:id
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    return res.status(200).json({ message: 'Cancelled successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Cancel failed' });
  }
};

// Logic for PATCH /update/:id
const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.status(200).json(booking);
  } catch (err) {
    return res.status(500).json({ message: 'Update failed' });
  }
}


// Placeholder for Stats
const getBookingStats = async (req, res) => {
    return res.status(200).json({ message: "Stats feature coming soon" });
};
// Logic for GET /download/:id
const downloadItinerary = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('flight');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const doc = new jsPDF();

    // 1. Add Blue Header Background
    doc.setFillColor(41, 98, 255); // A nice blue color
    doc.rect(0, 0, 210, 40, 'F');

    // 2. Add Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('FLIGHT ITINERARY', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Flight Booking & Reservation System', 105, 30, { align: 'center' });

    // 3. Booking Reference Box
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(15, 45, 180, 12, 2, 2, 'F');
    doc.setTextColor(41, 98, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Booking Reference: ${booking.bookingReference}`, 105, 53, { align: 'center' });

    // 4. Create the Details Table
    const tableData = [
      ['Passenger Name', booking.passengerDetails?.name || 'N/A'],
      ['Passenger Email', booking.passengerDetails?.email || 'N/A'],
      ['Airline', booking.flight?.airline || 'N/A'],
      ['Flight No', booking.flight?.flightNumber || 'N/A'],
      ['From', booking.flight?.origin || 'N/A'],
      ['To', booking.flight?.destination || 'N/A'],
      ['Fare Amount', `INR ${booking.flight?.price || '0'}`],
      ['Seat Preference', booking.seatPreference || 'Window'],
      ['Payment Status', booking.paymentStatus || 'COMPLETED'],
      ['Confirmed On', new Date(booking.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
      })]
    ];

    doc.autoTable({
      startY: 65,
      head: [['Description', 'Details']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: 50 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: 15, right: 15 }
    });

    // 5. Footer Note
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text('This is a computer-generated document. No signature is required.', 105, finalY, { align: 'center' });

    // 6. Send the PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Itinerary_${booking.bookingReference}.pdf`
    });
    
    return res.send(pdfBuffer);

  } catch (err) {
    console.error('PDF Generation Error:', err);
    return res.status(500).json({ message: 'PDF Error', error: err.message });
  }
};
module.exports = { 
    createBooking, 
    getMyBookings, 
    cancelBooking, 
    updateBooking, 
    downloadItinerary, 
    getBookingStats 
};