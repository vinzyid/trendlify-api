const SYSTEM = `Kamu adalah pakar kuliner Indonesia. Tugas: tulis profil singkat sebuah tren kuliner dalam 2-3 kalimat saja.
Wajib mencakup: apa itu, kenapa sedang tren, dan peluang bisnisnya.
Bahasa Indonesia yang santai. DILARANG gunakan markdown, bullet, atau tabel.`;

async function callOpenRouter(keyword: string): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";
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
          { role: "system", content: SYSTEM },
          { role: "user", content: `Tulis profil singkat tren kuliner: "${keyword}"` },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = await res.json() as Record<string, any>;
    return json?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

async function callGroq(keyword: string): Promise<string | null> {
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
          { role: "system", content: SYSTEM },
          { role: "user", content: `Tulis profil singkat tren kuliner: "${keyword}"` },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = await res.json() as Record<string, any>;
    return json?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function getTrendProfile(keyword: string): Promise<string> {
  return (
    (await callOpenRouter(keyword)) ??
    (await callGroq(keyword)) ??
    `${keyword} adalah tren kuliner yang sedang diminati di Indonesia. Peluang bisnis di segmen ini cukup menjanjikan untuk UMKM kuliner yang ingin masuk lebih awal.`
  );
}
