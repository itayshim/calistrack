import type { ManagedProgramLifecycle } from './managedProgram';

export const MANAGED_PROGRAM_LIFECYCLE_ACTIONS = ['unpublished', 'archived'] as const;

export type ManagedProgramLifecycleAction = (typeof MANAGED_PROGRAM_LIFECYCLE_ACTIONS)[number];
export type ManagedProgramMutableSource = 'admin-created' | 'builtin_override';

export interface ManagedProgramLifecycleSubject {
  id: string;
  source: 'built-in' | ManagedProgramMutableSource;
  status: ManagedProgramLifecycle;
}

const transitions: Record<ManagedProgramLifecycle, readonly ManagedProgramLifecycleAction[]> = {
  draft: ['archived'],
  published: ['unpublished', 'archived'],
  unpublished: ['archived'],
  archived: [],
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ManagedProgramLifecycleContractError extends Error {
  constructor(public readonly code: 'invalid_lifecycle_action' | 'immutable_builtin' | 'invalid_program_id' | 'invalid_lifecycle_transition') {
    super(code);
    this.name = 'ManagedProgramLifecycleContractError';
  }
}

export function isManagedProgramLifecycleAction(value: unknown): value is ManagedProgramLifecycleAction {
  return MANAGED_PROGRAM_LIFECYCLE_ACTIONS.includes(value as ManagedProgramLifecycleAction);
}

export function getManagedProgramLifecycleActions(subject: ManagedProgramLifecycleSubject) {
  if (subject.source === 'built-in') return [] as ManagedProgramLifecycleAction[];
  return [...transitions[subject.status]];
}

export function assertManagedProgramLifecycleMutation(
  subject: ManagedProgramLifecycleSubject,
  nextStatus: unknown,
): asserts nextStatus is ManagedProgramLifecycleAction {
  if (!isManagedProgramLifecycleAction(nextStatus)) {
    throw new ManagedProgramLifecycleContractError('invalid_lifecycle_action');
  }
  if (subject.source === 'built-in') {
    throw new ManagedProgramLifecycleContractError('immutable_builtin');
  }
  if (!uuidPattern.test(subject.id)) {
    throw new ManagedProgramLifecycleContractError('invalid_program_id');
  }
  if (!transitions[subject.status].includes(nextStatus)) {
    throw new ManagedProgramLifecycleContractError('invalid_lifecycle_transition');
  }
}
