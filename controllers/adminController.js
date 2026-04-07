const Booking = require('../models/Booking');
const History = require('../models/History'); 
const CancellationHistory = require('../models/CancellationHistory');


exports.getDashboardStats = async (req, res) => {
    try {
        const totalBookings = await Booking.countDocuments() || 0;
        
        const popularRoutes = await Booking.aggregate([
            { $lookup: { from: 'flights', localField: 'flight', foreignField: '_id', as: 'details' } },
            { $unwind: { path: '$details', preserveNullAndEmptyArrays: true } },
            { $group: { _id: '$details.arrivalLocation', count: { $sum: 1 } } },
            { $match: { _id: { $ne: null } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const salesStats = await Booking.aggregate([
            { $match: { paymentStatus: 'Completed' } }, 
            { $lookup: { from: 'flights', localField: 'flight', foreignField: '_id', as: 'flightInfo' } },
            { $unwind: { path: '$flightInfo', preserveNullAndEmptyArrays: false } },
            { 
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$flightInfo.price' },
                    avgBookingValue: { $avg: '$flightInfo.price' },
                    completedTransactions: { $sum: 1 }
                }
            }
        ]);

        const cancelledCount = await Booking.countDocuments({ paymentStatus: 'Cancelled' });
        const cancellationRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0;

        res.status(200).json({ 
            totalBookings, 
            popularRoutes: popularRoutes.length > 0 ? popularRoutes : [],
            salesPerformance: salesStats[0] || { totalRevenue: 0, avgBookingValue: 0, completedTransactions: 0 },
            cancellationRate: `${cancellationRate.toFixed(2)}%`,
            cancelledAmount: (await Booking.countDocuments({ paymentStatus: 'Cancelled' })) * 500 // Example logic
        });
    } catch (err) {
        res.status(500).json({ message: "Analytics Error", error: err.message });
    }
};

exports.getAllCancellationHistory = async (req, res) => {
    try {
        const history = await CancellationHistory.find().sort({ cancelledAt: -1 });
        res.status(200).json(history);
    } catch (err) {
        res.status(500).json({ message: "Error fetching cancellation history" });
    }
};


exports.getGlobalHistory = async (req, res) => {
    try {
        const allHistory = await History.find()
            .populate('userId', 'name email')
            .sort({ timestamp: -1 }); 
        res.status(200).json(allHistory);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch history", error: err.message });
    }
};