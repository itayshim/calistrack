import type { WorkoutSet } from '../../types';
import type {
  ManagedProgramMilestone,
  ManagedProgressionDecision,
  ManagedProgressionMetric,
  ManagedProgressionRule,
} from './managedProgram';

export interface ManagedExposure {
  sets: WorkoutSet[];
  techniqueAcceptable: boolean;
  rir?: number;
  skipped?: boolean;
}

const valueFor = (set: WorkoutSet, metric: ManagedProgressionMetric) =>
  metric === 'duration' ? set.durationSeconds : set.reps;

export function evaluateManagedProgression(
  rule: ManagedProgressionRule,
  exposures: ManagedExposure[],
): ManagedProgressionDecision {
  const valid = exposures.filter((exposure) => !exposure.skipped);
  const qualifies = (exposure: ManagedExposure, threshold: number) => {
    const sets = exposure.sets.filter((set) => set.completed);
    if (rule.requireCompletedSets && sets.length === 0) return false;
    if (rule.requireTechniqueQuality && !exposure.techniqueAcceptable) return false;
    if (rule.targetRirMin !== undefined && exposure.rir !== undefined && exposure.rir < rule.targetRirMin)
      return false;
    if (rule.targetRirMax !== undefined && exposure.rir !== undefined && exposure.rir > rule.targetRirMax)
      return false;
    return sets.length > 0 && sets.every((set) => (valueFor(set, rule.metric) ?? -1) >= threshold);
  };
  const successes = valid.slice(-rule.consecutiveSuccesses).filter((item) =>
    qualifies(item, rule.maximumAcrossAllSets),
  ).length;
  if (successes >= rule.consecutiveSuccesses) return 'ready';
  const failures = valid
    .slice(-(rule.failedExposureThreshold ?? 2))
    .filter((item) => !qualifies(item, rule.minimumAcrossAllSets)).length;
  if (failures >= (rule.failedExposureThreshold ?? 2)) return 'regress';
  return 'maintain';
}

export function isManagedMilestoneComplete(
  milestone: ManagedProgramMilestone,
  sets: WorkoutSet[],
) {
  const qualifying = sets.filter(
    (set) => set.completed && (valueFor(set, milestone.metric) ?? 0) >= milestone.threshold,
  );
  return qualifying.length >= (milestone.setsRequired ?? 1);
}
