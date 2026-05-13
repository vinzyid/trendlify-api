import { prisma } from "./prisma";

export async function latestSnapshots(opts: {
  regionCode?: string;
  categorySlug?: string;
  entityType?: string;
  limit?: number;
}) {
  const { regionCode, categorySlug, entityType, limit = 20 } = opts;

  // Get latest ID per keyword+region combo
  const grouped = await prisma.trendSnapshot.groupBy({
    by: ["entityLabel", "regionCode"],
    where: regionCode ? { regionCode } : undefined,
    _max: { id: true },
  });

  const latestIds = grouped.map(g => g._max.id).filter((id): id is number => id !== null);
  if (latestIds.length === 0) return [];

  const snapshots = await prisma.trendSnapshot.findMany({
    where: {
      id: { in: latestIds },
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(entityType ? { entityType } : {}),
    },
    include: { category: true },
    orderBy: { trendScore: "desc" },
    take: limit,
  });

  // Attach prev_score dan kembalikan snake_case agar kompatibel dengan mobile & web
  return Promise.all(
    snapshots.map(async (s) => {
      const prev = await prisma.trendSnapshot.findFirst({
        where: { entityLabel: s.entityLabel, regionCode: s.regionCode, id: { lt: s.id } },
        orderBy: { id: "desc" },
        select: { trendScore: true },
      });
      return {
        id: s.id,
        category_id: s.categoryId,
        entity_type: s.entityType,
        entity_label: s.entityLabel,
        region_code: s.regionCode,
        trend_score: s.trendScore,
        audience_age_min: s.audienceAgeMin,
        audience_age_max: s.audienceAgeMax,
        metadata: s.metadata,
        captured_at: s.capturedAt,
        prev_score: prev?.trendScore ?? null,
        category: s.category,
      };
    })
  );
}

export async function regionalHeatmap(regionPrefix = "ID") {
  const grouped = await prisma.trendSnapshot.groupBy({
    by: ["entityLabel", "regionCode"],
    where: { regionCode: { startsWith: regionPrefix + "-" } },
    _max: { id: true },
  });

  const latestIds = grouped.map(g => g._max.id).filter((id): id is number => id !== null);
  if (latestIds.length === 0) return [];

  const regionData = await prisma.trendSnapshot.groupBy({
    by: ["regionCode"],
    where: { id: { in: latestIds } },
    _avg: { trendScore: true },
    _count: { id: true },
    orderBy: { _avg: { trendScore: "desc" } },
  });

  return regionData.map(r => ({
    region_code: r.regionCode,
    avg_score: Math.round(r._avg.trendScore ?? 0),
    samples: r._count.id,
  }));
}
