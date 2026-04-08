const { query } = require("../config/db");

const getSummary = async (req, res, next) => {
  try {
    const summaryResult = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::FLOAT AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::FLOAT AS total_expenses
      FROM financial_records
    `);

    const row = summaryResult.rows[0];
    const totalIncome = Number(row.total_income);
    const totalExpenses = Number(row.total_expenses);
    const netBalance = totalIncome - totalExpenses;

    return res.status(200).json({ totalIncome, totalExpenses, netBalance });
  } catch (error) {
    return next(error);
  }
};

const getCategoryBreakdown = async (req, res, next) => {
  try {
    const breakdownResult = await query(`
      SELECT
        category,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::FLOAT AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::FLOAT AS expense
      FROM financial_records
      GROUP BY category
      ORDER BY category ASC
    `);

    const categories = breakdownResult.rows.map((item) => {
      const income = Number(item.income);
      const expense = Number(item.expense);
      return {
        category: item.category,
        income,
        expense,
        total: income + expense,
      };
    });

    return res.status(200).json({ categories });
  } catch (error) {
    return next(error);
  }
};

const getRecentRecords = async (req, res, next) => {
  try {
    const recordsResult = await query(`
      SELECT
        fr.id,
        fr.amount,
        fr.type,
        fr.category,
        fr.record_date,
        fr.description,
        fr.created_at,
        fr.updated_at,
        u.id AS created_by_id,
        u.name AS created_by_name,
        u.email AS created_by_email,
        u.role AS created_by_role
      FROM financial_records fr
      INNER JOIN users u ON u.id = fr.created_by
      ORDER BY fr.record_date DESC, fr.created_at DESC
      LIMIT 5
    `);

    const records = recordsResult.rows.map((row) => ({
      id: Number(row.id),
      amount: Number(row.amount),
      type: row.type,
      category: row.category,
      date: row.record_date,
      description: row.description,
      createdBy: {
        id: Number(row.created_by_id),
        name: row.created_by_name,
        email: row.created_by_email,
        role: row.created_by_role,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.status(200).json({ records });
  } catch (error) {
    return next(error);
  }
};

const getMonthlyTrends = async (req, res, next) => {
  try {
    const trendsResult = await query(`
      SELECT
        EXTRACT(YEAR FROM record_date)::INT AS year,
        EXTRACT(MONTH FROM record_date)::INT AS month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::FLOAT AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::FLOAT AS expense
      FROM financial_records
      GROUP BY year, month
      ORDER BY year ASC, month ASC
    `);

    const monthly = trendsResult.rows.map((item) => {
      const income = Number(item.income);
      const expense = Number(item.expense);
      return {
        year: item.year,
        month: item.month,
        income,
        expense,
        net: income - expense,
      };
    });

    return res.status(200).json({ trends: monthly });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getRecentRecords,
  getMonthlyTrends,
};
