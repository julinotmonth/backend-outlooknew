const { dbRun, dbGet, dbAll } = require('../database/db');

// Get all bookings (admin)
const getAllBookings = async (req, res) => {
  try {
    const { status, date, barber_id } = req.query;
    
    let sql = `
      SELECT b.*, 
             br.name as barber_name, br.image as barber_image
      FROM bookings b
      LEFT JOIN barbers br ON b.barber_id = br.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    if (date) {
      sql += ' AND b.booking_date = ?';
      params.push(date);
    }

    if (barber_id) {
      sql += ' AND b.barber_id = ?';
      params.push(barber_id);
    }

    sql += ' ORDER BY b.created_at DESC';

    const bookings = await dbAll(sql, params);

    // Get services for each booking
    const formattedBookings = await Promise.all(bookings.map(async (booking) => {
      const services = await dbAll(
        'SELECT service_name as name, service_price as price FROM booking_services WHERE booking_id = ?',
        [booking.id]
      );
      
      return {
        ...booking,
        barber: {
          id: booking.barber_id,
          name: booking.barber_name,
          image: booking.barber_image
        },
        services,
        customer: {
          name: booking.customer_name,
          email: booking.customer_email,
          phone: booking.customer_phone
        }
      };
    }));

    res.json({
      success: true,
      data: formattedBookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data booking'
    });
  }
};

// Get user's bookings
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let sql = `
      SELECT b.*, 
             br.name as barber_name, br.image as barber_image
      FROM bookings b
      LEFT JOIN barbers br ON b.barber_id = br.id
      WHERE b.user_id = ?
    `;
    const params = [userId];

    if (status && status !== 'all') {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC';

    const bookings = await dbAll(sql, params);

    const formattedBookings = await Promise.all(bookings.map(async (booking) => {
      const services = await dbAll(
        'SELECT service_name as name, service_price as price FROM booking_services WHERE booking_id = ?',
        [booking.id]
      );
      
      return {
        ...booking,
        barber: {
          id: booking.barber_id,
          name: booking.barber_name,
          image: booking.barber_image
        },
        services,
        customer: {
          name: booking.customer_name,
          email: booking.customer_email,
          phone: booking.customer_phone
        }
      };
    }));

    res.json({
      success: true,
      data: formattedBookings
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data booking'
    });
  }
};

// Get single booking
const getBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await dbGet(`
      SELECT b.*, 
             br.name as barber_name, br.image as barber_image
      FROM bookings b
      LEFT JOIN barbers br ON b.barber_id = br.id
      WHERE b.id = ?
    `, [id]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking tidak ditemukan'
      });
    }

    const services = await dbAll(
      'SELECT service_name as name, service_price as price FROM booking_services WHERE booking_id = ?',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...booking,
        barber: {
          id: booking.barber_id,
          name: booking.barber_name,
          image: booking.barber_image
        },
        services,
        customer: {
          name: booking.customer_name,
          email: booking.customer_email,
          phone: booking.customer_phone
        }
      }
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data booking'
    });
  }
};

// Create booking
const createBooking = async (req, res) => {
  try {
    console.log('Received booking data:', JSON.stringify(req.body, null, 2));
    
    const { 
      // Support both camelCase and snake_case
      barberId, barber_id,
      date, booking_date,
      time, booking_time,
      services, 
      totalPrice, total_price,
      totalDuration, total_duration,
      customer, customer_name, customer_email, customer_phone,
      notes,
      paymentMethod, payment_method
    } = req.body;

    const userId = req.user?.id || null;
    
    // Normalize fields - support both formats
    const finalBarberId = barberId || barber_id;
    const finalDate = date || booking_date;
    const finalTime = time || booking_time;
    const finalTotalPrice = totalPrice || total_price || 0;
    const finalTotalDuration = totalDuration || total_duration || 0;
    const finalPaymentMethod = paymentMethod?.name || payment_method || 'Cash';
    
    // Handle customer data - can be object or individual fields
    const finalCustomerName = customer?.name || customer_name || '';
    const finalCustomerEmail = customer?.email || customer_email || '';
    const finalCustomerPhone = customer?.phone || customer_phone || '';
    const finalNotes = customer?.notes || notes || '';

    // Handle services - normalize field names (support multiple formats)
    let finalServices = [];
    if (Array.isArray(services) && services.length > 0) {
      finalServices = services.map(s => ({
        id: s.id || s.service_id || 0,
        name: s.name || s.service_name || '',
        price: s.price || s.service_price || 0
      }));
    }

    console.log('Received services:', services);
    console.log('Normalized services:', finalServices);
    console.log('Normalized data:', {
      finalBarberId, finalDate, finalTime, finalTotalPrice, 
      finalCustomerName, servicesCount: finalServices.length
    });

    // Check if time slot is available
    const existingBooking = await dbGet(
      `SELECT id FROM bookings 
       WHERE barber_id = ? AND booking_date = ? AND booking_time = ? 
       AND status IN ('pending', 'confirmed')`,
      [finalBarberId, finalDate, finalTime]
    );

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Waktu tersebut sudah dibooking. Silakan pilih waktu lain.'
      });
    }

    // Create booking
    await dbRun(
      `INSERT INTO bookings (
        user_id, barber_id, booking_date, booking_time, status, 
        total_price, total_duration, customer_name, customer_email, 
        customer_phone, notes, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        finalBarberId,
        finalDate,
        finalTime,
        'pending',
        finalTotalPrice,
        finalTotalDuration,
        finalCustomerName,
        finalCustomerEmail,
        finalCustomerPhone,
        finalNotes,
        finalPaymentMethod
      ]
    );

    // Get the booking ID we just created
    const newBooking = await dbGet(
      `SELECT id FROM bookings WHERE barber_id = ? AND booking_date = ? AND booking_time = ? ORDER BY id DESC LIMIT 1`,
      [finalBarberId, finalDate, finalTime]
    );
    
    const bookingId = newBooking?.id;
    console.log('Created booking with ID:', bookingId);

    if (!bookingId) {
      throw new Error('Failed to get booking ID');
    }

    // Insert booking services
    console.log('Inserting services for booking ID:', bookingId);
    for (const service of finalServices) {
      console.log('Inserting service:', service);
      await dbRun(
        `INSERT INTO booking_services (booking_id, service_id, service_name, service_price)
         VALUES (?, ?, ?, ?)`,
        [bookingId, service.id, service.name, service.price]
      );
    }
    console.log('Services inserted successfully');

    // Create notification
    await dbRun(
      `INSERT INTO notifications (type, title, message, link)
       VALUES (?, ?, ?, ?)`,
      [
        'booking',
        'Booking Baru',
        `${finalCustomerName} membuat booking untuk ${finalServices.map(s => s.name).join(', ')}`,
        '/admin/bookings'
      ]
    );

    // Get created booking with full details
    const booking = await dbGet(`
      SELECT b.*, br.name as barber_name, br.image as barber_image
      FROM bookings b
      LEFT JOIN barbers br ON b.barber_id = br.id
      WHERE b.id = ?
    `, [bookingId]);

    if (!booking) {
      // Fallback - return basic data
      return res.status(201).json({
        success: true,
        message: 'Booking berhasil dibuat',
        data: {
          id: bookingId,
          barber_id: finalBarberId,
          booking_date: finalDate,
          booking_time: finalTime,
          status: 'pending',
          total_price: finalTotalPrice,
          total_duration: finalTotalDuration,
          customer_name: finalCustomerName,
          customer_email: finalCustomerEmail,
          customer_phone: finalCustomerPhone,
          barber: {
            id: finalBarberId,
            name: '',
            image: ''
          },
          services: finalServices,
          customer: {
            name: finalCustomerName,
            email: finalCustomerEmail,
            phone: finalCustomerPhone
          }
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Booking berhasil dibuat',
      data: {
        ...booking,
        barber: {
          id: booking.barber_id,
          name: booking.barber_name || '',
          image: booking.barber_image || ''
        },
        services: finalServices,
        customer: {
          name: booking.customer_name,
          email: booking.customer_email,
          phone: booking.customer_phone
        }
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat booking'
    });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }

    const existing = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Booking tidak ditemukan'
      });
    }

    await dbRun(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    // Create notification for status change
    const statusMessages = {
      confirmed: 'Booking dikonfirmasi',
      completed: 'Booking selesai',
      cancelled: 'Booking dibatalkan'
    };

    if (statusMessages[status]) {
      await dbRun(
        `INSERT INTO notifications (type, title, message, link)
         VALUES (?, ?, ?, ?)`,
        [
          'booking',
          statusMessages[status],
          `Booking #${id} ${statusMessages[status].toLowerCase()}`,
          '/admin/bookings'
        ]
      );
    }

    const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Status booking berhasil diubah ke ${status}`,
      data: booking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah status booking'
    });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking tidak ditemukan'
      });
    }

    // Check if user owns this booking (non-admin)
    if (req.user.role !== 'admin' && booking.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses untuk membatalkan booking ini'
      });
    }

    // Check if booking can be cancelled
    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Booking yang sudah selesai tidak dapat dibatalkan'
      });
    }

    await dbRun(
      'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cancelled', id]
    );

    res.json({
      success: true,
      message: 'Booking berhasil dibatalkan'
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membatalkan booking'
    });
  }
};

// Get booked time slots
const getBookedSlots = async (req, res) => {
  try {
    const { date, barber_id } = req.query;

    if (!date || !barber_id) {
      return res.status(400).json({
        success: false,
        message: 'Parameter date dan barber_id diperlukan'
      });
    }

    const bookedSlots = await dbAll(
      `SELECT booking_time FROM bookings 
       WHERE barber_id = ? AND booking_date = ? AND status IN ('pending', 'confirmed')`,
      [barber_id, date]
    );

    res.json({
      success: true,
      data: bookedSlots.map(slot => slot.booking_time)
    });
  } catch (error) {
    console.error('Get booked slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan slot yang dibooking'
    });
  }
};

// Get booking statistics (admin)
const getBookingStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today's bookings
    const todayBookings = await dbGet(
      'SELECT COUNT(*) as count FROM bookings WHERE booking_date = ?',
      [today]
    );

    // Pending bookings
    const pendingBookings = await dbGet(
      "SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'"
    );

    // Total revenue (completed bookings)
    const totalRevenue = await dbGet(
      "SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status = 'completed'"
    );

    // Total bookings
    const totalBookings = await dbGet(
      'SELECT COUNT(*) as count FROM bookings'
    );

    // Completed today
    const completedToday = await dbGet(
      "SELECT COUNT(*) as count FROM bookings WHERE booking_date = ? AND status = 'completed'",
      [today]
    );

    // Weekly stats (last 7 days) - PostgreSQL compatible
    const weeklyStats = await dbAll(`
      SELECT booking_date as date, COUNT(*) as count, COALESCE(SUM(total_price), 0) as revenue
      FROM bookings
      WHERE booking_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY booking_date
      ORDER BY booking_date ASC
    `);

    res.json({
      success: true,
      data: {
        todayBookings: todayBookings.count,
        pendingBookings: pendingBookings.count,
        totalRevenue: totalRevenue.total,
        totalBookings: totalBookings.count,
        completedToday: completedToday.count,
        weeklyStats
      }
    });
  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan statistik booking'
    });
  }
};

module.exports = {
  getAllBookings,
  getUserBookings,
  getBooking,
  createBooking,
  updateBookingStatus,
  cancelBooking,
  getBookedSlots,
  getBookingStats
};