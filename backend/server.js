import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

// ─── Boot ────────────────────────────────────────────────────────
connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => {
    console.log(`✔  API running → http://localhost:${PORT}`);
  });
});
