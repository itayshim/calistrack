import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../app/I18nProvider';
import { translations } from '../../locales/translations';
import { useAppStore } from '../../store/useAppStore';
import { AdminExerciseEditorPage } from './AdminExerciseEditorPage';

const api = vi.hoisted(() => ({
  request: vi.fn(),
  upload: vi.fn(),
  removeFile: vi.fn(),
}));

vi.mock('../../services/supabase', () => ({
  getAdminSession: () => ({ accessToken: 'token', userId: 'admin-1' }),
  supabaseRequest: api.request,
  uploadExerciseMedia: api.upload,
  deleteExerciseMediaFile: api.removeFile,
}));
vi.mock('../../services/youtubeSuggestions', () => ({
  searchSuggestedVideos: vi.fn().mockResolvedValue([{
    videoId: 'suggest1234',
    url: 'https://www.youtube.com/watch?v=suggest1234',
    title: 'Incline Push-Up Proper Form',
    channelTitle: 'Calisthenics Coach',
    thumbnailUrl: 'https://i.ytimg.com/vi/suggest1234/mqdefault.jpg',
  }]),
}));

const exerciseRow = {
  id: 'exercise-1',
  stable_key: 'push-up',
  movement_family: 'Push-Up',
  category: 'push',
  difficulty: 'beginner',
  measurement_type: 'reps',
  muscles: ['chest'],
  aliases: [],
  keywords: [],
  is_published: true,
  exercise_translations: [
    { locale: 'en', name: 'Push-Up', description: '', instructions: [], common_mistakes: [] },
    { locale: 'he', name: 'שכיבות סמיכה', description: '', instructions: [], common_mistakes: [] },
  ],
  exercise_media: [],
};

const uploadedMedia = {
  id: 'media-upload',
  exercise_id: 'exercise-1',
  media_type: 'uploaded_video',
  provider: 'supabase_storage',
  title: 'old.mp4',
  storage_path: 'exercise-1/old.mp4',
  sort_order: 1,
  is_primary: false,
  is_published: false,
};

const primaryMedia = {
  id: 'media-primary',
  exercise_id: 'exercise-1',
  media_type: 'youtube',
  provider: 'youtube',
  title: 'Primary demo',
  external_url: 'https://youtu.be/abc123xyz00',
  sort_order: 0,
  is_primary: true,
  is_published: true,
};

function renderEditor(media: Record<string, unknown>[] = []) {
  api.request.mockImplementation((path: string, options?: RequestInit) => {
    if (path.includes('global_exercises')) return Promise.resolve([{ ...exerciseRow, exercise_media: media }]);
    if (path.includes('exercise_media') && (!options?.method || options.method === 'GET')) return Promise.resolve(media);
    if (path.includes('rpc/admin_add_youtube_media')) {
      return Promise.resolve([{ media_id: 'suggested-media', was_added: true, is_primary: media.length === 0 }]);
    }
    return Promise.resolve([]);
  });
  return render(
    <MemoryRouter initialEntries={['/admin/exercises/exercise-1/edit']}>
      <I18nProvider>
        <Routes>
          <Route path="/admin/exercises/:exerciseId/edit" element={<AdminExerciseEditorPage />} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  );
}

function renderNewEditor() {
  api.request.mockResolvedValue([]);
  return render(
    <MemoryRouter initialEntries={['/admin/exercises/new/edit']}>
      <I18nProvider>
        <Routes>
          <Route path="/admin/exercises/:exerciseId/edit" element={<AdminExerciseEditorPage />} />
          <Route path="/admin/exercises" element={<div>Exercise list</div>} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  );
}

async function ready() {
  await screen.findByDisplayValue('push-up');
}

describe('administrator exercise media lifecycle', () => {
  afterEach(cleanup);
  beforeEach(() => {
    api.request.mockReset();
    api.upload.mockReset();
    api.removeFile.mockReset();
    useAppStore.setState((state) => ({
      settings: { ...state.settings, language: 'en' },
    }));
  });

  it('provides a clear back action to the shared exercise list', async () => {
    renderEditor();
    await ready();
    expect(screen.getByRole('link', { name: 'Back to exercises' })).toHaveAttribute(
      'href',
      '/admin/exercises',
    );
  });

  it('auto-generates and submits a valid kebab-case stable key', async () => {
    const user = userEvent.setup();
    renderNewEditor();
    const englishSection = screen.getByRole('heading', { name: 'English' }).closest('section')!;
    await user.type(within(englishSection).getByLabelText('Name'), 'L-Sit Pull-Up');
    expect(screen.getByLabelText('Stable key')).toHaveValue('l-sit-pull-up');

    await user.clear(screen.getByLabelText('Stable key'));
    await user.type(screen.getByLabelText('Stable key'), 'l_sit_pull_up');
    expect(screen.getByLabelText('Stable key')).toHaveValue('l-sit-pull-up');
    await user.click(screen.getByRole('button', { name: 'Save exercise' }));

    await waitFor(() => {
      const call = api.request.mock.calls.find(([path, options]) =>
        String(path).startsWith('/rest/v1/global_exercises?on_conflict=stable_key') &&
        options?.method === 'POST',
      );
      expect(JSON.parse(call?.[1].body as string).stable_key).toBe('l-sit-pull-up');
    });
  });

  it('shows a localized inline error instead of PostgreSQL code 23514', async () => {
    const user = userEvent.setup();
    api.request.mockRejectedValue(Object.assign(new Error('23514'), { code: '23514' }));
    render(
      <MemoryRouter initialEntries={['/admin/exercises/new/edit']}>
        <I18nProvider>
          <Routes>
            <Route path="/admin/exercises/:exerciseId/edit" element={<AdminExerciseEditorPage />} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>,
    );
    const englishSection = screen.getByRole('heading', { name: 'English' }).closest('section')!;
    await user.type(within(englishSection).getByLabelText('Name'), 'L-Sit Pull-Up');
    await user.click(screen.getByRole('button', { name: 'Save exercise' }));
    expect(await screen.findByText(/lowercase letters, numbers, and single hyphens/)).toBeInTheDocument();
    expect(screen.queryByText('23514')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Stable key')).toHaveAttribute('aria-invalid', 'true');
  });

  it('edits L-Sit Pull-Up from skill to pull without creating a duplicate identity', async () => {
    const user = userEvent.setup();
    const lSitPullUp = {
      ...exerciseRow,
      id: 'existing-l-sit-pull-up-id',
      stable_key: 'l-sit-pull-up',
      movement_family: 'Pull-Up',
      category: 'skill',
      exercise_translations: [
        { locale: 'en', name: 'L-Sit Pull-Up', description: '', instructions: [], common_mistakes: [] },
        { locale: 'he', name: 'L-Sit Pull-Up', description: '', instructions: [], common_mistakes: [] },
      ],
    };
    api.request.mockImplementation((path: string) => {
      if (path.includes('global_exercises') && path.includes('id=eq.')) {
        return Promise.resolve([lSitPullUp]);
      }
      if (path.includes('global_exercises') && path.includes('select=movement_family')) {
        return Promise.resolve([lSitPullUp]);
      }
      return Promise.resolve([]);
    });
    render(
      <MemoryRouter initialEntries={['/admin/exercises/existing-l-sit-pull-up-id/edit']}>
        <I18nProvider>
          <Routes>
            <Route path="/admin/exercises/:exerciseId/edit" element={<AdminExerciseEditorPage />} />
            <Route path="/admin/exercises" element={<div>Exercise list</div>} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>,
    );
    await screen.findByDisplayValue('l-sit-pull-up');
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(screen.getByRole('option', { name: 'pull' }));
    await user.click(screen.getByRole('button', { name: 'Save exercise' }));
    await waitFor(() => {
      const call = api.request.mock.calls.find(([path, options]) =>
        String(path).startsWith('/rest/v1/global_exercises?on_conflict=stable_key') &&
        options?.method === 'POST',
      );
      expect(JSON.parse(call?.[1].body as string)).toMatchObject({
        id: 'existing-l-sit-pull-up-id',
        stable_key: 'l-sit-pull-up',
        movement_family: 'Pull-Up',
        category: 'pull',
      });
    });
  });

  it('uses the canonical English name and publishes the first selected suggestion as primary', async () => {
    const user = userEvent.setup();
    renderEditor();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Find suggested videos' }));
    expect(screen.getByLabelText('Search query')).toHaveValue('Push-Up tutorial proper form calisthenics');
    await user.click(screen.getByRole('button', { name: 'Search YouTube' }));
    expect(await screen.findByText('Incline Push-Up Proper Form')).toBeInTheDocument();
    expect(screen.getByText('Calisthenics Coach')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Select video' }));
    await waitFor(() => {
      const call = api.request.mock.calls.find(([path]) => String(path).includes('rpc/admin_add_youtube_media'));
      expect(JSON.parse(call?.[1].body as string)).toMatchObject({
        p_exercise_id: 'exercise-1',
        p_video_id: 'suggest1234',
      });
    });
  });

  it('provisions and persists suggested YouTube media for the existing built-in Push-Up', async () => {
    const user = userEvent.setup();
    let persistedId = '';
    api.request.mockImplementation((path: string, options?: RequestInit) => {
      if (path.includes('global_exercises?select=movement_family')) return Promise.resolve([]);
      if (path.includes('global_exercises?stable_key=eq.push-up')) return Promise.resolve([]);
      if (path === '/rest/v1/global_exercises' && options?.method === 'POST') {
        persistedId = JSON.parse(options.body as string).id;
        return Promise.resolve([]);
      }
      if (path.includes('exercise_translations')) return Promise.resolve([]);
      if (path.includes('exercise_media?exercise_id=eq.')) return Promise.resolve([]);
      if (path.includes('rpc/admin_add_youtube_media')) {
        return Promise.resolve([{ media_id: 'built-in-media', was_added: true, is_primary: true }]);
      }
      return Promise.resolve([]);
    });
    render(
      <MemoryRouter initialEntries={['/admin/exercises/builtin:push-up/edit']}>
        <I18nProvider>
          <Routes>
            <Route path="/admin/exercises/:exerciseId/edit" element={<AdminExerciseEditorPage />} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>,
    );
    await screen.findByDisplayValue('push-up');
    const suggestionsButton = screen.getByRole('button', { name: 'Find suggested videos' });
    expect(suggestionsButton).toBeEnabled();

    await user.click(suggestionsButton);
    expect(await screen.findByLabelText('Search query')).toHaveValue(
      'Push-Up tutorial proper form calisthenics',
    );
    expect(persistedId).not.toBe('');
    await user.click(screen.getByRole('button', { name: 'Search YouTube' }));
    await user.click(await screen.findByRole('button', { name: 'Select video' }));

    await waitFor(() => {
      const call = api.request.mock.calls.find(([path]) =>
        String(path).includes('rpc/admin_add_youtube_media'));
      expect(JSON.parse(call?.[1].body as string)).toMatchObject({
        p_exercise_id: persistedId,
        p_video_id: 'suggest1234',
      });
    });
    expect(api.request.mock.calls.filter(([path]) => path === '/rest/v1/global_exercises')).toHaveLength(1);
  });

  it('offers the built-in workflow in Hebrew while keeping the canonical English query', async () => {
    useAppStore.setState((state) => ({
      settings: { ...state.settings, language: 'he' },
    }));
    const user = userEvent.setup();
    api.request.mockImplementation((path: string, options?: RequestInit) => {
      if (path.includes('global_exercises?stable_key=eq.push-up')) {
        return Promise.resolve([
          { id: 'global-push-up', stable_key: 'push-up', is_published: true },
        ]);
      }
      if (path.includes('exercise_media?exercise_id=eq.global-push-up')) return Promise.resolve([]);
      if (path.includes('global_exercises?select=movement_family')) return Promise.resolve([]);
      if (options?.method === 'GET') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    render(
      <div dir="rtl">
        <MemoryRouter initialEntries={['/admin/exercises/builtin:push-up/edit']}>
          <I18nProvider>
            <Routes>
              <Route path="/admin/exercises/:exerciseId/edit" element={<AdminExerciseEditorPage />} />
            </Routes>
          </I18nProvider>
        </MemoryRouter>
      </div>,
    );
    await screen.findByDisplayValue('push-up');
    const button = screen.getByRole('button', {
      name: translations.he.findSuggestedVideos,
    });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(await screen.findByLabelText(translations.he.searchQuery)).toHaveValue(
      'Push-Up tutorial proper form calisthenics',
    );
    expect(button.closest('[dir="rtl"]')).not.toBeNull();
  });

  it('explains why a brand-new unsaved exercise cannot attach media yet', () => {
    renderNewEditor();
    expect(screen.getByRole('button', { name: 'Find suggested videos' })).toBeDisabled();
    expect(screen.getByText(/Save this new exercise before finding or adding/)).toBeInTheDocument();
  });

  it('requires confirmation before adding a distinct second suggestion', async () => {
    const user = userEvent.setup();
    renderEditor([primaryMedia]);
    await ready();
    await user.click(screen.getByRole('button', { name: 'Find suggested videos' }));
    await user.click(screen.getByRole('button', { name: 'Search YouTube' }));
    await user.click(await screen.findByRole('button', { name: 'Select video' }));
    expect(screen.getByText('Add another demonstration video?')).toBeInTheDocument();
    expect(api.request.mock.calls.some(([path]) => String(path).includes('rpc/admin_add_youtube_media'))).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Add video' }));
    await waitFor(() => expect(api.request.mock.calls.some(([path]) => String(path).includes('rpc/admin_add_youtube_media'))).toBe(true));
  });

  it('cancels adding a distinct second suggestion', async () => {
    const user = userEvent.setup();
    renderEditor([primaryMedia]);
    await ready();
    await user.click(screen.getByRole('button', { name: 'Find suggested videos' }));
    await user.click(screen.getByRole('button', { name: 'Search YouTube' }));
    await user.click(await screen.findByRole('button', { name: 'Select video' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.request.mock.calls.some(([path]) => String(path).includes('rpc/admin_add_youtube_media'))).toBe(false);
  });

  it('rejects the same YouTube video in another URL format before inserting', async () => {
    const user = userEvent.setup();
    renderEditor([{
      ...primaryMedia,
      external_url: 'https://youtube-nocookie.com/embed/suggest1234?rel=0',
    }]);
    await ready();
    await user.click(screen.getByRole('button', { name: 'Find suggested videos' }));
    await user.click(screen.getByRole('button', { name: 'Search YouTube' }));
    await user.click(await screen.findByRole('button', { name: 'Select video' }));
    expect(await screen.findByText('This video has already been added to this exercise.')).toBeInTheDocument();
    expect(screen.getByText('Add another demonstration video?').closest('dialog')).not.toHaveAttribute('open');
    expect(api.request.mock.calls.some(([path]) => String(path).includes('rpc/admin_add_youtube_media'))).toBe(false);
  });

  it('adds YouTube media to an existing exercise', async () => {
    const user = userEvent.setup();
    renderEditor();
    await ready();
    await user.type(screen.getByLabelText('YouTube URL'), 'https://youtu.be/abc123xyz00');
    await user.click(screen.getByRole('button', { name: 'Add YouTube video' }));
    await waitFor(() => expect(api.request).toHaveBeenCalledWith(
      '/rest/v1/rpc/admin_add_youtube_media',
      expect.objectContaining({ method: 'POST' }),
      'token',
    ));
    const call = api.request.mock.calls.find(([path]) => String(path).includes('rpc/admin_add_youtube_media'));
    expect(JSON.parse(call?.[1].body as string)).toMatchObject({
      p_exercise_id: 'exercise-1',
      p_video_id: 'abc123xyz00',
    });
  });

  it('uploads media to an existing exercise', async () => {
    const user = userEvent.setup();
    api.upload.mockResolvedValue('exercise-1/new.mp4');
    renderEditor();
    await ready();
    const file = new File(['video'], 'new.mp4', { type: 'video/mp4' });
    await user.upload(screen.getByLabelText('Upload video or image'), file);
    await waitFor(() => expect(api.upload).toHaveBeenCalledWith('exercise-1', file, expect.any(Function)));
    const call = api.request.mock.calls.find(([, options]) => options?.method === 'POST');
    expect(JSON.parse(call?.[1].body as string)).toMatchObject({
      media_type: 'uploaded_video',
      storage_path: 'exercise-1/new.mp4',
    });
  });

  it('replaces media and removes the previous file only after success', async () => {
    const user = userEvent.setup();
    api.upload.mockResolvedValue('exercise-1/replacement.webp');
    renderEditor([uploadedMedia]);
    await ready();
    const file = new File(['image'], 'replacement.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText('Replace'), file);
    await waitFor(() => expect(api.request).toHaveBeenCalledWith(
      '/rest/v1/exercise_media?id=eq.media-upload',
      expect.objectContaining({ method: 'PATCH' }),
      'token',
    ));
    expect(api.removeFile).toHaveBeenCalledWith('exercise-1/old.mp4');
  });

  it('preserves existing media when replacement upload fails', async () => {
    const user = userEvent.setup();
    api.upload.mockRejectedValue(new Error('upload failed'));
    renderEditor([uploadedMedia]);
    await ready();
    await user.upload(screen.getByLabelText('Replace'), new File(['x'], 'bad.mp4', { type: 'video/mp4' }));
    await screen.findByRole('alert');
    expect(screen.getByText('old.mp4')).toBeInTheDocument();
    expect(api.removeFile).not.toHaveBeenCalled();
    expect(api.request).not.toHaveBeenCalledWith(
      '/rest/v1/exercise_media?id=eq.media-upload',
      expect.objectContaining({ method: 'PATCH' }),
      'token',
    );
  });

  it('deletes a media record and its stored file', async () => {
    const user = userEvent.setup();
    renderEditor([uploadedMedia]);
    await ready();
    await user.click(within(screen.getByText('old.mp4').closest('article')!).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.request).toHaveBeenCalledWith(
      '/rest/v1/exercise_media?id=eq.media-upload',
      { method: 'DELETE' },
      'token',
    ));
    expect(api.removeFile).toHaveBeenCalledWith('exercise-1/old.mp4');
  });

  it('reorders media', async () => {
    const user = userEvent.setup();
    renderEditor([primaryMedia, uploadedMedia]);
    await ready();
    await user.click(within(screen.getByText('old.mp4').closest('article')!).getByRole('button', { name: 'Move up' }));
    await waitFor(() => expect(api.request).toHaveBeenCalledWith(
      '/rest/v1/exercise_media?id=eq.media-upload',
      expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('"sort_order":0') }),
      'token',
    ));
  });

  it('selects primary media and clears the previous primary', async () => {
    const user = userEvent.setup();
    renderEditor([primaryMedia, uploadedMedia]);
    await ready();
    await user.click(within(screen.getByText('old.mp4').closest('article')!).getByRole('button', { name: 'Make primary' }));
    await user.click(screen.getByRole('button', { name: 'Replace' }));
    await waitFor(() => expect(api.request).toHaveBeenCalledWith(
      '/rest/v1/exercise_media?id=eq.media-upload',
      expect.objectContaining({ body: expect.stringContaining('"is_primary":true') }),
      'token',
    ));
    expect(api.request).toHaveBeenCalledWith(
      '/rest/v1/exercise_media?id=eq.media-primary',
      expect.objectContaining({ body: expect.stringContaining('"is_primary":false') }),
      'token',
    );
  });

  it('publishes and unpublishes media', async () => {
    const user = userEvent.setup();
    renderEditor([primaryMedia, uploadedMedia]);
    await ready();
    await user.click(within(screen.getByText('old.mp4').closest('article')!).getByRole('button', { name: 'Publish' }));
    await user.click(within(screen.getByText('Primary demo').closest('article')!).getByRole('button', { name: 'Unpublish' }));
    await waitFor(() => {
      expect(api.request).toHaveBeenCalledWith(
        '/rest/v1/exercise_media?id=eq.media-upload',
        expect.objectContaining({ body: expect.stringContaining('"is_published":true') }),
        'token',
      );
      expect(api.request).toHaveBeenCalledWith(
        '/rest/v1/exercise_media?id=eq.media-primary',
        expect.objectContaining({ body: expect.stringContaining('"is_published":false') }),
        'token',
      );
    });
  });
  it('edits and persists the global measurement type', async () => {
    const user = userEvent.setup();
    renderEditor();
    await ready();
    await user.click(screen.getByRole('combobox', { name: 'Measurement type' }));
    await user.click(screen.getByRole('option', { name: 'Weighted repetitions' }));
    await user.click(screen.getByRole('button', { name: 'Save exercise' }));
    await waitFor(() => {
      const call = api.request.mock.calls.find(([path, options]) =>
        String(path).startsWith('/rest/v1/global_exercises?on_conflict=stable_key') &&
        options?.method === 'POST',
      );
      expect(JSON.parse(call?.[1].body as string)).toMatchObject({
        measurement_type: 'weighted_reps',
      });
    });
  });
});

