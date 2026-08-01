import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';

export function SkillsPage() {
  const { language } = useI18n();
  const progress = useAppStore((state) => state.skillProgress['front-lever']);
  const Arrow = language === 'he' ? ChevronLeft : ChevronRight;
  return <div className="animate-rise">
    <p className="eyebrow">{language === 'he' ? 'אימון מיומנויות' : 'Skill training'}</p>
    <h1 className="mt-2 text-4xl font-black">{language === 'he' ? 'מיומנויות' : 'Skills'}</h1>
    <p className="mt-2 max-w-xl text-slate-500">{language === 'he' ? 'מסלולים מובנים שמשתמשים באותו יומן אימונים, טיימרים והתקדמות.' : 'Structured paths powered by your existing workouts, timers, history, and progress.'}</p>
    <Link to="/skills/front-lever" className="card mt-7 flex items-center gap-4 transition hover:border-brand">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand/15 text-lime-700 dark:text-brand"><ShieldCheck /></div>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-black">Front Lever</h2>
        <p className="text-sm text-slate-500">{progress ? `${progress.unlockedLevelKeys.length}/6 ${language === 'he' ? 'שלבים פתוחים' : 'levels unlocked'}` : (language === 'he' ? 'שלב 1 פתוח' : 'Level 1 unlocked')}</p>
      </div><Arrow className="shrink-0" aria-hidden />
    </Link>
  </div>;
}
