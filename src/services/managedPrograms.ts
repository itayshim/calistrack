import type {
  ManagedProgramDefinition,
  ManagedProgramLifecycle,
  ManagedProgramValidation,
} from '../features/programs/managedProgram';
import { MANAGED_PROGRAM_SCHEMA_VERSION } from '../features/programs/managedProgram';
import { beginnerCalisthenics12Week } from '../features/programs/beginnerCalisthenics12Week';
import { beginnerFoundation12Week } from '../features/programs/beginnerFoundation12Week';
import {
  assertManagedProgramLifecycleMutation,
  type ManagedProgramLifecycleAction,
} from '../features/programs/managedProgramLifecycle';
import { getAdminSession, supabaseConfigured, supabaseRequest } from './supabase';
import type {
  BuiltInContentAvailability,
  BuiltInContentState,
} from './builtinContentAvailability';

export interface ManagedProgramRecord {
  id: string;
  stableKey: string;
  source: 'built-in' | 'admin-created' | 'builtin_override';
  status: ManagedProgramLifecycle;
  draftVersion: number;
  publishedVersion: number | null;
  definition: ManagedProgramDefinition;
  validation: ManagedProgramValidation | null;
  updatedAt: string;
  builtinKey?: string;
  basedOnBuiltinHash?: string;
}
interface Row {
  id: string;
  stable_key: string;
  source: 'built-in' | 'admin-created' | 'builtin_override';
  status: ManagedProgramLifecycle;
  draft_version: number;
  published_version: number | null;
  updated_at: string;
  builtin_key?: string | null;
  based_on_builtin_hash?: string | null;
  managed_program_versions?: Array<{
    definition: ManagedProgramDefinition;
    validation: ManagedProgramValidation | null;
    version: number;
    lifecycle: string;
  }>;
}
const map = (row: Row): ManagedProgramRecord => {
  const versions = row.managed_program_versions ?? [];
  const version =
    versions.find((item) => item.lifecycle === 'draft') ??
    versions.find((item) => item.lifecycle === 'published') ??
    versions[0];
  if (!version?.definition) throw new Error('invalid_managed_program_document');
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
    builtinKey: row.builtin_key ?? undefined,
    basedOnBuiltinHash: row.based_on_builtin_hash ?? undefined,
  };
};
const select =
  'id,stable_key,source,status,draft_version,published_version,updated_at,builtin_key,based_on_builtin_hash,managed_program_versions(definition,validation,version,lifecycle)';

export async function loadPublishedManagedPrograms(): Promise<ManagedProgramRecord[]> {
  if (!supabaseConfigured) return [];
  try {
    const rows = await supabaseRequest<Row[]>(
      `/rest/v1/managed_programs?status=eq.published&select=${select}&managed_program_versions.lifecycle=eq.published&order=sort_order.asc`,
    );
    return rows.map(map);
  } catch {
    return [];
  }
}
export async function loadAdminManagedPrograms(): Promise<ManagedProgramRecord[]> {
  const session = getAdminSession();
  if (!session) throw new Error('admin_session_required');
  const rows = await supabaseRequest<Row[]>(
    `/rest/v1/managed_programs?select=${select}&order=updated_at.desc`,
    {},
    session.accessToken,
  );
  return rows.map(map);
}
export async function saveManagedProgramDraft(record: {
  id?: string;
  stableKey: string;
  definition: ManagedProgramDefinition;
  validation: ManagedProgramValidation;
  builtinKey?: string;
  basedOnBuiltinHash?: string;
}) {
  const session = getAdminSession();
  if (!session) throw new Error('admin_session_required');
  return supabaseRequest<string>(
    '/rest/v1/rpc/save_managed_program_draft',
    {
      method: 'POST',
      body: JSON.stringify({
        p_program_id: record.id ?? null,
        p_stable_key: record.stableKey,
        p_definition: { ...record.definition, schemaVersion: MANAGED_PROGRAM_SCHEMA_VERSION },
        p_validation: record.validation,
        p_builtin_key: record.builtinKey ?? null,
        p_based_on_builtin_hash: record.basedOnBuiltinHash ?? null,
      }),
    },
    session.accessToken,
  );
}
export async function publishManagedProgram(id: string) {
  const session = getAdminSession();
  if (!session) throw new Error('admin_session_required');
  return supabaseRequest<number>(
    '/rest/v1/rpc/publish_managed_program_version',
    { method: 'POST', body: JSON.stringify({ p_program_id: id }) },
    session.accessToken,
  );
}
export async function setManagedProgramLifecycle(
  program: Pick<ManagedProgramRecord, 'id' | 'source' | 'status'>,
  status: ManagedProgramLifecycleAction,
) {
  assertManagedProgramLifecycleMutation(program, status);
  const session = getAdminSession();
  if (!session) throw new Error('admin_session_required');
  return supabaseRequest(
    '/rest/v1/rpc/set_managed_program_lifecycle',
    { method: 'POST', body: JSON.stringify({ p_program_id: program.id, p_status: status }) },
    session.accessToken,
  );
}

const builtInDefinitions = [beginnerFoundation12Week, beginnerCalisthenics12Week];
const builtInRecords: ManagedProgramRecord[] = builtInDefinitions.map((definition) => ({
  id: `builtin:${definition.key}`,
  stableKey: definition.key,
  source: 'built-in', status: 'published',
  draftVersion: definition.version,
  publishedVersion: definition.version,
  definition, validation: null,
  updatedAt: '2026-08-04T00:00:00.000Z',
}));
const resolved = new Map<string, ManagedProgramRecord>();
const published = new Map<string, ManagedProgramRecord>();
const availability = new Map<string, BuiltInContentAvailability>();
const registryListeners = new Set<() => void>();
let registryRevision = 0;
let registryReady = !import.meta.env.PROD;
const notifyRegistry = () => {
  registryRevision += 1;
  registryListeners.forEach((listener) => listener());
};
const resetBuiltIns = () => {
  resolved.clear();
  published.clear();
  availability.clear();
  builtInRecords.forEach((record) => resolved.set(record.stableKey, record));
};
resetBuiltIns();
resolved.forEach((record, key) => published.set(key, record));
export const installManagedPrograms = (
  records: ManagedProgramRecord[],
  states: BuiltInContentState[] = [],
) => {
  resetBuiltIns();
  records.forEach((record) => {
    if (record.status !== 'published' || record.definition.key !== record.stableKey) return;
    const builtIn = builtInRecords.some((candidate) => candidate.stableKey === record.stableKey);
    if (builtIn) {
      if (record.source === 'builtin_override' && record.builtinKey === record.stableKey) resolved.set(record.stableKey, record);
      return;
    }
    if (record.source === 'admin-created' && !resolved.has(record.stableKey)) resolved.set(record.stableKey, record);
  });
  states.forEach((state) => {
    if (state.contentType === 'managed_program' && builtInRecords.some((record) => record.stableKey === state.builtinKey)) {
      availability.set(state.builtinKey, state.availability);
    }
  });
  resolved.forEach((record, key) => {
    if (availability.get(key) !== 'unpublished' && availability.get(key) !== 'archived') {
      published.set(key, record);
    }
  });
  if (import.meta.env.DEV && !import.meta.env.TEST) {
    published.forEach((record) => console.info('[content_resolution]', { kind: 'managed_program', key: record.stableKey, state: record.source === 'builtin_override' ? 'managed_override' : record.source === 'built-in' ? 'builtin' : 'backend_custom' }));
  }
  registryReady = true;
  notifyRegistry();
};
export const getBuiltInManagedPrograms = () => [...builtInRecords];
export function mergeAdminManagedProgramRows(
  builtIns: ManagedProgramRecord[],
  backend: ManagedProgramRecord[],
) {
  const overrides = new Map(
    backend
      .filter((item) => item.source === 'builtin_override')
      .map((item) => [item.builtinKey, item]),
  );
  return [
    ...builtIns.map((item) => overrides.get(item.stableKey) ?? item),
    ...backend.filter((item) => item.source === 'admin-created'),
  ];
}
export const getManagedProgram = (key: string) => registryReady ? published.get(key) : undefined;
export const getResolvedManagedProgram = (key: string) => resolved.get(key);
export const getManagedProgramAvailability = (key: string): BuiltInContentAvailability =>
  availability.get(key) ?? 'published';
export const getManagedPrograms = () =>
  registryReady
    ? [...published.values()].sort((a, b) => a.definition.sortOrder - b.definition.sortOrder)
    : [];
export const subscribeManagedProgramRegistry = (listener: () => void) => {
  registryListeners.add(listener);
  return () => registryListeners.delete(listener);
};
export const getManagedProgramRegistryRevision = () => registryRevision;
export const isManagedProgramRegistryReady = () => registryReady;
