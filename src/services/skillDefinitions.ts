import type {
  SkillDefinition,
  SkillLifecycleStatus,
  SkillValidationResult,
} from '../features/skills/skillEngine';
import { getAdminSession, supabaseConfigured, supabaseRequest } from './supabase';

export const SKILL_DOCUMENT_SCHEMA_VERSION = 1;
export type SkillSource = 'built-in' | 'admin-created';
export interface ManagedSkillRecord {
  id: string;
  stableKey: string;
  source: SkillSource;
  status: SkillLifecycleStatus;
  draftVersion: number;
  publishedVersion: number | null;
  definition: SkillDefinition;
  validation: SkillValidationResult | null;
  updatedAt: string;
}

interface SkillRow {
  id: string;
  stable_key: string;
  source: SkillSource;
  status: SkillLifecycleStatus;
  draft_version: number;
  published_version: number | null;
  updated_at: string;
  skill_versions?: Array<{
    definition: SkillDefinition;
    validation: SkillValidationResult | null;
    version: number;
    lifecycle: string;
  }>;
}

const mapRow = (row: SkillRow): ManagedSkillRecord => {
  const version = row.skill_versions?.[0];
  if (!version?.definition) throw new Error('invalid_skill_document');
  return {
    id: row.id,
    stableKey: row.stable_key,
    source: row.source,
    status: row.status,
    draftVersion: row.draft_version,
    publishedVersion: row.published_version,
    definition: version.definition,
    validation: version.validation,
    updatedAt: row.updated_at,
  };
};

export async function loadPublishedSkillDefinitions(): Promise<SkillDefinition[]> {
  if (!supabaseConfigured) return [];
  try {
    const rows = await supabaseRequest<SkillRow[]>(
      '/rest/v1/skills?status=eq.published&select=id,stable_key,source,status,draft_version,published_version,updated_at,skill_versions!inner(definition,validation,version,lifecycle)&skill_versions.lifecycle=eq.published',
    );
    return rows.map(mapRow).map((row) => row.definition);
  } catch {
    return [];
  }
}

export async function loadAdminSkills(): Promise<ManagedSkillRecord[]> {
  const session = getAdminSession();
  if (!session) throw new Error('admin_session_required');
  const rows = await supabaseRequest<SkillRow[]>(
    '/rest/v1/skills?select=id,stable_key,source,status,draft_version,published_version,updated_at,skill_versions(definition,validation,version,lifecycle)&skill_versions.lifecycle=eq.draft&order=updated_at.desc',
    {},
    session.accessToken,
  );
  return rows.map(mapRow);
}

export async function saveSkillDraft(
  record: Pick<ManagedSkillRecord, 'id' | 'stableKey' | 'definition' | 'validation'> & {
    isNew: boolean;
  },
) {
  const session = getAdminSession();
  if (!session) throw new Error('admin_session_required');
  return supabaseRequest<string>(
    '/rest/v1/rpc/save_skill_draft',
    {
      method: 'POST',
      body: JSON.stringify({
        p_skill_id: record.isNew ? null : record.id,
        p_stable_key: record.stableKey,
        p_definition: { schemaVersion: SKILL_DOCUMENT_SCHEMA_VERSION, ...record.definition },
        p_validation: record.validation,
      }),
    },
    session.accessToken,
  );
}

export async function publishSkill(skillId: string) {
  const session = getAdminSession();
  if (!session) throw new Error('admin_session_required');
  return supabaseRequest(
    '/rest/v1/rpc/publish_skill_version',
    { method: 'POST', body: JSON.stringify({ p_skill_id: skillId }) },
    session.accessToken,
  );
}
export async function setSkillLifecycle(skillId: string, status: 'unpublished' | 'archived') {
  const session = getAdminSession();
  if (!session) throw new Error('admin_session_required');
  return supabaseRequest(
    '/rest/v1/rpc/set_skill_lifecycle',
    { method: 'POST', body: JSON.stringify({ p_skill_id: skillId, p_status: status }) },
    session.accessToken,
  );
}

export const exportSkillDocument = (definition: SkillDefinition) =>
  JSON.stringify({ schemaVersion: SKILL_DOCUMENT_SCHEMA_VERSION, definition }, null, 2);
export function importSkillDocument(value: string): SkillDefinition {
  const parsed = JSON.parse(value) as { schemaVersion?: number; definition?: SkillDefinition };
  if (
    parsed.schemaVersion !== SKILL_DOCUMENT_SCHEMA_VERSION ||
    !parsed.definition ||
    typeof parsed.definition.key !== 'string'
  )
    throw new Error('invalid_skill_import');
  return parsed.definition;
}
