// IntegrationsTab \u2014 manage the hotel's booking integrations (manual queue,
// webhooks, email, OpenTable, Google Calendar). Each integration is a
// reusable record that venues, services, and the hotel-level room-service
// flow can link to in order to become bookable.

import { useEffect, useState } from 'react';
import {
  Plus, Trash2, RefreshCw, CheckCircle2, AlertTriangle, CircleDashed,
  Webhook, Mail, Calendar, ClipboardList, Globe, Loader, KeyRound,
} from 'lucide-react';
import {
  listIntegrations, createIntegration, updateIntegration, deleteIntegration,
  testIntegration,
  type Integration, type IntegrationKind,
} from '../lib/api';

// Per-kind metadata: label, icon, helper text, required fields, secret fields.
export const INTEGRATION_KINDS: Record<IntegrationKind, {
  label: string;
  icon: any;
  blurb: string;
  endpointLabel: string | null;
  endpointPlaceholder: string;
  authFields: Array<{ key: string; label: string; placeholder: string; type?: 'text' | 'password' }>;
}> = {
  manual_queue: {
    label: 'Manual queue',
    icon: ClipboardList,
    blurb: 'No external system. Bookings show up in the dashboard\u2019s pending-bookings list for staff to confirm. Recommended starting point.',
    endpointLabel: null,
    endpointPlaceholder: '',
    authFields: [],
  },
  custom_webhook: {
    label: 'Custom webhook',
    icon: Webhook,
    blurb: 'Bookings are POSTed as JSON to a URL of your choice (Zapier, your PMS, an internal automation, anything).',
    endpointLabel: 'Webhook URL',
    endpointPlaceholder: 'https://api.example.com/bookings',
    authFields: [
      { key: 'headerName', label: 'Auth header name (optional)', placeholder: 'e.g. Authorization or X-API-Key' },
      { key: 'headerValue', label: 'Auth header value (kept encrypted)', placeholder: 'Bearer \u2026', type: 'password' },
    ],
  },
  email: {
    label: 'Email',
    icon: Mail,
    blurb: 'Bookings are emailed to the address you set. Simple and low-tech \u2014 great for small hotels.',
    endpointLabel: 'Recipient email',
    endpointPlaceholder: 'bookings@example.com',
    authFields: [],
  },
  opentable: {
    label: 'OpenTable',
    icon: Calendar,
    blurb: 'OpenTable account integration. v1 placeholder \u2014 full implementation coming. Enter the account/restaurant id; we\u2019ll validate it but not send live bookings yet.',
    endpointLabel: 'OpenTable restaurant id',
    endpointPlaceholder: '',
    authFields: [
      { key: 'apiKey', label: 'API key (kept encrypted)', placeholder: '\u2026', type: 'password' },
    ],
  },
  google_calendar: {
    label: 'Google Calendar',
    icon: Calendar,
    blurb: 'Bookings are added as events on a Google Calendar. v1 placeholder \u2014 full OAuth flow coming.',
    endpointLabel: 'Calendar id',
    endpointPlaceholder: 'staff@example.com or a calendar id',
    authFields: [],
  },
};

function StatusBadge({ status }: { status: Integration['status'] }) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 size={12} /> Tested
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-800 border border-rose-200">
        <AlertTriangle size={12} /> Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-700 border border-gray-200">
      <CircleDashed size={12} /> Untested
    </span>
  );
}

export default function IntegrationsTab({ hotelId, onChanged }: { hotelId: string; onChanged?: () => void }) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await listIntegrations(hotelId);
      setIntegrations(res.integrations);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, [hotelId]);

  async function handleTest(id: string) {
    setBusy(id);
    try {
      await testIntegration(id);
      await refresh();
      onChanged?.();
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(integration: Integration) {
    const usageCount = (integration._count?.venues || 0) + (integration._count?.services || 0) + (integration._count?.hotelsAsRoomService || 0);
    const msg = usageCount > 0
      ? `Delete "${integration.name}"? It's linked to ${usageCount} offering(s) \u2014 they will revert to INFO ONLY.`
      : `Delete "${integration.name}"?`;
    if (!confirm(msg)) return;
    setBusy(integration.id);
    try {
      await deleteIntegration(integration.id);
      await refresh();
      onChanged?.();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Integrations</h3>
          <p className="text-sm text-gray-500 max-w-2xl">
            Integrations are how bookings actually flow into your systems. Link a venue or service to an integration to make it <strong>bookable</strong> through the concierge. Without a working integration, an offering is <strong>info only</strong> \u2014 the concierge describes it but tells guests to call a human to book.
          </p>
        </div>
        {!showAdd && (
          <button
            onClick={() => { setEditing(null); setShowAdd(true); setError(null); }}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shrink-0"
          >
            <Plus size={16} /> Add integration
          </button>
        )}
      </div>

      {showAdd && (
        <IntegrationForm
          hotelId={hotelId}
          initial={null}
          onCancel={() => setShowAdd(false)}
          onSaved={async () => { setShowAdd(false); await refresh(); onChanged?.(); }}
          setError={setError}
        />
      )}

      {editing && (
        <IntegrationForm
          hotelId={hotelId}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await refresh(); onChanged?.(); }}
          setError={setError}
        />
      )}

      {error && <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-800">{error}</div>}

      {loading ? (
        <div className="text-center text-gray-400 py-8"><Loader className="inline animate-spin" size={20} /></div>
      ) : integrations.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-medium">No integrations yet.</p>
          <p className="mt-1">
            Without integrations, the concierge cannot book a single thing for guests \u2014 it can only describe offerings and send them to the front desk. The easiest way to start is the <strong>Manual queue</strong> integration: bookings show up in your dashboard, your staff confirms them, no API setup needed.
          </p>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="mt-3 inline-flex items-center gap-1 bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 text-xs font-medium"
            >
              <Plus size={14} /> Add your first integration
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {integrations.map((i) => {
            const meta = INTEGRATION_KINDS[i.kind] || { label: i.kind, icon: Globe, blurb: '', endpointLabel: null, endpointPlaceholder: '', authFields: [] };
            const Icon = meta.icon;
            const usage = (i._count?.venues || 0) + (i._count?.services || 0) + (i._count?.hotelsAsRoomService || 0);
            return (
              <div key={i.id} className="bg-white border rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <Icon size={22} className="text-blue-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{i.name}</h4>
                      <span className="text-xs font-medium text-gray-500">{meta.label}</span>
                      <StatusBadge status={i.status} />
                      {usage > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          {usage} linked
                        </span>
                      )}
                    </div>
                    {i.endpoint && (
                      <p className="mt-1 text-xs text-gray-500 break-all">{i.endpoint}</p>
                    )}
                    {i.authSummary && Object.values(i.authSummary).some(Boolean) && (
                      <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                        <KeyRound size={12} />
                        {Object.entries(i.authSummary).filter(([_, v]) => v).map(([k]) => k.replace(/^has/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()).join(', ')} stored (encrypted)
                      </p>
                    )}
                    {i.status === 'error' && i.lastError && (
                      <p className="mt-1 text-xs text-rose-700">Last error: {i.lastError}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={() => handleTest(i.id)}
                      disabled={busy === i.id}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                    >
                      {busy === i.id ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Test
                    </button>
                    <button
                      onClick={() => { setEditing(i); setShowAdd(false); setError(null); }}
                      className="text-xs px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(i)}
                      disabled={busy === i.id}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IntegrationForm({
  hotelId,
  initial,
  onCancel,
  onSaved,
  setError,
}: {
  hotelId: string;
  initial: Integration | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
  setError: (e: string | null) => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [kind, setKind] = useState<IntegrationKind>(initial?.kind || 'manual_queue');
  const [endpoint, setEndpoint] = useState(initial?.endpoint || '');
  const [authFields, setAuthFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const meta = INTEGRATION_KINDS[kind];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const auth: Record<string, string> = {};
      for (const [k, v] of Object.entries(authFields)) {
        if (v && v.trim()) auth[k] = v.trim();
      }
      const payload: any = {
        name: name.trim(),
        kind,
        endpoint: endpoint.trim() || null,
      };
      if (Object.keys(auth).length > 0) payload.auth = auth;
      if (initial) {
        await updateIntegration(initial.id, payload);
      } else {
        await createIntegration(hotelId, payload);
      }
      await onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white border-2 border-blue-200 rounded-xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">{initial ? `Edit integration` : 'New integration'}</h4>
        <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Manual queue \u2014 main building"
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Kind</label>
        <select
          value={kind}
          onChange={(e) => { setKind(e.target.value as IntegrationKind); setAuthFields({}); }}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          disabled={!!initial}
          title={initial ? "Kind can't be changed after creation \u2014 delete and recreate instead." : ''}
        >
          {(Object.keys(INTEGRATION_KINDS) as IntegrationKind[]).map((k) => (
            <option key={k} value={k}>{INTEGRATION_KINDS[k].label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">{meta.blurb}</p>
      </div>

      {meta.endpointLabel && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{meta.endpointLabel}</label>
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder={meta.endpointPlaceholder}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      )}

      {meta.authFields.length > 0 && (
        <div className="space-y-2 bg-gray-50 border rounded-lg p-3">
          <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
            <KeyRound size={12} /> Secrets (encrypted at rest)
          </p>
          {meta.authFields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-gray-600 mb-0.5">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={authFields[f.key] || ''}
                onChange={(e) => setAuthFields({ ...authFields, [f.key]: e.target.value })}
                placeholder={initial && initial.authSummary && (initial.authSummary as any)[`has${f.key.charAt(0).toUpperCase() + f.key.slice(1)}`] ? '\u2022\u2022\u2022\u2022 stored \u2014 leave blank to keep' : f.placeholder}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                autoComplete="off"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="inline-flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? <Loader size={14} className="animate-spin" /> : initial ? <CheckCircle2 size={14} /> : <Plus size={14} />}
          {initial ? 'Save changes' : 'Create integration'}
        </button>
      </div>
    </form>
  );
}
