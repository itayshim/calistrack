import { describe, expect, it } from 'vitest';
import {
  assertManagedProgramLifecycleMutation,
  getManagedProgramLifecycleActions,
  isManagedProgramLifecycleAction,
  ManagedProgramLifecycleContractError,
} from './managedProgramLifecycle';

const uuid = '4b40f413-0c98-4a56-956f-c06c6e327e70';

describe('Managed Program lifecycle contract', () => {
  it('defines source-aware lifecycle actions explicitly', () => {
    expect(getManagedProgramLifecycleActions({ id: uuid, source: 'built-in', status: 'published' })).toEqual([]);
    expect(getManagedProgramLifecycleActions({ id: uuid, source: 'builtin_override', status: 'published' })).toEqual(['unpublished', 'archived']);
    expect(getManagedProgramLifecycleActions({ id: uuid, source: 'admin-created', status: 'unpublished' })).toEqual(['archived']);
    expect(getManagedProgramLifecycleActions({ id: uuid, source: 'admin-created', status: 'archived' })).toEqual([]);
  });

  it('allows an Admin-created published Program to be unpublished', () => {
    expect(() => assertManagedProgramLifecycleMutation(
      { id: uuid, source: 'admin-created', status: 'published' },
      'unpublished',
    )).not.toThrow();
  });

  it('accepts only the database lifecycle action values', () => {
    expect(isManagedProgramLifecycleAction('unpublished')).toBe(true);
    expect(isManagedProgramLifecycleAction('archived')).toBe(true);
    expect(isManagedProgramLifecycleAction('draft')).toBe(false);
    expect(() => assertManagedProgramLifecycleMutation(
      { id: uuid, source: 'admin-created', status: 'published' },
      'draft',
    )).toThrowError(new ManagedProgramLifecycleContractError('invalid_lifecycle_action'));
  });

  it('rejects synthetic built-in IDs before they can reach the UUID RPC', () => {
    expect(() => assertManagedProgramLifecycleMutation(
      { id: 'builtin:beginner-calisthenics-12-week', source: 'built-in', status: 'published' },
      'unpublished',
    )).toThrowError(new ManagedProgramLifecycleContractError('immutable_builtin'));
    expect(() => assertManagedProgramLifecycleMutation(
      { id: 'not-a-uuid', source: 'builtin_override', status: 'published' },
      'unpublished',
    )).toThrowError(new ManagedProgramLifecycleContractError('invalid_program_id'));
  });

  it('rejects invalid transitions before the request', () => {
    expect(() => assertManagedProgramLifecycleMutation(
      { id: uuid, source: 'admin-created', status: 'draft' },
      'unpublished',
    )).toThrowError(new ManagedProgramLifecycleContractError('invalid_lifecycle_transition'));
  });
});
