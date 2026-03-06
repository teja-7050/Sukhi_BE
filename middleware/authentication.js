const jwt = require("jsonwebtoken");
const supabase = require("../config/dbconfig.js");
const CustomError = require("../helpers/CustomError.js");

const isLoggedIn = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.jwtToken) {
      token = req.cookies.jwtToken;
    }

    if (!token) {
      throw new CustomError("Unauthorized!", 401);
    }
    const tokenDetails = jwt.verify(token, process.env.JWT_PASSWORD);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", tokenDetails._id)
      .maybeSingle();
    if (userError || !user) {
      throw new CustomError("Invalid session", 401);
    }

    // Check session still exists in DB
    const { data: session } = await supabase
      .from("sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("token", token)
      .maybeSingle();
    if (!session) {
      throw new CustomError("Invalid session", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in authenticating user", error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", req.user?.id)
      .maybeSingle();

    if (!user || user.role !== "admin") {
      return next(new CustomError("Unauthorized!", 401));
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  isLoggedIn,
  isAdmin,
};
