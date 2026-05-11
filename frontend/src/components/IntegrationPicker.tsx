// IntegrationPicker \u2014 dropdown used by every offering edit screen to link
// (or unlink) an Integration. Includes an inline "Create a manual queue"
// shortcut so staff can go from zero to bookable in two clicks.

import { useState } from 'react';
import { Plus, Loader, BookCheck, Info, AlertTriangle } from 'lucide-react';
import {
  createIntegration,
  type Integration,
} from '../lib/api';
import { INTEGRATION_KINDS } from './IntegrationsTab';

export function IntegrationPicker({
  hotelId,
  integrations,
  value,
  onChange,
  onIntegrationsChanged,
}: {
  hotelId: string;
  integrations: Integration[];
  value: string | null;
  onChange: (newId: string | null) => void;
  onIntegrationsChanged?: () => void | Promise<void>;
}) {
  const [creatingManual, setCreatingManual] = useState(false);
  const selected = value ? integrations.find((i) => i.id === value) : null;
  const isBookable = !!selected && selected.status !== 'error';

  async function createManualQueue() {
    setCreatingManual(true);
    try {
      const res = await createIntegration(hotelId, {
        name: 'Manual queue',
        kind: 'manual_queue',
      });
      onChange(res.integration.id);
      await onIntegrationsChanged?.();
    } finally {
      setCreatingManual(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="">\u2014 Info only (no integration) \u2014</option>
          {integrations.map((i) => {
            const meta = INTEGRATION_KINDS[i.kind];
            const statusTag = i.status === 'error' ? ' \u26a0\ufe0f error' : i.status === 'untested' ? ' (untested)' : '';
            return (
              <option key={i.id} value={i.id}>{i.name} \u00b7 {meta?.label || i.kind}{statusTag}</option>
            );
          })}
        </select>
        {integrations.length === 0 && (
          <button
            type="button"
            onClick={createManualQueue}
            disabled={creatingManual}
            className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs px-2.5 py-2 rounded-lg hover:bg-emerald-700 whitespace-nowrap"
          >
            {creatingManual ? <Loader size={12} className="animate-spin" /> : <Plus size={12} />}
            Create manual queue
          </button>
        )}
      </div>
      {selected ? (
        isBookable ? (
          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <BookCheck size={12} />
            Bookable via <strong>{selected.name}</strong>. {selected.status === 'untested' && (
              <span className="text-amber-700">Hasn\u2019t been tested yet \u2014 you may want to run a test from the Integrations tab.</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-rose-700">
            <AlertTriangle size={12} />
            The selected integration is in error state \u2014 this offering will be treated as INFO ONLY by the concierge until you fix it.
          </div>
        )
      ) : (
        <div className="flex items-start gap-2 text-xs text-amber-700">
          <Info size={12} className="mt-0.5 shrink-0" />
          Info only. The concierge will describe this offering but won\u2019t take a booking \u2014 guests are sent to the front desk or the venue directly. {integrations.length > 0 && 'Pick an integration above to make it bookable.'}
        </div>
      )}
    </div>
  );
}

// Read-only badge variant for rows in the list view: shows the bookable
// status without an inline integration picker (since list rows would get
// cluttered). Click \u2014 if a click handler is provided \u2014 should open the
// row's edit drawer.

export function BookableBadge({
  integration,
  onClick,
  size = 'sm',
  title,
}: {
  integration?: Integration | null;
  onClick?: () => void;
  size?: 'sm' | 'xs';
  title?: string;
}) {
  const bookable = !!integration && integration.status !== 'error';
  const errored = !!integration && integration.status === 'error';
  const pad = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  const base = 'inline-flex items-center gap-1 rounded-full font-medium border whitespace-nowrap';
  const tone = errored
    ? 'bg-rose-50 text-rose-800 border-rose-200'
    : bookable
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : 'bg-amber-50 text-amber-800 border-amber-200';
  const Icon = errored ? AlertTriangle : bookable ? BookCheck : Info;
  const label = errored
    ? 'Bookable \u2014 integration error'
    : bookable
      ? `Bookable\u2009\u00b7\u2009${integration!.name}`
      : 'Info only';
  const tooltip =
    title ||
    (bookable
      ? `The concierge can take bookings; they route through "${integration!.name}".`
      : errored
        ? `Integration "${integration!.name}" is in error state \u2014 fix it in the Integrations tab. Treated as info only meanwhile.`
        : 'No integration linked. The concierge will describe this offering but will not take a booking.');
  if (!onClick) {
    return (
      <span className={`${base} ${tone} ${pad}`} title={tooltip}>
        <Icon size={size === 'xs' ? 11 : 13} />
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={`${base} ${tone} ${pad} hover:brightness-95`}
    >
      <Icon size={size === 'xs' ? 11 : 13} />
      {label}
    </button>
  );
}
