// ServiceEditForm \u2014 form used inside the EditDrawer to edit a service
// (spa treatments, transfers, activities, etc.): name, description,
// duration, price, category, integration link, fulfilment instructions.

import { useState } from 'react';
import { Loader, Save, Trash2 } from 'lucide-react';
import {
  updateService, deleteServiceApi,
  type Integration, type Service,
} from '../lib/api';
import { IntegrationPicker } from './IntegrationPicker';

const CATEGORIES = [
  { value: 'spa_treatment', label: 'Spa treatment' },
  { value: 'spa_access', label: 'Spa access pass' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'activity', label: 'Activity' },
  { value: 'general', label: 'General' },
];

export default function ServiceEditForm({
  hotelId,
  service,
  integrations,
  onSaved,
  onDeleted,
  onIntegrationsChanged,
}: {
  hotelId: string;
  service: Service;
  integrations: Integration[];
  onSaved: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
  onIntegrationsChanged?: () => void | Promise<void>;
}) {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description || '');
  const [duration, setDuration] = useState(service.durationMin ? String(service.durationMin) : '');
  const [priceNok, setPriceNok] = useState(service.price ? (service.price / 100).toFixed(2) : '');
  const [category, setCategory] = useState(service.category || 'general');
  const [integrationId, setIntegrationId] = useState<string | null>(service.integrationId || service.integration?.id || null);
  const [bookingInstructions, setBookingInstructions] = useState(service.bookingInstructions || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateService(service.id, {
        name: name.trim(),
        description: description.trim() || null,
        durationMin: duration ? parseInt(duration, 10) : null,
        price: priceNok ? Math.round(parseFloat(priceNok) * 100) : null,
        category: category as any,
        integrationId,
        bookingInstructions: bookingInstructions.trim() || null,
      });
      await onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${service.name}"?`)) return;
    setSaving(true);
    try {
      await deleteServiceApi(service.id);
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
      <Field label="Description (optional)">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Duration (min)">
          <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </Field>
        <Field label="Price (NOK)">
          <input type="number" step="0.01" value={priceNok} onChange={(e) => setPriceNok(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </Field>
      </div>
      <Field label="Category">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
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
          <Field label="Fulfilment notes (internal)">
            <textarea
              value={bookingInstructions}
              onChange={(e) => setBookingInstructions(e.target.value)}
              placeholder="e.g. 24h cancellation policy. Goes to spa booking sheet."
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </Field>
        )}
      </div>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-2 text-xs">{error}</div>}

      <div className="flex flex-wrap gap-2 pt-2">
        <button onClick={save} disabled={saving || !name.trim()} className="inline-flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
          {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
          Save changes
        </button>
        <button onClick={remove} disabled={saving} className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-3 py-2 rounded-lg hover:bg-rose-100 disabled:opacity-50 text-sm font-medium ml-auto">
          <Trash2 size={14} /> Delete
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
