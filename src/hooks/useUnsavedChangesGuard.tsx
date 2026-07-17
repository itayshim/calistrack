import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useI18n } from './useI18n';

export function useUnsavedChangesGuard(isDirty: boolean) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [pending, setPending] = useState<null | (() => void)>(null);

  useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const interceptLinks = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.origin !== window.location.origin) return;
      const destination = `${anchor.pathname}${anchor.search}${anchor.hash}`;
      if (destination === `${location.pathname}${location.search}${location.hash}`) return;
      event.preventDefault();
      event.stopPropagation();
      setPending(() => () => navigate(destination));
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', interceptLinks, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', interceptLinks, true);
    };
  }, [isDirty, navigate]);

  const request = useCallback((action: () => void) => {
    if (isDirty) setPending(() => action);
    else action();
  }, [isDirty]);

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      title={t('discardUnsavedTitle')}
      description={t('discardUnsavedBody')}
      confirmLabel={t('discardChanges')}
      cancelLabel={t('keepEditing')}
      onClose={() => setPending(null)}
      onConfirm={() => {
        const action = pending;
        setPending(null);
        action?.();
      }}
    />
  );
  return { request, dialog };
}
