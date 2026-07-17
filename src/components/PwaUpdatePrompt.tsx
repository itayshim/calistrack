import { RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useI18n } from '../hooks/useI18n';

export function PwaUpdatePrompt() {
  const { t } = useI18n();
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
      className="modal-surface pwa-update-position fixed inset-x-4 z-[60] mx-auto max-w-md rounded-3xl p-4"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">
          <RefreshCw size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black">
            {needRefresh ? t('updateReadyTitle') : t('offlineReadyTitle')}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {needRefresh
              ? t('updateReadyDescription')
              : t('offlineReadyDescription')}
          </p>
          {needRefresh && (
            <button
              className="mt-3 rounded-xl bg-brand px-4 py-2 text-sm font-black text-ink"
              onClick={() => void update.current?.(true)}
            >
              {t('updateAndReload')}
            </button>
          )}
        </div>
        <button
          aria-label={t('dismiss')}
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
