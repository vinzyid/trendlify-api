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
      // Symmetric delta: -6 to +6 (avg = 0, no upward drift)
      const delta = Math.floor(Math.random() * 13) - 6;
      // Mean reversion: pull back toward natural range (40–75)
      const score = s.trendScore;
      const reversion =
        score >= 88 ? -(Math.floor(Math.random() * 6) + 3) :  // -3 to -8
        score >= 75 ? -(Math.floor(Math.random() * 4) + 1) :  // -1 to -4
        score <= 20 ?  (Math.floor(Math.random() * 4) + 1) :  // +1 to +4
        score <= 35 ?  (Math.floor(Math.random() * 3))     :  //  0 to +2
        0;
      const newScore = Math.min(99, Math.max(1, score + delta + reversion));
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
