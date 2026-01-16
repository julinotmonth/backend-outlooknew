const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', '..', 'database');
const dbPath = path.join(dbDir, 'outlook.db');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const init = async () => {
  console.log('🔧 Initializing database...');
  
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    
    // Create tables
    console.log('📦 Creating tables...');
    
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Barbers table
    db.run(`
      CREATE TABLE IF NOT EXISTS barbers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'Barber',
        image TEXT,
        rating REAL DEFAULT 0,
        reviews_count INTEGER DEFAULT 0,
        experience INTEGER DEFAULT 0,
        bio TEXT,
        phone TEXT,
        instagram TEXT,
        specialties TEXT,
        is_available INTEGER DEFAULT 1,
        work_start_time TEXT DEFAULT '09:00',
        work_end_time TEXT DEFAULT '18:00',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Services table
    db.run(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        category TEXT,
        image TEXT,
        is_popular INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bookings table
    db.run(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        barber_id INTEGER NOT NULL,
        booking_date TEXT NOT NULL,
        booking_time TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        total_price INTEGER NOT NULL,
        total_duration INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        notes TEXT,
        payment_method TEXT,
        payment_status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (barber_id) REFERENCES barbers(id)
      )
    `);

    // Booking Services (junction table)
    db.run(`
      CREATE TABLE IF NOT EXISTS booking_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        service_name TEXT NOT NULL,
        service_price INTEGER NOT NULL,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `);

    // Reviews table
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER UNIQUE,
        barber_id INTEGER NOT NULL,
        user_id INTEGER,
        customer_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        services TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (barber_id) REFERENCES barbers(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Gallery table
    db.run(`
      CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        image TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tables created successfully');

    // Seed data
    console.log('🌱 Seeding initial data...');
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    // Seed Users
    db.run(`INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)`, 
      ['Admin', 'admin@outlook.com', '081234567890', adminPassword, 'admin']);
    db.run(`INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)`, 
      ['John Doe', 'john@email.com', '081234567891', userPassword, 'user']);

    // Seed Barbers (6 barbers)
    const barbers = [
      ['Ahmad Rizky', 'Master Barber', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 4.9, 8, 'Barber profesional dengan pengalaman 8 tahun', '081111111111', '@ahmadrizky', 'Classic Cut, Fade, Pompadour, Gentleman Cut', 1, '09:00', '20:00'],
      ['Budi Santoso', 'Senior Barber', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 4.8, 6, 'Spesialis gaya modern dan pewarnaan rambut', '081222222222', '@budisantoso', 'Modern Style, Beard Trim, Hair Color, Texture', 1, '09:00', '18:00'],
      ['Dimas Pratama', 'Creative Barber', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 4.7, 5, 'Ahli hair design dan gaya kreatif', '081333333333', '@dimaspratama', 'Undercut, Skin Fade, Hair Design, Modern Styles', 1, '10:00', '19:00'],
      ['Eko Wijaya', 'Senior Barber', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', 4.8, 7, 'Master hot towel shave dan beard styling', '081444444444', '@ekowijaya', 'Classic Cut, Hot Towel Shave, Beard Styling', 1, '09:00', '17:00'],
      ['Faisal Rahman', 'Barber', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', 4.6, 3, 'Ramah dengan anak-anak dan remaja', '081555555555', '@faisalrahman', 'Fade, Kids Haircut, Basic Cut', 1, '10:00', '20:00'],
      ['Gilang Permana', 'Junior Barber', 'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=400', 4.5, 2, 'Junior barber yang tekun dan cepat belajar', '081666666666', '@gilangpermana', 'Basic Cut, Styling, Shaving', 1, '09:00', '18:00']
    ];
    
    barbers.forEach(b => {
      db.run(`INSERT INTO barbers (name, role, image, rating, experience, bio, phone, instagram, specialties, is_available, work_start_time, work_end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, b);
    });

    // Seed Services (12 services)
    const services = [
      ['Classic Haircut', 'Potongan rambut klasik dengan teknik gunting tradisional untuk tampilan timeless yang elegan', 75000, 30, 'haircut', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800', 1, 1],
      ['Fade Haircut', 'Potongan dengan gradasi halus dari bawah ke atas, cocok untuk tampilan modern dan clean', 85000, 45, 'haircut', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800', 1, 1],
      ['Skin Fade', 'Fade ekstrim hingga ke kulit untuk tampilan yang super clean dan edgy', 95000, 45, 'haircut', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800', 1, 1],
      ['Pompadour Style', 'Gaya klasik dengan volume di bagian atas, sempurna untuk acara formal', 100000, 50, 'haircut', 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800', 0, 1],
      ['Undercut', 'Potongan modern dengan sisi pendek dan atas panjang untuk gaya versatile', 90000, 40, 'haircut', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', 0, 1],
      ['Kids Haircut', 'Potongan rambut khusus untuk anak-anak dengan pendekatan ramah dan sabar', 50000, 25, 'haircut', 'https://images.unsplash.com/photo-1596728325488-58c87691e9af?w=800', 0, 1],
      ['Beard Trim', 'Rapikan dan bentuk jenggot sesuai keinginan dengan presisi tinggi', 50000, 20, 'beard', 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800', 0, 1],
      ['Beard Styling', 'Styling jenggot lengkap termasuk shaping, trimming, dan conditioning', 75000, 30, 'beard', 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=800', 0, 1],
      ['Hot Towel Shave', 'Cukur bersih dengan handuk panas tradisional untuk hasil maksimal dan kulit halus', 65000, 30, 'shaving', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800', 0, 1],
      ['Hair Coloring', 'Pewarnaan rambut dengan produk premium untuk hasil natural dan tahan lama', 150000, 60, 'coloring', 'https://images.unsplash.com/photo-1620122830784-c29a955e0c77?w=800', 0, 1],
      ['Hair Treatment', 'Perawatan rambut intensif untuk kesehatan dan kelembapan maksimal', 100000, 45, 'treatment', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', 0, 1],
      ['Premium Package', 'Paket lengkap: Haircut + Beard Trim + Hot Towel Shave + Hair Wash + Styling', 200000, 90, 'package', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800', 1, 1]
    ];
    
    services.forEach(s => {
      db.run(`INSERT INTO services (name, description, price, duration, category, image, is_popular, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, s);
    });

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
    
    gallery.forEach(g => {
      db.run(`INSERT INTO gallery (title, category, image) VALUES (?, ?, ?)`, g);
    });

    // Seed Reviews
    const reviews = [
      [1, 'Andi Pratama', 5, 'Hasil potongnya sangat rapi dan sesuai ekspektasi. Mas Ahmad memang jago!', 'Classic Haircut'],
      [1, 'Rudi Hermawan', 5, 'Master barber terbaik! Sudah langganan dari 2 tahun lalu, selalu puas.', 'Fade Haircut, Beard Trim'],
      [2, 'Fajar Nugroho', 4, 'Tempatnya nyaman, hasilnya bagus. Mas Budi orangnya ramah banget.', 'Premium Package'],
      [3, 'Deni Saputra', 5, 'Pertama kali coba dan langsung puas. Hair design-nya keren! Pasti balik lagi!', 'Skin Fade'],
      [4, 'Rio Febrian', 5, 'Hot towel shave-nya mantap! Kulit jadi halus banget.', 'Hot Towel Shave'],
      [2, 'Hendra Wijaya', 4, 'Pelayanan cepat dan hasil memuaskan. Worth the price!', 'Pompadour Style']
    ];
    
    reviews.forEach(r => {
      db.run(`INSERT INTO reviews (barber_id, customer_name, rating, comment, services) VALUES (?, ?, ?, ?, ?)`, r);
    });

    // Seed Notifications
    const notifications = [
      ['booking', 'Booking Baru', 'Ada booking baru dari Andi Pratama untuk tanggal 15 Desember', '/admin/bookings', 0],
      ['review', 'Review Baru', 'Rudi Hermawan memberikan rating 5 bintang', '/admin', 0],
      ['system', 'Selamat Datang', 'Selamat datang di Outlook Barbershop Admin Panel!', '/admin', 1]
    ];
    
    notifications.forEach(n => {
      db.run(`INSERT INTO notifications (type, title, message, link, is_read) VALUES (?, ?, ?, ?, ?)`, n);
    });

    console.log('✅ Initial data seeded successfully');

    // Save database to file
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    
    console.log('🎉 Database initialization complete!');
    console.log(`📁 Database location: ${dbPath}`);
    
    // Show summary
    const counts = {
      users: db.exec("SELECT COUNT(*) FROM users")[0].values[0][0],
      barbers: db.exec("SELECT COUNT(*) FROM barbers")[0].values[0][0],
      services: db.exec("SELECT COUNT(*) FROM services")[0].values[0][0],
      gallery: db.exec("SELECT COUNT(*) FROM gallery")[0].values[0][0],
      reviews: db.exec("SELECT COUNT(*) FROM reviews")[0].values[0][0],
      notifications: db.exec("SELECT COUNT(*) FROM notifications")[0].values[0][0]
    };
    
    console.log('\n📊 Data Summary:');
    console.log(`   Users: ${counts.users}`);
    console.log(`   Barbers: ${counts.barbers}`);
    console.log(`   Services: ${counts.services}`);
    console.log(`   Gallery: ${counts.gallery}`);
    console.log(`   Reviews: ${counts.reviews}`);
    console.log(`   Notifications: ${counts.notifications}`);
    
    db.close();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

init();
