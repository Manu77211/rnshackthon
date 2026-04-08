const { query } = require("../config/db");

const mapRecordRow = (row) => ({
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
});

const createRecord = async (req, res, next) => {
  try {
    const { amount, type, category, date, description } = req.body;
    const recordResult = await query(
      `
        INSERT INTO financial_records (amount, type, category, record_date, description, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, amount, type, category, record_date, description, created_by, created_at, updated_at
      `,
      [amount, type, category, date, description || "", req.user.id]
    );

    const record = recordResult.rows[0];

    return res.status(201).json({
      message: "Record created successfully",
      record: {
        id: Number(record.id),
        amount: Number(record.amount),
        type: record.type,
        category: record.category,
        date: record.record_date,
        description: record.description,
        createdBy: Number(record.created_by),
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getRecords = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, page = 1, limit = 10 } = req.query;

    const whereParts = [];
    const values = [];
    let index = 1;

    if (type) {
      whereParts.push(`fr.type = $${index++}`);
      values.push(type);
    }
    if (category) {
      whereParts.push(`fr.category = $${index++}`);
      values.push(category);
    }
    if (startDate) {
      whereParts.push(`fr.record_date >= $${index++}`);
      values.push(startDate);
    }
    if (endDate) {
      whereParts.push(`fr.record_date <= $${index++}`);
      values.push(endDate);
    }

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    const skip = (parsedPage - 1) * parsedLimit;
    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

    const countResult = await query(
      `
        SELECT COUNT(*)::INT AS total
        FROM financial_records fr
        ${whereClause}
      `,
      values
    );

    const recordsResult = await query(
      `
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
        ${whereClause}
        ORDER BY fr.record_date DESC, fr.created_at DESC
        LIMIT $${index++} OFFSET $${index}
      `,
      [...values, parsedLimit, skip]
    );

    const total = countResult.rows[0].total;
    const records = recordsResult.rows.map(mapRecordRow);

    return res.status(200).json({
      total,
      page: parsedPage,
      pages: total === 0 ? 0 : Math.ceil(total / parsedLimit),
      limit: parsedLimit,
      records,
    });
  } catch (error) {
    return next(error);
  }
};

const getRecordById = async (req, res, next) => {
  try {
    const result = await query(
      `
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
        WHERE fr.id = $1
      `,
      [Number(req.params.id)]
    );

    const record = result.rows[0];

    if (!record) {
      return res.status(404).json({
        error: "NotFound",
        code: 404,
        detail: "Record not found",
      });
    }

    return res.status(200).json({ record: mapRecordRow(record) });
  } catch (error) {
    return next(error);
  }
};

const updateRecord = async (req, res, next) => {
  try {
    const { amount, type, category, date, description } = req.body;
    const updates = [];
    const values = [];
    let index = 1;

    if (amount !== undefined) {
      updates.push(`amount = $${index++}`);
      values.push(amount);
    }
    if (type !== undefined) {
      updates.push(`type = $${index++}`);
      values.push(type);
    }
    if (category !== undefined) {
      updates.push(`category = $${index++}`);
      values.push(category);
    }
    if (date !== undefined) {
      updates.push(`record_date = $${index++}`);
      values.push(date);
    }
    if (description !== undefined) {
      updates.push(`description = $${index++}`);
      values.push(description);
    }

    values.push(Number(req.params.id));
    const result = await query(
      `
        UPDATE financial_records
        SET ${updates.join(", ")}, updated_at = NOW()
        WHERE id = $${index}
        RETURNING id, amount, type, category, record_date, description, created_by, created_at, updated_at
      `,
      values
    );

    const record = result.rows[0];

    if (!record) {
      return res.status(404).json({
        error: "NotFound",
        code: 404,
        detail: "Record not found",
      });
    }

    return res.status(200).json({
      message: "Record updated successfully",
      record: {
        id: Number(record.id),
        amount: Number(record.amount),
        type: record.type,
        category: record.category,
        date: record.record_date,
        description: record.description,
        createdBy: Number(record.created_by),
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const deleteRecord = async (req, res, next) => {
  try {
    const result = await query(`DELETE FROM financial_records WHERE id = $1 RETURNING id`, [
      Number(req.params.id),
    ]);

    const record = result.rows[0];

    if (!record) {
      return res.status(404).json({
        error: "NotFound",
        code: 404,
        detail: "Record not found",
      });
    }

    return res.status(200).json({ message: "Record deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
};
