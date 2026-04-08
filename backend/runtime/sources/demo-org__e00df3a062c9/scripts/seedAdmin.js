require("dotenv").config();

const bcrypt = require("bcryptjs");
const { connectDB, query, getPool } = require("../src/config/db");

const seedAdmin = async () => {
  const name = process.env.ADMIN_NAME || "System Admin";
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be provided in .env");
  }

  await connectDB();

  const normalizedEmail = email.toLowerCase();
  const existing = await query(`SELECT id FROM users WHERE email = $1`, [normalizedEmail]);
  if (existing.rowCount > 0) {
    console.log("Admin already exists");
    await getPool().end();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    `
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES ($1, $2, $3, 'admin', 'active')
      RETURNING email
    `,
    [name, normalizedEmail, passwordHash]
  );

  const admin = result.rows[0];

  console.log(`Admin created: ${admin.email}`);
  await getPool().end();
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error("Failed to seed admin", error.message);
  getPool()
    .end()
    .finally(() => process.exit(1));
});
