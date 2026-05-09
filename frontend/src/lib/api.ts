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
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMin: number | null;
  price: number | null;
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

export async function updateHotel(id: string, hotel: Partial<Hotel>) {
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
  telegramBot: { username: string; deepLink: string } | null;
  updatedAt: string | null;
}

export async function provisionHotel(hotelId: string) {
  const { data } = await api.post(`/hotels/${hotelId}/provision`);
  return data as { provisioned: boolean; agentId: string; workspacePath: string; telegramDeepLink: string };
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
