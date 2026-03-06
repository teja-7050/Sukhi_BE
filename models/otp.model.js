const { Schema, model } = require("mongoose");
const otpModel = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  otp: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    get: (timestamp) => timestamp.getTime(),
    set: (timestamp) => new Date(timestamp),
  },
});
const Otp = model("Otp", otpModel);
module.exports = Otp;
