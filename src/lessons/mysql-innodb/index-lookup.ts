import type { Lesson, Source } from '../types';

// Every URL is pinned to the release tag, so line anchors stay valid (docs/decisions/0004).
const V = 'MySQL 8.4.13';
const GH = 'https://github.com/mysql/mysql-server/blob/mysql-8.4.13';

const s = {
  pageSizeConst: { label: 'Page size constants (`univ.i`)', url: `${GH}/storage/innobase/include/univ.i#L310-L325`, version: V },
  innodbPageSize: { label: '`innodb_page_size`', url: `${GH}/storage/innobase/handler/ha_innodb.cc#L22837-L22842`, version: V },
  needClustered: { label: '`need_to_access_clustered`', url: `${GH}/storage/innobase/handler/ha_innodb.cc#L8562-L8570`, version: V },
  needClusteredRead: { label: '`need_to_access_clustered`', url: `${GH}/storage/innobase/handler/ha_innodb.cc#L8670`, version: V },
  secondaryPk: { label: 'Secondary index gets PK columns', url: `${GH}/storage/innobase/dict/dict0dict.cc#L3369-L3376`, version: V },
  descent: { label: 'B+Tree descent, tree height', url: `${GH}/storage/innobase/btr/btr0cur.cc#L1100-L1107`, version: V },
  pageHeader: { label: 'Index page header offsets', url: `${GH}/storage/innobase/include/page0types.h#L52-L137`, version: V },
  clustSysCols: { label: 'Clustered index system columns', url: `${GH}/storage/innobase/dict/dict0dict.cc#L3187-L3202`, version: V },
  clustLookup: { label: 'Secondary → clustered lookup in `row_search_mvcc()`', url: `${GH}/storage/innobase/row/row0sel.cc#L5351-L5376`, version: V },
  clustLookupCall: { label: 'Secondary → clustered lookup in `row_search_mvcc()`', url: `${GH}/storage/innobase/row/row0sel.cc#L5444-L5465`, version: V },
  sysColLens: { label: '`DATA_ROW_ID_LEN`, `DATA_TRX_ID_LEN`, `DATA_ROLL_PTR_LEN`', url: `${GH}/storage/innobase/include/data0type.h#L179-L191`, version: V },
  explainExtra: { label: 'EXPLAIN `Extra` strings', url: `${GH}/sql/opt_explain_traditional.cc#L46-L86`, version: V },
  genClust: { label: '`GEN_CLUST_INDEX` creation', url: `${GH}/storage/innobase/handler/ha_innodb.cc#L12415-L12428`, version: V },
  uniqueNotNull: { label: 'UNIQUE NOT NULL key sorted first, may become PK', url: `${GH}/sql/sql_table.cc#L3960-L3990`, version: V },
  rowIdCounter: { label: 'Global row id counter', url: `${GH}/storage/innobase/include/dict0boot.ic#L36-L50`, version: V },
  recHeader: { label: 'Compact record header, delete flag', url: `${GH}/storage/innobase/rem/rec.h#L86-L161`, version: V },
  intOrder: { label: 'INT stored big-endian, sign bit negated', url: `${GH}/storage/innobase/row/row0mysql.cc#L416-L417`, version: V },
  pageSearch: { label: 'Page search: directory binary search, then linear', url: `${GH}/storage/innobase/page/page0cur.cc#L422-L424`, version: V },
  rollPtr: { label: 'Roll pointer layout', url: `${GH}/storage/innobase/include/trx0undo.ic#L45-L76`, version: V },
} satisfies Record<string, Source>;

const PLAN: { type: 'table'; columns: string[] } = { type: 'table', columns: ['항목', '값'] };
const LEAF: { type: 'table'; columns: string[] } = { type: 'table', columns: ['record', 'cursor'] };

// D1.1. Offsets in the plan are from the record origin; the 5-byte header sits at −5…−1.
const CLUSTERED_HEX =
  '00 00 18 00 1E 80 00 00 14 00 00 00 00 0F 11 85 00 00 01 23 01 10 80 00 00 C8 80 00 00 02';
// D1.2. Same header placement. 5 + 4 + 4 = 13 bytes.
const SECONDARY_HEX = '00 00 18 00 0D 80 00 00 C8 80 00 00 14';

export const lesson: Lesson = {
  id: 'index-lookup',
  topic: 'mysql-innodb',
  title: 'Secondary index 조회가 clustered index로 이어지는 길',
  subtitle: 'Secondary index 조회',
  summary:
    'secondary index에서 PK를 읽고 clustered index를 다시 찾습니다. covering index면 두 번째 조회를 건너뜁니다.',
  versions: { MySQL: '8.4.13' },
  layers: [
    { id: 'sql', label: 'SQL' },
    { id: 'btree', label: 'B+Tree' },
  ],
  nodes: ['client', 'sql', 'index'],
  states: [
    { node: 'sql', title: 'plan', view: { ...PLAN, rows: [] } },
    {
      node: 'index',
      id: 'idx_k',
      title: 'idx_k leaf',
      view: {
        ...LEAF,
        rows: [
          ['(100, 10)', '—'],
          ['(200, 20)', '—'],
          ['(300, 30)', '—'],
        ],
      },
    },
    {
      node: 'index',
      id: 'primary',
      title: 'PRIMARY leaf',
      view: {
        ...LEAF,
        rows: [
          ['10', '—'],
          ['20', '—'],
          ['30', '—'],
        ],
      },
    },
    {
      node: 'index',
      id: 'key',
      title: 'clustered key',
      view: { ...PLAN, rows: [['PRIMARY key', 'id']] },
    },
  ],
  steps: [
    {
      id: 'query',
      layer: 'sql',
      path: 'critical',
      kind: 'move',
      from: 'client',
      to: 'sql',
      token: { kind: 'request', label: 'SELECT v FROM t WHERE k=200' },
      title: '쿼리 도착',
      summary: '`SELECT v FROM t WHERE k = 200`',
      detail:
        'InnoDB 테이블은 PK로 정렬된 B+Tree(clustered index)이고, secondary index도 각각 B+Tree다. page 하나는 16KB다.',
      facts: [
        { key: '`innodb_page_size` default', value: '16384' },
        { key: 'index 구성', value: 'clustered(PK) 1개 + secondary N개, 각각 B+Tree' },
      ],
      lines: ['SELECT v FROM t WHERE k=200'],
      sources: [s.pageSizeConst, s.innodbPageSize, s.clustSysCols, s.secondaryPk],
    },
    {
      id: 'plan',
      layer: 'sql',
      path: 'critical',
      kind: 'mutate',
      node: 'sql',
      after: {
        ...PLAN,
        rows: [
          ['index', 'idx_k'],
          ['need_to_access_clustered', 'true'],
        ],
      },
      title: 'plan: `idx_k` + clustered 접근 필요',
      summary: '`v`가 `idx_k`에 없으므로 PK로 한 번 더 찾아야 한다.',
      detail:
        'optimizer가 `idx_k`를 골랐다고 하자. 필요한 컬럼이 secondary index에 없으면 `need_to_access_clustered = true`가 된다.',
      facts: [
        { key: '`idx_k` leaf columns', value: '`k` + PK `id`' },
        { key: '`need_to_access_clustered`', value: '`true` (`v`가 index에 없음)' },
      ],
      lines: ['plan idx_k, need clustered'],
      sources: [s.needClustered, s.needClusteredRead, s.secondaryPk],
    },
    {
      id: 'descend-idx-k',
      layer: 'btree',
      path: 'critical',
      kind: 'move',
      from: 'sql',
      to: 'index',
      token: { kind: 'call', label: 'descend idx_k (k=200)' },
      title: 'secondary B+Tree 하강',
      summary: 'root → leaf로 `k = 200`을 찾는다.',
      detail:
        '비-leaf page의 node pointer는 "자식의 최소 key + 자식 page 번호"다. root에서 leaf까지 page 하나씩 내려간다.',
      facts: [
        { key: 'leaf level', value: '`PAGE_LEVEL = 0`; tree height = root level + 1' },
        { key: 'node pointer', value: '자식의 최소 key + 자식 page 번호' },
      ],
      lines: ['descend idx_k (k=200)', '16384 B / page'],
      sources: [s.descent, s.pageHeader],
    },
    {
      id: 'match-secondary',
      layer: 'btree',
      path: 'critical',
      kind: 'mutate',
      node: 'index',
      state: 'idx_k',
      after: {
        ...LEAF,
        rows: [
          ['(100, 10)', '—'],
          ['(200, 20)', 'on (200, 20)'],
          ['(300, 30)', '—'],
        ],
      },
      title: 'secondary leaf 일치: `(k=200, id=20)`',
      summary: 'secondary leaf에는 key와 PK만 있다.',
      detail:
        'secondary record가 주는 것은 PK뿐이다. `v`를 읽으려면 그 PK로 clustered index를 다시 찾아야 한다.',
      facts: [
        { key: 'secondary leaf record', value: '`k`, `id` (no `DB_TRX_ID` / `DB_ROLL_PTR`)' },
        { key: 'record size', value: '13 B (header 5 + `k` 4 + `id` 4)' },
      ],
      lines: ['match (200, 20)'],
      record: {
        title: 'Secondary leaf record `(k=200, id=20)`',
        protocol: 'InnoDB compact record',
        wire: true,
        format: 'binary',
        hex: SECONDARY_HEX,
        baseOffset: -5,
        segments: [
          { id: 'header', label: 'header' },
          { id: 'key', label: 'key' },
          { id: 'pk', label: 'PK' },
        ],
        fields: [
          { name: 'record header', value: 'next', note: 'delete flag, heap_no, next', segment: 'header', offset: 0, length: 5, example: true },
          { name: 'k', value: '200', note: 'big-endian, sign bit flipped', segment: 'key', offset: 5, length: 4 },
          { name: 'id', value: '20', note: 'secondary leaf가 들고 있는 PK', segment: 'pk', offset: 9, length: 4 },
        ],
      },
      sources: [s.secondaryPk, s.clustSysCols, s.recHeader, s.intOrder],
    },
    {
      id: 'descend-primary',
      layer: 'btree',
      path: 'critical',
      kind: 'mutate',
      node: 'index',
      state: 'primary',
      after: {
        ...LEAF,
        rows: [
          ['10', '—'],
          ['20', '← id=20 하강 중'],
          ['30', '—'],
        ],
      },
      title: 'PK로 clustered B+Tree 하강',
      summary: '`id = 20`으로 PRIMARY를 root부터 다시 탄다.',
      detail:
        '이것이 두 번째 하강이다. 범위 검색이면 일치하는 secondary record마다 반복된다. 넓은 범위의 비-covering 쿼리가 느린 이유다.',
      facts: [
        { key: 'function', value: '`row_sel_get_clust_rec_for_mysql()`' },
        { key: '범위 검색', value: '일치한 secondary record마다 1번씩 반복' },
      ],
      lines: ['clustered lookup id=20', '16384 B / page'],
      sources: [s.clustLookup, s.clustLookupCall],
    },
    {
      id: 'match-clustered',
      layer: 'btree',
      path: 'critical',
      kind: 'mutate',
      node: 'index',
      state: 'primary',
      after: {
        ...LEAF,
        rows: [
          ['10', '—'],
          ['20', 'on → v=2'],
          ['30', '—'],
        ],
      },
      title: 'clustered leaf: 전체 row',
      summary: 'clustered leaf record = PK + `DB_TRX_ID` + `DB_ROLL_PTR` + 나머지 컬럼.',
      detail:
        '숨은 두 컬럼은 MVCC의 핵심이다(lesson 9). `DB_TRX_ID`는 마지막으로 수정한 trx, `DB_ROLL_PTR`은 이전 버전이 있는 undo의 위치다.',
      facts: [
        { key: 'hidden columns', value: '`DB_TRX_ID` 6 B, `DB_ROLL_PTR` 7 B' },
        { key: 'record size', value: '30 B (header 5 + `id` 4 + hidden 13 + `k`·`v` 8)' },
      ],
      lines: ['row (20,200,2)'],
      record: {
        title: 'Clustered leaf record `id=20`',
        protocol: 'InnoDB compact record',
        wire: true,
        format: 'binary',
        hex: CLUSTERED_HEX,
        baseOffset: -5,
        segments: [
          { id: 'header', label: 'header' },
          { id: 'pk', label: 'PK' },
          { id: 'hidden', label: 'hidden' },
          { id: 'columns', label: 'columns' },
        ],
        fields: [
          { name: 'record header', value: 'not deleted; next +30', note: 'delete flag, heap_no, next', segment: 'header', offset: 0, length: 5 },
          { name: 'id', value: '20', note: 'big-endian, sign bit flipped', segment: 'pk', offset: 5, length: 4 },
          { name: 'DB_TRX_ID', value: '3857', note: '마지막으로 수정한 trx', segment: 'hidden', offset: 9, length: 6, example: true },
          { name: 'DB_ROLL_PTR', value: 'insert undo, rseg 5, page 291, offset 272', note: '이전 버전이 있는 undo의 위치', segment: 'hidden', offset: 15, length: 7, example: true },
          { name: 'k', value: '200', note: 'big-endian, sign bit flipped', segment: 'columns', offset: 22, length: 4 },
          { name: 'v', value: '2', note: 'big-endian, sign bit flipped', segment: 'columns', offset: 26, length: 4 },
        ],
      },
      sources: [s.clustSysCols, s.sysColLens, s.recHeader, s.intOrder, s.rollPtr],
    },
    {
      id: 'return-row',
      layer: 'sql',
      path: 'critical',
      kind: 'move',
      from: 'index',
      to: 'client',
      token: { kind: 'response', label: '1 row: v=2' },
      title: '결과 반환',
      summary: '`v = 2`',
      detail: '비-covering 조회 하나 = B+Tree 하강 두 번이다.',
      facts: [
        { key: 'descents', value: '2 (secondary + clustered)' },
        { key: 'covering index면', value: '1 (다음 단계)' },
      ],
      lines: ['1 row: v=2'],
      sources: [s.clustLookup, s.clustLookupCall, s.needClustered],
    },
    {
      id: 'covering',
      layer: 'sql',
      path: 'side',
      kind: 'mutate',
      node: 'sql',
      after: {
        ...PLAN,
        rows: [
          ['index', 'idx_k'],
          ['need_to_access_clustered', 'false'],
          ['Extra', 'Using index'],
        ],
      },
      title: 'covering index',
      summary: '`SELECT id FROM t WHERE k = 200`은 secondary leaf에서 끝난다.',
      detail:
        '필요한 컬럼(`k`, `id`)이 모두 `idx_k`에 있으면 clustered index를 건너뛴다. EXPLAIN Extra에 `Using index`가 뜬다. MVCC 때문에 생기는 예외는 lesson 9.6에서 본다.',
      facts: [
        { key: 'flag', value: '`need_to_access_clustered = false`' },
        { key: 'EXPLAIN Extra', value: '`Using index`' },
      ],
      lines: ['plan idx_k, covering'],
      sources: [s.needClustered, s.needClusteredRead, s.explainExtra],
    },
    {
      id: 'no-pk',
      layer: 'btree',
      path: 'side',
      kind: 'mutate',
      node: 'index',
      state: 'key',
      after: { ...PLAN, rows: [['clustered key', 'DB_ROW_ID (PK 없음)']] },
      title: 'PK가 없는 테이블',
      summary: 'InnoDB가 6-byte `DB_ROW_ID` 기준의 숨은 `GEN_CLUST_INDEX`를 만든다.',
      detail:
        '`UNIQUE NOT NULL` key가 있으면 그것이 clustered key가 된다. 없으면 모든 테이블이 함께 쓰는 전역 row id counter에서 mutex를 잡고 id를 받는다. 설계 리뷰에서 "PK 없는 테이블"이 지적받는 이유다.',
      facts: [
        { key: 'implicit index', value: '`GEN_CLUST_INDEX` on `DB_ROW_ID` (6 B)' },
        { key: 'row id source', value: 'global `dict_sys->row_id`, under `dict_sys` mutex' },
      ],
      lines: ['create GEN_CLUST_INDEX', '6 B row id'],
      sources: [s.genClust, s.uniqueNotNull, s.rowIdCounter],
    },
  ],
  overview: [
    {
      title: 'Page 안의 검색',
      body: 'page는 page directory를 binary search하고, 이어서 짧은 linear walk를 합니다.',
      sources: [s.pageSearch],
    },
  ],
  selfCheck: [
    {
      question: 'clustered leaf와 secondary leaf는 각각 무엇을 담나요?',
      answer:
        'Clustered leaf는 row 전체와 `DB_TRX_ID`, `DB_ROLL_PTR`을 담습니다. Secondary leaf는 key 컬럼과 PK를 담습니다.',
    },
    {
      question: '`SELECT v … WHERE k=200`은 왜 하강이 두 번인가요?',
      answer: '`v`가 `idx_k`에 없습니다. secondary record의 PK로 clustered index를 다시 찾습니다.',
    },
    {
      question: '`Using index`는 무슨 뜻인가요?',
      answer: '쿼리에 필요한 컬럼이 모두 secondary index에 있어서 clustered lookup을 건너뛴다는 뜻입니다.',
    },
    {
      question: 'PK도 `UNIQUE NOT NULL` key도 없는 테이블의 clustered key는 무엇인가요?',
      answer: '모든 테이블이 함께 쓰는 counter에서 받는, 숨은 6-byte `DB_ROW_ID`입니다.',
    },
  ],
};
