import { env } from "cloudflare:workers";
import { AppError, readLimited, scrape, summarizeText } from "@/lib/scraper";
const buckets = new Map<string, { count: number; until: number }>();
let active = 0;
function throttle(ip: string) {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);
  if (buckets.size >= 1000 && !buckets.has(ip)) throw new AppError("The app is busy. Please try again shortly.", 429);
  const bucket = buckets.get(ip) || { count: 0, until: now + 60000 };
  if (bucket.count >= 5 || active >= 4) throw new AppError("Too many requests. Please wait a minute and try again.", 429);
  bucket.count++; buckets.set(ip, bucket);
}
export async function POST(request: Request) {
  let acquired = false;
  try {
    if (!(request.headers.get("content-type") || "").includes("application/json")) throw new AppError("Send a JSON body containing a URL.", 415);
    const bindings = env as unknown as Record<string, string | undefined>;
    const key = bindings.GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (!key) throw new AppError("Summaries aren't configured yet. The app owner needs to set GROQ_API_KEY on the server.", 503);
    throttle(request.headers.get("cf-connecting-ip") || "local"); active++; acquired = true;
    let payload;
    try { payload = JSON.parse(await readLimited(request, 4096)); }
    catch (error) { if (error instanceof AppError) throw error; throw new AppError("Send a valid JSON object containing a URL."); }
    const page = await scrape(payload?.url);
    const summary = await summarizeText(page.text, key, bindings.GROQ_MODEL || process.env.GROQ_MODEL || "qwen/qwen3.8-27b");
    return Response.json({ title: page.title, url: page.url, summary, wordCount: page.wordCount, truncated: page.truncated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = error instanceof AppError;
    const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    return Response.json({ error: known ? error.message : timeout ? "The website or AI service took too long. Please try again." : "Unable to reach this website or the AI service. Please try another URL." }, { status: known ? error.status : timeout ? 504 : 502, headers: { "Cache-Control": "no-store" } });
  } finally { if (acquired) active--; }
}
