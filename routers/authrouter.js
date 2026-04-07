const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);


router.get('/all', authMiddleware, authController.getAllUsers);
router.get('/:id', authMiddleware, authController.getUserById);
router.put('/:id', authMiddleware, authController.updateUser);
router.delete('/:id', authMiddleware, authController.deleteUser);

module.exports = router;