const express = require("express");
const {
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
} = require("../controllers/recordController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const validate = require("../middleware/validateMiddleware");
const {
  recordIdValidation,
  createRecordValidation,
  updateRecordValidation,
  listRecordsValidation,
} = require("../validators/recordValidator");

const router = express.Router();

router.use(protect);

router.get("/", allowRoles("analyst", "admin"), listRecordsValidation, validate, getRecords);
router.get("/:id", allowRoles("analyst", "admin"), recordIdValidation, validate, getRecordById);
router.post("/", allowRoles("admin"), createRecordValidation, validate, createRecord);
router.put("/:id", allowRoles("admin"), updateRecordValidation, validate, updateRecord);
router.delete("/:id", allowRoles("admin"), recordIdValidation, validate, deleteRecord);

module.exports = router;
