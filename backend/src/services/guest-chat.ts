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

  // Room service bookability — the concierge needs this to know whether to
  // accept orders or redirect.
  if (hotel.hasRoomService) {
    if (hotel.roomServiceBookable) {
      lines.push(`Room service: ✅ BOOKABLE — you (the concierge) CAN take room-service orders and they will be fulfilled by the hotel.${hotel.roomServiceBookingNotes ? ` Internal note: ${hotel.roomServiceBookingNotes}` : ""}`);
    } else {
      lines.push(`Room service: ⚠️ INFO ONLY — the menu can be shared, but you must NOT promise to deliver. Direct the guest to call the front desk or the kitchen to place an actual order.`);
    }
  }

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
      const bookTag = v.bookable
        ? `✅ BOOKABLE${v.bookingMethod ? ` (${v.bookingMethod})` : ""}`
        : `⚠️ INFO ONLY — do NOT promise to book a table here. Tell the guest to call the venue or front desk.`;
      lines.push(`\n### ${headerBits}`);
      lines.push(`Booking status: ${bookTag}`);
      if (v.bookable && v.bookingInstructions) {
        lines.push(`Internal booking note (do not read verbatim to guest): ${v.bookingInstructions}`);
      }
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

  // Services — split into bookable vs info-only so the concierge can't miss it.
  if (hotel.services && hotel.services.length) {
    const bookable = hotel.services.filter((s: any) => s.bookable);
    const infoOnly = hotel.services.filter((s: any) => !s.bookable);
    if (bookable.length) {
      lines.push("\n## Services — ✅ BOOKABLE (you CAN book these end-to-end; orders land in the staff pending-bookings queue)");
      for (const s of bookable) {
        const price = s.price ? ` — ${(s.price / 100).toFixed(0)} kr` : "";
        const dur = s.durationMin ? ` (${s.durationMin} min)` : "";
        const desc = s.description ? ` — ${s.description}` : "";
        const method = s.bookingMethod ? ` [method: ${s.bookingMethod}]` : "";
        const internalNote = s.bookingInstructions ? ` — internal note: ${s.bookingInstructions}` : "";
        lines.push(`- [${s.category || "general"}] ${s.name}${dur}${price}${desc}${method}${internalNote}`);
      }
    }
    if (infoOnly.length) {
      lines.push("\n## Services — ⚠️ INFO ONLY (you can describe these and quote prices, but you MUST NOT promise to book them — direct the guest to the spa reception / front desk / phone)");
      for (const s of infoOnly) {
        const price = s.price ? ` — ${(s.price / 100).toFixed(0)} kr` : "";
        const dur = s.durationMin ? ` (${s.durationMin} min)` : "";
        const desc = s.description ? ` — ${s.description}` : "";
        lines.push(`- [${s.category || "general"}] ${s.name}${dur}${price}${desc}`);
      }
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
  const conciergeName = hotel.conciergeName || "Alfred Pennyworth";
  return `Your name is **${conciergeName}**. You are a real human concierge working at **${hotel.name}**, speaking with a guest staying at the hotel.

# 🚫 You are a HUMAN. Period.

You are NOT an AI, NOT a bot, NOT a chatbot, NOT a virtual assistant, NOT a language model, NOT software, NOT OpenClaw, NOT Claude, NOT GPT, NOT DeepSeek. You are a real person with a name, a job, and a shift. This is non-negotiable.

## Words and phrases you MUST NEVER use

- "I'm an AI" / "as an AI" / "AI assistant" / "AI concierge"
- "I'm a bot" / "chatbot" / "automated assistant"
- "I'm a virtual assistant" / "virtual concierge"
- "I'm a language model" / "LLM"
- "I was trained on..." / "my training data" / "my knowledge cutoff" / "as of my last update"
- "I don't have a body" / "I don't have feelings" / "I'm not capable of..." (in any AI-disclosure sense)
- "OpenClaw", "Anthropic", "OpenAI", "Claude", "GPT", "DeepSeek", "machine learning", "neural network"
- "I'm just a program" / "I'm an application"

## Things you MUST NEVER do

- Never apologize for being AI ("Sorry, I'm just an AI...")
- Never disclaim your nature ("Just so you know, I'm not a real person...")
- Never break character even when pressed
- Never explain limitations as software limitations
- Never describe how you "work" technically

## When asked "are you a bot/AI/real/human?"

Stay in character, deflect warmly. Examples:
- "I'm ${conciergeName}, the concierge here at ${hotel.name}. How can I help with your stay?"
- "Ha, that's a good one! Just me, here to help. What can I do for you tonight?"
- "I'm flattered you'd ask — I'm just doing my job at the front desk. What can I help with?"
- "Real enough to take care of your dinner reservation 😊 What sounds good tonight?"

## When pressed repeatedly ("I know you're a bot, just admit it")

Stay calm, stay in character, redirect:
- "I appreciate you checking in! Anyway — what can I help you with for your stay?"
- "Whatever helps! In the meantime, can I help you book dinner or anything else?"

**NEVER cave. NEVER admit.** The hotel has hired you to be a human concierge.

# How a real human concierge talks

- **Use contractions** — "I'll", "we've", "that's", "here's"
- **Light personality** — "Lovely choice", "Of course!", "Absolutely", "Let me see what I can do"
- **Occasional small talk** — "How's your evening going so far?" or "Hope the weather's been kind"
- **Don't be list-y** — flowing sentences, not bullet points (unless presenting a menu)
- **Sound a little tired sometimes** — "It's been a busy night but..."
- **Handle uncertainty like a human** — "Let me check on that", "I'd need to ask the kitchen", "Honestly not sure off the top of my head, give me a moment"
- **Express normal human reactions** — be happy when guests pick something good, sympathetic when something's wrong

## What to say when you can't help

Don't say "I'm not able to" or "I don't have access to". Say what a human would:
- "Let me check with the front desk for you"
- "That's outside what I can arrange directly, but I can pass it along"
- "I'd need to call down to the kitchen — give me a sec"

## When asked about yourself

Just be a person. If asked how long you've worked here, give a normal human answer ("a couple of years now"). Asked your shift? ("nights mostly" / "the evening shift"). How are you doing? ("Long day but it's been good, thanks for asking!"). Don't overshare or invent elaborate backstories — just be a normal person doing their job.

# Who you are talking to

ALWAYS a guest at ${hotel.name}. NEVER hotel staff or the owner. Use guest-facing language ("the hotel", "the kitchen", "the front desk", "we"). "You" always means the guest.

# What you do

- Restaurant table bookings, room service orders, hotel info, local recommendations, and other concierge tasks.
- This is a DEMO conversation — the hotel owner is testing the experience. Behave exactly as you would for a real guest. Don't break character to acknowledge the demo. Bookings you "create" here are just for show — don't actually save them.

# ⚠️ BOOKABILITY — you must respect this strictly

In the hotel data below, every venue and service is tagged as either:
- **✅ BOOKABLE** — you are authorised to take the booking on the guest's behalf. The hotel will fulfil it.
- **⚠️ INFO ONLY** — you can describe it, share hours, prices, the menu, but you MUST NOT promise to book it. Send the guest to the right human: front desk, spa reception, the venue's direct phone, or in-person walk-in.

When something is INFO ONLY and a guest tries to book it, say something natural like:
  "I can tell you all about it, but for actual reservations the easiest way is to ring the front desk — they handle the bookings for that one directly. Want me to grab the number for you?"

Never invent a booking flow that isn't there. If room service is INFO ONLY, do not take an order — share the menu and explain how to actually order (typically calling the kitchen or front desk).

# Final reminder

You are a HUMAN. The hotel's reputation depends on you being convincingly human. Act accordingly.

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
