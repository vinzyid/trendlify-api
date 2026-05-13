import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const data = await prisma.competitorWatchlist.findMany({
    where: { userId: req.user!.id },
    orderBy: { id: "desc" },
  });
  return res.json({ data });
});

router.post("/", requireAuth, async (req, res) => {
  const { competitor_name, channel, notes } = req.body;
  if (!competitor_name)
    return res.status(422).json({ message: "competitor_name wajib diisi." });

  const row = await prisma.competitorWatchlist.create({
    data: { userId: req.user!.id, competitorName: competitor_name, channel: channel ?? null, notes: notes ?? null },
  });
  return res.status(201).json({ data: row });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const row = await prisma.competitorWatchlist.findUnique({ where: { id } });
  if (!row) return res.status(404).json({ message: "Data tidak ditemukan." });
  if (row.userId !== req.user!.id) return res.status(403).json({ message: "Akses ditolak." });

  await prisma.competitorWatchlist.delete({ where: { id } });
  return res.json({ message: "Deleted" });
});

export default router;
