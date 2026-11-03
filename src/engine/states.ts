import type { Lesson, StateView } from '../lessons/types';
import type { NodeStates } from '../scene/driver';

export type { NodeStates };


/**
 * Node states after each step: result[i] is the state once step i has finished.
 * result[-1] is not stored; use `initialStates` for the state before step 0.
 */
export function initialStates(lesson: Pick<Lesson, 'states'>): NodeStates {
  const states: Record<string, StateView> = {};
  for (const s of lesson.states) states[s.node] = s.view;
  return states;
}

export function statesAfterEachStep(lesson: Pick<Lesson, 'states' | 'steps'>): NodeStates[] {
  let current = initialStates(lesson);
  return lesson.steps.map((step) => {
    if (step.kind === 'mutate') current = { ...current, [step.node]: step.after };
    return current;
  });
}

/** Indexes of rows (table) or items (list) that differ between two views of the same node. */
export function changedRows(before: StateView | undefined, after: StateView): number[] {
  const rowsOf = (v: StateView): string[] =>
    v.type === 'table' ? v.rows.map((r) => r.join('\u0000')) : v.items;
  const prev = before && before.type === after.type ? rowsOf(before) : [];
  return rowsOf(after).flatMap((row, i) => (prev[i] === row ? [] : [i]));
}
