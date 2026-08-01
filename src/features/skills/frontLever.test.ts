import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../../data/exercises';
import type { WorkoutSession } from '../../types';
import { createFrontLeverAssessment, createFrontLeverWorkout, evaluateSkillSession, frontLeverLevels } from './frontLever';

describe('Front Lever skill pilot', () => {
  it('defines the six ordered levels and exact assessment holds', () => {
    expect(frontLeverLevels.map((level) => level.key)).toEqual(['tuck', 'advanced-tuck', 'one-leg', 'half', 'straddle', 'full']);
    expect(frontLeverLevels.map((level) => level.assessmentSeconds)).toEqual([20, 20, 15, 15, 15, 12]);
  });

  it('generates an ordinary workout with optional warm-up and role metadata', () => {
    const workout = createFrontLeverWorkout('tuck', builtInExercises, true);
    expect(workout.skillLink).toMatchObject({ skillKey: 'front-lever', levelKey: 'tuck', kind: 'workout' });
    expect(workout.exercises.filter((item) => item.skillSection === 'work')).toHaveLength(4);
    expect(workout.exercises.filter((item) => item.skillSection === 'warm-up')).toHaveLength(6);
    expect(workout.exercises.filter((item) => item.skillSection === 'work').every((item) => item.restSeconds === 90)).toBe(true);
  });

  it('creates a one-set assessment using the level target', () => {
    const assessment = createFrontLeverAssessment('straddle', builtInExercises);
    expect(assessment.skillLink?.kind).toBe('assessment');
    expect(assessment.exercises[0]).toMatchObject({ targetSets: 1, targetMin: 15, targetMax: 15, measurementType: 'duration' });
  });

  it('requires every work target and good technique while ignoring warm-up', () => {
    const template = createFrontLeverWorkout('tuck', builtInExercises, true);
    const session: WorkoutSession = {
      id: 'session', workoutName: template.name, startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), status: 'completed', currentExerciseIndex: 0, skillLink: template.skillLink,
      exercises: template.exercises.map((target, index) => ({ id: `e${index}`, exerciseId: target.exerciseId, target, measurementType: target.measurementType, skipped: false, sets: Array.from({ length: target.targetSets }, (_, setIndex) => ({ id: `${index}-${setIndex}`, setNumber: setIndex + 1, completed: true, ...(target.measurementType === 'duration' ? { durationSeconds: target.targetMin } : { reps: target.targetMin }) })) })),
    };
    expect(evaluateSkillSession(session, 'good')).toBe(true);
    expect(evaluateSkillSession(session, 'needs-work')).toBe(false);
    session.exercises.find((exercise) => exercise.target?.skillSection === 'work')!.sets[0].durationSeconds = 0;
    expect(evaluateSkillSession(session, 'good')).toBe(false);
  });
});
