// Learning progress per lesson, kept in this browser only (docs/PRODUCT.md: no accounts).

export type Progress = 'none' | 'started' | 'done';
const KEY = 'vstackexplorer:progress';

function read(): Record<string, Progress> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return value && typeof value === 'object' ? (value as Record<string, Progress>) : {};
  } catch {
    return {};
  }
}

export function progressOf(topic: string, lesson: string): Progress {
  return read()[`${topic}/${lesson}`] ?? 'none';
}

/** Records progress; never moves a lesson backward from done. */
export function markProgress(topic: string, lesson: string, value: Exclude<Progress, 'none'>): void {
  const all = read();
  const key = `${topic}/${lesson}`;
  if (all[key] === 'done' || all[key] === value) return;
  all[key] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage can be unavailable (private mode); progress then lasts for this page only.
  }
  window.dispatchEvent(new CustomEvent('vse:progress'));
}

export function doneCount(keys: string[]): number {
  const all = read();
  return keys.filter((k) => all[k] === 'done').length;
}

/** How many of these lessons are begun but not finished. */
export function startedCount(keys: string[]): number {
  const all = read();
  return keys.filter((k) => all[k] === 'started').length;
}
