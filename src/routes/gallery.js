const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const {
  getAllGallery,
  getCategories,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem
} = require('../controllers/galleryController');

// Public routes
router.get('/', getAllGallery);
router.get('/categories', getCategories);

// Admin routes
router.post('/', authenticate, isAdmin, createGalleryItem);
router.put('/:id', authenticate, isAdmin, updateGalleryItem);
router.delete('/:id', authenticate, isAdmin, deleteGalleryItem);

module.exports = router;
