export function isTabActive(tabPath: string, pathname: string): boolean {
  if (tabPath === '/') return pathname === '/';
  if (tabPath === '/program') return pathname === '/program' || pathname.startsWith('/program/');
  if (tabPath === '/workout') return pathname === '/workout' || pathname.startsWith('/workout/');
  return pathname === tabPath || pathname.startsWith(`${tabPath}/`);
}
