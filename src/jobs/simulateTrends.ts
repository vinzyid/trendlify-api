import { prisma } from "../lib/prisma";

export async function simulateTrends(rounds = 1): Promise<number> {
  const grouped = await prisma.trendSnapshot.groupBy({
    by: ["entityLabel", "regionCode"],
    _max: { id: true },
  });

  const latestIds = grouped.map(g => g._max.id).filter((id): id is number => id !== null);
  const snapshots = await prisma.trendSnapshot.findMany({ where: { id: { in: latestIds } } });

  let updated = 0;
  for (let r = 0; r < rounds; r++) {
    for (const s of snapshots) {
      const delta = Math.floor(Math.random() * 14) - 6; // ±6 range
      const resistance = s.trendScore >= 85 ? -Math.floor(Math.random() * 3) : 0;
      const newScore = Math.min(99, Math.max(1, s.trendScore + delta + resistance));

      await prisma.trendSnapshot.create({
        data: {
          categoryId: s.categoryId,
          entityType: s.entityType,
          entityLabel: s.entityLabel,
          regionCode: s.regionCode,
          trendScore: newScore,
          audienceAgeMin: s.audienceAgeMin,
          audienceAgeMax: s.audienceAgeMax,
          metadata: s.metadata !== null ? s.metadata : undefined,
          capturedAt: new Date(),
        },
      });
      updated++;
    }
  }

  return updated;
}
