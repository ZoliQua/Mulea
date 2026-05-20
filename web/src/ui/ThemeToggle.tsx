import { useState } from 'react';
import { getInitialTheme, toggleTheme, type Theme } from '../theme.ts';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  return (
    <button
      className="icon-btn"
      type="button"
      title="Toggle light / dark"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(toggleTheme(theme))}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
