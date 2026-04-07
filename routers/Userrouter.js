// routers/userRouter.js
const express = require('express');
const router = express.Router();
// Ensure the filename below matches exactly: userController.js
const userCtrl = require('../controllers/Usercontroller'); 
const authMiddleware = require('../middleware/authMiddleware');

router.get('/profile', authMiddleware, userCtrl.getProfile);
router.put('/profile', authMiddleware, userCtrl.updateProfile);

module.exports = router;