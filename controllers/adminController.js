const Booking = require('../models/Booking');

exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Total Activity Count
        const totalBookings = await Booking.countDocuments();
        
        // 2. Popular Routes (Top 5 Arrivals)
        const popularRoutes = await Booking.aggregate([
            { $lookup: { from: 'flights', localField: 'flight', foreignField: '_id', as: 'details' } },
            { $unwind: '$details' },
            { $group: { _id: '$details.arrivalLocation', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // 3. Sales Performance & Trends
        const salesStats = await Booking.aggregate([
            { $match: { paymentStatus: 'Completed' } }, 
            { 
                $lookup: { 
                    from: 'flights', 
                    localField: 'flight', 
                    foreignField: '_id', 
                    as: 'flightInfo' 
                } 
            },
            { $unwind: '$flightInfo' },
            { 
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$flightInfo.price' },
                    avgBookingValue: { $avg: '$flightInfo.price' },
                    completedTransactions: { $sum: 1 }
                }
            }
        ]);

        // 4. Cancellation Rate Calculation
        const cancelledCount = await Booking.countDocuments({ paymentStatus: 'Cancelled' });
        const cancellationRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0;

        res.status(200).json({ 
            totalBookings, 
            popularRoutes,
            salesPerformance: salesStats[0] || { totalRevenue: 0, avgBookingValue: 0, completedTransactions: 0 },
            cancellationRate: `${cancellationRate.toFixed(2)}%`
        });

    } catch (err) {
        res.status(500).json({ 
            message: "Analytics Error", 
            error: err.message 
        });
    }
};