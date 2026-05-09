import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { createHotel } from '../lib/api';
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
  { key: 'hasRestaurant', label: 'Restaurant', description: 'In-house dining, table reservations', icon: Utensils },
  { key: 'hasRoomService', label: 'Room service', description: 'In-room dining', icon: BedDouble },
  { key: 'hasSpa', label: 'Spa', description: 'Treatments and wellness', icon: Sparkles },
  { key: 'hasPool', label: 'Pool / wellness', description: 'Pool, sauna, hot tub', icon: Waves },
  { key: 'hasGym', label: 'Gym', description: 'Fitness room', icon: Dumbbell },
  { key: 'hasBar', label: 'Bar / lounge', description: 'Drinks and snacks', icon: Wine },
  { key: 'hasConference', label: 'Conference', description: 'Meeting rooms, events', icon: Briefcase },
  { key: 'hasTransfers', label: 'Airport transfers', description: 'Pickup/dropoff service', icon: Plane },
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

  // Step 3
  const [initialKnowledge, setInitialKnowledge] = useState('');

  function toggleFlag(key: keyof FacilityFlags) {
    setFlags({ ...flags, [key]: !flags[key] });
  }

  async function handleSubmit() {
    setError('');
    setSaving(true);
    try {
      const payload: any = { name, ...flags };
      if (address.trim()) payload.address = address.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (email.trim()) payload.email = email.trim();
      if (initialKnowledge.trim()) payload.initialKnowledge = initialKnowledge.trim();
      const res = await createHotel(payload);
      navigate(`/hotels/${res.hotel.id}?welcome=1`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create hotel');
    } finally {
      setSaving(false);
    }
  }

  const canAdvanceFromStep1 = name.trim().length > 0;

  return (
    <Layout>
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back to hotels
      </Link>

      <div className="max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mb-2">Step {step} of 3</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        {/* Step 1: The basics */}
        {step === 1 && (
          <div className="bg-white rounded-xl border p-4 sm:p-8 space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome 👋</h1>
              <p className="text-sm text-gray-500 mt-1">
                Let's set up your concierge. Just a few quick questions — takes about a minute.
              </p>
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
                  Hotel email <span className="text-gray-400 font-normal">(optional)</span>
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

            <button
              onClick={() => setStep(2)}
              disabled={!canAdvanceFromStep1}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Facilities */}
        {step === 2 && (
          <div className="bg-white rounded-xl border p-4 sm:p-8 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">What does <span className="text-blue-600">{name || 'your hotel'}</span> offer?</h2>
              <p className="text-sm text-gray-500 mt-1">
                Just tap what applies — we'll fill in the details later. You can always change this.
              </p>
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
                      isOn
                        ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
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
              <button
                onClick={() => setStep(1)}
                className="flex items-center justify-center gap-2 bg-gray-100 border text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 font-medium"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium"
              >
                Next <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Free-text "anything else?" */}
        {step === 3 && (
          <div className="bg-white rounded-xl border p-4 sm:p-8 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">One last thing</h2>
              <p className="text-sm text-gray-500 mt-1">
                Anything important guests usually ask about? Wi-Fi password, breakfast hours, parking,
                quirks, house rules — anything off the top of your head. (Optional — you can add this later.)
              </p>
            </div>

            <div>
              <textarea
                value={initialKnowledge}
                onChange={(e) => setInitialKnowledge(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder={`E.g. "Wi-Fi password is GuestStay2026. Breakfast 7-10am in the dining room. Free parking in the back lot. Late checkout 500 NOK if available."`}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
              <ConciergeBell size={16} className="shrink-0 mt-0.5" />
              <span>
                When you finish, we'll create your hotel and provision an AI concierge.
                You can then refine details by chatting with it directly!
              </span>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button
                onClick={() => setStep(2)}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-gray-100 border text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {saving ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {saving ? 'Setting up…' : 'Create hotel & concierge'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
