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
  for (const target of targets) {
    const visible = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour-id="${target}"]`)).find(
      isVisibleInViewport,
    );
    if (visible) return { element: visible, targetId: target };
  }
  return null;
}
