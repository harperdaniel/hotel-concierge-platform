import { prisma } from "../config/database";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ── Config ────────────────────────────────────────────

const AGENTS_WORKSPACE_ROOT = path.resolve(
  process.env.CONCIERGE_WORKSPACE || path.join(os.homedir(), ".openclaw", "hotel-agents")
);

const CONCIERGE_GATEWAY_HOST = process.env.CONCIERGE_GATEWAY_HOST || "localhost";
const CONCIERGE_GATEWAY_PORT = parseInt(process.env.CONCIERGE_GATEWAY_PORT || "18790", 10);
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// ── Hotel Agent ID generated ──────────────────────────

function hotelAgentId(hotelId: string): string {
  return `hotel-${hotelId}`;
}

// ── Workspace path for a hotel agent ──────────────────

function hotelWorkspacePath(hotelId: string): string {
  return path.join(AGENTS_WORKSPACE_ROOT, hotelId);
}

// ── Generate SOUL.md for a hotel's concierge agent ────

function generateSOUL(hotelName: string): string {
  return `# SOUL.md — ${hotelName} Concierge

You are the AI concierge for **${hotelName}**. You assist hotel guests with their needs through natural conversation on Telegram.

## Your Role

- You are warm, professional, and helpful — like a real hotel concierge
- You book restaurant tables, handle room service orders, and answer questions about the hotel and local area
- You make guests feel welcomed and cared for

## How You Work

1. **Guest identification** — When a guest starts a conversation, use the hotel API to confirm context
2. **Knowledge queries** — Fetch hotel-specific data (policies, amenities, local area) from the backend API
3. **Menu & services** — Present room service menus and hotel services from the API
4. **Bookings** — Create table reservations and room service orders via the backend API

## API Endpoints (for your use)

All API calls go to: ${BACKEND_URL}

### Get hotel data for guests
\`\`\`
GET /api/guest/hotels/{hotelId}/data
\`\`\`
Returns: hotel info, knowledge entries, menu items, services

### Create a booking
\`\`\`
POST /api/guest/bookings
{
  "hotelId": "the-hotel-id",
  "type": "table" | "room_service",
  "guestName": "Guest Name",
  "guestRoom": "412" (optional),
  "details": "Table for 2 at 8 PM, window view"
}
\`\`\`

### Identify guest start context
\`\`\`
POST /api/guest/identify
{
  "startParam": "hotel-{hotelId}"
}
\`\`\`
Returns: hotelId, hotelName

## Core Services You Offer

- **Restaurant bookings** — Take table reservations for the hotel restaurant. Ask: number of guests, time, date, any preferences
- **Room service orders** — Take food and drink orders to be delivered to the guest's room. Present the menu, take order, confirm
- **Hotel information** — Answer questions about amenities, check-in/out times, pool hours, WiFi, parking, etc.
- **Local area** — Restaurant recommendations, attractions, directions, activities
- **Other services** — Spa bookings, airport transfers, wake-up calls, etc.

## Conversation Style

- Warm but efficient — don't waste the guest's time
- Confirm orders/reservations clearly before submitting
- Ask for missing information naturally
- If unsure about something, say so honestly rather than making things up
- End conversations with a friendly sign-off
`;
}

// ── Generate IDENTITY.md ──────────────────────────────

function generateIdentity(hotelName: string): string {
  return `# IDENTITY.md — ${hotelName} Concierge

- **Name:** ${hotelName} Concierge
- **Role:** AI Hotel Concierge
- **Emoji:** 🏨
- **Vibe:** Warm, professional, efficient
- **Channel:** Telegram
`;
}

// ── Generate HEARTBEAT.md (minimal, no proactive checks needed) ──

function generateHeartbeat(): string {
  return `# HEARTBEAT.md

This agent does not perform proactive checks. It responds to guest messages only.

HEARTBEAT_OK
`;
}

// ── Provision a hotel agent workspace ─────────────────

export async function provisionHotel(hotelId: string): Promise<{
  agentId: string;
  workspacePath: string;
  telegramDeepLink: string;
}> {
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    include: {
      knowledgeEntries: true,
      menuItems: { where: { available: true } },
      services: true,
    },
  });

  if (!hotel) {
    throw new Error(`Hotel ${hotelId} not found`);
  }

  const agentId = hotelAgentId(hotelId);
  const wsPath = hotelWorkspacePath(hotelId);

  // Create workspace directory
  fs.mkdirSync(wsPath, { recursive: true });

  // Write SOUL.md
  fs.writeFileSync(path.join(wsPath, "SOUL.md"), generateSOUL(hotel.name));

  // Write IDENTITY.md
  fs.writeFileSync(path.join(wsPath, "IDENTITY.md"), generateIdentity(hotel.name));

  // Write HEARTBEAT.md
  fs.writeFileSync(path.join(wsPath, "HEARTBEAT.md"), generateHeartbeat());

  // Generate AGENTS.md (minimal)
  fs.writeFileSync(
    path.join(wsPath, "AGENTS.md"),
    `# AGENTS.md — ${hotel.name} Concierge\n\nThis workspace is provisioned automatically by the Hotel Concierge platform.\nData source: Backend API at ${BACKEND_URL}\n`
  );

  // Generate HOTEL_DATA.md for quick reference
  const menuText = hotel.menuItems
    .map((item: { name: string; price: number; description: string | null }) => `- **${item.name}** — ${(item.price / 100).toFixed(2)} NOK${item.description ? ` (${item.description})` : ""}`)
    .join("\n");

  const knowledgeText = hotel.knowledgeEntries
    .map((entry: { category: string; content: string }) => `### ${entry.category}\n${entry.content}`)
    .join("\n\n");

  const servicesText = hotel.services
    .map((s: { name: string; price: number | null; description: string | null }) => `- **${s.name}**${s.price ? ` — ${(s.price / 100).toFixed(2)} NOK` : ""}${s.description ? `: ${s.description}` : ""}`)
    .join("\n");

  fs.writeFileSync(
    path.join(wsPath, "HOTEL_DATA.md"),
    `# ${hotel.name}\n\n${hotel.address ? `**Address:** ${hotel.address}\n` : ""}${hotel.phone ? `**Phone:** ${hotel.phone}\n` : ""}${hotel.email ? `**Email:** ${hotel.email}\n` : ""}\n\n## Room Service Menu\n\n${menuText || "*(No menu items configured yet)*"}\n\n## Knowledge Base\n\n${knowledgeText || "*(No knowledge entries yet)*"}\n\n## Services\n\n${servicesText || "*(No services configured yet)*"}`
  );

  // Generate Telegram deep link
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "HotelConciergeBot";
  const b64HotelId = Buffer.from(hotelId).toString("base64url");
  const deepLink = `https://t.me/${botUsername}?start=hotel-${b64HotelId}`;

  // Update database — upsert into openclaw_config
  await prisma.openClawConfig.upsert({
    where: { hotelId },
    create: {
      hotelId,
      agentId,
      workspacePath: wsPath,
      active: true,
    },
    update: {
      agentId,
      workspacePath: wsPath,
      active: true,
    },
  });

  // Update database — upsert into telegram_bot (provisioning info)
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";

  await prisma.telegramBot.upsert({
    where: { hotelId },
    create: {
      hotelId,
      botToken,
      botUsername,
      webhookUrl: deepLink,
      active: true,
    },
    update: {
      botUsername,
      webhookUrl: deepLink,
      active: true,
    },
  });

  console.log(`✅ Provisioned agent for hotel "${hotel.name}" (${agentId})`);
  console.log(`   Workspace: ${wsPath}`);
  console.log(`   Deep link: ${deepLink}`);

  return {
    agentId,
    workspacePath: wsPath,
    telegramDeepLink: deepLink,
  };
}

// ── Deprovision a hotel agent ─────────────────────────

export async function deprovisionHotel(hotelId: string): Promise<void> {
  const wsPath = hotelWorkspacePath(hotelId);

  // Remove workspace directory
  if (fs.existsSync(wsPath)) {
    fs.rmSync(wsPath, { recursive: true, force: true });
  }

  // Update database
  await prisma.openClawConfig.update({
    where: { hotelId },
    data: { active: false },
  });

  await prisma.telegramBot.update({
    where: { hotelId },
    data: { active: false },
  });

  console.log(`🗑️ Deprovisioned agent for hotel ${hotelId}`);
}

// ── Check provisioning status ─────────────────────────

export async function getProvisioningStatus(hotelId: string) {
  const config = await prisma.openClawConfig.findUnique({ where: { hotelId } });
  const bot = await prisma.telegramBot.findUnique({ where: { hotelId } });

  const wsPath = hotelWorkspacePath(hotelId);
  const workspaceExists = fs.existsSync(wsPath);

  return {
    provisioned: config?.active === true,
    workspaceExists,
    agentId: config?.agentId ?? null,
    workspacePath: config?.workspacePath ?? null,
    telegramBot: bot?.active === true ? {
      username: bot.botUsername,
      deepLink: bot.webhookUrl,
    } : null,
    updatedAt: config?.updatedAt ?? null,
  };
}
