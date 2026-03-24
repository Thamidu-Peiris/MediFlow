const express = require("express");
const { register, login, me } = require("../controllers/auth.controller");
const { verifyAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyAuth, me);

module.exports = router;
