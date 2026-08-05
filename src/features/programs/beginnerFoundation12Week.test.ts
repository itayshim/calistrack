import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../../data/exercises';
import { getManagedProgram } from '../../services/managedPrograms';
import type { WorkoutSet } from '../../types';
import { beginnerFoundation12Week as program } from './beginnerFoundation12Week';
import { compileManagedWorkout, validateManagedProgram } from './managedProgram';
import { evaluateManagedProgression, isManagedMilestoneComplete } from './managedProgression';

const completed = (value: number, metric: 'reps' | 'duration' = 'reps'): WorkoutSet => ({
  id: crypto.randomUUID(), setNumber: 1, completed: true,
  ...(metric === 'duration' ? { durationSeconds: value } : { reps: value }),
});

describe('12-Week Beginner Foundation managed Program', () => {
  it('is a separate built-in with exactly three phases, twelve weeks, and 36 required workouts', () => {
    expect(program.key).toBe('beginner-foundation-12-week');
    expect(program.phases.map((phase) => phase.key)).toEqual(['base-control','skill-strength','integration-consolidation']);
    expect(program.weeks).toHaveLength(12);
    expect(program.weeks.every((week) => week.workouts.length === 3)).toBe(true);
    expect(program.weeks.flatMap((week) => week.workouts).filter((workout) => workout.required !== false)).toHaveLength(36);
    expect(getManagedProgram(program.key)?.definition).toBe(program);
    expect(getManagedProgram('beginner-calisthenics-12-week')).toBeDefined();
  });

  it('starts Skill preparation in Week 1 and calibrates strength to the supplied baseline', () => {
    const week = program.weeks[0];
    expect(week.workouts.every((day) => day.sections.some((section) => section.kind === 'skill_practice'))).toBe(true);
    const firstMain = week.workouts[0].sections.find((section) => section.kind === 'main_work')!;
    expect(firstMain.exercises.find((item) => item.exerciseKey === 'push-up')).toMatchObject({ sets: 3, targetMin: 15, targetMax: 20 });
    expect(firstMain.exercises.find((item) => item.exerciseKey === 'pull-up')).toMatchObject({ sets: 3, targetMin: 7, targetMax: 10 });
    expect(firstMain.exercises.find((item) => item.exerciseKey === 'parallel-bar-dip')).toMatchObject({ sets: 3, targetMin: 8, targetMax: 12 });
    const workingExercises = program.weeks.flatMap((item) => item.workouts.flatMap((day) => day.sections.filter((section) => section.kind === 'main_work').flatMap((section) => section.exercises.map((exercise) => exercise.exerciseKey))));
    expect(workingExercises).not.toContain('bodyweight-squat');
  });

  it('has complete canonical identities, localization, progression rules, and milestones', () => {
    const validation = validateManagedProgram(program, builtInExercises);
    expect(validation.blockingErrors).toEqual([]);
    expect(program.milestones).toHaveLength(10);
    for (const week of program.weeks) for (const day of week.workouts) {
      expect(day.sections[0].kind).toBe('warm_up');
      expect(day.sections.at(-1)?.kind).toBe('cool_down');
      for (const section of day.sections) for (const item of section.exercises) {
        expect(builtInExercises.some((exercise) => exercise.stableKey === item.exerciseKey), item.exerciseKey).toBe(true);
        expect(item.progressionRule, `${week.key}/${day.key}/${item.exerciseKey}`).toBeDefined();
        expect(item.progressionRule?.guidanceHe).toBeTruthy();
      }
    }
  });

  it('compiles all workouts through the existing runner with frozen provenance and lightweight preparation/recovery', () => {
    for (const week of program.weeks) for (const day of week.workouts) {
      const template = compileManagedWorkout(program, week.key, day.key, builtInExercises, 'enrollment-1', 'he');
      expect(template.managedProgramLink).toMatchObject({ programKey: program.key, version: 1, weekKey: week.key, workoutKey: day.key, enrollmentId: 'enrollment-1' });
      expect(template.skillLink).toBeUndefined();
      expect(template.skillWarmup?.length).toBeGreaterThan(0);
      expect(template.skillCooldown?.length).toBeGreaterThan(0);
      expect(template.exercises.every((item) => item.managedSectionKind !== 'warm_up' && item.managedSectionKind !== 'cool_down')).toBe(true);
      expect(template.exercises.some((item) => item.notes?.includes('RIR'))).toBe(true);
    }
  });
});

describe('managed performance progression', () => {
  const rule = program.weeks[0].workouts[0].sections.find((section) => section.kind === 'main_work')!.exercises[0].progressionRule!;
  const exposure = (values: number[], techniqueAcceptable = true) => ({ sets: values.map((value, index) => ({ ...completed(value), setNumber: index + 1 })), techniqueAcceptable, rir: 1 });

  it('maintains after minimum work, becomes ready only after two top-range exposures, and ignores skips', () => {
    expect(evaluateManagedProgression(rule, [exposure([15,16,17])])).toBe('maintain');
    expect(evaluateManagedProgression(rule, [exposure([20,20,20])])).toBe('maintain');
    expect(evaluateManagedProgression(rule, [exposure([20,20,20]), exposure([20,20,20])])).toBe('ready');
    expect(evaluateManagedProgression(rule, [exposure([20,20,20]), { ...exposure([20,20,20]), skipped: true }])).toBe('maintain');
    expect(evaluateManagedProgression(rule, [exposure([20,20,20], false), exposure([20,20,20], false)])).not.toBe('ready');
  });

  it('recommends regression after repeated minimum misses and derives milestones from completed data', () => {
    expect(evaluateManagedProgression(rule, [exposure([10,10,10]), exposure([12,12,12])])).toBe('regress');
    const hold = program.milestones!.find((item) => item.key === 'trunk-control')!;
    expect(isManagedMilestoneComplete(hold, [completed(39, 'duration')])).toBe(false);
    expect(isManagedMilestoneComplete(hold, [completed(40, 'duration')])).toBe(true);
    expect(isManagedMilestoneComplete(hold, [{ ...completed(50, 'duration'), completed: false }])).toBe(false);
  });
});
