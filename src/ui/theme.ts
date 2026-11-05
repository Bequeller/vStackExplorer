// Light and dark themes follow the system setting until the user picks one;
// the choice is remembered in localStorage.

import { h } from './dom';
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

/** A segmented sun | moon pair: the active half is filled. */
export function themeToggle(): HTMLElement {
  const light = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '라이트 테마', title: '라이트 테마' }, glyph('sun'));
  const dark = h('button', { type: 'button', class: 'icon-btn', 'aria-label': '다크 테마', title: '다크 테마' }, glyph('moon'));
  const render = (): void => {
    const isDark = currentTheme() === 'dark';
    light.setAttribute('aria-pressed', String(!isDark));
    dark.setAttribute('aria-pressed', String(isDark));
  };
  const choose = (next: Theme): void => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this page.
    }
    render();
  };
  light.addEventListener('click', () => choose('light'));
  dark.addEventListener('click', () => choose('dark'));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  render();
  return h('div', { class: 'theme-toggle', role: 'group', 'aria-label': '테마' }, light, dark);
}
