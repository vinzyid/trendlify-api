import { Router } from "express";
import { latestSnapshots } from "../lib/trendRepository";
import { getTrendProfile } from "../services/trendProfile";

const router = Router();

router.get("/", async (req, res) => {
  const regionCode = req.query.region_code as string | undefined;
  const category   = req.query.category as string | undefined;
  const entityType = req.query.entity_type as string | undefined;
  const limit      = Math.min(Number(req.query.limit ?? 24), 100);

  const data = await latestSnapshots({ regionCode, categorySlug: category, entityType, limit });
  return res.json({ data });
});

router.get("/profile", async (req, res) => {
  const keyword = (req.query.keyword as string ?? "").trim();
  if (!keyword) return res.status(400).json({ error: "keyword required" });

  const profile = await getTrendProfile(keyword);
  return res.json({ keyword, profile });
});

export default router;
