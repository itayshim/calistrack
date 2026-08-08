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
const unillustrated = { ...exercise, id: 'builtin-jumping-jacks', stableKey: 'jumping-jacks', nameEn: 'Jumping Jacks' };

describe('Exercise Visual resolver and component', () => {
  beforeEach(() => clearExerciseVisualsForTests());
  it('uses a neutral fallback without rendering a broken image', () => {
    render(<ExerciseVisual exercise={unillustrated} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(document.querySelector('[data-visual-source="fallback"]')).toBeInTheDocument();
  });
  it('resolves the five pilot identities from the canonical catalogue without duplicates', () => {
    const keys = ['push-up', 'pull-up', 'parallel-bar-dip', 'hollow-body-hold', 'handstand'];
    keys.forEach((key) => expect(builtInExercises.filter((item) => item.stableKey === key)).toHaveLength(1));
  });
  it('resolves one explicit visual by canonical stable key across runtime identities', () => {
    installExerciseVisuals([asset]);
    expect(getExerciseVisual(exercise).source).toBe('uploaded');
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
  it('accepts static converter SVGs with an XML declaration and standard path attributes', () => {
    const converted = `<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1095 1095" width="1095" height="1095">
        <path d="M0.25 0.25C365 0.25 729 0.25 1094 0.25Z" fill="#fefefe" fill-rule="evenodd" stroke="#fefefe" stroke-width="0.25" stroke-linejoin="round"/>
        <path d="M592 121C599 121 598 141 585 152Z" fill="#495163" fill-rule="evenodd" stroke="#495163" stroke-width="0.25" stroke-linejoin="round"/>
      </svg>`;
    expect(() => validateExerciseVisualSvg(converted)).not.toThrow();
  });
  it('accepts safe definitions, clipping, masks, transforms, metadata, and internal use references', () => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 20 20">
      <metadata><rdf xmlns="http://www.w3.org/1999/02/22-rdf-syntax-ns#">static metadata</rdf></metadata>
      <defs><path id="body" d="M0 0h10v10z"/><clipPath id="clip"><circle cx="5" cy="5" r="5"/></clipPath><mask id="mask"><rect width="10" height="10" fill="#fff"/></mask></defs>
      <g transform="translate(1 1)" clip-path="url(#clip)" mask="url(#mask)" opacity=".8"><use href="#body"/></g>
    </svg>`;
    expect(() => validateExerciseVisualSvg(source)).not.toThrow();
  });
  it.each([
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><path onclick="alert(1)" d="M0 0"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
    '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>unsafe</div></foreignObject></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://example.com/a.svg#x"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><use href="javascript:alert(1)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,AAAA"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(https://example.com/fill.svg#x)" d="M0 0"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><path style="fill:url(data:image/svg+xml;base64,AAAA)" d="M0 0"/></svg>',
    '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"><text>&xxe;</text></svg>',
  ])('rejects active, external, or embedded content: %s', (source) => {
    expect(() => validateExerciseVisualSvg(source)).toThrow('unsafe_visual_svg');
  });
});
