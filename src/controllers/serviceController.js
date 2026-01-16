const { dbRun, dbGet, dbAll } = require('../database/db');

// Get all services
const getAllServices = async (req, res) => {
  try {
    const { active, category } = req.query;
    
    let sql = 'SELECT * FROM services WHERE 1=1';
    const params = [];

    if (active === 'true') {
      sql += ' AND is_active = 1';
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY category, name ASC';

    const services = await dbAll(sql, params);

    // Format services
    const formattedServices = services.map(service => ({
      ...service,
      isPopular: service.is_popular === 1,
      isActive: service.is_active === 1
    }));

    res.json({
      success: true,
      data: formattedServices
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data layanan'
    });
  }
};

// Get single service
const getService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await dbGet('SELECT * FROM services WHERE id = ?', [id]);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Layanan tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: {
        ...service,
        isPopular: service.is_popular === 1,
        isActive: service.is_active === 1
      }
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data layanan'
    });
  }
};

// Get service categories
const getCategories = async (req, res) => {
  try {
    const categories = await dbAll('SELECT DISTINCT category FROM services WHERE is_active = 1 ORDER BY category');

    res.json({
      success: true,
      data: categories.map(c => c.category)
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan kategori'
    });
  }
};

// Create service (admin only)
const createService = async (req, res) => {
  try {
    const { name, description, price, duration, category, image, isPopular, is_popular, isActive, is_active } = req.body;

    // Handle both camelCase and snake_case
    const popularValue = is_popular !== undefined ? is_popular : isPopular;
    const activeValue = is_active !== undefined ? is_active : isActive;

    const result = await dbRun(
      `INSERT INTO services (name, description, price, duration, category, image, is_popular, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || '',
        price,
        duration,
        category || 'haircut',
        image || '',
        popularValue ? 1 : 0,
        activeValue !== false ? 1 : 0
      ]
    );

    const service = await dbGet('SELECT * FROM services WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      message: 'Layanan berhasil ditambahkan',
      data: {
        ...service,
        isPopular: service.is_popular === 1,
        isActive: service.is_active === 1
      }
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan layanan'
    });
  }
};

// Update service (admin only)
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration, category, image, isPopular, is_popular, isActive, is_active } = req.body;

    const existing = await dbGet('SELECT * FROM services WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Layanan tidak ditemukan'
      });
    }

    // Handle both camelCase and snake_case
    const popularValue = is_popular !== undefined ? is_popular : isPopular;
    const activeValue = is_active !== undefined ? is_active : isActive;

    await dbRun(
      `UPDATE services SET 
        name = ?, description = ?, price = ?, duration = ?, category = ?, 
        image = ?, is_popular = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || existing.name,
        description !== undefined ? description : existing.description,
        price !== undefined ? price : existing.price,
        duration !== undefined ? duration : existing.duration,
        category || existing.category,
        image !== undefined ? image : existing.image,
        popularValue !== undefined ? (popularValue ? 1 : 0) : existing.is_popular,
        activeValue !== undefined ? (activeValue ? 1 : 0) : existing.is_active,
        id
      ]
    );

    const service = await dbGet('SELECT * FROM services WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Layanan berhasil diperbarui',
      data: {
        ...service,
        isPopular: service.is_popular === 1,
        isActive: service.is_active === 1
      }
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui layanan'
    });
  }
};

// Delete service (admin only)
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await dbGet('SELECT * FROM services WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Layanan tidak ditemukan'
      });
    }

    await dbRun('DELETE FROM services WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Layanan berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus layanan'
    });
  }
};

module.exports = {
  getAllServices,
  getService,
  getCategories,
  createService,
  updateService,
  deleteService
};