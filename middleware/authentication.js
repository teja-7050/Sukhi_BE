const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");
const CustomError = require("../helpers/CustomError.js");

const isLoggedIn = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    else if (req.cookies?.jwtToken) {
      token = req.cookies.jwtToken;
    }

    if (!token) {
      throw new CustomError("Unauthorized!", 401);
    }
    if (!token) {
      throw new CustomError("Unauthorized!", 401);
    }
    const tokenDetails = jwt.verify(token, process.env.JWT_PASSWORD);

    const user = await User.findById(tokenDetails._id);
    if (!user || !user.sessions.some((session) => session.token === token)) {
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
    const user = await User.findById(req?.user?._id);

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
