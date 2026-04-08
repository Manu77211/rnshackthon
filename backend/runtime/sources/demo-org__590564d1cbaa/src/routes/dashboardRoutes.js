const express = require("express");
const {
  getSummary,
  getCategoryBreakdown,
  getRecentRecords,
  getMonthlyTrends,
} = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, allowRoles("viewer", "analyst", "admin"));

router.get("/summary", getSummary);
router.get("/category-breakdown", getCategoryBreakdown);
router.get("/recent", getRecentRecords);
router.get("/monthly-trends", getMonthlyTrends);

module.exports = router;
