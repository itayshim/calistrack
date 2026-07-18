import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, Search, X } from 'lucide-react';
import { taxonomyIdentity, type TaxonomyKind, uniqueTaxonomyValues } from '../utils/taxonomy';

const TAXONOMY_OPEN_EVENT = 'calistrack:floating-menu-open';
const VIEWPORT_GUTTER = 12;

interface PopoverPosition {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
}

interface ComboboxProps {
  label: string;
  value: string;
  options: string[];
  kind: Extract<TaxonomyKind, 'category' | 'movement_family'>;
  onChange: (value: string) => void;
  onCreate: (value: string) => Promise<string>;
  createLabel: string;
  searchLabel: string;
  error?: string;
}

export function TaxonomyCombobox({
  label,
  value,
  options,
  kind,
  onChange,
  onCreate,
  createLabel,
  searchLabel,
  error,
}: ComboboxProps) {
  const id = useId();
  const instanceId = useRef(id);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const filtered = useMemo(() => {
    const comparable = taxonomyIdentity(query, kind);
    return options.filter((option) => !comparable || taxonomyIdentity(option, kind).includes(comparable));
  }, [kind, options, query]);
  const exact = options.some((option) => taxonomyIdentity(option, kind) === taxonomyIdentity(query, kind));
  const close = (returnFocus = false) => {
    setOpen(false);
    setActiveIndex(-1);
    if (returnFocus) triggerRef.current?.focus();
  };
  const choose = (option: string) => {
    onChange(option);
    setQuery('');
    close(true);
  };
  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const availableWidth = Math.max(280, viewportWidth - VIEWPORT_GUTTER * 2);
    const width = Math.min(Math.max(rect.width, 280), Math.min(480, availableWidth));
    const preferredLeft =
      document.documentElement.dir === 'rtl' ? rect.right - width : rect.left;
    const left = Math.min(
      Math.max(VIEWPORT_GUTTER, preferredLeft),
      viewportWidth - width - VIEWPORT_GUTTER,
    );
    const below = viewportHeight - rect.bottom - VIEWPORT_GUTTER;
    const above = rect.top - VIEWPORT_GUTTER;
    const idealHeight = Math.min(Math.round(viewportHeight * 0.52), 420);
    const placeAbove = below < Math.min(280, idealHeight) && above > below;
    const maxHeight = Math.max(180, Math.min(idealHeight, placeAbove ? above - 8 : below - 8));
    setPosition({
      left,
      width,
      maxHeight,
      ...(placeAbove
        ? { bottom: viewportHeight - rect.top + 8 }
        : { top: rect.bottom + 8 }),
    });
  };
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onOtherOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instanceId.current) close();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) close();
    };
    const onViewportChange = () => updatePosition();
    document.addEventListener(TAXONOMY_OPEN_EVENT, onOtherOpen);
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      document.removeEventListener(TAXONOMY_OPEN_EVENT, onOtherOpen);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open]);
  const openMenu = () => {
    if (open) return close();
    document.dispatchEvent(new CustomEvent(TAXONOMY_OPEN_EVENT, { detail: instanceId.current }));
    setOpen(true);
    setActiveIndex(filtered.findIndex((option) => option === value));
  };
  const handleMenuKey = (event: KeyboardEvent<HTMLInputElement | HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return openMenu();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        if (!filtered.length) return -1;
        if (current < 0) return direction > 0 ? 0 : filtered.length - 1;
        return (current + direction + filtered.length) % filtered.length;
      });
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0 && filtered[activeIndex]) {
      event.preventDefault();
      choose(filtered[activeIndex]);
    }
  };
  const create = async () => {
    if (!query.trim() || exact || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(query);
      onChange(created);
      setQuery('');
      close(true);
    } finally {
      setCreating(false);
    }
  };
  return (
    <div>
      <label className="label" id={`${id}-label`}>{label}</label>
      <button
        ref={triggerRef}
        type="button"
        className="field flex w-full items-center justify-between text-start"
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        aria-invalid={!!error}
        onClick={openMenu}
        onKeyDown={handleMenuKey}
      >
        <span dir="auto" className="truncate">{value || searchLabel}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {error && <p role="alert" className="mt-1 text-sm font-bold text-red-500">{error}</p>}
      {open && position && createPortal(
        <div
          ref={popoverRef}
          data-testid="taxonomy-popover"
          data-theme-surface="opaque-elevated"
          dir={document.documentElement.dir || 'ltr'}
          className="taxonomy-popover modal-surface fixed z-[1000] isolate flex overflow-hidden rounded-2xl"
          style={{
            left: position.left,
            top: position.top,
            bottom: position.bottom,
            width: position.width,
            maxHeight: position.maxHeight,
          } satisfies CSSProperties}
        >
          <div className="taxonomy-search-header shrink-0 border-b border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-elevated">
            <label className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30 dark:border-white/10 dark:bg-panel">
              <Search size={18} aria-hidden="true" className="shrink-0" />
              <span className="sr-only">{searchLabel}</span>
              <input
                ref={searchRef}
                className="min-w-0 flex-1 bg-transparent outline-none"
                value={query}
                aria-controls={`${id}-listbox`}
                aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(-1);
                }}
                onKeyDown={(event) => {
                  handleMenuKey(event);
                  if (event.key === 'Enter' && activeIndex < 0 && !exact) {
                    event.preventDefault();
                    void create();
                  }
                }}
              />
            </label>
          </div>
          <div id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`} className="taxonomy-options grid min-h-0 flex-1 gap-1 overflow-y-auto overscroll-contain p-2">
            {filtered.map((option, index) => (
              <button
                type="button"
                role="option"
                id={`${id}-option-${index}`}
                aria-selected={option === value}
                key={option}
                className={`flex min-h-11 items-center justify-between rounded-xl px-3 text-start ${
                  index === activeIndex
                    ? 'bg-slate-200 text-slate-950 dark:bg-slate-700 dark:text-white'
                    : option === value
                      ? 'bg-brand/25 font-bold text-slate-950 dark:bg-brand/20 dark:text-brand'
                      : 'bg-white text-slate-800 hover:bg-slate-100 dark:bg-elevated dark:text-slate-100 dark:hover:bg-panel'
                }`}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <span dir="auto" className="truncate">{option}</span>
                {option === value && <Check size={18} aria-hidden="true" />}
              </button>
            ))}
          </div>
          {query.trim() && !exact && (
            <div className="shrink-0 border-t border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-elevated">
              <button type="button" className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-brand/20 px-3 font-bold text-slate-950 hover:bg-brand/30 disabled:opacity-50 dark:text-brand" disabled={creating} onClick={() => void create()}>
                <Plus size={18} aria-hidden="true" />
                <span>{createLabel}: <bdi>{query.trim()}</bdi></span>
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

interface ChipsProps {
  label: string;
  values: string[];
  options?: string[];
  kind: Extract<TaxonomyKind, 'muscle' | 'keyword'> | 'alias';
  onChange: (values: string[]) => void;
  onCreate?: (value: string) => Promise<string>;
  placeholder: string;
  createLabel?: string;
  suggestions?: string[];
}

export function ChipInput({
  label,
  values,
  options = [],
  kind,
  onChange,
  onCreate,
  placeholder,
  createLabel,
  suggestions = [],
}: ChipsProps) {
  const [draft, setDraft] = useState('');
  const normalizeKind = kind === 'alias' ? null : kind;
  const identity = (value: string) =>
    normalizeKind ? taxonomyIdentity(value, normalizeKind) : value.trim().toLocaleLowerCase();
  const add = async (raw: string) => {
    const pieces = raw.split(/[,\n]+/).map((item) => item.trim()).filter(Boolean);
    if (!pieces.length) return;
    const next = [...values];
    for (const piece of pieces) {
      let value = piece;
      const existing = options.find((option) => identity(option) === identity(piece));
      if (existing) value = existing;
      else if (onCreate && normalizeKind) value = await onCreate(piece);
      if (!next.some((item) => identity(item) === identity(value))) next.push(value);
    }
    onChange(normalizeKind ? uniqueTaxonomyValues(next, normalizeKind) : next);
    setDraft('');
  };
  const available = [...suggestions, ...options]
    .filter((option) => !values.some((value) => identity(value) === identity(option)))
    .filter((option) => !draft || identity(option).includes(identity(draft)))
    .slice(0, 6);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      void add(draft);
    }
    if (event.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1));
  };
  return (
    <label>
      <span className="label">{label}</span>
      <div className="field flex min-h-14 flex-wrap items-center gap-2 focus-within:ring-2 focus-within:ring-brand">
        {values.map((value) => (
          <span key={identity(value)} className="chip flex items-center gap-1">
            <bdi>{value}</bdi>
            <button type="button" className="rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10" aria-label={`${label}: ${value}`} onClick={() => onChange(values.filter((item) => identity(item) !== identity(value)))}>
              <X size={14} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          className="min-w-32 flex-1 bg-transparent outline-none"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => { if (draft.includes(',')) void add(draft); }}
          onPaste={(event) => {
            const text = event.clipboardData.getData('text');
            if (/[\n,]/.test(text)) {
              event.preventDefault();
              void add(text);
            }
          }}
        />
      </div>
      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {available.map((option) => (
            <button type="button" key={option} className="chip hover:border-brand hover:text-brand-dark dark:hover:text-brand" onClick={() => void add(option)}>
              <Plus size={13} className="inline" aria-hidden="true" /> <bdi>{option}</bdi>
            </button>
          ))}
          {draft.trim() && !options.some((option) => identity(option) === identity(draft)) && createLabel && (
            <button type="button" className="chip text-brand-dark dark:text-brand" onClick={() => void add(draft)}>{createLabel}</button>
          )}
        </div>
      )}
    </label>
  );
}
