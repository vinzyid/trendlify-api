import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.post("/trends", async (req, res) => {
  const secret = process.env.INGEST_SECRET;
  if (secret && req.headers["x-ingest-secret"] !== secret)
    return res.status(403).json({ message: "Invalid ingest secret." });

  const { snapshots } = req.body;
  if (!Array.isArray(snapshots) || snapshots.length === 0)
    return res.status(422).json({ message: "snapshots wajib berupa array." });

  let created = 0;
  const now = new Date();

  for (const row of snapshots.slice(0, 100)) {
    const category = row.category_slug
      ? await prisma.category.findFirst({ where: { slug: row.category_slug } })
      : null;

    await prisma.trendSnapshot.create({
      data: {
        categoryId: category?.id ?? null,
        entityType: "keyword",
        entityLabel: String(row.keyword),
        regionCode: row.region_code ?? "ID",
        trendScore: Number(row.trend_score),
        audienceAgeMin: 18,
        audienceAgeMax: 35,
        metadata: { source: "pytrends", fetched_at: now.toISOString() },
        capturedAt: now,
      },
    });
    created++;
  }

  return res.json({ created });
});

export default router;
