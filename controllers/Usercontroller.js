const User = require('../models/user');   // lowercase — your exact filename

// GET /api/auth/me  — get current logged in user profile
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({
            id:       user._id,
            fullName: user.fullName,
            name:     user.fullName,
            email:    user.email,
            createdAt: user.createdAt,
        });
    } catch (err) {
        console.error('GetMe error:', err);
        res.status(500).json({ message: 'Error fetching user profile' });
    }
};

// PATCH /api/auth/me — update profile name
exports.updateMe = async (req, res) => {
    try {
        const { fullName, name } = req.body;
        const newName = fullName || name;
        if (!newName) return res.status(400).json({ message: 'Name is required' });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { fullName: newName },
            { new: true, select: '-password' }
        );
        res.json({ message: 'Profile updated', user: { id: user._id, fullName: user.fullName, name: user.fullName, email: user.email } });
    } catch (err) {
        console.error('UpdateMe error:', err);
        res.status(500).json({ message: 'Error updating profile' });
    }
};