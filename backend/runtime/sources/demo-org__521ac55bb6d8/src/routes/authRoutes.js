const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");
const validate = require("../middleware/validateMiddleware");
const { registerValidation, loginValidation } = require("../validators/authValidator");

const router = express.Router();

router.post("/register", registerValidation, validate, registerUser);
router.post("/login", loginValidation, validate, loginUser);

module.exports = router;
