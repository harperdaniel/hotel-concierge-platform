import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { applyImport, createHotel, websiteImport, type ImportSuggestion } from '../lib/api';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Utensils,
  BedDouble,
  Waves,
  Dumbbell,
  Wine,
  Briefcase,
  Plane,
  Dog,
  Loader,
  ConciergeBell,
  Globe,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface FacilityFlags {
  hasRestaurant: boolean;
  hasRoomService: boolean;
  hasSpa: boolean;
  hasPool: boolean;
  hasGym: boolean;
  hasBar: boolean;
  hasConference: boolean;
  hasTransfers: boolean;
  petFriendly: boolean;
}

const FACILITIES: { key: keyof FacilityFlags; label: string; description: string; icon: any }[] = [
  { key: 'hasRestaurant', label: 'Restaurant', description: 'In-house dining', icon: Utensils },
  { key: 'hasRoomService', label: 'Room service', description: 'In-room dining', icon: BedDouble },
  { key: 'hasSpa', label: 'Spa', description: 'Treatments & wellness', icon: Sparkles },
  { key: 'hasPool', label: 'Pool / wellness', description: 'Pool, sauna, hot tub', icon: Waves },
  { key: 'hasGym', label: 'Gym', description: 'Fitness room', icon: Dumbbell },
  { key: 'hasBar', label: 'Bar / lounge', description: 'Drinks and snacks', icon: Wine },
  { key: 'hasConference', label: 'Conference', description: 'Meeting rooms', icon: Briefcase },
  { key: 'hasTransfers', label: 'Airport transfers', description: 'Pickup/dropoff', icon: Plane },
  { key: 'petFriendly', label: 'Pet-friendly', description: 'Welcomes pets', icon: Dog },
];

export default function NewHotel() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Step 2
  const [flags, setFlags] = useState<FacilityFlags>({
    hasRestaurant: false,
    hasRoomService: false,
    hasSpa: false,
    hasPool: false,
    hasGym: false,
    hasBar: false,
    hasConference: false,
    hasTransfers: false,
    petFriendly: false,
  });

  // Step 3 — manual mode
  const [initialKnowledge, setInitialKnowledge] = useState('');

  // Step 3 — website mode (preview & confirm)
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ImportSuggestion | null>(null);
  // Per-row "include in import?" toggles
  const [includeVenues, setIncludeVenues] = useState<boolean[]>([]);
  const [includeMenu, setIncludeMenu] = useState<boolean[]>([]);
  const [includeServices, setIncludeServices] = useState<boolean[]>([]);
  const [includeKnowledge, setIncludeKnowledge] = useState<boolean[]>([]);
  const importStartedFor = useRef<string>('');

  const hasWebsite = website.trim().length > 0;
  const canAdvanceFromStep1 = name.trim().length > 0;

  function toggleFlag(key: keyof FacilityFlags) {
    setFlags({ ...flags, [key]: !flags[key] });
  }

  // Kick off the website import the first time the user reaches step 3 (and only if a website is set)
  useEffect(() => {
    if (step !== 3 || !hasWebsite) return;
    const target = website.trim();
    if (importStartedFor.current === target) return;
    importStartedFor.current = target;
    setImporting(true);
    setImportError(null);
    setSuggestions(null);
    websiteImport({ url: target, hotelName: name, city: address })
      .then((r) => {
        setSuggestions(r.suggestions);
        setIncludeVenues(r.suggestions.venues.map(() => true));
        setIncludeMenu(r.suggestions.menuItems.map(() => true));
        setIncludeServices(r.suggestions.services.map(() => true));
        setIncludeKnowledge(r.suggestions.knowledge.map(() => true));
      })
      .catch((err) => {
        setImportError(err?.response?.data?.error || err?.message || 'Could not read your website');
      })
      .finally(() => setImporting(false));
  }, [step, hasWebsite, website, name, address]);

  async function handleSubmit() {
    setError('');
    setSaving(true);
    try {
      // 1) Create the hotel with basics + flags + facility-detail fields from suggestions
      const payload: any = { name, ...flags };
      if (address.trim()) payload.address = address.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (email.trim()) payload.email = email.trim();
      if (website.trim()) payload.website = website.trim();
      if (initialKnowledge.trim()) payload.initialKnowledge = initialKnowledge.trim();

      const res = await createHotel(payload);
      const hotelId = res.hotel.id;

      // 2) Apply import (if we have suggestions)
      if (suggestions) {
        const importPayload: any = {
          flags: { ...flags, ...suggestions.flags },
          facilityDetails: suggestions.facilityDetails,
          venues: suggestions.venues.filter((_, i) => includeVenues[i]),
          menuItems: suggestions.menuItems.filter((_, i) => includeMenu[i]),
          services: suggestions.services.filter((_, i) => includeServices[i]),
          knowledge: suggestions.knowledge.filter((_, i) => includeKnowledge[i]),
        };
        await applyImport(hotelId, importPayload);
      }

      navigate(`/hotels/${hotelId}?welcome=1`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create hotel');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back to hotels
      </Link>

      <div className="max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>
        <p className="text-xs text-gray-400 mb-2">Step {step} of 3</p>

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

        {/* Step 1 */}
        {step === 1 && (
          <div className="bg-white rounded-xl border p-4 sm:p-8 space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome 👋</h1>
              <p className="text-sm text-gray-500 mt-1">Just a few quick questions — takes about a minute.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hotel name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Grand Oslo Hotel"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City / address <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Karl Johans gate 1, Oslo"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="+47 22 00 00 00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="hello@yourhotel.com"
                />
              </div>
            </div>

            {/* Website — the magic field */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <Globe size={16} className="text-blue-600" />
                Hotel website <span className="text-gray-400 font-normal">(optional, but recommended)</span>
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white"
                placeholder="https://yourhotel.no"
              />
              <p className="text-xs text-gray-600">
                ✨ Drop a URL and I'll read your menus, hours, and services to pre-fill everything. You'll get to confirm or correct each item before saving.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!canAdvanceFromStep1}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="bg-white rounded-xl border p-4 sm:p-8 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                What does <span className="text-blue-600">{name || 'your hotel'}</span> offer?
              </h2>
              <p className="text-sm text-gray-500 mt-1">Just tap what applies — you can always change this later.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FACILITIES.map((f) => {
                const Icon = f.icon;
                const isOn = flags[f.key];
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => toggleFlag(f.key)}
                    className={`flex items-start gap-3 p-3 border rounded-lg text-left transition ${
                      isOn ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} className={isOn ? 'text-blue-600 mt-0.5' : 'text-gray-500 mt-0.5'} />
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${isOn ? 'text-blue-900' : 'text-gray-900'}`}>{f.label}</div>
                      <div className="text-xs text-gray-500">{f.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button onClick={() => setStep(1)} className="flex items-center justify-center gap-2 bg-gray-100 border text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 font-medium">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={() => setStep(3)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium">
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            {hasWebsite ? (
              // ── Website import preview ──
              <div className="space-y-4">
                {importing && (
                  <div className="bg-white border rounded-xl p-8 text-center space-y-3">
                    <Loader size={32} className="animate-spin text-blue-600 mx-auto" />
                    <p className="text-sm text-gray-700">Reading your website…</p>
                    <p className="text-xs text-gray-400">{website}</p>
                    <p className="text-xs text-gray-400">This usually takes 10–20 seconds.</p>
                  </div>
                )}

                {importError && !importing && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-2">
                    <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Couldn't read the website</p>
                      <p className="text-xs mt-1">{importError}</p>
                      <p className="text-xs mt-2">No worries — you can still add details later via the AI Manager or the dashboard tabs. Click <em>Create hotel</em> when ready.</p>
                    </div>
                  </div>
                )}

                {suggestions && !importing && (
                  <SuggestionsReview
                    s={suggestions}
                    includeVenues={includeVenues}
                    setIncludeVenues={setIncludeVenues}
                    includeMenu={includeMenu}
                    setIncludeMenu={setIncludeMenu}
                    includeServices={includeServices}
                    setIncludeServices={setIncludeServices}
                    includeKnowledge={includeKnowledge}
                    setIncludeKnowledge={setIncludeKnowledge}
                  />
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                  <button onClick={() => setStep(2)} disabled={saving} className="flex items-center justify-center gap-2 bg-gray-100 border text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium">
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving || importing}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {saving ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {saving ? 'Creating…' : 'Create hotel & concierge'}
                  </button>
                </div>
              </div>
            ) : (
              // ── No website: manual free-text fallback ──
              <div className="bg-white rounded-xl border p-4 sm:p-8 space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">One last thing</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Anything important guests usually ask about? Wi-Fi password, breakfast hours, parking, quirks, house rules. (Optional — you can add this later.)
                  </p>
                </div>

                <div>
                  <textarea
                    value={initialKnowledge}
                    onChange={(e) => setInitialKnowledge(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder={`E.g. "Wi-Fi: GuestStay2026. Breakfast 7-10am. Free parking in the back lot."`}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
                  <ConciergeBell size={16} className="shrink-0 mt-0.5" />
                  <span>When you finish, we'll create your hotel and provision an AI concierge. You can refine details by chatting with the AI Manager!</span>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                  <button onClick={() => setStep(2)} disabled={saving} className="flex items-center justify-center gap-2 bg-gray-100 border text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium">
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button onClick={handleSubmit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                    {saving ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {saving ? 'Setting up…' : 'Create hotel & concierge'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

// ── Suggestions Review (compact, mobile-friendly) ──────────────────────

function SuggestionsReview({
  s,
  includeVenues,
  setIncludeVenues,
  includeMenu,
  setIncludeMenu,
  includeServices,
  setIncludeServices,
  includeKnowledge,
  setIncludeKnowledge,
}: {
  s: ImportSuggestion;
  includeVenues: boolean[];
  setIncludeVenues: (v: boolean[]) => void;
  includeMenu: boolean[];
  setIncludeMenu: (v: boolean[]) => void;
  includeServices: boolean[];
  setIncludeServices: (v: boolean[]) => void;
  includeKnowledge: boolean[];
  setIncludeKnowledge: (v: boolean[]) => void;
}) {
  const total =
    s.venues.length + s.menuItems.length + s.services.length + s.knowledge.length;

  if (total === 0) {
    return (
      <div className="bg-white border rounded-xl p-6 text-center space-y-2">
        <p className="text-sm text-gray-700 font-medium">I read your website but didn't find structured data</p>
        <p className="text-xs text-gray-500">No worries — you'll be able to add menus, services, and notes later via the AI Manager or the dashboard tabs.</p>
        {s.warnings.length > 0 && (
          <p className="text-xs text-amber-700 mt-2">{s.warnings.slice(0, 2).join(' · ')}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4 space-y-1">
        <h3 className="font-semibold text-gray-900">Found {total} item{total === 1 ? '' : 's'} on your website ✨</h3>
        <p className="text-xs text-gray-500">Review and uncheck anything you don't want imported. You can edit each item after creation.</p>
      </div>

      {s.venues.length > 0 && (
        <Section title={`Venues (${s.venues.length})`} accent="text-amber-600">
          {s.venues.map((v, i) => (
            <Row key={i} checked={includeVenues[i]} onToggle={() => setIncludeVenues(includeVenues.map((x, j) => (i === j ? !x : x)))}>
              <strong>{v.name}</strong>
              <span className="text-gray-500"> · {v.kind}</span>
              {v.hours && <span className="text-gray-500"> · 🕐 {v.hours}</span>}
              {v.location && <span className="text-gray-500"> · {v.location}</span>}
            </Row>
          ))}
        </Section>
      )}

      {s.menuItems.length > 0 && (
        <Section title={`Menu items (${s.menuItems.length})`} accent="text-amber-600">
          {s.menuItems.map((m, i) => (
            <Row key={i} checked={includeMenu[i]} onToggle={() => setIncludeMenu(includeMenu.map((x, j) => (i === j ? !x : x)))}>
              <strong>{m.name}</strong>
              {m.priceNok ? <span className="text-gray-700"> · {m.priceNok} kr</span> : <span className="text-gray-400"> · price not seen</span>}
              {m.category && <span className="text-gray-500"> · {m.category}</span>}
              {m.venueName && <span className="text-gray-500"> · @ {m.venueName}</span>}
              {m.description && <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>}
            </Row>
          ))}
        </Section>
      )}

      {s.services.length > 0 && (
        <Section title={`Services (${s.services.length})`} accent="text-purple-600">
          {s.services.map((sv, i) => (
            <Row key={i} checked={includeServices[i]} onToggle={() => setIncludeServices(includeServices.map((x, j) => (i === j ? !x : x)))}>
              <strong>{sv.name}</strong>
              {sv.priceNok ? <span className="text-gray-700"> · {sv.priceNok} kr</span> : null}
              {sv.durationMin ? <span className="text-gray-500"> · {sv.durationMin} min</span> : null}
              {sv.category && <span className="text-gray-500"> · {sv.category.replace('_', ' ')}</span>}
              {sv.description && <p className="text-xs text-gray-500 mt-0.5">{sv.description}</p>}
            </Row>
          ))}
        </Section>
      )}

      {s.knowledge.length > 0 && (
        <Section title={`Knowledge (${s.knowledge.length})`} accent="text-blue-600">
          {s.knowledge.map((k, i) => (
            <Row key={i} checked={includeKnowledge[i]} onToggle={() => setIncludeKnowledge(includeKnowledge.map((x, j) => (i === j ? !x : x)))}>
              <span className="text-xs uppercase tracking-wide text-gray-500">{k.category}</span>
              <p className="text-sm text-gray-800">{k.content}</p>
            </Row>
          ))}
        </Section>
      )}

      {s.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          <p className="font-medium mb-1">Notes</p>
          <ul className="list-disc list-inside space-y-0.5">
            {s.warnings.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: any }) {
  return (
    <div className="bg-white border rounded-xl">
      <div className={`px-4 py-2 border-b text-sm font-semibold ${accent}`}>{title}</div>
      <div className="p-2 space-y-1">{children}</div>
    </div>
  );
}

function Row({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: any }) {
  return (
    <label className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer ${checked ? 'bg-blue-50/40' : 'opacity-60'}`}>
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 shrink-0" />
      <div className="flex-1 text-sm text-gray-800">
        {children}
      </div>
      {checked && <Check size={14} className="text-blue-600 mt-1" />}
    </label>
  );
}
