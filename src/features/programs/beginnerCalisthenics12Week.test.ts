import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../../data/exercises';
import { getManagedProgram, installManagedPrograms } from '../../services/managedPrograms';
import { beginnerCalisthenics12Week as program } from './beginnerCalisthenics12Week';
import { compileManagedWorkout, validateManagedProgram } from './managedProgram';

const main = (week: number, day = 0) =>
  program.weeks[week - 1].workouts[day].sections.find((section) => section.kind === 'main_work')!;

describe('12-Week Beginner Calisthenics built-in Program', () => {
  it('has exactly three phases and twelve ordered weeks', () => {
    expect(program.key).toBe('beginner-calisthenics-12-week');
    expect(program.phases.map((phase) => phase.key)).toEqual(['foundation', 'strength-split', 'advanced-beginner']);
    expect(program.weeks).toHaveLength(12);
    expect(program.weeks.map((week) => week.phaseKey)).toEqual([
      ...Array(4).fill('foundation'), ...Array(4).fill('strength-split'), ...Array(4).fill('advanced-beginner'),
    ]);
  });

  it('uses the required weekly frequency and optional fifth Phase 3 session', () => {
    expect(program.weeks.slice(0, 4).every((week) => week.workouts.length === 3)).toBe(true);
    expect(program.weeks.slice(4, 8).every((week) => week.workouts.length === 4)).toBe(true);
    expect(program.weeks.slice(8).every((week) => week.workouts.length === 5)).toBe(true);
    expect(program.weeks[8].workouts.filter((day) => day.required !== false)).toHaveLength(4);
    expect(program.weeks[8].workouts.at(-1)?.required).toBe(false);
  });

  it('authors the exact foundation progression and consolidation targets', () => {
    expect(main(1).exercises.map((item) => [item.exerciseKey, item.sets, item.targetMin, item.targetMax, item.restSeconds])).toEqual([
      ['push-up', 3, 6, 8, 90], ['australian-row', 3, 5, 8, 90], ['bench-dip', 3, 6, 8, 90],
      ['bodyweight-squat', 3, 12, 15, 75], ['reverse-lunge', 3, 8, 8, 75], ['plank', 3, 20, 30, 60],
    ]);
    expect(main(4).exercises.map((item) => [item.targetMin, item.targetMax])).toEqual([[8, 12], [6, 10], [8, 10], [15, 20], [8, 10], [30, 45]]);
  });

  it('uses exact canonical identities and validates every replacement', () => {
    const validation = validateManagedProgram(program, builtInExercises);
    expect(validation.blockingErrors).toEqual([]);
    const available = new Set(builtInExercises.map((exercise) => exercise.stableKey));
    for (const week of program.weeks)
      for (const workout of week.workouts)
        for (const section of workout.sections)
          for (const item of section.exercises) {
            expect(available.has(item.exerciseKey), item.exerciseKey).toBe(true);
            item.replacementKeys?.forEach((key) => expect(available.has(key), key).toBe(true));
          }
  });

  it('compiles every required workout through the normal runtime with provenance', () => {
    for (const week of program.weeks) for (const workout of week.workouts.filter((day) => day.required !== false)) {
      const template = compileManagedWorkout(program, week.key, workout.key, builtInExercises, 'enrollment-1');
      expect(template.managedProgramLink).toMatchObject({ programKey: program.key, version: 1, weekKey: week.key, workoutKey: workout.key });
      expect(template.skillLink).toBeUndefined();
      expect(template.exercises.every((exercise) => exercise.measurementType)).toBe(true);
      expect(template.exercises.every((exercise) => exercise.managedSectionKind !== 'cool_down')).toBe(true);
      expect(template.skillWarmup?.length).toBeGreaterThan(0);
    }
  });

  it('keeps optional Skill practice outside formal Skill progression', () => {
    const practice = program.weeks[4].workouts.flatMap((day) => day.sections).filter((item) => item.kind === 'skill_practice');
    expect(practice).toHaveLength(2);
    expect(practice.every((item) => !item.requiredForSuccess && item.exercises.every((exercise) => !exercise.required))).toBe(true);
    expect(JSON.stringify(program)).not.toContain('skillLink');
    const compiled = compileManagedWorkout(program, 'week-5', 'upper-a', builtInExercises);
    expect(compiled.skillLink).toBeUndefined();
  });

  it('cannot be shadowed by a backend record with the same stable key', () => {
    installManagedPrograms([{ id: 'remote', stableKey: program.key, source: 'admin-created', status: 'published', draftVersion: 99, publishedVersion: 99, definition: { ...program, version: 99 }, validation: null, updatedAt: new Date().toISOString() }]);
    expect(getManagedProgram(program.key)?.source).toBe('built-in');
    expect(getManagedProgram(program.key)?.definition.version).toBe(1);
    installManagedPrograms([]);
  });
});
