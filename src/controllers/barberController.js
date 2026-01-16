const { dbRun, dbGet, dbAll } = require('../database/db');

// Get all barbers
const getAllBarbers = async (req, res) => {
  try {
    const { available } = req.query;
    
    let sql = 'SELECT * FROM barbers';
    const params = [];

    if (available === 'true') {
      sql += ' WHERE is_available = 1';
    }

    sql += ' ORDER BY id ASC';

    const barbers = await dbAll(sql, params);

    // Parse specialties from string to array
    const formattedBarbers = barbers.map(barber => ({
      ...barber,
      specialties: barber.specialties ? barber.specialties.split(',') : [],
      isAvailable: barber.is_available === 1,
      workSchedule: {
        startTime: barber.work_start_time,
        endTime: barber.work_end_time
      }
    }));

    res.json({
      success: true,
      data: formattedBarbers
    });
  } catch (error) {
    console.error('Get barbers error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data barber'
    });
  }
};

// Get single barber
const getBarber = async (req, res) => {
  try {
    const { id } = req.params;

    const barber = await dbGet('SELECT * FROM barbers WHERE id = ?', [id]);

    if (!barber) {
      return res.status(404).json({
        success: false,
        message: 'Barber tidak ditemukan'
      });
    }

    // Get reviews for this barber
    const reviews = await dbAll(
      'SELECT * FROM reviews WHERE barber_id = ? ORDER BY created_at DESC LIMIT 10',
      [id]
    );

    const formattedBarber = {
      ...barber,
      specialties: barber.specialties ? barber.specialties.split(',') : [],
      isAvailable: barber.is_available === 1,
      workSchedule: {
        startTime: barber.work_start_time,
        endTime: barber.work_end_time
      },
      reviews
    };

    res.json({
      success: true,
      data: formattedBarber
    });
  } catch (error) {
    console.error('Get barber error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data barber'
    });
  }
};

// Create barber (admin only)
const createBarber = async (req, res) => {
  try {
    const { name, role, image, experience, specialties, bio, phone, instagram, is_available, isAvailable, work_start_time, work_end_time, workSchedule } = req.body;

    // Handle both is_available and isAvailable
    const availableValue = is_available !== undefined ? is_available : isAvailable;
    const startTime = work_start_time || workSchedule?.startTime || '09:00';
    const endTime = work_end_time || workSchedule?.endTime || '18:00';

    const result = await dbRun(
      `INSERT INTO barbers (name, role, image, experience, specialties, bio, phone, instagram, is_available, work_start_time, work_end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        role || 'Barber',
        image || '',
        experience || 0,
        Array.isArray(specialties) ? specialties.join(',') : (specialties || ''),
        bio || '',
        phone || '',
        instagram || '',
        availableValue !== false ? 1 : 0,
        startTime,
        endTime
      ]
    );

    const barber = await dbGet('SELECT * FROM barbers WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      message: 'Barber berhasil ditambahkan',
      data: {
        ...barber,
        specialties: barber.specialties ? barber.specialties.split(',').map(s => s.trim()) : [],
        isAvailable: barber.is_available === 1,
        workSchedule: {
          startTime: barber.work_start_time,
          endTime: barber.work_end_time
        }
      }
    });
  } catch (error) {
    console.error('Create barber error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan barber'
    });
  }
};

// Update barber (admin only)
const updateBarber = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, image, experience, specialties, bio, phone, instagram, is_available, isAvailable, work_start_time, work_end_time, workSchedule } = req.body;

    const existing = await dbGet('SELECT * FROM barbers WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Barber tidak ditemukan'
      });
    }

    // Handle both is_available (snake_case) and isAvailable (camelCase)
    const availableValue = is_available !== undefined ? is_available : isAvailable;
    const startTime = work_start_time || workSchedule?.startTime || existing.work_start_time;
    const endTime = work_end_time || workSchedule?.endTime || existing.work_end_time;

    await dbRun(
      `UPDATE barbers SET 
        name = ?, role = ?, image = ?, experience = ?, specialties = ?, 
        bio = ?, phone = ?, instagram = ?,
        is_available = ?, work_start_time = ?, work_end_time = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || existing.name,
        role || existing.role,
        image || existing.image,
        experience !== undefined ? experience : existing.experience,
        Array.isArray(specialties) ? specialties.join(',') : (specialties || existing.specialties),
        bio !== undefined ? bio : existing.bio,
        phone !== undefined ? phone : existing.phone,
        instagram !== undefined ? instagram : existing.instagram,
        availableValue !== undefined ? (availableValue ? 1 : 0) : existing.is_available,
        startTime,
        endTime,
        id
      ]
    );

    const barber = await dbGet('SELECT * FROM barbers WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Barber berhasil diperbarui',
      data: {
        ...barber,
        specialties: barber.specialties ? barber.specialties.split(',').map(s => s.trim()) : [],
        isAvailable: barber.is_available === 1,
        workSchedule: {
          startTime: barber.work_start_time,
          endTime: barber.work_end_time
        }
      }
    });
  } catch (error) {
    console.error('Update barber error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui barber'
    });
  }
};

// Delete barber (admin only)
const deleteBarber = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await dbGet('SELECT * FROM barbers WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Barber tidak ditemukan'
      });
    }

    await dbRun('DELETE FROM barbers WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Barber berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete barber error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus barber'
    });
  }
};

module.exports = {
  getAllBarbers,
  getBarber,
  createBarber,
  updateBarber,
  deleteBarber
};