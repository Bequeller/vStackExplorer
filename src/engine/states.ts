import type { Lesson, LogView, MutateStep, NodeState, QueueView, StateView, TreeView } from '../lessons/types';
import type { NodeStates, ViewDiff } from '../scene/driver';

export type { NodeStates, ViewDiff };

/** The key of a state view in `NodeStates`: the node id, or `node/id` for a named view. */
export function stateKey(node: string, id?: string): string {
  return id ? `${node}/${id}` : node;
}

/** The key of the view a mutate step changes. */
export function mutateKey(step: Pick<MutateStep, 'node' | 'state'>): string {
  return stateKey(step.node, step.state);
}

/** Node states before step 0, keyed by `stateKey`. */
export function initialStates(lesson: Pick<Lesson, 'states'>): NodeStates {
  const states: Record<string, StateView> = {};
  for (const s of lesson.states) states[stateKey(s.node, s.id)] = s.view;
  return states;
}

/** Node states after each step: result[i] is the state once step i has finished. */
export function statesAfterEachStep(lesson: Pick<Lesson, 'states' | 'steps'>): NodeStates[] {
  let current = initialStates(lesson);
  return lesson.steps.map((step) => {
    if (step.kind === 'mutate') current = { ...current, [mutateKey(step)]: step.after };
    return current;
  });
}

/** The state definition a mutate step changes. */
export function stateOf(states: NodeState[], step: Pick<MutateStep, 'node' | 'state'>): NodeState | undefined {
  return states.find((s) => s.node === step.node && (step.state === undefined || s.id === step.state));
}

/** Indexes of rows (table) or items (list) that differ between two views of the same node. */
export function changedRows(before: StateView | undefined, after: StateView): number[] {
  const diff = diffView(before, after);
  return diff.type === 'rows' ? diff.changed : [];
}

/** What changed between two views of the same node, per view type, so the scene can animate it. */
export function diffView(before: StateView | undefined, after: StateView): ViewDiff {
  if (after.type === 'log') return diffLog(before?.type === 'log' ? before : undefined, after);
  if (after.type === 'queue') return diffQueue(before?.type === 'queue' ? before : undefined, after);
  if (after.type === 'tree') return diffTree(before?.type === 'tree' ? before : undefined, after);
  const rowsOf = (v: StateView): string[] =>
    v.type === 'table' ? v.rows.map((r) => r.join('\u0000')) : v.type === 'list' ? v.items : [];
  const prev = before && before.type === after.type ? rowsOf(before) : [];
  return { type: 'rows', changed: rowsOf(after).flatMap((row, i) => (prev[i] === row ? [] : [i])) };
}

function diffLog(before: LogView | undefined, after: LogView): ViewDiff {
  const had = new Set(before?.entries.map((e) => e.offset));
  const names = new Set([...(before?.markers ?? []), ...after.markers].map((m) => m.name));
  return {
    type: 'log',
    added: after.entries.filter((e) => !had.has(e.offset)).map((e) => e.offset),
    markers: [...names].map((name) => ({
      name,
      from: before?.markers.find((m) => m.name === name)?.offset ?? null,
      to: after.markers.find((m) => m.name === name)?.offset ?? null,
    })),
  };
}

function diffQueue(before: QueueView | undefined, after: QueueView): ViewDiff {
  const items = new Set([...(before?.items ?? []), ...after.items]);
  const names = new Set([...(before?.marks ?? []), ...after.marks].map((m) => m.name));
  const at = (list: string[] | undefined, item: string): number | null => {
    const i = list?.indexOf(item) ?? -1;
    return i < 0 ? null : i;
  };
  return {
    type: 'queue',
    items: [...items].map((item) => ({ item, from: at(before?.items, item), to: at(after.items, item) })),
    marks: [...names].map((name) => ({
      name,
      from: before?.marks.find((m) => m.name === name)?.at ?? null,
      to: after.marks.find((m) => m.name === name)?.at ?? null,
    })),
  };
}

function diffTree(before: TreeView | undefined, after: TreeView): ViewDiff {
  const pages = (v: TreeView | undefined): Map<string, string> =>
    new Map((v?.levels ?? []).flat().map((p) => [p.id, p.keys.join('|')]));
  const old = pages(before);
  const now = pages(after);
  return {
    type: 'tree',
    added: [...now.keys()].filter((id) => !old.has(id)),
    removed: [...old.keys()].filter((id) => !now.has(id)),
    changed: [...now.keys()].filter((id) => old.has(id) && old.get(id) !== now.get(id)),
  };
}
