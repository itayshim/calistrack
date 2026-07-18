import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { taxonomyIdentity, type TaxonomyKind, uniqueTaxonomyValues } from '../utils/taxonomy';

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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const filtered = useMemo(() => {
    const comparable = taxonomyIdentity(query, kind);
    return options.filter((option) => !comparable || taxonomyIdentity(option, kind).includes(comparable));
  }, [kind, options, query]);
  const exact = options.some((option) => taxonomyIdentity(option, kind) === taxonomyIdentity(query, kind));
  const create = async () => {
    if (!query.trim() || exact || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(query);
      onChange(created);
      setQuery('');
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };
  return (
    <div className="relative">
      <label className="label" id={`${id}-label`}>{label}</label>
      <button
        type="button"
        className="field flex w-full items-center justify-between text-start"
        aria-labelledby={`${id}-label`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={!!error}
        onClick={() => setOpen((current) => !current)}
      >
        <span dir="auto" className="truncate">{value || searchLabel}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {error && <p role="alert" className="mt-1 text-sm font-bold text-red-500">{error}</p>}
      {open && (
        <div className="surface absolute inset-x-0 z-30 mt-2 max-h-80 overflow-auto rounded-2xl border border-slate-200 p-2 shadow-xl dark:border-white/10">
          <label className="field flex items-center gap-2">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">{searchLabel}</span>
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false);
                if (event.key === 'Enter' && !exact) {
                  event.preventDefault();
                  void create();
                }
              }}
            />
          </label>
          <div role="listbox" aria-labelledby={`${id}-label`} className="mt-2 grid gap-1">
            {filtered.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option === value}
                key={option}
                className={`flex min-h-11 items-center justify-between rounded-xl px-3 text-start hover:bg-brand/10 ${option === value ? 'bg-brand/15 font-bold text-brand-dark dark:text-brand' : ''}`}
                onClick={() => {
                  onChange(option);
                  setQuery('');
                  setOpen(false);
                }}
              >
                <span dir="auto" className="truncate">{option}</span>
                {option === value && <Check size={18} aria-hidden="true" />}
              </button>
            ))}
          </div>
          {query.trim() && !exact && (
            <button type="button" className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 font-bold text-brand-dark hover:bg-brand/10 dark:text-brand" disabled={creating} onClick={() => void create()}>
              <Plus size={18} aria-hidden="true" />
              <span>{createLabel}: <bdi>{query.trim()}</bdi></span>
            </button>
          )}
        </div>
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
