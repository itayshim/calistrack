import type { ReactNode } from 'react';

interface AdminSafeAreaShellProps {
  children: ReactNode;
  className?: string;
}

export function AdminSafeAreaShell({ children, className = '' }: AdminSafeAreaShellProps) {
  return (
    <div
      data-testid="admin-safe-area-shell"
      className={`admin-safe-area-shell ${className}`.trim()}
    >
      {children}
    </div>
  );
}
