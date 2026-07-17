import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../app/I18nProvider';
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

async function ready() {
  await screen.findByDisplayValue('push-up');
}

describe('administrator exercise media lifecycle', () => {
  afterEach(cleanup);
  beforeEach(() => {
    api.request.mockReset();
    api.upload.mockReset();
    api.removeFile.mockReset();
  });

  it('adds YouTube media to an existing exercise', async () => {
    const user = userEvent.setup();
    renderEditor();
    await ready();
    await user.type(screen.getByLabelText('YouTube URL'), 'https://youtu.be/abc123xyz00');
    await user.click(screen.getByRole('button', { name: 'Add YouTube video' }));
    await waitFor(() => expect(api.request).toHaveBeenCalledWith(
      '/rest/v1/exercise_media',
      expect.objectContaining({ method: 'POST' }),
      'token',
    ));
    const call = api.request.mock.calls.find(([, options]) => options?.method === 'POST');
    expect(JSON.parse(call?.[1].body as string)).toMatchObject({
      exercise_id: 'exercise-1',
      media_type: 'youtube',
      external_url: 'https://youtu.be/abc123xyz00',
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
});
