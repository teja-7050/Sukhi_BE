const { Schema, model } = require("mongoose");

const chatSessionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, default: "New Conversation" },
    startMood: { type: String, default: null },
    endMood: { type: String, default: null },
    rating: { type: Number, min: 1, max: 5, default: null },
    feedback: { type: String, default: null },
    ended: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = model("ChatSession", chatSessionSchema);
