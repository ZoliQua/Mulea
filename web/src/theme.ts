export type Theme = 'light' | 'dark';
const KEY = 'mulealab-theme';

/** Stored choice if present, else the OS preference, else light. SSR-safe. */
export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* localStorage unavailable */ }
  return 'dark';
}

export function applyTheme(t: Theme): void {
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = t;
}

export function setTheme(t: Theme): Theme {
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  applyTheme(t);
  return t;
}

export function toggleTheme(current: Theme): Theme {
  return setTheme(current === 'dark' ? 'light' : 'dark');
}
