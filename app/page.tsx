"use client";
import { useState } from "react";
import Link from "next/link";
import { FileText, Link as LinkIcon, LoaderCircle, Sparkles, Globe, Check, AlertCircle } from "lucide-react";
type Result = { title: string; url: string; summary: string; wordCount: number; truncated: boolean };
export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  async function summarize(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }), signal: AbortSignal.timeout(65000) });
      const data = await response.json() as Result & { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to summarize this page.");
      setResult(data);
    } catch (err) { setError(err instanceof Error && err.name === "TimeoutError" ? "This took too long. Please try again." : err instanceof Error ? err.message : "Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }
  return <div className="app-shell">
    <header className="topbar"><Link className="brand" href="/" aria-label="Pagebrief home"><span className="brand-icon"><FileText size={21} /></span>pagebrief<span className="brand-dot">.</span></Link><span className="topbar-note">A little less reading.</span></header>
    <main>
      <div className="intro"><span className="eyebrow"><Sparkles size={15} /> WEBPAGE SUMMARIZER</span><h1>The page.<br /><span>The main points.</span></h1><p>Turn a webpage into a short, clear summary.</p></div>
      <section className="input-card" aria-labelledby="url-label"><form onSubmit={summarize}>
        <label id="url-label" htmlFor="url">What would you like to read?</label>
        <div className="input-row"><div className="url-field"><LinkIcon size={19} aria-hidden="true" /><input id="url" name="url" type="url" placeholder="https://example.com/article" value={url} onChange={e => setUrl(e.target.value)} required maxLength={2048} disabled={loading} autoComplete="url" /></div><button type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}{loading ? "Loading…" : "Summarize"}</button></div>
        <p className="input-hint">Works with public articles and basic HTML pages.</p>
      </form></section>
      {error && <div role="alert" className="error"><AlertCircle size={20} /><span>{error}</span></div>}
      <section className={`result-card ${result ? "has-result" : ""}`} aria-live="polite" aria-busy={loading}>
        <div className="result-header"><span><FileText size={17} /> YOUR SUMMARY</span>{result && <span className="complete"><Check size={15} /> Ready</span>}</div>
        {loading ? <div className="empty"><div className="empty-icon"><LoaderCircle className="spin" size={28} /></div><h2>Reading between the lines…</h2><p>Extracting the page and gathering the main points.</p><div className="skeleton-lines" aria-hidden="true"><i /><i /><i /></div></div>
        : result ? <div className="result-content"><a className="source" href={result.url} target="_blank" rel="noopener noreferrer"><Globe size={15} />{new URL(result.url).hostname}</a><h2>{result.title}</h2><div className="summary">{result.summary.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="result-meta">{result.wordCount.toLocaleString()} words extracted · AI summary{result.truncated && " · Based on the opening portion of the page"}</div></div>
        : <div className="empty"><div className="empty-icon"><FileText size={29} /></div><h2>Good reading starts here.</h2><p>Paste a link above. The essentials will appear here.</p></div>}
      </section>
      <footer><span><Sparkles size={14} /> Summarized with Groq</span><span>AI can miss details. Check the original source.</span></footer>
    </main>
  </div>;
}
