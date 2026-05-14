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
    const now = new Date();
    const newSnapshots = snapshots.map(s => {
      const delta = Math.floor(Math.random() * 14) - 6;
      const resistance = s.trendScore >= 85 ? -Math.floor(Math.random() * 3) : 0;
      const newScore = Math.min(99, Math.max(1, s.trendScore + delta + resistance));
      return {
        categoryId: s.categoryId,
        entityType: s.entityType,
        entityLabel: s.entityLabel,
        regionCode: s.regionCode,
        trendScore: newScore,
        audienceAgeMin: s.audienceAgeMin,
        audienceAgeMax: s.audienceAgeMax,
        metadata: s.metadata !== null ? s.metadata : undefined,
        capturedAt: now,
      };
    });

    await prisma.trendSnapshot.createMany({ data: newSnapshots });
    updated += newSnapshots.length;
  }

  return updated;
}
