import type { Exercise } from '../types';
import { createId } from '../utils/id';
import { getAdminSession, supabaseRequest } from './supabase';

interface GlobalExerciseIdentityRow {
  id: string;
  stable_key: string;
  is_published: boolean;
}

export interface PersistedExerciseIdentity {
  id: string;
  stableKey: string;
  isPublished: boolean;
  created: boolean;
}

const stableKeyOf = (exercise: Exercise) =>
  exercise.stableKey ?? exercise.id.replace(/^builtin-/, '');

const findByStableKey = async (stableKey: string, token: string) => {
  const rows = await supabaseRequest<GlobalExerciseIdentityRow[]>(
    `/rest/v1/global_exercises?stable_key=eq.${encodeURIComponent(stableKey)}&select=id,stable_key,is_published&limit=1`,
    {},
    token,
  );
  return rows[0];
};

const upsertBuiltInTranslations = (
  exerciseId: string,
  exercise: Exercise,
  token: string,
) =>
  supabaseRequest(
    '/rest/v1/exercise_translations?on_conflict=exercise_id,locale',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify([
        {
          exercise_id: exerciseId,
          locale: 'en',
          name: exercise.nameEn,
          description: exercise.description,
          instructions: exercise.instructions,
          common_mistakes: exercise.commonMistakes,
          aliases: exercise.aliases ?? [],
          keywords: exercise.keywords ?? [],
        },
        {
          exercise_id: exerciseId,
          locale: 'he',
          name: exercise.nameHe || exercise.nameEn,
          description: exercise.descriptionHe ?? '',
          instructions: exercise.instructionsHe ?? [],
          common_mistakes: exercise.commonMistakesHe ?? [],
          aliases: exercise.aliasesHe ?? [],
          keywords: exercise.keywordsHe ?? [],
        },
      ]),
    },
    token,
  );

/**
 * Gives a local built-in exercise the UUID required by exercise_media.
 * The stable key is the identity boundary, so published global content replaces
 * (rather than duplicates) the matching local built-in in the normal library.
 */
export async function ensureBuiltInExerciseIdentity(
  exercise: Exercise,
): Promise<PersistedExerciseIdentity> {
  const session = getAdminSession();
  if (!session) throw new Error('administrator_session_required');

  const stableKey = stableKeyOf(exercise);
  const existing = await findByStableKey(stableKey, session.accessToken);
  if (existing) {
    // A previous interrupted provisioning attempt may have created the parent
    // row before its translations. This idempotent upsert repairs that state.
    await upsertBuiltInTranslations(existing.id, exercise, session.accessToken);
    return {
      id: existing.id,
      stableKey,
      isPublished: existing.is_published,
      created: false,
    };
  }

  const id = createId();
  try {
    await supabaseRequest(
      '/rest/v1/global_exercises',
      {
        method: 'POST',
        body: JSON.stringify({
          id,
          stable_key: stableKey,
          movement_family: exercise.movementFamily ?? exercise.category,
          category: exercise.category,
          difficulty: exercise.difficulty,
          measurement_type: exercise.measurementType,
          muscles: exercise.muscles,
          aliases: exercise.aliases ?? [],
          keywords: exercise.keywords ?? [],
          // Built-ins are already public application content. Their persisted
          // backing row must remain public so published media passes public RLS.
          is_published: true,
          created_by: session.userId,
          updated_by: session.userId,
        }),
      },
      session.accessToken,
    );
  } catch (error) {
    // A concurrent administrator may have provisioned the same stable key.
    // Resolve that row instead of creating a second exercise identity.
    const concurrent = await findByStableKey(stableKey, session.accessToken);
    if (concurrent) {
      await upsertBuiltInTranslations(concurrent.id, exercise, session.accessToken);
      return {
        id: concurrent.id,
        stableKey,
        isPublished: concurrent.is_published,
        created: false,
      };
    }
    throw error;
  }

  await upsertBuiltInTranslations(id, exercise, session.accessToken);

  return { id, stableKey, isPublished: true, created: true };
}
