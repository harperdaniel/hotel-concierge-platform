// EditDrawer \u2014 a right-side slide-in panel used for editing offerings
// (venues, services, menu items, etc.). Mobile-friendly: it goes full-width
// below the sm breakpoint and ~480px on desktop, animated in from the right.

import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function EditDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Lock body scroll while open so background doesn't jiggle.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30 animate-fadeIn"
        onClick={onClose}
      />
      {/* Drawer */}
      <aside className="w-full sm:w-[480px] sm:max-w-[100vw] bg-white shadow-xl flex flex-col animate-slideInRight">
        <header className="shrink-0 border-b px-4 sm:px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {children}
        </div>
      </aside>
    </div>
  );
}
