import { describe, expect, it } from 'vitest';
import migration from '../../supabase/migrations/202607300002_rest_notification_status_semantics.sql?raw';

describe('rest notification status semantics migration', () => {
  it('drops the old check before converting legacy handled rows', () => {
    const dropOldConstraint = migration.indexOf("pg_get_constraintdef(c.oid) ilike '%status%'");
    const compatibilityConstraint = migration.indexOf(
      'scheduled_rest_notifications_status_compat_check',
    );
    const legacyUpdate = migration.indexOf("where status = 'handled'");
    const finalConstraint = migration.lastIndexOf(
      'add constraint scheduled_rest_notifications_status_check',
    );
    expect(dropOldConstraint).toBeGreaterThan(-1);
    expect(compatibilityConstraint).toBeGreaterThan(dropOldConstraint);
    expect(legacyUpdate).toBeGreaterThan(compatibilityConstraint);
    expect(finalConstraint).toBeGreaterThan(legacyUpdate);
  });

  it('temporarily accepts handled but excludes it from the final status check', () => {
    const compatibility = migration.slice(
      migration.indexOf('scheduled_rest_notifications_status_compat_check'),
      migration.indexOf("where status = 'handled'"),
    );
    const finalCheck = migration.slice(
      migration.lastIndexOf('add constraint scheduled_rest_notifications_status_check'),
    );
    expect(compatibility).toContain("'handled'");
    expect(finalCheck).not.toContain("'handled'");
    for (const status of [
      'scheduled',
      'sending',
      'sent',
      'foreground_handled',
      'cancelled',
      'replaced',
      'retrying',
      'failed',
    ]) {
      expect(finalCheck).toContain(`'${status}'`);
    }
  });

  it('converts legacy rows without deleting notifications and populates metadata', () => {
    expect(migration).toContain("status = 'foreground_handled'");
    expect(migration).toContain("handled_reason = coalesce(handled_reason, 'legacy_handled')");
    expect(migration).toContain(
      "last_transition_reason = coalesce(last_transition_reason, 'legacy_handled')",
    );
    expect(migration).not.toMatch(/\bdelete\s+from\s+public\.scheduled_rest_notifications/i);
  });

  it('uses idempotent columns and creates indexes only after final validation', () => {
    expect(migration.match(/add column if not exists/g)?.length).toBe(4);
    expect(migration.indexOf('create index if not exists')).toBeGreaterThan(
      migration.lastIndexOf('scheduled_rest_notifications_status_check'),
    );
  });
});
