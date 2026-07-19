import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AdminSafeAreaShell } from './AdminSafeAreaShell';

describe('AdminSafeAreaShell', () => {
  afterEach(cleanup);

  it('provides the shared administrator safe-area root in LTR and RTL', () => {
    document.documentElement.dir = 'rtl';
    render(<AdminSafeAreaShell>Administrator content</AdminSafeAreaShell>);
    const shell = screen.getByTestId('admin-safe-area-shell');
    expect(shell).toHaveClass('admin-safe-area-shell');
    expect(shell).toHaveTextContent('Administrator content');
    expect(shell).toHaveProperty('dir', '');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });

  it('allows login and protected layouts to add layout classes without replacing the shell', () => {
    render(<AdminSafeAreaShell className="grid place-items-center">Login</AdminSafeAreaShell>);
    expect(screen.getByTestId('admin-safe-area-shell')).toHaveClass(
      'admin-safe-area-shell',
      'grid',
      'place-items-center',
    );
  });
});
