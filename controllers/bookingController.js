const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default; 
const Booking = require('../models/Booking');
const History = require('../models/History');
const sendBookingEmail = require('../utils/emailService');

exports.createBooking = async (req, res) => {
    try {
        const { flightId, passengerName, passengerEmail, seatPreference } = req.body;
        const newBooking = new Booking({
            user: req.user.id,
            flight: flightId,
            passengerDetails: {
                name: passengerName || req.user.name,
                email: passengerEmail || req.user.email
            },
            seatPreference
        });
        await newBooking.save();
        await History.create({
            userId: req.user.id,
            bookingId: newBooking._id,
            action: 'Created',
            details: { status: 'Pending' }
        });
        const confirmed = await Booking.findById(newBooking._id).populate('flight');
        res.status(201).json({ message: "Reservation Successful", itinerary: confirmed });
    } catch (err) {
        res.status(400).json({ message: "Booking Failed", error: err.message });
    }
};


exports.updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus } = req.body;

        const updatedBooking = await Booking.findByIdAndUpdate(
            id, 
            { paymentStatus }, 
            { new: true }
        ).populate('flight');

        if (!updatedBooking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        await sendBookingEmail(updatedBooking.passengerDetails.email, updatedBooking);

        res.status(200).json({ 
            message: `Update successful. Email sent for status: ${paymentStatus}`, 
            updatedBooking 
        });
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ message: "Update failed", error: err.message });
    }
};

exports.getMyBookings = async (req, res) => {
    try {
        const history = await Booking.find({ user: req.user.id }).populate('flight');
        res.status(200).json(history);
    } catch (err) {
        res.status(500).json({ message: "Fetch Failed" });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const deletedBooking = await Booking.findByIdAndDelete(bookingId);
        if (!deletedBooking) return res.status(404).json({ message: "Booking not found" });
        res.status(200).json({ message: "Booking cancelled successfully", cancelledId: bookingId });
    } catch (err) {
        res.status(500).json({ message: "Cancellation Failed", error: err.message });
    }
};

exports.getBookingStats = async (req, res) => {
    try {
        const total = await Booking.countDocuments();
        res.status(200).json({ totalBookings: total });
    } catch (err) {
        res.status(500).json({ message: "Stats Failed" });
    }
};

exports.downloadItinerary = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('flight');
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.setTextColor(40, 116, 240); 
        doc.text("FLIGHT ITINERARY", 105, 20, { align: "center" });
        
        const tableData = [
            ["Booking Ref", booking.bookingReference || "N/A"],
            ["Passenger", booking.passengerDetails?.name || "N/A"],
            ["Airline", booking.flight?.airline || "N/A"],
            ["Flight No", booking.flight?.flightNumber || "N/A"],
            ["From", booking.flight?.departureLocation || "N/A"],
            ["To", booking.flight?.arrivalLocation || "N/A"],
            ["Fare Amount", `INR ${booking.flight?.price || "0"}`],
            ["Payment Status", (booking.paymentStatus || "Pending").toUpperCase()],
            // FIX: Use new Date() to ensure "today's date" is always valid
            ["Confirmed On", new Date().toLocaleDateString('en-GB')] 
        ];

        autoTable(doc, {
            startY: 40,
            head: [['Description', 'Details']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 123, 255] },
            styles: { fontSize: 12, cellPadding: 5 }
        });

        const pdfOutput = doc.output("arraybuffer");
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=itinerary_${booking.bookingReference}.pdf`);
        res.send(Buffer.from(pdfOutput));

    } catch (err) {
        console.error("PDF Generation Error:", err);
        res.status(500).json({ message: "PDF Generation Failed" });
    }
};