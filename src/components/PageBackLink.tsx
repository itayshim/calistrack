import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PageBackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-extrabold text-slate-500 hover:text-slate-950 focus-visible:ring-offset-0 dark:text-slate-400 dark:hover:text-white"
    >
      <ArrowLeft className="directional-icon" size={18} />
      {label}
    </Link>
  );
}
