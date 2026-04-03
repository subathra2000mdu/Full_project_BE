const Booking = require('../models/Booking');
const sendBookingEmail = require('../utils/emailService');
const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;

// POST /api/auth/payments/create-intent
exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, bookingId } = req.body;
        if (!bookingId) return res.status(400).json({ message: "bookingId is required" });

        const mockClientSecret = `pi_mock_${Math.random().toString(36).substring(7)}_secret_${bookingId}`;

        res.status(200).json({
            clientSecret: mockClientSecret,
            message: "Development Mode: Payment Intent Simulated Successfully",
            amount: amount
        });
    } catch (err) {
        res.status(500).json({ message: "Payment Simulation Failed", error: err.message });
    }
};

// POST /api/auth/payments/confirm
exports.confirmPaymentStatus = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ message: "bookingId is required" });
        }

        // 1. Update status
        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { paymentStatus: 'Completed' },
            { new: true }
        ).populate('flight');

        if (!updatedBooking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // 2. Generate PDF automatically on the server
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.setTextColor(40, 116, 240); 
        doc.text("FLIGHT ITINERARY", 105, 20, { align: "center" });

        const tableData = [
            ["Booking Ref", updatedBooking.bookingReference || updatedBooking._id.toString().toUpperCase()],
            ["Passenger", updatedBooking.passengerDetails?.name || "N/A"],
            ["Airline", updatedBooking.flight?.airline || "N/A"],
            ["Flight No", updatedBooking.flight?.flightNumber || "N/A"],
            ["From", updatedBooking.flight?.departureLocation || "N/A"],
            ["To", updatedBooking.flight?.arrivalLocation || "N/A"],
            ["Fare Amount", `INR ${updatedBooking.flight?.price || "0"}`],
            ["Payment Status", "COMPLETED"],
            ["Confirmed On", new Date().toLocaleDateString('en-GB')]
        ];

        autoTable(doc, {
            startY: 40,
            head: [['Description', 'Details']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 123, 255] }
        });

        // Convert PDF to Buffer for NodeMailer
        const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

        // 3. Send email with the generated PDF as an attachment
        // Ensure your emailService.js accepts (email, bookingData, attachmentBuffer)
        await sendBookingEmail(updatedBooking.passengerDetails.email, updatedBooking, pdfBuffer);

        res.status(200).json({
            message: "Payment successful and Confirmation Email with PDF Sent!",
            booking: updatedBooking
        });
    } catch (err) {
        console.error("Confirmation Error:", err);
        res.status(500).json({ message: "Confirmation Error", error: err.message });
    }
};