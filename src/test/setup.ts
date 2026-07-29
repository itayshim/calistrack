import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

class MockAudio {
  src = '';
  currentTime = 0;
  muted = false;
  preload = '';
  play = () => Promise.resolve();
  pause = () => undefined;
  load = () => undefined;
}

Object.defineProperty(globalThis, 'Audio', {
  configurable: true,
  writable: true,
  value: MockAudio,
});

beforeEach(() => localStorage.clear());
