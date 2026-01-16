# Outlook Barbershop Backend API

Backend API untuk aplikasi Outlook Barbershop menggunakan Node.js, Express, dan SQLite.

## 🚀 Fitur

- **Authentication**: Register, Login, Google OAuth (simulated)
- **Barbers**: CRUD barber dengan jadwal kerja
- **Services**: CRUD layanan dengan kategori
- **Bookings**: Sistem booking dengan validasi waktu
- **Reviews**: Sistem rating dan ulasan
- **Gallery**: Manajemen galeri foto
- **Notifications**: Sistem notifikasi admin
- **File Upload**: Upload gambar dengan multer

## 📋 Persyaratan

- Node.js v16 atau lebih baru
- npm atau yarn

## 🛠️ Instalasi

```bash
# 1. Install dependencies
npm install

# 2. Inisialisasi database
npm run init-db

# 3. Jalankan server (development)
npm run dev

# 4. Atau jalankan server (production)
npm start
```

## 📁 Struktur Folder

```
outlook-backend/
├── database/
│   └── outlook.db          # SQLite database
├── src/
│   ├── controllers/        # Request handlers
│   ├── database/           # Database config & init
│   ├── middleware/         # Auth & validation
│   ├── routes/             # API routes
│   └── server.js           # Entry point
├── uploads/                # Uploaded files
├── .env                    # Environment variables
└── package.json
```

## 🔑 Environment Variables

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user baru |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/google` | Login dengan Google |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/change-password` | Ganti password |

### Barbers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/barbers` | Get semua barber |
| GET | `/api/barbers/:id` | Get detail barber |
| POST | `/api/barbers` | Tambah barber (admin) |
| PUT | `/api/barbers/:id` | Update barber (admin) |
| DELETE | `/api/barbers/:id` | Hapus barber (admin) |

### Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | Get semua layanan |
| GET | `/api/services/categories` | Get kategori |
| POST | `/api/services` | Tambah layanan (admin) |
| PUT | `/api/services/:id` | Update layanan (admin) |
| DELETE | `/api/services/:id` | Hapus layanan (admin) |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | Get semua booking (admin) |
| GET | `/api/bookings/my-bookings` | Get booking user |
| GET | `/api/bookings/stats` | Get statistik (admin) |
| GET | `/api/bookings/booked-slots` | Get slot yang sudah dibooking |
| POST | `/api/bookings` | Buat booking baru |
| PUT | `/api/bookings/:id/status` | Update status (admin) |
| POST | `/api/bookings/:id/cancel` | Batalkan booking |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews` | Get semua review |
| GET | `/api/reviews/top` | Get review teratas |
| GET | `/api/reviews/barber/:id` | Get review barber |
| POST | `/api/reviews` | Tambah review |
| DELETE | `/api/reviews/:id` | Hapus review (admin) |

### Gallery
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gallery` | Get semua galeri |
| GET | `/api/gallery/categories` | Get kategori |
| POST | `/api/gallery` | Tambah galeri (admin) |
| PUT | `/api/gallery/:id` | Update galeri (admin) |
| DELETE | `/api/gallery/:id` | Hapus galeri (admin) |

### Notifications (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifikasi |
| PUT | `/api/notifications/:id/read` | Tandai dibaca |
| PUT | `/api/notifications/read-all` | Tandai semua dibaca |
| DELETE | `/api/notifications/:id` | Hapus notifikasi |

### Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/image` | Upload single image |
| POST | `/api/upload/images` | Upload multiple images |

## 👤 Default Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@outlook.com | admin123 |
| User | john@email.com | user123 |

## 🔒 Authentication

API menggunakan JWT Bearer token. Sertakan token di header:

```
Authorization: Bearer <your-token>
```

## 📝 Response Format

Success Response:
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

Error Response:
```json
{
  "success": false,
  "message": "Error message"
}
```

## 🧪 Testing API

Gunakan Postman atau curl:

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@outlook.com", "password": "admin123"}'

# Get barbers
curl http://localhost:5000/api/barbers

# Get services (aktif saja)
curl http://localhost:5000/api/services?active=true
```

## 📄 License

MIT License
