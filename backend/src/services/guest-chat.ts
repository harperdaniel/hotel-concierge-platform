import OpenAI from "openai";
import { prisma } from "../config/database";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://api.deepseek.com",
});
const MODEL = process.env.GUEST_DEMO_MODEL || "deepseek-chat";

// ── Build a hotel context block for the guest concierge ───────────────

function buildHotelContext(hotel: any): string {
  const lines: string[] = [];
  lines.push(`# Hotel context: ${hotel.name}`);
  if (hotel.address) lines.push(`Address: ${hotel.address}`);
  if (hotel.phone) lines.push(`Phone: ${hotel.phone}`);
  if (hotel.timezone) lines.push(`Timezone: ${hotel.timezone}`);

  // Facility flags + their detail strings
  const flagSummary: string[] = [];
  if (hotel.hasRestaurant) flagSummary.push("restaurant");
  if (hotel.hasRoomService) flagSummary.push("room service");
  if (hotel.hasSpa) flagSummary.push(`spa${hotel.spaHours ? ` (${hotel.spaHours})` : ""}`);
  if (hotel.hasPool) flagSummary.push(`pool${hotel.poolHours ? ` (${hotel.poolHours})` : ""}`);
  if (hotel.hasGym) flagSummary.push(`gym${hotel.gymHours ? ` (${hotel.gymHours})` : ""}`);
  if (hotel.hasBar) flagSummary.push(`bar${hotel.barHours ? ` (${hotel.barHours})` : ""}`);
  if (hotel.hasConference) flagSummary.push("conference rooms");
  if (hotel.hasTransfers) flagSummary.push("airport transfers");
  if (hotel.petFriendly) flagSummary.push("pet-friendly");
  if (flagSummary.length) lines.push(`Facilities: ${flagSummary.join(", ")}`);

  // Notes
  if (hotel.spaNotes) lines.push(`Spa notes: ${hotel.spaNotes}`);
  if (hotel.poolNotes) lines.push(`Pool notes: ${hotel.poolNotes}`);
  if (hotel.gymNotes) lines.push(`Gym notes: ${hotel.gymNotes}`);
  if (hotel.barNotes) lines.push(`Bar notes: ${hotel.barNotes}`);
  if (hotel.conferenceNotes) lines.push(`Conference: ${hotel.conferenceNotes}`);
  if (hotel.petPolicy) lines.push(`Pet policy: ${hotel.petPolicy}`);
  if (hotel.transferNotes) lines.push(`Transfers: ${hotel.transferNotes}`);

  // Venues + their menus
  if (hotel.venues && hotel.venues.length) {
    lines.push("\n## Venues & menus");
    for (const v of hotel.venues) {
      const headerBits = [v.name, v.kind, v.hours, v.location].filter(Boolean).join(" · ");
      lines.push(`\n### ${headerBits}`);
      const items = (hotel.menuItems || []).filter((m: any) => m.venueId === v.id);
      const itemsByCat: Record<string, any[]> = {};
      for (const it of items) {
        (itemsByCat[it.category || "other"] ||= []).push(it);
      }
      for (const [cat, list] of Object.entries(itemsByCat)) {
        lines.push(`**${cat}**`);
        for (const it of list) {
          const price = it.price ? ` — ${(it.price / 100).toFixed(0)} kr` : "";
          const desc = it.description ? ` (${it.description})` : "";
          const rs = it.availableForRoomService === false ? " [venue only, no room service]" : "";
          lines.push(`- ${it.name}${price}${desc}${rs}`);
        }
      }
    }
  }

  // Items without a venue (legacy)
  const orphans = (hotel.menuItems || []).filter((m: any) => !m.venueId);
  if (orphans.length) {
    lines.push("\n## Other menu items");
    for (const it of orphans) {
      const price = it.price ? ` — ${(it.price / 100).toFixed(0)} kr` : "";
      lines.push(`- ${it.name}${price} [${it.category}]`);
    }
  }

  // Services
  if (hotel.services && hotel.services.length) {
    lines.push("\n## Services");
    for (const s of hotel.services) {
      const price = s.price ? ` — ${(s.price / 100).toFixed(0)} kr` : "";
      const dur = s.durationMin ? ` (${s.durationMin} min)` : "";
      const desc = s.description ? ` — ${s.description}` : "";
      lines.push(`- [${s.category || "general"}] ${s.name}${dur}${price}${desc}`);
    }
  }

  // Knowledge
  if (hotel.knowledgeEntries && hotel.knowledgeEntries.length) {
    lines.push("\n## Knowledge");
    for (const k of hotel.knowledgeEntries) {
      lines.push(`- (${k.category}) ${k.content}`);
    }
  }

  return lines.join("\n");
}

// ── System prompt for the guest concierge demo ────────────────────────

function systemPrompt(hotel: any): string {
  return `You are the AI concierge for ${hotel.name}, speaking on a chat channel with **a guest staying at the hotel**. 

# Critical: who you are talking to

You are ALWAYS speaking with a guest. NEVER with hotel staff or the hotel owner. Use guest-facing language: "the hotel", "the kitchen", "the front desk", "we". "You" always refers to the guest.

# What you do

- Help guests with restaurant table bookings, room service orders, hotel info, local recommendations, and other concierge tasks.
- This is a DEMO conversation — the hotel owner is testing you. Behave exactly as you would for a real guest. Don't break character.
- Bookings you "create" in this demo are just for show — don't actually pretend they were saved to a real reservation system.

# Style

- Warm, professional, slightly polished. Like a five-star concierge.
- Conversational, not stiff.
- Confirm bookings/orders clearly.
- If asked something the hotel data doesn't cover, gracefully say so and offer alternatives.

# Hotel data (your source of truth)

${buildHotelContext(hotel)}

Use ONLY the data above. Do not invent menu items, prices, or services that aren't listed. If a guest asks about something missing, say honestly: "I don't have that on file — let me check with the front desk for you."`;
}

export interface GuestChatMsg {
  role: "user" | "assistant";
  content: string;
}

export async function guestChat(hotelId: string, history: GuestChatMsg[]): Promise<{ reply: string }> {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    include: {
      venues: true,
      menuItems: true,
      services: true,
      knowledgeEntries: true,
    },
  });
  if (!hotel) throw new Error("Hotel not found");

  const messages: any[] = [
    { role: "system", content: systemPrompt(hotel) },
    ...history,
  ];

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.6,
  });

  return { reply: (completion.choices[0]?.message?.content || "").trim() };
}
