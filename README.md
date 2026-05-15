# Trendlify Backend — Dokumentasi Teknis

Layanan backend RESTful API untuk platform **Trendlify AI**, sistem intelijen pasar berbasis AI yang ditujukan untuk pelaku UMKM kuliner Indonesia. Backend ini menyediakan data tren kuliner real-time, analisis strategi bisnis berbasis AI, prediksi pertumbuhan produk, dan chatbot asisten bisnis.

---

## Teknologi yang Digunakan

### Framework & Runtime

| Teknologi | Versi | Kegunaan |
|---|---|---|
| **Node.js** | ≥ 18.x | Runtime JavaScript sisi server |
| **Express.js** | ^4.21.1 | Framework HTTP untuk routing dan middleware |
| **TypeScript** | ^5.7.2 | Static typing untuk keandalan kode |
| **tsx** | ^4.19.2 | Eksekusi TypeScript langsung tanpa build (mode dev) |

### Database & ORM

| Teknologi | Versi | Kegunaan |
|---|---|---|
| **PostgreSQL** (Neon) | — | Database utama cloud-hosted serverless |
| **Prisma ORM** | ^5.22.0 | Query builder, schema management, dan migrasi |
| **PgBouncer** | — | Connection pooling (Railway managed) |

### Autentikasi & Keamanan

| Teknologi | Versi | Kegunaan |
|---|---|---|
| **jsonwebtoken** | ^9.0.2 | Pembuatan dan verifikasi JWT Bearer token |
| **bcryptjs** | ^2.4.3 | Hashing password dengan salt rounds: 12 |
| **cors** | ^2.8.5 | Konfigurasi Cross-Origin Resource Sharing |

### Integrasi AI

| Provider | Model Default | Peran |
|---|---|---|
| **OpenRouter** | `meta-llama/llama-3.3-70b-instruct:free` | Provider utama — semua AI request dikirim ke sini pertama kali |
| **Google Gemini** | `gemini-2.0-flash` | Fallback pertama (direct API) |
| **Groq** | `llama-3.3-70b-versatile` | Fallback kedua jika Gemini tidak merespons |
| **Stub/Static** | — | Fallback terakhir jika semua provider gagal |

> Model OpenRouter dapat di-override via env `OPENROUTER_MODEL`. Fallback chain untuk chatbot berbeda: OpenRouter → Groq → Gemini → stub.

### Penjadwalan

| Teknologi | Versi | Kegunaan |
|---|---|---|
| **node-cron** | ^3.0.3 | Menjalankan job terjadwal (simulasi tren tiap jam) |

---

## Arsitektur Sistem

```
src/
├── index.ts                  — Entry point: Express app, CORS, routes, cron scheduler
├── lib/
│   ├── prisma.ts             — Prisma client singleton (PgBouncer: connection_limit=1)
│   └── trendRepository.ts   — Query latestSnapshots() dan regionalHeatmap()
├── middleware/
│   ├── auth.ts               — JWT: requireAuth, optionalAuth, signToken
│   └── adminOnly.ts          — Guard role === 'admin'
├── routes/                   — Satu file per resource
│   ├── auth.ts               — POST /register, /login, PUT /profile, /change-password, GET /user
│   ├── trends.ts             — GET /trends, GET /trends/profile
│   ├── regions.ts            — GET /regions/heatmap
│   ├── insights.ts           — POST /insights/generate, GET /insights
│   ├── chat.ts               — POST /chat
│   ├── predictions.ts        — GET /predictions/:snapshotId
│   ├── dashboard.ts          — GET /dashboard/overview
│   ├── ingest.ts             — POST /ingest/snapshot
│   └── admin.ts              — GET /admin/* (admin only)
├── services/
│   ├── chat.ts               — Chatbot Trendly: OpenRouter → Groq → Gemini → stub
│   ├── geminiInsight.ts      — Insight strategi bisnis: OpenRouter → Gemini → Groq → stub
│   ├── trendPrediction.ts    — Proyeksi pertumbuhan heuristik + narasi AI
│   └── trendProfile.ts       — Trend brief untuk AI context
└── jobs/
    └── simulateTrends.ts     — Simulasi fluktuasi skor tren tiap jam (createMany batch)
```

---

## Alur Fallback AI

Setiap request AI melewati rantai provider berikut. Jika satu provider gagal (timeout, error, quota habis), sistem otomatis melanjutkan ke provider berikutnya tanpa interupsi ke pengguna.

**AI Konsultan Kuliner (`geminiInsight.ts`):**
```
[Request Insight]
      │
      ▼
OpenRouter  ──gagal──▶  Gemini Flash  ──gagal──▶  Groq  ──gagal──▶  Stub Response
      │
   berhasil
      │
      ▼
[Simpan ke ai_insights & return ke user]
```

**Chatbot Trendly (`chat.ts`):**
```
[Request Chat]
      │
      ▼
OpenRouter  ──gagal──▶  Groq  ──gagal──▶  Gemini Flash  ──gagal──▶  Stub Response
```

---

## API Endpoints (`/api/v1`)

| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| POST | `/register` | — | Registrasi akun baru, return JWT |
| POST | `/login` | — | Login, return JWT |
| GET | `/user` | JWT | Data profil user yang sedang login |
| PUT | `/profile` | JWT | Update nama & kategori usaha |
| PUT | `/change-password` | JWT | Verifikasi & ganti password |
| POST | `/logout` | JWT | Logout (stateless, client hapus token) |
| GET | `/dashboard/overview` | JWT | Ringkasan data tren untuk dashboard |
| GET | `/trends` | JWT | Daftar tren terkini (`?limit=50&region=ID-JK`) |
| GET | `/trends/profile` | JWT | Brief tren untuk konteks AI |
| GET | `/regions/heatmap` | JWT | Peta panas tren per provinsi (ID-XX) |
| POST | `/insights/generate` | JWT | Generate analisis strategi bisnis AI |
| GET | `/insights` | JWT | Riwayat AI insight user |
| POST | `/chat` | JWT | Chatbot Trendly untuk konsultasi kuliner |
| GET | `/predictions/:snapshotId` | JWT | Prediksi pertumbuhan tren 7 hari |
| POST | `/ingest/snapshot` | Admin | Input data snapshot baru |
| GET | `/admin/*` | JWT + Admin | Statistik & manajemen platform |

---

## Database Schema

Database menggunakan **PostgreSQL (Neon serverless)** dengan 4 model utama:

| Model | Keterangan |
|---|---|
| `User` | Akun pengguna dengan role (user/admin), kategori bisnis, dan kode wilayah |
| `Category` | Kategori kuliner (modern, tradisional, minuman, dll) |
| `TrendSnapshot` | Data historis skor tren per keyword dan region dengan timestamp |
| `TrendPrediction` | Hasil prediksi pertumbuhan per snapshot dengan confidence score dan narasi AI |
| `AiInsight` | Riwayat insight AI yang dihasilkan per user |

---

## Fitur Utama

### 1. Tren Kuliner Real-time
Data tren disimpan sebagai snapshot historis per keyword dan region. Setiap jam, job `simulateTrends` menjalankan simulasi fluktuasi skor menggunakan `createMany` batch untuk mensimulasikan pergerakan pasar selama demo/pengembangan.

### 2. AI Konsultan Kuliner (Insight)
Endpoint `/insights/generate` menghasilkan laporan strategi lengkap yang mencakup: verdict tren, kalkulasi peluang cuan, profil pembeli, 3 strategi promosi, konten siap pakai (TikTok/Instagram), dan action plan 7 hari. Disimpan ke tabel `ai_insights` untuk riwayat.

### 3. Chatbot Trendly
Asisten AI interaktif khusus UMKM kuliner yang membantu pertanyaan seputar bisnis makanan & minuman, strategi promosi, penetapan harga, dan platform jualan (GoFood, GrabFood, TikTok Shop). Mendukung conversation history dalam satu sesi.

### 4. Prediksi Pertumbuhan
Model heuristik (v1) yang memproyeksikan pertumbuhan tren 7 hari ke depan berdasarkan `trend_score` dan momentum historis. Hasil disimpan di `trend_predictions` dengan unique constraint `(trendSnapshotId, horizonDays)` agar tidak di-generate ulang untuk snapshot yang sama.

### 5. Heatmap Regional
Visualisasi data tren per provinsi Indonesia menggunakan rata-rata skor per wilayah (kode `ID-JK`, `ID-JB`, `ID-JT`, dll).

---

## Konfigurasi Environment

```env
# Database (Neon PostgreSQL via PgBouncer)
DATABASE_URL=postgresql://...         # Pooled connection string (runtime)
DIRECT_URL=postgresql://...           # Direct connection (prisma db push/migrate)

# Auth
JWT_SECRET=                           # Secret panjang untuk signing JWT

# AI Providers
OPENROUTER_API_KEY=                   # API key OpenRouter (provider utama)
OPENROUTER_MODEL=                     # Default: meta-llama/llama-3.3-70b-instruct:free
GEMINI_API_KEY=                       # API key Google Gemini (fallback)
GEMINI_MODEL=                         # Default: gemini-2.0-flash
GROQ_API_KEY=                         # API key Groq (fallback)
GROQ_MODEL=                           # Default: llama-3.3-70b-versatile

# Server
PORT=8000                             # Diset otomatis oleh Railway
FRONTEND_URL=                         # Whitelist CORS origin (comma-separated)
```

---

## Cara Menjalankan

```bash
# 1. Install dependencies
npm install

# 2. Salin dan isi environment variables
cp .env.example .env

# 3. Push schema ke database
npx prisma db push

# 4. Seed data awal (keyword kuliner + demo user)
npm run db:seed

# 5. Jalankan dev server (hot reload, port 8000)
npm run dev

# 6. Build untuk production
npm run build && npm start
```

---

## Optimasi yang Diterapkan

- **PgBouncer compatibility**: Prisma otomatis menambahkan `pgbouncer=true&connection_limit=1` ke DATABASE_URL agar kompatibel dengan PgBouncer transaction mode di Railway — mencegah error "prepared statement already exists".
- **Batch insert**: `simulateTrends` menggunakan `createMany` (1 query untuk banyak row) menggantikan loop `create` satu per satu, mengurangi beban koneksi ke Neon secara signifikan.
- **Fallback chain AI**: Tiga provider AI dengan fallback otomatis memastikan availability tinggi meski salah satu provider down atau quota habis.
- **Stateless auth**: JWT Bearer token tanpa session storage, cocok untuk arsitektur mobile-first.
- **Prediction caching**: Hasil prediksi disimpan di database — tidak di-generate ulang untuk snapshot yang sama.
