import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

export function AdminSessionExpiredDialog() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const signInRef = useRef<HTMLButtonElement>(null);
  const returnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    signInRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[1100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
        }
        if (event.key === 'Tab') {
          const first = signInRef.current;
          const last = returnRef.current;
          if (!first || !last) return;
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-session-expired-title"
        aria-describedby="admin-session-expired-description"
        className="modal-surface w-full max-w-md rounded-4xl p-6 text-center sm:p-8"
      >
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-orange-500/15 text-orange-600 dark:text-orange-300">
          <ShieldAlert size={30} aria-hidden="true" />
        </span>
        <h1 id="admin-session-expired-title" className="mt-5 text-2xl font-black">
          {t('adminSessionExpiredTitle')}
        </h1>
        <p id="admin-session-expired-description" className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
          {t('adminSessionExpiredDescription')}
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button ref={signInRef} className="btn-primary" onClick={() => navigate('/admin/login')}>
            {t('signInAgain')}
          </button>
          <button ref={returnRef} className="btn-secondary" onClick={() => navigate('/')}>
            {t('returnToApp')}
          </button>
        </div>
      </section>
    </div>
  );
}
