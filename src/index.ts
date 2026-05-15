import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { simulateTrends } from "./jobs/simulateTrends";

import authRoutes        from "./routes/auth";
import dashboardRoutes   from "./routes/dashboard";
import trendsRoutes      from "./routes/trends";
import regionsRoutes     from "./routes/regions";
import chatRoutes        from "./routes/chat";
import insightsRoutes    from "./routes/insights";
import predictionsRoutes from "./routes/predictions";
import ingestRoutes      from "./routes/ingest";
import adminRoutes       from "./routes/admin";

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
  : true; // allow all origins (mobile app + any client)
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

const api = express.Router();

api.use("/",            authRoutes);
api.use("/dashboard",   dashboardRoutes);
api.use("/trends",      trendsRoutes);
api.use("/regions",     regionsRoutes);
api.use("/chat",        chatRoutes);
api.use("/insights",    insightsRoutes);
api.use("/predictions", predictionsRoutes);
api.use("/ingest",      ingestRoutes);
api.use("/admin",       adminRoutes);

app.use("/api/v1", api);
app.get("/", (_req, res) => res.json({ service: "Trendlify API", version: "2.0", stack: "Express + Prisma" }));

// Simulasi tren tiap jam (sama seperti Laravel scheduler)
cron.schedule("0 * * * *", async () => {
  const n = await simulateTrends(3);
  console.log(`[cron] simulateTrends: ${n} snapshots baru`);
});

const PORT = Number(process.env.PORT ?? 8000);
app.listen(PORT, () => console.log(`Trendlify API berjalan di http://localhost:${PORT}`));
