import type { DecodedRecord, Lesson, NodeKind, Source, StateView, TopicMeta } from '../lessons/types';
import { iconKinds } from '../scene/icons';
import { layoutRecord, parseHex } from './record';

/** Limits from docs/DESIGN.md (step-details panel) and decision 0010 (lesson shape). */
export const limits = {
  detailChars: 320,
  summaryChars: 90,
  minFacts: 2,
  maxFacts: 4,
  maxLines: 4,
} as const;

const NODE_KINDS: readonly NodeKind[] = ['client', 'container', 'framework', 'app', 'storage', 'cloud'];

// Allowed keys, so a misplaced field (a state change on a move, a lesson-level record list)
// is an error instead of being silently ignored.
const LESSON_KEYS = ['id', 'topic', 'title', 'subtitle', 'summary', 'versions', 'layers', 'nodes', 'states', 'steps', 'overview', 'selfCheck'];
const STEP_KEYS = ['id', 'layer', 'path', 'kind', 'title', 'summary', 'detail', 'facts', 'lines', 'record', 'sources'];
const MOVE_KEYS = [...STEP_KEYS, 'from', 'to', 'token'];
const MUTATE_KEYS = [...STEP_KEYS, 'node', 'after'];
const RECORD_KEYS = ['title', 'protocol', 'segments', 'fields', 'wire', 'format'];
const FIELD_KEYS = ['name', 'value', 'note', 'segment', 'span', 'offset', 'length', 'example'];

/** Checks a topic's meta.ts: its layout is the map every lesson in the topic draws on. */
export function validateTopic(meta: TopicMeta): string[] {
  const errors: string[] = [];
  const at = (where: string, message: string): void => {
    errors.push(`${meta.topic || '?'}/meta ${where}: ${message}`);
  };
  for (const key of ['topic', 'title', 'group', 'summary', 'checkedOn'] as const) {
    if (!nonEmpty(meta[key])) at(key, 'is empty');
  }
  if (!meta.lessons?.length) at('lessons', 'list at least one lesson id');
  const layout = meta.layout;
  if (!layout || !(layout.width > 0) || !(layout.height > 0)) {
    at('layout', 'needs a positive width and height');
    return errors;
  }
  const ids = new Set<string>();
  for (const node of layout.nodes ?? []) {
    const where = `layout node ${node.id}`;
    if (ids.has(node.id)) at(where, 'duplicate node id');
    ids.add(node.id);
    if (!nonEmpty(node.label)) at(where, 'label is empty');
    if (!NODE_KINDS.includes(node.kind)) at(where, `kind must be one of ${NODE_KINDS.join(', ')}`);
    if (!iconKinds.includes(node.icon)) at(where, `icon "${node.icon}" is not an IconKind (see docs/DESIGN.md, Icons)`);
    if (!inside(node.x, layout.width) || !inside(node.y, layout.height)) at(where, 'position is outside the layout');
  }
  return errors;
}

/**
 * Checks a lesson against the schema rules that types cannot express.
 * Returns one message per problem; an empty array means the lesson is valid.
 */
export function validateLesson(lesson: Lesson, meta: TopicMeta): string[] {
  const errors: string[] = [];
  const at = (where: string, message: string): void => {
    errors.push(`${lesson.topic || '?'}/${lesson.id || '?'} ${where}: ${message}`);
  };

  findFunctions(lesson, 'lesson', (path) => at(path, 'lessons are data and must not contain functions'));
  unknownKeys(lesson, LESSON_KEYS, (k) => at(k, 'is not a lesson field (records belong to the step that shows them)'));

  for (const key of ['id', 'topic', 'title', 'subtitle', 'summary'] as const) {
    if (!nonEmpty(lesson[key])) at(key, 'is empty');
  }
  if (!/^[a-z0-9-]+$/.test(lesson.id)) at('id', 'use lowercase letters, digits, and hyphens');
  if (meta.topic !== lesson.topic) at('topic', `must equal the topic folder "${meta.topic}"`);
  if (!sameVersions(meta.versions, lesson.versions)) at('versions', "must equal the topic's meta.versions");
  if (!meta.lessons.includes(lesson.id)) at('id', "is not listed in the topic's meta.lessons");

  const layerIds = new Set((lesson.layers ?? []).map((l) => l.id));
  if (layerIds.size === 0) at('layers', 'needs at least one layer');

  // Nodes come from the topic layout, so every lesson in the topic shares one map.
  const layoutIds = new Set((meta.layout?.nodes ?? []).map((n) => n.id));
  const nodeIds = new Set<string>();
  for (const ref of lesson.nodes ?? []) {
    if (ref === null || (typeof ref !== 'string' && typeof ref?.id !== 'string')) {
      at('nodes', 'list node ids from the topic layout (positions live in meta.ts)');
      continue;
    }
    const id = typeof ref === 'string' ? ref : ref.id;
    if (typeof ref !== 'string') {
      unknownKeys(ref, ['id', 'label', 'sublabel', 'kind', 'icon'], (k) =>
        at(`node ${id}`, `"${k}" cannot be set per lesson; positions and other fields live in the topic layout`));
      if (ref.kind !== undefined && !NODE_KINDS.includes(ref.kind)) at(`node ${id}`, `kind must be one of ${NODE_KINDS.join(', ')}`);
      if (ref.icon !== undefined && !iconKinds.includes(ref.icon)) at(`node ${id}`, `icon "${ref.icon}" is not an IconKind`);
      if (ref.label !== undefined && !nonEmpty(ref.label)) at(`node ${id}`, 'label override is empty');
    }
    if (nodeIds.has(id)) at(`node ${id}`, 'listed twice');
    nodeIds.add(id);
    if (!layoutIds.has(id)) at(`node ${id}`, `is not in the ${lesson.topic} topic layout (meta.ts)`);
  }

  const stateViews = new Map<string, StateView>();
  for (const state of lesson.states ?? []) {
    if (!nodeIds.has(state.node)) at(`state ${state.node}`, 'refers to a node the lesson does not list');
    if (stateViews.has(state.node)) at(`state ${state.node}`, 'a node has at most one state view');
    stateViews.set(state.node, state.view);
    checkView(state.view, (m) => at(`state ${state.node}`, m));
  }

  if (!lesson.steps?.length) at('steps', 'needs at least one step');
  const used = new Set<string>();
  const current = new Map(stateViews);
  const stepIds = new Set<string>();
  lesson.steps?.forEach((step, i) => {
    const where = `step ${i + 1} (${step.id})`;
    if (stepIds.has(step.id)) at(where, 'duplicate step id');
    stepIds.add(step.id);
    for (const key of ['id', 'title', 'summary', 'detail'] as const) {
      if (!nonEmpty(step[key])) at(where, `${key} is empty`);
    }
    if (!layerIds.has(step.layer)) at(where, `layer "${step.layer}" is not one of the lesson's layers`);
    if (step.path !== 'critical' && step.path !== 'side') at(where, 'path must be "critical" or "side"');
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
      unknownKeys(step, MOVE_KEYS, (k) => at(where, `"${k}" is not a move field; a move never changes state (use a mutate step)`));
      for (const end of [step.from, step.to]) {
        if (!nodeIds.has(end)) at(where, `"${end}" is not a node the lesson lists`);
        used.add(end);
      }
      if (step.from === step.to) at(where, 'a move needs two different nodes; use mutate for a change inside one node');
      if (!nonEmpty(step.token?.label)) at(where, 'token label is empty');
    } else if (step.kind === 'mutate') {
      unknownKeys(step, MUTATE_KEYS, (k) => at(where, `"${k}" is not a mutate field`));
      used.add(step.node);
      const before = current.get(step.node);
      if (!nodeIds.has(step.node)) at(where, `node "${step.node}" is not a node the lesson lists`);
      if (!before) {
        at(where, `node "${step.node}" has no state view (table or list) in states`);
      } else if (before.type !== step.after?.type) {
        at(where, `after must be the node's whole ${before.type} view`);
      } else {
        if (before.type === 'table' && step.after.type === 'table' && before.columns.join('|') !== step.after.columns.join('|')) {
          at(where, "after must keep the state view's columns");
        }
        if (JSON.stringify(before) === JSON.stringify(step.after)) at(where, 'after is the same as before; a mutate must change state');
        current.set(step.node, step.after);
      }
      if (step.after) checkView(step.after, (m) => at(where, m));
    } else {
      at(where, 'kind must be "move" or "mutate"');
    }
  });

  if (lesson.steps?.length && lesson.steps[0]?.path !== 'critical') at('steps', 'the first step must be on the critical path');
  for (const id of nodeIds) if (!used.has(id)) at(`node ${id}`, 'is listed but no step uses it');

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
  if (!record.segments?.length) fail('record needs at least one segment');
  if (!record.fields?.length) fail('record needs at least one field');

  const formatKeys: Record<string, string[]> = { text: ['raw'], binary: ['hex', 'baseOffset'], fields: [] };
  const extra = formatKeys[record.format];
  if (!extra) {
    fail('record format must be "text", "binary", or "fields"');
    return;
  }
  if (typeof record.wire !== 'boolean') fail('record must say whether it is real wire bytes (wire: true or false)');
  else if (record.wire !== (record.format !== 'fields')) fail(`a "${record.format}" record must have wire: ${record.format !== 'fields'}`);
  unknownKeys(record, [...RECORD_KEYS, ...extra], (k) => fail(`record field "${k}" does not belong in a "${record.format}" record`));

  const segmentIds = new Set((record.segments ?? []).map((s) => s.id));
  for (const field of record.fields ?? []) {
    const name = `record field "${field.name}"`;
    unknownKeys(field, FIELD_KEYS, (k) => fail(`${name} has unknown key "${k}"`));
    if (!nonEmpty(field.name) || !nonEmpty(field.value) || !nonEmpty(field.note)) fail(`${name} needs a name, a value, and a note`);
    if (!segmentIds.has(field.segment)) fail(`${name} has unknown segment "${field.segment}"`);
    if (record.format !== 'text' && field.span !== undefined) fail(`${name}: span is only for "text" records`);
    if (record.format !== 'binary' && (field.offset !== undefined || field.length !== undefined)) fail(`${name}: offset and length are only for "binary" records`);
  }
  if (record.format === 'text' && !nonEmpty(record.raw)) fail('record raw is empty');
  if (record.format === 'binary' && !parseHex(record.hex)?.length) fail('record hex must be two-digit hex bytes separated by spaces');
  for (const problem of layoutRecord(record).problems) fail(`record ${problem}`);
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

function unknownKeys(value: object, allowed: string[], found: (key: string) => void): void {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) found(key);
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
