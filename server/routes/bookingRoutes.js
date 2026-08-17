const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createBooking,
  rescheduleBooking,
  getBookings,
  getBooking,
  cancelBooking,
  completeBooking,
  reserveRoom,
  getMyCurrentBooking,
  getCurrentBookings,
} = require("../controllers/bookingControllers");
const { createWalkInBooking } = require("../controllers/walkInControllers");
const allowedRoles = require("../middleware/allowedRoles");

router.post("/", authMiddleware, createBooking);
router.post(
  "/walk-in",
  authMiddleware,
  allowedRoles(["receptionist"]),
  createWalkInBooking,
);
router.get("/", authMiddleware, getBookings);
router.get(
  "/current",
  authMiddleware,
  allowedRoles(["receptionist"]),
  getCurrentBookings,
);
router.post("/reserve", authMiddleware, reserveRoom);
router.get("/my-current", authMiddleware, getMyCurrentBooking);
router.get("/:booking_id", authMiddleware, getBooking);
router.put("/:booking_id/reschedule", authMiddleware, rescheduleBooking);
router.put("/:booking_id/cancel", authMiddleware, cancelBooking);
router.put(
  "/:booking_id/complete",
  authMiddleware,
  allowedRoles(["receptionist"]),
  completeBooking,
);

module.exports = router;
