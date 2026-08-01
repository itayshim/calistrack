import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../../data/exercises';
import type { WorkoutSession } from '../../types';
import { createFrontLeverAssessment, createFrontLeverWorkout, evaluateSkillSession, frontLeverLevels, frontLeverWarmup, resolveSkillExercise, validateFrontLeverContent } from './frontLever';

describe('Front Lever skill pilot', () => {
  it('defines the six ordered levels and exact assessment holds', () => {
    expect(frontLeverLevels.map((level) => level.key)).toEqual(['tuck', 'advanced-tuck', 'one-leg', 'half', 'straddle', 'full']);
    expect(frontLeverLevels.map((level) => level.assessmentSeconds)).toEqual([20, 20, 15, 15, 15, 12]);
  });

  it('generates an ordinary workout with optional warm-up and role metadata', () => {
    const workout = createFrontLeverWorkout('tuck', builtInExercises, true);
    expect(workout.skillLink).toMatchObject({ skillKey: 'front-lever', levelKey: 'tuck', kind: 'workout' });
    expect(workout.exercises.filter((item) => item.skillSection === 'work')).toHaveLength(4);
    expect(workout.exercises.filter((item) => item.skillSection === 'warm-up')).toHaveLength(0);
    expect(workout.skillWarmup?.map((item) => item.stableKey)).toEqual(['jumping-jacks', 'wrist-rolls', 'elbow-circles', 'arm-circles', 'arch-active-hang', 'active-bar-hang']);
    expect(workout.exercises.filter((item) => item.skillSection === 'work').every((item) => item.restSeconds === 90)).toBe(true);
  });

  it('uses the exact authoritative content for every level', () => {
    expect(frontLeverLevels.map((level) => level.work.map((item) => [item.exerciseKey, item.sets, item.target, item.measurementType]))).toEqual([
      [['tuck-front-lever',3,6,'duration'],['tuck-front-lever-raise',3,5,'reps'],['pull-up',3,6,'reps'],['leg-raise',3,10,'reps']],
      [['advanced-tuck-front-lever',3,8,'duration'],['tuck-front-lever',3,20,'duration'],['tuck-front-lever-raise',3,6,'reps'],['toes-to-bar',3,10,'reps']],
      [['one-leg-front-lever',3,8,'duration'],['advanced-tuck-front-lever',3,10,'duration'],['advanced-tuck-front-lever-raise',3,3,'reps'],['toes-to-bar',3,10,'reps']],
      [['half-front-lever',3,8,'duration'],['advanced-tuck-front-lever',3,15,'duration'],['ice-cream-maker',3,5,'reps'],['toes-to-bar',3,10,'reps']],
      [['straddle-front-lever',3,5,'duration'],['one-leg-front-lever',3,15,'duration'],['ice-cream-maker',3,8,'reps'],['dragon-flag',1,6,'reps']],
      [['front-lever',3,3,'duration'],['straddle-front-lever',3,10,'duration'],['ice-cream-maker',3,5,'reps'],['dragon-flag',1,8,'reps']],
    ]);
    expect(frontLeverLevels.every((level) => createFrontLeverWorkout(level.key, builtInExercises, false).exercises.every((item) => item.restSeconds === 90 && item.skillSection === 'work' && item.requiredForSkillSuccess))).toBe(true);
  });

  it('resolves exact stable keys without substituting similar exercises', () => {
    expect(resolveSkillExercise(builtInExercises, 'elbow-circles').stableKey).toBe('elbow-circles');
    expect(resolveSkillExercise(builtInExercises, 'arm-circles').stableKey).toBe('arm-circles');
    expect(resolveSkillExercise(builtInExercises, 'leg-raise').stableKey).toBe('leg-raise');
    expect(resolveSkillExercise(builtInExercises, 'arch-active-hang').stableKey).toBe('arch-active-hang');
    expect(() => resolveSkillExercise(builtInExercises, 'elbow-swings')).toThrow('Missing skill exercise');
  });

  it('validates all references and reports missing content as blocking', () => {
    expect(validateFrontLeverContent(builtInExercises)).toEqual({ valid: true, warnings: [], blockingErrors: [] });
    const missing = builtInExercises.filter((exercise) => exercise.stableKey !== 'elbow-circles');
    expect(validateFrontLeverContent(missing).blockingErrors).toContainEqual(expect.objectContaining({ code: 'missing_exercise', exerciseKey: 'elbow-circles' }));
    expect(frontLeverWarmup).toHaveLength(6);
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
