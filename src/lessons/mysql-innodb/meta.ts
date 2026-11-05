import type { TopicMeta } from '../types';

export const meta: TopicMeta = {
  topic: 'mysql-innodb',
  title: 'MySQL InnoDB',
  group: 'MySQL',
  summary: 'B+Tree 조회, buffer pool, redo/binlog commit, MVCC와 lock을 MySQL 8.4 소스 코드 수준에서 따라갑니다.',
  order: 2,
  // Tag mysql-8.4.13 in github.com/mysql/mysql-server; its MYSQL_VERSION says MATURITY="LTS".
  versions: {
    MySQL: '8.4.13',
  },
  checkedOn: '2026-11-04',
  lessons: ['index-lookup'],
  // One map for every InnoDB lesson, laid out in ground-grid cells (decision 0016). gy is the band
  // (SQL layer → memory → background threads → disk); gx runs caller → callee within a band, so a
  // critical path reads along gx, then down gy. Nodes not yet used are for later lessons
  // (docs/research/mysql-innodb.md, Topic layout). Each index is its own node, so the PK hop from
  // a secondary index to the clustered index is a visible move (decision 0019).
  layout: {
    nodes: [
      { id: 'client', label: 'Client A', sublabel: 'mysql session', kind: 'client', icon: 'laptop', gx: 0, gy: 0 },
      { id: 'client2', label: 'Client B', sublabel: 'second session', kind: 'client', icon: 'laptop', gx: 0, gy: 1 },
      { id: 'sql', label: 'SQL layer', sublabel: 'optimizer · EXPLAIN', kind: 'framework', icon: 'hub', gx: 1, gy: 0 },
      { id: 'trx', label: 'Transaction', sublabel: 'trx_t · ReadView', kind: 'framework', icon: 'snapshot', gx: 4, gy: 0 },
      { id: 'locks', label: 'Lock system', sublabel: 'lock_sys', kind: 'framework', icon: 'lock', gx: 5, gy: 0 },
      { id: 'bgc', label: 'Binlog group commit', sublabel: 'flush · sync · commit', kind: 'framework', icon: 'queue', gx: 6, gy: 0 },
      { id: 'idx_k', label: 'idx_k', sublabel: 'secondary · (k, id)', kind: 'storage', icon: 'btree', gx: 1, gy: 1 },
      { id: 'primary', label: 'PRIMARY', sublabel: 'clustered · full row', kind: 'storage', icon: 'btree', gx: 2, gy: 1 },
      { id: 'bpool', label: 'Buffer pool', sublabel: 'LRU · flush list', kind: 'framework', icon: 'buffer-pool', gx: 3, gy: 1 },
      { id: 'undo', label: 'Undo log', sublabel: 'version chain', kind: 'storage', icon: 'log-file', gx: 4, gy: 1 },
      { id: 'logbuf', label: 'Log buffer', sublabel: 'LSN', kind: 'framework', icon: 'queue', gx: 5, gy: 1 },
      { id: 'cleaner', label: 'Page cleaner', sublabel: 'flush dirty pages', kind: 'container', icon: 'thread', gx: 3, gy: 2 },
      { id: 'purge', label: 'Purge thread', sublabel: 'old versions', kind: 'container', icon: 'thread', gx: 4, gy: 2 },
      { id: 'logthreads', label: 'Log threads', sublabel: 'writer · flusher · checkpointer', kind: 'container', icon: 'thread', gx: 5, gy: 2 },
      { id: 'ibd', label: 'Tablespace', sublabel: 't.ibd', kind: 'storage', icon: 'disk', gx: 1, gy: 3 },
      { id: 'dblwr', label: 'Doublewrite', sublabel: '#ib_16384_0.dblwr', kind: 'storage', icon: 'file', gx: 3, gy: 3 },
      { id: 'redo', label: 'Redo log', sublabel: '#innodb_redo', kind: 'storage', icon: 'log-file', gx: 5, gy: 3 },
      { id: 'binlog', label: 'Binary log', sublabel: 'binlog.000001', kind: 'storage', icon: 'log-file', gx: 6, gy: 3 },
    ],
  },
};
