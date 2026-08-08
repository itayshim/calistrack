import { useSyncExternalStore } from 'react';
import {
  getManagedProgramRegistryRevision,
  subscribeManagedProgramRegistry,
} from '../services/managedPrograms';

export function useManagedProgramRegistry() {
  return useSyncExternalStore(
    subscribeManagedProgramRegistry,
    getManagedProgramRegistryRevision,
    getManagedProgramRegistryRevision,
  );
}
