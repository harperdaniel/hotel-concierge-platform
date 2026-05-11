// VenueEditForm \u2014 form used inside the EditDrawer to edit an existing
// venue: name, kind, hours, location, description, integration link,
// fulfilment instructions, and (potentially) delete.

import { useState } from 'react';
import { Loader, Save, Trash2 } from 'lucide-react';
import {
  updateVenue, deleteVenue,
  type Integration, type Venue,
} from '../lib/api';
import { IntegrationPicker } from './IntegrationPicker';

const VENUE_KINDS: { value: string; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'lounge', label: 'Lounge' },
  { value: 'cafe', label: 'Caf\u00e9' },
  { value: 'room_service', label: 'Room service kitchen' },
];

export default function VenueEditForm({
  hotelId,
  venue,
  integrations,
  onSaved,
  onDeleted,
  onIntegrationsChanged,
}: {
  hotelId: string;
  venue: Venue;
  integrations: Integration[];
  onSaved: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
  onIntegrationsChanged?: () => void | Promise<void>;
}) {
  const [name, setName] = useState(venue.name);
  const [kind, setKind] = useState(venue.kind || 'restaurant');
  const [hours, setHours] = useState(venue.hours || '');
  const [location, setLocation] = useState(venue.location || '');
  const [description, setDescription] = useState(venue.description || '');
  const [integrationId, setIntegrationId] = useState<string | null>(venue.integrationId || venue.integration?.id || null);
  const [bookingInstructions, setBookingInstructions] = useState(venue.bookingInstructions || '');
  const [active, setActive] = useState(venue.active !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateVenue(venue.id, {
        name: name.trim(),
        kind: kind as any,
        hours: hours.trim() || null,
        location: location.trim() || null,
        description: description.trim() || null,
        integrationId,
        bookingInstructions: bookingInstructions.trim() || null,
        active,
      });
      await onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${venue.name}"? This also unlinks its menu items.`)) return;
    setSaving(true);
    try {
      await deleteVenue(venue.id);
      await onDeleted();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to delete');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
      </Field>
      <Field label="Kind">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
          {VENUE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Hours">
          <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="17:00\u201322:00" className="w-full px-3 py-2 border rounded-lg text-sm" />
        </Field>
        <Field label="Location">
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lobby level" className="w-full px-3 py-2 border rounded-lg text-sm" />
        </Field>
      </div>
      <Field label="Description (optional)">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
      </Field>

      <div className="pt-2 border-t">
        <Field label="Bookable through integration">
          <IntegrationPicker
            hotelId={hotelId}
            integrations={integrations}
            value={integrationId}
            onChange={setIntegrationId}
            onIntegrationsChanged={onIntegrationsChanged}
          />
        </Field>
        {integrationId && (
          <Field label="Fulfilment notes (internal \u2014 not shown to guests)">
            <textarea
              value={bookingInstructions}
              onChange={(e) => setBookingInstructions(e.target.value)}
              placeholder="e.g. Walk-in only after 21:00. Calls go to extension 9."
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </Field>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Active (visible to the concierge)
      </label>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-2 text-xs">{error}</div>}

      <div className="flex flex-wrap gap-2 pt-2">
        <button onClick={save} disabled={saving || !name.trim()} className="inline-flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
          {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
          Save changes
        </button>
        <button onClick={remove} disabled={saving} className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-3 py-2 rounded-lg hover:bg-rose-100 disabled:opacity-50 text-sm font-medium ml-auto">
          <Trash2 size={14} /> Delete venue
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
