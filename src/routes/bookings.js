const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, optionalAuth } = require('../middleware/auth');
const {
  getAllBookings,
  getUserBookings,
  getBooking,
  createBooking,
  updateBookingStatus,
  cancelBooking,
  getBookedSlots,
  getBookingStats
} = require('../controllers/bookingController');

// Public routes
router.get('/booked-slots', getBookedSlots);

// User routes
router.get('/my-bookings', authenticate, getUserBookings);
router.post('/', optionalAuth, createBooking);
router.post('/:id/cancel', authenticate, cancelBooking);

// Admin routes
router.get('/', authenticate, isAdmin, getAllBookings);
router.get('/stats', authenticate, isAdmin, getBookingStats);
router.get('/:id', authenticate, getBooking);
router.put('/:id/status', authenticate, isAdmin, updateBookingStatus);

module.exports = router;
