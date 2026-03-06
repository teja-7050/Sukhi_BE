const { Schema, model } = require("mongoose");

// ─── Session Sub-Schema ───────────────────────────────────────
const sessionSchema = new Schema({
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ─── User Schema ──────────────────────────────────────────────
const userSchema = new Schema(
  {
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    sessions: [sessionSchema],
  },
  { timestamps: true },
);

const User = model("User", userSchema);
module.exports = User;
