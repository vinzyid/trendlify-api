import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_RANGE: Record<string, [number, number]> = {
  "ID-JK": [58, 85],
  "ID-JB": [50, 80],
  "ID-JT": [44, 74],
  "ID-JI": [42, 72],
  "ID-BT": [40, 70],
  "ID-YO": [45, 75],
  "ID-BL": [48, 80],
  "ID-SN": [38, 66],
};

async function main() {
  const grouped = await prisma.trendSnapshot.groupBy({
    by: ["entityLabel", "regionCode"],
    _max: { id: true },
  });

  const ids = grouped.map(g => g._max.id).filter((id): id is number => id !== null);
  const snapshots = await prisma.trendSnapshot.findMany({ where: { id: { in: ids } } });

  const now = new Date();
  let count = 0;

  for (const s of snapshots) {
    const [min, max] = REGION_RANGE[s.regionCode] ?? [40, 70];
    // Distribute scores naturally across the range, not all at one value
    const t = (count * 7 + s.entityLabel.charCodeAt(0) * 3) % 100;
    const score = Math.round(min + (t / 100) * (max - min));

    await prisma.trendSnapshot.create({
      data: {
        categoryId: s.categoryId,
        entityType: s.entityType,
        entityLabel: s.entityLabel,
        regionCode: s.regionCode,
        trendScore: score,
        audienceAgeMin: s.audienceAgeMin,
        audienceAgeMax: s.audienceAgeMax,
        metadata: s.metadata ?? undefined,
        capturedAt: now,
      },
    });
    count++;
  }

  console.log(`✓ Reset ${count} snapshots ke skor natural per region`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
