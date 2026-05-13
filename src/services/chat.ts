const SYSTEM = `Kamu adalah Trendly — asisten AI chatbot Trendlify untuk UMKM kuliner Indonesia.
Tugas utama: bantu pemilik usaha kuliner dengan pertanyaan seputar bisnis makanan & minuman, tren kuliner, strategi promosi, penetapan harga, dan platform jualan (GoFood, GrabFood, TikTok Shop, Shopee Food).
Gaya bicara: santai, langsung to-the-point, seperti teman yang paham bisnis kuliner — bukan kaku seperti laporan.
Format jawaban: singkat 2-4 kalimat ATAU bullet point pendek. DILARANG tabel markdown dan tag HTML.
Bahasa: Indonesia (boleh pakai istilah bisnis/marketing Inggris yang sudah umum).
Kalau pertanyaan tidak terkait kuliner atau bisnis UMKM, arahkan kembali dengan sopan.`;

type Message = { role: "user" | "assistant"; content: string };

async function callGroq(message: string, history: Message[]): Promise<string | null> {
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
          ...history,
          { role: "user", content: message },
        ],
        max_tokens: 450,
        temperature: 0.75,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const json = await res.json() as Record<string, any>;
    return json?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function callGemini(message: string, history: Message[]): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  try {
    const contents = [
      ...history.map(h => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: { maxOutputTokens: 450, temperature: 0.75 },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );
    if (!res.ok) return null;
    const json = await res.json() as Record<string, any>;
    return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

export async function chat(message: string, history: Message[] = []): Promise<string> {
  return (
    (await callGroq(message, history)) ??
    (await callGemini(message, history)) ??
    "Maaf, AI sedang sibuk. Coba lagi dalam beberapa saat ya! 🙏"
  );
}
