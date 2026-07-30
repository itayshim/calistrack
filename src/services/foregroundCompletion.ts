export interface ForegroundCompletionContext {
  expectedCompletionId: string;
  activeCompletionId: string | null;
  visibilityState: DocumentVisibilityState;
  hasFocus: boolean;
  inactiveAtDeadline: boolean;
}

export const canHandleForegroundCompletion = ({
  expectedCompletionId,
  activeCompletionId,
  visibilityState,
  hasFocus,
  inactiveAtDeadline,
}: ForegroundCompletionContext) =>
  Boolean(
    expectedCompletionId &&
      activeCompletionId === expectedCompletionId &&
      visibilityState === 'visible' &&
      hasFocus &&
      !inactiveAtDeadline,
  );
