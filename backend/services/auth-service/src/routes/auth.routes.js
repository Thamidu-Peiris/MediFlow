const express = require("express");
const {
  register,
  login,
  me,
  logout,
  forgotPassword,
  resetPassword,
  bootstrapAdmin,
  adminOverview,
  listUsers,
  verifyDoctor
} = require("../controllers/auth.controller");
const { verifyAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/admin/bootstrap", bootstrapAdmin);
router.get("/me", verifyAuth, me);
router.get("/admin/overview", verifyAuth, requireAdmin, adminOverview);
router.get("/admin/users", verifyAuth, requireAdmin, listUsers);
router.patch("/admin/doctors/:id/verify", verifyAuth, requireAdmin, verifyDoctor);

module.exports = router;
