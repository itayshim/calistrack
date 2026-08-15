import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialData } from '../../data/seed';
import { useAppStore } from '../../store/useAppStore';
import { compileManagedWorkout, type ManagedProgramDefinition } from './managedProgram';
import { installManagedPrograms } from '../../services/managedPrograms';
import { beginnerCalisthenics12Week } from './beginnerCalisthenics12Week';

const program: ManagedProgramDefinition = {
  schemaVersion: 1,
  key: 'runtime-plan',
  version: 3,
  nameEn: 'Runtime Plan',
  nameHe: 'תוכנית זמן ריצה',
  shortDescriptionEn: 'Test plan',
  shortDescriptionHe: 'תוכנית בדיקה',
  descriptionEn: 'Test',
  descriptionHe: 'בדיקה',
  difficulty: 'beginner',
  goals: ['strength'],
  durationWeeks: 1,
  sessionsPerWeek: 1,
  estimatedMinutesMin: 20,
  estimatedMinutesMax: 30,
  equipment: [],
  tags: [],
  targetAudienceEn: 'Everyone',
  targetAudienceHe: 'כולם',
  featured: false,
  sortOrder: 0,
  phases: [],
  weeks: [
    {
      key: 'week-1',
      nameEn: 'Week 1',
      nameHe: 'שבוע 1',
      order: 0,
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
              key: 'warm-up', nameEn: 'Warm-up', nameHe: 'חימום', order: 0, kind: 'warm_up',
              contributesToHistory: false, requiredForSuccess: false,
              exercises: [{ key: 'warm-jacks', exerciseKey: 'jumping-jacks', order: 0, required: false, sets: 1, targetMin: 10, targetMax: 10, restSeconds: 0 }],
            },
            {
              key: 'main',
              nameEn: 'Main',
              nameHe: 'עיקרי',
              order: 0,
              kind: 'main_work',
              contributesToHistory: true,
              requiredForSuccess: true,
              exercises: [
                {
                  key: 'push',
                  exerciseKey: 'push-up',
                  order: 0,
                  required: true,
                  sets: 1,
                  targetMin: 5,
                  targetMax: 5,
                  restSeconds: 0,
                },
              ],
            },
            {
              key: 'cool-down', nameEn: 'Recovery', nameHe: 'שחרור', order: 2, kind: 'cool_down',
              contributesToHistory: false, requiredForSuccess: false,
              exercises: [{ key: 'cool-cat', exerciseKey: 'cat-cow', order: 0, required: false, sets: 1, targetMin: 6, targetMax: 6, restSeconds: 0 }],
            },
          ],
        },
      ],
    },
  ],
};
describe('managed Program runtime', () => {
  beforeEach(() => {
    const initial = createInitialData();
    useAppStore.setState({ ...initial, hydrated: true });
    installManagedPrograms([
      {
        id: 'program-id',
        stableKey: program.key,
        source: 'admin-created',
        status: 'published',
        draftVersion: 4,
        publishedVersion: 3,
        definition: program,
        validation: null,
        updatedAt: '2026-08-04',
      },
    ]);
  });
  it('starts the existing runner with version and enrollment provenance', () => {
    const store = useAppStore.getState();
    const workout = compileManagedWorkout(
      program,
      'week-1',
      'day-a',
      store.exercises,
      'enrollment',
    );
    expect(store.startWorkout(workout)).toBe(true);
    expect(useAppStore.getState().activeWorkout?.managedProgramLink).toMatchObject({
      programKey: 'runtime-plan',
      version: 3,
      enrollmentId: 'enrollment',
    });
    expect(useAppStore.getState().startWorkout(workout)).toBe(false);
  });
  it('records normal managed sessions and completes the enrollment once', () => {
    useAppStore.setState({
      managedProgramEnrollments: [
        {
          id: 'enrollment',
          programKey: program.key,
          programVersion: 3,
          startDate: '2026-08-04',
          currentWeekKey: 'week-1',
          completedWorkoutKeys: [],
          skippedWorkoutKeys: [],
          preferredWeekdays: [],
          status: 'active',
          detached: false,
        },
      ],
    });
    const store = useAppStore.getState();
    store.startWorkout(
      compileManagedWorkout(program, 'week-1', 'day-a', store.exercises, 'enrollment'),
    );
    useAppStore.getState().completeSet(0, { reps: 5 });
    expect(useAppStore.getState().activeWorkout?.skillWarmup).toMatchObject({ phase: 'cool_down', status: 'pending' });
    useAppStore.getState().skipSkillWarmup();
    useAppStore.getState().finishWorkout();
    expect(useAppStore.getState().workoutSessions[0].managedProgramLink?.version).toBe(3);
    expect(useAppStore.getState().managedProgramEnrollments[0]).toMatchObject({
      status: 'completed',
      completedWorkoutKeys: ['week-1:day-a'],
      successfulWorkoutKeys: ['week-1:day-a'],
    });
  });
  it('preserves a below-target completion as terminal without labelling it successful', () => {
    useAppStore.setState({ managedProgramEnrollments: [{ id:'enrollment', programKey:program.key, programVersion:3, startDate:'2026-08-04', currentWeekKey:'week-1', completedWorkoutKeys:[], skippedWorkoutKeys:[], preferredWeekdays:[], status:'active', detached:false }] });
    const store=useAppStore.getState();
    store.startWorkout(compileManagedWorkout(program,'week-1','day-a',store.exercises,'enrollment'));
    useAppStore.getState().skipSkillWarmup();
    useAppStore.getState().completeSet(0,{reps:4});
    useAppStore.getState().skipSkillWarmup();
    useAppStore.getState().finishWorkout();
    expect(useAppStore.getState().workoutSessions).toHaveLength(1);
    expect(useAppStore.getState().managedProgramEnrollments[0]).toMatchObject({status:'completed',currentWeekKey:'week-1',completedWorkoutKeys:['week-1:day-a'],successfulWorkoutKeys:[]});
  });
  it('keeps warm-up and cooldown lightweight and out of normal exercise history', () => {
    const template = compileManagedWorkout(program, 'week-1', 'day-a', useAppStore.getState().exercises);
    expect(template.exercises).toHaveLength(1);
    expect(template.skillWarmup?.[0].stableKey).toBe('jumping-jacks');
    expect(template.skillCooldown?.[0].stableKey).toBe('cat-cow');
    useAppStore.getState().startWorkout(template);
    useAppStore.getState().skipSkillWarmup();
    useAppStore.getState().completeSet(0, { reps: 5 });
    expect(useAppStore.getState().activeWorkout?.pendingCooldown).toBeUndefined();
    expect(useAppStore.getState().activeWorkout?.skillWarmup).toMatchObject({ phase: 'cool_down', status: 'pending' });
  });
  it('discards QA sessions from history and enrollment', () => {
    useAppStore.setState({
      managedProgramEnrollments: [
        {
          id: 'enrollment',
          programKey: program.key,
          programVersion: 3,
          startDate: '2026-08-04',
          currentWeekKey: 'week-1',
          completedWorkoutKeys: [],
          skippedWorkoutKeys: [],
          preferredWeekdays: [],
          status: 'active',
          detached: false,
        },
      ],
    });
    const workout = compileManagedWorkout(
      program,
      'week-1',
      'day-a',
      useAppStore.getState().exercises,
      'enrollment',
    );
    workout.managedProgramLink = { ...workout.managedProgramLink!, preview: true };
    useAppStore.getState().startWorkout(workout);
    useAppStore.getState().finishWorkout();
    expect(useAppStore.getState().workoutSessions).toHaveLength(0);
    expect(useAppStore.getState().managedProgramEnrollments[0].completedWorkoutKeys).toHaveLength(
      0,
    );
  });
  it('finishes an already active workout without losing enrollment provenance after unpublish', () => {
    const builtIn = beginnerCalisthenics12Week;
    const week = builtIn.weeks[0];
    const workout = week.workouts[0];
    useAppStore.setState({ managedProgramEnrollments: [{
      id: 'enrollment', programKey: builtIn.key, programVersion: builtIn.version,
      startDate: '2026-08-04', currentWeekKey: week.key, completedWorkoutKeys: [],
      skippedWorkoutKeys: [], preferredWeekdays: [], status: 'active', detached: false,
    }] });
    const store = useAppStore.getState();
    store.startWorkout(compileManagedWorkout(builtIn, week.key, workout.key, store.exercises, 'enrollment'));
    installManagedPrograms([], [{
      contentType: 'managed_program', builtinKey: builtIn.key,
      availability: 'unpublished', updatedAt: '2026-08-08',
    }]);
    useAppStore.getState().finishWorkout();
    expect(useAppStore.getState().workoutSessions).toHaveLength(1);
    expect(useAppStore.getState().managedProgramEnrollments[0].completedWorkoutKeys).toEqual([`${week.key}:${workout.key}`]);
  });
});
