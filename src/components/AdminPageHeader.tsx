import { ArrowLeft, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';

type AdminPageContext = { titleEn: string; titleHe: string; parent: string; parentEn: string; parentHe: string };

function getContext(pathname: string): AdminPageContext | null {
  const parts = pathname.replace(/\/$/, '').split('/').filter(Boolean);
  if (parts[0] !== 'admin' || parts.length === 1) return null;
  const section = parts[1];
  const detail = parts.length > 2;
  if (section === 'exercises') return {
    titleEn: detail ? (parts[2] === 'new' ? 'Create exercise' : 'Exercise editor') : 'Exercise Manager',
    titleHe: detail ? (parts[2] === 'new' ? 'יצירת תרגיל' : 'עריכת תרגיל') : 'ניהול תרגילים',
    parent: detail ? '/admin/exercises' : '/admin',
    parentEn: detail ? 'Exercise Manager' : 'Admin home',
    parentHe: detail ? 'ניהול תרגילים' : 'דף הבית של הניהול',
  };
  if (section === 'skills') {
    const action = parts[3];
    return {
      titleEn: !detail ? 'Skill Builder' : action === 'preview' ? 'Skill preview and QA' : action === 'test' ? 'Skill QA workout' : parts[2] === 'new' ? 'Create Skill' : 'Edit Skill',
      titleHe: !detail ? 'בונה מיומנויות' : action === 'preview' ? 'תצוגה ובדיקת מיומנות' : action === 'test' ? 'אימון בדיקת מיומנות' : parts[2] === 'new' ? 'יצירת מיומנות' : 'עריכת מיומנות',
      parent: detail ? '/admin/skills' : '/admin',
      parentEn: detail ? 'Skill Builder' : 'Admin home',
      parentHe: detail ? 'בונה מיומנויות' : 'דף הבית של הניהול',
    };
  }
  if (section === 'programs') {
    const action = parts[3];
    return {
      titleEn: !detail ? 'Program Builder' : action === 'preview' ? 'Program preview' : action === 'versions' ? 'Program versions' : action === 'test' ? 'Program QA workout' : parts[2] === 'new' ? 'Create Program' : 'Edit Program',
      titleHe: !detail ? 'בונה תוכניות' : action === 'preview' ? 'תצוגת תוכנית' : action === 'versions' ? 'גרסאות תוכנית' : action === 'test' ? 'אימון בדיקת תוכנית' : parts[2] === 'new' ? 'יצירת תוכנית' : 'עריכת תוכנית',
      parent: detail ? '/admin/programs' : '/admin',
      parentEn: detail ? 'Program Builder' : 'Admin home',
      parentHe: detail ? 'בונה תוכניות' : 'דף הבית של הניהול',
    };
  }
  return {
    titleEn: 'Administrator', titleHe: 'ניהול המערכת', parent: '/admin',
    parentEn: 'Admin home', parentHe: 'דף הבית של הניהול',
  };
}

export function AdminPageHeader() {
  const { pathname } = useLocation();
  const { language } = useI18n();
  const context = getContext(pathname);
  if (!context) return null;
  const he = language === 'he';
  return (
    <header aria-label={he ? context.titleHe : context.titleEn} data-testid="admin-page-header" className="mx-auto mb-6 max-w-5xl border-b border-slate-200/80 pb-4 dark:border-white/[.08]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={context.parent} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-extrabold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
          <ArrowLeft className="directional-icon" size={19} aria-hidden="true" />
          {he ? context.parentHe : context.parentEn}
        </Link>
        {context.parent !== '/admin' && (
          <Link to="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
            <Home size={17} aria-hidden="true" />
            {he ? 'דף הבית של הניהול' : 'Admin home'}
          </Link>
        )}
      </div>
    </header>
  );
}
