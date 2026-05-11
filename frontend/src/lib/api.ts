import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Type definitions ─────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export type IntegrationKind =
  | 'manual_queue'
  | 'custom_webhook'
  | 'email'
  | 'opentable'
  | 'google_calendar';

export interface Integration {
  id: string;
  hotelId: string;
  name: string;
  kind: IntegrationKind;
  endpoint: string | null;
  status: 'untested' | 'ok' | 'error';
  lastTestedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  // Server returns a non-secret summary of which auth fields are set,
  // never the secrets themselves.
  authSummary?: Record<string, boolean>;
  _count?: { venues: number; services: number; hotelsAsRoomService: number };
}

export interface Venue {
  id: string;
  name: string;
  kind: 'restaurant' | 'bar' | 'lounge' | 'room_service' | 'cafe' | string;
  description: string | null;
  hours: string | null;
  location: string | null;
  active: boolean;
  // Bookability is derived from integrationId. The expanded `integration`
  // is present when the API includes it (e.g. GET /api/guest/hotels/.../data
  // or the venue list endpoint).
  integrationId?: string | null;
  integration?: Integration | null;
  bookingInstructions?: string | null;
  createdAt?: string;
  updatedAt?: string;
  hotelId?: string;
  _count?: { menuItems: number };
  menuItems?: MenuItem[];
}

export interface Hotel {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  timezone: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  // SMTP
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpFromName?: string | null;
  smtpFromEmail?: string | null;
  // The human name the guest concierge uses (default 'Alfred Pennyworth')
  conciergeName?: string;
  // Room service — bookability derived from the linked integration.
  roomServiceIntegrationId?: string | null;
  roomServiceIntegration?: Integration | null;
  roomServiceBookingNotes?: string | null;
  integrations?: Integration[];
  // Facility flags
  hasRestaurant?: boolean;
  hasRoomService?: boolean;
  hasSpa?: boolean;
  hasPool?: boolean;
  hasGym?: boolean;
  hasBar?: boolean;
  hasConference?: boolean;
  hasTransfers?: boolean;
  petFriendly?: boolean;
  // Facility details
  spaHours?: string | null;
  spaNotes?: string | null;
  poolHours?: string | null;
  poolNotes?: string | null;
  gymHours?: string | null;
  gymNotes?: string | null;
  barHours?: string | null;
  barNotes?: string | null;
  conferenceNotes?: string | null;
  petPolicy?: string | null;
  transferNotes?: string | null;
  // Relations
  venues?: Venue[];
  _count?: { menuItems: number; services: number; knowledgeEntries: number; bookings: number };
  knowledgeEntries?: KnowledgeEntry[];
  menuItems?: MenuItem[];
  services?: Service[];
  telegramBot?: TelegramBot | null;
  openclawConfig?: OpenClawConfig | null;
}

export interface KnowledgeEntry {
  id: string;
  category: string;
  content: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  available: boolean;
  availableForRoomService?: boolean;
  venueId?: string | null;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMin: number | null;
  price: number | null;
  category?: 'spa_treatment' | 'spa_access' | 'transfer' | 'activity' | 'general' | string;
  // Bookability is derived from integrationId.
  integrationId?: string | null;
  integration?: Integration | null;
  bookingInstructions?: string | null;
}

export interface Booking {
  id: string;
  type: 'table' | 'room_service';
  guestName: string;
  guestRoom: string | null;
  details: string;
  status: string;
  createdAt: string;
}

export interface TelegramBot {
  id: string;
  botToken: string;
  botUsername: string;
  webhookUrl: string | null;
  active: boolean;
}

export interface OpenClawConfig {
  id: string;
  agentId: string;
  workspacePath: string;
  active: boolean;
}

// ── Auth API ────────────────────────────────────────

export async function signup(email: string, password: string, name: string) {
  const { data } = await api.post('/auth/signup', { email, password, name });
  return data as { token: string; user: User };
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  return data as { token: string; user: User };
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data as { user: User };
}

// ── Hotels API ──────────────────────────────────────

export async function listHotels() {
  const { data } = await api.get('/hotels');
  return data as { hotels: Hotel[] };
}

export async function getHotel(id: string) {
  const { data } = await api.get(`/hotels/${id}`);
  return data as { hotel: Hotel };
}

export async function createHotel(hotel: Partial<Hotel>) {
  const { data } = await api.post('/hotels', hotel);
  return data as { hotel: Hotel };
}

export async function updateHotel(id: string, hotel: Partial<Hotel> & { smtpPass?: string }) {
  const { data } = await api.put(`/hotels/${id}`, hotel);
  return data as { hotel: Hotel };
}

export async function createKnowledge(hotelId: string, category: string, content: string) {
  const { data } = await api.post(`/hotels/${hotelId}/knowledge`, { category, content });
  return data as { entry: KnowledgeEntry };
}

export async function createMenuItem(hotelId: string, item: Partial<MenuItem>) {
  const { data } = await api.post(`/hotels/${hotelId}/menu`, item);
  return data as { item: MenuItem };
}

export async function createService(hotelId: string, service: Partial<Service>) {
  const { data } = await api.post(`/hotels/${hotelId}/services`, service);
  return data as { service: Service };
}

export async function updateService(serviceId: string, payload: Partial<Service>) {
  const { data } = await api.patch(`/hotels/services/${serviceId}`, payload);
  return data as { service: Service };
}

export async function deleteServiceApi(serviceId: string) {
  const { data } = await api.delete(`/hotels/services/${serviceId}`);
  return data;
}

// ── Integrations ──────────────────────────────────────
export async function listIntegrations(hotelId: string) {
  const { data } = await api.get(`/hotels/${hotelId}/integrations`);
  return data as { integrations: Integration[] };
}

export async function createIntegration(
  hotelId: string,
  payload: { name: string; kind: IntegrationKind; endpoint?: string | null; auth?: Record<string, string> },
) {
  const { data } = await api.post(`/hotels/${hotelId}/integrations`, payload);
  return data as { integration: Integration };
}

export async function updateIntegration(
  integrationId: string,
  payload: { name?: string; kind?: IntegrationKind; endpoint?: string | null; auth?: Record<string, string> | null },
) {
  const { data } = await api.patch(`/integrations/${integrationId}`, payload);
  return data as { integration: Integration };
}

export async function deleteIntegration(integrationId: string) {
  const { data } = await api.delete(`/integrations/${integrationId}`);
  return data as { deleted: true; unlinked: { venues: number; services: number; roomService: number } };
}

export async function testIntegration(integrationId: string) {
  const { data } = await api.post(`/integrations/${integrationId}/test`);
  return data as { integration: Integration };
}

export async function listBookings(hotelId: string) {
  const { data } = await api.get(`/hotels/${hotelId}/bookings`);
  return data as { bookings: Booking[] };
}

export async function createBooking(hotelId: string, booking: Partial<Booking>) {
  const { data } = await api.post(`/hotels/${hotelId}/bookings`, booking);
  return data as { booking: Booking };
}

// ── Provisioning API ──────────────────────────────────

export interface ProvisionStatus {
  provisioned: boolean;
  workspaceExists: boolean;
  agentId: string | null;
  workspacePath: string | null;
  telegramBot: {
    username: string;
    deepLink: string;
    managerUsername?: string | null;
    managerDeepLink?: string | null;
  } | null;
  updatedAt: string | null;
}

export async function provisionHotel(hotelId: string) {
  const { data } = await api.post(`/hotels/${hotelId}/provision`);
  return data as {
    provisioned: boolean;
    agentId: string;
    workspacePath: string;
    telegramDeepLink: string;
    managerDeepLink: string | null;
  };
}

export async function deprovisionHotel(hotelId: string) {
  const { data } = await api.post(`/hotels/${hotelId}/deprovision`);
  return data as { deprovisioned: boolean };
}

export async function getProvisionStatus(hotelId: string) {
  const { data } = await api.get(`/hotels/${hotelId}/provision/status`);
  return data as { status: ProvisionStatus };
}

export async function sendTestWelcomeEmail(hotelId: string, to: string, guestName?: string) {
  const { data } = await api.post(`/hotels/${hotelId}/welcome-email/test`, { to, guestName });
  return data as { sent: boolean; to: string; messageId: string };
}

export async function getWelcomeEmailPreview(hotelId: string) {
  const { data } = await api.get(`/hotels/${hotelId}/welcome-email/preview`);
  return data as { subject: string; text: string; html: string };
}

export async function verifyHotelSmtp(hotelId: string) {
  const { data } = await api.post(`/hotels/${hotelId}/smtp/verify`);
  return data as { ok: boolean; usingDefault?: boolean; error?: string };
}

// ── Manager chat (web-based) ──────────────────────────────────────

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export async function managerChat(staffToken: string, messages: ChatMsg[]) {
  // Note: this endpoint requires X-Staff-Token, not the JWT. We add it explicitly.
  const { data } = await api.post(
    '/manager/chat',
    { messages },
    { headers: { 'X-Staff-Token': staffToken } },
  );
  return data as {
    reply: string;
    toolCalls: { name: string; args: any; result: any }[];
  };
}

export async function managerIdentify(startParam: string) {
  const { data } = await api.post('/manager/identify', { startParam });
  return data as { hotelId: string; hotelName: string; staffToken: string };
}

export async function getStaffToken(hotelId: string) {
  const { data } = await api.get(`/hotels/${hotelId}/staff-token`);
  return data as { staffToken: string };
}

// ── Venues ────────────────────────────────────────────────────

export async function listVenues(hotelId: string) {
  const { data } = await api.get(`/hotels/${hotelId}/venues`);
  return data as { venues: Venue[] };
}

export async function getVenue(venueId: string) {
  const { data } = await api.get(`/venues/${venueId}`);
  return data as { venue: Venue };
}

export async function createVenue(hotelId: string, payload: Partial<Venue>) {
  const { data } = await api.post(`/hotels/${hotelId}/venues`, payload);
  return data as { venue: Venue };
}

export async function updateVenue(venueId: string, payload: Partial<Venue>) {
  const { data } = await api.patch(`/venues/${venueId}`, payload);
  return data as { venue: Venue };
}

export async function deleteVenue(venueId: string) {
  const { data } = await api.delete(`/venues/${venueId}`);
  return data;
}

export async function addVenueMenuItem(venueId: string, item: Partial<MenuItem>) {
  const { data } = await api.post(`/venues/${venueId}/menu-items`, item);
  return data as { item: MenuItem };
}

export async function patchMenuItem(itemId: string, payload: Partial<MenuItem>) {
  const { data } = await api.patch(`/menu-items/${itemId}`, payload);
  return data as { item: MenuItem };
}

export async function removeMenuItem(itemId: string) {
  const { data } = await api.delete(`/menu-items/${itemId}`);
  return data;
}

// ── Wizard: import suggestions from a website ────────────────────

export interface ImportSuggestion {
  hotelName?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
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
  facilityDetails: Record<string, string | undefined>;
  venues: { name: string; kind: string; hours?: string; location?: string; description?: string }[];
  menuItems: { name: string; description?: string; priceNok?: number; category?: string; venueName?: string }[];
  services: { name: string; description?: string; durationMin?: number; priceNok?: number; category?: string }[];
  knowledge: { category: string; content: string }[];
  sourceUrls: string[];
  warnings: string[];
}

export async function websiteImport(payload: { url?: string; hotelName?: string; city?: string }) {
  const { data } = await api.post('/hotels/website-import', payload);
  return data as { suggestions: ImportSuggestion };
}

export async function guestDemoChat(hotelId: string, messages: ChatMsg[]) {
  const { data } = await api.post(`/hotels/${hotelId}/guest-demo-chat`, { messages });
  return data as { reply: string };
}

export async function applyImport(hotelId: string, payload: any) {
  const { data } = await api.post(`/hotels/${hotelId}/apply-import`, payload);
  return data as {
    venuesCreated: number;
    menuItemsCreated: number;
    servicesCreated: number;
    knowledgeCreated: number;
  };
}
