import { describe, expect, it } from 'vitest';
import layout from './layouts/AppLayout.tsx?raw';
import css from './index.css?raw';
import tour from './features/onboarding/tourSteps.ts?raw';

describe('mobile navigation contract', () => {
  it('uses five primary items and omits Workout', () => {
    expect(layout).toContain("const mobileTabs = desktopTabs.filter(([to]) => to !== '/workout')");
    expect(layout).toContain('grid-cols-5');
  });
  it('anchors to the safe-area edge and gives all app content matching clearance', () => {
    expect(css).toContain('bottom: 0;');
    expect(css).toContain('padding-bottom: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom, 0px) + var(--mobile-nav-gap))');
    expect(css).toContain('padding-bottom: max(0.375rem, env(safe-area-inset-bottom, 0px))');
  });
  it('does not use the removed mobile Workout tab as an onboarding fallback', () => {
    expect(tour).not.toContain("'nav-workout'");
  });
});
