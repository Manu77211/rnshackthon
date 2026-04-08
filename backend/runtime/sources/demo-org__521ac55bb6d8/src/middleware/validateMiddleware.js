const { validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  const firstError = errors.array()[0];
  return res.status(400).json({
    error: "ValidationError",
    code: 400,
    detail: firstError.msg,
    errors: errors.array(),
  });
};

module.exports = validate;
