const { body, param } = require("express-validator");

const userIdValidation = [
  param("id").isInt({ gt: 0 }).withMessage("User id must be a positive integer"),
];

const updateUserValidation = [
  ...userIdValidation,
  body("role")
    .optional()
    .isIn(["viewer", "analyst", "admin"])
    .withMessage("Role must be viewer, analyst, or admin"),
  body("status")
    .optional()
    .isIn(["active", "inactive"])
    .withMessage("Status must be active or inactive"),
  body().custom((value) => {
    if (!value.role && !value.status) {
      throw new Error("At least one of role or status must be provided");
    }
    return true;
  }),
];

module.exports = { userIdValidation, updateUserValidation };
