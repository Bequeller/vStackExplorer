import type { Step } from '../lessons/types';
import type { NodeStates, PlacedLesson, SceneDriver, SceneMode, StepContext } from './driver';
import { NetworkView } from './networkView';
import { SequenceView } from './sequenceView';

/** Both views of a lesson's scene, kept in step; only one is shown at a time. */
export class SceneView implements SceneDriver {
  private readonly root: HTMLDivElement;
  private readonly network: NetworkView;
  private readonly sequence: SequenceView;
  private readonly resize: ResizeObserver | null;

  constructor(host: HTMLElement, lesson: PlacedLesson, times: string[]) {
    this.root = document.createElement('div');
    this.root.className = 'scene-views';
    host.appendChild(this.root);
    this.network = new NetworkView(this.root, lesson);
    this.sequence = new SequenceView(this.root, lesson, times);
    this.setMode('network');
    this.resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.network.refit());
    this.resize?.observe(this.network.element);
  }

  setMode(mode: SceneMode): void {
    this.root.dataset.mode = mode;
    this.network.element.toggleAttribute('hidden', mode !== 'network');
    this.sequence.element.toggleAttribute('hidden', mode !== 'sequence');
    if (mode === 'network') this.network.refit();
    else this.sequence.reveal();
  }

  begin(step: Step, index: number, _before: NodeStates, after: NodeStates, context: StepContext): void {
    this.network.begin(step, index, after, context);
    this.sequence.begin(step, index, context);
  }

  update(step: Step, t: number): void {
    this.network.update(step, t);
    this.sequence.update(step, t);
  }

  destroy(): void {
    this.resize?.disconnect();
    this.root.remove();
  }
}
