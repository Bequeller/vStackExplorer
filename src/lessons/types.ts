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

/** Which isometric illustration the scene draws for a node. */
export type IconKind =
  | 'laptop' // a client machine
  | 'server' // a server or container process, e.g. Tomcat
  | 'filter-stack' // a chain of filters or interceptors
  | 'hub' // a central dispatcher, e.g. DispatcherServlet
  | 'index' // a lookup table, e.g. HandlerMapping
  | 'adapter' // something that adapts one call shape to another
  | 'converter' // something that turns bytes into objects or back
  | 'controller' // a web controller
  | 'service' // a service bean
  | 'repository' // a repository or DAO
  | 'database' // a database
  | 'k8s-node'; // a Kubernetes node

/** A component on the scene. x and y are the base center of the illustration, in scene units. */
export interface SceneNode {
  id: string;
  /** Short name under the illustration. Keep it under ~20 characters. */
  label: string;
  /** Optional second line, for example the class or method. */
  sublabel?: string;
  kind: NodeKind;
  icon: IconKind;
  x: number;
  y: number;
}

/** A group of steps shown in the layer selector and the event log, e.g. "Servlet", "Spring MVC". */
export interface Layer {
  id: string;
  label: string;
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

/**
 * A node's inner state and its initial content. It is not drawn on the scene: the node gets
 * a badge when a `mutate` step changes it, and the view opens in the step details.
 */
export interface NodeState {
  node: string;
  title: string;
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

/** One part of a message, shown as a band in the decoder's layer bar (e.g. request line, headers, body). */
export interface RecordSegment {
  id: string;
  label: string;
}

/** One decoded field of a record, with its real field name. */
export interface RecordField {
  name: string;
  value: string;
  /** One-line meaning. */
  note: string;
  /** The `RecordSegment` id this field belongs to. */
  segment: string;
  /**
   * The exact text of this field inside `raw`. Fields are matched in order, each after the
   * previous one, so the decoder can link a field to its bytes. Omit for derived fields.
   */
  span?: string;
  /** True when the value changes per run (a date, an id). The decoder tags it "E.G.". */
  example?: boolean;
}

/** A decoded structure shown field by field: an HTTP message, a record header, a Pod spec. */
export interface DecodedRecord {
  title: string;
  /** The protocol or format, e.g. "HTTP/1.1", "JSON", "Java object". */
  protocol: string;
  /**
   * The raw form. When `wire` is true it is the exact bytes as text (use \r\n for CRLF),
   * and the decoder shows its size in bytes. Otherwise it is a readable dump.
   */
  raw: string;
  wire: boolean;
  segments: RecordSegment[];
  fields: RecordField[];
}

interface StepBase {
  id: string;
  /** The `Layer` id this step belongs to. */
  layer: string;
  title: string;
  /** One line under the title, also used in the event log's info column. */
  summary: string;
  /** Korean prose, about 5 lines (at most 320 characters). Longer explanations go in `overview`. */
  detail: string;
  /** 2 to 4 rows. */
  facts: Fact[];
  /** Key lines of the current message, shown in the message card (at most 4). */
  lines?: string[];
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

/** A lesson-level explanation, opened from the "Overview" button. */
export interface OverviewSection {
  title: string;
  /** Korean prose. Blank lines split paragraphs. */
  body: string;
  sources: Source[];
}

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
  /** One line, shown in the topic drawer. */
  subtitle: string;
  summary: string;
  /** Must equal the topic's meta.versions. */
  versions: Record<string, string>;
  /** World size in scene units; the camera frames parts of it. */
  scene: { width: number; height: number };
  layers: Layer[];
  nodes: SceneNode[];
  states: NodeState[];
  steps: Step[];
  overview: OverviewSection[];
  selfCheck: SelfCheckItem[];
}

/** One per topic folder, in meta.ts. */
export interface TopicMeta {
  /** Must equal the folder name. */
  topic: string;
  title: string;
  /** Drawer tab this topic belongs to, e.g. "Spring", "MySQL", "EKS". */
  group: string;
  summary: string;
  /** Position in the drawer; lower comes first (docs/PRODUCT.md orders topics by interview value). */
  order: number;
  /** Pinned versions, checked against the official site on `checkedOn`. */
  versions: Record<string, string>;
  /** ISO date the versions were checked. */
  checkedOn: string;
  /** Lesson ids in study order. */
  lessons: string[];
}
