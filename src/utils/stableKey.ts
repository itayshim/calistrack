export const STABLE_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeStableKey(value: string): string {
  return normalizeStableKeyDraft(value)
    .replace(/-+$/g, '');
}

export function normalizeStableKeyDraft(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/g, '');
}

export function isValidStableKey(value: string): boolean {
  return STABLE_KEY_PATTERN.test(value);
}
