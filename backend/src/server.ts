import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

// Works from src/ during development and dist/ after building.
config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });
if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
  throw new Error("Set FRONTEND_URL to the deployed Vercel origin before starting the backend.");
}
const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port.");
const server = createApp().listen(port, "0.0.0.0", () => console.log(`Pagebrief API listening on port ${port}`));
function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
