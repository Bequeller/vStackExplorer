// Light and dark themes follow the system setting until the user picks one;
// the choice is remembered in localStorage.

import { glyph } from './glyphs';

type Theme = 'light' | 'dark';
const KEY = 'vstackexplorer:theme';
const systemDark = (): boolean => window.matchMedia('(prefers-color-scheme: dark)').matches;

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function currentTheme(): Theme {
  return stored() ?? (systemDark() ? 'dark' : 'light');
}

export function applyStoredTheme(): void {
  const theme = stored();
  if (theme) document.documentElement.dataset.theme = theme;
}

export function themeToggle(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-btn theme-toggle';
  const render = (): void => {
    const dark = currentTheme() === 'dark';
    button.replaceChildren(glyph(dark ? 'sun' : 'moon'));
    button.setAttribute('aria-label', `${dark ? '라이트' : '다크'} 테마로 전환`);
    button.title = button.getAttribute('aria-label') ?? '';
  };
  button.addEventListener('click', () => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this page.
    }
    render();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  render();
  return button;
}
