import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../app/I18nProvider';
import { useAppStore } from '../../store/useAppStore';
import { AdminExercisesPage } from './AdminExercisesPage';

const api = vi.hoisted(() => ({ request: vi.fn() }));
const redirect = vi.hoisted(() => ({
  id: 'redirect-1',
  sourceExerciseId: 'dip-id',
  sourceStableKey: 'dip',
  sourceRuntimeId: 'builtin-dip',
  targetExerciseId: 'parallel-id',
  targetStableKey: 'parallel-bar-dip',
  targetRuntimeId: 'builtin-parallel-bar-dip',
  auditId: 'audit-1',
  status: 'active' as const,
}));

vi.mock('../../services/supabase', () => ({
  getAdminSession: () => ({ accessToken: 'token', userId: 'admin' }),
  supabaseRequest: api.request,
}));
vi.mock('../../data/exercises', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../data/exercises')>(),
  builtInExercises: [],
}));
vi.mock('../../services/exerciseVisuals', () => ({
  isExerciseVisualRegistryReady: () => true,
  useExerciseVisualRegistry: () => 1,
  getExerciseVisual: () => ({ source: 'fallback', isFallback: true }),
}));
vi.mock('../../services/exerciseMerges', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/exerciseMerges')>(),
  loadExerciseMergeRedirects: () => Promise.resolve([redirect]),
  installExerciseMergeRedirects: vi.fn(),
  findActiveExerciseMergeRedirect: (references: string[]) =>
    references.some((reference) => [redirect.sourceExerciseId, redirect.sourceStableKey, redirect.sourceRuntimeId].includes(reference))
      ? redirect
      : undefined,
}));

const row = (id: string, stableKey: string, name: string, published: boolean) => ({
  id,
  stable_key: stableKey,
  movement_family: 'Dip',
  category: 'push',
  difficulty: 'beginner',
  is_published: published,
  exercise_translations: [
    { locale: 'en', name, description: 'Description', instructions: ['Instruction'] },
    { locale: 'he', name: `${name} HE`, description: 'תיאור', instructions: ['הנחיה'] },
  ],
  exercise_media: [],
});

const rows = [
  row('dip-id', 'dip', 'Dip', false),
  row('parallel-id', 'parallel-bar-dip', 'Parallel Bar Dip', true),
  row('draft-id', 'new-dip', 'New Dip Draft', false),
];

function renderPage(language: 'en' | 'he' = 'en') {
  useAppStore.setState((state) => ({ settings: { ...state.settings, language } }));
  document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  api.request.mockResolvedValue(rows);
  return render(<MemoryRouter><I18nProvider><AdminExercisesPage /></I18nProvider></MemoryRouter>);
}

async function selectStatus(label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: languageLabel() }));
  await user.click(screen.getByRole('option', { name: label }));
  return user;
}

const languageLabel = () => useAppStore.getState().settings.language === 'he' ? 'סטטוס תרגיל' : 'Exercise status';

describe('Admin Exercise Management merged identities', () => {
  afterEach(cleanup);
  beforeEach(() => api.request.mockReset());

  it('excludes merged sources and drafts from the default active catalogue, including during search', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Parallel Bar Dip')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dip' })).not.toBeInTheDocument();
    expect(screen.queryByText('New Dip Draft')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Search shared exercises'), 'dip');
    expect(screen.queryByRole('heading', { name: 'Dip' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Parallel Bar Dip' })).toBeInTheDocument();
  });

  it('keeps ordinary drafts separate from merged sources', async () => {
    renderPage();
    await screen.findByText('Parallel Bar Dip');
    await selectStatus('Drafts');
    expect(screen.getByText('New Dip Draft')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dip' })).not.toBeInTheDocument();
  });

  it('shows merged status, redirect target, and target navigation only in the merged view', async () => {
    renderPage();
    await screen.findByText('Parallel Bar Dip');
    await selectStatus('Merged exercises');
    const heading = screen.getByRole('heading', { name: 'Dip' });
    const card = heading.closest('article')!;
    expect(within(card).getByText('Merged')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Parallel Bar Dip' })).toHaveAttribute(
      'href',
      '/admin/exercises/parallel-id/edit',
    );
    expect(within(card).getByText('dip → parallel-bar-dip')).toBeInTheDocument();
  });

  it('includes active, draft, and merged rows in All while summary counts exclude merged and draft rows', async () => {
    renderPage();
    await screen.findByText('Parallel Bar Dip');
    const summary = screen.getByLabelText('Exercise visual completeness');
    expect(within(summary).getByText('Total exercises').nextSibling).toHaveTextContent('1');
    expect(within(summary).getByText('Merged').nextSibling).toHaveTextContent('1');
    await selectStatus('All exercises');
    expect(screen.getByRole('heading', { name: 'Dip' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Parallel Bar Dip' })).toBeInTheDocument();
    expect(screen.getByText('New Dip Draft')).toBeInTheDocument();
  });

  it('renders the merged filter in Hebrew RTL', async () => {
    renderPage('he');
    await screen.findByText('Parallel Bar Dip');
    await selectStatus('תרגילים שמוזגו');
    expect(screen.getAllByText('מוזג')).toHaveLength(2);
    expect(document.documentElement.dir).toBe('rtl');
  });
});
