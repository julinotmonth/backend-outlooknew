const { dbRun, dbGet, dbAll } = require('../database/db');

// Get all notifications
const getAllNotifications = async (req, res) => {
  try {
    const { limit } = req.query;
    
    let sql = 'SELECT * FROM notifications ORDER BY created_at DESC';
    const params = [];

    if (limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const notifications = await dbAll(sql, params);

    // Get unread count
    const unreadCount = await dbGet(
      'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0'
    );

    res.json({
      success: true,
      data: {
        notifications: notifications.map(n => ({
          ...n,
          isRead: n.is_read === 1
        })),
        unreadCount: unreadCount.count
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan notifikasi'
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    await dbRun('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Notifikasi ditandai sudah dibaca'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah status notifikasi'
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    await dbRun('UPDATE notifications SET is_read = 1');

    res.json({
      success: true,
      message: 'Semua notifikasi ditandai sudah dibaca'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah status notifikasi'
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await dbRun('DELETE FROM notifications WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Notifikasi berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus notifikasi'
    });
  }
};

// Clear all notifications
const clearAllNotifications = async (req, res) => {
  try {
    await dbRun('DELETE FROM notifications');

    res.json({
      success: true,
      message: 'Semua notifikasi berhasil dihapus'
    });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus notifikasi'
    });
  }
};

module.exports = {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
};
