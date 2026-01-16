# 🔄 Panduan Migrasi SQLite ke PostgreSQL

## Perubahan yang Dilakukan

### 1. File yang Dimodifikasi
- `src/database/db.js` - Database connection (sekarang menggunakan PostgreSQL)
- `src/controllers/bookingController.js` - Fixed date query syntax
- `package.json` - Menambahkan dependency `pg`

### 2. File Baru
- `src/database/db-postgres.js` - PostgreSQL connection module (backup)
- `src/database/init-postgres.js` - Script inisialisasi database PostgreSQL
- `.env.example` - Contoh environment variables

---

## 🚀 Langkah-langkah Migrasi

### Langkah 1: Setup PostgreSQL

#### Opsi A: Local PostgreSQL
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql

# Create database
sudo -u postgres psql
CREATE DATABASE outlook_barbershop;
CREATE USER outlook_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE outlook_barbershop TO outlook_user;
\q
```

#### Opsi B: Railway (Recommended untuk Production)
1. Buka https://railway.app
2. Buat project baru
3. Add PostgreSQL database
4. Copy DATABASE_URL dari Settings → Variables

#### Opsi C: Supabase (Free Tier)
1. Buka https://supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy Connection String (URI)

#### Opsi D: Render
1. Buka https://render.com
2. Create PostgreSQL database
3. Copy External Database URL

---

### Langkah 2: Setup Environment Variables

1. Copy `.env.example` ke `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` dan isi DATABASE_URL:
```env
# Local PostgreSQL
DATABASE_URL=postgresql://outlook_user:your_password@localhost:5432/outlook_barbershop

# Railway
DATABASE_URL=postgresql://postgres:xxxxx@containers-us-west-xxx.railway.app:5432/railway

# Supabase
DATABASE_URL=postgresql://postgres:xxxxx@db.xxxxx.supabase.co:5432/postgres

# Render
DATABASE_URL=postgresql://user:xxxxx@dpg-xxxxx.oregon-postgres.render.com/outlook_barbershop
```

---

### Langkah 3: Install Dependencies

```bash
npm install
```

Atau manual:
```bash
npm install pg
```

---

### Langkah 4: Initialize Database

```bash
npm run init-db
```

Output yang diharapkan:
```
🔧 Initializing PostgreSQL database...
📍 Database URL: Connected
✅ Database connection successful
📦 Creating tables...
  ✓ users table
  ✓ barbers table
  ✓ services table
  ✓ bookings table
  ✓ booking_services table
  ✓ reviews table
  ✓ gallery table
  ✓ notifications table
📇 Creating indexes...
  ✓ indexes created
✅ Tables created successfully
🌱 Seeding initial data...
  ✓ users seeded
  ✓ barbers seeded
  ✓ services seeded
  ✓ gallery seeded
  ✓ reviews seeded
  ✓ notifications seeded
✅ Initial data seeded successfully

🎉 Database initialization complete!

📊 Data Summary:
   Users: 2
   Barbers: 6
   Services: 12
   Gallery: 10
   Reviews: 6
   Notifications: 3
```

---

### Langkah 5: Jalankan Server

```bash
# Development
npm run dev

# Production
npm start
```

---

## 🔍 Perbedaan SQLite vs PostgreSQL

| Fitur | SQLite | PostgreSQL |
|-------|--------|------------|
| Placeholder | `?` | `$1, $2, $3...` |
| Boolean | `1` / `0` | `true` / `false` |
| Auto Increment | `AUTOINCREMENT` | `SERIAL` |
| Date Function | `date('now')` | `CURRENT_DATE` |
| Last Insert ID | `last_insert_rowid()` | `RETURNING id` |

**Catatan:** File `db.js` sudah menangani konversi otomatis, jadi controller tidak perlu diubah.

---

## 🛠️ Troubleshooting

### Error: "DATABASE_URL is not set"
- Pastikan file `.env` ada dan berisi DATABASE_URL
- Restart server setelah mengubah `.env`

### Error: "Connection refused"
- Pastikan PostgreSQL server berjalan
- Periksa host, port, username, password

### Error: "SSL required"
- Tambahkan `?sslmode=require` di akhir DATABASE_URL
- Atau set `NODE_ENV=production`

### Error: "Permission denied"
- Pastikan user memiliki akses ke database
- Jalankan: `GRANT ALL PRIVILEGES ON DATABASE dbname TO username;`

---

## 📝 Default Credentials

Setelah init-db, Anda bisa login dengan:

**Admin:**
- Email: `admin@outlook.com`
- Password: `admin123`

**User:**
- Email: `john@email.com`
- Password: `user123`

---

## 🔄 Rollback ke SQLite

Jika ingin kembali ke SQLite:

1. Install sql.js:
```bash
npm install sql.js
```

2. Ganti import di controllers:
```javascript
// Dari
const { dbRun, dbGet, dbAll } = require('../database/db');

// Ke
const { dbRun, dbGet, dbAll } = require('../database/db-sqlite');
```

3. Rename file:
```bash
mv src/database/db.js src/database/db-postgres.js
mv src/database/db-sqlite-backup.js src/database/db.js
```

---

## 📚 Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [node-postgres (pg) Documentation](https://node-postgres.com/)
- [Railway Documentation](https://docs.railway.app/)
- [Supabase Documentation](https://supabase.com/docs)
