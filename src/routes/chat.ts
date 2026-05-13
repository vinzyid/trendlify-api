import { Router } from "express";
import { chat } from "../services/chat";

const router = Router();

router.post("/", async (req, res) => {
  const { message, history } = req.body;

  if (!message || typeof message !== "string" || message.length > 500)
    return res.status(422).json({ message: "Field 'message' wajib diisi (max 500 karakter)." });

  const safeHistory = Array.isArray(history) ? history.slice(0, 20) : [];
  const reply = await chat(message, safeHistory);
  return res.json({ reply });
});

export default router;
