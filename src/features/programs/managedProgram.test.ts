import { describe, expect, it } from 'vitest';
import { builtInExercises as exercises } from '../../data/exercises';
import {
  compileManagedWorkout,
  exportManagedProgram,
  importManagedProgram,
  validateManagedProgram,
  type ManagedProgramDefinition,
} from './managedProgram';

const pushUp = exercises.find((x) => x.stableKey === 'push-up')!;
const definition = (): ManagedProgramDefinition => ({
  schemaVersion: 1,
  key: 'beginner-foundation',
  version: 1,
  nameEn: 'Beginner Foundation',
  nameHe: 'בסיס למתחילים',
  shortDescriptionEn: 'Twelve-week foundation',
  shortDescriptionHe: 'בסיס בן שנים עשר שבועות',
  descriptionEn: 'A structured foundation.',
  descriptionHe: 'תוכנית בסיס מובנית.',
  difficulty: 'beginner',
  goals: ['strength'],
  durationWeeks: 1,
  sessionsPerWeek: 1,
  estimatedMinutesMin: 30,
  estimatedMinutesMax: 45,
  equipment: [],
  tags: ['beginner'],
  targetAudienceEn: 'Beginners',
  targetAudienceHe: 'מתחילים',
  featured: true,
  sortOrder: 1,
  phases: [{ key: 'foundation', nameEn: 'Foundation', nameHe: 'בסיס', order: 0 }],
  weeks: [
    {
      key: 'week-1',
      nameEn: 'Week 1',
      nameHe: 'שבוע 1',
      order: 0,
      phaseKey: 'foundation',
      advancementPolicy: 'required_complete',
      workouts: [
        {
          key: 'day-a',
          nameEn: 'Day A',
          nameHe: 'יום א',
          order: 0,
          flexible: true,
          repeatable: false,
          sections: [
            {
              key: 'main',
              nameEn: 'Main work',
              nameHe: 'עבודה עיקרית',
              order: 0,
              kind: 'main_work',
              contributesToHistory: true,
              requiredForSuccess: true,
              exercises: [
                {
                  key: 'push-up-work',
                  exerciseKey: 'push-up',
                  order: 0,
                  required: true,
                  sets: 3,
                  targetMin: 8,
                  targetMax: 10,
                  restSeconds: 90,
                  progression: 'week-specific',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

describe('managed Program domain', () => {
  it('validates an exact canonical, localized hierarchy', () =>
    expect(validateManagedProgram(definition(), exercises).valid).toBe(true));
  it('reports the exact nested path for a missing canonical exercise', () => {
    const d = definition();
    d.weeks[0].workouts[0].sections[0].exercises[0].exerciseKey = 'missing';
    const result = validateManagedProgram(d, exercises);
    expect(result.blockingErrors[0]).toMatchObject({
      code: 'missing_exercise',
      path: 'weeks.0.workouts.0.sections.0.exercises.0',
    });
  });
  it('blocks inverted targets and invalid rest', () => {
    const d = definition();
    const p = d.weeks[0].workouts[0].sections[0].exercises[0];
    p.targetMin = 10;
    p.targetMax = 8;
    p.restSeconds = -1;
    expect(validateManagedProgram(d, exercises).blockingErrors.map((x) => x.code)).toEqual(
      expect.arrayContaining(['invalid_target', 'invalid_rest']),
    );
  });
  it('compiles to the existing runtime with immutable provenance and section identity', () => {
    const workout = compileManagedWorkout(
      definition(),
      'week-1',
      'day-a',
      exercises,
      'enrollment-1',
    );
    expect(workout.exercises[0]).toMatchObject({
      exerciseId: pushUp.id,
      targetSets: 3,
      targetMin: 8,
      targetMax: 10,
      restSeconds: 90,
      managedSectionKey: 'main',
    });
    expect(workout.managedProgramLink).toEqual({
      programKey: 'beginner-foundation',
      version: 1,
      phaseKey: 'foundation',
      weekKey: 'week-1',
      workoutKey: 'day-a',
      enrollmentId: 'enrollment-1',
      source: 'managed_program',
    });
  });
  it('round-trips a versioned JSON document and rejects executable/malformed shapes', () => {
    expect(importManagedProgram(exportManagedProgram(definition()))).toEqual(definition());
    expect(() => importManagedProgram('{"schemaVersion":2}')).toThrow(
      'invalid_managed_program_import',
    );
  });
  it('does not mutate the authored document while compiling', () => {
    const d = definition();
    const before = structuredClone(d);
    compileManagedWorkout(d, 'week-1', 'day-a', exercises);
    expect(d).toEqual(before);
  });
  it('compiles warm-up prescriptions into the existing lightweight Done/Skip phase', () => {
    const d = definition();
    d.weeks[0].workouts[0].sections.unshift({
      key: 'warm-up',
      nameEn: 'Warm-up',
      nameHe: 'חימום',
      order: 0,
      kind: 'warm_up',
      contributesToHistory: false,
      requiredForSuccess: false,
      exercises: [
        {
          key: 'warm-push',
          exerciseKey: 'push-up',
          order: 0,
          required: false,
          sets: 1,
          targetMin: 5,
          targetMax: 5,
          restSeconds: 0,
        },
      ],
    });
    const workout = compileManagedWorkout(d, 'week-1', 'day-a', exercises);
    expect(workout.skillWarmup?.[0]).toMatchObject({ stableKey: 'push-up', guidanceEn: '5 reps' });
    expect(workout.exercises).toHaveLength(1);
  });
});
