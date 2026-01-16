const { dbRun, dbGet, dbAll } = require('../database/db');

// Get all reviews
const getAllReviews = async (req, res) => {
  try {
    const { barber_id, limit } = req.query;
    
    let sql = `
      SELECT r.*, b.name as barber_name, b.image as barber_image
      FROM reviews r
      LEFT JOIN barbers b ON r.barber_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (barber_id) {
      sql += ' AND r.barber_id = ?';
      params.push(barber_id);
    }

    sql += ' ORDER BY r.created_at DESC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const reviews = await dbAll(sql, params);

    const formattedReviews = reviews.map(review => ({
      ...review,
      services: review.services ? review.services.split(',') : [],
      barber: {
        id: review.barber_id,
        name: review.barber_name,
        image: review.barber_image
      }
    }));

    res.json({
      success: true,
      data: formattedReviews
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data review'
    });
  }
};

// Get reviews for home page (top rated)
const getTopReviews = async (req, res) => {
  try {
    const reviews = await dbAll(`
      SELECT r.*, b.name as barber_name
      FROM reviews r
      LEFT JOIN barbers b ON r.barber_id = b.id
      WHERE r.rating >= 4
      ORDER BY r.created_at DESC
      LIMIT 3
    `);

    const formattedReviews = reviews.map(review => ({
      ...review,
      services: review.services ? review.services.split(',') : []
    }));

    res.json({
      success: true,
      data: formattedReviews
    });
  } catch (error) {
    console.error('Get top reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan review'
    });
  }
};

// Get barber reviews
const getBarberReviews = async (req, res) => {
  try {
    const { barberId } = req.params;

    const reviews = await dbAll(
      `SELECT * FROM reviews WHERE barber_id = ? ORDER BY created_at DESC`,
      [barberId]
    );

    // Calculate average rating
    const avgRating = await dbGet(
      'SELECT AVG(rating) as average, COUNT(*) as count FROM reviews WHERE barber_id = ?',
      [barberId]
    );

    const formattedReviews = reviews.map(review => ({
      ...review,
      services: review.services ? review.services.split(',') : []
    }));

    res.json({
      success: true,
      data: {
        reviews: formattedReviews,
        averageRating: avgRating.average ? parseFloat(avgRating.average.toFixed(1)) : 0,
        totalReviews: avgRating.count
      }
    });
  } catch (error) {
    console.error('Get barber reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan review barber'
    });
  }
};

// Create review
const createReview = async (req, res) => {
  try {
    // Support both camelCase and snake_case
    const { 
      bookingId, booking_id,
      barberId, barber_id,
      customerName, customer_name,
      rating, 
      comment, 
      services 
    } = req.body;
    
    const userId = req.user?.id || null;
    
    // Normalize fields
    const finalBookingId = bookingId || booking_id || null;
    const finalBarberId = barberId || barber_id;
    const finalCustomerName = customerName || customer_name || 'Anonymous';

    console.log('Creating review:', { finalBookingId, finalBarberId, finalCustomerName, rating });

    if (!finalBarberId) {
      return res.status(400).json({
        success: false,
        message: 'Barber ID diperlukan'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating harus antara 1-5'
      });
    }

    // Check if booking already has a review
    if (finalBookingId) {
      const existingReview = await dbGet(
        'SELECT id FROM reviews WHERE booking_id = ?',
        [finalBookingId]
      );

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'Booking ini sudah memiliki review'
        });
      }
    }

    await dbRun(
      `INSERT INTO reviews (booking_id, barber_id, user_id, customer_name, rating, comment, services)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        finalBookingId,
        finalBarberId,
        userId,
        finalCustomerName,
        rating,
        comment || '',
        Array.isArray(services) ? services.join(',') : services || ''
      ]
    );

    // Get the review we just created
    const newReview = await dbGet(
      `SELECT * FROM reviews WHERE barber_id = ? ORDER BY id DESC LIMIT 1`,
      [finalBarberId]
    );

    // Update barber rating
    const avgRating = await dbGet(
      'SELECT AVG(rating) as average, COUNT(*) as count FROM reviews WHERE barber_id = ?',
      [finalBarberId]
    );

    await dbRun(
      'UPDATE barbers SET rating = ?, reviews_count = ? WHERE id = ?',
      [avgRating.average ? parseFloat(avgRating.average.toFixed(1)) : 0, avgRating.count, finalBarberId]
    );

    // Create notification
    const barber = await dbGet('SELECT name FROM barbers WHERE id = ?', [finalBarberId]);
    
    await dbRun(
      `INSERT INTO notifications (type, title, message, link)
       VALUES (?, ?, ?, ?)`,
      [
        'review',
        'Review Baru',
        `${finalCustomerName} memberikan rating ${rating} bintang untuk ${barber?.name || 'Barber'}`,
        '/admin/team'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Review berhasil ditambahkan',
      data: newReview ? {
        ...newReview,
        services: newReview.services ? newReview.services.split(',') : []
      } : { id: Date.now(), rating, customer_name: finalCustomerName }
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan review'
    });
  }
};

// Check if booking has review
const checkBookingReview = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const review = await dbGet('SELECT id FROM reviews WHERE booking_id = ?', [bookingId]);

    res.json({
      success: true,
      data: {
        hasReview: !!review
      }
    });
  } catch (error) {
    console.error('Check booking review error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memeriksa review'
    });
  }
};

// Delete review (admin only)
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await dbGet('SELECT * FROM reviews WHERE id = ?', [id]);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review tidak ditemukan'
      });
    }

    await dbRun('DELETE FROM reviews WHERE id = ?', [id]);

    // Update barber rating
    const avgRating = await dbGet(
      'SELECT AVG(rating) as average, COUNT(*) as count FROM reviews WHERE barber_id = ?',
      [review.barber_id]
    );

    await dbRun(
      'UPDATE barbers SET rating = ?, reviews_count = ? WHERE id = ?',
      [avgRating.average ? parseFloat(avgRating.average.toFixed(1)) : 0, avgRating.count || 0, review.barber_id]
    );

    res.json({
      success: true,
      message: 'Review berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus review'
    });
  }
};

module.exports = {
  getAllReviews,
  getTopReviews,
  getBarberReviews,
  createReview,
  checkBookingReview,
  deleteReview
};