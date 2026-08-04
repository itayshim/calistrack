import { CalendarRange, Dumbbell, Images, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../hooks/useI18n';

export function AdminDashboardPage() {
  const { language } = useI18n();
  const he = language === 'he';
  const sections = [
    { to: '/admin/exercises', icon: Dumbbell, en: 'Exercises', he: 'תרגילים', detailEn: 'Canonical exercises, translations, and publication', detailHe: 'תרגילים קנוניים, תרגומים ופרסום' },
    { to: '/admin/skills', icon: ShieldCheck, en: 'Skills', he: 'מיומנויות', detailEn: 'Skill definitions, previews, and QA', detailHe: 'הגדרות מיומנות, תצוגות ובדיקות' },
    { to: '/admin/programs', icon: CalendarRange, en: 'Programs', he: 'תוכניות', detailEn: 'Managed Programs, versions, and QA', detailHe: 'תוכניות מנוהלות, גרסאות ובדיקות' },
    { to: '/admin/media', icon: Images, en: 'Media', he: 'מדיה', detailEn: 'Exercise demonstrations and publishing', detailHe: 'הדגמות תרגילים ופרסום' },
  ];
  return (
    <main className="mx-auto max-w-5xl pb-12">
      <p className="eyebrow">{he ? 'ניהול CalisTrack' : 'CalisTrack administration'}</p>
      <h1 className="mt-2 text-4xl font-black">{he ? 'דף הבית של הניהול' : 'Admin home'}</h1>
      <p className="mt-2 text-slate-500">{he ? 'בחרו אזור לניהול תוכן ובדיקת חוויות.' : 'Choose an area to manage content and run QA.'}</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {sections.map(({ to, icon: Icon, en, he: titleHe, detailEn, detailHe }) => (
          <Link key={to} to={to} className="card flex min-h-32 items-start gap-4 transition hover:border-brand/50 hover:bg-brand/5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/15 text-lime-700 dark:text-brand"><Icon aria-hidden="true" /></span>
            <span><strong className="block text-xl">{he ? titleHe : en}</strong><span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{he ? detailHe : detailEn}</span></span>
          </Link>
        ))}
      </div>
    </main>
  );
}
