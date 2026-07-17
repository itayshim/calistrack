import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div
      aria-label={label}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safe)}
      className="h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/[.08]"
    >
      <div
        className="h-full rounded-full bg-brand transition-[width] duration-700"
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}
export function ProgressRing({
  value,
  size = 88,
  label,
}: {
  value: number;
  size?: number;
  label: string;
}) {
  const safe = Math.max(0, Math.min(100, value)),
    r = 42,
    c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg
        className="-rotate-90"
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-200 dark:text-white/10"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-brand transition-all duration-700"
          strokeDasharray={c}
          strokeDashoffset={c - (safe / 100) * c}
        />
      </svg>
      <span className="absolute text-lg font-black">{Math.round(safe)}%</span>
      <span className="sr-only">
        {label}: {Math.round(safe)}%
      </span>
    </div>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'blue' | 'orange';
}) {
  const tones = {
    neutral: 'bg-slate-200/80 text-slate-700 dark:bg-white/[.07] dark:text-slate-300',
    brand: 'bg-brand/15 text-brand',
    blue: 'bg-blue-500/15 text-blue-300',
    orange: 'bg-orange-500/15 text-orange-300',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
export function IconTile({
  children,
  tone = 'brand',
}: {
  children: ReactNode;
  tone?: 'brand' | 'blue' | 'orange' | 'red';
}) {
  const tones = {
    brand: 'bg-brand/15 text-brand',
    blue: 'bg-blue-500/15 text-blue-300',
    orange: 'bg-orange-500/15 text-orange-300',
    red: 'bg-red-500/15 text-red-300',
  };
  return (
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>
      {children}
    </span>
  );
}
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="section-title">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 text-sm font-extrabold text-brand"
        >
          {action}
          <ArrowRight className="directional-icon" size={16} />
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  action: string;
  onAction: () => void;
  icon?: ReactNode;
}) {
  return (
    <section className="card animate-rise py-10 text-center">
      <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[1.75rem] bg-brand/10 text-brand">
        {icon ?? <Sparkles size={34} />}
      </div>
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      <p className="mx-auto mb-6 mt-2 max-w-sm text-slate-500 dark:text-slate-400">{description}</p>
      <button className="btn-primary w-full sm:w-auto" onClick={onAction}>
        {action}
      </button>
    </section>
  );
}
export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`btn-primary ${props.className ?? ''}`} />;
}
