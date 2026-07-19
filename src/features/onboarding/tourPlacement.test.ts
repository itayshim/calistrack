import { describe, expect, it } from 'vitest';
import {
  chooseTourCardPlacement,
  intersectionRatio,
  isLargeTourTarget,
  type RectLike,
} from './tourPlacement';

const rect = (left: number, top: number, width: number, height: number): RectLike => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

describe('onboarding target-aware placement', () => {
  it.each([
    [390, 844],
    [440, 956],
  ])('places the exercise search card without overlap at %sx%s', (width, height) => {
    const target = rect(20, 110, width - 40, 82);
    const placement = chooseTourCardPlacement(target, { width: width - 24, height: 310 }, {
      width,
      height,
      safeTop: 47,
      safeRight: 0,
      safeBottom: 34,
      safeLeft: 0,
      bottomNavigationTop: height - 100,
    });
    expect(placement.overlapRatio).toBeLessThanOrEqual(0.05);
    expect(['above', 'below']).toContain(placement.side);
  });

  it('places the filter explanation below a smart-scrolled filter group', () => {
    const target = rect(16, 82, 358, 250);
    const placement = chooseTourCardPlacement(target, { width: 366, height: 310 }, {
      width: 390,
      height: 844,
      safeTop: 47,
      safeRight: 0,
      safeBottom: 34,
      safeLeft: 0,
      bottomNavigationTop: 744,
    });
    expect(placement.side).toBe('below');
    expect(placement.overlapRatio).toBe(0);
  });

  it('uses a focused settings target rather than a viewport-height form', () => {
    expect(isLargeTourTarget(rect(12, 40, 366, 720), { width: 390, height: 844 })).toBe(true);
    expect(isLargeTourTarget(rect(20, 180, 350, 92), { width: 390, height: 844 })).toBe(false);
  });

  it('uses side placement on desktop and stays clear of the target', () => {
    const target = rect(360, 180, 480, 130);
    const placement = chooseTourCardPlacement(target, { width: 420, height: 280 }, {
      width: 1440,
      height: 900,
      safeTop: 0,
      safeRight: 0,
      safeBottom: 0,
      safeLeft: 0,
    });
    expect(['start', 'end']).toContain(placement.side);
    expect(placement.overlapRatio).toBe(0);
  });

  it('calculates overlap as a percentage of target area', () => {
    expect(intersectionRatio(rect(0, 0, 100, 100), rect(50, 50, 100, 100))).toBe(0.25);
  });
});
