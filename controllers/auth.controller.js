const jwt = require("jsonwebtoken");
const supabase = require("../config/dbconfig");
const CustomError = require("../helpers/CustomError");

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_DAYS = 7;
const COOKIE_MAX_AGE = SESSION_DAYS * 24 * 60 * 60 * 1000; // 7 days in ms

const generateOtp = () => Math.floor(100000 + Math.random() * 900000);

// ─── POST /api/auth/send-otp ──────────────────────────────────
const sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      throw new CustomError(
        "Please provide a valid 10-digit phone number.",
        400,
      );
    }

    // Find or create user
    let { data: user, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();
    if (findError) throw new CustomError(findError.message, 500);

    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({ phone })
        .select()
        .single();
      if (createError) throw new CustomError(createError.message, 500);
      user = newUser;
    }

    // Remove any old OTPs for this user
    await supabase.from("otps").delete().eq("user_id", user.id);

    // Create & save new OTP
    const otpCode = generateOtp();
    const { error: otpError } = await supabase
      .from("otps")
      .insert({
        user_id: user.id,
        otp: otpCode,
        timestamp: new Date().toISOString(),
      });
    if (otpError) throw new CustomError(otpError.message, 500);

    // TODO: In production — send via SMS gateway (Twilio, MSG91, etc.)
    console.log(`📱 OTP for +91${phone}: ${otpCode}`);

    return res.status(200).json({
      success: true,
      message: `OTP sent to +91 ${phone}`,
      // Expose OTP only in development for easy testing
      ...(process.env.NODE_ENV !== "production" && { otp: otpCode }),
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/verify-otp ────────────────────────────────
const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      throw new CustomError("Phone number and OTP are required.", 400);
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();
    if (userError) throw new CustomError(userError.message, 500);
    if (!user) {
      throw new CustomError(
        "User not found. Please request an OTP first.",
        404,
      );
    }

    // Fetch the most recent OTP for this user
    const { data: otpRecord, error: otpFetchError } = await supabase
      .from("otps")
      .select("*")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (otpFetchError) throw new CustomError(otpFetchError.message, 500);
    if (!otpRecord) {
      throw new CustomError("No OTP found. Please request a new one.", 400);
    }

    // Check if OTP has expired
    const otpAge = Date.now() - new Date(otpRecord.timestamp).getTime();
    if (otpAge > OTP_EXPIRY_MS) {
      await supabase.from("otps").delete().eq("user_id", user.id);
      throw new CustomError("OTP has expired. Please request a new one.", 400);
    }

    // Validate OTP value
    if (Number(otp) !== otpRecord.otp) {
      throw new CustomError("Invalid OTP. Please try again.", 400);
    }

    // ✅ OTP is valid — clean up
    await supabase.from("otps").delete().eq("user_id", user.id);

    // Issue a JWT valid for 7 days
    const token = jwt.sign({ _id: user.id }, process.env.JWT_PASSWORD, {
      expiresIn: `${SESSION_DAYS}d`,
    });

    // Persist session in DB (allows multi-device & forced logout)
    const { error: sessionError } = await supabase
      .from("sessions")
      .insert({ user_id: user.id, token });
    if (sessionError) throw new CustomError(sessionError.message, 500);

    // Set JWT in an HTTP-only cookie (safe from JS / XSS)
    res.cookie("jwtToken", token, {
      httpOnly: true, // not accessible via document.cookie
      secure: process.env.NODE_ENV === "production", // HTTPS only in prod
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token, // also returned for localStorage fallback
      user: {
        _id: user.id,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const token =
      req.cookies?.jwtToken || req.headers.authorization?.split(" ")[1];

    if (token) {
      // Remove only this session from DB
      await supabase.from("sessions").delete().eq("token", token);
    }

    res.clearCookie("jwtToken");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      _id: req.user.id,
      phone: req.user.phone,
      role: req.user.role,
    },
  });
};

module.exports = { sendOtp, verifyOtp, logout, getMe };
