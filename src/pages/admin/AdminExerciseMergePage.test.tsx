import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../app/I18nProvider';
import { useAppStore } from '../../store/useAppStore';
import { AdminExerciseMergePage } from './AdminExerciseMergePage';

const api = vi.hoisted(() => ({ request: vi.fn(), preview: vi.fn(), execute: vi.fn() }));
vi.mock('../../services/supabase', () => ({
  getAdminSession: () => ({ accessToken: 'token', userId: 'admin' }),
  supabaseRequest: api.request,
}));
vi.mock('../../services/exerciseMerges', async (original) => ({
  ...(await original<typeof import('../../services/exerciseMerges')>()),
  previewExerciseMerge: api.preview,
  executeExerciseMerge: api.execute,
}));

const exercise = (id: string, key: string, en: string, he: string, aliases: string[] = [], keywords: string[] = []) => ({
  id, stable_key: key, movement_family: 'Dip', category: 'push', difficulty: 'intermediate',
  measurement_type: 'reps', muscles: ['chest'], aliases, keywords, is_published: true,
  exercise_translations: [{ locale: 'en', name: en, description: `${en} description`, instructions: [] }, { locale: 'he', name: he, description: 'תיאור', instructions: [] }],
  exercise_media: [],
});
const rows = [
  exercise('source-uuid', 'dip', 'Dip', 'מקבילים', ['Bodyweight Dip'], ['chest']),
  exercise('target-uuid', 'parallel-bar-dip', 'Parallel Bar Dip', 'מקבילים על מקבילים'),
  exercise('pull-uuid', 'pull-up', 'Pull-Up', 'מתח', ['Chin over bar'], ['pull']),
];

async function choose(user: ReturnType<typeof userEvent.setup>, label: string, option: RegExp) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('AdminExerciseMergePage', () => {
  beforeEach(() => {
    useAppStore.setState({ settings: { ...useAppStore.getState().settings, language: 'en' } });
    api.request.mockImplementation((path: string) => Promise.resolve(path.includes('merge_audits') ? [] : rows));
    api.preview.mockResolvedValue({ safe: true, blocking: [], warnings: ['metadata_difference'], source: {}, target: {}, sourceMedia: [], targetMedia: [], counts: { media: 1 }, visual: { policy: 'target_wins' }, policies: {} });
    api.execute.mockResolvedValue({ auditId: 'audit', copiedMedia: 1, sourceStableKey: 'dip', targetStableKey: 'parallel-bar-dip' });
  });
  afterEach(() => cleanup());

  it('opens both pickers and keeps merge execution behind dry-run and confirmation', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><I18nProvider><AdminExerciseMergePage /></I18nProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Source exercise' })).toBeVisible());
    await choose(user, 'Source exercise', /^Dip · dip/);
    await choose(user, 'Target exercise', /^Parallel Bar Dip · parallel-bar-dip/);
    expect(screen.queryByRole('button', { name: 'Merge and redirect' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Preview merge' }));
    await waitFor(() => expect(api.preview).toHaveBeenCalledWith('source-uuid', 'target-uuid'));
    expect(api.execute).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Merge and redirect' })).toBeDisabled();
    await user.type(screen.getByLabelText('Type the target stable key to confirm'), 'parallel-bar-dip');
    expect(screen.getByRole('button', { name: 'Merge and redirect' })).toBeEnabled();
  });

  it.each([
    ['English name', 'Pull-Up', /^Pull-Up · pull-up/],
    ['Hebrew name', 'מתח', /^Pull-Up · pull-up/],
    ['stable key', 'parallel-bar-dip', /^Parallel Bar Dip · parallel-bar-dip/],
    ['alias', 'Bodyweight Dip', /^Dip · dip/],
    ['keyword', 'chest', /^Dip · dip/],
  ])('filters by %s', async (_, query, expected) => {
    const user = userEvent.setup();
    render(<MemoryRouter><I18nProvider><AdminExerciseMergePage /></I18nProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Source exercise' })).toBeVisible());
    await user.click(screen.getByRole('combobox', { name: 'Source exercise' }));
    const search = await screen.findByRole('textbox', { name: 'Search · Source exercise' });
    expect(search).toHaveFocus();
    await user.type(search, query);
    expect(screen.getByRole('option', { name: expected })).toBeVisible();
  });

  it('disables the selected exercise in the opposite picker without swapping direction', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><I18nProvider><AdminExerciseMergePage /></I18nProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Source exercise' })).toBeVisible());
    await choose(user, 'Source exercise', /^Dip · dip/);
    await user.click(screen.getByRole('combobox', { name: 'Target exercise' }));
    expect(screen.getByRole('option', { name: /Dip · dip.*Selected as source/ })).toBeDisabled();
    await user.click(screen.getByRole('option', { name: /^Parallel Bar Dip · parallel-bar-dip/ }));
    await user.click(screen.getByRole('combobox', { name: 'Source exercise' }));
    expect(screen.getByRole('option', { name: /Parallel Bar Dip.*Selected as target/ })).toBeDisabled();
  });

  it('supports keyboard selection, Escape, and invalidates a dry-run after changes', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><I18nProvider><AdminExerciseMergePage /></I18nProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Source exercise' })).toBeVisible());
    const sourceTrigger = screen.getByRole('combobox', { name: 'Source exercise' });
    await user.click(sourceTrigger);
    const search = await screen.findByRole('textbox', { name: 'Search · Source exercise' });
    await user.type(search, 'dip');
    await user.keyboard('{Enter}');
    expect(sourceTrigger).toHaveTextContent('Dip · dip');
    await choose(user, 'Target exercise', /^Parallel Bar Dip · parallel-bar-dip/);
    await user.click(screen.getByRole('button', { name: 'Preview merge' }));
    await screen.findByText('Safe to merge');
    await user.click(sourceTrigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('source-exercise-picker')).not.toBeInTheDocument();
    await choose(user, 'Source exercise', /^Pull-Up · pull-up/);
    expect(screen.queryByText('Safe to merge')).not.toBeInTheDocument();
    expect(api.execute).not.toHaveBeenCalled();
  });

  it('renders localized Hebrew RTL labels without changing route meaning', async () => {
    useAppStore.setState({ settings: { ...useAppStore.getState().settings, language: 'he' } });
    render(<MemoryRouter><I18nProvider><AdminExerciseMergePage /></I18nProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'תרגיל מקור' })).toBeVisible());
    expect(screen.getByRole('combobox', { name: 'תרגיל יעד' })).toBeVisible();
  });
});
