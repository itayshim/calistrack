export interface RectLike {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface TourViewport {
  width: number;
  height: number;
  safeTop: number;
  safeRight: number;
  safeBottom: number;
  safeLeft: number;
  bottomNavigationTop?: number;
}

export interface TourCardPlacement {
  top: number;
  left: number;
  width: number;
  compact: boolean;
  side: 'above' | 'below' | 'start' | 'end' | 'top-sheet' | 'bottom-sheet';
  overlapRatio: number;
}

const GAP = 12;
const EDGE = 12;

export function intersectionRatio(target: RectLike, card: RectLike) {
  const width = Math.max(0, Math.min(target.right, card.right) - Math.max(target.left, card.left));
  const height = Math.max(0, Math.min(target.bottom, card.bottom) - Math.max(target.top, card.top));
  const targetArea = Math.max(1, target.width * target.height);
  return (width * height) / targetArea;
}

export function isLargeTourTarget(rect: RectLike, viewport: Pick<TourViewport, 'width' | 'height'>) {
  return rect.height / viewport.height > 0.55 || (rect.width * rect.height) / (viewport.width * viewport.height) > 0.65;
}

export function chooseTourCardPlacement(
  target: RectLike,
  cardSize: { width: number; height: number },
  viewport: TourViewport,
): TourCardPlacement {
  const mobile = viewport.width < 640;
  const usableTop = viewport.safeTop + EDGE;
  const usableBottom = Math.min(
    viewport.height - viewport.safeBottom - EDGE,
    (viewport.bottomNavigationTop ?? viewport.height) - GAP,
  );
  const usableLeft = viewport.safeLeft + EDGE;
  const usableRight = viewport.width - viewport.safeRight - EDGE;
  const width = Math.min(cardSize.width, usableRight - usableLeft);
  const height = cardSize.height;
  const centeredLeft = Math.max(usableLeft, Math.min(usableRight - width, target.left + target.width / 2 - width / 2));
  const candidates: Array<Omit<TourCardPlacement, 'overlapRatio'> & { preference: number }> = mobile
    ? [
        { top: target.bottom + GAP, left: centeredLeft, width, compact: false, side: 'below', preference: 0 },
        { top: target.top - height - GAP, left: centeredLeft, width, compact: false, side: 'above', preference: 1 },
        { top: usableBottom - height, left: usableLeft, width, compact: true, side: 'bottom-sheet', preference: 2 },
        { top: usableTop, left: usableLeft, width, compact: true, side: 'top-sheet', preference: 3 },
      ]
    : [
        { top: Math.max(usableTop, Math.min(usableBottom - height, target.top)), left: target.right + GAP, width, compact: false, side: 'end', preference: 0 },
        { top: Math.max(usableTop, Math.min(usableBottom - height, target.top)), left: target.left - width - GAP, width, compact: false, side: 'start', preference: 1 },
        { top: target.bottom + GAP, left: centeredLeft, width, compact: false, side: 'below', preference: 2 },
        { top: target.top - height - GAP, left: centeredLeft, width, compact: false, side: 'above', preference: 3 },
      ];

  return candidates
    .map((candidate) => {
      const rect = {
        top: candidate.top,
        bottom: candidate.top + height,
        left: candidate.left,
        right: candidate.left + width,
        width,
        height,
      };
      const overflow =
        Math.max(0, usableTop - rect.top) +
        Math.max(0, rect.bottom - usableBottom) +
        Math.max(0, usableLeft - rect.left) +
        Math.max(0, rect.right - usableRight);
      const overlapRatio = intersectionRatio(target, rect);
      return { ...candidate, overlapRatio, score: overlapRatio * 100_000 + overflow * 1_000 + candidate.preference };
    })
    .sort((a, b) => a.score - b.score)[0];
}
