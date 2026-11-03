// Hash routes, so GitHub Pages needs no server rewrites:
//   #/                         home
//   #/<topic>/<lesson>[/<n>]   lesson, optionally at step n (1-based)

export type Route =
  | { page: 'home' }
  | { page: 'lesson'; topic: string; lesson: string; step: number };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [topic, lesson, step] = parts;
  if (topic && lesson) {
    const n = Number(step);
    return { page: 'lesson', topic, lesson, step: Number.isInteger(n) && n > 0 ? n - 1 : 0 };
  }
  return { page: 'home' };
}

export function lessonHref(topic: string, lesson: string, stepIndex?: number): string {
  const base = `#/${encodeURIComponent(topic)}/${encodeURIComponent(lesson)}`;
  return stepIndex === undefined ? base : `${base}/${stepIndex + 1}`;
}
