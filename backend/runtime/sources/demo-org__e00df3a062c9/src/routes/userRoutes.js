const express = require("express");
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const validate = require("../middleware/validateMiddleware");
const { userIdValidation, updateUserValidation } = require("../validators/userValidator");

const router = express.Router();

router.use(protect, allowRoles("admin"));

router.get("/", getUsers);
router.get("/:id", userIdValidation, validate, getUserById);
router.patch("/:id", updateUserValidation, validate, updateUser);
router.delete("/:id", userIdValidation, validate, deleteUser);

module.exports = router;
