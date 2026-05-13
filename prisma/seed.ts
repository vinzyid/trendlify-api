import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const REGIONS = [
  "ID-JK", "ID-JK", "ID-JK", "ID-JK",
  "ID-JB", "ID-JB", "ID-JB",
  "ID-JT", "ID-JT",
  "ID-JI", "ID-JI",
  "ID-BT", "ID-YO",
  "ID-BL", "ID-SN", "ID-SS", "ID-RI",
];

const REGION_SCORE: Record<string, [number, number]> = {
  "ID-JK": [62, 92], "ID-JB": [55, 85], "ID-JT": [50, 78],
  "ID-JI": [48, 75], "ID-BT": [46, 72], "ID-YO": [48, 74],
  "ID-BL": [44, 70], "ID-SN": [40, 65], "ID-SS": [36, 60], "ID-RI": [34, 58],
};

async function main() {
  // Category
  const category = await prisma.category.upsert({
    where: { slug: "food-beverage" },
    update: {},
    create: { slug: "food-beverage", name: "Kuliner" },
  });

  // Demo users
  const adminPw = await bcrypt.hash("password", 12);
  await prisma.user.upsert({
    where: { email: "admin@trendlify.test" },
    update: {},
    create: {
      name: "Trendlify Admin",
      email: "admin@trendlify.test",
      password: adminPw,
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

  // Keyword snapshots
  const jsonPath = path.resolve(__dirname, "../../keyword-seed-id.json");
  if (!fs.existsSync(jsonPath)) {
    console.warn("keyword-seed-id.json tidak ditemukan, snapshot dilewati.");
    return;
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const keywords: string[] = raw.keywords ?? [];
  const version: string = raw.version ?? "unknown";
  const now = new Date();

  let count = 0;
  for (const keyword of keywords) {
    const hash = Math.abs(crc32(keyword));
    const region = REGIONS[hash % REGIONS.length];
    const [sMin, sMax] = REGION_SCORE[region] ?? [35, 75];
    const score = sMin + (hash % (sMax - sMin + 1));
    const capturedAt = new Date(
      now.getTime() - (hash % 14) * 86400000 - (hash % 24) * 3600000
    );

    await prisma.trendSnapshot.create({
      data: {
        categoryId: category.id,
        entityType: "keyword",
        entityLabel: keyword,
        regionCode: region,
        trendScore: score,
        audienceAgeMin: 18,
        audienceAgeMax: 35,
        metadata: { source: "seed-json", version },
        capturedAt,
      },
    });
    count++;
  }

  console.log(`Seeded ${count} trend snapshots dari keyword-seed-id.json.`);
}

function crc32(str: string): number {
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
