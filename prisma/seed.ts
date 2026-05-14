import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Curated keyword → region mapping ─────────────────────────────────────────
// Setiap keyword di-assign ke region yang realistis secara geografis & budaya.
const KEYWORD_REGION: Record<string, string> = {
  // ── Kopi & Minuman Modern (dominan Jakarta, Bandung, Bali) ──
  "dirty latte":          "ID-JK",
  "kopi kelapa":          "ID-BL",
  "kopi pandan":          "ID-JB",
  "kopi gula merah":      "ID-JT",
  "kopi susu aren":       "ID-JK",
  "cold brew":            "ID-JK",
  "americano":            "ID-JK",
  "es kopi susu":         "ID-JB",
  "matcha latte":         "ID-JK",
  "goguma latte":         "ID-JB",

  // ── Boba & Bubble Tea (urban, Jakarta & Jabar) ──
  "tiger milk boba":      "ID-JK",
  "cheese boba":          "ID-JB",
  "brown sugar boba":     "ID-JK",
  "thai tea":             "ID-JK",
  "taro milk tea":        "ID-JB",

  // ── Minuman Tradisional (Jawa Tengah, Yogyakarta) ──
  "wedang jahe":          "ID-YO",
  "wedang uwuh":          "ID-YO",
  "teh serai pandan":     "ID-JT",
  "es teh telang":        "ID-JT",
  "es teh jeruk madu":    "ID-JT",
  "cendol":               "ID-JT",

  // ── Korean Food (Jakarta, Jabar) ──
  "tteokbokki":           "ID-JK",
  "corn dog korea":       "ID-JB",
  "hotteok":              "ID-JB",
  "kimbap":               "ID-JK",
  "bingsu":               "ID-JK",
  "injeolmi toast":       "ID-JK",
  "gohyong":              "ID-BT",
  "katsu sando":          "ID-JB",

  // ── Jajanan Viral / Street Food (Jabodetabek) ──
  "coklat dubai":         "ID-JK",
  "dimsum mentai":        "ID-JK",
  "tanghulu":             "ID-BT",
  "croffle":              "ID-JB",
  "tissue bread":         "ID-JK",
  "roti sopit":           "ID-BT",
  "smash burger":         "ID-JK",
  "takoyaki":             "ID-JK",
  "gyoza goreng":         "ID-JB",
  "okonomiyaki":          "ID-JB",
  "udang keju":           "ID-JK",

  // ── Dessert / Pastry (Jakarta, Bandung) ──
  "basque cheesecake":    "ID-JB",
  "tiramisu cup":         "ID-JK",
  "mochi premium":        "ID-JB",
  "donat lumer":          "ID-JK",
  "martabak oreo":        "ID-JK",
  "martabak matcha":      "ID-JB",
  "dessert jar":          "ID-JB",
  "brownies lumer":       "ID-JB",
  "cheesecake":           "ID-JK",
  "pudding susu":         "ID-JT",

  // ── Jajanan Tradisional / Pasar ──
  "cilor":                "ID-JB",
  "cireng megalodon":     "ID-JB",
  "jasuke":               "ID-JT",
  "risol mayo":           "ID-JK",
  "cireng":               "ID-JB",
  "batagor":              "ID-JB",
  "siomay":               "ID-JB",
  "tahu bulat":           "ID-JB",
  "basreng":              "ID-JB",
  "keripik pedas":        "ID-JB",
  "kue cubit":            "ID-JK",
  "klepon":               "ID-YO",
  "onde-onde":            "ID-JT",
  "pisang goreng":        "ID-JI",

  // ── Makanan Berat Populer ──
  "ayam geprek":          "ID-JK",
  "ayam crispy":          "ID-JK",
  "ayam chili padi":      "ID-JB",
  "ayam bakar":           "ID-JT",
  "seblak":               "ID-JB",
  "mie pedas":            "ID-JB",
  "bakso aci":            "ID-JB",
  "bakso malang":         "ID-JI",
  "sate taichan":         "ID-JK",
  "nasi goreng":          "ID-JT",
  "mie ayam":             "ID-JT",
  "nasi padang":          "ID-JK",
  "rendang":              "ID-SN",
  "pecel lele":           "ID-JT",
  "bebek goreng":         "ID-JI",
  "ikan bakar":           "ID-BL",
  "nasi uduk":            "ID-JK",
  "bubur ayam":           "ID-JB",

  // ── Masakan Lokal / Daerah ──
  "ketoprak":             "ID-JK",
  "gado-gado":            "ID-JK",
  "rawon":                "ID-JI",
  "soto betawi":          "ID-JK",
  "soto lamongan":        "ID-JI",
  "nasi kuning":          "ID-SN",
  "nasi liwet":           "ID-JT",
  "lontong sayur":        "ID-BT",
  "pempek":               "ID-SN",
  "coto makassar":        "ID-SN",
  "mie kocok":            "ID-JB",
  "lumpia semarang":      "ID-JT",

  // ── Minuman Segar ──
  "es teh manis":         "ID-JT",
  "es campur":            "ID-JK",
  "jus alpukat":          "ID-BL",
  "es buah segar":        "ID-JT",
  "rujak buah":           "ID-JI",
  "roti bakar":           "ID-JK",

  // ── Produk Modern / Food Biz ──
  "frozen food homemade": "ID-JK",
  "rice bowl topping":    "ID-JB",
  "saus mentai":          "ID-JB",
};

// Score range per region (berdasarkan kepadatan urban & aktivitas kuliner)
const REGION_SCORE: Record<string, [number, number]> = {
  "ID-JK": [68, 96],
  "ID-JB": [60, 90],
  "ID-JT": [52, 82],
  "ID-JI": [50, 78],
  "ID-BT": [48, 76],
  "ID-YO": [50, 80],
  "ID-BL": [55, 88],
  "ID-SN": [42, 70],
};

// Pseudo-random score supaya tidak semua sama persis
function randScore(min: number, max: number, seed: number): number {
  const pseudo = (seed * 1664525 + 1013904223) & 0xffffffff;
  return min + (Math.abs(pseudo) % (max - min + 1));
}

async function main() {
  // Category
  const category = await prisma.category.upsert({
    where: { slug: "food-beverage" },
    update: {},
    create: { slug: "food-beverage", name: "Kuliner" },
  });

  // Demo users
  await prisma.user.upsert({
    where: { email: "admin@trendlify.test" },
    update: {},
    create: {
      name: "Trendlify Admin",
      email: "admin@trendlify.test",
      password: await bcrypt.hash("password", 12),
      role: "admin",
      businessCategory: "food-beverage",
      regionCode: "ID-JK",
    },
  });

  await prisma.user.upsert({
    where: { email: "demo@trendlify.test" },
    update: {},
    create: {
      name: "UMKM Demo",
      email: "demo@trendlify.test",
      password: await bcrypt.hash("password", 12),
      role: "user",
      businessCategory: "food-beverage",
      regionCode: "ID-BT",
    },
  });

  // Seed keyword snapshots dari KEYWORD_REGION mapping
  const now = new Date();
  let count = 0;
  const entries = Object.entries(KEYWORD_REGION);

  for (let i = 0; i < entries.length; i++) {
    const [keyword, region] = entries[i];
    const [sMin, sMax] = REGION_SCORE[region] ?? [40, 70];
    const score = randScore(sMin, sMax, i * 31 + keyword.charCodeAt(0));

    // Variasi waktu capture: antara 0–13 hari yang lalu
    const capturedAt = new Date(now.getTime() - (i % 14) * 86400000);

    await prisma.trendSnapshot.create({
      data: {
        categoryId: category.id,
        entityType: "keyword",
        entityLabel: keyword,
        regionCode: region,
        trendScore: score,
        audienceAgeMin: 18,
        audienceAgeMax: 35,
        metadata: { source: "curated-seed", version: "2026-05-14" },
        capturedAt,
      },
    });
    count++;
  }

  console.log(`✅ Seeded ${count} trend snapshots dengan mapping region yang realistis.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
