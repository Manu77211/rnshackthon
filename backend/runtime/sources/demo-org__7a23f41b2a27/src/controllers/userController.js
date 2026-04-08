const { query } = require("../config/db");

const getUsers = async (req, res, next) => {
  try {
    const usersResult = await query(
      `
        SELECT id, name, email, role, status, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
      `
    );

    const users = usersResult.rows.map((user) => ({
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    return res.status(200).json({ count: users.length, users });
  } catch (error) {
    return next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const userResult = await query(
      `
        SELECT id, name, email, role, status, created_at, updated_at
        FROM users
        WHERE id = $1
      `,
      [Number(req.params.id)]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({
        error: "NotFound",
        code: 404,
        detail: "User not found",
      });
    }

    return res.status(200).json({
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

const updateUser = async (req, res, next) => {
  try {
    const { role, status } = req.body;

    const updates = [];
    const values = [];
    let index = 1;

    if (role) {
      updates.push(`role = $${index++}`);
      values.push(role);
    }

    if (status) {
      updates.push(`status = $${index++}`);
      values.push(status);
    }

    values.push(Number(req.params.id));

    const userResult = await query(
      `
        UPDATE users
        SET ${updates.join(", ")}, updated_at = NOW()
        WHERE id = $${index}
        RETURNING id, name, email, role, status, created_at, updated_at
      `,
      values
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({
        error: "NotFound",
        code: 404,
        detail: "User not found",
      });
    }

    return res.status(200).json({
      message: "User updated successfully",
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

const deleteUser = async (req, res, next) => {
  try {
    const userResult = await query(`DELETE FROM users WHERE id = $1 RETURNING id`, [
      Number(req.params.id),
    ]);

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({
        error: "NotFound",
        code: 404,
        detail: "User not found",
      });
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getUsers, getUserById, updateUser, deleteUser };
