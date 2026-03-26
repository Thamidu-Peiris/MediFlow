const express = require("express");
const {
    createSession,
    getSession,
    getSessionByRoom,
    listMySessions,
    startSession,
    endSession,
    addNotes
} = require("../controllers/session.controller");
const { verifyAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", verifyAuth, createSession);
router.get("/my", verifyAuth, listMySessions);
router.get("/room/:roomId", verifyAuth, getSessionByRoom);
router.get("/:id", verifyAuth, getSession);
router.patch("/:id/start", verifyAuth, startSession);
router.patch("/:id/end", verifyAuth, endSession);
router.patch("/:id/notes", verifyAuth, addNotes);

module.exports = router;
