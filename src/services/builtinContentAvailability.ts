import { getAdminSession, supabaseConfigured, supabaseRequest } from './supabase';

export const BUILTIN_CONTENT_TYPES = ['managed_program', 'skill'] as const;
export const BUILTIN_CONTENT_AVAILABILITIES = ['published', 'unpublished', 'archived'] as const;

export type BuiltInContentType = (typeof BUILTIN_CONTENT_TYPES)[number];
export type BuiltInContentAvailability = (typeof BUILTIN_CONTENT_AVAILABILITIES)[number];

export interface BuiltInContentState {
  contentType: BuiltInContentType;
  builtinKey: string;
  availability: BuiltInContentAvailability;
  updatedAt: string;
}

interface BuiltInContentStateRow {
  content_type: BuiltInContentType;
  builtin_key: string;
  availability: BuiltInContentAvailability;
  updated_at: string;
}

const stableKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class BuiltInContentAvailabilityError extends Error {
  constructor(public readonly code: 'invalid_content_type' | 'invalid_builtin_key' | 'invalid_availability') {
    super(code);
    this.name = 'BuiltInContentAvailabilityError';
  }
}

function validateStateInput(
  contentType: unknown,
  builtinKey: unknown,
  availability: unknown,
): asserts contentType is BuiltInContentType {
  if (!BUILTIN_CONTENT_TYPES.includes(contentType as BuiltInContentType)) {
    throw new BuiltInContentAvailabilityError('invalid_content_type');
  }
  if (typeof builtinKey !== 'string' || !stableKeyPattern.test(builtinKey)) {
    throw new BuiltInContentAvailabilityError('invalid_builtin_key');
  }
  if (!BUILTIN_CONTENT_AVAILABILITIES.includes(availability as BuiltInContentAvailability)) {
    throw new BuiltInContentAvailabilityError('invalid_availability');
  }
}

const mapState = (row: BuiltInContentStateRow): BuiltInContentState => ({
  contentType: row.content_type,
  builtinKey: row.builtin_key,
  availability: row.availability,
  updatedAt: row.updated_at,
});

export async function loadBuiltInContentStates(
  contentType: BuiltInContentType,
): Promise<BuiltInContentState[]> {
  if (!supabaseConfigured) return [];
  const rows = await supabaseRequest<BuiltInContentStateRow[]>(
    `/rest/v1/builtin_content_states?content_type=eq.${contentType}&select=content_type,builtin_key,availability,updated_at`,
  );
  return rows.map(mapState);
}

export async function loadAdminBuiltInContentStates(
  contentType: BuiltInContentType,
): Promise<BuiltInContentState[]> {
  const session = getAdminSession();
  if (!session) throw new Error('admin_session_required');
  const rows = await supabaseRequest<BuiltInContentStateRow[]>(
    `/rest/v1/builtin_content_states?content_type=eq.${contentType}&select=content_type,builtin_key,availability,updated_at`,
    {},
    session.accessToken,
  );
  return rows.map(mapState);
}

export async function setBuiltInContentAvailability(
  contentType: BuiltInContentType,
  builtinKey: string,
  availability: BuiltInContentAvailability,
) {
  validateStateInput(contentType, builtinKey, availability);
  const session = getAdminSession();
  if (!session) throw new Error('admin_session_required');
  return supabaseRequest<BuiltInContentStateRow>(
    '/rest/v1/rpc/set_builtin_content_availability',
    {
      method: 'POST',
      body: JSON.stringify({
        p_content_type: contentType,
        p_builtin_key: builtinKey,
        p_availability: availability,
      }),
    },
    session.accessToken,
  );
}

export const setBuiltInProgramAvailability = (
  builtinKey: string,
  availability: BuiltInContentAvailability,
) => setBuiltInContentAvailability('managed_program', builtinKey, availability);
