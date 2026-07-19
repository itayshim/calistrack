import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import css from './index.css?raw';
import adminLayout from './pages/admin/AdminLayout.tsx?raw';
import adminLogin from './pages/admin/AdminLoginPage.tsx?raw';

describe('administrator safe-area contract', () => {
  it('uses one viewport declaration with viewport-fit cover', () => {
    expect(html.match(/<meta\s+name="viewport"/g)).toHaveLength(1);
    expect(html).toMatch(/content="width=device-width, initial-scale=1, viewport-fit=cover"/);
  });

  it('applies top, side, and bottom safe-area insets at the shared root', () => {
    expect(css).toContain('padding-top: calc(env(safe-area-inset-top, 0px) + var(--admin-header-top-spacing))');
    expect(css).toContain('padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--admin-content-bottom-spacing))');
    expect(css).toContain('padding-right: max(1rem, env(safe-area-inset-right, 0px))');
    expect(css).toContain('padding-left: max(1rem, env(safe-area-inset-left, 0px))');
  });

  it('uses dynamic viewport height with a fallback and bounded desktop spacing', () => {
    expect(css).toMatch(/min-height:\s*100vh;[\s\S]*min-height:\s*100dvh;/);
    expect(css).toContain('--admin-header-top-spacing: 2rem');
    expect(css).not.toMatch(/padding-top:\s*(?:8|9|10|11|12)rem/);
  });

  it('does not move the administrator header above its safe-area shell', () => {
    expect(adminLayout).not.toMatch(/(?:-mt-|negative|top:\s*-|translate-y-\[-)/);
    expect(adminLayout).not.toMatch(/(?:fixed|absolute)[^"'\n]*top/);
  });

  it('uses the same shared shell for login and protected administrator routes', () => {
    expect(adminLayout).toContain('<AdminSafeAreaShell>');
    expect(adminLogin).toContain('<AdminSafeAreaShell className="grid place-items-center">');
  });

  it('keeps mobile header actions inside the shell and touch friendly', () => {
    expect(adminLayout).toContain('className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end"');
    expect(css).toContain('padding-right: max(1rem, env(safe-area-inset-right, 0px))');
    expect(css).toContain('padding-left: max(1rem, env(safe-area-inset-left, 0px))');
    expect(css).toMatch(/\.btn\s*\{[\s\S]*min-h-12/);
  });
});
