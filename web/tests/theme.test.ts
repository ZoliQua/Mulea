import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getInitialTheme, setTheme, toggleTheme } from '../src/theme.ts';

let store: Record<string, string>;
beforeEach(() => {
  store = {};
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v; },
  });
  vi.stubGlobal('document', { documentElement: { dataset: {} as Record<string, string> } });
});
afterEach(() => vi.unstubAllGlobals());

const mockMatch = (dark: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({ matches: dark, media: q }));

describe('getInitialTheme', () => {
  it('uses a stored light/dark choice', () => {
    store['mulealab-theme'] = 'dark';
    expect(getInitialTheme()).toBe('dark');
  });
  it('falls back to the system preference when nothing stored', () => {
    mockMatch(true);
    expect(getInitialTheme()).toBe('dark');
    mockMatch(false);
    expect(getInitialTheme()).toBe('light');
  });
});

describe('setTheme / toggleTheme', () => {
  it('persists and applies to documentElement', () => {
    setTheme('dark');
    expect(store['mulealab-theme']).toBe('dark');
    expect((globalThis as unknown as { document: { documentElement: { dataset: Record<string, string> } } }).document.documentElement.dataset.theme).toBe('dark');
  });
  it('toggles between light and dark', () => {
    expect(toggleTheme('light')).toBe('dark');
    expect(toggleTheme('dark')).toBe('light');
  });
});
