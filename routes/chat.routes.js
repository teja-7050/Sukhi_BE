const express = require("express");
const {
  chat,
  getSessions,
  createSession,
  getSessionMessages,
  deleteSession,
  endSession,
  getSuggestions,
} = require("../controllers/chat.controller");
const { isLoggedIn } = require("../middleware/authentication");

const router = express.Router();

router.get("/sessions", isLoggedIn, getSessions);
router.post("/sessions", isLoggedIn, createSession);
router.delete("/sessions/:id", isLoggedIn, deleteSession);
router.post("/sessions/:id/end", isLoggedIn, endSession);
router.get("/sessions/:id/messages", isLoggedIn, getSessionMessages);
router.post("/suggestions", isLoggedIn, getSuggestions);
router.post("/", isLoggedIn, chat);

module.exports = router;
