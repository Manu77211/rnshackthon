const { Pool } = require("pg");

let pool;

const getPool = () => {
  if (pool) {
    return pool;
  }

  const rawConnection = process.env.DATABASE_URL;
  const connectionString = rawConnection ? rawConnection.replace(/^['"]|['"]$/g, "") : "";

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured in environment variables");
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  return pool;
};

const initSchema = async () => {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'analyst', 'admin')),
      status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS financial_records (
      id BIGSERIAL PRIMARY KEY,
      amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
      type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
      category VARCHAR(120) NOT NULL,
      record_date DATE NOT NULL,
      description TEXT,
      created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
    CREATE INDEX IF NOT EXISTS idx_financial_records_category ON financial_records(category);
    CREATE INDEX IF NOT EXISTS idx_financial_records_record_date ON financial_records(record_date);
    CREATE INDEX IF NOT EXISTS idx_financial_records_created_by ON financial_records(created_by);
  `);
};

const connectDB = async () => {
  const db = getPool();
  await db.query("SELECT 1");
  await initSchema();
};

const query = (text, params = []) => getPool().query(text, params);

module.exports = { connectDB, query, getPool };
