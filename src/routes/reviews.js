const express = require('express');
const router = express.Router();
const { authenticate, isAdmin, optionalAuth } = require('../middleware/auth');
const {
  getAllReviews,
  getTopReviews,
  getBarberReviews,
  createReview,
  checkBookingReview,
  deleteReview
} = require('../controllers/reviewController');

// Public routes
router.get('/', getAllReviews);
router.get('/top', getTopReviews);
router.get('/barber/:barberId', getBarberReviews);
router.get('/booking/:bookingId/check', checkBookingReview);

// User routes
router.post('/', optionalAuth, createReview);

// Admin routes
router.delete('/:id', authenticate, isAdmin, deleteReview);

module.exports = router;
