import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

const MENU_OPEN_EVENT = 'calistrack:floating-menu-open';
const VIEWPORT_GUTTER = 12;

interface Position {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

export interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
  searchLabel?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  allowCreate?: boolean;
  createLabel?: string;
  onCreate?: (query: string) => Promise<string>;
  normalizeSearch?: (value: string) => string;
  testId?: string;
  surfaceClassName?: string;
}

function positionFor(trigger: HTMLElement, contentWidth?: number): Position {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const availableWidth = Math.max(240, viewportWidth - VIEWPORT_GUTTER * 2);
  const width = Math.min(Math.max(contentWidth ?? rect.width, 240), Math.min(480, availableWidth));
  const preferredLeft = document.documentElement.dir === 'rtl' ? rect.right - width : rect.left;
  const left = Math.min(Math.max(VIEWPORT_GUTTER, preferredLeft), viewportWidth - width - VIEWPORT_GUTTER);
  const below = viewportHeight - rect.bottom - VIEWPORT_GUTTER;
  const above = rect.top - VIEWPORT_GUTTER;
  const idealHeight = Math.min(Math.round(viewportHeight * 0.52), 420);
  const placeAbove = below < Math.min(240, idealHeight) && above > below;
  const maxHeight = Math.max(160, Math.min(idealHeight, (placeAbove ? above : below) - 8));
  return {
    left,
    width,
    maxHeight,
    ...(placeAbove ? { bottom: viewportHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
  };
}

function useFloatingSurface(open: boolean, close: (focus?: boolean) => void, triggerRef: RefObject<HTMLElement | null>) {
  const instanceId = useRef(crypto.randomUUID());
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const update = useCallback(() => {
    if (triggerRef.current) setPosition(positionFor(triggerRef.current));
  }, [triggerRef]);
  useLayoutEffect(() => {
    if (open) update();
  }, [open, update]);
  useEffect(() => {
    if (!open) return;
    const onOtherOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instanceId.current) close();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !surfaceRef.current?.contains(target)) close();
    };
    const updatePosition = () => update();
    document.addEventListener(MENU_OPEN_EVENT, onOtherOpen);
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener(MENU_OPEN_EVENT, onOtherOpen);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [close, open, triggerRef, update]);
  const announceOpen = () => document.dispatchEvent(new CustomEvent(MENU_OPEN_EVENT, { detail: instanceId.current }));
  return { position, surfaceRef, announceOpen };
}

export function Select({
  label,
  value,
  options,
  onChange,
  searchable = false,
  searchLabel = label,
  placeholder,
  error,
  className,
  disabled,
  allowCreate,
  createLabel,
  onCreate,
  normalizeSearch = (input) => input.trim().toLocaleLowerCase(),
  testId = 'select-popover',
  surfaceClassName = '',
}: SelectProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [creating, setCreating] = useState(false);
  const typeahead = useRef('');
  const typeaheadTimer = useRef<number | undefined>(undefined);
  const close = (focus = false) => {
    setOpen(false);
    setActiveIndex(-1);
    if (focus) triggerRef.current?.focus();
  };
  const { position, surfaceRef, announceOpen } = useFloatingSurface(open, close, triggerRef);
  const filtered = useMemo(() => {
    const needle = normalizeSearch(query);
    return options.filter((option) => !needle || normalizeSearch(option.label).includes(needle));
  }, [normalizeSearch, options, query]);
  const selected = options.find((option) => option.value === value);
  const exact = options.some((option) => normalizeSearch(option.label) === normalizeSearch(query));
  const openMenu = () => {
    if (disabled) return;
    if (open) return close();
    announceOpen();
    setOpen(true);
    setActiveIndex(Math.max(0, filtered.findIndex((option) => option.value === value)));
  };
  useLayoutEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => searchable ? searchRef.current?.focus() : surfaceRef.current?.focus());
  }, [open, searchable, surfaceRef]);
  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setQuery('');
    close(true);
  };
  const move = (direction: 1 | -1) => {
    setActiveIndex((current) => {
      if (!filtered.length) return -1;
      let next = current;
      do next = (next + direction + filtered.length) % filtered.length;
      while (filtered[next]?.disabled && next !== current);
      return next;
    });
  };
  const handleKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openMenu();
      else move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(filtered.length - 1);
    } else if ((event.key === 'Enter' || event.key === ' ') && !searchable) {
      event.preventDefault();
      if (!open) openMenu();
      else if (activeIndex >= 0 && filtered[activeIndex]) choose(filtered[activeIndex]);
    } else if (event.key === 'Enter' && open && activeIndex >= 0 && filtered[activeIndex]) {
      event.preventDefault();
      choose(filtered[activeIndex]);
    } else if (!searchable && !event.ctrlKey && !event.metaKey && event.key.length === 1) {
      typeahead.current += event.key.toLocaleLowerCase();
      window.clearTimeout(typeaheadTimer.current);
      typeaheadTimer.current = window.setTimeout(() => { typeahead.current = ''; }, 500);
      const index = options.findIndex((option) => option.label.toLocaleLowerCase().startsWith(typeahead.current));
      if (index >= 0) {
        if (!open) openMenu();
        setActiveIndex(index);
      }
    }
  };
  const create = async () => {
    if (!onCreate || !query.trim() || exact || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(query.trim());
      onChange(created);
      setQuery('');
      close(true);
    } finally {
      setCreating(false);
    }
  };
  return (
    <div className={className}>
      <label className="label" id={`${id}-label`}>{label}</label>
      <button
        ref={triggerRef}
        type="button"
        className="field flex w-full items-center justify-between gap-3 text-start"
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
        aria-invalid={!!error}
        disabled={disabled}
        onClick={openMenu}
        onKeyDown={handleKeys}
      >
        <span dir="auto" className="truncate">{selected?.label ?? placeholder ?? label}</span>
        <ChevronDown size={18} aria-hidden="true" className={`shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {error && <p role="alert" className="mt-1 text-sm font-bold text-red-500">{error}</p>}
      {open && position && createPortal(
        <div
          ref={surfaceRef}
          tabIndex={-1}
          data-testid={testId}
          data-theme-surface="opaque-elevated"
          dir={document.documentElement.dir || 'ltr'}
          className={`floating-menu-surface modal-surface fixed z-[1000] isolate flex overflow-hidden rounded-2xl ${surfaceClassName}`}
          style={{ ...position } satisfies CSSProperties}
          onKeyDown={searchable ? undefined : handleKeys}
        >
          {searchable && (
            <div className="floating-menu-search shrink-0 border-b border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-elevated">
              <label className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30 dark:border-white/10 dark:bg-panel">
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">{searchLabel}</span>
                <input
                  ref={searchRef}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  value={query}
                  placeholder={searchLabel}
                  onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
                  onKeyDown={handleKeys}
                />
              </label>
            </div>
          )}
          <div id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`} className="floating-menu-options grid min-h-0 flex-1 gap-1 overflow-y-auto overscroll-contain p-2">
            {filtered.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                id={`${id}-option-${index}`}
                aria-selected={option.value === value}
                aria-disabled={option.disabled}
                disabled={option.disabled}
                className={`floating-menu-row ${index === activeIndex ? 'is-highlighted' : ''} ${option.value === value ? 'is-selected' : ''}`}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <span className="min-w-0"><span dir="auto" className="block truncate">{option.label}</span>{option.description && <span className="block truncate text-xs text-slate-500">{option.description}</span>}</span>
                {option.value === value && <Check size={18} aria-hidden="true" className="shrink-0" />}
              </button>
            ))}
          </div>
          {allowCreate && query.trim() && !exact && (
            <div className="shrink-0 border-t border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-elevated">
              <button type="button" className="floating-menu-row is-selected" disabled={creating} onClick={() => void create()}>
                {createLabel}: <bdi>{query.trim()}</bdi>
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export function ActionMenu({
  label,
  menuLabel = label,
  trigger,
  items,
  className,
}: {
  label: string;
  menuLabel?: string;
  trigger: ReactNode;
  items: ActionMenuItem[];
  className?: string;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const close = (focus = false) => {
    setOpen(false);
    if (focus) triggerRef.current?.focus();
  };
  const { position, surfaceRef, announceOpen } = useFloatingSurface(open, close, triggerRef);
  const openMenu = () => {
    if (open) return close();
    announceOpen();
    setOpen(true);
    setActiveIndex(Math.max(0, items.findIndex((item) => !item.disabled)));
  };
  useLayoutEffect(() => {
    if (open) requestAnimationFrame(() => surfaceRef.current?.focus());
  }, [open, surfaceRef]);
  const keys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        let next = current;
        do next = (next + direction + items.length) % items.length;
        while (items[next]?.disabled && next !== current);
        return next;
      });
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const item = items[activeIndex];
      if (item && !item.disabled) {
        close();
        item.onSelect();
      }
    }
  };
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        className={className ?? 'icon-button'}
        onClick={openMenu}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) openMenu();
          } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            close(true);
          }
        }}
      >
        {trigger}
      </button>
      {open && position && createPortal(
        <div
          ref={surfaceRef}
          id={`${id}-menu`}
          role="menu"
          aria-label={menuLabel}
          aria-activedescendant={items[activeIndex] ? `${id}-item-${activeIndex}` : undefined}
          tabIndex={-1}
          data-testid="action-menu-popover"
          data-theme-surface="opaque-elevated"
          dir={document.documentElement.dir || 'ltr'}
          className="floating-menu-surface modal-surface fixed z-[1000] isolate grid min-w-56 overflow-y-auto rounded-2xl p-2"
          style={{ ...position, width: Math.max(224, Math.min(position.width, 320)) } satisfies CSSProperties}
          onKeyDown={keys}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              id={`${id}-item-${index}`}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`floating-menu-row ${activeIndex === index ? 'is-highlighted' : ''} ${item.destructive ? 'is-destructive' : ''}`}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => {
                close();
                item.onSelect();
              }}
            >
              {item.icon}
              <span className="flex-1 text-start">{item.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
