const Booking = require('../models/Booking');

exports.getDashboardStats = async (req, res) => {
    try {
        const totalBookings = await Booking.countDocuments();
        
        const popularRoutes = await Booking.aggregate([
            { $lookup: { from: 'flights', localField: 'flight', foreignField: '_id', as: 'details' } },
            { $unwind: '$details' },
            { $group: { _id: '$details.arrivalLocation', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.status(200).json({ totalBookings, popularRoutes });
    } catch (err) {
        res.status(500).json({ message: "Analytics Error" });
    }
};