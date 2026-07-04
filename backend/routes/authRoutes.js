const express = require("express");
const { protect } = require("../middlewares/protectApi");
const {
  register,
  login,
  logout,
  refreshToken,
  googleLogin,
  forgotPassword,
  resetPassword,
  setPin,
  verifyPin,
  changePassword,
  setPassword,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);
router.post("/google", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.use(protect);

router.post("/pin/set", setPin);
router.post("/pin/verify", verifyPin);
router.post("/change-password", changePassword);
router.post("/set-password", setPassword);

module.exports = router;