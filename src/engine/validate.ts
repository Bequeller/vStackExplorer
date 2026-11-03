import type { DecodedRecord, Lesson, Source, StateView, TopicMeta } from '../lessons/types';
import { layoutRecord } from './record';

/** Limits from docs/DESIGN.md (step-details panel). */
export const limits = {
  detailChars: 320,
  summaryChars: 90,
  minFacts: 2,
  maxFacts: 4,
  maxLines: 4,
} as const;

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

  for (const key of ['id', 'topic', 'title', 'subtitle', 'summary'] as const) {
    if (!nonEmpty(lesson[key])) at(key, 'is empty');
  }
  if (!/^[a-z0-9-]+$/.test(lesson.id)) at('id', 'use lowercase letters, digits, and hyphens');
  if (Object.keys(lesson.versions ?? {}).length === 0) at('versions', 'pin at least one version');

  if (meta) {
    if (meta.topic !== lesson.topic) at('topic', `must equal the topic folder "${meta.topic}"`);
    if (!sameVersions(meta.versions, lesson.versions)) at('versions', "must equal the topic's meta.versions");
    if (!meta.lessons.includes(lesson.id)) at('id', "is not listed in the topic's meta.lessons");
  }

  const layerIds = new Set((lesson.layers ?? []).map((l) => l.id));
  if (layerIds.size === 0) at('layers', 'needs at least one layer');

  const nodeIds = new Set<string>();
  for (const node of lesson.nodes ?? []) {
    if (nodeIds.has(node.id)) at(`node ${node.id}`, 'duplicate node id');
    nodeIds.add(node.id);
    if (!inside(node.x, lesson.scene.width) || !inside(node.y, lesson.scene.height)) {
      at(`node ${node.id}`, 'position is outside the scene');
    }
    if (!nonEmpty(node.icon)) at(`node ${node.id}`, 'needs an icon');
  }

  const stateViews = new Map<string, StateView>();
  for (const state of lesson.states ?? []) {
    if (!nodeIds.has(state.node)) at(`state ${state.node}`, 'refers to an unknown node');
    if (stateViews.has(state.node)) at(`state ${state.node}`, 'a node has at most one state view');
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
    if (!layerIds.has(step.layer)) at(where, `layer "${step.layer}" is not one of the lesson's layers`);
    if ((step.detail ?? '').length > limits.detailChars) {
      at(where, `detail is ${step.detail.length} characters; keep it under ${limits.detailChars} and move the rest to overview`);
    }
    if ((step.summary ?? '').length > limits.summaryChars) at(where, `summary is longer than ${limits.summaryChars} characters`);
    const facts = step.facts ?? [];
    if (facts.length < limits.minFacts || facts.length > limits.maxFacts) {
      at(where, `has ${facts.length} facts; use ${limits.minFacts} to ${limits.maxFacts}`);
    }
    for (const fact of facts) {
      if (!nonEmpty(fact.key) || !nonEmpty(fact.value)) at(where, 'a fact needs a key and a value');
    }
    if ((step.lines?.length ?? 0) > limits.maxLines) at(where, `lines has more than ${limits.maxLines} entries`);
    if (step.record) checkRecord(step.record, (m) => at(where, m));
    checkSources(step.sources, (m) => at(where, m));

    if (step.kind === 'move') {
      if (!nodeIds.has(step.from)) at(where, `from "${step.from}" is not a node`);
      if (!nodeIds.has(step.to)) at(where, `to "${step.to}" is not a node`);
      if (step.from === step.to) at(where, 'a move needs two different nodes; use mutate for a change inside one node');
      if (!nonEmpty(step.token?.label)) at(where, 'token label is empty');
    } else if (step.kind === 'mutate') {
      const initial = stateViews.get(step.node);
      if (!nodeIds.has(step.node)) at(where, `node "${step.node}" is not a node`);
      if (!initial) at(where, `node "${step.node}" has no state view (table or list) to change`);
      else if (initial.type !== step.after?.type) at(where, `after must be a ${initial.type}, like the node's state view`);
      if (step.after) checkView(step.after, (m) => at(where, m));
      if (initial && step.after && initial.type === 'table' && step.after.type === 'table') {
        if (initial.columns.join('|') !== step.after.columns.join('|')) at(where, "after must keep the state view's columns");
      }
    } else {
      at(where, 'kind must be "move" or "mutate"');
    }
  });

  if (!lesson.overview?.length) at('overview', 'needs at least one section');
  lesson.overview?.forEach((section, i) => {
    const where = `overview ${i + 1}`;
    if (!nonEmpty(section.title) || !nonEmpty(section.body)) at(where, 'needs a title and a body');
    checkSources(section.sources, (m) => at(where, m));
  });

  if (!lesson.selfCheck?.length) at('selfCheck', 'needs at least one question');
  for (const item of lesson.selfCheck ?? []) {
    if (!nonEmpty(item.question) || !nonEmpty(item.answer)) at('selfCheck', 'each item needs a question and an answer');
  }

  return errors;
}

function checkRecord(record: DecodedRecord, fail: (message: string) => void): void {
  if (!nonEmpty(record.title)) fail('record title is empty');
  if (!nonEmpty(record.protocol)) fail('record protocol is empty');
  if (!nonEmpty(record.raw)) fail('record raw is empty');
  if (!record.segments?.length) fail('record needs at least one segment');
  if (!record.fields?.length) fail('record needs at least one field');
  const segmentIds = new Set((record.segments ?? []).map((s) => s.id));
  for (const field of record.fields ?? []) {
    if (!nonEmpty(field.name) || !nonEmpty(field.value) || !nonEmpty(field.note)) {
      fail(`record field "${field.name}" needs a name, a value, and a note`);
    }
    if (!segmentIds.has(field.segment)) fail(`record field "${field.name}" has unknown segment "${field.segment}"`);
  }
  if (nonEmpty(record.raw)) {
    for (const span of layoutRecord(record).missing) fail(`record span "${span}" is not in raw (spans must appear in field order)`);
  }
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
