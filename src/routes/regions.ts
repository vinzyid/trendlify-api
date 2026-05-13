import { Router } from "express";
import { regionalHeatmap } from "../lib/trendRepository";

const router = Router();

router.get("/heatmap", async (_req, res) => {
  const regions = await regionalHeatmap("ID");
  return res.json({ regions });
});

export default router;
