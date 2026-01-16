require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, dbQuery } = require('./db-postgres');

const init = async () => {
  console.log('🔧 Initializing PostgreSQL database...');
  console.log('📍 Database URL:', process.env.DATABASE_URL ? 'Connected' : 'NOT SET!');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.log('');
    console.log('Please set DATABASE_URL in your .env file:');
    console.log('DATABASE_URL=postgresql://username:password@host:port/database');
    console.log('');
    console.log('Examples:');
    console.log('  Local: DATABASE_URL=postgresql://postgres:password@localhost:5432/outlook_barbershop');
    console.log('  Railway: DATABASE_URL=postgresql://postgres:xxx@xxx.railway.app:5432/railway');
    console.log('  Supabase: DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres');
    process.exit(1);
  }

  try {
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful:', testResult.rows[0].now);

    // Create tables
    console.log('📦 Creating tables...');

    // Users table
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        avatar TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ users table');

    // Barbers table
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS barbers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(100) DEFAULT 'Barber',
        image TEXT,
        rating DECIMAL(3,2) DEFAULT 0,
        reviews_count INTEGER DEFAULT 0,
        experience INTEGER DEFAULT 0,
        bio TEXT,
        phone VARCHAR(50),
        instagram VARCHAR(100),
        specialties TEXT,
        is_available BOOLEAN DEFAULT true,
        work_start_time VARCHAR(10) DEFAULT '09:00',
        work_end_time VARCHAR(10) DEFAULT '18:00',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ barbers table');

    // Services table
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        category VARCHAR(100),
        image TEXT,
        is_popular BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ services table');

    // Bookings table
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
        booking_date DATE NOT NULL,
        booking_time VARCHAR(10) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        total_price INTEGER NOT NULL,
        total_duration INTEGER NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        notes TEXT,
        payment_method VARCHAR(100),
        payment_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ bookings table');

    // Booking Services (junction table)
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS booking_services (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        service_name VARCHAR(255) NOT NULL,
        service_price INTEGER NOT NULL
      )
    `);
    console.log('  ✓ booking_services table');

    // Reviews table
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER UNIQUE REFERENCES bookings(id) ON DELETE SET NULL,
        barber_id INTEGER NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        customer_name VARCHAR(255) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        services TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ reviews table');

    // Gallery table
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS gallery (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        image TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ gallery table');

    // Notifications table
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ notifications table');

    // Create indexes for better performance
    console.log('📇 Creating indexes...');
    
    await dbQuery(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await dbQuery(`CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)`);
    await dbQuery(`CREATE INDEX IF NOT EXISTS idx_bookings_barber_id ON bookings(barber_id)`);
    await dbQuery(`CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date)`);
    await dbQuery(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`);
    await dbQuery(`CREATE INDEX IF NOT EXISTS idx_reviews_barber_id ON reviews(barber_id)`);
    await dbQuery(`CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON booking_services(booking_id)`);
    
    console.log('  ✓ indexes created');

    console.log('✅ Tables created successfully');

    // Check if data already exists
    const existingUsers = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(existingUsers.rows[0].count) > 0) {
      console.log('ℹ️  Data already exists, skipping seed...');
    } else {
      // Seed data
      console.log('🌱 Seeding initial data...');
      await seedData();
    }

    console.log('');
    console.log('🎉 Database initialization complete!');
    
    // Show summary
    const counts = {
      users: (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count,
      barbers: (await pool.query('SELECT COUNT(*) FROM barbers')).rows[0].count,
      services: (await pool.query('SELECT COUNT(*) FROM services')).rows[0].count,
      gallery: (await pool.query('SELECT COUNT(*) FROM gallery')).rows[0].count,
      reviews: (await pool.query('SELECT COUNT(*) FROM reviews')).rows[0].count,
      notifications: (await pool.query('SELECT COUNT(*) FROM notifications')).rows[0].count
    };
    
    console.log('');
    console.log('📊 Data Summary:');
    console.log(`   Users: ${counts.users}`);
    console.log(`   Barbers: ${counts.barbers}`);
    console.log(`   Services: ${counts.services}`);
    console.log(`   Gallery: ${counts.gallery}`);
    console.log(`   Reviews: ${counts.reviews}`);
    console.log(`   Notifications: ${counts.notifications}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    await pool.end();
    process.exit(1);
  }
};

// Seed initial data
const seedData = async () => {
  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  // Seed Users
  await pool.query(
    `INSERT INTO users (name, email, phone, password, role) VALUES ($1, $2, $3, $4, $5)`,
    ['Admin', 'admin@outlook.com', '081234567890', adminPassword, 'admin']
  );
  await pool.query(
    `INSERT INTO users (name, email, phone, password, role) VALUES ($1, $2, $3, $4, $5)`,
    ['John Doe', 'john@email.com', '081234567891', userPassword, 'user']
  );
  console.log('  ✓ users seeded');

  // Seed Barbers (6 barbers)
  const barbers = [
    ['Ahmad Rizky', 'Master Barber', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 4.9, 8, 'Barber profesional dengan pengalaman 8 tahun', '081111111111', '@ahmadrizky', 'Classic Cut, Fade, Pompadour, Gentleman Cut', true, '09:00', '20:00'],
    ['Budi Santoso', 'Senior Barber', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 4.8, 6, 'Spesialis gaya modern dan pewarnaan rambut', '081222222222', '@budisantoso', 'Modern Style, Beard Trim, Hair Color, Texture', true, '09:00', '18:00'],
    ['Dimas Pratama', 'Creative Barber', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 4.7, 5, 'Ahli hair design dan gaya kreatif', '081333333333', '@dimaspratama', 'Undercut, Skin Fade, Hair Design, Modern Styles', true, '10:00', '19:00'],
    ['Eko Wijaya', 'Senior Barber', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', 4.8, 7, 'Master hot towel shave dan beard styling', '081444444444', '@ekowijaya', 'Classic Cut, Hot Towel Shave, Beard Styling', true, '09:00', '17:00'],
    ['Faisal Rahman', 'Barber', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', 4.6, 3, 'Ramah dengan anak-anak dan remaja', '081555555555', '@faisalrahman', 'Fade, Kids Haircut, Basic Cut', true, '10:00', '20:00'],
    ['Gilang Permana', 'Junior Barber', 'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=400', 4.5, 2, 'Junior barber yang tekun dan cepat belajar', '081666666666', '@gilangpermana', 'Basic Cut, Styling, Shaving', true, '09:00', '18:00']
  ];
  
  for (const b of barbers) {
    await pool.query(
      `INSERT INTO barbers (name, role, image, rating, experience, bio, phone, instagram, specialties, is_available, work_start_time, work_end_time) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      b
    );
  }
  console.log('  ✓ barbers seeded');

  // Seed Services (12 services)
  const services = [
    ['Classic Haircut', 'Potongan rambut klasik dengan teknik gunting tradisional untuk tampilan timeless yang elegan', 75000, 30, 'haircut', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800', true, true],
    ['Fade Haircut', 'Potongan dengan gradasi halus dari bawah ke atas, cocok untuk tampilan modern dan clean', 85000, 45, 'haircut', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800', true, true],
    ['Skin Fade', 'Fade ekstrim hingga ke kulit untuk tampilan yang super clean dan edgy', 95000, 45, 'haircut', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800', true, true],
    ['Pompadour Style', 'Gaya klasik dengan volume di bagian atas, sempurna untuk acara formal', 100000, 50, 'haircut', 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800', false, true],
    ['Undercut', 'Potongan modern dengan sisi pendek dan atas panjang untuk gaya versatile', 90000, 40, 'haircut', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', false, true],
    ['Kids Haircut', 'Potongan rambut khusus untuk anak-anak dengan pendekatan ramah dan sabar', 50000, 25, 'haircut', 'https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=800', false, true],
    ['Beard Trim', 'Rapikan dan bentuk jenggot sesuai keinginan dengan presisi tinggi', 50000, 20, 'beard', 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800', false, true],
    ['Beard Styling', 'Styling jenggot lengkap termasuk shaping, trimming, dan conditioning', 75000, 30, 'beard', 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800', false, true],
    ['Hot Towel Shave', 'Cukur bersih dengan handuk panas tradisional untuk hasil maksimal dan kulit halus', 65000, 30, 'shaving', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', false, true],
    ['Hair Coloring', 'Pewarnaan rambut dengan produk premium untuk hasil natural dan tahan lama', 150000, 60, 'coloring', 'https://images.unsplash.com/photo-1620122830784-c29a955e0c77?w=800', false, true],
    ['Hair Treatment', 'Perawatan rambut intensif untuk kesehatan dan kelembapan maksimal', 100000, 45, 'treatment', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', false, true],
    ['Premium Package', 'Paket lengkap: Haircut + Beard Trim + Hot Towel Shave + Hair Wash + Styling', 200000, 90, 'package', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', true, true]
  ];
  
  for (const s of services) {
    await pool.query(
      `INSERT INTO services (name, description, price, duration, category, image, is_popular, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      s
    );
  }
  console.log('  ✓ services seeded');

  // Seed Gallery (10 items)
  const gallery = [
    ['Classic Pompadour', 'haircut', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800'],
    ['Modern Skin Fade', 'haircut', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800'],
    ['Textured Crop', 'haircut', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800'],
    ['Slick Back Style', 'haircut', 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800'],
    ['Full Beard Styling', 'beard', 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800'],
    ['Clean Shave Result', 'shaving', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800'],
    ['Barbershop Interior', 'interior', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800'],
    ['Premium Hair Color', 'coloring', 'https://images.unsplash.com/photo-1620122830784-c29a955e0c77?w=800'],
    ['Vintage Corner', 'interior', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800'],
    ['Kids Happy Cut', 'haircut', 'https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=800']
  ];
  
  for (const g of gallery) {
    await pool.query(
      `INSERT INTO gallery (title, category, image) VALUES ($1, $2, $3)`,
      g
    );
  }
  console.log('  ✓ gallery seeded');

  // Seed Reviews
  const reviews = [
    [1, 'Andi Pratama', 5, 'Hasil potongnya sangat rapi dan sesuai ekspektasi. Mas Ahmad memang jago!', 'Classic Haircut'],
    [1, 'Rudi Hermawan', 5, 'Master barber terbaik! Sudah langganan dari 2 tahun lalu, selalu puas.', 'Fade Haircut, Beard Trim'],
    [2, 'Fajar Nugroho', 4, 'Tempatnya nyaman, hasilnya bagus. Mas Budi orangnya ramah banget.', 'Premium Package'],
    [3, 'Deni Saputra', 5, 'Pertama kali coba dan langsung puas. Hair design-nya keren! Pasti balik lagi!', 'Skin Fade'],
    [4, 'Rio Febrian', 5, 'Hot towel shave-nya mantap! Kulit jadi halus banget.', 'Hot Towel Shave'],
    [2, 'Hendra Wijaya', 4, 'Pelayanan cepat dan hasil memuaskan. Worth the price!', 'Pompadour Style']
  ];
  
  for (const r of reviews) {
    await pool.query(
      `INSERT INTO reviews (barber_id, customer_name, rating, comment, services) VALUES ($1, $2, $3, $4, $5)`,
      r
    );
  }
  console.log('  ✓ reviews seeded');

  // Seed Notifications
  const notifications = [
    ['booking', 'Booking Baru', 'Ada booking baru dari Andi Pratama untuk tanggal 15 Desember', '/admin/bookings', false],
    ['review', 'Review Baru', 'Rudi Hermawan memberikan rating 5 bintang', '/admin', false],
    ['system', 'Selamat Datang', 'Selamat datang di Outlook Barbershop Admin Panel!', '/admin', true]
  ];
  
  for (const n of notifications) {
    await pool.query(
      `INSERT INTO notifications (type, title, message, link, is_read) VALUES ($1, $2, $3, $4, $5)`,
      n
    );
  }
  console.log('  ✓ notifications seeded');

  console.log('✅ Initial data seeded successfully');
};

// Run initialization
init();
