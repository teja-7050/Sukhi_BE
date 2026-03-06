const { Schema, model } = require("mongoose");

const chatMessageSchema = new Schema(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = model("ChatMessage", chatMessageSchema);
