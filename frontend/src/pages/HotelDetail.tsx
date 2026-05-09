import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getHotel, updateHotel, createKnowledge, createMenuItem, provisionHotel, deprovisionHotel, getProvisionStatus, sendTestWelcomeEmail, getWelcomeEmailPreview, verifyHotelSmtp, getStaffToken, managerChat, type Hotel, type MenuItem, type KnowledgeEntry, type Service, type ProvisionStatus, type ChatMsg } from '../lib/api';
import { ArrowLeft, Save, Plus, Utensils, BookOpen, ConciergeBell, Bot, Rocket, Trash2, CheckCircle, XCircle, Loader, Send, Mail, Server, Sparkles, Mic, MicOff } from 'lucide-react';

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'knowledge' | 'menu' | 'services' | 'bots' | 'chat'>('info');

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
    { key: 'chat', label: 'AI Chat', icon: Sparkles },
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

      {/* Tabs (horizontal scroll on mobile) */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition shrink-0 ${
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
        <div className="bg-white rounded-xl border p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="bg-white rounded-xl border p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Add Knowledge</h3>
            <div className="flex flex-col sm:flex-row gap-3">
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
                className="flex items-center justify-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
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
          <div className="bg-white rounded-xl border p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Add Menu Item</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              <div key={item.id} className="bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">{item.category}</span>
                  <span className="ml-2 font-medium text-gray-900">{item.name}</span>
                  {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                </div>
                <span className="font-semibold text-gray-900 shrink-0">{(item.price / 100).toFixed(2)} NOK</span>
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
              <div key={service.id} className="bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{service.name}</p>
                  {service.description && <p className="text-sm text-gray-500">{service.description}</p>}
                </div>
                <div className="sm:text-right shrink-0">
                  {service.price && <p className="font-semibold">{(service.price / 100).toFixed(2)} NOK</p>}
                  {service.durationMin && <p className="text-xs text-gray-400">{service.durationMin} min</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: AI Chat */}
      {activeTab === 'chat' && <ManagerChatTab hotel={hotel} onDataChanged={loadHotel} />}

      {/* Tab: Bot Setup */}
      {activeTab === 'bots' && <BotSetupTab hotel={hotel} />}
    </Layout>
  );
}

// ── Manager Chat Tab ─────────────────────────────────────────

function ManagerChatTab({ hotel, onDataChanged }: { hotel: Hotel; onDataChanged: () => void }) {
  const [staffToken, setStaffToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: `Hi! I'm here to help you set up **${hotel.name}**. I can add menu items, services, knowledge entries, or update your hotel info — just tell me what you want to do.\n\nFor example, try:\n- "Add Ribbe, 320 kr, mains, with crispy crackling"\n- "Add a 60-minute spa massage for 890 kr"\n- "Add a policy: check-in is from 15:00"\n- "What's on my menu?"\n\n🎙️ Tap the mic button to speak instead of type — try Norwegian or English.` },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [toolNotices, setToolNotices] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<'nb-NO' | 'en-US'>(
    typeof navigator !== 'undefined' && /\bn[bo]/i.test(navigator.language || '') ? 'nb-NO' : 'en-US'
  );
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getStaffToken(hotel.id)
      .then((res) => setStaffToken(res.staffToken))
      .catch((err) => {
        const msg = err?.response?.data?.error || 'Could not get staff token. Provision the agent first.';
        setTokenError(msg);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolNotices]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !staffToken || sending) return;

    const next: ChatMsg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setSending(true);
    setToolNotices([]);

    try {
      const res = await managerChat(staffToken, next);
      const notices = res.toolCalls.map((tc) => describeToolCall(tc));
      setToolNotices(notices);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply || '(no reply)' }]);
      // If any mutation happened, reload the hotel so other tabs stay in sync
      if (res.toolCalls.some((tc) => tc.name !== 'get_hotel_state')) {
        onDataChanged();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Chat failed';
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }]);
    } finally {
      setSending(false);
    }
  }

  function clearConversation() {
    setMessages([
      { role: 'assistant', content: `Reset! I'm ready to help with ${hotel.name}. What would you like to do?` },
    ]);
    setToolNotices([]);
  }

  // ── Voice input (Web Speech API) ──────────────────────────────

  const SpeechRecognition: any =
    typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const speechSupported = !!SpeechRecognition;

  function startRecording() {
    if (!speechSupported) {
      setVoiceError('Voice input not supported in this browser. Try Chrome or Safari.');
      return;
    }
    setVoiceError(null);
    finalTranscriptRef.current = '';
    setInterimTranscript('');
    try {
      const rec = new SpeechRecognition();
      rec.lang = voiceLang;
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e: any) => {
        let interim = '';
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += t;
          else interim += t;
        }
        if (final) finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + final).trim();
        setInterimTranscript(interim);
      };
      rec.onerror = (e: any) => {
        setVoiceError(`Voice error: ${e.error || 'unknown'}`);
        setRecording(false);
      };
      rec.onend = () => {
        setRecording(false);
        const fullText = (finalTranscriptRef.current + ' ' + (interimTranscript || '')).trim();
        if (fullText) {
          setInput((prev) => (prev ? prev + ' ' + fullText : fullText));
        }
        setInterimTranscript('');
      };
      recognitionRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (err: any) {
      setVoiceError(err?.message || 'Could not start voice input');
      setRecording(false);
    }
  }

  function stopRecording() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }

  function toggleRecording() {
    if (recording) stopRecording();
    else startRecording();
  }

  if (tokenError) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800">
        <p className="font-semibold mb-1">Chat unavailable</p>
        <p>{tokenError}</p>
        <p className="mt-2">Go to <strong>Bot Setup</strong> and click “Provision Agent” to enable the AI chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[400px] bg-white border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">AI Setup Assistant</h3>
          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">staff</span>
        </div>
        <button
          onClick={clearConversation}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-bl-sm px-4 py-2 text-sm flex items-center gap-2">
              <Loader size={14} className="animate-spin" />
              thinking…
            </div>
          </div>
        )}
        {toolNotices.length > 0 && !sending && (
          <div className="flex justify-start">
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg px-3 py-2 max-w-[85%]">
              {toolNotices.map((n, i) => <div key={i}>✨ {n}</div>)}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice status / error */}
      {(recording || interimTranscript || voiceError) && (
        <div className="px-3 py-2 border-t bg-blue-50 text-xs text-blue-800 flex items-center gap-2">
          {recording && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Listening ({voiceLang === 'nb-NO' ? 'Norwegian' : 'English'})…
            </span>
          )}
          {interimTranscript && (
            <span className="italic text-blue-600 truncate">“{interimTranscript}”</span>
          )}
          {voiceError && <span className="text-red-700">⚠️ {voiceError}</span>}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="border-t p-3 flex gap-2 items-stretch">
        <button
          type="button"
          onClick={() => {
            if (!speechSupported) {
              setVoiceError(
                'Voice input is not available in this browser. Open the dashboard in Safari or Chrome (not the Telegram in-app browser) to use the mic.'
              );
              return;
            }
            toggleRecording();
          }}
          disabled={!staffToken || sending}
          title={
            !speechSupported
              ? 'Voice not supported in this browser'
              : recording
              ? 'Stop recording'
              : `Speak (${voiceLang === 'nb-NO' ? 'Norwegian' : 'English'})`
          }
          className={`flex items-center justify-center px-3 rounded-lg shrink-0 ${
            recording
              ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
              : speechSupported
              ? 'bg-gray-100 border text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 border text-gray-400'
          } disabled:opacity-50`}
        >
          {recording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        {speechSupported && (
          <button
            type="button"
            onClick={() => setVoiceLang(voiceLang === 'nb-NO' ? 'en-US' : 'nb-NO')}
            title={`Voice language: ${voiceLang === 'nb-NO' ? 'Norwegian' : 'English'} — tap to switch`}
            className="hidden sm:flex items-center justify-center px-2 rounded-lg text-base bg-gray-50 border text-gray-600 hover:bg-gray-100 shrink-0"
          >
            {voiceLang === 'nb-NO' ? '🇳🇴' : '🇬🇧'}
          </button>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!staffToken || sending}
          placeholder="Type or speak…"
          className="flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          type="submit"
          disabled={!staffToken || sending || !input.trim()}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium shrink-0"
        >
          <Send size={16} />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}

function describeToolCall(tc: { name: string; args: any; result: any }): string {
  const r = tc.result || {};
  if (r.error) return `❌ ${tc.name} failed: ${r.error}`;
  switch (tc.name) {
    case 'add_menu_item':
      return `Added menu item: ${tc.args.name}`;
    case 'add_menu_items_bulk':
      return `Added ${r.added} menu items`;
    case 'add_service':
      return `Added service: ${tc.args.name}`;
    case 'add_knowledge':
      return `Added ${tc.args.category} knowledge entry`;
    case 'delete_menu_item':
      return `Deleted a menu item`;
    case 'delete_service':
      return `Deleted a service`;
    case 'delete_knowledge':
      return `Deleted a knowledge entry`;
    case 'update_hotel_info':
      return `Updated hotel info`;
    case 'get_hotel_state':
      return `Looked up current hotel state`;
    default:
      return `Called ${tc.name}`;
  }
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
      // Refetch status to get the manager link too
      await loadStatus();
      setSuccess(`✅ Concierge agent provisioned${res.managerDeepLink ? ' (with manager bot)' : ''}!`);
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
      <div className="bg-white rounded-xl border p-4 sm:p-6 space-y-4">
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
          <div className="bg-white rounded-xl border p-4 sm:p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">Agent Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="min-w-0">
                <span className="text-gray-500">Agent ID:</span>
                <code className="ml-2 bg-gray-100 px-2 py-0.5 rounded text-xs break-all">
                  {status.agentId}
                </code>
              </div>
              <div className="min-w-0">
                <span className="text-gray-500">Workspace:</span>
                <code className="ml-2 bg-gray-100 px-2 py-0.5 rounded text-xs break-all">
                  {status.workspacePath}
                </code>
              </div>
            </div>
          </div>

          {/* Guest Link */}
          <div className="bg-white rounded-xl border p-4 sm:p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              💬 Guest onboarding link
            </h3>
            <p className="text-sm text-gray-500">
              Include this link in the welcome email to guests. Tapping it opens Telegram
              and starts the conversation with the concierge.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                value={status.telegramBot?.deepLink || ''}
                className="flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm bg-gray-50 font-mono text-gray-600"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={copyDeepLink}
                className="px-4 py-2 bg-gray-100 border rounded-lg hover:bg-gray-200 text-sm font-medium shrink-0"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Manager Link */}
          {status.telegramBot?.managerDeepLink ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                🔧 Manager bot link
                <span className="text-xs font-normal bg-amber-100 text-amber-800 px-2 py-0.5 rounded">staff only</span>
              </h3>
              <p className="text-sm text-gray-700">
                Tap this link on the same phone you use for managing the hotel. You'll talk to
                a separate bot that helps you add menu items, services, and knowledge through chat.
                Don't share this link with guests.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={status.telegramBot.managerDeepLink}
                  className="flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm bg-white font-mono text-gray-700"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <a
                  href={status.telegramBot.managerDeepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-amber-600 text-white border rounded-lg hover:bg-amber-700 text-sm font-medium shrink-0 text-center"
                >
                  Open in Telegram
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border rounded-xl p-4 sm:p-6">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                🔧 Manager bot link
                <span className="text-xs font-normal bg-gray-200 text-gray-600 px-2 py-0.5 rounded">not configured</span>
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                The platform admin hasn't set up the manager bot yet. Once a manager bot is
                registered, hotels will be able to add menus and services through chat instead
                of the dashboard form. Re-provisioning the agent will then surface the link here.
              </p>
            </div>
          )}

          {/* SMTP Sender Config */}
          <SmtpConfigPanel hotel={hotel} />

          {/* Email Template + Test send */}
          <WelcomeEmailPanel hotel={hotel} deepLink={status.telegramBot?.deepLink || ''} />
        </>
      )}
    </div>
  );
}

// ── SMTP Config Panel ──────────────────────────────────────────

function SmtpConfigPanel({ hotel }: { hotel: Hotel }) {
  const [host, setHost] = useState(hotel.smtpHost || '');
  const [port, setPort] = useState(hotel.smtpPort?.toString() || '587');
  const [user, setUser] = useState(hotel.smtpUser || '');
  const [pass, setPass] = useState(''); // never prefilled — leave blank to keep existing
  const [fromName, setFromName] = useState(hotel.smtpFromName || '');
  const [fromEmail, setFromEmail] = useState(hotel.smtpFromEmail || '');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [open, setOpen] = useState(!hotel.smtpHost); // open by default if not configured

  const isConfigured = !!(hotel.smtpHost && hotel.smtpUser && hotel.smtpFromEmail);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload: any = {
        smtpHost: host || null,
        smtpPort: port ? parseInt(port, 10) : null,
        smtpUser: user || null,
        smtpFromName: fromName || null,
        smtpFromEmail: fromEmail || '',
      };
      // Only include password if user typed something. Empty = keep existing.
      if (pass) payload.smtpPass = pass;
      await updateHotel(hotel.id, payload);
      setPass('');
      setMessage({ kind: 'ok', text: '✅ SMTP settings saved' });
      setTimeout(() => window.location.reload(), 700);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Save failed';
      setMessage({ kind: 'err', text: `❌ ${msg}` });
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setMessage(null);
    try {
      const res = await verifyHotelSmtp(hotel.id);
      if (res.ok) {
        setMessage({
          kind: 'ok',
          text: res.usingDefault
            ? '✓ Platform default sender works (configure your own to send from your hotel address)'
            : '✓ Your SMTP works! Test connection successful.',
        });
      } else {
        setMessage({ kind: 'err', text: `❌ ${res.error || 'SMTP verification failed'}` });
      }
    } catch (err: any) {
      setMessage({ kind: 'err', text: `❌ ${err?.response?.data?.error || err?.message || 'Verification failed'}` });
    } finally {
      setVerifying(false);
    }
  }

  async function handleClear() {
    if (!window.confirm('Clear your SMTP settings? Welcome emails will fall back to the platform default sender.')) return;
    setSaving(true);
    try {
      await updateHotel(hotel.id, {
        smtpHost: null,
        smtpPort: null,
        smtpUser: null,
        smtpPass: '',
        smtpFromName: null,
        smtpFromEmail: '',
      } as any);
      // Force send empty smtpPass through:
      await updateHotel(hotel.id, { smtpPass: '' } as any);
      setMessage({ kind: 'info', text: 'Cleared. Reloading…' });
      setTimeout(() => window.location.reload(), 600);
    } catch (err: any) {
      setMessage({ kind: 'err', text: `❌ ${err?.message || 'Failed to clear'}` });
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border p-4 sm:p-6 space-y-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Server size={18} className="text-gray-700" />
          <h3 className="font-semibold text-gray-900">Email sender (SMTP)</h3>
          {isConfigured ? (
            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">configured</span>
          ) : (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">using default</span>
          )}
        </div>
        <span className="text-sm text-gray-400">{open ? 'Hide' : 'Edit'}</span>
      </button>

      {!open && (
        <p className="text-sm text-gray-500">
          {isConfigured
            ? `Sending from ${hotel.smtpFromEmail}`
            : 'Welcome emails currently come from the platform default. Add your own SMTP to send from your hotel address.'}
        </p>
      )}

      {open && (
        <form onSubmit={handleSave} className="space-y-4">
          <p className="text-sm text-gray-500">
            Configure your hotel's SMTP server so welcome emails come from your address. Common providers:
            <strong> Gmail</strong> (smtp.gmail.com:587), <strong>Outlook 365</strong> (smtp.office365.com:587),
            or your own domain's SMTP. Leave blank to use the platform default sender.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">From email *</label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="concierge@yourhotel.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From name</label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder={hotel.name}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP host</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="587"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP user</label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="your.email@yourhotel.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMTP password
                {isConfigured && <span className="font-normal text-gray-400 ml-1">(leave blank to keep existing)</span>}
              </label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder={isConfigured ? '••••••••' : 'app password or SMTP password'}
                autoComplete="new-password"
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Tip: For Gmail, use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">App Password</a>, not your normal password.
          </p>

          {message && (
            <div className={`text-sm p-2 rounded ${
              message.kind === 'ok' ? 'bg-green-50 text-green-700' :
              message.kind === 'err' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {message.text}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving…' : 'Save SMTP settings'}
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              className="flex items-center justify-center gap-2 bg-gray-100 border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
            >
              {verifying ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {verifying ? 'Verifying…' : 'Verify connection'}
            </button>
            {isConfigured && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 disabled:opacity-50 text-sm font-medium"
              >
                <Trash2 size={16} />
                Clear
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

// ── Welcome Email Panel ────────────────────────────────────────

function WelcomeEmailPanel({ hotel, deepLink }: { hotel: Hotel; deepLink: string }) {
  const [preview, setPreview] = useState<{ subject: string; text: string; html: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [sending, setSending] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    getWelcomeEmailPreview(hotel.id)
      .then(setPreview)
      .catch(() => {/* ignore */});
  }, [hotel.id]);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopyMessage(`✓ ${label} copied`);
        setTimeout(() => setCopyMessage(null), 2500);
      },
      () => {
        setCopyMessage('Failed to copy — select and copy manually');
      },
    );
  }

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testEmail.trim()) return;
    setSending(true);
    setSendMessage(null);
    try {
      const res = await sendTestWelcomeEmail(hotel.id, testEmail.trim(), guestName.trim() || undefined) as any;
      const senderNote = res.usingDefaultSender
        ? ' (sent from platform default — configure SMTP above to send from your hotel)'
        : ` (sent from ${res.from})`;
      setSendMessage({ kind: 'ok', text: `✅ Test email sent to ${res.to}${senderNote}` });
      setTestEmail('');
      setGuestName('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to send';
      setSendMessage({ kind: 'err', text: `❌ ${msg}` });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Mail size={18} className="text-gray-700" />
        <h3 className="font-semibold text-gray-900">Welcome Email</h3>
      </div>
      <p className="text-sm text-gray-500">
        This email gets sent to your guest after they book. The big button opens Telegram, with a fallback for guests who don't have it yet.
      </p>

      {/* Test send form */}
      <form onSubmit={handleSendTest} className="bg-gray-50 border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Test it now</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="email"
            required
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="your@email.com"
          />
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="Guest name (optional)"
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="submit"
            disabled={sending || !testEmail.trim()}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {sending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Sending…' : 'Send test email'}
          </button>
          {sendMessage && (
            <span className={`text-sm ${sendMessage.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
              {sendMessage.text}
            </span>
          )}
        </div>
      </form>

      {/* Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">Plain-text preview</h4>
          <div className="flex items-center gap-2">
            {copyMessage && <span className="text-xs text-green-700">{copyMessage}</span>}
            <button
              onClick={() => preview && copy(`Subject: ${preview.subject}\n\n${preview.text}`, 'Plain text')}
              disabled={!preview}
              className="px-3 py-1.5 bg-gray-100 border rounded-lg hover:bg-gray-200 text-xs font-medium disabled:opacity-50"
            >
              Copy text
            </button>
            <button
              onClick={() => preview && copy(preview.html, 'HTML')}
              disabled={!preview}
              className="px-3 py-1.5 bg-gray-100 border rounded-lg hover:bg-gray-200 text-xs font-medium disabled:opacity-50"
            >
              Copy HTML
            </button>
          </div>
        </div>
        <div className="bg-gray-50 border rounded-lg p-4 text-xs sm:text-sm text-gray-700 font-mono whitespace-pre-wrap break-words">
{preview ? `Subject: ${preview.subject}\n\n${preview.text}` : 'Loading preview…'}
        </div>
      </div>

      {/* Deep link reference */}
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Raw Telegram link (for embedding manually)</summary>
        <code className="block mt-2 bg-gray-100 px-3 py-2 rounded text-xs break-all">{deepLink}</code>
      </details>
    </div>
  );
}
