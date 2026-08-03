import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../../data/exercises';
import { evaluateSkillSession } from './skillEngine';
import {
  createHandstandAssessment,
  createHandstandWorkout,
  handstandSkill,
  validateHandstandContent,
} from './handstand';
import { getDefaultSkillProgress, getSkillDefinition, skillRegistry } from './registry';

const prescription = (levelIndex: number) =>
  handstandSkill.levels[levelIndex].work.map((item) => [
    item.exerciseKey,
    item.measurementType,
    item.sets,
    item.target,
    item.restSeconds,
  ]);

describe('Handstand built-in Skill', () => {
  it('registers separately beside the existing built-in Skills', () => {
    expect(skillRegistry.map((skill) => skill.key)).toEqual(
      expect.arrayContaining(['front-lever', 'handstand-push-up', 'handstand']),
    );
    expect(getSkillDefinition('handstand')).toBe(handstandSkill);
    expect(handstandSkill.levels.map((level) => level.key)).toEqual([
      'shoulder-support',
      'handstand-kick-up',
      'fingertip-control',
      'free-balance',
      'controlled-handstand',
    ]);
    expect(getDefaultSkillProgress('handstand')).toMatchObject({
      skillKey: 'handstand',
      activeLevelKey: 'shoulder-support',
      unlockedLevelKeys: ['shoulder-support'],
    });
    expect(getDefaultSkillProgress('handstand-push-up').skillKey).not.toBe('handstand');
  });

  it('defines the exact shared warm-up and simple timer', () => {
    expect(handstandSkill.warmup.map((item) => item.exerciseKey)).toEqual([
      'jumping-jacks',
      'wrist-rolls',
      'elbow-circles',
      'arm-circles',
      'downward-dog',
      'wall-wrist-lean',
    ]);
    expect(handstandSkill.warmup[4]).toMatchObject({ durationSeconds: 20 });
  });

  it('matches Level 1 and transparently represents the manual top-hold requirement', () => {
    expect(prescription(0)).toEqual([
      ['pike-hold', 'duration', 3, 30, 90],
      ['elevated-pike-hold', 'duration', 3, 20, 90],
      ['wall-walk-with-top-hold', 'reps', 3, 1, 90],
      ['hollow-body-hold', 'duration', 3, 20, 90],
    ]);
    expect(handstandSkill.levels[0].assessment).toMatchObject({
      exerciseKey: 'wall-walk-with-top-hold',
      target: 3,
      measurementType: 'reps',
      techniqueRequired: true,
      manuallyVerifiedRequirements: true,
    });
    expect(handstandSkill.levels[0].assessment.instructionsEn).toContain('20-second hold');
    expect(handstandSkill.levels[0].work[2].noteEn).toContain('20 seconds');
  });

  it('matches Levels 2 and 3 exactly', () => {
    expect(prescription(1)).toEqual([
      ['wall-handstand-kick-up', 'reps', 3, 2, 75],
      ['wall-handstand', 'duration', 3, 20, 90],
      ['split-stance-kick-up-drill', 'reps', 3, 4, 60],
      ['hollow-body-hold', 'duration', 3, 25, 75],
    ]);
    expect(handstandSkill.levels[1].assessment.target).toBe(5);
    expect(handstandSkill.levels[1].work[2].noteEn).toContain('both sides');
    expect(prescription(2)).toEqual([
      ['handstand-finger-press', 'reps', 3, 5, 90],
      ['wall-handstand', 'duration', 3, 25, 90],
      ['wall-handstand-toe-pull', 'reps', 3, 5, 90],
      ['hollow-body-hold', 'duration', 3, 30, 75],
    ]);
    expect(handstandSkill.levels[2].assessment.target).toBe(15);
  });

  it('matches Levels 4 and 5 and keeps formal duration assessments separate', () => {
    expect(prescription(3)).toEqual([
      ['wall-handstand-finger-press-release', 'reps', 3, 5, 90],
      ['free-standing-handstand', 'duration', 3, 8, 120],
      ['wall-handstand-toe-pull', 'reps', 3, 8, 90],
      ['handstand-kick-up', 'reps', 3, 3, 90],
    ]);
    expect(handstandSkill.levels[3]).toMatchObject({
      performance: { exerciseKey: 'free-standing-handstand', metric: 'duration' },
      assessment: { target: 20, measurementType: 'duration' },
    });
    expect(prescription(4)).toEqual([
      ['free-standing-handstand', 'duration', 3, 15, 120],
      ['handstand-kick-up', 'reps', 3, 5, 90],
      ['handstand-cartwheel-exit', 'reps', 3, 3, 75],
      ['wall-handstand-finger-press-release', 'reps', 3, 8, 90],
    ]);
    expect(handstandSkill.levels[4].assessment).toMatchObject({
      target: 30,
      marksSkillMastered: true,
      techniqueRequired: true,
    });
    expect(handstandSkill.levels[4].work[2].noteEn).toContain('each side');
  });

  it('resolves every canonical identity exactly and reports manual verification as a warning', () => {
    const result = validateHandstandContent(builtInExercises);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((issue) => issue.code === 'manual_assessment_requirement')).toBe(
      true,
    );
    expect(
      validateHandstandContent(
        builtInExercises.filter((exercise) => exercise.stableKey !== 'wall-wrist-lean'),
      ).blockingErrors,
    ).toContainEqual(
      expect.objectContaining({ code: 'missing_exercise', exerciseKey: 'wall-wrist-lean' }),
    );
  });

  it('uses the generic workout and success calculation', () => {
    const template = createHandstandWorkout('handstand-kick-up', builtInExercises, true);
    const session = {
      id: 'handstand-session',
      workoutName: template.name,
      startedAt: '2026-08-03T10:00:00Z',
      status: 'completed' as const,
      currentExerciseIndex: 0,
      skillLink: template.skillLink,
      exercises: template.exercises.map((target, exerciseIndex) => ({
        id: `exercise-${exerciseIndex}`,
        exerciseId: target.exerciseId,
        target,
        measurementType: target.measurementType!,
        skipped: false,
        sets: Array.from({ length: target.targetSets }, (_, setIndex) => ({
          id: `set-${exerciseIndex}-${setIndex}`,
          setNumber: setIndex + 1,
          reps: target.measurementType === 'reps' ? target.targetMin : undefined,
          durationSeconds: target.measurementType === 'duration' ? target.targetMin : undefined,
          completed: true,
        })),
      })),
    };
    expect(evaluateSkillSession(session, 'good')).toBe(true);
    expect(evaluateSkillSession(session, 'partial')).toBe(false);
  });

  it('creates exact formal assessments without a combined measurement type', () => {
    expect(
      createHandstandAssessment('shoulder-support', builtInExercises).exercises[0],
    ).toMatchObject({ targetSets: 1, targetMin: 3, measurementType: 'reps' });
    expect(createHandstandAssessment('free-balance', builtInExercises).exercises[0]).toMatchObject({
      targetSets: 1,
      targetMin: 20,
      measurementType: 'duration',
    });
  });
});
