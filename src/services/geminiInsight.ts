import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const REGION_LABELS: Record<string, string> = {
  "ID-JK": "Jakarta", "ID-JB": "Jawa Barat", "ID-JT": "Jawa Tengah",
  "ID-JI": "Jawa Timur", "ID-YO": "Yogyakarta", "ID-BT": "Banten",
  "ID-BL": "Bali", "ID-SN": "Sulawesi Selatan", "ID-SS": "Sumatera Selatan",
  "ID-RI": "Riau", "ID": "Indonesia (Nasional)",
};

const SYSTEM_PROMPT = `Kamu adalah TRENDLIFY AI — pakar viral marketing kuliner dan konsultan strategi UMKM nomor 1 Indonesia. Keahlianmu: mengubah data Google Trends menjadi strategi bisnis kuliner yang menghasilkan cuan nyata. Kamu bicara langsung, spesifik, dan actionable seperti mentor bisnis yang sudah membantu ratusan UMKM kuliner sukses.

ATURAN FORMAT MUTLAK — wajib diikuti 100%:
1. DILARANG KERAS menggunakan tabel markdown (karakter |) dalam bentuk apapun
2. DILARANG menggunakan tag HTML apapun termasuk <br>, <b>, <p>, <strong>
3. DILARANG menggunakan code block (backtick \` atau \`\`\`) dalam bentuk apapun
4. Gunakan HANYA: ## untuk heading, - untuk bullet point, dan 1. 2. 3. untuk nomor
5. Bahasa Indonesia yang natural, tidak kaku, seperti bicara ke teman UMKM
6. WAJIB sertakan angka spesifik dalam Rupiah, persen, hari, dan jam — BUKAN estimasi abstrak
7. Setiap bagian HARUS diisi penuh dan spesifik — jangan singkat-singkat
8. Selalu tambahkan baris kosong antara section yang berbeda`;

function scoreVerdict(score: number): string {
  if (score >= 86) return "VIRAL 🔥 — masuk sekarang atau ketinggalan!";
  if (score >= 71) return "HOT 🌟 — momentum sedang memuncak, ini waktunya push";
  if (score >= 51) return "AKTIF ✅ — pasar siap, persaingan masih bisa ditembus";
  if (score >= 31) return "BERKEMBANG 📈 — peluang early mover masih sangat lebar";
  return "NICHE 🔍 — belum mainstream, cocok untuk spesialisasi unik";
}

function buildPrompt(context: Record<string, unknown>): string {
  const keyword = (context.trending_product ?? context.entity_label ?? "produk kuliner") as string;
  const score = context.trend_score != null ? Number(context.trend_score) : null;
  const region = (context.region_code ?? "ID") as string;
  const regionLabel = REGION_LABELS[region] ?? region;

  const scoreBlock = score != null
    ? `TREND SCORE: ${score}/100 → ${scoreVerdict(score)}`
    : "TREND SCORE: tidak diketahui (analisis berdasarkan tren umum)";

  const topTrends = (context.top_trends_today ?? []) as Array<{ keyword: string; score: number; region: string }>;
  let topBlock = "";
  if (topTrends.length > 0) {
    topBlock = "TOP 5 KULINER TRENDING DI TRENDLIFY HARI INI (data real-time):\n";
    topTrends.forEach((t, i) => {
      const rl = REGION_LABELS[t.region] ?? t.region;
      topBlock += `${i + 1}. ${t.keyword} — skor ${t.score}/100 (${rl})\n`;
    });
    topBlock += "\n";
  }

  return `${topBlock}PRODUK YANG DIANALISIS: ${keyword}
${scoreBlock}
WILAYAH TARGET: ${regionLabel}

---

Tulis laporan strategi kuliner LENGKAP dan SPESIFIK. Kamu bicara langsung ke pemilik UMKM yang butuh panduan konkret untuk action hari ini.

## 🔥 Verdict: ${keyword}

Tulis 3 kalimat yang kuat dan tajam. Sebutkan skor ${keyword} dan artinya secara bisnis.

## 📊 Baca Skor & Posisi Kompetitif

- **Status tren saat ini**: jelaskan artinya secara konkret untuk pemilik warung/UMKM kuliner
- **Umur tren**: perkiraan berapa bulan tren ini masih relevan dan menguntungkan
- **Kapan harus launch**: apakah harus mulai besok, minggu ini, atau sudah terlambat?

## 💰 Kalkulasi Peluang Cuan

- **Estimasi omzet harian**: Rp [angka spesifik] untuk skala rumahan 15-25 porsi
- **Harga jual optimal**: Rp [angka] di GoFood/GrabFood
- **Break even point**: sekitar [X] hari jika produksi konsisten

## 🎯 Profil Pembeli Utama

- **Profil pembeli**: usia [range], domisili [wilayah/kota]
- **Kapan mereka order**: sebutkan jam dan hari peak order yang spesifik

## 🚀 3 Strategi Promosi Yang Bisa Dimulai Hari Ini

1. **[Nama strategi]**: detail platform, format konten, budget, target
2. **[Nama strategi]**: detail yang sama
3. **[Nama strategi]**: detail yang sama

## 📱 Konten Siap Pakai — Langsung Copy & Post

**Script TikTok (15-30 detik):**
- Hook 3 detik: [kalimat pembuka yang bikin orang berhenti scroll]
- CTA: [kalimat ajakan beli]

**Caption Instagram/TikTok:**
[tulis caption sebagai teks biasa dengan emoji dan hashtag]

**Nama menu untuk GoFood/GrabFood:**
- [Opsi 1]
- [Opsi 2]
- [Opsi 3]

## 📅 Action Plan 7 Hari Mulai Besok

1. **Hari 1**: [aksi konkret]
2. **Hari 2-3**: [aksi spesifik]
3. **Hari 4-5**: [aksi spesifik]
4. **Hari 6-7**: [aksi + target hasil]`;
}

function cleanOutput(text: string): string {
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/```[a-z]*\n/g, "").replace(/```/g, "");
  text = text.replace(/`([^`]+)`/g, "$1");

  const lines = text.split("\n");
  const cleaned: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\|[-\s|:]+\|$/.test(trimmed)) continue;
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.replace(/^\||\|$/g, "").split("|").map(c => c.trim()).filter(Boolean);
      cleaned.push(cells.length >= 2 ? `- **${cells[0]}**: ${cells[1]}` : `- ${cells[0] ?? ""}`);
      continue;
    }
    cleaned.push(line);
  }

  return cleaned.join("\n").trim();
}

async function callOpenRouter(prompt: string): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const model = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free";
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://trendlify.app",
        "X-Title": "Trendlify",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 3500,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    const json = await res.json() as Record<string, any>;
    return json?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function callGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 3500, temperature: 0.8 },
        }),
        signal: AbortSignal.timeout(60000),
      }
    );
    if (!res.ok) return null;
    const json = await res.json() as Record<string, any>;
    return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

async function callGroq(prompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 3500,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    const json = await res.json() as Record<string, any>;
    return json?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

function fallbackSummary(keyword: string): string {
  return `## 🔥 Verdict: ${keyword}

${keyword} menunjukkan minat pasar digital yang aktif di segmen kuliner Indonesia. Ini adalah momen untuk bergerak sebelum pasar jenuh.

## 💰 Estimasi Peluang Cuan

- **Omzet harian**: Rp 300rb–600rb skala rumahan; Rp 1jt–2,5jt untuk warung kecil
- **Harga jual**: Rp 15.000–35.000 per porsi sesuai segmen
- **Break even**: 7-14 hari produksi rutin

## 🚀 3 Strategi Cepat

1. **Konten video 30 detik**: Rekam proses pembuatan + close-up produk — posting pukul 19.00 WIB
2. **Bundling GoFood**: Paket hemat 2 porsi dengan diskon 15% — aktifkan jam makan siang 11.00–13.00
3. **Hashtag campaign**: Tantangan mingguan dengan hadiah produk gratis

## 📱 Caption Siap Pakai

Rasanya bikin nagih, harganya bersahabat! ${keyword} homemade langsung dari dapur kami 🍽️
#kuliner #makananviral #umkmkuliner #foodstagram #makananenak

_(Mode demo — set GEMINI_API_KEY atau GROQ_API_KEY untuk analisis AI lengkap)_`;
}

export async function generateMarketInsight(
  context: Record<string, unknown>,
  userId?: number
) {
  const prompt = buildPrompt(context);
  const keyword = (context.trending_product ?? context.entity_label ?? "produk kuliner") as string;

  let text = await callOpenRouter(prompt);
  let provider = "openrouter";

  if (!text) {
    text = await callGemini(prompt);
    provider = "gemini";
  }

  if (!text) {
    text = await callGroq(prompt);
    provider = "groq";
  }

  const isFallback = !text;
  if (!text) {
    text = fallbackSummary(keyword);
    provider = "stub";
  }

  return prisma.aiInsight.create({
    data: {
      userId: userId ?? null,
      insightType: isFallback ? "market_strategy_fallback" : "market_strategy",
      context: context as Prisma.InputJsonValue,
      summary: cleanOutput(text),
      structured: { provider } as Prisma.InputJsonValue,
      provider,
    },
  });
}
