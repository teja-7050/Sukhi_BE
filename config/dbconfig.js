const mongoose = require("mongoose");

const connectToDB = async () => {
  try {
    await mongoose.connect(`mongodb://localhost:27017/sukhi`);
    console.log("✅ MongoDB Connected Successfully!");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};
module.exports = connectToDB;
