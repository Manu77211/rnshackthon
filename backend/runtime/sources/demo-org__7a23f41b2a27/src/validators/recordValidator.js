const { body, param, query } = require("express-validator");

const recordIdValidation = [
  param("id").isInt({ gt: 0 }).withMessage("Record id must be a positive integer"),
];

const createRecordValidation = [
  body("amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be a number greater than 0"),
  body("type")
    .isIn(["income", "expense"])
    .withMessage("Type must be income or expense"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("date").isISO8601().toDate().withMessage("Date must be valid"),
  body("description").optional().isString().withMessage("Description must be a string"),
];

const updateRecordValidation = [
  ...recordIdValidation,
  body("amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Amount must be a number greater than 0"),
  body("type")
    .optional()
    .isIn(["income", "expense"])
    .withMessage("Type must be income or expense"),
  body("category")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category cannot be empty"),
  body("date").optional().isISO8601().toDate().withMessage("Date must be valid"),
  body("description").optional().isString().withMessage("Description must be a string"),
  body().custom((value) => {
    const hasAnyField =
      value.amount !== undefined ||
      value.type !== undefined ||
      value.category !== undefined ||
      value.date !== undefined ||
      value.description !== undefined;

    if (!hasAnyField) {
      throw new Error("At least one field must be provided for update");
    }

    return true;
  }),
];

const listRecordsValidation = [
  query("type")
    .optional()
    .isIn(["income", "expense"])
    .withMessage("Type filter must be income or expense"),
  query("category").optional().isString().withMessage("Category filter must be a string"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid date"),
  query("endDate").optional().isISO8601().withMessage("endDate must be a valid date"),
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("page must be an integer greater than 0"),
  query("limit")
    .optional()
    .isInt({ gt: 0, lt: 101 })
    .withMessage("limit must be an integer between 1 and 100"),
];

module.exports = {
  recordIdValidation,
  createRecordValidation,
  updateRecordValidation,
  listRecordsValidation,
};
