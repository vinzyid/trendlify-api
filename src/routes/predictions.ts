import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { predictFromSnapshot, predictFromData } from "../services/trendPrediction";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const { trend_snapshot_id, keyword, score, horizon_days } = req.body;

  const horizonDays = Number(horizon_days);
  if (![7, 14, 30].includes(horizonDays))
    return res.status(422).json({ message: "horizon_days harus 7, 14, atau 30." });

  if (trend_snapshot_id) {
    const prediction = await predictFromSnapshot(Number(trend_snapshot_id), horizonDays);
    return res.json({ prediction });
  }

  const kw = keyword ?? "keyword tidak diketahui";
  const sc = score != null ? Number(score) : 50;
  const result = await predictFromData(kw, sc, horizonDays);
  return res.json({ prediction: result });
});

export default router;
