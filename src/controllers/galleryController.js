const { dbRun, dbGet, dbAll } = require('../database/db');
const path = require('path');
const fs = require('fs');

// Get all gallery items
const getAllGallery = async (req, res) => {
  try {
    const { category } = req.query;
    
    let sql = 'SELECT * FROM gallery WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY created_at DESC';

    const gallery = await dbAll(sql, params);

    res.json({
      success: true,
      data: gallery
    });
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data galeri'
    });
  }
};

// Get gallery categories
const getCategories = async (req, res) => {
  try {
    const categories = await dbAll('SELECT DISTINCT category FROM gallery ORDER BY category');

    res.json({
      success: true,
      data: ['all', ...categories.map(c => c.category)]
    });
  } catch (error) {
    console.error('Get gallery categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan kategori'
    });
  }
};

// Create gallery item (admin only)
const createGalleryItem = async (req, res) => {
  try {
    const { title, category, image } = req.body;

    const result = await dbRun(
      'INSERT INTO gallery (title, category, image) VALUES (?, ?, ?)',
      [title, category, image]
    );

    const item = await dbGet('SELECT * FROM gallery WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      message: 'Item galeri berhasil ditambahkan',
      data: item
    });
  } catch (error) {
    console.error('Create gallery item error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan item galeri'
    });
  }
};

// Update gallery item (admin only)
const updateGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, image } = req.body;

    const existing = await dbGet('SELECT * FROM gallery WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Item galeri tidak ditemukan'
      });
    }

    await dbRun(
      'UPDATE gallery SET title = ?, category = ?, image = ? WHERE id = ?',
      [title || existing.title, category || existing.category, image || existing.image, id]
    );

    const item = await dbGet('SELECT * FROM gallery WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Item galeri berhasil diperbarui',
      data: item
    });
  } catch (error) {
    console.error('Update gallery item error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui item galeri'
    });
  }
};

// Delete gallery item (admin only)
const deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await dbGet('SELECT * FROM gallery WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Item galeri tidak ditemukan'
      });
    }

    await dbRun('DELETE FROM gallery WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Item galeri berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete gallery item error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus item galeri'
    });
  }
};

module.exports = {
  getAllGallery,
  getCategories,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem
};
