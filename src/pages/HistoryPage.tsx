import { CalendarDays, ChevronRight, Clock3, Dumbbell, History } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, IconTile } from '../components/ui';
import { useAppStore } from '../store/useAppStore';
import { workoutSummary } from '../utils/stats';
import { useI18n } from '../hooks/useI18n';
export function HistoryPage() {
  const { t, language } = useI18n();
  const sessions = useAppStore((s) => s.workoutSessions)
      .filter((s) => s.status === 'completed')
      .sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt)),
    nav = useNavigate();
  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">{t('historyEyebrow')}</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em]">{t('history')}</h1>
        <p className="mt-2 text-slate-400">{t('historySubtitle')}</p>
      </header>
      {!sessions.length ? (
        <EmptyState
          icon={<History size={36} />}
          title={t('firstWorkoutWaiting')}
          description={t('firstWorkoutHistoryDescription')}
          action={t('chooseWorkout')}
          onAction={() => nav('/program')}
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const summary = workoutSummary(session);
            return (
              <Link
                to={`/history/${session.id}`}
                key={session.id}
                className="card group flex items-center gap-4 transition hover:-translate-y-0.5"
              >
                <IconTile tone="blue">
                  <Dumbbell />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    {new Date(session.completedAt ?? session.startedAt).toLocaleDateString(
                      language === 'he' ? 'he-IL' : 'en-US',
                      { month: 'short', day: 'numeric', year: 'numeric' },
                    )}
                  </p>
                  <h2 className="mt-1 truncate text-xl font-black">{session.workoutName}</h2>
                  <p className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock3 size={13} />
                      <bdi>{Math.round(summary.durationSeconds / 60)}</bdi> {t('minutesLowerShort')}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays size={13} />
                      <bdi>{summary.totalSets}</bdi> {t('sets')}
                    </span>
                    {session.difficultyRating && <span>{t('effort')} <bdi>{session.difficultyRating}/5</bdi></span>}
                  </p>
                </div>
                <ChevronRight className="directional-icon text-slate-600 transition group-hover:text-brand" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
