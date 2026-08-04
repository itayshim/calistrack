import { describe, expect, it } from 'vitest';
import layout from './layouts/AppLayout.tsx?raw';
import css from './index.css?raw';
import tour from './features/onboarding/tourSteps.ts?raw';

describe('mobile navigation contract', () => {
  it('uses five primary items and omits Workout', () => {
    expect(layout).toContain("const mobileTabs = desktopTabs.filter(([to]) => to !== '/workout')");
    expect(layout).toContain('grid-cols-5');
  });
  it('floats within the safe area and gives all app content matching clearance', () => {
    expect(css).toContain('--mobile-nav-inline-gap: 0.75rem');
    expect(css).toContain('--mobile-nav-bottom-gap: 0.75rem');
    expect(css).toContain('bottom: calc(env(safe-area-inset-bottom, 0px) + var(--mobile-nav-bottom-gap))');
    expect(css).toContain('padding-bottom: var(--mobile-nav-content-clearance)');
    expect(css).toContain('border-radius: var(--mobile-nav-radius)');
  });
  it('does not use the removed mobile Workout tab as an onboarding fallback', () => {
    expect(tour).not.toContain("'nav-workout'");
  });
});
