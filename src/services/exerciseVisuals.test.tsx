import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise, ExerciseVisualAsset } from '../types';
import { ExerciseVisual } from '../components/ExerciseVisual';
import { builtInExercises } from '../data/exercises';
import { clearExerciseVisualsForTests, getExerciseVisual, installExerciseVisuals, validateExerciseVisualFile, validateExerciseVisualSvg } from './exerciseVisuals';

vi.mock('./supabase', () => ({
  getAdminSession: () => ({ accessToken: 'admin-token' }),
  supabaseConfigured: true,
  supabaseRequest: vi.fn(),
}));

const exercise: Exercise = { id: 'builtin-push-up', stableKey: 'push-up', nameEn: 'Push-Up', nameHe: 'שכיבת סמיכה', category: 'push', difficulty: 'beginner', muscles: [], measurementType: 'reps', description: '', instructions: [], commonMistakes: [], isCustom: false };
const asset: ExerciseVisualAsset = { stableKey: 'push-up', storagePath: 'visuals/push-up/visual.svg', mimeType: 'image/svg+xml', format: 'svg', fileSizeBytes: 1200, viewBox: '0 0 100 100' };

describe('Exercise Visual resolver and component', () => {
  beforeEach(() => clearExerciseVisualsForTests());
  it('uses a neutral fallback without rendering a broken image', () => {
    render(<ExerciseVisual exercise={exercise} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(document.querySelector('[data-visual-source="fallback"]')).toBeInTheDocument();
  });
  it('resolves the five pilot identities from the canonical catalogue without duplicates', () => {
    const keys = ['push-up', 'pull-up', 'parallel-bar-dip', 'hollow-body-hold', 'handstand'];
    keys.forEach((key) => expect(builtInExercises.filter((item) => item.stableKey === key)).toHaveLength(1));
  });
  it('resolves one explicit visual by canonical stable key across runtime identities', () => {
    installExerciseVisuals([asset]);
    expect(getExerciseVisual(exercise).source).toBe('explicit');
    expect(getExerciseVisual({ id: 'global-uuid', stableKey: exercise.stableKey }).src).toContain('visuals/push-up/visual.svg');
  });
  it('falls back safely when a remote asset fails and never mirrors in RTL', () => {
    installExerciseVisuals([asset]);
    const { container } = render(<div dir="rtl"><ExerciseVisual exercise={exercise} /></div>);
    const image = container.querySelector('img') as HTMLImageElement;
    fireEvent.error(image);
    expect(image).toHaveAttribute('hidden');
    expect(container.querySelector('[data-exercise-visual]')).not.toHaveClass('rtl:scale-x-[-1]');
  });
  it('enforces format-specific MIME and size rules', () => {
    expect(() => validateExerciseVisualFile({ type: 'image/svg+xml', size: 200 * 1024 })).not.toThrow();
    expect(() => validateExerciseVisualFile({ type: 'image/jpeg', size: 10 })).toThrow('invalid_visual_mime');
    expect(() => validateExerciseVisualFile({ type: 'image/png', size: 500 * 1024 + 1 })).toThrow('visual_too_large');
    expect(() => validateExerciseVisualSvg('<svg viewBox="0 0 10 10"><path d="M0 0"/></svg>')).not.toThrow();
    expect(() => validateExerciseVisualSvg('<svg><script>alert(1)</script></svg>')).toThrow('unsafe_visual_svg');
  });
});
