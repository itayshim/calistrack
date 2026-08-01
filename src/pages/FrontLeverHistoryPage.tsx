import { Link } from 'react-router-dom';
import { useI18n } from '../hooks/useI18n';
import { useAppStore } from '../store/useAppStore';
import { frontLeverLevels, skillSessionDetails } from '../features/skills/frontLever';
import { getExerciseName } from '../utils/exerciseLocalization';

export function FrontLeverHistoryPage() {
  const { language } = useI18n();
  const sessions = useAppStore((state) => state.workoutSessions.filter((session) => session.skillLink?.skillKey === 'front-lever'));
  const exercises = useAppStore((state) => state.exercises);
  const label = (en: string, he: string) => language === 'he' ? he : en;
  return <div className="animate-rise"><Link className="text-sm font-bold text-brand" to="/skills/front-lever">{label('Back to Front Lever', 'חזרה לפרונט לבר')}</Link><h1 className="mt-5 text-4xl font-black">{label('Front Lever history', 'היסטוריית פרונט לבר')}</h1>
    {sessions.length === 0 ? <div className="card mt-7 text-center text-slate-500">{label('No skill sessions yet.', 'עדיין אין אימוני מיומנות.')}</div> : <div className="mt-6 grid gap-3">{sessions.map((session) => { const level = frontLeverLevels.find((item) => item.key === session.skillLink?.levelKey); const details = skillSessionDetails(session); return <Link className="card" to={`/history/${session.id}`} key={session.id}><div className="flex justify-between gap-3"><div><h2 className="font-black">{language === 'he' ? level?.nameHe : level?.nameEn}</h2><p className="text-sm text-slate-500">{new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(session.completedAt ?? session.startedAt))}</p></div><span className={session.skillSuccessful ? 'text-brand' : 'text-slate-500'}>{session.skillSuccessful ? label('Successful', 'הצלחה') : label('Needs work', 'דרוש שיפור')}</span></div><ul className="mt-3 space-y-1 text-sm text-slate-500">{details.map((detail) => { const exercise = exercises.find((item) => item.id === detail.exerciseId); return <li key={detail.exerciseId} className="flex justify-between gap-3"><span>{exercise ? getExerciseName(exercise, language) : detail.exerciseId}</span><span className={detail.met ? 'text-brand' : 'text-amber-500'}>{detail.values.join(', ')} / {detail.target}{detail.exceeded ? ' ↑' : ''}</span></li>; })}</ul></Link>;})}</div>}
  </div>;
}
