// Finds topics and lessons by folder convention: src/lessons/<topic>/meta.ts and
// src/lessons/<topic>/<lesson-id>.ts. Lesson modules load lazily, one chunk each.
import type { Lesson, TopicMeta } from '../lessons/types';

const metaModules = import.meta.glob<TopicMeta>('../lessons/*/meta.ts', { eager: true, import: 'meta' });
const lessonModules = import.meta.glob<Lesson>(['../lessons/*/*.ts', '!../lessons/*/meta.ts'], { import: 'lesson' });

export function topics(): TopicMeta[] {
  return Object.values(metaModules).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function topic(id: string): TopicMeta | undefined {
  return topics().find((t) => t.topic === id);
}

export async function loadLesson(topicId: string, lessonId: string): Promise<Lesson | undefined> {
  const load = lessonModules[`../lessons/${topicId}/${lessonId}.ts`];
  return load ? load() : undefined;
}
