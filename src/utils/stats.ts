import type { Exercise, MeasurementType, WorkoutSession } from '../types';
import {
  getSetAddedWeight,
  getSetDuration,
  getSetReps,
  normalizeMeasurementType,
} from './performance';
const completed = (sessions: WorkoutSession[]) => sessions.filter((s) => s.status === 'completed');
export interface ExercisePoint {
  date: string;
  best: number;
  total: number;
  measurementType: MeasurementType;
  bestReps: number;
  longestHold: number;
  heaviestAddedWeight: number;
  sessionId: string;
}
export const exercisePoints = (sessions: WorkoutSession[], exerciseId: string): ExercisePoint[] =>
  completed(sessions)
    .flatMap((s) => {
      const ex = s.exercises.find((x) => x.exerciseId === exerciseId);
      if (!ex) return [];
      const type = normalizeMeasurementType(ex.measurementType ?? ex.target?.measurementType);
      const sets = ex.sets.filter((x) => x.completed);
      const reps = sets.map((set) => getSetReps(set, type) ?? 0);
      const durations = sets.map((set) => getSetDuration(set, type) ?? 0);
      const weights = sets.map((set) => getSetAddedWeight(set) ?? 0);
      const values = type === 'duration' ? durations : type === 'weighted_reps' ? weights : reps;
      return values.length
        ? [
            {
              date: s.completedAt ?? s.startedAt,
              best: Math.max(...values),
              total: values.reduce((a, b) => a + b, 0),
              measurementType: type,
              bestReps: Math.max(0, ...reps),
              longestHold: Math.max(0, ...durations),
              heaviestAddedWeight: Math.max(0, ...weights),
              sessionId: s.id,
            },
          ]
        : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
export const personalRecords = (sessions: WorkoutSession[], exercises: Exercise[]) =>
  exercises.flatMap((e) => {
    const p = exercisePoints(sessions, e.id);
    if (!p.length) return [];
    return [
      {
        exerciseId: e.id,
        measurementType: e.measurementType,
        bestSet: Math.max(...p.map((x) => x.best)),
        bestTotal: Math.max(...p.map((x) => x.total)),
        longestHold: Math.max(...p.map((x) => x.longestHold)),
        heaviestAddedWeight: Math.max(...p.map((x) => x.heaviestAddedWeight)),
        date: p.reduce((a, b) => (b.best > a.best ? b : a)).date,
      },
    ];
  });
export const workoutSummary = (s: WorkoutSession) => {
  const done = s.exercises.filter((e) => !e.skipped && e.sets.some((x) => x.completed));
  const sets = done.flatMap((e) => e.sets.filter((x) => x.completed));
  return {
    durationSeconds: Math.max(
      0,
      Math.round(
        ((s.completedAt ? Date.parse(s.completedAt) : Date.now()) - Date.parse(s.startedAt)) / 1000,
      ),
    ),
    completedExercises: done.length,
    skippedExercises: s.exercises.filter((e) => e.skipped).length,
    totalSets: sets.length,
    totalValue: sets.reduce((total, set) => total + (set.reps ?? set.durationSeconds ?? set.value ?? 0), 0),
    totalReps: done.reduce(
      (total, exercise) =>
        total +
        exercise.sets.reduce(
          (sum, set) => sum + (getSetReps(set, normalizeMeasurementType(exercise.measurementType ?? exercise.target?.measurementType)) ?? 0),
          0,
        ),
      0,
    ),
    totalDurationSeconds: done.reduce(
      (total, exercise) =>
        total +
        exercise.sets.reduce(
          (sum, set) => sum + (getSetDuration(set, normalizeMeasurementType(exercise.measurementType ?? exercise.target?.measurementType)) ?? 0),
          0,
        ),
      0,
    ),
  };
};
export const weekStart = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const weeklyCompleted = (sessions: WorkoutSession[], date = new Date()) =>
  completed(sessions).filter(
    (s) => Date.parse(s.completedAt ?? s.startedAt) >= weekStart(date).getTime(),
  ).length;
export const consistencyStreak = (sessions: WorkoutSession[], goal: number, now = new Date()) => {
  let streak = 0;
  const start = weekStart(now);
  for (let w = 0; w < 260; w++) {
    const a = new Date(start);
    a.setDate(a.getDate() - w * 7);
    const b = new Date(a);
    b.setDate(b.getDate() + 7);
    const count = completed(sessions).filter((s) => {
      const t = Date.parse(s.completedAt ?? s.startedAt);
      return t >= a.getTime() && t < b.getTime();
    }).length;
    if (count >= goal) streak++;
    else if (w > 0) break;
    else break;
  }
  return streak;
};
