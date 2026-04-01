const nodemailer = require('nodemailer');

const sendBookingEmail = async (passengerEmail, bookingDetails) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                // These MUST match the names in your .env file
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS  
            },
        });

        const mailOptions = {
            from: `"Flight Booking" <${process.env.EMAIL_USER}>`,
            to: passengerEmail,
            subject: `Booking Confirmed: ${bookingDetails.bookingReference}`,
             html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2>Booking Confirmation</h2>
                    <p>Dear ${bookingDetails.passengerDetails.name},</p>
                    <p>Your flight has been successfully booked! Below are your itinerary details:</p>
                    <hr />
                    <p><strong>Booking Reference:</strong> ${bookingDetails.bookingReference}</p>
                    <p><strong>Airline:</strong> ${bookingDetails.flight.airline}</p>
                    <p><strong>Flight Number:</strong> ${bookingDetails.flight.flightNumber}</p>
                    <p><strong>From:</strong> ${bookingDetails.flight.departureLocation}</p>
                    <p><strong>To:</strong> ${bookingDetails.flight.arrivalLocation}</p>
                    <p><strong>Payment Status:</strong> Completed</p>
                    <hr />
                    <p>Thank you for choosing our service!</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully!");
    } catch (error) {
        // This will print the specific error in your VS Code terminal
        console.error("Email failed to send:", error);
    }
};

module.exports = sendBookingEmail;