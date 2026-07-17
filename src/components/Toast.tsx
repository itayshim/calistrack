import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
export function Toast() {
  const text = useAppStore((s) => s.toast),
    set = useAppStore((s) => s.setToast);
  const { t, direction } = useI18n();
  useEffect(() => {
    if (!text) return;
    const id = setTimeout(() => set(null), 2600);
    return () => clearTimeout(id);
  }, [text, set]);
  return text ? (
    <div
      role="status" aria-live="polite" dir={direction}
      className="fixed inset-x-4 z-50 mx-auto flex w-auto max-w-[420px] items-start gap-3 break-words rounded-2xl bg-brand px-5 py-4 text-start font-black text-ink shadow-glow [bottom:calc(6.5rem+env(safe-area-inset-bottom))] md:bottom-6"
    >
      <span className="min-w-0 flex-1">{text}</span>
      <button aria-label={t('dismiss')} className="shrink-0 rounded-full p-1" onClick={() => set(null)}><X size={18} /></button>
    </div>
  ) : null;
}
