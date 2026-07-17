import { useEffect, useRef } from 'react';
import { useI18n } from '../hooks/useI18n';
export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      className="w-[calc(100%-2rem)] max-w-sm rounded-4xl border border-white/[.08] bg-elevated p-6 text-white shadow-soft backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      aria-labelledby="dialog-title"
    >
      <h2 id="dialog-title" className="text-2xl font-black tracking-tight">
        {title}
      </h2>
      <p className="mb-6 mt-3 leading-relaxed text-slate-400">{description}</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          className="btn-danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {t('confirm')}
        </button>
        <button className="btn-secondary" onClick={onClose}>
          {t('cancel')}
        </button>
      </div>
    </dialog>
  );
}
