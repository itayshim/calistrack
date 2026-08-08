import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../app/I18nProvider';
import type { ManagedProgramRecord } from '../../services/managedPrograms';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  install: vi.fn(),
  setLifecycle: vi.fn(),
}));

const definition = {
  schemaVersion: 1 as const,
  key: 'beginner-calisthenics-12-week',
  version: 1,
  nameEn: '12-Week Beginner Calisthenics',
  nameHe: 'תוכנית קליסטניקס למתחילים',
  shortDescriptionEn: '', shortDescriptionHe: '', descriptionEn: '', descriptionHe: '',
  difficulty: 'beginner' as const,
  goals: ['strength' as const], durationWeeks: 12, sessionsPerWeek: 3,
  estimatedMinutesMin: 30, estimatedMinutesMax: 60, equipment: [], tags: [],
  targetAudienceEn: '', targetAudienceHe: '', featured: true, sortOrder: 1, phases: [],
  weeks: [],
};
const builtIn: ManagedProgramRecord = {
  id: `builtin:${definition.key}`,
  stableKey: definition.key,
  source: 'built-in',
  status: 'published',
  draftVersion: 1,
  publishedVersion: 1,
  definition,
  validation: null,
  updatedAt: '2026-08-04T00:00:00.000Z',
};
const override: ManagedProgramRecord = {
  ...builtIn,
  id: '4b40f413-0c98-4a56-956f-c06c6e327e70',
  source: 'builtin_override',
  builtinKey: definition.key,
  basedOnBuiltinHash: 'hash',
};

vi.mock('../../services/managedPrograms', () => ({
  getBuiltInManagedPrograms: () => [builtIn],
  getManagedProgram: vi.fn(),
  installManagedPrograms: mocks.install,
  loadAdminManagedPrograms: mocks.load,
  mergeAdminManagedProgramRows: (builtIns: ManagedProgramRecord[], backend: ManagedProgramRecord[]) => {
    const managedOverride = backend.find((item) => item.source === 'builtin_override');
    return [managedOverride ?? builtIns[0], ...backend.filter((item) => item.source === 'admin-created')];
  },
  publishManagedProgram: vi.fn(),
  saveManagedProgramDraft: vi.fn(),
  setManagedProgramLifecycle: mocks.setLifecycle,
}));

import { AdminProgramBuilderListPage } from './AdminProgramBuilderPage';

const renderPage = () => render(
  <MemoryRouter>
    <I18nProvider><AdminProgramBuilderListPage /></I18nProvider>
  </MemoryRouter>,
);

describe('Admin Managed Program lifecycle UI', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mocks.load.mockReset().mockResolvedValue([]);
    mocks.install.mockReset();
    mocks.setLifecycle.mockReset().mockResolvedValue(undefined);
  });

  it('does not expose impossible lifecycle actions for an untouched built-in', async () => {
    renderPage();
    expect(await screen.findByText('12-Week Beginner Calisthenics')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create editable version/ })).toBeInTheDocument();
  });

  it('unpublishes the database override once, reloads canonical state, and shows built-in fallback', async () => {
    mocks.load
      .mockResolvedValueOnce([override])
      .mockResolvedValueOnce([{ ...override, status: 'unpublished' }]);
    renderPage();
    const button = await screen.findByRole('button', { name: 'Unpublish' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(mocks.setLifecycle).toHaveBeenCalledTimes(1));
    expect(mocks.setLifecycle).toHaveBeenCalledWith(override, 'unpublished');
    expect(await screen.findByText('The original built-in definition is currently effective.')).toBeInTheDocument();
    expect(mocks.load).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
  });

  it('renders a localized safe error instead of leaving a rejected mutation uncaught', async () => {
    mocks.load.mockResolvedValue([override]);
    mocks.setLifecycle.mockRejectedValue(new Error('database failure'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Unpublish' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Program lifecycle could not be updated. Try again.',
    );
    expect(mocks.load).toHaveBeenCalledTimes(1);
  });
});
