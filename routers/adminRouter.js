const express = require('express');
const router = express.Router();

// 1. Log this to see if it's undefined
const adminController = require('../controllers/adminController');
console.log("Admin Controller Import:", adminController); 

// 2. This is where the crash happens if getDashboardStats is missing
const { getDashboardStats } = adminController;

if (typeof getDashboardStats !== 'function') {
    console.error("CRITICAL: getDashboardStats is not a function!");
}

router.get('/dashboard', getDashboardStats);

module.exports = router;