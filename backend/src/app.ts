import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { AppError, scrape, summarizeText } from "./scraper.js";

type AppOptions = {
  scrapePage?: typeof scrape;
  summarizePage?: typeof summarizeText;
  apiKey?: string;
  origins?: string[];
};

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  // Render terminates HTTPS at one reverse proxy. Local requests need none.
  if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
  const origins = options.origins || (process.env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173").split(",").map(origin => origin.trim()).filter(Boolean);
  app.use(cors({ origin: (origin, callback) => {
    if (!origin || origins.includes(origin)) callback(null, true);
    else callback(new AppError("This frontend origin is not allowed. Check FRONTEND_URL on the backend.", 403));
  }, methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
  app.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
  app.get("/health", (_request, response) => response.json({ status: "ok" }));
  app.use("/api", rateLimit({ windowMs: 60000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false,
    handler: (_request, response) => response.status(429).json({ error: "Too many requests. Please wait a minute and try again." }),
  }));
  app.use(express.json({ limit: "4kb" }));
  let active = 0;
  app.post("/api/summarize", async (request, response, next) => {
    let acquired = false;
    try {
      if (!request.is("application/json")) throw new AppError("Send a JSON body containing a URL.", 415);
      const key = options.apiKey ?? process.env.GROQ_API_KEY;
      if (!key) throw new AppError("Summaries aren't configured yet. Set GROQ_API_KEY on the backend.", 503);
      if (active >= 4) throw new AppError("The app is busy. Please try again shortly.", 429);
      active++; acquired = true;
      const page = await (options.scrapePage || scrape)(request.body?.url);
      const summary = await (options.summarizePage || summarizeText)(page.text, key, process.env.GROQ_MODEL || "qwen/qwen3.8-27b");
      response.json({ title: page.title, url: page.url, summary, wordCount: page.wordCount, truncated: page.truncated });
    } catch (error) { next(error); }
    finally { if (acquired) active--; }
  });
  app.use((_request, response) => response.status(404).json({ error: "API endpoint not found." }));
  const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
    const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    const status = error instanceof AppError ? error.status : error.type === "entity.too.large" ? 413 : error.type === "entity.parse.failed" ? 400 : timeout ? 504 : 502;
    const message = error instanceof AppError ? error.message : status === 413 ? "Request is too large. Send one webpage URL." : status === 400 ? "Send a valid JSON object containing a URL." : timeout ? "The website or AI service took too long. Please try again." : "Unable to reach this website or the AI service. Please try another URL.";
    response.status(status).json({ error: message });
  };
  app.use(handleError);
  return app;
}
