import { describe, expect, it } from 'vitest';
import layout from './layouts/AppLayout.tsx?raw';
import css from './index.css?raw';
import tour from './features/onboarding/tourSteps.ts?raw';

describe('mobile navigation contract', () => {
  it('uses five primary items and omits Workout', () => {
    expect(layout).toContain("const mobileTabs = desktopTabs.filter(([to]) => to !== '/workout')");
    expect(layout).toContain('grid-cols-5');
  });
  it('attaches to the viewport edges and keeps the safe area inside its surface', () => {
    expect(css).toContain('--mobile-nav-safe-area: env(safe-area-inset-bottom, 0px)');
    expect(css).toContain('right: 0');
    expect(css).toContain('bottom: 0');
    expect(css).toContain('left: 0');
    expect(css).toContain('min-height: calc(var(--mobile-nav-height) + var(--mobile-nav-safe-area))');
    expect(css).toContain('padding: 0.375rem 0.375rem calc(0.375rem + var(--mobile-nav-safe-area))');
    expect(css).toContain('padding-bottom: var(--mobile-nav-content-clearance)');
    expect(css).not.toContain('--mobile-nav-inline-gap');
    expect(css).not.toContain('--mobile-nav-bottom-gap');
    expect(css).not.toContain('--mobile-nav-radius');
    expect(layout).toContain('border-t border-slate-200/80');
    expect(layout).not.toContain('mobile-bottom-nav fixed z-30 grid grid-cols-5 border border-');
  });
  it('does not use the removed mobile Workout tab as an onboarding fallback', () => {
    expect(tour).not.toContain("'nav-workout'");
  });
});
