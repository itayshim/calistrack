export function isVisibleInViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

export function resolveTourTarget(targets: string[] = []) {
  let largeFallback: { element: HTMLElement; targetId: string } | null = null;
  for (const target of targets) {
    const visible = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-id="${target}"]`)).find(
      isVisibleInViewport,
    );
    if (!visible) continue;
    const rect = visible.getBoundingClientRect();
    const tooLarge =
      rect.height / window.innerHeight > 0.55 ||
      (rect.width * rect.height) / (window.innerWidth * window.innerHeight) > 0.65;
    if (!tooLarge) return { element: visible, targetId: target };
    largeFallback ??= { element: visible, targetId: target };
  }
  return largeFallback;
}
