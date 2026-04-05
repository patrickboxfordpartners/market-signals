import "dotenv/config";
import express from "express";
import { serve } from "inngest/express";
import { inngest } from "./src/inngest/client.js";
import * as functions from "./src/inngest/functions/index.js";

const app = express();
const port = process.env.PORT || 3001;

// Inngest endpoint
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: Object.values(functions),
  })
);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "market-signals-worker" });
});

app.listen(port, () => {
  console.log(`🔄 Market Signals Worker running on port ${port}`);
  console.log(`📊 Inngest endpoint: http://localhost:${port}/api/inngest`);
  console.log(`\nFunctions registered:`);
  Object.values(functions).forEach(fn => {
    console.log(`  - ${fn.name}`);
  });
});
