const nodemailer = require('nodemailer');

const sendBookingEmail = async (passengerEmail, bookingDetails) => {
    // FIX: Define transporter outside the try block [Ref: image_26c843.png]
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_PASS  
        },
    });

    try {
        const status = bookingDetails?.paymentStatus;
        
        // Dynamic content based on status
        let statusText = "Booking Confirmation";
        let message = "Your flight has been successfully booked! See your itinerary below:";
        let headerColor = "#007bff"; // Blue for Booking

        if (status === 'Cancelled') {
            statusText = "Cancellation Confirmed";
            message = "Your flight reservation has been successfully cancelled. Cancellation details are below:";
            headerColor = "#d9534f"; // Red for Cancellation
        } else if (status === 'Completed') {
            statusText = "Payment Received";
            message = "We have successfully received your payment. Your booking is now fully confirmed:";
            headerColor = "#28a745"; // Green for Payment
        }

        const mailOptions = {
            from: `"Flight Booking" <${process.env.EMAIL_USER}>`,
            to: passengerEmail,
            subject: `${statusText}: ${bookingDetails?.bookingReference || 'Update'}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px;">
                    <h2 style="color: ${headerColor}; border-bottom: 2px solid ${headerColor}; padding-bottom: 10px;">${statusText}</h2>
                    <p>Dear <strong>${bookingDetails?.passengerDetails?.name || 'Customer'}</strong>,</p>
                    <p>${message}</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
                        <p><strong>Booking Reference:</strong> ${bookingDetails?.bookingReference || 'N/A'}</p>
                        <p><strong>Airline:</strong> ${bookingDetails?.flight?.airline || 'N/A'}</p>
                        <p><strong>Flight Number:</strong> ${bookingDetails?.flight?.flightNumber || 'N/A'}</p>
                        <hr />
                        <p><strong>From:</strong> ${bookingDetails?.flight?.departureLocation || 'N/A'}</p>
                        <p><strong>To:</strong> ${bookingDetails?.flight?.arrivalLocation || 'N/A'}</p>
                        <p><strong>Total Amount:</strong> ₹${bookingDetails?.flight?.price || '0.00'}</p>
                        <p><strong>Current Status:</strong> <span style="font-weight:bold; color:${headerColor};">${status}</span></p>
                    </div>
                    
                    <p style="margin-top: 20px;">Thank you for choosing our service!</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email for status [${status}] sent successfully to ${passengerEmail}`);
    } catch (error) {
        // Fix: Prevents crash if 'name' is missing [Ref: image_f30ca2.png]
        console.error("Email failed to send:", error.message);
    }
};

module.exports = sendBookingEmail;