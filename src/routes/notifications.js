const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
} = require('../controllers/notificationController');

// Admin routes (all notification routes are admin only)
router.get('/', authenticate, isAdmin, getAllNotifications);
router.put('/:id/read', authenticate, isAdmin, markAsRead);
router.put('/read-all', authenticate, isAdmin, markAllAsRead);
router.delete('/:id', authenticate, isAdmin, deleteNotification);
router.delete('/', authenticate, isAdmin, clearAllNotifications);

module.exports = router;
