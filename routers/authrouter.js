const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { 
    register, login, getAllUsers, getUserById, updateUser, deleteUser 
} = require("../controllers/authcontroller");


router.post("/register", register);
router.post("/login", login);
router.get("/users", authMiddleware, getAllUsers);
router.get("/users/:id", authMiddleware, getUserById);
router.put("/users/:id", authMiddleware, updateUser);
router.delete("/users/:id", authMiddleware, deleteUser);

module.exports = router;