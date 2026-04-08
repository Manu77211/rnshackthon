const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const generateToken = require("../utils/generateToken");

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, status } = req.body;

    const normalizedEmail = email.toLowerCase();
    const existingUser = await query(`SELECT id FROM users WHERE email = $1`, [normalizedEmail]);
    if (existingUser.rowCount > 0) {
      return res.status(400).json({
        error: "BadRequest",
        code: 400,
        detail: "Email is already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await query(
      `
        INSERT INTO users (name, email, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, email, role, status, created_at, updated_at
      `,
      [
        name,
        normalizedEmail,
        passwordHash,
        role || "viewer",
        status || "active",
      ]
    );

    const user = created.rows[0];

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: Number(user.id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();
    const userResult = await query(
      `
        SELECT id, name, email, password_hash, role, status
        FROM users
        WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        error: "Unauthorized",
        code: 401,
        detail: "Invalid credentials",
      });
    }

    const user = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Unauthorized",
        code: 401,
        detail: "Invalid credentials",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        error: "Forbidden",
        code: 403,
        detail: "Inactive users cannot login",
      });
    }

    const token = generateToken(Number(user.id));

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: Number(user.id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { registerUser, loginUser };
