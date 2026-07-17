import { describe, expect, it } from 'vitest';
import { createInitialData } from '../data/seed';
import { LocalStorageService, STORAGE_KEY } from './storage';
describe('storage', () => {
  const service = new LocalStorageService();
  it('exports and imports valid data', () => {
    const data = createInitialData();
    expect(service.importData(service.exportData(data)).exercises.length).toBeGreaterThan(30);
  });
  it('rejects invalid imports', () => expect(() => service.importData('{"hello":1}')).toThrow());
  it('handles malformed local storage safely', () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    expect(service.loadAppData().schemaVersion).toBe(2);
  });
  it('migrates schema 1 exercises and preserves their IDs and saved data', () => {
    const current = createInitialData();
    const legacy = {
      ...current,
      schemaVersion: 1,
      restTimer: undefined,
      exercises: [
        {
          id: 'custom-legacy',
          nameHe: 'Legacy move',
          nameEn: 'Legacy move',
          category: 'push',
          difficulty: 'beginner',
          muscles: [],
          measurementType: 'reps',
          description: '',
          instructions: [],
          commonMistakes: [],
          isCustom: true,
        },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const migrated = service.loadAppData();
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.exercises.find((exercise) => exercise.id === 'custom-legacy')).toMatchObject({
      movementFamily: 'push',
      aliases: [],
      keywords: [],
    });
    expect(migrated.restTimer.endsAt).toBeNull();
  });
  it('resets application', () => {
    service.saveAppData(createInitialData());
    service.resetData();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
