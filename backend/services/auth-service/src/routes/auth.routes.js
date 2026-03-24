const express = require("express");
const {
  register,
  login,
  me,
  logout,
  forgotPassword,
  resetPassword
} = require("../controllers/auth.controller");
const { verifyAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", verifyAuth, me);

module.exports = router;
