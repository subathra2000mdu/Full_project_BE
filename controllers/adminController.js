const Booking = require('../models/Booking');
const History = require('../models/History');
const CancellationHistory = require('../models/CancellationHistory');

// 1. Get Dashboard Statistics
exports.getDashboardStats = async (req, res) => {
    try {
        // Total Activity Count
        const totalBookings = await Booking.countDocuments();
        
        // Popular Routes (Aggregating destinations)
        const popularRoutes = await Booking.aggregate([
            { $lookup: { from: 'flights', localField: 'flight', foreignField: '_id', as: 'details' } },
            { $unwind: '$details' },
            { $group: { _id: '$details.arrivalLocation', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Sales Performance (Completed payments only)
        const salesStats = await Booking.aggregate([
            { $match: { paymentStatus: 'Completed' } }, 
            { $lookup: { from: 'flights', localField: 'flight', foreignField: '_id', as: 'flightInfo' } },
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

        // Cancellation Rate Calculation
        const cancelledCount = await Booking.countDocuments({ paymentStatus: 'Cancelled' });
        const cancellationRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0;

        // Cancelled Revenue Logic (Calculating lost value)
        const cancelledStats = await Booking.aggregate([
            { $match: { paymentStatus: 'Cancelled' } },
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
                    totalCancelledAmount: { $sum: '$flightInfo.price' }
                }
            }
        ]);

        // Final Consolidated Response
        res.status(200).json({ 
            totalBookings, 
            popularRoutes,
            salesPerformance: salesStats[0] || { totalRevenue: 0, avgBookingValue: 0, completedTransactions: 0 },
            cancellationRate: `${cancellationRate.toFixed(2)}%`,
            cancelledAmount: cancelledStats[0]?.totalCancelledAmount || 0 
        });

    } catch (err) {
        res.status(500).json({ 
            message: "Analytics Error", 
            error: err.message 
        });
    }
};

// 2. Get All Cancellation Specific Records
exports.getAllCancellationHistory = async (req, res) => {
    try {
        const history = await CancellationHistory.find().sort({ cancelledAt: -1 });
        res.status(200).json(history);
    } catch (err) {
        res.status(500).json({ message: "Error fetching cancellation history" });
    }
};

// 3. Get Global Audit Logs (Visible histories in DB)
exports.getGlobalHistory = async (req, res) => {
    try {
        const allHistory = await History.find()
            .populate('userId', 'name email')
            .sort({ timestamp: -1 });

        res.status(200).json(allHistory);
    } catch (err) {
        res.status(500).json({ message: "Could not fetch history logs" });
    }
};