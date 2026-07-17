import { useEffect, useRef } from 'react';
import { useI18n } from '../hooks/useI18n';
export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onClose,
  confirmLabel,
  cancelLabel,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      className="modal-surface w-[calc(100%-2rem)] max-w-sm rounded-4xl p-6 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
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
          {confirmLabel ?? t('confirm')}
        </button>
        <button className="btn-secondary" onClick={onClose}>
          {cancelLabel ?? t('cancel')}
        </button>
      </div>
    </dialog>
  );
}
