import { Router } from "express";
import { prisma } from "../lib/prisma";
import { optionalAuth } from "../middleware/auth";
import { latestSnapshots } from "../lib/trendRepository";

const router = Router();

router.get("/overview", optionalAuth, async (req, res) => {
  const region = req.query.region_code as string | undefined;
  const category = req.query.category as string | undefined;

  const snapshots = await latestSnapshots({ regionCode: region, categorySlug: category, limit: 12 });
  const top = snapshots[0] ?? null;

  const latestInsight = req.user
    ? await prisma.aiInsight.findFirst({
        where: { userId: req.user.id },
        orderBy: { id: "desc" },
      })
    : null;

  const totalSamples = await prisma.trendSnapshot.count();
  const avgScore = snapshots.length > 0
    ? Math.round(snapshots.reduce((s, x) => s + x.trend_score, 0) / snapshots.length)
    : 0;

  return res.json({
    hero: {
      id: top?.id ?? null,
      trending_product: top?.entity_label ?? null,
      trend_score: top?.trend_score ?? null,
      region_code: top?.region_code ?? null,
      audience: top ? { min: top.audience_age_min, max: top.audience_age_max } : null,
    },
    snapshots,
    stats: { avg_score: avgScore, samples: totalSamples },
    latest_ai_insight: latestInsight,
  });
});

export default router;
