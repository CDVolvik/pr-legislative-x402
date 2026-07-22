import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 4021);

buildApp()
  .then((app) => {
    app.listen(port, () => {
      console.log(`pr-legislative-x402 API listening on http://localhost:${port}`);
      console.log(`  free:  GET /health, GET /v1/preview`);
      console.log(`  paid:  GET /v1/bills/search, GET /v1/bills/:identifier`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
