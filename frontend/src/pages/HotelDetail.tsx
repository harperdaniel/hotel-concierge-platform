import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Layout from '../components/Layout';
import { getHotel, updateHotel, createKnowledge, provisionHotel, deprovisionHotel, getProvisionStatus, sendTestWelcomeEmail, getWelcomeEmailPreview, verifyHotelSmtp, getStaffToken, managerChat, listVenues, createVenue, addVenueMenuItem, type Hotel, type MenuItem, type KnowledgeEntry, type Service, type ProvisionStatus, type ChatMsg, type Venue } from '../lib/api';
import { ArrowLeft, Save, Plus, Utensils, BookOpen, ConciergeBell, Bot, Rocket, Trash2, CheckCircle, XCircle, Loader, Send, Mail, Server, Sparkles, Mic, MicOff, Waves, Building2, Wine, Dumbbell, Briefcase, Plane, Dog, BedDouble, Coffee, ChefHat } from 'lucide-react';

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'facilities' | 'knowledge' | 'menu' | 'services' | 'spa' | 'bots'>(
    searchParams.get('welcome') === '1' ? 'bots' : 'facilities'
  );
  const [aiOpen, setAiOpen] = useState(false);
  const justCreated = searchParams.get('welcome') === '1';

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [hotelEmail, setHotelEmail] = useState('');

  // New knowledge
  const [newKnowledgeCat, setNewKnowledgeCat] = useState('general');
  const [newKnowledgeContent, setNewKnowledgeContent] = useState('');

  // New menu item

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
    { key: 'facilities', label: 'Overview', icon: Building2 },
    { key: 'menu', label: 'Restaurants', icon: Utensils },
    { key: 'spa', label: 'Spa', icon: Waves },
    { key: 'services', label: 'Services', icon: ConciergeBell },
    { key: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { key: 'bots', label: 'Bot Setup', icon: Bot },
    { key: 'info', label: 'Info', icon: Save },
  ] as const;

  return (
    <Layout>
      <div className="mb-6">
        <Link to="/dashboard" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Back to hotels
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{hotel.name}</h1>
          <button
            onClick={() => setAiOpen(true)}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1.5 rounded-full text-sm font-medium hover:from-blue-700 hover:to-purple-700 shadow-sm"
          >
            <Sparkles size={14} /> AI Manager
          </button>
        </div>
        {justCreated && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            🎉 Hotel created! Next: head to <strong>Bot Setup</strong> and click “Provision Agent” to spin up your concierge — then click the <strong>AI Manager</strong> button up top to fill in details by chatting.
          </div>
        )}
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
      {activeTab === 'menu' && <RestaurantsTab hotel={hotel} onChanged={loadHotel} />}

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

      {/* Tab: Spa (filtered services) */}
      {activeTab === 'spa' && <SpaTab hotel={hotel} />}

      {/* Tab: Facilities (overview dashboard) */}
      {activeTab === 'facilities' && <FacilitiesTab hotel={hotel} onChanged={loadHotel} onJumpTab={(t) => setActiveTab(t as any)} />}

      {/* Tab: Bot Setup */}
      {activeTab === 'bots' && <BotSetupTab hotel={hotel} />}

      {/* AI Manager floating button (mobile) */}
      <button
        onClick={() => setAiOpen(true)}
        className="sm:hidden fixed bottom-4 right-4 z-30 w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg flex items-center justify-center"
        aria-label="Open AI Manager"
      >
        <Sparkles size={22} />
      </button>

      {/* AI Manager overlay panel */}
      {aiOpen && <AIManagerPanel hotel={hotel} onClose={() => setAiOpen(false)} onDataChanged={loadHotel} />}
    </Layout>
  );
}

// ── Spa Tab ───────────────────────────────────────────────────

function SpaTab({ hotel }: { hotel: Hotel }) {
  const treatments = (hotel.services || []).filter((s: any) => s.category === 'spa_treatment');
  const accesses = (hotel.services || []).filter((s: any) => s.category === 'spa_access');
  const hasSpa = (hotel as any).hasSpa === true;

  if (!hasSpa && treatments.length === 0 && accesses.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800">
        <p className="font-semibold mb-1">No spa configured</p>
        <p>This hotel doesn't have a spa marked in its facilities. Use the AI Chat tab and say something like “we have a spa, add a 60-min massage for 890 kr”, or update the hotel info to mark it as having a spa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Waves size={28} className="text-blue-600 mt-1" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Spa</h3>
          <p className="text-sm text-gray-500">
            Treatments and access passes guests can book through the concierge. Use the AI Chat tab to add new ones.
          </p>
        </div>
      </div>

      {/* Treatments */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">Treatments ({treatments.length})</h4>
        {treatments.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No treatments yet — try “Add a 60-min hot stone massage for 890 kr” in the AI Chat.</p>
        ) : (
          treatments.map((t: any) => (
            <div key={t.id} className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{t.name}</p>
                {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
              </div>
              <div className="sm:text-right shrink-0">
                {t.price && <p className="font-semibold">{(t.price / 100).toFixed(2)} NOK</p>}
                {t.durationMin && <p className="text-xs text-gray-400">{t.durationMin} min</p>}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Access passes */}
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">Access ({accesses.length})</h4>
        {accesses.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No access passes yet — try “Add a sauna day pass for 250 kr”.</p>
        ) : (
          accesses.map((a: any) => (
            <div key={a.id} className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{a.name}</p>
                {a.description && <p className="text-sm text-gray-500">{a.description}</p>}
              </div>
              <div className="sm:text-right shrink-0">
                {a.price && <p className="font-semibold">{(a.price / 100).toFixed(2)} NOK</p>}
                {a.durationMin && <p className="text-xs text-gray-400">{a.durationMin} min</p>}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

// ── AI Manager Panel (slide-in overlay around the chat tab) ───────

function AIManagerPanel({ hotel, onClose, onDataChanged }: { hotel: Hotel; onClose: () => void; onDataChanged: () => void }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel: full-screen on mobile, side panel on desktop */}
      <div className="relative bg-gray-50 w-full sm:w-[480px] lg:w-[560px] h-full shadow-2xl flex flex-col animate-slideInRight">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">AI Manager</h3>
            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{hotel.name}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            aria-label="Close AI Manager"
          >
            <XCircle size={20} />
          </button>
        </div>

        {/* Chat fills remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ManagerChatTab hotel={hotel} onDataChanged={onDataChanged} fullHeight />
        </div>
      </div>
    </div>
  );
}

// ── Manager Chat Tab ─────────────────────────────────────────

function ManagerChatTab({ hotel, onDataChanged, fullHeight = false }: { hotel: Hotel; onDataChanged: () => void; fullHeight?: boolean }) {
  const [staffToken, setStaffToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: buildOpeningMessage(hotel) },
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
    setMessages([{ role: 'assistant', content: buildOpeningMessage(hotel) }]);
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
    <div
      className={`flex flex-col bg-white overflow-hidden ${
        fullHeight ? 'h-full border-0 rounded-none' : 'h-[calc(100vh-12rem)] min-h-[400px] border rounded-xl'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">AI Manager</h3>
          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">staff</span>
        </div>
        <button
          onClick={clearConversation}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Restart
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm break-words ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm whitespace-pre-wrap'
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm chat-md'
              }`}
            >
              {m.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              ) : (
                m.content
              )}
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

// ── Build a personalized opening message based on what's missing ─────

function buildOpeningMessage(hotel: Hotel): string {
  const missing: string[] = [];
  const venuesCount = (hotel.venues || []).length;
  const menuCount = (hotel.menuItems || []).length;
  const servicesCount = (hotel.services || []).length;
  const knowledgeCount = (hotel.knowledgeEntries || []).length;

  // Restaurants: enabled but no venues / no items
  if (hotel.hasRestaurant && venuesCount === 0) missing.push('a restaurant or bar set up');
  else if (hotel.hasRestaurant && menuCount === 0) missing.push('any menu items');

  // Spa: enabled but no treatments/access
  if (hotel.hasSpa) {
    const spaItems = (hotel.services || []).filter((s: any) => s.category === 'spa_treatment' || s.category === 'spa_access').length;
    if (spaItems === 0) missing.push('any spa treatments or access passes');
    if (!hotel.spaHours) missing.push('spa hours');
  }

  // Inline facility details
  if (hotel.hasPool && !hotel.poolHours) missing.push('pool hours');
  if (hotel.hasGym && !hotel.gymHours) missing.push('gym hours');
  if (hotel.hasBar && !hotel.barHours) missing.push('bar hours');
  if (hotel.hasConference && !hotel.conferenceNotes) missing.push('conference details');
  if (hotel.hasTransfers && !hotel.transferNotes) missing.push('transfer details');
  if (hotel.petFriendly && !hotel.petPolicy) missing.push('a pet policy');

  // Knowledge base
  if (knowledgeCount === 0) missing.push('any knowledge entries (Wi-Fi, breakfast, parking, etc.)');

  // No services and not even a restaurant — pretty bare
  if (missing.length === 0 && servicesCount === 0 && menuCount === 0) {
    missing.push('any items at all yet');
  }

  // Compose the message
  const greeting = `Hi! I'm your AI Manager for **${hotel.name}**. 👋`;

  if (missing.length === 0) {
    return `${greeting}\n\nLooking good — your hotel has venues, menu items, services, and knowledge configured. I'm here whenever you want to add or update anything. Just tell me what you'd like to do!\n\nA few things you could try:\n- "Add a Negroni for 165 kr to the Sky Bar"\n- "Update breakfast hours to 06:30–10:30"\n- "Show me what's on my menu"\n\n🎙️ Tap the mic to speak instead of type — works in Norwegian or English.`;
  }

  // Build a friendly list of missing items
  let missingList: string;
  if (missing.length === 1) {
    missingList = missing[0];
  } else if (missing.length === 2) {
    missingList = `${missing[0]} and ${missing[1]}`;
  } else {
    missingList = `${missing.slice(0, -1).join(', ')}, and ${missing[missing.length - 1]}`;
  }

  return `${greeting}\n\nI took a look at your setup and noticed you haven't added **${missingList}** yet.\n\nWant me to walk you through it? Just say *"yes"* and I can take a couple of paths:\n\n- 🌐 **Got a website?** Drop the URL and I'll pull menus, hours, and services from there — you just confirm or correct what I find. Way faster than typing.\n- ✍️ **No website handy?** I'll ask you the right questions one at a time.\n\nOr, jump to the relevant tab and do it yourself — **I'm here either way.** 😊\n\n🎙️ You can also speak instead of type — Norwegian or English.`;
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

// ── Restaurants Tab (venue-aware menu management) ────────────────────────

const VENUE_KIND_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  lounge: 'Lounge',
  room_service: 'Room service',
  cafe: 'Café',
};

const VENUE_KIND_ICON: Record<string, any> = {
  restaurant: ChefHat,
  bar: Wine,
  lounge: Wine,
  room_service: BedDouble,
  cafe: Coffee,
};

function RestaurantsTab({ hotel, onChanged }: { hotel: Hotel; onChanged: () => void }) {
  const [venues, setVenues] = useState<Venue[]>(hotel.venues || []);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState((hotel.venues || []).length === 0);

  // Edit/add UI state
  const [newVenue, setNewVenue] = useState({ name: '', kind: 'restaurant', hours: '', location: '' });
  const [creatingVenue, setCreatingVenue] = useState(false);

  // Item-add state, per venue
  const [itemDrafts, setItemDrafts] = useState<Record<string, { name: string; description: string; price: string; category: string; availableForRoomService: boolean }>>({});

  async function refreshVenues() {
    setLoading(true);
    try {
      const res = await listVenues(hotel.id);
      setVenues(res.venues);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateVenue() {
    if (!newVenue.name.trim()) return;
    setCreatingVenue(true);
    try {
      await createVenue(hotel.id, {
        name: newVenue.name.trim(),
        kind: newVenue.kind as any,
        hours: newVenue.hours.trim() || null,
        location: newVenue.location.trim() || null,
      });
      setNewVenue({ name: '', kind: 'restaurant', hours: '', location: '' });
      setShowAddForm(false);
      await refreshVenues();
      onChanged();
    } finally {
      setCreatingVenue(false);
    }
  }

  async function handleAddItem(venueId: string) {
    const d = itemDrafts[venueId];
    if (!d?.name.trim()) return;
    const price = parseFloat(d.price || '0');
    await addVenueMenuItem(venueId, {
      name: d.name.trim(),
      description: d.description.trim() || undefined,
      price: Math.round(price * 100),
      category: d.category,
      availableForRoomService: d.availableForRoomService,
    });
    setItemDrafts({ ...itemDrafts, [venueId]: { name: '', description: '', price: '', category: 'mains', availableForRoomService: true } });
    await refreshVenues();
    onChanged();
  }

  function getDraft(venueId: string) {
    return (
      itemDrafts[venueId] || {
        name: '',
        description: '',
        price: '',
        category: 'mains',
        availableForRoomService: true,
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Restaurants & Bars</h3>
          <p className="text-sm text-gray-500">Each venue has its own menu. Items can also be set to be available for room service.</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus size={16} /> Add venue
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white border rounded-xl p-4 sm:p-6 space-y-3">
          <h4 className="font-medium text-gray-900">New venue</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={newVenue.name}
              onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
              placeholder="Name (e.g. Main Restaurant)"
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <select
              value={newVenue.kind}
              onChange={(e) => setNewVenue({ ...newVenue, kind: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="restaurant">Restaurant</option>
              <option value="bar">Bar</option>
              <option value="lounge">Lounge</option>
              <option value="cafe">Café</option>
              <option value="room_service">Room service kitchen</option>
            </select>
            <input
              value={newVenue.hours}
              onChange={(e) => setNewVenue({ ...newVenue, hours: e.target.value })}
              placeholder="Hours (e.g. 17:00–22:00)"
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <input
              value={newVenue.location}
              onChange={(e) => setNewVenue({ ...newVenue, location: e.target.value })}
              placeholder="Location (e.g. Lobby level)"
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateVenue}
              disabled={creatingVenue || !newVenue.name.trim()}
              className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {creatingVenue ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
              Create venue
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
          </div>
        </div>
      )}

      {venues.length === 0 && !loading && !showAddForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          No venues yet. Click <strong>“Add venue”</strong> to create your first restaurant or bar — or use the AI Chat tab and just say <em>“we have a main restaurant called Aurora, open 17:00–22:00”</em>.
        </div>
      )}

      {venues.map((venue) => {
        const Icon = VENUE_KIND_ICON[venue.kind] || ChefHat;
        const draft = getDraft(venue.id);
        const items = (hotel.menuItems || []).filter((i: any) => i.venueId === venue.id);
        return (
          <div key={venue.id} className="bg-white border rounded-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b bg-gray-50">
              <div className="flex items-start gap-3">
                <Icon size={22} className="text-blue-600 mt-1" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900">{venue.name}</h4>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-3 mt-1">
                    <span>{VENUE_KIND_LABELS[venue.kind] || venue.kind}</span>
                    {venue.hours && <span>🕐 {venue.hours}</span>}
                    {venue.location && <span>📍 {venue.location}</span>}
                    <span>{items.length} items</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-4 sm:p-5 space-y-2">
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No items yet — add one below or use the AI Chat.</p>
              ) : (
                items.map((item: any) => (
                  <div key={item.id} className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-600">{item.category}</span>
                      <span className="ml-2 font-medium text-gray-900">{item.name}</span>
                      {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                      {item.availableForRoomService === false && (
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1 inline-block">venue only — no room service</span>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900 shrink-0">{(item.price / 100).toFixed(2)} NOK</span>
                  </div>
                ))
              )}

              {/* Quick add row */}
              <div className="border-t pt-3 mt-3">
                <p className="text-xs font-semibold text-gray-500 mb-2">Add item</p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <input
                    value={draft.name}
                    onChange={(e) => setItemDrafts({ ...itemDrafts, [venue.id]: { ...draft, name: e.target.value } })}
                    placeholder="Item name"
                    className="px-3 py-2 border rounded-lg text-sm sm:col-span-2"
                  />
                  <input
                    value={draft.description}
                    onChange={(e) => setItemDrafts({ ...itemDrafts, [venue.id]: { ...draft, description: e.target.value } })}
                    placeholder="Description (optional)"
                    className="px-3 py-2 border rounded-lg text-sm sm:col-span-2"
                  />
                  <input
                    type="number"
                    value={draft.price}
                    onChange={(e) => setItemDrafts({ ...itemDrafts, [venue.id]: { ...draft, price: e.target.value } })}
                    placeholder="NOK"
                    step="0.01"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <select
                    value={draft.category}
                    onChange={(e) => setItemDrafts({ ...itemDrafts, [venue.id]: { ...draft, category: e.target.value } })}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="starters">Starters</option>
                    <option value="mains">Mains</option>
                    <option value="desserts">Desserts</option>
                    <option value="drinks">Drinks</option>
                    <option value="other">Other</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={draft.availableForRoomService}
                      onChange={(e) =>
                        setItemDrafts({ ...itemDrafts, [venue.id]: { ...draft, availableForRoomService: e.target.checked } })
                      }
                    />
                    Also room service
                  </label>
                  <button
                    onClick={() => handleAddItem(venue.id)}
                    disabled={!draft.name.trim() || !draft.price}
                    className="ml-auto flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Orphaned items (items without a venue) */}
      {(() => {
        const orphans = (hotel.menuItems || []).filter((i: any) => !i.venueId);
        if (orphans.length === 0) return null;
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="font-medium text-amber-900 mb-2">Items without a venue ({orphans.length})</p>
            <p className="text-xs text-amber-700 mb-3">These items aren't tied to a specific venue yet. Use the AI Chat to assign them, or recreate them within a venue.</p>
            <div className="space-y-2">
              {orphans.map((item: any) => (
                <div key={item.id} className="bg-white border rounded-lg p-3 flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-900">{item.name}</span>
                  <span className="text-xs text-gray-500">{(item.price / 100).toFixed(2)} NOK</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Facilities Tab (dashboard / overview) ────────────────────────────────

const FACILITY_DEFS: {
  flagKey: keyof Hotel;
  label: string;
  icon: any;
  type: 'tab' | 'inline';
  drillTab?: string;
  hoursField?: keyof Hotel;
  notesField?: keyof Hotel;
  policyField?: keyof Hotel;
  description: string;
  accent: string; // tailwind text class for the icon color
}[] = [
  { flagKey: 'hasRestaurant', label: 'Restaurants & Bars', icon: Utensils, type: 'tab', drillTab: 'menu', description: 'Venues and menus', accent: 'text-amber-600' },
  { flagKey: 'hasRoomService', label: 'Room service', icon: BedDouble, type: 'inline', description: 'In-room dining', accent: 'text-rose-600' },
  { flagKey: 'hasSpa', label: 'Spa', icon: Sparkles, type: 'tab', drillTab: 'spa', hoursField: 'spaHours', notesField: 'spaNotes', description: 'Treatments & access', accent: 'text-purple-600' },
  { flagKey: 'hasPool', label: 'Pool / wellness', icon: Waves, type: 'inline', hoursField: 'poolHours', notesField: 'poolNotes', description: 'Pool, sauna, hot tub', accent: 'text-cyan-600' },
  { flagKey: 'hasGym', label: 'Gym', icon: Dumbbell, type: 'inline', hoursField: 'gymHours', notesField: 'gymNotes', description: 'Fitness room', accent: 'text-emerald-600' },
  { flagKey: 'hasBar', label: 'Bar / lounge', icon: Wine, type: 'inline', hoursField: 'barHours', notesField: 'barNotes', description: 'Drinks and snacks', accent: 'text-red-600' },
  { flagKey: 'hasConference', label: 'Conference', icon: Briefcase, type: 'inline', notesField: 'conferenceNotes', description: 'Meeting rooms', accent: 'text-slate-600' },
  { flagKey: 'hasTransfers', label: 'Airport transfers', icon: Plane, type: 'inline', notesField: 'transferNotes', description: 'Pickup / dropoff', accent: 'text-sky-600' },
  { flagKey: 'petFriendly', label: 'Pet-friendly', icon: Dog, type: 'inline', policyField: 'petPolicy', description: 'Pet policy', accent: 'text-orange-600' },
];

function FacilitiesTab({ hotel, onChanged, onJumpTab }: { hotel: Hotel; onChanged: () => void; onJumpTab: (tab: string) => void }) {
  const [editing, setEditing] = useState<typeof FACILITY_DEFS[number] | null>(null);
  const [draft, setDraft] = useState<{ hours: string; notes: string; policy: string; flag: boolean }>({
    hours: '',
    notes: '',
    policy: '',
    flag: false,
  });
  const [saving, setSaving] = useState(false);

  function startEdit(def: typeof FACILITY_DEFS[number]) {
    setEditing(def);
    setDraft({
      hours: (def.hoursField ? (hotel[def.hoursField] as string | null) : '') || '',
      notes: (def.notesField ? (hotel[def.notesField] as string | null) : '') || '',
      policy: (def.policyField ? (hotel[def.policyField] as string | null) : '') || '',
      flag: !!hotel[def.flagKey],
    });
  }

  async function saveDef() {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: any = {};
      payload[editing.flagKey] = draft.flag;
      if (editing.hoursField) payload[editing.hoursField] = draft.hours.trim() || null;
      if (editing.notesField) payload[editing.notesField] = draft.notes.trim() || null;
      if (editing.policyField) payload[editing.policyField] = draft.policy.trim() || null;
      await updateHotel(hotel.id, payload);
      setEditing(null);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function toggleFlag(def: typeof FACILITY_DEFS[number]) {
    setSaving(true);
    try {
      await updateHotel(hotel.id, { [def.flagKey]: !hotel[def.flagKey] } as any);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  // ── Vital stats ──────────────────────────────────────
  const venuesCount = (hotel.venues || []).length;
  const menuCount = (hotel.menuItems || []).length;
  const servicesCount = (hotel.services || []).length;
  const knowledgeCount = (hotel.knowledgeEntries || []).length;
  const enabledFacilities = FACILITY_DEFS.filter((d) => hotel[d.flagKey]).length;
  const provisioned = !!(hotel as any).openclawConfig?.active;

  return (
    <div className="space-y-6">
      {/* Header with quick edit hotel info link */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Overview</h3>
          <p className="text-sm text-gray-500">
            What this hotel offers, how it's configured, and what's missing — at a glance.
          </p>
        </div>
        <button
          onClick={() => onJumpTab('info')}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 self-start sm:self-end"
        >
          <Save size={14} /> Edit hotel info →
        </button>
      </div>

      {/* Vital stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Facilities" value={enabledFacilities} suffix={`/ ${FACILITY_DEFS.length}`} icon={Building2} />
        <StatCard label="Venues" value={venuesCount} icon={Utensils} onClick={() => onJumpTab('menu')} />
        <StatCard label="Menu items" value={menuCount} icon={ChefHat} onClick={() => onJumpTab('menu')} />
        <StatCard label="Services" value={servicesCount} icon={ConciergeBell} onClick={() => onJumpTab('services')} />
        <StatCard label="Knowledge" value={knowledgeCount} icon={BookOpen} onClick={() => onJumpTab('knowledge')} />
        <StatCard
          label="Concierge"
          value={provisioned ? 'Live' : 'Off'}
          icon={Bot}
          accent={provisioned ? 'text-green-600' : 'text-gray-400'}
          onClick={() => onJumpTab('bots')}
        />
      </div>

      {/* Facilities grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FACILITY_DEFS.map((def) => {
          const Icon = def.icon;
          const enabled = !!hotel[def.flagKey];
          const hoursValue = def.hoursField ? (hotel[def.hoursField] as string | null) : null;
          const notesValue = def.notesField ? (hotel[def.notesField] as string | null) : null;
          const policyValue = def.policyField ? (hotel[def.policyField] as string | null) : null;
          const summaryParts = [hoursValue && `🕐 ${hoursValue}`, notesValue, policyValue].filter(Boolean) as string[];

          let extraSummary = '';
          if (def.flagKey === 'hasRestaurant') {
            extraSummary = venuesCount > 0 ? `${venuesCount} venue${venuesCount === 1 ? '' : 's'} · ${menuCount} item${menuCount === 1 ? '' : 's'}` : 'no venues yet';
          }
          if (def.flagKey === 'hasSpa') {
            const treatments = (hotel.services || []).filter((s: any) => s.category === 'spa_treatment').length;
            const accesses = (hotel.services || []).filter((s: any) => s.category === 'spa_access').length;
            extraSummary = treatments + accesses > 0 ? `${treatments} treatment${treatments === 1 ? '' : 's'}, ${accesses} access` : 'no items yet';
          }

          const incomplete = enabled && !summaryParts.length && def.type === 'inline';

          return (
            <div
              key={String(def.flagKey)}
              className={`relative border rounded-xl p-4 flex flex-col min-h-[160px] transition ${
                enabled ? 'bg-white' : 'bg-gray-50 border-gray-200'
              } ${incomplete ? 'border-amber-300 bg-amber-50' : ''}`}
            >
              {/* Status pill */}
              <div className="flex items-center justify-between mb-2">
                <Icon size={20} className={enabled ? def.accent : 'text-gray-300'} />
                {enabled ? (
                  <span className={`text-xs px-2 py-0.5 rounded ${incomplete ? 'bg-amber-100 text-amber-800' : 'bg-green-50 text-green-700'}`}>
                    {incomplete ? 'incomplete' : 'enabled'}
                  </span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">disabled</span>
                )}
              </div>

              {/* Title */}
              <h4 className={`font-semibold ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>{def.label}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{def.description}</p>

              {/* Summary */}
              <div className="flex-1 mt-3 text-sm text-gray-700 space-y-1">
                {enabled && summaryParts.map((s, i) => (
                  <p key={i} className="line-clamp-2">{s}</p>
                ))}
                {enabled && extraSummary && (
                  <p className="text-xs text-gray-500">{extraSummary}</p>
                )}
                {incomplete && <p className="text-xs text-amber-700">Tap to add details</p>}
              </div>

              {/* Action */}
              <div className="pt-3 mt-auto border-t -mx-4 -mb-4 px-4 py-2 bg-gray-50 rounded-b-xl flex items-center justify-between text-xs">
                {def.type === 'tab' && enabled ? (
                  <button
                    onClick={() => onJumpTab(def.drillTab!)}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Manage →
                  </button>
                ) : enabled ? (
                  <button onClick={() => startEdit(def)} className="text-blue-600 hover:underline font-medium">
                    {summaryParts.length ? 'Edit details' : 'Add details'}
                  </button>
                ) : (
                  <button
                    onClick={() => toggleFlag(def)}
                    disabled={saving}
                    className="text-blue-600 hover:underline font-medium disabled:opacity-50"
                  >
                    Enable
                  </button>
                )}
                {enabled && def.type === 'inline' && (
                  <button
                    onClick={() => toggleFlag(def)}
                    disabled={saving}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    title="Disable this facility"
                  >
                    Disable
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editing && (
        <FacilityEditModal
          def={editing}
          draft={draft}
          setDraft={setDraft}
          onSave={saveDef}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  accent,
  onClick,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: any;
  accent?: string;
  onClick?: () => void;
}) {
  const Component: any = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={`bg-white border rounded-xl p-3 flex flex-col gap-1 text-left transition ${
        onClick ? 'hover:bg-gray-50 hover:border-gray-300 cursor-pointer' : ''
      }`}
    >
      <Icon size={16} className={accent || 'text-gray-400'} />
      <div className="text-2xl font-bold text-gray-900 leading-none">
        {value}
        {suffix && <span className="text-sm font-normal text-gray-400 ml-1">{suffix}</span>}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </Component>
  );
}

function FacilityEditModal({
  def,
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
}: {
  def: typeof FACILITY_DEFS[number];
  draft: { hours: string; notes: string; policy: string; flag: boolean };
  setDraft: (d: { hours: string; notes: string; policy: string; flag: boolean }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const Icon = def.icon;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Icon size={22} className={def.accent} />
          <h3 className="text-lg font-semibold text-gray-900">{def.label}</h3>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={draft.flag}
            onChange={(e) => setDraft({ ...draft, flag: e.target.checked })}
          />
          {def.label} is offered at this hotel
        </label>

        {def.hoursField && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hours</label>
            <input
              type="text"
              value={draft.hours}
              onChange={(e) => setDraft({ ...draft, hours: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g. 06:00–22:00"
            />
          </div>
        )}

        {def.notesField && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Anything important guests should know"
            />
          </div>
        )}

        {def.policyField && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Policy</label>
            <textarea
              value={draft.policy}
              onChange={(e) => setDraft({ ...draft, policy: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g. Pets allowed in rooms 200–220, 300 NOK/night"
            />
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center justify-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
