import { RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function PwaUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false),
    [offlineReady, setOfflineReady] = useState(false),
    update = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  useEffect(() => {
    update.current = registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => setOfflineReady(true),
    });
  }, []);
  if (!needRefresh && !offlineReady) return null;
  return (
    <aside
      role="status"
      aria-live="polite"
      className="pwa-update-position fixed inset-x-4 z-[60] mx-auto max-w-md rounded-3xl border border-white/[.08] bg-elevated p-4 text-white shadow-soft"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">
          <RefreshCw size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black">
            {needRefresh ? 'A new CalisTrack version is ready' : 'CalisTrack is ready offline'}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {needRefresh
              ? 'Update now to get the latest improvements.'
              : 'The app shell can now open without a connection.'}
          </p>
          {needRefresh && (
            <button
              className="mt-3 rounded-xl bg-brand px-4 py-2 text-sm font-black text-ink"
              onClick={() => void update.current?.(true)}
            >
              Update and reload
            </button>
          )}
        </div>
        <button
          aria-label="Dismiss"
          className="p-2 text-slate-500"
          onClick={() => {
            setNeedRefresh(false);
            setOfflineReady(false);
          }}
        >
          <X size={18} />
        </button>
      </div>
    </aside>
  );
}
