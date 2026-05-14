import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, signToken } from "../middleware/auth";

const router = Router();

router.post("/register", async (req, res) => {
  const { name, email, password, business_category, region_code } = req.body;

  if (!name || !email || !password)
    return res.status(422).json({ message: "name, email, dan password wajib diisi." });
  if (password.length < 8)
    return res.status(422).json({ message: "Password minimal 8 karakter." });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return res.status(422).json({ message: "Email sudah terdaftar." });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: "user", businessCategory: business_category ?? null, regionCode: region_code ?? null },
  });

  const token = signToken(user.id, user.email, user.role);
  return res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, business_category: user.businessCategory, region_code: user.regionCode },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(422).json({ message: "email dan password wajib diisi." });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(422).json({ errors: { email: ["Kredensial tidak valid."] } });

  const token = signToken(user.id, user.email, user.role);
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, business_category: user.businessCategory, region_code: user.regionCode },
  });
});

router.put("/change-password", requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(422).json({ message: "Password lama dan baru wajib diisi." });
  if (new_password.length < 8)
    return res.status(422).json({ message: "Password baru minimal 8 karakter." });

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ message: "User tidak ditemukan." });

  const valid = await bcrypt.compare(current_password, user.password);
  if (!valid)
    return res.status(422).json({ message: "Password lama tidak sesuai." });

  const hashed = await bcrypt.hash(new_password, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
  return res.json({ message: "Password berhasil diperbarui." });
});

router.post("/logout", requireAuth, (_req, res) => {
  // JWT is stateless — client just discards the token
  res.json({ message: "Logged out" });
});

router.get("/user", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, businessCategory: true, regionCode: true },
  });
  if (!user) return res.status(404).json({ message: "User tidak ditemukan." });
  return res.json(user);
});

export default router;
