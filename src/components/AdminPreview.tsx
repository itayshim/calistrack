import { CheckCircle2, ChevronDown, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export interface PreviewIssue { code: string; message: string; path?: string }

export function AdminValidationBanner({ valid, errors, warnings, language }: {
  valid: boolean; errors: PreviewIssue[]; warnings: PreviewIssue[]; language: 'en' | 'he';
}) {
  const [expanded, setExpanded] = useState(false);
  const he = language === 'he';
  const tone = errors.length ? 'border-red-500/35 bg-red-500/10' : warnings.length ? 'border-amber-500/35 bg-amber-500/10' : 'border-emerald-500/35 bg-emerald-500/10';
  const title = errors.length ? (he ? 'שגיאות תוכן חוסמות' : 'Blocking content errors') : warnings.length ? (he ? 'האימות עבר עם אזהרות' : 'Validation passed with warnings') : (he ? 'אימות התוכן עבר בהצלחה' : 'Content validation passed');
  const issues = [...errors, ...warnings];
  return <section data-testid="admin-validation-banner" className={`mt-6 rounded-3xl border p-5 ${tone}`}>
    <div className="flex items-start gap-3">
      {valid ? <CheckCircle2 className="mt-0.5 shrink-0" aria-hidden="true" /> : <TriangleAlert className="mt-0.5 shrink-0" aria-hidden="true" />}
      <div className="min-w-0 flex-1"><h2 className="font-black">{title}</h2><p className="mt-1 text-sm">{errors.length} {he ? 'שגיאות' : 'errors'} · {warnings.length} {he ? 'אזהרות' : 'warnings'}</p></div>
      {issues.length > 0 && <button className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-bold" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}><ChevronDown className={expanded ? 'rotate-180' : ''} size={18} />{he ? 'פרטים' : 'Details'}</button>}
    </div>
    {expanded && <ul className="mt-4 grid gap-2 border-t border-current/15 pt-4 text-sm">{issues.map((issue, index) => <li key={`${issue.code}-${index}`}><code className="font-bold">{issue.code}</code>{issue.path ? ` · ${issue.path}` : ''}<span className="block opacity-80">{issue.message}</span></li>)}</ul>}
  </section>;
}

export function AdminPreviewBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' }) {
  const styles = tone === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : tone === 'warning' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-white/[.07] dark:text-slate-300';
  return <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-xs font-black ${styles}`}>{children}</span>;
}
