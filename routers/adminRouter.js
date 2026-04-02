const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
console.log("Admin Controller Import:", adminController); 

const { getDashboardStats, getGlobalHistory } = require('../controllers/adminController');

if (typeof getDashboardStats !== 'function') {
    console.error("CRITICAL: getDashboardStats is not a function!");
}

if (adminController && adminController.getGlobalHistory) {
    router.get('/history', adminController.getGlobalHistory);
} else {
    console.error("CRITICAL: getGlobalHistory function missing in adminController");
}

router.get('/dashboard', getDashboardStats);
router.get('/history', getGlobalHistory);

module.exports = router;