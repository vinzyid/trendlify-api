import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateMarketInsight } from "../services/geminiInsight";
import { latestSnapshots } from "../lib/trendRepository";

const router = Router();

router.post("/generate", requireAuth, async (req, res) => {
  const { trending_product, trend_score, region_code, category, notes } = req.body;

  const context: Record<string, unknown> = {
    trending_product: trending_product ?? null,
    trend_score: trend_score != null ? Number(trend_score) : null,
    region_code: region_code ?? null,
    category: category ?? null,
    notes: notes ?? null,
  };

  // Enrich dengan top 5 tren live
  const topTrends = await latestSnapshots({ categorySlug: "food-beverage", entityType: "keyword", limit: 5 });
  context.top_trends_today = topTrends.map(t => ({
    keyword: t.entity_label,
    score: t.trend_score,
    region: t.region_code,
  }));

  const insight = await generateMarketInsight(context, req.user!.id);
  return res.json({ insight });
});

export default router;
