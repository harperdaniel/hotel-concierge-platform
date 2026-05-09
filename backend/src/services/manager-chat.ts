import OpenAI from "openai";
import { prisma } from "../config/database";

// ── Model config ──────────────────────────────────────

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://api.deepseek.com",
});

const MODEL = process.env.MANAGER_MODEL || "deepseek-chat";

// ── System prompt (mirrors the Telegram SOUL.md) ──────

function systemPrompt(hotelName: string): string {
  return `You are an AI assistant helping staff at "${hotelName}" configure their hotel concierge.
You are NEVER speaking with a guest. You are ALWAYS speaking with hotel staff.

# Your job

Help staff add or update:
- Menu items (room service / restaurant)
- Services (spa, transfers, etc.)
- Knowledge (amenities, policies, local area, general info)

You have tools to call the backend. Always confirm intent before mutating data, especially in bulk.
When the user mentions prices in NOK, convert to integer øre (NOK × 100) for the API.

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
      name: "add_menu_item",
      description: "Add a single menu item to the hotel. Price is in øre (NOK × 100).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Item name (e.g. 'Ribbe')" },
          description: { type: "string", description: "Optional description" },
          price: { type: "number", description: "Price in øre (e.g. 32000 = 320 NOK)" },
          category: { type: "string", description: "Category: 'mains', 'starters', 'desserts', 'drinks'" },
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
      description: "Add a service (spa, transfer, etc.). Price in øre.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          durationMin: { type: "number", description: "Duration in minutes" },
          price: { type: "number", description: "Price in øre (e.g. 89000 = 890 NOK)" },
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
          name: args.name,
          description: args.description || null,
          price: Math.round(args.price),
          category: args.category,
        },
      });
      return { added: true, item };
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
      const service = await prisma.service.create({
        data: {
          hotelId,
          name: args.name,
          description: args.description || null,
          durationMin: typeof args.durationMin === "number" ? Math.round(args.durationMin) : null,
          price: typeof args.price === "number" ? Math.round(args.price) : null,
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
    { role: "system", content: systemPrompt(hotel.name) },
    ...history,
  ];

  const toolCallsLog: { name: string; args: any; result: any }[] = [];
  const MAX_ITERATIONS = 6; // safety against tool-call loops

  for (let i = 0; i < MAX_ITERATIONS; i++) {
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

  return {
    reply: "I got stuck in a loop while working on that — please try rephrasing or breaking it into smaller steps.",
    toolCalls: toolCallsLog,
  };
}
