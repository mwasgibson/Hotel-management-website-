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

router.post("/", authMiddleware, bookingAudit("create"), createBooking);

router.post("/reserve", authMiddleware, bookingAudit("reserve"), reserveRoom);

router.put(
  "/:booking_id/reschedule",
  authMiddleware,
  bookingAudit("reschedule"),
  rescheduleBooking,
);

router.put(
  "/:booking_id/cancel",
  authMiddleware,
  bookingAudit("cancel"),
  cancelBooking,
);

router.put(
  "/:booking_id/complete",
  authMiddleware,
  allowedRoles(["receptionist"]),
  bookingAudit("complete"),
  completeBooking,
);

module.exports = router;
