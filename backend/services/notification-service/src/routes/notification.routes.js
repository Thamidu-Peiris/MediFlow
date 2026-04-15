const express = require("express");
const { sendNotification } = require("../controllers/notification.controller");

const router = express.Router();

router.post("/send", sendNotification);

module.exports = router;
