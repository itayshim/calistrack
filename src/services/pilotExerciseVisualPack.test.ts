import { describe, expect, it } from 'vitest';
import pushUp from '../assets/exercise-visuals/pilot/push-up.svg?raw';
import pullUp from '../assets/exercise-visuals/pilot/pull-up.svg?raw';
import parallelBarDip from '../assets/exercise-visuals/pilot/parallel-bar-dip.svg?raw';
import hollowBodyHold from '../assets/exercise-visuals/pilot/hollow-body-hold.svg?raw';
import handstand from '../assets/exercise-visuals/pilot/handstand.svg?raw';
import { pilotExerciseVisuals } from '../assets/exercise-visuals/pilot';
import { builtInExercises } from '../data/exercises';
import { getExerciseVisual, validateExerciseVisualSvg } from './exerciseVisuals';
import workoutPage from '../pages/WorkoutPage.tsx?raw';
import exercisesPage from '../pages/ExercisesPage.tsx?raw';
import exerciseDetailPage from '../pages/ExerciseDetailPage.tsx?raw';
import skillLevelPage from '../pages/SkillLevelPage.tsx?raw';
import visualMigration from '../../supabase/migrations/202608080003_exercise_visuals.sql?raw';

const sources = new Map([
  ['push-up', pushUp], ['pull-up', pullUp], ['parallel-bar-dip', parallelBarDip],
  ['hollow-body-hold', hollowBodyHold], ['handstand', handstand],
]);

describe('CalisTrack pilot Exercise Visual pack', () => {
  it('contains exactly five unique canonical stable keys', () => {
    expect(pilotExerciseVisuals.map((item) => item.stableKey)).toEqual([...sources.keys()]);
    expect(new Set(pilotExerciseVisuals.map((item) => item.stableKey)).size).toBe(5);
    sources.forEach((_, key) => expect(builtInExercises.filter((item) => item.stableKey === key)).toHaveLength(1));
  });
  it('resolves every pilot as built-in and no unrelated exercise to a pilot', () => {
    sources.forEach((_, stableKey) => expect(getExerciseVisual({ id: `builtin-${stableKey}`, stableKey }).source).toBe('built-in'));
    expect(getExerciseVisual({ id: 'builtin-jumping-jacks', stableKey: 'jumping-jacks' }).isFallback).toBe(true);
  });
  it('uses the canonical viewBox, stays within the SVG limit, and passes safety validation', () => {
    sources.forEach((source) => {
      expect(source).toContain('viewBox="0 0 256 256"');
      expect(new Blob([source]).size).toBeLessThanOrEqual(200 * 1024);
      expect(() => validateExerciseVisualSvg(source)).not.toThrow();
      expect(source).not.toMatch(/<script|foreignObject|\bon\w+=|(?:href|src)\s*=|data:/i);
    });
  });
  it('uses one coherent static silhouette palette without text, gradients, animation, or raster content', () => {
    sources.forEach((source) => {
      expect(source).toContain('fill="#475569"');
      expect(source).toContain('stroke="#f8fafc"');
      expect(source).not.toMatch(/<text|gradient|animate|filter|<image/i);
    });
  });
  it('uses the shared resolver component on runner, library, detail, and Skill prescription surfaces', () => {
    [workoutPage, exercisesPage, exerciseDetailPage, skillLevelPage].forEach((source) => {
      expect(source).toContain("import { ExerciseVisual }");
      expect(source).toContain('<ExerciseVisual');
    });
  });
  it('does not mix the pilot pack into demonstration media storage', () => {
    expect(visualMigration).toContain("'exercise-visuals'");
    expect(visualMigration).not.toContain('insert into public.exercise_media');
  });
});
