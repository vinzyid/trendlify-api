import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

router.get("/stats", requireAuth, adminOnly, async (_req, res) => {
  const [usersTotal, admins, snapshotsTotal, insightsTotal] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.trendSnapshot.count(),
    prisma.aiInsight.count(),
  ]);

  return res.json({ users_total: usersTotal, admins, snapshots_total: snapshotsTotal, insights_total: insightsTotal });
});

export default router;
