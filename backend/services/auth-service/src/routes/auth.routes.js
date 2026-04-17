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
  getUserById,
  updateUser,
  deleteUser,
  verifyDoctor,
  changePassword
} = require("../controllers/auth.controller");
const { verifyAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.patch("/change-password", verifyAuth, changePassword);
router.post("/admin/bootstrap", bootstrapAdmin);
router.get("/me", verifyAuth, me);
router.get("/admin/overview", verifyAuth, requireAdmin, adminOverview);
router.get("/admin/users", verifyAuth, requireAdmin, listUsers);
router.get("/admin/users/:id", verifyAuth, requireAdmin, getUserById);
router.patch("/admin/users/:id", verifyAuth, requireAdmin, updateUser);
router.delete("/admin/users/:id", verifyAuth, requireAdmin, deleteUser);
router.patch("/admin/doctors/:id/verify", verifyAuth, requireAdmin, verifyDoctor);

module.exports = router;
