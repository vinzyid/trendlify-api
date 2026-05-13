import { prisma } from "../lib/prisma";

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
          { role: "system", content: "Kamu adalah analis tren kuliner UMKM Indonesia. Jawab singkat, padat, dalam Bahasa Indonesia." },
          { role: "user", content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.65,
      }),
      signal: AbortSignal.timeout(20000),
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
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.65 },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) return null;
    const json = await res.json() as Record<string, any>;
    return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

async function generateNarration(
  keyword: string, score: number, growth: number, confidence: number, horizonDays: number
): Promise<string | null> {
  const direction = growth >= 0 ? `naik ${growth}%` : `turun ${Math.abs(growth)}%`;
  const prompt = `Data tren kuliner:
- Keyword: ${keyword}
- Skor tren saat ini: ${score}/100
- Prediksi pertumbuhan: ${direction} dalam ${horizonDays} hari ke depan
- Confidence: ${confidence}%

Tulis 2-3 kalimat narasi singkat dalam Bahasa Indonesia yang menjelaskan:
1. Mengapa keyword ini berpotensi ${direction} berdasarkan konteks pasar kuliner Indonesia
2. Satu rekomendasi aksi konkret untuk pelaku UMKM kuliner

Gaya: langsung, santai, to-the-point. Tanpa tabel, tanpa bullet, tanpa markdown.`;

  return (await callGroq(prompt)) ?? (await callGemini(prompt)) ?? null;
}

function heuristic(score: number, horizonDays: number) {
  const base = score / 100;
  const growth = Math.round(((0.12 + base * 0.35) * (horizonDays / 14)) * 100 * 100) / 100;
  const confidence = Math.min(96, Math.round(58 + base * 38));
  return { growth, confidence };
}

export async function predictFromSnapshot(snapshotId: number, horizonDays: number) {
  const snapshot = await prisma.trendSnapshot.findUniqueOrThrow({ where: { id: snapshotId } });
  const { growth, confidence } = heuristic(snapshot.trendScore, horizonDays);
  const narration = await generateNarration(snapshot.entityLabel, snapshot.trendScore, growth, confidence, horizonDays);

  const prediction = await prisma.trendPrediction.upsert({
    where: { trendSnapshotId_horizonDays: { trendSnapshotId: snapshotId, horizonDays } },
    update: {
      predictedGrowthPct: growth,
      confidenceScore: confidence,
      features: { snapshot_score: snapshot.trendScore, horizon_days: horizonDays },
      narration,
    },
    create: {
      trendSnapshotId: snapshotId,
      horizonDays,
      predictedGrowthPct: growth,
      confidenceScore: confidence,
      modelVersion: "v1-heuristic",
      features: { snapshot_score: snapshot.trendScore, horizon_days: horizonDays },
      narration,
    },
    include: { trendSnapshot: true },
  });

  return prediction;
}

export async function predictFromData(keyword: string, score: number, horizonDays: number) {
  const { growth, confidence } = heuristic(score, horizonDays);
  const narration = await generateNarration(keyword, score, growth, confidence, horizonDays);

  return {
    id: null,
    trend_snapshot_id: null,
    horizon_days: horizonDays,
    predicted_growth_pct: String(growth),
    confidence_score: confidence,
    model_version: "v1-heuristic",
    narration,
  };
}
