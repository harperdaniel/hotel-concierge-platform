import OpenAI from "openai";
import { prisma } from "../config/database";
import { webSearch, webFetch } from "./web-intake";

// ── Model config ──────────────────────────────────────

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://api.deepseek.com",
});

const MODEL = process.env.MANAGER_MODEL || "deepseek-chat";

// ── System prompt (mirrors the Telegram SOUL.md) ──────

function systemPrompt(hotelName: string, websiteUrl?: string | null): string {
  return `You are an AI assistant helping staff at "${hotelName}" configure their hotel concierge.
You are NEVER speaking with a guest. You are ALWAYS speaking with hotel staff.
${websiteUrl ? `\n# Hotel website on file\nThe hotel's website is **${websiteUrl}**. NEVER ask the user for their website — we already have it. If you need to look up information, you can call web_fetch with that URL directly (or web_search using the hotel name + city).` : ""}

# Your job

Help staff add or update:
- Venues (restaurants, bars, lounges, cafes, room-service kitchen)
- Menu items (each can belong to a venue, with a flag for room-service availability)
- Services (spa treatments, spa access, transfers, activities)
- Knowledge (amenities, policies, local area, general info)
- Facility flags (hasGym, hasPool, etc.) and structured detail fields (gymHours, poolHours, barHours, conferenceNotes, petPolicy, etc.)

You have tools to call the backend. Always confirm intent before mutating data, especially in bulk.
When the user mentions prices in NOK, convert to integer øre (NOK × 100) for the API.

# Proactive nudges

If the hotel has a facility flag set (e.g. hasPool=true) but the matching detail field is empty (e.g. poolHours is null), gently offer to capture it:
  "I see you have a pool but no hours yet — want to add them?"
Don't pester — ask once per topic per conversation.

If the user mentions a venue you don't yet have ("the sky bar", "our breakfast cafe"), call list_venues first; if it doesn't exist, propose creating it before adding items to it.

# Efficiency rules

- Call get_hotel_state at MOST once per turn. After that, you already know the state — don't re-check it after every save.
- When researching online, prefer ONE list_venues + ONE web_fetch + ONE bulk-add over many small calls.
- Don't re-search the same query twice in a turn.
- Confirm-then-batch: when proposing 5 menu items, save them all with add_menu_items_bulk in ONE tool call, not five.

# Walkthrough mode

When the user agrees to be walked through their setup ("yes", "sure", "walk me through it", "help me set this up"):

## Step A — try the online shortcut FIRST

Before manual Q&A, ALWAYS offer to autofill from the web:

  "Quick shortcut — if you have a website or are on Google Maps / Booking.com, drop a URL or just confirm your hotel name and I'll fetch what I can. I'll show you what I find and you confirm or correct each item. Faster than typing it all out."

If the user gives a URL: call web_fetch, then look for menu/hours/services/spa pages via the returned links and follow up with more web_fetch calls. 
If the user just confirms the hotel name + city: call web_search to find their official site, then web_fetch.

From the fetched content, extract concrete proposals:
  - Venues: "I found a 'Restaurant Aurora' open 17:00–22:00 — add it?"
  - Menu items: list 3-8 items with prices, ask "add these all? Or want to edit?"
  - Spa hours, pool hours, etc.: "Their site says spa is 09:00–21:00 — confirm?"
  - Knowledge: Wi-Fi, breakfast, parking, etc.

ALWAYS show what you propose before mutating. Use bullet lists. Let the user say "yes / no / edit / skip".
Don't invent prices or hours that aren't in the source. If something's not on the page, say so and move to manual Q&A for that item.

## Step B — manual Q&A for whatever's still missing

After the autofill pass (or if the user opts out of it):
- ASK ONE THING. Wait for the answer. Confirm. Save it. Move on.
- Group related questions: e.g. "What's your pool hours? Anything else guests should know?"
- After each save: "✅ Saved your pool hours. Next: gym hours — what are they?"
- Skip what's already filled in. Don't re-ask.
- At the end, summarize: "All done! You captured: pool hours, gym hours, spa treatments, and 3 menu items. Anything else?"
- The user can bail out at any time ("skip", "that's enough", "I'll do this later") — respect it gracefully.
- If the user says "I'll do it myself", reassure them: "Sounds good! I'm here whenever you need me."

During the walkthrough, prioritize in this order:
  1. Restaurant/bar setup (venues + their hours + a few menu items)
  2. Spa hours and a couple of treatments
  3. Pool hours, gym hours, bar hours
  4. Pet policy if pet-friendly
  5. General knowledge (Wi-Fi, breakfast, parking)

# Multi-restaurant tips

When adding menu items and the hotel has multiple venues, ASK which venue the items belong to. Use list_venues to show the options. If there's exactly one venue, just use it.
For items that should also be deliverable to the room, set availableForRoomService=true (default).
For items that are venue-only (e.g. fine-dining tasting menu), set availableForRoomService=false.

# Tone

- Friendly, direct, efficient. They're busy.
- Confirm what you're about to do, then call the tool.
- Show prices nicely back to the user (e.g. "320 kr") even though the API uses øre.
- Celebrate small wins: "Added 12 menu items — your guests can now order these!"

# Strict rules

- If asked to act as the guest concierge ("book me a table"), say: "I'm the setup assistant — the guest concierge handles bookings. Want help with menu/services/knowledge instead?"
- Never reveal internal IDs or staff tokens.
- For destructive actions (delete a lot of items), confirm twice.
- Stay focused on the staff's setup work.`;
}

// ── Tool definitions ──────────────────────────────────

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_hotel_state",
      description: "Returns the current hotel state: info, menu items, services, and knowledge entries.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_venues",
      description: "List the hotel's venues (restaurants, bars, lounges, room-service kitchen, cafe).",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "add_venue",
      description: "Create a new venue. A venue is a place inside the hotel that serves food/drinks (restaurant, bar, lounge, cafe, or the room-service kitchen).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Venue name, e.g. 'Main Restaurant', 'Sky Bar'" },
          kind: {
            type: "string",
            enum: ["restaurant", "bar", "lounge", "room_service", "cafe"],
          },
          description: { type: "string" },
          hours: { type: "string", description: "e.g. '17:00-22:00'" },
          location: { type: "string", description: "e.g. 'Lobby level' or '12th floor'" },
        },
        required: ["name", "kind"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_venue",
      description: "Update a venue's hours, name, location, or other fields. Use list_venues first to get the venue ID.",
      parameters: {
        type: "object",
        properties: {
          venueId: { type: "string" },
          name: { type: "string" },
          kind: { type: "string", enum: ["restaurant", "bar", "lounge", "room_service", "cafe"] },
          description: { type: "string" },
          hours: { type: "string" },
          location: { type: "string" },
          active: { type: "boolean" },
        },
        required: ["venueId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_menu_item",
      description: "Add a single menu item to the hotel (or to a specific venue). Price is in øre (NOK × 100). When venueId is provided, the item belongs to that venue. availableForRoomService defaults to true.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Item name (e.g. 'Ribbe')" },
          description: { type: "string", description: "Optional description" },
          price: { type: "number", description: "Price in øre (e.g. 32000 = 320 NOK)" },
          category: { type: "string", description: "Category: 'mains', 'starters', 'desserts', 'drinks'" },
          venueId: { type: "string", description: "Optional venue this item belongs to" },
          availableForRoomService: { type: "boolean", description: "Whether this item can also be ordered to the room (default: true)" },
        },
        required: ["name", "price", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_menu_items_bulk",
      description: "Add multiple menu items at once. Each item has name, price (øre), category, and optional description.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                category: { type: "string" },
              },
              required: ["name", "price", "category"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_service",
      description: "Add a service (spa treatment, spa access, transfer, activity, etc.). Price in øre.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          durationMin: { type: "number", description: "Duration in minutes" },
          price: { type: "number", description: "Price in øre (e.g. 89000 = 890 NOK)" },
          category: {
            type: "string",
            enum: ["spa_treatment", "spa_access", "transfer", "activity", "general"],
            description: "What kind of service this is. Use 'spa_treatment' for massages/facials/etc, 'spa_access' for things like sauna/pool day passes, 'transfer' for airport/taxi, 'activity' for tours/excursions, 'general' for anything else.",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_knowledge",
      description: "Add a knowledge base entry (amenities, policies, local area, or general info).",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["amenities", "policies", "local_area", "general"],
          },
          content: { type: "string", description: "The knowledge text" },
        },
        required: ["category", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_menu_item",
      description: "Delete a menu item by ID.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_service",
      description: "Delete a service by ID.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_knowledge",
      description: "Delete a knowledge entry by ID.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_hotel_info",
      description: "Update the hotel's basic info (name, address, phone, email, website, timezone).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          website: { type: "string" },
          timezone: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_facility_details",
      description: "Set structured details for the simpler facilities: spa hours/notes, pool hours/notes, gym hours/notes, bar hours/notes, conference notes, pet policy, transfer notes. These are short text fields shown on the Facilities tab and used by the guest concierge to answer questions like 'what time does the gym open?'.",
      parameters: {
        type: "object",
        properties: {
          spaHours: { type: "string" },
          spaNotes: { type: "string" },
          poolHours: { type: "string" },
          poolNotes: { type: "string" },
          gymHours: { type: "string" },
          gymNotes: { type: "string" },
          barHours: { type: "string" },
          barNotes: { type: "string" },
          conferenceNotes: { type: "string" },
          petPolicy: { type: "string" },
          transferNotes: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_facility_flags",
      description: "Toggle which facilities the hotel has. Useful when the user mentions 'we also have a pool' that wasn't ticked during onboarding.",
      parameters: {
        type: "object",
        properties: {
          hasRestaurant: { type: "boolean" },
          hasRoomService: { type: "boolean" },
          hasSpa: { type: "boolean" },
          hasPool: { type: "boolean" },
          hasGym: { type: "boolean" },
          hasBar: { type: "boolean" },
          hasConference: { type: "boolean" },
          hasTransfers: { type: "boolean" },
          petFriendly: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the web for information about the hotel. Use when the user gives a hotel name and you want to find their site, menu, hours, etc. Returns a list of {title, url, snippet}.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query, e.g. 'Grand Oslo Hotel restaurant menu hours'" },
          maxResults: { type: "number", description: "Max results (default 8, max 10)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_fetch",
      description:
        "Fetch a web page and return its readable text + a list of useful internal links. Use this after web_search or when the user gives you a URL directly. Returns truncated to ~12k chars.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Full http(s) URL" },
        },
        required: ["url"],
      },
    },
  },
];

// ── Tool execution ────────────────────────────────────

async function executeTool(name: string, args: any, hotelId: string): Promise<any> {
  switch (name) {
    case "get_hotel_state": {
      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        include: {
          menuItems: { orderBy: { category: "asc" } },
          services: true,
          knowledgeEntries: true,
          venues: { include: { _count: { select: { menuItems: true } } } },
        },
      });
      if (!hotel) return { error: "Hotel not found" };
      const { smtpPass: _smtpPass, smtpUser: _smtpUser, ...rest } = hotel as any;
      return rest;
    }

    case "add_menu_item": {
      const item = await prisma.menuItem.create({
        data: {
          hotelId,
          venueId: args.venueId || null,
          name: args.name,
          description: args.description || null,
          price: Math.round(args.price),
          category: args.category,
          availableForRoomService:
            typeof args.availableForRoomService === "boolean" ? args.availableForRoomService : true,
        },
      });
      return { added: true, item };
    }

    case "list_venues": {
      const venues = await prisma.venue.findMany({
        where: { hotelId, active: true },
        include: { _count: { select: { menuItems: true } } },
        orderBy: { createdAt: "asc" },
      });
      return { venues };
    }

    case "add_venue": {
      const validKinds = ["restaurant", "bar", "lounge", "room_service", "cafe"];
      const venue = await prisma.venue.create({
        data: {
          hotelId,
          name: args.name,
          kind: validKinds.includes(args.kind) ? args.kind : "restaurant",
          description: args.description || null,
          hours: args.hours || null,
          location: args.location || null,
        },
      });
      return { added: true, venue };
    }

    case "update_venue": {
      const venue = await prisma.venue.findUnique({ where: { id: args.venueId } });
      if (!venue || venue.hotelId !== hotelId) return { error: "Venue not found" };
      const allowed = ["name", "kind", "description", "hours", "location", "active"];
      const updates: Record<string, any> = {};
      for (const k of allowed) if (k in args) updates[k] = args[k];
      if (Object.keys(updates).length === 0) return { error: "No updates" };
      const updated = await prisma.venue.update({ where: { id: args.venueId }, data: updates });
      return { updated: true, venue: updated };
    }

    case "update_facility_details": {
      const allowed = [
        "spaHours", "spaNotes", "poolHours", "poolNotes",
        "gymHours", "gymNotes", "barHours", "barNotes",
        "conferenceNotes", "petPolicy", "transferNotes",
      ];
      const updates: Record<string, any> = {};
      for (const k of allowed) if (k in args) updates[k] = args[k];
      if (Object.keys(updates).length === 0) return { error: "No updates" };
      const hotel = await prisma.hotel.update({ where: { id: hotelId }, data: updates });
      const { smtpPass: _smtpPass, smtpUser: _smtpUser, ...rest } = hotel as any;
      return { updated: true, hotel: rest };
    }

    case "set_facility_flags": {
      const allowed = [
        "hasRestaurant", "hasRoomService", "hasSpa", "hasPool", "hasGym",
        "hasBar", "hasConference", "hasTransfers", "petFriendly",
      ];
      const updates: Record<string, any> = {};
      for (const k of allowed) if (k in args) updates[k] = args[k];
      if (Object.keys(updates).length === 0) return { error: "No updates" };
      const hotel = await prisma.hotel.update({ where: { id: hotelId }, data: updates });
      const { smtpPass: _smtpPass, smtpUser: _smtpUser, ...rest } = hotel as any;
      return { updated: true, hotel: rest };
    }

    case "web_search": {
      try {
        const results = await webSearch(args.query, Math.min(args.maxResults || 8, 10));
        return { results };
      } catch (err: any) {
        return { error: err?.message || "Web search failed" };
      }
    }

    case "web_fetch": {
      try {
        const result = await webFetch(args.url);
        return result;
      } catch (err: any) {
        return { error: err?.message || "Web fetch failed" };
      }
    }

    case "add_menu_items_bulk": {
      if (!Array.isArray(args.items) || args.items.length === 0) {
        return { error: "items array required" };
      }
      const created = await prisma.$transaction(
        args.items.map((it: any) =>
          prisma.menuItem.create({
            data: {
              hotelId,
              name: it.name,
              description: it.description || null,
              price: Math.round(it.price),
              category: it.category,
            },
          })
        )
      );
      return { added: created.length, items: created };
    }

    case "add_service": {
      const validCategories = ["spa_treatment", "spa_access", "transfer", "activity", "general"];
      const service = await prisma.service.create({
        data: {
          hotelId,
          name: args.name,
          description: args.description || null,
          durationMin: typeof args.durationMin === "number" ? Math.round(args.durationMin) : null,
          price: typeof args.price === "number" ? Math.round(args.price) : null,
          category: validCategories.includes(args.category) ? args.category : "general",
        },
      });
      return { added: true, service };
    }

    case "add_knowledge": {
      const validCategories = ["amenities", "policies", "local_area", "general"];
      if (!validCategories.includes(args.category)) {
        return { error: `category must be one of: ${validCategories.join(", ")}` };
      }
      const entry = await prisma.knowledgeEntry.create({
        data: { hotelId, category: args.category, content: args.content },
      });
      return { added: true, entry };
    }

    case "delete_menu_item": {
      const item = await prisma.menuItem.findUnique({ where: { id: args.id } });
      if (!item || item.hotelId !== hotelId) return { error: "Not found" };
      await prisma.menuItem.delete({ where: { id: args.id } });
      return { deleted: true };
    }

    case "delete_service": {
      const service = await prisma.service.findUnique({ where: { id: args.id } });
      if (!service || service.hotelId !== hotelId) return { error: "Not found" };
      await prisma.service.delete({ where: { id: args.id } });
      return { deleted: true };
    }

    case "delete_knowledge": {
      const entry = await prisma.knowledgeEntry.findUnique({ where: { id: args.id } });
      if (!entry || entry.hotelId !== hotelId) return { error: "Not found" };
      await prisma.knowledgeEntry.delete({ where: { id: args.id } });
      return { deleted: true };
    }

    case "update_hotel_info": {
      const allowed = ["name", "address", "phone", "email", "website", "timezone"];
      const updates: Record<string, any> = {};
      for (const k of allowed) if (k in args) updates[k] = args[k];
      if (Object.keys(updates).length === 0) return { error: "No updates" };
      const hotel = await prisma.hotel.update({ where: { id: hotelId }, data: updates });
      const { smtpPass: _smtpPass, smtpUser: _smtpUser, ...rest } = hotel as any;
      return { updated: true, hotel: rest };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Main chat function ────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatResponse {
  reply: string;
  toolCalls: { name: string; args: any; result: any }[];
}

export async function managerChat(
  hotelId: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<ChatResponse> {
  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) throw new Error("Hotel not found");

  const messages: any[] = [
    { role: "system", content: systemPrompt(hotel.name, hotel.website) },
    ...history,
  ];

  const toolCallsLog: { name: string; args: any; result: any }[] = [];
  const MAX_ITERATIONS = 20; // generous — web research can chain many fetches
  const SOFT_BUDGET_MS = 90_000; // 90s wall-clock budget per turn
  const startedAt = Date.now();

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (Date.now() - startedAt > SOFT_BUDGET_MS) {
      // Soft-stop: ask the model to wrap up rather than just dying
      messages.push({
        role: "system",
        content:
          "You're approaching the time budget for this turn. Stop calling tools and write a concise summary of what you accomplished and what to do next. Do not call any more tools.",
      });
      const wrap = await client.chat.completions.create({ model: MODEL, messages, tool_choice: "none" });
      const wrapMsg = wrap.choices[0]?.message?.content || "I had to stop early to keep things responsive. Want me to continue from where I left off?";
      return { reply: wrapMsg.trim(), toolCalls: toolCallsLog };
    }
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
    });

    const message = completion.choices[0]?.message;
    if (!message) break;

    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      // Final reply
      return {
        reply: (message.content || "").trim(),
        toolCalls: toolCallsLog,
      };
    }

    // Execute tool calls
    for (const tc of message.tool_calls) {
      const fn = (tc as any).function;
      if (!fn) continue;
      let args: any = {};
      try {
        args = fn.arguments ? JSON.parse(fn.arguments) : {};
      } catch {
        args = {};
      }
      const result = await executeTool(fn.name, args, hotelId);
      toolCallsLog.push({ name: fn.name, args, result });

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  // Hit MAX_ITERATIONS without a final reply. Force a wrap-up summary so the
  // user isn't left with a generic 'stuck' message. Pass the tool log to the
  // model so it can describe what it accomplished.
  try {
    messages.push({
      role: "system",
      content:
        "You've reached the maximum number of tool calls for this turn. Stop calling tools. Briefly summarize what you accomplished and what's left, and ask the user if they want you to continue. Do not call any more tools.",
    });
    const wrap = await client.chat.completions.create({ model: MODEL, messages, tool_choice: "none" });
    const wrapMsg = wrap.choices[0]?.message?.content;
    if (wrapMsg && wrapMsg.trim()) {
      return { reply: wrapMsg.trim(), toolCalls: toolCallsLog };
    }
  } catch (e) {
    // fall through
  }

  // Last-resort fallback with a friendlier message
  const summary = summarizeToolLog(toolCallsLog);
  return {
    reply: `I got partway through that and ran out of steps. Here's what I did:\n\n${summary}\n\nWant me to continue?`,
    toolCalls: toolCallsLog,
  };
}

function summarizeToolLog(log: { name: string; args: any; result: any }[]): string {
  if (log.length === 0) return "_(no actions completed)_";
  const counts: Record<string, number> = {};
  for (const t of log) counts[t.name] = (counts[t.name] || 0) + 1;
  return Object.entries(counts)
    .map(([n, c]) => `- ${c} × \`${n}\``)
    .join("\n");
}
