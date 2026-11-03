// Lesson schema. Lessons are plain data: no functions, and no imports except this file.
// See docs/ARCHITECTURE.md (Lesson format).

/** An official document or source file, pinned to the version it describes. */
export interface Source {
  /** https URL to official documentation or source code at that version. */
  url: string;
  /** The version the URL describes, for example "Spring Framework 7.0.10". */
  version: string;
  /** Short label shown in the source list. */
  label: string;
}

/**
 * What a scene node represents. The color for each kind is fixed across lessons
 * (docs/DESIGN.md: one color per actor), so pick by role, not by look.
 */
export type NodeKind =
  | 'client' // outside caller: browser, curl, another service
  | 'container' // runtime that hosts the app: servlet container, kubelet, OS
  | 'framework' // framework infrastructure: DispatcherServlet, Buffer Pool
  | 'app' // code the application developer writes: controller, service
  | 'storage'; // persistent state: disk, table, log

/** A component on the scene. x and y are the center, in scene units. */
export interface SceneNode {
  id: string;
  /** Short label drawn in the box. Keep it under ~22 characters. */
  label: string;
  /** Optional second line, for example the class or bean name. */
  sublabel?: string;
  kind: NodeKind;
  x: number;
  y: number;
}

/** A table of rows, for example a filter chain or a lock table. */
export interface TableView {
  type: 'table';
  columns: string[];
  rows: string[][];
}

/** An ordered list, for example a thread pool or a free list. */
export interface ListView {
  type: 'list';
  items: string[];
}

export type StateView = TableView | ListView;

/** The state panel drawn for one node, and its initial content. */
export interface NodeState {
  node: string;
  title: string;
  /** Top-left corner and width of the panel, in scene units. */
  x: number;
  y: number;
  width: number;
  view: StateView;
}

/** What a moving token carries. The color for each kind is fixed across lessons. */
export type TokenKind = 'request' | 'response' | 'call' | 'data';

export interface Token {
  kind: TokenKind;
  /** Short text shown next to the token, for example "POST /api/orders". */
  label: string;
}

export interface Fact {
  key: string;
  value: string;
}

/** One decoded field of a record, with its real field name. */
export interface RecordField {
  name: string;
  value: string;
  note?: string;
}

/** A decoded structure shown field by field: an HTTP message, a record header, a Pod spec. */
export interface DecodedRecord {
  title: string;
  /** The raw form, shown verbatim above the fields (optional). */
  raw?: string;
  fields: RecordField[];
}

interface StepBase {
  id: string;
  title: string;
  /** One line shown in the step list. */
  summary: string;
  /** Korean prose. Separate paragraphs with a blank line. Wrap code in `backticks`. */
  detail: string;
  facts: Fact[];
  record?: DecodedRecord;
  /** At least one. Every fact in the step must be backed by one of these. */
  sources: Source[];
}

/** Something travels from one node to another: a request, a call, a return value. */
export interface MoveStep extends StepBase {
  kind: 'move';
  from: string;
  to: string;
  token: Token;
}

/** State changes inside one node. `after` replaces the node's state view. */
export interface MutateStep extends StepBase {
  kind: 'mutate';
  node: string;
  after: StateView;
}

export type Step = MoveStep | MutateStep;

export interface SelfCheckItem {
  question: string;
  answer: string;
}

export interface Lesson {
  /** URL slug, unique within the topic. */
  id: string;
  /** Must equal the topic folder name. */
  topic: string;
  title: string;
  summary: string;
  /** Must equal the topic's meta.versions. */
  versions: Record<string, string>;
  /** Scene size in scene units (the SVG viewBox). */
  scene: { width: number; height: number };
  nodes: SceneNode[];
  states: NodeState[];
  steps: Step[];
  selfCheck: SelfCheckItem[];
}

/** One per topic folder, in meta.ts. */
export interface TopicMeta {
  /** Must equal the folder name. */
  topic: string;
  title: string;
  summary: string;
  /** Position on the home page; lower comes first (docs/PRODUCT.md orders topics by interview value). */
  order: number;
  /** Pinned versions, checked against the official site on `checkedOn`. */
  versions: Record<string, string>;
  /** ISO date the versions were checked. */
  checkedOn: string;
  /** Lesson ids in study order. */
  lessons: string[];
}
