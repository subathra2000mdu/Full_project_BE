const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const generatePDF = async (booking) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const snap = booking.flightSnapshot || {};

            doc.setFillColor(30, 64, 175);
            doc.rect(0, 0, 210, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Flight Booking Receipt', 105, 18, { align: 'center' });

            doc.setFillColor(239, 246, 255);
            doc.rect(0, 30, 210, 12, 'F');
            doc.setTextColor(30, 64, 175);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Booking Reference: ${booking.bookingReference}`, 15, 38);
            const dateStr = booking.paymentCompletedAt
                ? new Date(booking.paymentCompletedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                : new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
            doc.text(`Date: ${dateStr}`, 195, 38, { align: 'right' });

            const isPaid = booking.paymentStatus === 'Completed';
            doc.setFillColor(isPaid ? 16 : 220, isPaid ? 185 : 38, isPaid ? 129 : 38);
            doc.roundedRect(155, 42, 40, 10, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(isPaid ? 'CONFIRMED' : (booking.bookingStatus || '').toUpperCase(), 175, 48.5, { align: 'center' });

            doc.setTextColor(30, 30, 30);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Passenger Details', 15, 62);
            doc.setDrawColor(200, 200, 200);
            doc.line(15, 64, 195, 64);

            doc.autoTable({
                startY: 67,
                head: [['Field', 'Value']],
                body: [
                    ['Passenger Name',  booking.passengerName  || 'N/A'],
                    ['Email',           booking.passengerEmail || 'N/A'],
                    ['Seat Preference', booking.seatPreference || 'N/A'],
                    ['Booking Class',   booking.bookingClass   || 'N/A'],
                    ['Passengers',      String(booking.passengers || 1)],
                ],
                headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                margin: { left: 15, right: 15 },
            });

            const y2 = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
            doc.text('Flight Details', 15, y2);
            doc.line(15, y2 + 2, 195, y2 + 2);

            doc.autoTable({
                startY: y2 + 5,
                head: [['Field', 'Details']],
                body: [
                    ['Flight Number', snap.flightNumber  || 'N/A'],
                    ['Airline',       snap.airline        || 'N/A'],
                    ['From',          snap.from           || 'N/A'],
                    ['To',            snap.to             || 'N/A'],
                    ['Date',          snap.departureDate  || 'N/A'],
                    ['Departure',     snap.departureTime  || 'N/A'],
                    ['Arrival',       snap.arrivalTime    || 'N/A'],
                    ['Duration',      snap.duration       || 'N/A'],
                ],
                headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                margin: { left: 15, right: 15 },
            });

            const y3 = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
            doc.text('Payment Summary', 15, y3);
            doc.line(15, y3 + 2, 195, y3 + 2);

            doc.autoTable({
                startY: y3 + 5,
                head: [['Field', 'Details']],
                body: [
                    ['Payment Method', booking.paymentMethod || 'N/A'],
                    ['Payment Status', booking.paymentStatus || 'N/A'],
                    ['Total Amount',   `Rs. ${(booking.totalAmount || 0).toLocaleString('en-IN')}`],
                ],
                headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                margin: { left: 15, right: 15 },
            });

            const y4 = doc.lastAutoTable.finalY + 8;
            doc.setFillColor(30, 64, 175);
            doc.rect(120, y4, 75, 14, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(13); doc.setFont('helvetica', 'bold');
            doc.text(`Total Paid: Rs. ${(booking.totalAmount || 0).toLocaleString('en-IN')}`, 157, y4 + 9, { align: 'center' });

            doc.setFillColor(245, 247, 255);
            doc.rect(0, 275, 210, 22, 'F');
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(8); doc.setFont('helvetica', 'normal');
            doc.text('Thank you for booking with us! This is a computer-generated receipt.', 105, 283, { align: 'center' });
            doc.text('For support: support@flightbooking.com', 105, 289, { align: 'center' });

            resolve(Buffer.from(doc.output('arraybuffer')));
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = generatePDF;