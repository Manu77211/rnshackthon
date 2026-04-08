const jwt = require("jsonwebtoken");
const { query } = require("../config/db");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        code: 401,
        detail: "Missing or invalid Authorization header",
      });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        error: "ServerError",
        code: 500,
        detail: "JWT secret is not configured",
      });
    }

    const decoded = jwt.verify(token, secret);
    const result = await query(
      `
        SELECT id, name, email, role, status, created_at, updated_at
        FROM users
        WHERE id = $1
      `,
      [decoded.userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        code: 401,
        detail: "User not found for this token",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        error: "Forbidden",
        code: 403,
        detail: "Inactive users cannot access this resource",
      });
    }

    req.user = {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      error: "Unauthorized",
      code: 401,
      detail: "Invalid or expired token",
    });
  }
};

module.exports = { protect };
