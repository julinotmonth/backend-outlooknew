const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const {
  getAllBarbers,
  getBarber,
  createBarber,
  updateBarber,
  deleteBarber
} = require('../controllers/barberController');

// Public routes
router.get('/', getAllBarbers);
router.get('/:id', getBarber);

// Admin routes
router.post('/', authenticate, isAdmin, createBarber);
router.put('/:id', authenticate, isAdmin, updateBarber);
router.delete('/:id', authenticate, isAdmin, deleteBarber);

module.exports = router;
