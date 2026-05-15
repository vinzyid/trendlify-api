# Trendlify Backend — Architecture & System Design



## Overview

Trendlify Backend adalah REST API yang melayani aplikasi mobile Trendlify — platform AI analitik tren kuliner untuk UMKM Indonesia. Backend menangani autentikasi, data tren, AI insight, prediksi, dan heatmap regional.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js v4 |
| ORM | Prisma v5 |
| Database | PostgreSQL (Neon) via PgBouncer |
| AI / LLM | Google Gemini (via REST) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Scheduler | node-cron |
| Deployment | Railway |
| Connection Pool | PgBouncer (Railway managed) |

---

## Struktur Proyek

```
backend-express/
├── prisma/
│   ├── schema.prisma          # Database schema & relasi
│   └── migrations/            # Migration history
├── src/
│   ├── index.ts               # Entry point, route mounting, cron job
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton + PgBouncer config
│   │   └── trendRepository.ts # Query helper untuk TrendSnapshot
│   ├── middleware/
│   │   ├── auth.ts            # JWT verify, requireAuth middleware
│   │   └── adminOnly.ts       # Role-based access guard
│   ├── routes/
│   │   ├── auth.ts            # Register, login, profile, change-password
│   │   ├── dashboard.ts       # Overview stats & hero trend
│   │   ├── trends.ts          # Daftar tren, profil tren
│   │   ├── regions.ts         # Heatmap regional
│   │   ├── chat.ts            # AI chatbot (Gemini)
│   │   ├── insights.ts        # AI insight per produk
│   │   ├── predictions.ts     # Prediksi tren 7 hari
│   │   ├── ingest.ts          # Data ingestion endpoint
│   │   └── admin.ts           # Admin-only endpoints
│   ├── services/
│   │   ├── chat.ts            # Prompt builder & Gemini call untuk chatbot
│   │   ├── geminiInsight.ts   # AI insight generation per keyword
│   │   ├── trendPrediction.ts # Algoritma prediksi heuristik
│   │   └── trendProfile.ts    # Trend brief untuk AI context
│   └── jobs/
│       └── simulateTrends.ts  # Cron job simulasi skor tren tiap jam
```

---

## Database Schema

### Entity Relationship

```
User ──< AiInsight
TrendSnapshot ──< TrendPrediction
TrendSnapshot >── Category
```

### Tabel

#### `users`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | Int PK | Auto increment |
| name | String | Nama pengguna |
| email | String UNIQUE | Email login |
| password | String | Bcrypt hash |
| role | String | `user` / `admin` |
| business_category | String? | Nama/kategori usaha |
| region_code | String? | Kode wilayah (ID-JK, dll) |
| created_at | DateTime | Waktu daftar |

#### `categories`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | Int PK | |
| slug | String UNIQUE | `modern`, `tradisional`, dll |
| name | String | Label kategori |

#### `trend_snapshots`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | Int PK | |
| entity_label | String | Nama produk kuliner |
| entity_type | String | `food`, `drink`, dll |
| region_code | String | Kode provinsi (ID-JK, ID-JB, ...) |
| trend_score | Int | Skor tren 0–100 |
| category_id | Int? | FK ke categories |
| audience_age_min/max | Int? | Rentang usia target |
| metadata | Json? | Data tambahan fleksibel |
| captured_at | DateTime | Waktu snapshot diambil |

#### `trend_predictions`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | Int PK | |
| trend_snapshot_id | Int FK | Snapshot yang diprediksi |
| horizon_days | Int | Jangkauan prediksi (misal: 7) |
| predicted_growth_pct | Float | % pertumbuhan prediksi |
| confidence_score | Int | Tingkat kepercayaan 0–100 |
| model_version | String | Versi model (`v1-heuristic`) |
| narration | String? | Narasi AI untuk prediksi |

#### `ai_insights`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | Int PK | |
| user_id | Int? FK | Pengguna yang request |
| insight_type | String | Tipe insight |
| context | Json? | Konteks keyword/region |
| summary | String | Hasil teks dari AI |
| structured | Json? | Data terstruktur tambahan |
| provider | String | `gemini` |

---

## API Endpoints

Base URL: `https://trendlify-api.up.railway.app/api/v1`

### Auth

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/register` | ✗ | Daftar akun baru |
| POST | `/login` | ✗ | Login, return JWT |
| PUT | `/profile` | ✓ | Update nama & business_category |
| PUT | `/change-password` | ✓ | Ganti password |
| GET | `/user` | ✓ | Data user yang sedang login |
| POST | `/logout` | ✓ | Logout (stateless) |

### Dashboard

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/dashboard/overview` | ✓ | Hero trend, avg score, total samples |

### Trends

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/trends` | ✓ | Daftar snapshot tren (query: `limit`, `region`) |
| GET | `/trends/profile` | ✓ | Brief tren untuk konteks AI |

### Regions

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/regions/heatmap` | ✓ | Skor rata-rata per provinsi |

### AI Features

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/chat` | ✓ | Tanya AI seputar bisnis kuliner |
| POST | `/insights/generate` | ✓ | Generate AI insight per keyword |
| GET | `/insights` | ✓ | Riwayat AI insight user |
| GET | `/predictions/:snapshotId` | ✓ | Prediksi tren 7 hari ke depan |

### Admin & Ingest

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/ingest/snapshot` | Admin | Input data snapshot baru |
| GET | `/admin/*` | Admin | Manajemen data |

---

## Alur Request

```
Mobile App
    │
    ▼
HTTPS Request ──► Railway (trendlify-api)
                        │
                        ▼
                  Express Router
                        │
                  ┌─────┴─────┐
                  │ Middleware │
                  │ requireAuth│  ← Verifikasi JWT
                  └─────┬─────┘
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
           Route     Service    Prisma
          Handler  (Gemini AI)  Client
                                  │
                                  ▼
                          PgBouncer Pool
                                  │
                                  ▼
                        Neon PostgreSQL
```

---

## AI & Machine Learning

### Google Gemini Integration
- Digunakan untuk: AI Insight per produk, Chatbot bisnis, narasi prediksi
- Model: `gemini-2.0-flash` (via REST API)
- Prompt engineering: konteks tren + region + kategori dikirim sebagai system prompt

### Prediksi Tren (Heuristik)
- Algoritma: rule-based + weighted scoring dari skor historis
- Input: `trend_score`, `prev_score`, momentum delta
- Output: `predicted_growth_pct` + `confidence_score` untuk 7 hari ke depan
- Disimpan di `trend_predictions` agar tidak di-generate ulang

### Simulasi Data (Cron Job)
- Berjalan tiap jam via `node-cron`
- Mengupdate `trend_score` dengan simulasi naik/turun deterministik
- Menjaga data tetap "hidup" selama demo/pengujian

---

## Keamanan

| Aspek | Implementasi |
|---|---|
| Password | Bcrypt (salt rounds: 12) |
| Auth Token | JWT HS256, expired per konfigurasi |
| Route Guard | `requireAuth` middleware pada semua endpoint privat |
| Admin Guard | `adminOnly` middleware untuk ingest & admin routes |
| CORS | Whitelist dari env `FRONTEND_URL` |
| DB Connection | PgBouncer pool, `connection_limit=1` untuk Railway |

---

## Deployment

```
GitHub (branch: dev)
    │  push
    ▼
Railway CI/CD ──► Build (npm run build)
                        │
                        ▼
                  Railway Container
                  - Node.js runtime
                  - PORT dari env Railway
                        │
                  ┌─────┴──────┐
                  ▼            ▼
           Neon PostgreSQL   PgBouncer
           (managed DB)    (connection pool)
```

### Environment Variables (Railway)

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | PgBouncer connection string (Neon) |
| `DIRECT_URL` | Direct PostgreSQL URL (untuk migrasi) |
| `JWT_SECRET` | Secret key untuk signing JWT |
| `GEMINI_API_KEY` | Google Gemini API key |
| `PORT` | Diset otomatis oleh Railway |
| `FRONTEND_URL` | Whitelist CORS origin |
