import OpenAI from "openai";
import { webSearch, webFetch } from "./web-intake";

// ── Model ─────────────────────────────────────────────

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://api.deepseek.com",
});
const MODEL = process.env.MANAGER_MODEL || "deepseek-chat";

// ── Output shape (what the wizard renders as confirmation cards) ───────

export interface ImportSuggestion {
  hotelName?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  // Facility flags inferred from the page text
  flags: {
    hasRestaurant?: boolean;
    hasRoomService?: boolean;
    hasSpa?: boolean;
    hasPool?: boolean;
    hasGym?: boolean;
    hasBar?: boolean;
    hasConference?: boolean;
    hasTransfers?: boolean;
    petFriendly?: boolean;
  };
  facilityDetails: {
    spaHours?: string;
    poolHours?: string;
    gymHours?: string;
    barHours?: string;
    conferenceNotes?: string;
    petPolicy?: string;
    transferNotes?: string;
  };
  venues: { name: string; kind: string; hours?: string; location?: string; description?: string }[];
  menuItems: { name: string; description?: string; priceNok?: number; category?: string; venueName?: string }[];
  services: {
    name: string;
    description?: string;
    durationMin?: number;
    priceNok?: number;
    category?: "spa_treatment" | "spa_access" | "transfer" | "activity" | "general";
  }[];
  knowledge: { category: "amenities" | "policies" | "local_area" | "general"; content: string }[];
  sourceUrls: string[];
  warnings: string[];
}

// ── Find candidate URLs ───────────────────────────────

async function resolveUrls(input: { url?: string; hotelName?: string }): Promise<string[]> {
  if (input.url) return [input.url];
  if (!input.hotelName) return [];
  try {
    const results = await webSearch(`${input.hotelName} hotel official site`, 5);
    // Prefer non-aggregator hits
    const blocked = /(booking\.com|tripadvisor|expedia|hotels\.com|trivago|kayak|agoda)/i;
    const ranked = results
      .map((r) => r.url)
      .filter((u) => !blocked.test(u))
      .slice(0, 2);
    if (ranked.length) return ranked;
    return results.slice(0, 1).map((r) => r.url);
  } catch {
    return [];
  }
}

// ── Choose a few useful internal links ────────────────

function pickInternalLinks(links: { href: string; text: string }[]): string[] {
  const score = (l: { href: string; text: string }) => {
    const s = (l.href + " " + l.text).toLowerCase();
    let n = 0;
    if (/menu/.test(s)) n += 5;
    if (/restaurant|dining|food/.test(s)) n += 4;
    if (/spa|wellness/.test(s)) n += 4;
    if (/services?|amenities/.test(s)) n += 3;
    if (/rooms?|stay/.test(s)) n += 2;
    if (/about|contact/.test(s)) n += 1;
    if (/pool|gym|fitness|bar|conference|meeting/.test(s)) n += 2;
    if (/policies?|faq|info/.test(s)) n += 1;
    return n;
  };
  const scored = links.map((l) => ({ ...l, n: score(l) })).filter((l) => l.n > 0);
  scored.sort((a, b) => b.n - a.n);
  // Dedupe by href
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of scored) {
    if (out.length >= 4) break;
    if (seen.has(l.href)) continue;
    seen.add(l.href);
    out.push(l.href);
  }
  return out;
}

// ── Run the import ────────────────────────────────────

export async function importFromWebsite(input: { url?: string; hotelName?: string; city?: string }): Promise<ImportSuggestion> {
  const warnings: string[] = [];
  const startUrls = await resolveUrls(input);
  if (startUrls.length === 0) {
    warnings.push("Could not find a starting URL.");
    return emptySuggestion(warnings);
  }

  const fetched: { url: string; title: string; text: string }[] = [];
  const visited = new Set<string>();

  // First-pass fetches
  for (const u of startUrls) {
    try {
      const r = await webFetch(u);
      visited.add(r.finalUrl);
      fetched.push({ url: r.finalUrl, title: r.title, text: r.text });

      // Pick helpful internal links to follow
      const more = pickInternalLinks(r.links);
      for (const link of more) {
        if (visited.has(link) || fetched.length >= 6) break;
        try {
          const sub = await webFetch(link);
          visited.add(sub.finalUrl);
          fetched.push({ url: sub.finalUrl, title: sub.title, text: sub.text });
        } catch (e: any) {
          warnings.push(`Couldn't fetch ${link}: ${e?.message || "error"}`);
        }
      }
    } catch (e: any) {
      warnings.push(`Couldn't fetch ${u}: ${e?.message || "error"}`);
    }
  }

  if (fetched.length === 0) return emptySuggestion(warnings);

  // Hand the fetched content to DeepSeek and ask for structured JSON
  const prompt = `You are extracting hotel setup information from website content. The user is configuring their hotel concierge platform.

The hotel may or may not be: ${input.hotelName || "(unknown name)"}, ${input.city || "(unknown city)"}.

Below are pages I fetched from the candidate website(s). Extract a JSON object with:
- hotelName, city, phone, email, website (if found)
- flags: which of these the hotel has — hasRestaurant, hasRoomService, hasSpa, hasPool, hasGym, hasBar, hasConference, hasTransfers, petFriendly. Only set true if there's clear evidence.
- facilityDetails: spaHours, poolHours, gymHours, barHours, conferenceNotes, petPolicy, transferNotes. Short strings, only fill if clearly stated.
- venues: list of restaurants/bars/lounges/cafes you can identify. For each: { name, kind: 'restaurant'|'bar'|'lounge'|'cafe'|'room_service', hours, location, description }
- menuItems: distinct dishes/drinks you saw. For each: { name, description, priceNok (number, in NOK kroner not øre), category: 'starters'|'mains'|'desserts'|'drinks'|'other', venueName (the venue this belongs to if you can tell) }
  Don't invent prices. If you can't see a price, set priceNok to 0.
- services: spa treatments, transfers, activities. For each: { name, description, durationMin, priceNok, category: 'spa_treatment'|'spa_access'|'transfer'|'activity'|'general' }
- knowledge: free-text useful guest info. For each: { category: 'amenities'|'policies'|'local_area'|'general', content (one sentence per entry) }

NEVER invent or guess. Only include items you have textual evidence for. Skip anything uncertain. It's better to have a short accurate list than a long fabricated one.
If the page is clearly an aggregator (Booking.com, TripAdvisor, etc.) and not the hotel's own site, set warnings appropriately and extract minimally.

Return STRICT JSON only, no preamble. Schema:
{
  "hotelName": string|null,
  "city": string|null,
  "phone": string|null,
  "email": string|null,
  "website": string|null,
  "flags": { ... },
  "facilityDetails": { ... },
  "venues": [...],
  "menuItems": [...],
  "services": [...],
  "knowledge": [...],
  "warnings": [...]
}

Pages:
${fetched.map((p, i) => `\n=== Page ${i + 1}: ${p.url}\n${p.title ? `Title: ${p.title}\n` : ""}${p.text}`).join("\n")}
`;

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed: any = JSON.parse(raw);

    // Convert priceNok → numbers (LLM might give strings)
    const menuItems = (parsed.menuItems || []).map((m: any) => ({
      name: String(m.name || "").trim(),
      description: m.description || undefined,
      priceNok: Number(m.priceNok) || 0,
      category: m.category || "other",
      venueName: m.venueName || undefined,
    })).filter((m: any) => m.name);

    const services = (parsed.services || []).map((s: any) => ({
      name: String(s.name || "").trim(),
      description: s.description || undefined,
      durationMin: typeof s.durationMin === "number" ? s.durationMin : undefined,
      priceNok: Number(s.priceNok) || 0,
      category: s.category || "general",
    })).filter((s: any) => s.name);

    return {
      hotelName: parsed.hotelName || undefined,
      city: parsed.city || undefined,
      phone: parsed.phone || undefined,
      email: parsed.email || undefined,
      website: parsed.website || startUrls[0],
      flags: parsed.flags || {},
      facilityDetails: parsed.facilityDetails || {},
      venues: parsed.venues || [],
      menuItems,
      services,
      knowledge: parsed.knowledge || [],
      sourceUrls: fetched.map((p) => p.url),
      warnings: [...warnings, ...(parsed.warnings || [])],
    };
  } catch (err: any) {
    return { ...emptySuggestion(warnings), warnings: [...warnings, `Extraction failed: ${err?.message || err}`] };
  }
}

function emptySuggestion(warnings: string[] = []): ImportSuggestion {
  return {
    flags: {},
    facilityDetails: {},
    venues: [],
    menuItems: [],
    services: [],
    knowledge: [],
    sourceUrls: [],
    warnings,
  };
}
