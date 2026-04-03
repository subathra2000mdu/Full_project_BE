const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, 
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, 
        },
       
        connectionTimeout: 10000, 
        socketTimeout: 30000,
    });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildEmailHTML = (booking, isCancel = false) => {
    const status = (booking.paymentStatus || 'Pending').toUpperCase();
    const passenger = booking.passengerDetails?.name || 'Passenger';
    const email = booking.passengerDetails?.email || '';
    const airline = booking.flight?.airline || 'N/A';
    const flightNum = booking.flight?.flightNumber || 'N/A';
    const from = booking.flight?.departureLocation || 'N/A';
    const to = booking.flight?.arrivalLocation || 'N/A';
    const price = booking.flight?.price ? `₹${Number(booking.flight.price).toLocaleString('en-IN')}` : 'N/A';
    const ref = booking.bookingReference || booking._id?.toString().slice(-8).toUpperCase() || 'N/A';
    const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const headerColor = isCancel ? '#dc2626' : '#2563eb';
    const statusColor = isCancel ? '#dc2626' : '#16a34a';
    const statusBg = isCancel ? '#fef2f2' : '#f0fdf4';
    const headerSub = isCancel ? 'Your booking has been cancelled.' : 'Your flight has been booked successfully.';

    return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:sans-serif;">
        <table width="100%" style="background:#f1f5f9;padding:20px;">
            <tr>
                <td align="center">
                    <table width="600" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="background:${headerColor};padding:30px;text-align:center;color:#fff;">
                                <h2 style="margin:0;">Flight Booking System</h2>
                                <p style="margin:5px 0 0;">${headerSub}</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:30px;">
                                <div style="text-align:center;margin-bottom:20px;">
                                    <span style="background:${statusBg};color:${statusColor};padding:8px 20px;border-radius:20px;font-weight:bold;border:1px solid ${statusColor};">
                                        ${status}
                                    </span>
                                </div>
                                <p>Dear <strong>${passenger}</strong>,</p>
                                <p>Booking Reference: <strong>#${ref}</strong></p>
                                <table width="100%" style="border-collapse:collapse;margin-top:20px;">
                                    <tr style="background:#f8fafc;"><td style="padding:10px;border:1px solid #e2e8f0;">Flight</td><td style="padding:10px;border:1px solid #e2e8f0;">${flightNum} (${airline})</td></tr>
                                    <tr><td style="padding:10px;border:1px solid #e2e8f0;">From</td><td style="padding:10px;border:1px solid #e2e8f0;">${from}</td></tr>
                                    <tr style="background:#f8fafc;"><td style="padding:10px;border:1px solid #e2e8f0;">To</td><td style="padding:10px;border:1px solid #e2e8f0;">${to}</td></tr>
                                    <tr><td style="padding:10px;border:1px solid #e2e8f0;">Amount Paid</td><td style="padding:10px;border:1px solid #e2e8f0;">${price}</td></tr>
                                </table>
                                <p style="margin-top:30px;font-size:12px;color:#64748b;text-align:center;">
                                    This is an automated message. Please do not reply.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>`;
};

const sendBookingEmail = async (toEmail, booking) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ EMAIL_USER or EMAIL_PASS environment variables are missing!');
        return;
    }

    const isCancel = booking.paymentStatus === 'Cancelled';
    const ref = booking.bookingReference || booking._id?.toString().slice(-8).toUpperCase();
    
    const mailOptions = {
        from: `"Flight Booking" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: isCancel ? `Booking Cancelled — #${ref}` : `Booking Confirmed — #${ref} ✅`,
        html: buildEmailHTML(booking, isCancel),
    };

    
    for (let i = 1; i <= 3; i++) {
        try {
            const transporter = createTransporter();
            await transporter.verify();
            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ Email sent successfully to ${toEmail} (Attempt ${i})`);
            return info;
        } catch (err) {
            console.error(`❌ Email Attempt ${i} failed: ${err.message}`);
            if (i < 3) await wait(2000);
            else console.error('❌ All email retries exhausted.');
        }
    }
};

module.exports = sendBookingEmail;