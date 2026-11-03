// Light and dark themes follow the system setting until the user picks one;
// the choice is remembered in localStorage.

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
  button.className = 'theme-toggle';
  const render = (): void => {
    const next = currentTheme() === 'dark' ? '라이트' : '다크';
    button.textContent = `${next} 테마`;
    button.setAttribute('aria-label', `${next} 테마로 전환`);
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
