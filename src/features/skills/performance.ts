import type { Exercise, MeasurementType, SkillAssessmentRecord, WorkoutSession } from '../../types';
import { findExerciseByReference } from '../../utils/exerciseLocalization';
import { getSetAddedWeight, getSetDuration, getSetReps } from '../../utils/performance';

export interface SkillPerformanceDefinition {
  exerciseKey: string;
  metric: MeasurementType;
  sideMode?: 'left-right';
}

export interface SkillMetricResult {
  value: number;
  reps?: number;
  addedWeightKg?: number;
  performedAt: string;
  sessionId: string;
}

export interface SkillLevelPerformanceSummary {
  best?: SkillMetricResult;
  latest?: SkillMetricResult;
  bestAssessment?: SkillAssessmentRecord;
  latestAssessment?: SkillAssessmentRecord;
}

const metricFromSet = (
  set: WorkoutSession['exercises'][number]['sets'][number],
  metric: MeasurementType,
) => {
  if (metric === 'duration') return { value: getSetDuration(set, metric) ?? 0 };
  const reps = getSetReps(set, metric) ?? 0;
  if (metric === 'weighted_reps') {
    const addedWeightKg = getSetAddedWeight(set) ?? 0;
    return { value: reps, reps, addedWeightKg };
  }
  return { value: reps, reps };
};

const better = (candidate: SkillMetricResult, current?: SkillMetricResult) => {
  if (!current) return true;
  if (candidate.value !== current.value) return candidate.value > current.value;
  return (candidate.addedWeightKg ?? 0) > (current.addedWeightKg ?? 0);
};

export function deriveSkillLevelPerformance(
  definition: SkillPerformanceDefinition,
  exercises: Exercise[],
  sessions: WorkoutSession[],
  assessments: SkillAssessmentRecord[],
  levelKey: string,
): SkillLevelPerformanceSummary {
  let best: SkillMetricResult | undefined;
  let latest: SkillMetricResult | undefined;
  for (const session of sessions) {
    if (session.status !== 'completed' || session.skillLink?.preview) continue;
    const performedAt = session.completedAt ?? session.startedAt;
    for (const performed of session.exercises) {
      if (performed.skipped) continue;
      const exercise = findExerciseByReference(exercises, performed.exerciseId);
      if (exercise?.stableKey !== definition.exerciseKey) continue;
      for (const set of performed.sets.filter((item) => item.completed)) {
        const metric = metricFromSet(set, definition.metric);
        if (!(metric.value > 0)) continue;
        const candidate = { ...metric, performedAt, sessionId: session.id };
        if (better(candidate, best)) best = candidate;
        if (!latest || Date.parse(performedAt) > Date.parse(latest.performedAt)) latest = candidate;
      }
    }
  }
  const formal = assessments.filter((item) => item.levelKey === levelKey);
  return {
    best,
    latest,
    bestAssessment: formal.reduce<SkillAssessmentRecord | undefined>((value, item) => !value || item.durationSeconds > value.durationSeconds ? item : value, undefined),
    latestAssessment: formal.reduce<SkillAssessmentRecord | undefined>((value, item) => !value || Date.parse(item.completedAt) > Date.parse(value.completedAt) ? item : value, undefined),
  };
}
