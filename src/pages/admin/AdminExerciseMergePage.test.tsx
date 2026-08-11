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

const exercise = (id: string, key: string, en: string, he: string) => ({
  id, stable_key: key, movement_family: 'Dip', category: 'push', difficulty: 'intermediate',
  measurement_type: 'reps', muscles: ['chest'], aliases: [], keywords: [], is_published: true,
  exercise_translations: [{ locale: 'en', name: en, description: `${en} description`, instructions: [] }, { locale: 'he', name: he, description: 'תיאור', instructions: [] }],
  exercise_media: [],
});
const rows = [exercise('source-uuid', 'dip', 'Dip', 'מקבילים'), exercise('target-uuid', 'parallel-bar-dip', 'Parallel Bar Dip', 'מקבילים מקבילים')];

describe('AdminExerciseMergePage', () => {
  beforeEach(() => {
    api.request.mockImplementation((path: string) => Promise.resolve(path.includes('merge_audits') ? [] : rows));
    api.preview.mockResolvedValue({ safe: true, blocking: [], warnings: ['metadata_difference'], source: {}, target: {}, sourceMedia: [], targetMedia: [], counts: { media: 1 }, visual: { policy: 'target_wins' }, policies: {} });
    api.execute.mockResolvedValue({ auditId: 'audit', copiedMedia: 1, sourceStableKey: 'dip', targetStableKey: 'parallel-bar-dip' });
  });
  afterEach(() => cleanup());

  it('keeps source/target direction explicit and dry-runs before enabling execution', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><I18nProvider><AdminExerciseMergePage /></I18nProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByLabelText('Source exercise')).toHaveTextContent('Dip'));
    await user.selectOptions(screen.getByLabelText('Source exercise'), 'source-uuid');
    await user.selectOptions(screen.getByLabelText('Target exercise'), 'target-uuid');
    expect(screen.queryByRole('button', { name: 'Merge and redirect' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Preview merge' }));
    await waitFor(() => expect(api.preview).toHaveBeenCalledWith('source-uuid', 'target-uuid'));
    expect(api.execute).not.toHaveBeenCalled();
    expect(screen.getByText('Preview makes no changes.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Merge and redirect' })).toBeDisabled();
    await user.type(screen.getByLabelText('Type the target stable key to confirm'), 'parallel-bar-dip');
    expect(screen.getByRole('button', { name: 'Merge and redirect' })).toBeEnabled();
  });

  it('renders localized Hebrew controls without reversing source and target meaning', async () => {
    useAppStore.getState().setSettings({ ...useAppStore.getState().settings, language: 'he' });
    render(<MemoryRouter><I18nProvider><AdminExerciseMergePage /></I18nProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByLabelText('תרגיל מקור')).toBeVisible());
    expect(screen.getByLabelText('תרגיל יעד')).toBeVisible();
  });
});
