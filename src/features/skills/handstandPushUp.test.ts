import { describe, expect, it } from 'vitest';
import { builtInExercises } from '../../data/exercises';
import { evaluateSkillSession } from './skillEngine';
import { createHandstandPushUpAssessment, createHandstandPushUpWorkout, handstandPushUpSkill, validateHandstandPushUpContent } from './handstandPushUp';
import { getDefaultSkillProgress, skillRegistry } from './registry';

describe('Handstand Push-Up Skill', () => {
  it('is registered alongside Front Lever with five ordered levels', () => {
    expect(skillRegistry.map((skill) => skill.key)).toEqual(['front-lever', 'handstand-push-up', 'handstand']);
    expect(handstandPushUpSkill.levels.map((level) => level.key)).toEqual(['pike-push-up','advanced-pike-push-up','wall-handstand-push-up','negative-handstand-push-up','handstand-push-up']);
    expect(getDefaultSkillProgress('handstand-push-up')).toMatchObject({ activeLevelKey: 'pike-push-up', unlockedLevelKeys: ['pike-push-up'] });
  });
  it('contains the exact five-item optional warm-up with data-driven Downward Dog', () => {
    expect(handstandPushUpSkill.warmup.map((item) => item.exerciseKey)).toEqual(['jumping-jacks','wrist-rolls','elbow-circles','arm-circles','downward-dog']);
    expect(handstandPushUpSkill.warmup[4]).toMatchObject({ durationSeconds: 20, guidanceEn: '20 seconds' });
    const workout=createHandstandPushUpWorkout('pike-push-up',builtInExercises,true);
    expect(workout.skillWarmup).toHaveLength(5);
    expect(workout.exercises.every((item)=>item.skillSection==='work'&&item.restSeconds===90)).toBe(true);
  });
  it('matches all exact work prescriptions and repetition assessments', () => {
    expect(handstandPushUpSkill.levels.map((l)=>l.work.map((x)=>[x.exerciseKey,x.measurementType,x.sets,x.target,x.restSeconds]))).toEqual([
      [['pike-push-up','reps',3,4,90],['hindu-push-up','reps',3,6,90],['headstand','duration',3,10,90],['wall-handstand','duration',3,10,90]],
      [['advanced-pike-push-up','reps',3,3,90],['wall-handstand','duration',3,15,90],['pike-push-up','reps',3,10,90],['headstand','duration',3,15,90]],
      [['wall-handstand-push-up','reps',3,3,90],['handstand','duration',3,10,90],['advanced-pike-push-up','reps',3,4,90],['frog-stand','duration',3,12,90]],
      [['negative-handstand-push-up','reps',3,3,90],['wall-handstand-push-up','reps',3,5,90],['handstand','duration',3,20,90],['advanced-pike-push-up','reps',3,10,90]],
      [['handstand-push-up','reps',3,2,90],['wall-handstand-push-up','reps',3,6,90],['handstand','duration',3,30,90],['advanced-pike-push-up','reps',3,12,90]],
    ]);
    expect(handstandPushUpSkill.levels.map((l)=>l.assessment.target)).toEqual([10,10,6,6,5]);
    expect(handstandPushUpSkill.levels.every((l)=>l.assessment.measurementType==='reps')).toBe(true);
  });
  it('resolves every canonical identity exactly and blocks missing content', () => {
    expect(validateHandstandPushUpContent(builtInExercises)).toEqual({ valid:true, warnings:[], blockingErrors:[] });
    expect(validateHandstandPushUpContent(builtInExercises.filter((e)=>e.stableKey!=='downward-dog')).blockingErrors).toContainEqual(expect.objectContaining({code:'missing_exercise',exerciseKey:'downward-dog'}));
  });
  it('creates a reps assessment and uses the shared success calculator', () => {
    const template=createHandstandPushUpAssessment('pike-push-up',builtInExercises);
    expect(template.exercises[0]).toMatchObject({ measurementType:'reps', targetSets:1, targetMin:10, restSeconds:0 });
    const session={id:'s',workoutName:'assessment',startedAt:'2026-01-01',status:'completed' as const,currentExerciseIndex:0,skillLink:template.skillLink,exercises:template.exercises.map((target)=>({id:'e',exerciseId:target.exerciseId,target,measurementType:target.measurementType,skipped:false,sets:[{id:'set',setNumber:1,reps:10,completed:true}]}))};
    expect(evaluateSkillSession(session,'good')).toBe(true);
    expect(evaluateSkillSession(session,'needs-work')).toBe(false);
  });
});
