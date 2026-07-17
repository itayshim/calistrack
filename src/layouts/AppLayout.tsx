import {
  ChartNoAxesColumnIncreasing,
  Dumbbell,
  Home,
  Play,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

const tabs = [
  ['/', 'Home', Home],
  ['/program', 'Program', Dumbbell],
  ['/workout', 'Workout', Play],
  ['/progress', 'Progress', ChartNoAxesColumnIncreasing],
  ['/settings', 'Settings', Settings2],
] as const;
export function AppLayout() {
  const active = useAppStore((s) => s.activeWorkout),
    nav = useNavigate();
  const workoutPath = active ? `/workout/${active.id}` : '/program';
  return (
    <div className="min-h-screen md:flex">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] border-r border-white/[.06] bg-[#0d1113]/95 px-5 py-7 backdrop-blur-xl md:flex md:flex-col">
        <button onClick={() => nav('/')} className="mb-10 flex items-center gap-3 px-2 text-left">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-ink shadow-glow">
            <Sparkles size={22} />
          </span>
          <span>
            <strong className="block text-xl font-black tracking-[-.04em]">CalisTrack</strong>
            <small className="text-xs font-bold text-slate-500">MOVE WITH INTENT</small>
          </span>
        </button>
        <nav className="space-y-2">
          {tabs.map(([to, label, Icon]) => {
            const destination = to === '/workout' ? workoutPath : to;
            return (
              <NavLink
                key={to}
                to={destination}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex min-h-14 items-center gap-4 rounded-2xl px-4 font-extrabold transition ${isActive || (to === '/workout' && active && location.pathname.startsWith('/workout')) ? 'bg-white/[.08] text-white' : 'text-slate-500 hover:bg-white/[.04] hover:text-white'}`
                }
              >
                <Icon size={21} />
                {label}
                {to === '/workout' && active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-brand shadow-[0_0_12px_#b7f36b]" />
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto rounded-3xl bg-brand p-5 text-ink">
          <p className="text-xs font-black uppercase tracking-widest opacity-60">
            Ready when you are
          </p>
          <p className="mt-1 text-lg font-black">Your next set starts here.</p>
          <button
            onClick={() => nav(workoutPath)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 font-black text-white"
          >
            <Play size={18} fill="currentColor" />
            {active ? 'Resume' : 'Start workout'}
          </button>
        </div>
      </aside>
      <main className="app-shell-main mx-auto w-full max-w-[78rem] px-4 pb-28 sm:px-6 md:ml-[17rem] md:px-10 md:pb-12 md:pt-8">
        <header className="mb-7 flex items-center justify-between md:hidden">
          <button onClick={() => nav('/')} className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-ink">
              <Sparkles size={20} />
            </span>
            <span className="text-xl font-black tracking-[-.04em]">CalisTrack</span>
          </button>
          {active && (
            <button
              onClick={() => nav(workoutPath)}
              className="flex items-center gap-2 rounded-full bg-brand/15 px-3 py-2 text-xs font-black text-brand"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              LIVE
            </button>
          )}
        </header>
        <Outlet />
      </main>
      <nav
        aria-label="Main navigation"
        className="mobile-bottom-nav fixed inset-x-3 z-30 grid grid-cols-5 rounded-[1.6rem] border border-white/[.08] bg-[#111719]/95 p-1.5 shadow-soft backdrop-blur-xl md:hidden"
      >
        {tabs.map(([to, label, Icon]) => {
          const destination = to === '/workout' ? workoutPath : to;
          return (
            <NavLink
              key={to}
              to={destination}
              end={to === '/'}
              aria-label={label}
              className={({ isActive }) =>
                `relative flex min-h-[3.7rem] flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-extrabold transition ${isActive || (to === '/workout' && active && location.pathname.startsWith('/workout')) ? 'bg-white/[.07] text-brand' : 'text-slate-500'}`
              }
            >
              <Icon size={to === '/workout' ? 24 : 21} strokeWidth={2.3} />
              {label}
              {to === '/workout' && active && (
                <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-brand" />
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
