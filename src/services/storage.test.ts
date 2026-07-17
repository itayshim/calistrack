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
    expect(service.loadAppData().schemaVersion).toBe(1);
  });
  it('resets application', () => {
    service.saveAppData(createInitialData());
    service.resetData();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
