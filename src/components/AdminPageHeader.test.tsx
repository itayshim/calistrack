import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../app/I18nProvider';
import { createInitialData } from '../data/seed';
import { useAppStore } from '../store/useAppStore';
import { AdminPageHeader } from './AdminPageHeader';

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><I18nProvider><AdminPageHeader /></I18nProvider></MemoryRouter>);
}

describe('AdminPageHeader', () => {
  beforeEach(() => useAppStore.setState({ ...createInitialData(), hydrated: true }));
  afterEach(cleanup);

  it.each([
    ['/admin/exercises', '/admin', 'Admin home'],
    ['/admin/exercises/exercise-1/edit', '/admin/exercises', 'Exercise Manager'],
    ['/admin/skills/front-lever/preview', '/admin/skills', 'Skill Builder'],
    ['/admin/programs/beginner/versions', '/admin/programs', 'Program Builder'],
    ['/admin/programs/beginner/test/week-1/day-a', '/admin/programs', 'Program Builder'],
  ])('uses a deterministic parent for %s', (path, href, name) => {
    renderAt(path);
    expect(screen.getByTestId('admin-page-header')).toBeInTheDocument();
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
  });

  it('localizes the parent and keeps the arrow direction-aware in Hebrew', () => {
    useAppStore.setState((state) => ({ settings: { ...state.settings, language: 'he' } }));
    renderAt('/admin/programs/example/preview');
    const back = screen.getByRole('link', { name: 'בונה תוכניות' });
    expect(back).toHaveAttribute('href', '/admin/programs');
    expect(back.querySelector('svg')).toHaveClass('directional-icon');
    expect(screen.getByRole('link', { name: 'דף הבית של הניהול' })).toHaveAttribute('href', '/admin');
  });

  it('does not add a back control to the Admin root', () => {
    renderAt('/admin');
    expect(screen.queryByTestId('admin-page-header')).not.toBeInTheDocument();
  });
});
