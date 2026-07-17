import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
export function Toast() {
  const text = useAppStore((s) => s.toast),
    set = useAppStore((s) => s.setToast);
  useEffect(() => {
    if (!text) return;
    const id = setTimeout(() => set(null), 2600);
    return () => clearTimeout(id);
  }, [text, set]);
  return text ? (
    <div
      role="status"
      className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-rise rounded-2xl bg-brand px-5 py-4 text-center font-black text-ink shadow-glow md:bottom-6"
    >
      {text}
    </div>
  ) : null;
}
