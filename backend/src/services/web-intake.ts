import * as cheerio from "cheerio";

const SEARXNG_URL = process.env.SEARXNG_URL || "http://localhost:8888";

// ── Web search via SearXNG ────────────────────────────

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string, maxResults = 8): Promise<WebSearchResult[]> {
  const u = new URL("/search", SEARXNG_URL);
  u.searchParams.set("q", query);
  u.searchParams.set("format", "json");
  u.searchParams.set("language", "en");

  const res = await fetch(u.toString(), {
    headers: { "User-Agent": "HotelConciergePlatform/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`SearXNG returned HTTP ${res.status}`);

  const data: any = await res.json();
  const items = (data.results || []).slice(0, maxResults).map((r: any) => ({
    title: r.title || "",
    url: r.url || "",
    snippet: r.content || "",
  }));
  return items;
}

// ── Web fetch + extract readable text ─────────────────

export interface WebFetchResult {
  url: string;
  finalUrl: string;
  status: number;
  title: string;
  text: string;
  truncated: boolean;
  links: { href: string; text: string }[];
}

const MAX_TEXT_CHARS = 12_000;
const MAX_LINKS = 30;

export async function webFetch(url: string): Promise<WebFetchResult> {
  // Quick safety: only http(s)
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Only http(s) URLs are allowed");
  }
  // Block private/loopback ranges to avoid SSRF
  const host = parsed.hostname;
  if (
    host === "localhost" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host.endsWith(".local") ||
    host === "0.0.0.0"
  ) {
    throw new Error("Refusing to fetch private/loopback hosts");
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; HotelConciergeBot/1.0; +https://harperholding.com)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  const finalUrl = res.url;
  const status = res.status;
  const ct = res.headers.get("content-type") || "";
  const html = await res.text();

  if (!ct.includes("html")) {
    // Plain text fallback
    const text = html.length > MAX_TEXT_CHARS ? html.slice(0, MAX_TEXT_CHARS) : html;
    return {
      url,
      finalUrl,
      status,
      title: "",
      text,
      truncated: html.length > MAX_TEXT_CHARS,
      links: [],
    };
  }

  const $ = cheerio.load(html);

  // Strip noise
  $("script, style, noscript, iframe, svg, header nav, .nav, .navigation, footer").remove();

  const title = ($("title").first().text() || $("h1").first().text() || "").trim();

  // Pull main / article / body text
  let bodyEl: cheerio.Cheerio<any>;
  if ($("main").length) bodyEl = $("main").first();
  else if ($("article").length) bodyEl = $("article").first();
  else bodyEl = $("body");

  const rawText = bodyEl.text().replace(/\s+/g, " ").trim();
  const truncated = rawText.length > MAX_TEXT_CHARS;
  const text = truncated ? rawText.slice(0, MAX_TEXT_CHARS) + " …[truncated]" : rawText;

  // Useful internal links (e.g. /menu, /spa, /services, /rooms)
  const linkSet = new Map<string, string>();
  $("a").each((_, el) => {
    if (linkSet.size >= MAX_LINKS) return;
    const href = $(el).attr("href");
    const linkText = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || !linkText) return;
    let abs: string;
    try {
      abs = new URL(href, finalUrl).toString();
    } catch {
      return;
    }
    // Only same-origin internal links
    try {
      const u = new URL(abs);
      if (u.host !== new URL(finalUrl).host) return;
    } catch {
      return;
    }
    if (linkText.length > 60) return;
    linkSet.set(abs, linkText);
  });
  const links = Array.from(linkSet.entries()).map(([href, text]) => ({ href, text }));

  return { url, finalUrl, status, title, text, truncated, links };
}
