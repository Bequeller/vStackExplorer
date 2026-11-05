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
  private last: { step: Step; t: number } | null = null;

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
    // The hidden view skipped frames; bring it to the current progress.
    if (this.last) this.update(this.last.step, this.last.t);
  }

  begin(step: Step, index: number, _before: NodeStates, after: NodeStates, context: StepContext): void {
    this.network.begin(step, index, after, context);
    this.sequence.begin(step, index, context);
  }

  /** Animates only the view on screen. */
  update(step: Step, t: number): void {
    this.last = { step, t };
    if (this.root.dataset.mode === 'sequence') this.sequence.update(step, t);
    else this.network.update(step, t);
  }

  destroy(): void {
    this.resize?.disconnect();
    this.root.remove();
  }
}
