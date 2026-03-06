const express = require("express");
const {
  sendOtp,
  verifyOtp,
  logout,
  getMe,
} = require("../controllers/auth.controller");
const { isLoggedIn } = require("../middleware/authentication");

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/logout", isLoggedIn, logout);
router.get("/me", isLoggedIn, getMe); // validate session on app load

module.exports = router;
