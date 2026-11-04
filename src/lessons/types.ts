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
  | 'storage' // persistent state: disk, table, log
  | 'cloud'; // a managed cloud service the team does not run: EKS API, STS, EC2 API, ALB (decision 0012)

/**
 * Which isometric illustration the scene draws for a node. docs/DESIGN.md (Icons) maps the
 * nodes in docs/research/ to these. Pick by what the node is, not by its topic.
 */
export type IconKind =
  // Clients and generic components
  | 'laptop' // a client machine, a developer, a CLI
  | 'globe' // the internet, outside users
  | 'server' // a server or container process, e.g. Tomcat, containerd
  | 'filter-stack' // a chain of filters, interceptors, or rules (netfilter)
  | 'hub' // a central dispatcher, e.g. DispatcherServlet
  | 'index' // a lookup table, e.g. HandlerMapping, page hash, EndpointSlice
  | 'adapter' // something that adapts one call shape to another, e.g. ha_innobase
  | 'converter' // something that turns bytes into objects or back, e.g. a serializer
  | 'controller' // a web controller
  | 'service' // a service bean, an application server
  | 'repository' // a repository or DAO
  | 'database' // a database
  | 'thread' // a thread or event loop: Redis main / I/O thread, purge thread, log writer
  | 'queue' // a list or buffer that items move along: LRU list, flush list, repl buffer, log buffer
  | 'memory' // memory pages: OS page cache, copy-on-write pages
  | 'lock' // a lock table or lock system
  | 'snapshot' // a consistent view taken at a point in time: MySQL ReadView
  // Storage
  | 'buffer-pool' // a cache of fixed-size page frames: InnoDB buffer pool
  | 'page' // one fixed-size page with records: a B+Tree page
  | 'btree' // a B+Tree (root above leaves)
  | 'log-file' // an append-only log on disk: redo, undo, binlog, AOF, Raft log
  | 'disk' // a disk or tablespace file
  | 'file' // a single file: dump.rdb, doublewrite file, a config file
  | 'folder' // a directory of files: a Kafka partition directory, appendonlydir
  // Messaging (Kafka)
  | 'producer' // something that sends records
  | 'broker' // a message broker
  | 'partition-log' // a partition's log of segments
  | 'consumer' // something that reads records
  | 'coordinator' // a group or transaction coordinator
  | 'quorum' // a set of voters: a KRaft controller quorum
  // Key-value (Redis)
  | 'keyspace' // a keyspace or dictionary of keys
  | 'replica' // a replica of another server
  | 'sentinel' // a watcher that fails over a primary
  | 'slot-map' // a hash-slot map across shards
  // Cloud and Kubernetes (EKS)
  | 'cloud' // a cloud control plane or managed service
  | 'etcd' // etcd: a replicated key-value store
  | 'api-server' // the Kubernetes API server
  | 'scheduler' // the Kubernetes scheduler
  | 'kubelet' // the kubelet agent on a node
  | 'k8s-node' // a Kubernetes worker node
  | 'pod' // a Pod
  | 'eni' // an elastic network interface
  | 'load-balancer' // a load balancer
  | 'iam' // identity: IAM role, STS, OIDC provider

/**
 * A component on the topic's map. x and y are the base center of the illustration, in scene
 * units. Nodes live in the topic layout (meta.ts), so every lesson in a topic shares one map.
 */
export interface TopicNode {
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

/**
 * The topic's map: where each component sits. Lay it out so the critical path reads in one
 * direction (outside → inside, caller → callee, memory above disk). docs/DESIGN.md (Principles).
 */
export interface TopicLayout {
  /** World size in scene units; the camera frames parts of it. */
  width: number;
  height: number;
  nodes: TopicNode[];
  /** Boundaries drawn as stacked isometric slabs: a process, a machine, a VPC (decision 0015). */
  regions?: Region[];
}

/**
 * A boundary on the topic map: who runs it, which process or machine holds it. The engine draws
 * it as an isometric slab whose footprint it computes from the member nodes; nested regions stack
 * one slab higher, and each node stands on its innermost slab. Lay out a region's members along
 * the iso ground grid (docs/DESIGN.md, Principles), or the slab comes out wide and loose.
 */
export interface Region {
  id: string;
  /** Painted on the slab's floor along its near edge. */
  label: string;
  /** Ids of the topic nodes directly inside this region (not those inside its child regions). */
  nodes: string[];
  /** Id of the region that holds this one. */
  parent?: string;
  /** True for a part the team does not run, such as the EKS control plane. Drawn dashed. */
  managed?: boolean;
}

/**
 * A lesson's use of a topic-map node. Position always comes from the topic layout; a lesson may
 * relabel a node for its role there (e.g. Kafka's `log` is `users-0` in the compaction lesson).
 */
export interface LessonNodeOverride {
  id: string;
  label?: string;
  sublabel?: string;
  kind?: NodeKind;
  icon?: IconKind;
}

/** Whether a step is on the critical path (drawn dominant, replayed) or a side path (drawn weaker). */
export type PathKind = 'critical' | 'side';

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

/**
 * An append-only log with named markers at offsets: a partition log with HW and LEO, a redo log
 * with the current LSN and the checkpoint. Drawn as a strip of entries with markers under it.
 */
export interface LogView {
  type: 'log';
  /** In ascending offset order. Show only the entries the step needs (the scene shows the last 8). */
  entries: { offset: number; label: string }[];
  /** A marker may point one past the last entry (LEO, the next write position). */
  markers: { name: string; offset: number }[];
}

/**
 * An ordered queue with named boundaries: an LRU list with its young/old midpoint, a flush list,
 * an eviction pool. Items must be unique, so a move (an item to the head) can be drawn.
 */
export interface QueueView {
  type: 'queue';
  /** From head to tail. */
  items: string[];
  /** `at` is a boundary between items: 0 is before the head, items.length is after the tail. */
  marks: { name: string; at: number }[];
}

/** One page of a tree view. */
export interface TreePage {
  id: string;
  keys: string[];
  /** Ids of this page's children in the next level, in order. */
  children?: string[];
}

/** A tree of pages by level, root level first: a B+Tree index before and after a page split. */
export interface TreeView {
  type: 'tree';
  levels: TreePage[][];
}

export type StateView = TableView | ListView | LogView | QueueView | TreeView;

/**
 * A node's inner state and its initial content. It is not drawn on the scene: the node gets
 * a badge when a `mutate` step changes it, and the view opens in the step details.
 */
export interface NodeState {
  node: string;
  /** Names this view when the node has more than one (e.g. a buffer pool's `lru` and `flush`). */
  id?: string;
  title: string;
  /**
   * `table` and `list` show only in the step details. `log`, `queue`, and `tree` also show as a
   * small inset next to the node while a mutate step changes them (decision 0015).
   */
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
  /** One-line meaning. Required: the decoder shows it next to every field. */
  note: string;
  /** The `RecordSegment` id this field belongs to. */
  segment: string;
  /**
   * `format: 'text'` only: the exact text of this field inside `raw`. Spans are matched in
   * field order, each after the previous one. Omit for a derived field.
   */
  span?: string;
  /** `format: 'binary'` only: the field's first byte, counted from the start of `hex`. */
  offset?: number;
  /** `format: 'binary'` only: the field's length in bytes. */
  length?: number;
  /** True when the value changes per run (a date, an id, an LSN). The decoder tags it "E.G.". */
  example?: boolean;
}

interface RecordBase {
  title: string;
  /** The protocol or format, e.g. "HTTP/1.1", "RESP2", "InnoDB page", "Java object". */
  protocol: string;
  /** Bands of the decoder's layer bar, in order. */
  segments: RecordSegment[];
  fields: RecordField[];
}

/** Real bytes on the wire or on disk that are text: HTTP, RESP. `raw` uses \r\n for CRLF. */
export interface TextRecord extends RecordBase {
  wire: true;
  format: 'text';
  raw: string;
}

/**
 * Real bytes on the wire or on disk that are binary: an InnoDB page header, a Kafka request.
 * `hex` is the bytes as two-digit hex pairs separated by spaces. Fields give `offset` and `length`.
 */
export interface BinaryRecord extends RecordBase {
  wire: true;
  format: 'binary';
  hex: string;
  /** Offset of the first byte of `hex` inside the larger structure, for display (e.g. 38). */
  baseOffset?: number;
}

/** Not bytes: an in-memory struct, a Kubernetes object, CLI output. The decoder shows a field table. */
export interface FieldsRecord extends RecordBase {
  wire: false;
  format: 'fields';
}

/**
 * A decoded structure shown field by field. It lives on the step that shows it (there is no
 * lesson-level list); to show the same record on two steps, put it in a const and reuse it.
 */
export type DecodedRecord = TextRecord | BinaryRecord | FieldsRecord;

interface StepBase {
  id: string;
  /** The `Layer` id this step belongs to. */
  layer: string;
  /**
   * `critical`: the main path a request, write, or event takes; drawn dominant and replayed at
   * the end. `side`: a failure branch or detour; drawn weaker and shown only while it is used.
   */
  path: PathKind;
  title: string;
  /** One line under the title, also used in the event log's info column. */
  summary: string;
  /** Korean prose, about 5 lines (at most 320 characters). Longer explanations go in `overview`. */
  detail: string;
  /** 2 to 4 rows. */
  facts: Fact[];
  /** Key lines of the current message, shown in the message card (at most 4). */
  lines?: string[];
  /** The message this step shows in the decoder. Steps without one cannot be decoded. */
  record?: DecodedRecord;
  /** At least one. Every fact in the step must be backed by one of these. */
  sources: Source[];
}

/** Something travels from one node to another: a request, a call, a return value. It never changes state. */
export interface MoveStep extends StepBase {
  kind: 'move';
  from: string;
  to: string;
  token: Token;
  /**
   * More moves that play during the same step and finish together: two flows racing, such as
   * the kubelet TERM path and the load balancer deregistration (decision 0015).
   */
  parallel?: { from: string; to: string; token: Token }[];
  /** Draw this move as a burst of N requests (a cache stampede), labeled ×N. At least 2. */
  count?: number;
}

/**
 * State changes inside one node. The node must have a `states` entry, and `after` is that
 * node's whole view after the step (same type, same columns), not only the changed rows.
 */
export interface MutateStep extends StepBase {
  kind: 'mutate';
  node: string;
  /** The `NodeState.id` this step changes. Required when the node has more than one view. */
  state?: string;
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
  layers: Layer[];
  /**
   * The topic layout's nodes this lesson uses: an id, or an id with a per-lesson label, sublabel,
   * kind, or icon. Positions never change per lesson. Every listed node must be used by a step.
   */
  nodes: (string | LessonNodeOverride)[];
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
  /** The topic's one map, shared by all its lessons. */
  layout: TopicLayout;
}
