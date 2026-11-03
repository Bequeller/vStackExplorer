import type { Lesson, Source, StateView, TopicMeta } from '../lessons/types';

/**
 * Checks a lesson against the schema rules that types cannot express.
 * Returns one message per problem; an empty array means the lesson is valid.
 */
export function validateLesson(lesson: Lesson, meta?: TopicMeta): string[] {
  const errors: string[] = [];
  const at = (where: string, message: string): void => {
    errors.push(`${lesson.topic || '?'}/${lesson.id || '?'} ${where}: ${message}`);
  };

  findFunctions(lesson, 'lesson', (path) => at(path, 'lessons are data and must not contain functions'));

  for (const key of ['id', 'topic', 'title', 'summary'] as const) {
    if (!nonEmpty(lesson[key])) at(key, 'is empty');
  }
  if (!/^[a-z0-9-]+$/.test(lesson.id)) at('id', 'use lowercase letters, digits, and hyphens');
  if (Object.keys(lesson.versions ?? {}).length === 0) at('versions', 'pin at least one version');

  if (meta) {
    if (meta.topic !== lesson.topic) at('topic', `must equal the topic folder "${meta.topic}"`);
    if (!sameVersions(meta.versions, lesson.versions)) at('versions', "must equal the topic's meta.versions");
    if (!meta.lessons.includes(lesson.id)) at('id', "is not listed in the topic's meta.lessons");
  }

  const nodeIds = new Set<string>();
  for (const node of lesson.nodes ?? []) {
    if (nodeIds.has(node.id)) at(`node ${node.id}`, 'duplicate node id');
    nodeIds.add(node.id);
    if (!inside(node.x, lesson.scene.width) || !inside(node.y, lesson.scene.height)) {
      at(`node ${node.id}`, 'position is outside the scene');
    }
  }

  const stateViews = new Map<string, StateView>();
  for (const state of lesson.states ?? []) {
    if (!nodeIds.has(state.node)) at(`state ${state.node}`, 'refers to an unknown node');
    if (stateViews.has(state.node)) at(`state ${state.node}`, 'a node has at most one state panel');
    stateViews.set(state.node, state.view);
    checkView(state.view, (m) => at(`state ${state.node}`, m));
  }

  if (!lesson.steps?.length) at('steps', 'needs at least one step');
  const stepIds = new Set<string>();
  lesson.steps?.forEach((step, i) => {
    const where = `step ${i + 1} (${step.id})`;
    if (stepIds.has(step.id)) at(where, 'duplicate step id');
    stepIds.add(step.id);
    for (const key of ['id', 'title', 'summary', 'detail'] as const) {
      if (!nonEmpty(step[key])) at(where, `${key} is empty`);
    }
    for (const fact of step.facts ?? []) {
      if (!nonEmpty(fact.key) || !nonEmpty(fact.value)) at(where, 'a fact needs a key and a value');
    }
    if (step.record) {
      if (!nonEmpty(step.record.title)) at(where, 'record title is empty');
      if (!step.record.fields?.length) at(where, 'record needs at least one field');
      for (const field of step.record.fields ?? []) {
        if (!nonEmpty(field.name) || !nonEmpty(field.value)) at(where, 'a record field needs a name and a value');
      }
    }
    checkSources(step.sources, (m) => at(where, m));

    if (step.kind === 'move') {
      if (!nodeIds.has(step.from)) at(where, `from "${step.from}" is not a node`);
      if (!nodeIds.has(step.to)) at(where, `to "${step.to}" is not a node`);
      if (step.from === step.to) at(where, 'a move needs two different nodes; use mutate for a change inside one node');
      if (!nonEmpty(step.token?.label)) at(where, 'token label is empty');
    } else if (step.kind === 'mutate') {
      const initial = stateViews.get(step.node);
      if (!nodeIds.has(step.node)) at(where, `node "${step.node}" is not a node`);
      if (!initial) at(where, `node "${step.node}" has no state panel (table or list) to change`);
      else if (initial.type !== step.after?.type) at(where, `after must be a ${initial.type}, like the node's state panel`);
      if (step.after) checkView(step.after, (m) => at(where, m));
      if (initial && step.after && initial.type === 'table' && step.after.type === 'table') {
        if (initial.columns.join('|') !== step.after.columns.join('|')) at(where, "after must keep the panel's columns");
      }
    } else {
      at(where, 'kind must be "move" or "mutate"');
    }
  });

  if (!lesson.selfCheck?.length) at('selfCheck', 'needs at least one question');
  for (const item of lesson.selfCheck ?? []) {
    if (!nonEmpty(item.question) || !nonEmpty(item.answer)) at('selfCheck', 'each item needs a question and an answer');
  }

  return errors;
}

function checkSources(sources: Source[] | undefined, fail: (message: string) => void): void {
  if (!Array.isArray(sources) || sources.length === 0) {
    fail('needs at least one source with a url and a version');
    return;
  }
  for (const source of sources) {
    if (!nonEmpty(source?.url) || !/^https:\/\/\S+$/.test(source.url)) fail(`source url must be an https URL: "${source?.url ?? ''}"`);
    if (!nonEmpty(source?.version)) fail(`source ${source?.url ?? ''} has no version`);
    if (!nonEmpty(source?.label)) fail(`source ${source?.url ?? ''} has no label`);
  }
}

function checkView(view: StateView, fail: (message: string) => void): void {
  if (view.type === 'table') {
    if (view.columns.length === 0) fail('a table needs columns');
    view.rows.forEach((row, r) => {
      if (row.length !== view.columns.length) fail(`table row ${r + 1} has ${row.length} cells, expected ${view.columns.length}`);
    });
  } else if (view.type === 'list') {
    if (view.items.length === 0) fail('a list needs at least one item');
  } else {
    fail('a state view must be a table or a list');
  }
}

function findFunctions(value: unknown, path: string, found: (path: string) => void): void {
  if (typeof value === 'function') {
    found(path);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) findFunctions(child, `${path}.${key}`, found);
  }
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function inside(value: number, max: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= max;
}

function sameVersions(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b ?? {}).length && keys.every((k) => a[k] === b?.[k]);
}
