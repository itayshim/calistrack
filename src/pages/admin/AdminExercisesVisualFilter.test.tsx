import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../app/I18nProvider';
import { createInitialData } from '../../data/seed';
import { useAppStore } from '../../store/useAppStore';
import {
  clearExerciseVisualsForTests,
  installExerciseVisuals,
  markExerciseVisualRegistryLoadingForTests,
} from '../../services/exerciseVisuals';
import { supabaseRequest } from '../../services/supabase';
import { AdminExercisesPage } from './AdminExercisesPage';

vi.mock('../../data/exercises', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../data/exercises')>();
  return { ...original, builtInExercises: [
    { id: 'builtin-push-up', stableKey: 'push-up', nameEn: 'Push-Up', nameHe: 'שכיבות סמיכה', category: 'push', difficulty: 'beginner', instructions: [], instructionsHe: [] },
    { id: 'builtin-test-fallback', stableKey: 'test-fallback', nameEn: 'Fallback Row', nameHe: 'חתירה חלופית', category: 'pull', difficulty: 'beginner', instructions: [], instructionsHe: [] },
  ] };
});

vi.mock('../../services/supabase', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/supabase')>();
  return {
    ...original,
    getAdminSession: () => ({ accessToken: 'admin-token' }),
    supabaseRequest: vi.fn(),
  };
});

const uploadedExercise = {
  id: 'global-uploaded',
  stable_key: 'test-uploaded',
  movement_family: 'horizontal-pull',
  category: 'pull',
  difficulty: 'intermediate',
  is_published: true,
  exercise_translations: [
    { locale: 'en', name: 'Uploaded Row', description: 'Uploaded', instructions: ['Pull'] },
    { locale: 'he', name: 'חתירה שהועלתה', description: 'תיאור', instructions: ['משיכה'] },
  ],
  exercise_media: [],
};

function renderPage(language: 'en' | 'he' = 'en') {
  useAppStore.setState((state) => ({ ...state, settings: { ...state.settings, language } }));
  document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  return render(<MemoryRouter><I18nProvider><AdminExercisesPage /></I18nProvider></MemoryRouter>);
}

async function chooseVisualFilter(label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: /Visual status|סטטוס חזות/ }));
  await user.click(screen.getByRole('option', { name: label }));
}

describe('Admin exercise visual completeness filter', () => {
  beforeEach(() => {
    useAppStore.setState({ ...createInitialData(), hydrated: true });
    clearExerciseVisualsForTests();
    installExerciseVisuals([{ stableKey: 'test-uploaded', src: '/uploaded.svg', mimeType: 'image/svg+xml', format: 'svg', fileSizeBytes: 100 }]);
    vi.mocked(supabaseRequest).mockReset().mockResolvedValue([uploadedExercise]);
  });
  afterEach(cleanup);

  it('shows all sources by default and classifies uploaded, built-in, and fallback results', async () => {
    renderPage();
    expect(await screen.findByText('Uploaded Row')).toBeInTheDocument();
    expect(screen.getByText('Push-Up')).toBeInTheDocument();
    expect(screen.getByText('Fallback Row')).toBeInTheDocument();
    expect(screen.getByText('Uploaded visual')).toBeInTheDocument();
    expect(screen.getByText('Built-in pilot visual')).toBeInTheDocument();
    expect(screen.getByText('Neutral fallback')).toBeInTheDocument();
  });

  it('filters Has visual to uploaded and built-in assets', async () => {
    renderPage();
    await screen.findByText('Uploaded Row');
    await chooseVisualFilter('Has visual');
    expect(screen.getByText('Uploaded Row')).toBeInTheDocument();
    expect(screen.getByText('Push-Up')).toBeInTheDocument();
    expect(screen.queryByText('Fallback Row')).not.toBeInTheDocument();
  });

  it.each(['Missing visual', 'Using fallback'])('%s selects effective fallback results', async (filter) => {
    renderPage();
    await screen.findByText('Uploaded Row');
    await chooseVisualFilter(filter);
    expect(screen.getByText('Fallback Row')).toBeInTheDocument();
    expect(screen.queryByText('Push-Up')).not.toBeInTheDocument();
    expect(screen.queryByText('Uploaded Row')).not.toBeInTheDocument();
  });

  it('combines visual status with search and category without extra requests', async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByText('Uploaded Row');
    await chooseVisualFilter('Has visual');
    await user.type(screen.getByRole('textbox', { name: 'Search shared exercises' }), 'Uploaded');
    expect(screen.getByText('Uploaded Row')).toBeInTheDocument();
    expect(screen.queryByText('Push-Up')).not.toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Search shared exercises' }));
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(screen.getByRole('option', { name: 'pull' }));
    expect(screen.getByText('Uploaded Row')).toBeInTheDocument();
    expect(screen.queryByText('Push-Up')).not.toBeInTheDocument();
    expect(supabaseRequest).toHaveBeenCalledTimes(1);
  });

  it('does not classify rows as missing while remote visual metadata is loading', async () => {
    markExerciseVisualRegistryLoadingForTests();
    renderPage();
    expect(await screen.findByText('Fallback Row')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Visual status' })).toBeDisabled();
    expect(document.querySelector('[data-visual-source="fallback"]')).toBeNull();
    installExerciseVisuals([]);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Visual status' })).toBeEnabled());
    expect(document.querySelector('[data-visual-source="fallback"]')).not.toBeNull();
  });

  it('renders the localized visual filter in Hebrew RTL', async () => {
    renderPage('he');
    expect(await screen.findByRole('combobox', { name: 'סטטוס חזות' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });
});
