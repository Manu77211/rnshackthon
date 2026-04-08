const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";

  if (!secret) {
    throw new Error("JWT_SECRET is not configured in environment variables");
  }

  return jwt.sign({ userId }, secret, { expiresIn });
};

module.exports = generateToken;
