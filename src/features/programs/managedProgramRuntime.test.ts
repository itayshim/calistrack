import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialData } from '../../data/seed';
import { useAppStore } from '../../store/useAppStore';
import { compileManagedWorkout, type ManagedProgramDefinition } from './managedProgram';
import { installManagedPrograms } from '../../services/managedPrograms';

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
    useAppStore.getState().finishWorkout();
    expect(useAppStore.getState().workoutSessions[0].managedProgramLink?.version).toBe(3);
    expect(useAppStore.getState().managedProgramEnrollments[0]).toMatchObject({
      status: 'completed',
      completedWorkoutKeys: ['week-1:day-a'],
    });
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
});
