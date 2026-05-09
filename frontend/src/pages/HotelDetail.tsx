import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getHotel, updateHotel, createKnowledge, createMenuItem, provisionHotel, deprovisionHotel, getProvisionStatus, type Hotel, type MenuItem, type KnowledgeEntry, type Service, type ProvisionStatus } from '../lib/api';
import { ArrowLeft, Save, Plus, Utensils, BookOpen, ConciergeBell, Bot, Rocket, Trash2, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'knowledge' | 'menu' | 'services' | 'bots'>('info');

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [hotelEmail, setHotelEmail] = useState('');

  // New knowledge
  const [newKnowledgeCat, setNewKnowledgeCat] = useState('general');
  const [newKnowledgeContent, setNewKnowledgeContent] = useState('');

  // New menu item
  const [newMenuItem, setNewMenuItem] = useState({ name: '', description: '', price: 0, category: 'mains' });

  useEffect(() => {
    if (!id) return;
    loadHotel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadHotel() {
    try {
      const res = await getHotel(id!);
      setHotel(res.hotel);
      setName(res.hotel.name);
      setAddress(res.hotel.address || '');
      setPhone(res.hotel.phone || '');
      setHotelEmail(res.hotel.email || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveInfo() {
    if (!id) return;
    setSaving(true);
    try {
      const res = await updateHotel(id, { name, address, phone, email: hotelEmail });
      setHotel(res.hotel);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddKnowledge() {
    if (!id || !newKnowledgeContent.trim()) return;
    await createKnowledge(id, newKnowledgeCat, newKnowledgeContent);
    setNewKnowledgeContent('');
    loadHotel();
  }

  async function handleAddMenuItem() {
    if (!id || !newMenuItem.name.trim()) return;
    await createMenuItem(id, {
      name: newMenuItem.name,
      description: newMenuItem.description || undefined,
      price: Math.round(newMenuItem.price * 100), // convert to cents
      category: newMenuItem.category,
    });
    setNewMenuItem({ name: '', description: '', price: 0, category: 'mains' });
    loadHotel();
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12 text-gray-400">Loading...</div>
      </Layout>
    );
  }

  if (!hotel) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-lg font-medium text-gray-600">Hotel not found</h2>
          <Link to="/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">Back to dashboard</Link>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { key: 'info', label: 'Info', icon: Save },
    { key: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { key: 'menu', label: 'Menu', icon: Utensils },
    { key: 'services', label: 'Services', icon: ConciergeBell },
    { key: 'bots', label: 'Bot Setup', icon: Bot },
  ] as const;

  return (
    <Layout>
      <div className="mb-6">
        <Link to="/dashboard" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Back to hotels
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{hotel.name}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input value={hotelEmail} onChange={(e) => setHotelEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <button
            onClick={handleSaveInfo}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Tab: Knowledge */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Add Knowledge</h3>
            <div className="flex gap-3">
              <select
                value={newKnowledgeCat}
                onChange={(e) => setNewKnowledgeCat(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="amenities">Amenities</option>
                <option value="policies">Policies</option>
                <option value="local_area">Local Area</option>
                <option value="general">General</option>
              </select>
              <input
                value={newKnowledgeContent}
                onChange={(e) => setNewKnowledgeContent(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg"
                placeholder="What should the AI concierge know?"
              />
              <button
                onClick={handleAddKnowledge}
                className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {hotel.knowledgeEntries?.map((entry: KnowledgeEntry) => (
              <div key={entry.id} className="bg-white rounded-xl border p-4">
                <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">{entry.category}</span>
                <p className="text-sm text-gray-700 mt-2">{entry.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Menu */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Add Menu Item</h3>
            <div className="grid grid-cols-4 gap-3">
              <input
                value={newMenuItem.name}
                onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                className="px-3 py-2 border rounded-lg"
                placeholder="Item name"
              />
              <input
                value={newMenuItem.description}
                onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                className="px-3 py-2 border rounded-lg"
                placeholder="Description"
              />
              <input
                type="number"
                value={newMenuItem.price || ''}
                onChange={(e) => setNewMenuItem({ ...newMenuItem, price: Number(e.target.value) })}
                className="px-3 py-2 border rounded-lg"
                placeholder="Price (NOK)"
                step="0.01"
              />
              <select
                value={newMenuItem.category}
                onChange={(e) => setNewMenuItem({ ...newMenuItem, category: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="starters">Starters</option>
                <option value="mains">Mains</option>
                <option value="desserts">Desserts</option>
                <option value="drinks">Drinks</option>
              </select>
            </div>
            <button
              onClick={handleAddMenuItem}
              className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div className="space-y-2">
            {hotel.menuItems?.map((item: MenuItem) => (
              <div key={item.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">{item.category}</span>
                  <span className="ml-2 font-medium text-gray-900">{item.name}</span>
                  {item.description && <span className="text-sm text-gray-500 ml-2">— {item.description}</span>}
                </div>
                <span className="font-semibold text-gray-900">{(item.price / 100).toFixed(2)} NOK</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Services */}
      {activeTab === 'services' && (
        <div className="space-y-3">
          {hotel.services?.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No services configured yet.</p>
          ) : (
            hotel.services?.map((service: Service) => (
              <div key={service.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{service.name}</p>
                  {service.description && <p className="text-sm text-gray-500">{service.description}</p>}
                </div>
                <div className="text-right">
                  {service.price && <p className="font-semibold">{(service.price / 100).toFixed(2)} NOK</p>}
                  {service.durationMin && <p className="text-xs text-gray-400">{service.durationMin} min</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Bot Setup */}
      {activeTab === 'bots' && <BotSetupTab hotel={hotel} />}
    </Layout>
  );
}

// ── Bot Setup Tab Component ────────────────────────────

function BotSetupTab({ hotel }: { hotel: Hotel }) {
  const [status, setStatus] = useState<ProvisionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.id]);

  async function loadStatus() {
    try {
      const res = await getProvisionStatus(hotel.id);
      setStatus(res.status);
    } catch {
      // Quiet fail — status endpoint may 404 before provisioning
    }
  }

  async function handleProvision() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await provisionHotel(hotel.id);
      setStatus({
        provisioned: true,
        workspaceExists: true,
        agentId: res.agentId,
        workspacePath: res.workspacePath,
        telegramBot: { username: 'HotelConciergeBot', deepLink: res.telegramDeepLink },
        updatedAt: new Date().toISOString(),
      });
      setSuccess('✅ Concierge agent provisioned successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Provisioning failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeprovision() {
    if (!window.confirm('Remove the concierge agent for this hotel? This cannot be undone.')) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deprovisionHotel(hotel.id);
      setStatus(null);
      setSuccess('🗑️ Concierge agent deprovisioned.');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Deprovisioning failed');
    } finally {
      setLoading(false);
    }
  }

  async function copyDeepLink() {
    if (!status?.telegramBot?.deepLink) return;
    try {
      await navigator.clipboard.writeText(status.telegramBot.deepLink);
      setSuccess('📋 Deep link copied!');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  }

  return (
    <div className="space-y-6">
      {/* Status & Actions */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Bot size={20} />
          Concierge Agent
        </h3>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="flex items-center gap-2">
          {status?.provisioned ? (
            <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
              <CheckCircle size={16} /> Provisioned
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-gray-400">
              <XCircle size={16} /> Not provisioned
            </span>
          )}
        </div>

        <div className="flex gap-3">
          {!status?.provisioned ? (
            <button
              onClick={handleProvision}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <Rocket size={16} />}
              {loading ? 'Provisioning...' : 'Provision Agent'}
            </button>
          ) : (
            <button
              onClick={handleDeprovision}
              disabled={loading}
              className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 disabled:opacity-50 text-sm font-medium"
            >
              <Trash2 size={16} />
              Deprovision
            </button>
          )}
        </div>
      </div>

      {/* Agent Details */}
      {status?.provisioned && (
        <>
          <div className="bg-white rounded-xl border p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">Agent Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Agent ID:</span>
                <code className="ml-2 bg-gray-100 px-2 py-0.5 rounded text-xs">
                  {status.agentId}
                </code>
              </div>
              <div>
                <span className="text-gray-500">Workspace:</span>
                <code className="ml-2 bg-gray-100 px-2 py-0.5 rounded text-xs">
                  {status.workspacePath}
                </code>
              </div>
            </div>
          </div>

          {/* Guest Link */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Guest Onboarding Link</h3>
            <p className="text-sm text-gray-500">
              Include this link in the welcome email to guests. Tapping it opens Telegram
              and starts the conversation with the concierge agent.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={status.telegramBot?.deepLink || ''}
                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 font-mono text-gray-600"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={copyDeepLink}
                className="px-4 py-2 bg-gray-100 border rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Email Template */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Welcome Email Template</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 font-mono whitespace-pre-wrap">
{`Subject: Welcome to ${hotel.name} — Your Personal Concierge

Dear Guest,

Welcome to ${hotel.name}! We're delighted to have you.

Your personal concierge is ready to help. Simply tap the link below to start chatting on Telegram:

${status.telegramBot?.deepLink || 'https://t.me/HotelConciergeBot'}

Need a dinner reservation? Room service? Local recommendations? Just ask.

We hope you have a wonderful stay!

— The ${hotel.name} Team`}
            </div>
            <button
              onClick={() => {
                const text = document.querySelector('.bg-gray-50.rounded-lg')?.textContent;
                if (text) navigator.clipboard.writeText(text);
              }}
              className="flex items-center gap-1 px-4 py-2 bg-gray-100 border rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Copy Template
            </button>
          </div>
        </>
      )}
    </div>
  );
}
