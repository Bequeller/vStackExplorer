---
last-verified: 2026-11-04
sources: [https://github.com/mysql/mysql-server/tree/mysql-8.4.13]
---

# MySQL InnoDB lesson plan (research)

This is the content plan for the MySQL InnoDB topic. It becomes lesson data after the engine prep lands.

It follows these rules:

- `docs/PRODUCT.md`: North star, the content rule "must-know only", and Scope.
- `docs/DESIGN.md`: Principles.
- Decisions 0010 and 0011.

Each lesson covers one mechanism in 8–12 steps and ends with a replay of its critical path.

## Conventions

- **Steps.** A step is either `move` (something travels; never changes state) or `mutate` (state changes inside one node that has a state panel; the step gives that panel's whole `after` view).
- **Step content.** Each step has:
  - a title and a one-line subtitle;
  - at most 3 lines of Korean prose;
  - 1–3 facts;
  - one event-log row (`source → destination · layer · info · size`);
  - source IDs from the [Source index](#source-index).
- **Decoder records.** Each names the step that shows it, and is marked `wire: true` (real on-disk or on-wire bytes) or `wire: false` (in-memory struct or query output).
- **E.G.** marks a per-run value (trx id, LSN, page number).
- **Must-know filter.** Every node, step, fact and decoder field passed the test "Would the owner be blamed in an incident or design review for not knowing this?". Whatever failed the test is listed in [Cut by must-know rule](#cut-by-must-know-rule).

## Version pin and sourcing

- **Pinned: MySQL 8.4.13 (LTS).** This is tag `mysql-8.4.13` in `github.com/mysql/mysql-server`; its `MYSQL_VERSION` says `MATURITY="LTS"` [G1]. MySQL 9.7.4 is also tagged LTS. I chose 8.4 because interview material cites the `refman/8.4` manual.
- **Source code only.** The network policy blocks `dev.mysql.com`; a retry on 2026-11-04 was refused again by the proxy. Every fact therefore cites MySQL source at tag `mysql-8.4.13` with line anchors (decision 0004). Manual links can be added once `dev.mysql.com` is allowed in the environment's network settings.

**Running example tables.** All columns are fixed-length, so the decoder bytes stay exact.

```sql
CREATE TABLE t (id INT NOT NULL PRIMARY KEY, k INT NOT NULL, v INT NOT NULL,
                KEY idx_k (k)) ENGINE=InnoDB;          -- ROW_FORMAT default DYNAMIC
INSERT INTO t VALUES (10,100,1), (20,200,2), (30,300,3);

CREATE TABLE t2 (id INT NOT NULL PRIMARY KEY, a INT NOT NULL, b INT NOT NULL,
                 c INT NULL, d INT NULL, KEY idx_abc (a, b, c)) ENGINE=InnoDB;  -- lesson 2 only
```

## Topic layout

The scene is 1000 × 640. All 12 lessons share one map; each lesson reveals only the nodes it uses.

The four bands run top to bottom: SQL layer → InnoDB memory → background threads → disk. Within a band, callers are on the left and callees on the right. So critical paths read left→right, then down.

| band (y) | node id | x | label / sublabel | kind | isometric illustration | state panel |
|---|---|---|---|---|---|---|
| SQL (70) | `client` | 80 | Client A / mysql session | client | Laptop with `mysql>` prompt | — |
| SQL (190) | `client2` | 80 | Client B / second session | client | Second laptop, other badge color | — |
| SQL (70) | `sql` | 250 | SQL layer / optimizer · EXPLAIN | framework | Gear stack beside a plan card | plan (table) |
| SQL (70) | `trx` | 590 | Transaction / `trx_t` · ReadView | framework | Folder with a trx-id tab and a camera | trx state + read view (table) |
| SQL (70) | `locks` | 760 | Lock system / `lock_sys` | framework | Cabinet of padlocks on hooks | lock table (table) |
| SQL (70) | `bgc` | 930 | Binlog group commit / flush · sync · commit | framework | Three-lane conveyor with a leader flag | stage queues (list) |
| Memory (300) | `idx_k` | 250 | idx_k / secondary · (k, id) | storage | Small tree of page slabs (root → leaves) | B+Tree (tree) |
| Memory (300) | `primary` | 335 | PRIMARY / clustered · full row | storage | Small tree of page slabs (root → leaves) | B+Tree (tree) + clustered key (table) |
| Memory (300) | `bpool` | 420 | Buffer pool / LRU · flush list | framework | Rack of page frames on a two-color belt | LRU + flush list (list) |
| Memory (300) | `undo` | 590 | Undo log / version chain | storage | Stack of old row cards linked by a chain | versions (list) |
| Memory (300) | `logbuf` | 760 | Log buffer / LSN | framework | Ring tape with an LSN ruler | LSN markers (table) |
| Threads (430) | `cleaner` | 420 | Page cleaner | container | Worker pushing a cart of pages | — |
| Threads (430) | `purge` | 590 | Purge thread | container | Robot with a broom | — |
| Threads (430) | `logthreads` | 760 | Log writer · flusher · checkpointer | container | Worker with a pen and an "fsync" stamp | — |
| Disk (570) | `ibd` | 250 | Tablespace / `t.ibd` | storage | Disk cylinder with a page grid | on-disk page (table) |
| Disk (570) | `dblwr` | 420 | Doublewrite / `#ib_16384_0.dblwr` | storage | Small file with two page slots | slots (list) |
| Disk (570) | `redo` | 760 | Redo log / `#innodb_redo` | storage | Thin file slabs in a ring | checkpoint (table) |
| Disk (570) | `binlog` | 930 | Binary log / `binlog.000001` | storage | Ledger-style file with event rows | events (list) |

**Layer selector values:** `SQL` · `B+Tree` · `Buffer Pool` · `Undo` · `Redo` · `Lock` · `Binlog` · `Disk`.

## Lesson overview

| # | id | Critical path (one line) | Steps |
|---|---|---|---|
| 1 | `index-lookup` | client → sql → secondary leaf → (PK) → clustered leaf → client | 9 |
| 2 | `composite-index` | WHERE → leftmost usable prefix → one contiguous B+Tree range → EXPLAIN `key_len` | 9 |
| 3 | `page-split-merge` | INSERT → full leaf → split + parent pointer; DELETE → purge → merge | 9 |
| 4 | `buffer-pool-lru` | page request → miss → evict tail → disk read → old midpoint → young | 8 |
| 5 | `redo-commit` | UPDATE → undo + page change → log buffer (LSN) → COMMIT → redo fsync → OK | 9 |
| 6 | `binlog-2pc` | COMMIT → InnoDB prepare → redo flush (group) → binlog write → binlog fsync → InnoDB commit | 10 |
| 7 | `flush-doublewrite` | flush list → WAL check → doublewrite write → `.ibd` write → clean | 8 |
| 8 | `checkpoint-recovery` | oldest dirty page → checkpoint LSN → crash → doublewrite repair → redo replay → undo rollback | 9 |
| 9 | `mvcc-read-view` | UPDATE writes undo → reader's ReadView rejects new version → follows roll ptr → old version | 9 |
| 10 | `isolation-phantom` | same SELECT twice around a concurrent INSERT → result by level and by read kind | 9 |
| 11 | `row-locks` | locking read → which index records/gaps get locked → conflicting writer waits | 8 |
| 12 | `deadlock` | two gap locks → two insert-intention waits → cycle → victim → 1213 | 8 |

The lessons follow the order in `docs/PRODUCT.md` (Scope).

---

## Lesson 1 — `index-lookup`

**Goal:** Follow a secondary-index lookup into the clustered index, and see when a covering index skips the second lookup.
**Critical path:** `client → sql → idx_k (leaf) → primary (leaf) → client`
**Interview questions:**
- What do a clustered leaf and a secondary leaf each hold?
- Why can a secondary lookup cost two descents?
- What is a covering index?
- What happens to a table with no primary key?

**Nodes:** `client`, `sql`, `idx_k`, `primary`. **Layers:** SQL, B+Tree.
**Overview line (not a step):** a page is searched by binary search over its page directory, then a short linear walk.

##### 1.1 `move` — 쿼리 도착
*부제:* `SELECT v FROM t WHERE k = 200`
> InnoDB 테이블은 PK로 정렬된 B+Tree(clustered index)이고, secondary index도 각각 B+Tree다. page 하나는 16KB다.

| fact | value |
|---|---|
| `innodb_page_size` default | 16384 |

**Event** · `client → sql` · SQL · `SELECT v FROM t WHERE k=200` · —
**Sources** · [G2] [G3]

##### 1.2 `mutate` — plan: `idx_k` + clustered 접근 필요
*부제:* `v`가 `idx_k`에 없으므로 PK로 한 번 더 찾아야 한다.
> optimizer가 `idx_k`를 골랐다고 하자. 필요한 컬럼이 secondary index에 없으면 `need_to_access_clustered = true`가 된다.

| fact | value |
|---|---|
| `idx_k` leaf columns | `k` + PK `id` |

**Event** · `sql → sql` · SQL · `plan idx_k, need clustered` · —
**State (sql)** · before: `{}` → after: `{index: idx_k, need_to_access_clustered: true}`
**Sources** · [I16] [I10]

##### 1.3 `move` — secondary B+Tree 하강
*부제:* root → leaf로 `k = 200`을 찾는다.
> 비-leaf page의 node pointer는 "자식의 최소 key + 자식 page 번호"다. root에서 leaf까지 page 하나씩 내려간다.

| fact | value |
|---|---|
| leaf level | `PAGE_LEVEL = 0`; tree height = root level + 1 |

**Event** · `sql → index` · B+Tree · `descend idx_k (k=200)` · 16384 B / page
**Sources** · [I14] [I3]

##### 1.4 `mutate` — secondary leaf 일치: `(k=200, id=20)`
*부제:* secondary leaf에는 key와 PK만 있다.
> secondary record가 주는 것은 PK뿐이다. `v`를 읽으려면 그 PK로 clustered index를 다시 찾아야 한다.

| fact | value |
|---|---|
| secondary leaf record | `k`, `id` (no `DB_TRX_ID` / `DB_ROLL_PTR`) |

**Event** · `index → index` · B+Tree · `match (200, 20)` · 13 B record
**State (index)** · before: `idx_k leaf [(100,10) (200,20) (300,30)], cursor –` → after: `… cursor on (200,20)`
**Decoder** · D1.2
**Sources** · [I10] [I9]

##### 1.5 `move` — PK로 clustered B+Tree 하강
*부제:* `id = 20`으로 PRIMARY를 root부터 다시 탄다.
> 이것이 두 번째 하강이다. 범위 검색이면 일치하는 secondary record마다 반복된다. 넓은 범위의 비-covering 쿼리가 느린 이유다.

| fact | value |
|---|---|
| function | `row_sel_get_clust_rec_for_mysql()` |

**Event** · `index → index` · B+Tree · `clustered lookup id=20` · 16384 B / page
**Sources** · [I17]

##### 1.6 `mutate` — clustered leaf: 전체 row
*부제:* clustered leaf record = PK + `DB_TRX_ID` + `DB_ROLL_PTR` + 나머지 컬럼.
> 숨은 두 컬럼은 MVCC의 핵심이다(lesson 9). `DB_TRX_ID`는 마지막으로 수정한 trx, `DB_ROLL_PTR`은 이전 버전이 있는 undo의 위치다.

| fact | value |
|---|---|
| hidden columns | `DB_TRX_ID` 6 B, `DB_ROLL_PTR` 7 B |

**Event** · `index → index` · B+Tree · `row (20,200,2)` · 30 B record
**State (index)** · before: `PRIMARY leaf [10, 20, 30], cursor –` → after: `… cursor on 20 → v=2`
**Decoder** · D1.1
**Sources** · [I9] [I8]

##### 1.7 `move` — 결과 반환
*부제:* `v = 2`
> 비-covering 조회 하나 = B+Tree 하강 두 번이다.

| fact | value |
|---|---|
| descents | 2 |

**Event** · `index → client` · SQL · `1 row: v=2` · —
**Sources** · [I17]

##### 1.8 `mutate` — covering index
*부제:* `SELECT id FROM t WHERE k = 200`은 secondary leaf에서 끝난다.
> 필요한 컬럼(`k`, `id`)이 모두 `idx_k`에 있으면 clustered index를 건너뛴다. EXPLAIN Extra에 `Using index`가 뜬다. MVCC 때문에 생기는 예외는 lesson 9.6에서 본다.

| fact | value |
|---|---|
| flag | `need_to_access_clustered = false` |
| EXPLAIN Extra | `Using index` |

**Event** · `sql → sql` · SQL · `plan idx_k, covering` · —
**State (sql)** · before: `{index: idx_k, need_to_access_clustered: true}` → after: `{index: idx_k, need_to_access_clustered: false, Extra: "Using index"}`
**Sources** · [I16] [C6]

##### 1.9 `mutate` — PK가 없는 테이블
*부제:* InnoDB가 6-byte `DB_ROW_ID` 기준의 숨은 `GEN_CLUST_INDEX`를 만든다.
> `UNIQUE NOT NULL` key가 있으면 그것이 clustered key가 된다. 없으면 모든 테이블이 함께 쓰는 전역 row id counter에서 mutex를 잡고 id를 받는다. 설계 리뷰에서 "PK 없는 테이블"이 지적받는 이유다.

| fact | value |
|---|---|
| implicit index | `GEN_CLUST_INDEX` on `DB_ROW_ID` (6 B) |
| row id source | global `dict_sys->row_id`, under `dict_sys` mutex |

**Event** · `sql → index` · B+Tree · `create GEN_CLUST_INDEX` · 6 B row id
**State (index)** · before: `PRIMARY key = id` → after: `clustered key = DB_ROW_ID` (table without PK)
**Sources** · [I11] [I12] [I13]

**Replay:** `client → sql (plan idx_k) → index: idx_k root → leaf (200,20) → PRIMARY root → leaf (20) → client`.

### Decoders

**D1.1 Clustered leaf record `id=20`** — shown in 1.6 · `wire: true` · layer bar: header · PK · hidden · columns.

| offset from origin | field | bytes | value |
|---|---|---|---|
| −5…−1 | record header (delete flag, heap_no, next) | `00 00 18 00 1E` | not deleted; next +30 |
| 0 | `id` | `80 00 00 14` | 20 (big-endian, sign bit flipped) |
| 4 | `DB_TRX_ID` | `00 00 00 00 0F 11` | E.G. 3857 |
| 10 | `DB_ROLL_PTR` | `85 00 00 01 23 01 10` | E.G. insert undo, rseg 5, page 291, offset 272 |
| 17 | `k` | `80 00 00 C8` | 200 |
| 21 | `v` | `80 00 00 02` | 2 |

Sources: [I6] [I8] [I9] [G7] [M2]

**D1.2 Secondary leaf record `(k=200, id=20)`** — shown in 1.4 · `wire: true`.

| offset | field | bytes | value |
|---|---|---|---|
| −5…−1 | record header | `00 00 18 00 0D` | next E.G. |
| 0 | `k` | `80 00 00 C8` | 200 |
| 4 | `id` | `80 00 00 14` | 20 |

Sources: [I6] [I10] [G7]

### Self-check

1. **Q:** What does each leaf hold? **A:** Clustered: the whole row plus `DB_TRX_ID` and `DB_ROLL_PTR`. Secondary: the key columns plus the PK.
2. **Q:** Why does `SELECT v … WHERE k=200` take two descents? **A:** `v` is not in `idx_k`, so the PK from the secondary record is used to search the clustered index.
3. **Q:** What does `Using index` mean? **A:** Every column the query needs is in the secondary index, so the clustered lookup is skipped.
4. **Q:** A table has no PK and no `UNIQUE NOT NULL` key. What is its clustered key? **A:** A hidden 6-byte `DB_ROW_ID`, taken from a counter shared by all tables.

---

## Lesson 2 — `composite-index`

**Goal:** See why the column order in `idx_abc(a, b, c)` decides which WHERE clauses can seek, and read the result from EXPLAIN.
**Critical path:** `client → sql (leftmost prefix) → index (one contiguous range in idx_abc) → sql (EXPLAIN key / key_len / type / Extra)`
**Interview questions:**
- What is the leftmost-prefix rule?
- Why can `WHERE b = ?` not use `(a, b, c)`?
- What does `key_len` tell you?
- What is "Using index condition"?

**Nodes:** `client`, `sql`, `index`. **Layers:** SQL, B+Tree.
**Overview line:** skip scan (`Using index for skip scan`) can use an index without its first column, but only under narrow conditions; treat it as an exception.

##### 2.1 `mutate` — 복합 index의 정렬 순서
*부제:* `idx_abc`는 `a`로, 같은 `a` 안에서 `b`로, 그 안에서 `c`로 정렬된다.
> InnoDB는 key를 앞 컬럼부터 하나씩 비교하고, 처음 다른 컬럼에서 대소를 정한다. 그래서 `b`는 같은 `a` 값 안에서만 정렬돼 있다.

| fact | value |
|---|---|
| comparison | field by field; the first unequal field decides |

**Event** · `index → index` · B+Tree · `idx_abc leaf order` · —
**State (index)** · before: `(empty)` → after: `idx_abc leaf [(1,1,1) (1,2,3) (1,2,9) (1,5,3) (2,1,3) (2,2,3)]`
**Sources** · [C1]

##### 2.2 `move` — 모든 컬럼 equality
*부제:* `WHERE a = 1 AND b = 2 AND c = 3`
> 세 컬럼이 모두 equality면 `(a, b, c)` 전체로 한 지점을 seek한다.

| fact | value |
|---|---|
| query | `SELECT d FROM t2 WHERE a=1 AND b=2 AND c=3` |

**Event** · `client → sql` · SQL · `WHERE a=1 AND b=2 AND c=3` · —
**Sources** · [C2]

##### 2.3 `mutate` — `ref`는 앞에서부터 연속된 key part만 쓴다
*부제:* `(a, b)` index에서 `b` 조건은 `a` 조건이 있을 때만 쓸 수 있다.
> optimizer는 key part 0부터 순서대로, 조건이 있는 동안만 key part를 쓴다. `key_len`은 쓴 key part 저장 길이의 합이다. INT NOT NULL은 4이고, nullable이면 +1, VARCHAR면 길이 바이트로 +2다.

| fact | value |
|---|---|
| rule (source comment) | "if index is (a,b) we can have a search criterion on 'b' only if we also have a criterion on 'a'" |
| `key_len` here | a 4 + b 4 + c (INT NULL) 5 = **13** |

**Event** · `sql → sql` · SQL · `ref on idx_abc, key_len 13` · —
**State (sql)** · before: `{}` → after: `{type: ref, key: idx_abc, key_len: 13, ref: const,const,const}`
**Decoder** · D2.1
**Sources** · [C2] [C3] [C4] [C5]

##### 2.4 `move` — 연속 구간 하나를 읽는다
*부제:* `(1,2,3)` 위치로 seek한 뒤, 일치가 끝날 때까지 다음 record로 간다.
> leftmost prefix가 같은 record들은 leaf에서 붙어 있다. 그래서 한 번 seek하고 옆으로 읽으면 된다.

| fact | value |
|---|---|
| access | one B+Tree descent + sequential leaf read |

**Event** · `sql → index` · B+Tree · `seek (1,2,3)` · 16384 B / page
**Sources** · [C1] [I14]

##### 2.5 `move` — 첫 컬럼 없는 조건
*부제:* `WHERE b = 2` → `idx_abc`로는 seek할 수 없다.
> `b = 2`인 record는 `a` 값마다 흩어져 있어 연속 구간이 없다. 그래서 `ref`/`range`를 쓸 수 없고, 전체 table scan(`ALL`)이나 전체 index scan(`index`)이 된다.

| fact | value |
|---|---|
| EXPLAIN `type` | `ALL` or `index` (whichever the cost model picks); not `ref` |

**Event** · `client → sql` · SQL · `WHERE b=2 → no seek` · —
**Sources** · [C2] [C5] [C8]

##### 2.6 `mutate` — 중간 컬럼이 빠지면
*부제:* `WHERE a = 1 AND c = 3` → seek에는 `a`만 쓰고, `c`로는 걸러낸다.
> `b`가 없어 key part가 끊기므로 `ref`는 `a`만 쓴다(`key_len 4`). `a = 1` 구간 안에서 `c`는 정렬돼 있지 않다. 그래서 `c` 조건은 범위를 좁히지 못하고 record마다 검사된다.

| fact | value |
|---|---|
| `key_len` | 4 (only `a`) |
| `c` | checked per record (index condition) |

**Event** · `sql → sql` · SQL · `ref key_len 4, c filtered` · —
**State (sql)** · before: `{type: ref, key_len: 13}` → after: `{type: ref, key: idx_abc, key_len: 4, Extra: "Using index condition"}`
**Sources** · [C2] [C1] [C6]

##### 2.7 `mutate` — Index Condition Pushdown (ICP)
*부제:* InnoDB가 secondary record에서 `c = 3`을 먼저 검사하고, 맞지 않으면 clustered lookup을 하지 않는다.
> `row_search_mvcc()`는 clustered record를 가져오기 전에 `row_search_idx_cond_check()`를 부른다. 맞지 않는 record는 건너뛰므로 lesson 1의 두 번째 하강이 그만큼 줄어든다. ICP는 기본 ON이다.

| fact | value |
|---|---|
| order | ICP check → only on `ICP_MATCH` fetch clustered record |
| `optimizer_switch` | `index_condition_pushdown=on` (default) |

**Event** · `index → index` · B+Tree · `ICP: (1,2,9) rejected, (1,5,3) passes` · —
**State (index)** · before: `candidates [(1,1,1) (1,2,3) (1,2,9) (1,5,3)]` → after: `passed [(1,2,3) (1,5,3)]; clustered lookups 2`
**Sources** · [C9] [C8]

##### 2.8 `move` — 범위 조건 뒤의 컬럼
*부제:* `WHERE a = 1 AND b > 1 AND c = 3` → 구간은 `a = 1, b > 1`이고, `c`로는 걸러낸다.
> `a = 1 AND b > 1`인 record는 연속 구간이다. 그 안에서 `c`는 `b` 값마다 다시 시작하므로 범위를 좁히지 못하고, ICP로 걸러진다. 그래서 equality 컬럼을 앞에, 범위 컬럼을 뒤에 둔다.

| fact | value |
|---|---|
| EXPLAIN `type` | `range` |
| `c` | filtered, not used to narrow the scan |

**Event** · `sql → index` · B+Tree · `range a=1,b>1; ICP c=3` · —
**Sources** · [C1] [C5] [C9]

##### 2.9 `mutate` — EXPLAIN 한 줄 읽기
*부제:* `type`, `key`, `key_len`, `ref`, `rows`, `Extra`만 보면 위의 내용을 모두 읽을 수 있다.
> `type`은 접근 방식이다(`const` > `eq_ref` > `ref` > `range` > `index` > `ALL`). `key_len`은 index를 앞에서 몇 컬럼까지 썼는지 보여준다. `Extra`의 `Using index`는 covering, `Using index condition`은 ICP, `Using filesort`는 정렬에 index 순서를 못 쓴 경우다.

| fact | value |
|---|---|
| EXPLAIN columns | `id, select_type, table, partitions, type, possible_keys, key, key_len, ref, rows, filtered, Extra` |

**Event** · `sql → client` · SQL · `EXPLAIN row` · —
**State (sql)** · before: plan for 2.6 → after: rendered EXPLAIN row (D2.1)
**Decoder** · D2.1
**Sources** · [C7] [C5] [C6]

**Replay:** `client → sql (key parts a, b, c from the left) → index (seek (1,2,3), read contiguous leaves) → sql (EXPLAIN ref, key_len 13)`.

### Decoders

**D2.1 EXPLAIN rows for 2.3 and 2.6** — shown in 2.3 and 2.9 · `wire: false` (query output). `rows` and `filtered` are E.G.

| column | 2.3 `a=1 AND b=2 AND c=3` | 2.6 `a=1 AND c=3` |
|---|---|---|
| `type` | `ref` | `ref` |
| `key` | `idx_abc` | `idx_abc` |
| `key_len` | `13` | `4` |
| `ref` | `const,const,const` | `const` |
| `rows` | E.G. 1 | E.G. 4 |
| `Extra` | — (E.G.) | `Using index condition` |

`key_len` per key part = `length` (+1 if nullable) (+2 for VARCHAR/BLOB). INT = 4.
Sources: [C3] [C4] [C5] [C6] [C7]

### Self-check

1. **Q:** Why can `WHERE b = 2` not seek on `(a, b, c)`? **A:** The index is sorted by `a` first, so rows with `b = 2` are spread across every `a` value and form no contiguous range.
2. **Q:** For `WHERE a = 1 AND c = 3`, which columns narrow the scan? **A:** Only `a` (`key_len 4`). `c` is checked per record, through ICP.
3. **Q:** Compute `key_len` for `a INT NOT NULL, b INT NOT NULL, c INT NULL`, all used. **A:** 4 + 4 + (4 + 1) = 13.
4. **Q:** What does `Using index condition` save? **A:** Clustered-index lookups for secondary records that fail the pushed condition.
5. **Q:** Where does a range column go in a composite index? **A:** After the equality columns. Columns after a range column cannot narrow the scan.

---

## Lesson 3 — `page-split-merge`

**Goal:** See a leaf split when it fills, why sequential and random keys fill pages differently, and how deletes end in a merge.
**Critical path:** `client → index (leaf full → split: new page + parent pointer) … DELETE → purge → index (merge into sibling)`
**Interview questions:**
- Why does an increasing PK fill pages better than a random UUID?
- Does `DELETE` free space at once?
- When do pages merge?

**Nodes:** `client`, `index`, `purge`. **Layers:** B+Tree.
**Overview line:** when the root fills, its records move to a new page and the tree grows one level. The root page number never changes.

##### 3.1 `move` — 증가하는 PK로 INSERT
*부제:* 새 record는 늘 leaf 끝, 마지막 insert 바로 뒤에 붙는다.
> page header는 마지막 insert의 위치와 방향을 기억한다. 이 정보로 split 지점을 정한다.

| fact | value |
|---|---|
| tracked | `PAGE_LAST_INSERT`, `PAGE_DIRECTION` (`PAGE_RIGHT`) |

**Event** · `client → index` · B+Tree · `INSERT id=41` · 30 B record
**Sources** · [P15] [P5]

##### 3.2 `mutate` — page가 가득 찼다
*부제:* page 하나만 바꾸는 insert가 실패하면, tree latch를 잡는 split 경로로 간다.
> 공간이 없으면 index tree x-latch를 잡고 `btr_page_split_and_insert()`를 부른다. split이 끝날 때까지 같은 index의 다른 tree 변경은 기다린다.

| fact | value |
|---|---|
| latch | x-latch on the index tree during split |

**Event** · `index → index` · B+Tree · `optimistic insert failed` · —
**State (index)** · before: `leaf N [ … 40 ] free < 30 B` → after: `leaf N full, split pending`
**Sources** · [P1]

##### 3.3 `mutate` — 순차 패턴: 새 record에서 자른다
*부제:* 새 page에는 새 record만 가고, 기존 page는 꽉 찬 채로 남는다.
> 새 insert가 `PAGE_LAST_INSERT` 바로 뒤면 순차 패턴으로 본다. 새 record에서 자르므로 앞 page는 100% 찬 채로 남는다.

| fact | value |
|---|---|
| test | `PAGE_LAST_INSERT == insert_point` → split at the new record |

**Event** · `index → index` · B+Tree · `split_rec = new record` · —
**State (index)** · before: `leaf N full` → after: `leaf N full (kept), leaf N+1 [41]`
**Sources** · [P2] [P1]

##### 3.4 `mutate` — parent에 pointer, 형제 링크
*부제:* parent에 새 page의 node pointer를 넣고, `FIL_PAGE_PREV/NEXT`로 형제를 잇는다.
> 같은 level의 leaf는 양방향 linked list다. range scan은 이 링크를 따라 옆 page로 간다.

| fact | value |
|---|---|
| parent | new node pointer `(41 → N+1)` |
| siblings | `FIL_PAGE_PREV` / `FIL_PAGE_NEXT` |

**Event** · `index → index` · B+Tree · `insert node ptr into parent` · E.G. 13 B
**State (index)** · before: `parent [(10→N)]` → after: `parent [(10→N) (41→N+1)]; N.next = N+1`
**Decoder** · D3.1
**Sources** · [P1] [I1]

##### 3.5 `mutate` — 랜덤 key(UUID PK)라면
*부제:* page 가운데에서 잘라, 두 page가 반씩 찬다.
> insert 위치가 마지막 insert와 무관하면 `page_get_middle_rec()`에서 자른다. 반쯤 빈 page가 늘고, split이 잦아지고, buffer pool에 page가 더 필요하다. 랜덤 PK가 쓰기 성능과 공간에 불리한 이유다.

| fact | value |
|---|---|
| random split point | middle record |

**Event** · `client → index` · B+Tree · `INSERT random key → split at middle` · —
**State (index)** · before: `leaf M full` → after: `leaf M ~½, leaf M' ~½`
**Sources** · [P1]

##### 3.6 `mutate` — DELETE는 표시만 한다
*부제:* record에 delete flag를 켜고 undo를 남긴다. 공간은 아직 그대로다.
> 다른 transaction의 read view가 이전 버전을 볼 수 있으므로 바로 지우지 않는다. 물리적 삭제는 purge가 한다.

| fact | value |
|---|---|
| mark | `REC_INFO_DELETED_FLAG` (0x20) in the record header |

**Event** · `client → index` · B+Tree · `DELETE id=20 (delete-mark)` · —
**State (index)** · before: `leaf [10, 20, 30]` → after: `leaf [10, 20†, 30]` (`†` delete-marked)
**Sources** · [P16] [I6]

##### 3.7 `move` — purge가 물리적으로 지운다
*부제:* 어떤 view도 그 record를 필요로 하지 않으면 purge thread가 page에서 뺀다.
> purge는 먼저 leaf만 바꾸는 삭제를 시도하고, 안 되면 tree 연산으로 지운다. tree 삭제가 끝나면 merge가 필요한지 검사한다.

| fact | value |
|---|---|
| merge check | after a pessimistic delete: `btr_cur_compress_if_useful()` |

**Event** · `purge → index` · B+Tree · `remove 20†` · 30 B freed
**Sources** · [P17] [P9]

##### 3.8 `mutate` — 50% 아래로 떨어지면 형제와 합친다
*부제:* data가 page의 `MERGE_THRESHOLD`%(기본 50) 아래로 떨어지면 merge한다.
> 왼쪽 형제부터 시도하고, 안 되면 오른쪽 형제를 시도한다. 형제 page에 record가 다 들어갈 때만 합친다. 합치면 parent의 pointer를 지우고 빈 page를 해제한다. 16KB page면 기준은 8192 bytes 미만이다.

| fact | value |
|---|---|
| threshold | `MERGE_THRESHOLD` default 50 → 16384 × 50 / 100 = 8192 B |
| order | left sibling, then right |

**Event** · `index → index` · B+Tree · `merge N+1 into N` · 16384 B page freed
**State (index)** · before: `parent [(10→N) (41→N+1)], N+1 data < 8192 B` → after: `parent [(10→N)], N+1 freed`
**Sources** · [P6] [P7] [P8] [P10] [P11]

##### 3.9 `mutate` — 비교: 순차 vs 랜덤 결과
*부제:* row 수가 같아도 page 수와 채움률이 다르다.
> 순차 PK는 앞 page를 꽉 채우고 넘어간다. 랜덤 PK는 page를 반씩 비워 둔다. 그래서 같은 데이터에 page가 더 많고, 디스크와 buffer pool도 더 쓴다.

| fact | value |
|---|---|
| sequential | old page stays full |
| random | both halves ~½ after each split |

**Event** · `index → index` · B+Tree · `compare fill` · —
**State (index)** · before: `two trees, unlabeled` → after: `sequential: full pages; random: ~½ pages` (illustrative counts E.G.)
**Sources** · [P1] [P2]

**Replay:** `client INSERT → index leaf full → split (new page, parent pointer, sibling link)`, then `client DELETE → delete-mark → purge → merge into left sibling`.

### Decoders

**D3.1 Leaf page header fields around a split** — shown in 3.4 · `wire: true`. Offsets are from page start.

| offset | field | leaf N before | leaf N after | leaf N+1 |
|---|---|---|---|---|
| 8 | `FIL_PAGE_PREV` | E.G. | E.G. | `N` (E.G. `00 00 00 04`) |
| 12 | `FIL_PAGE_NEXT` | `FF FF FF FF` (none) | `N+1` (E.G. `00 00 00 05`) | `FF FF FF FF` |
| 54 | `PAGE_N_RECS` | E.G. 496 | E.G. 496 | 1 |
| 64 | `PAGE_LEVEL` | 0 | 0 | 0 |

Sources: [I1] [I3] [I22]

### Self-check

1. **Q:** Why does an increasing PK leave the old page full after a split? **A:** The insert lands right after `PAGE_LAST_INSERT`, so InnoDB splits at the new record. Only the new record moves.
2. **Q:** Why are random-PK tables bigger? **A:** Splits cut pages at the middle, which leaves about half of each page empty.
3. **Q:** Does `DELETE` shrink a page? **A:** No. It only sets the delete flag. Purge removes the record later, and only then can a merge happen.
4. **Q:** When does a 16KB page merge by default? **A:** When its data drops below 8192 bytes (`MERGE_THRESHOLD` 50%) and a sibling can take its records.

---

## Lesson 4 — `buffer-pool-lru`

**Goal:** Follow a page into the buffer pool, and see how the old/young LRU keeps one big scan from evicting hot pages.
**Critical path:** `index → bpool (miss) → bpool (free block: evict tail) → ibd (read 16KB) → bpool (insert at old midpoint) → bpool (young on re-access ≥ 1 s)`
**Interview questions:**
- How does InnoDB's LRU resist full scans?
- What happens when there is no free page?
- What do the hit rate and the "not young" counter mean?

**Nodes:** `index`, `bpool`, `cleaner`, `ibd`. **Layers:** Buffer Pool, Disk.
**Overview line:** linear read-ahead prefetches the next extent (64 pages) after about 56 sequential page reads within one extent.

##### 4.1 `move` — page 요청
*부제:* B+Tree가 `(space, page_no)`로 buffer pool에 page를 요청한다.
> 모든 page 읽기는 buffer pool을 거친다. 기본 크기 128MiB는 운영 서버에 너무 작으므로, 보통 메모리의 대부분을 준다.

| fact | value |
|---|---|
| `innodb_buffer_pool_size` default | 134217728 (128 MiB) |

**Event** · `index → bpool` · Buffer Pool · `buf_page_get_gen(5, 4)` (E.G. ids) · —
**Sources** · [B16] [B1]

##### 4.2 `mutate` — miss: free block이 필요하다
*부제:* free list가 비면 LRU 끝에서 clean page를 비운다. clean page가 없으면 dirty page 하나를 flush한다.
> 이 순서는 `buf_LRU_get_free_block()` 주석에 있다. dirty page를 직접 flush하면 쿼리 thread가 디스크 쓰기를 기다린다. free page가 모자랄 때 쿼리가 느려지는 이유다.

| fact | value |
|---|---|
| order | free list → scan LRU tail for a clean page (`innodb_lru_scan_depth` 1024) → flush one dirty page |

**Event** · `bpool → bpool` · Buffer Pool · `get free block` · 16384 B frame
**State (bpool)** · before: `free [] · LRU [… o7 o8(clean)]` → after: `free [o8-frame] · LRU [… o7]`
**Sources** · [B17] [B13]

##### 4.3 `move` — 디스크에서 읽기
*부제:* `.ibd`에서 16KB page 하나를 읽는다.
> 디스크 read는 이 lesson에서 가장 느린 hop이다. hit rate가 떨어지면 이 hop이 늘어난다.

| fact | value |
|---|---|
| size | 16384 B |

**Event** · `ibd → bpool` · Disk · `read page (5, 4)` (E.G.) · 16384 B
**Sources** · [B7]

##### 4.4 `mutate` — midpoint에 삽입 (old sublist 맨 앞)
*부제:* 새로 읽은 page는 LRU 맨 앞이 아니라 old 구간 맨 앞에 들어간다.
> LRU의 뒤쪽 약 37%(3/8)가 old 구간이다. 한 번만 읽히는 page는 old 구간에서 빠져나가므로, 자주 쓰는 young page를 밀어내지 않는다.

| fact | value |
|---|---|
| `innodb_old_blocks_pct` default | 37 |
| insert point | right after `LRU_old`, flag `old = true` |

**Event** · `bpool → bpool` · Buffer Pool · `insert P at midpoint` · —
**State (bpool)** · before: `young [y1 y2 …] | old [o1 … o7]` → after: `young [y1 y2 …] | old [P o1 … o7]`
**Decoder** · D4.1
**Sources** · [B6] [B9]

##### 4.5 `mutate` — 1초 안에 다시 읽혀도 old에 남는다
*부제:* full scan이 같은 page를 여러 번 읽어도 young으로 올리지 않는다.
> old page를 처음 접근한 뒤 `innodb_old_blocks_time` 안에 다시 접근하면 young으로 옮기지 않고, "not young" counter만 올린다. 이것이 scan 저항이다.

| fact | value |
|---|---|
| `innodb_old_blocks_time` default | 1000 ms |
| counter | `Pages made young …, not young …` |

**Event** · `index → bpool` · Buffer Pool · `re-access P (Δt < 1000 ms)` · —
**State (bpool)** · before: `old [P o1 …]` → after: `old [P o1 …]`, `not_young +1`
**Sources** · [B8] [B9] [O2]

##### 4.6 `mutate` — 1초 뒤 재접근: young으로
*부제:* page가 LRU 맨 앞으로 간다.
> 첫 접근 뒤 1초 이상 지나 다시 쓰이면 정말 hot한 page로 본다. 이미 young 구간 앞쪽 1/4 안에 있는 page는 mutex 비용을 아끼려고 다시 옮기지 않는다. 아직 evict가 한 번도 없었으면 어떤 page도 옮기지 않는다.

| fact | value |
|---|---|
| move | `buf_page_make_young()` → head of young, `old = false` |
| no-move zone | first ~¼ of the young sublist |

**Event** · `index → bpool` · Buffer Pool · `make young P` · —
**State (bpool)** · before: `young [y1 y2 …] | old [P o1 …]` → after: `young [P y1 y2 …] | old [o1 …]`
**Sources** · [B8] [B10]

##### 4.7 `mutate` — dirty page는 flush list에도 걸린다
*부제:* 수정된 page는 LRU에 남은 채로 flush list에도 걸린다(`oldest_modification` 순).
> LRU는 무엇을 쫓아낼지, flush list는 무엇을 먼저 디스크에 쓸지 정한다. dirty page는 디스크에 쓰기 전까지 쫓아낼 수 없다(lesson 7).

| fact | value |
|---|---|
| fields | `oldest_modification`, `newest_modification` (LSNs) |

**Event** · `bpool → bpool` · Buffer Pool · `P modified → flush list` · —
**State (bpool)** · before: `flush [d1 d2]` → after: `flush [P d1 d2]` (LSNs E.G.)
**Sources** · [B19] [B12]

##### 4.8 `mutate` — 운영 지표 읽기
*부제:* `SHOW ENGINE INNODB STATUS`의 BUFFER POOL 구간을 본다.
> hit rate가 1000/1000보다 떨어지면 디스크 read(4.3)가 늘었다는 뜻이다. `not young`이 크게 늘면 scan이 old 구간을 지나가고 있다는 뜻이다.

| fact | value |
|---|---|
| lines | `Buffer pool hit rate N / 1000`, `Pages made young N, not young N`, `Modified db pages N` |

**Event** · `bpool → client` · Buffer Pool · `SHOW ENGINE INNODB STATUS` · —
**State (bpool)** · before: `counters hidden` → after: `status lines shown (D4.2)`
**Decoder** · D4.2
**Sources** · [O2]

**Replay:** `index → bpool miss → evict clean tail → ibd read 16KB → insert at old midpoint → (≥ 1 s) make young`.

### Decoders

**D4.1 `buf_page_t` of page P** — shown in 4.4 · `wire: false` (in-memory control block).

| field | value | meaning |
|---|---|---|
| `id` | E.G. `(5, 4)` | space, page_no |
| `old` | `true` | in the old sublist |
| `access_time` | E.G. `t0` | first access; compared with `innodb_old_blocks_time` |
| `oldest_modification` | `0` | clean (non-zero once dirty) |

Sources: [B12]

**D4.2 `SHOW ENGINE INNODB STATUS` — BUFFER POOL lines** — shown in 4.8 · `wire: false`. Numbers are E.G.

```
Buffer pool size   8192
Free buffers       1024
Database pages     7100
Old database pages 2600
Modified db pages  35
Pages made young 120, not young 9800
Buffer pool hit rate 998 / 1000, young-making rate 2 / 1000 not 41 / 1000
```

Sources: [O2]

### Self-check

1. **Q:** Where does a freshly read page enter the LRU? **A:** At the head of the old sublist (roughly the last 37%), not at the LRU head.
2. **Q:** A scan reads a page three times within 10 ms. Is it made young? **A:** No. A re-access within `innodb_old_blocks_time` (1000 ms) only counts as "not young".
3. **Q:** There is no free page and the LRU tail is dirty. What happens? **A:** InnoDB looks for a clean page at the tail. If there is none, the query thread flushes one dirty page first and waits for that disk write.
4. **Q:** Which status line shows that reads are going to disk? **A:** `Buffer pool hit rate N / 1000`, when it falls below 1000.

---

## Lesson 5 — `redo-commit`

**Goal:** Follow one UPDATE and its COMMIT until redo is on disk, and see why the data page does not need to be written yet.
**Critical path:** `client → trx → index/undo (change + undo, inside an mtr) → logbuf (LSN) → bpool (dirty page) → COMMIT → logthreads (write + fsync) → redo → client OK`
**Interview questions:**
- What is WAL?
- What do the values 0, 1 and 2 of `innodb_flush_log_at_trx_commit` change?
- What is an LSN?

**Nodes:** `client`, `trx`, `index`, `undo`, `bpool`, `logbuf`, `logthreads`, `redo`. **Layers:** Undo, Buffer Pool, Redo, Disk.
**Overview line:** a mini-transaction (mtr) is the atomic unit of redo; recovery applies all of an mtr's records or none.

##### 5.1 `move` — UPDATE 도착
*부제:* `UPDATE t SET v = 5 WHERE id = 10`
> row lock을 잡은 뒤(lesson 11) page를 고친다. page 변경은 모두 mini-transaction 안에서 일어나고, mtr이 redo record를 모은다.

| fact | value |
|---|---|
| `innodb_flush_log_at_trx_commit` default | 1 |

**Event** · `client → trx` · SQL · `UPDATE t SET v=5 WHERE id=10` · —
**Sources** · [R10]

##### 5.2 `mutate` — undo를 먼저 쓴다
*부제:* 옛 값을 undo log에 복사한다. 이것도 page 변경이므로 redo가 남는다.
> `btr_cur_update_in_place()`는 undo record를 먼저 쓰고 그다음 row를 바꾼다. rollback과 MVCC가 이 undo를 쓴다.

| fact | value |
|---|---|
| order | undo record first, then `DB_TRX_ID` / `DB_ROLL_PTR` / column |

**Event** · `trx → undo` · Undo · `undo: old v=1` · E.G. 35 B
**State (undo)** · before: `[]` → after: `[upd undo id=10: v=1]`
**Sources** · [M20]

##### 5.3 `mutate` — page를 고친다
*부제:* buffer pool 안의 leaf page에서 `v`가 5가 된다. 디스크의 page는 아직 옛 값이다.
> InnoDB는 메모리의 page만 바꾸고, 그 변경을 redo record로 남긴다. data file 쓰기는 나중에 background에서 한다(lesson 7).

| fact | value |
|---|---|
| redo record types | `MLOG_UNDO_INSERT` (20), `MLOG_REC_UPDATE_IN_PLACE` (70) |

**Event** · `trx → index` · B+Tree · `v: 1 → 5 (in memory)` · 4 B field
**State (index)** · before: `id=10 v=1 trx 0x0F11` → after: `id=10 v=5 trx 0x0F20` (trx ids E.G.)
**Decoder** · D5.1
**Sources** · [M20] [R13]

##### 5.4 `move` — mtr commit: log buffer에 복사
*부제:* LSN 구간을 예약하고 redo record를 log buffer에 복사한다.
> LSN은 redo log 안의 byte 위치다. 여러 thread가 동시에 각자 구간을 예약하고 복사한다.

| fact | value |
|---|---|
| `innodb_log_buffer_size` default | 64 MiB |

**Event** · `index → logbuf` · Redo · `reserve + copy [0x013A5E10, 0x013A5E56)` (E.G.) · E.G. 70 B
**Sources** · [R6] [R5]

##### 5.5 `mutate` — page가 dirty가 된다
*부제:* 같은 mtr commit에서 page를 flush list에 걸고 `oldest_modification`을 적는다.
> 이제 page는 dirty다. 그 LSN까지의 redo가 디스크에 닿기 전에는 page를 디스크에 쓸 수 없다(WAL, lesson 7).

| fact | value |
|---|---|
| order | reserve → copy → add dirty pages → close → release latches |

**Event** · `logbuf → bpool` · Buffer Pool · `P dirty, oldest 0x013A5E10` (E.G.) · —
**State (bpool)** · before: `flush []` → after: `flush [P(oldest 0x013A5E10)]` (E.G.)
**Sources** · [R6] [B12]

##### 5.6 `mutate` — COMMIT: commit LSN
*부제:* transaction 상태를 바꾸는 마지막 mtr의 끝 LSN이 commit LSN이다.
> commit 때 update undo는 history list로 가서 purge를 기다린다(lesson 9). COMMIT이 durable하려면 redo가 commit LSN까지 디스크에 있어야 한다.

| fact | value |
|---|---|
| commit lsn | `trx->commit_lsn` |

**Event** · `client → trx` · SQL · `COMMIT` · —
**State (trx)** · before: `ACTIVE` → after: `committed in memory, commit_lsn 0x013A5E80` (E.G.)
**Sources** · [R11] [M14]

##### 5.7 `mutate` — flush 정책 (`innodb_flush_log_at_trx_commit`)
*부제:* 1 = write + fsync, 2 = write만(OS cache까지), 0 = 기다리지 않음.
> 1이면 commit마다 fsync까지 기다린다. 2는 mysqld만 죽으면 안전하지만, OS가 죽거나 전원이 나가면 약 1초치를 잃을 수 있다. 0은 mysqld만 죽어도 잃을 수 있다. 0과 2는 1초 주기 background flush에 맡긴다.

| fact | value |
|---|---|
| value 1 / 2 / 0 | `log_write_up_to(lsn, true)` / `log_write_up_to(lsn, false)` / nothing |
| background flush | `innodb_flush_log_at_timeout` = 1 s |

**Event** · `trx → logbuf` · Redo · `log_write_up_to(commit_lsn, flush=true)` · —
**State (trx)** · before: `not waiting` → after: `waiting: flushed_to_disk_lsn ≥ commit_lsn`
**Sources** · [R9] [R10]

##### 5.8 `move` — log writer는 write, log flusher는 fsync
*부제:* writer가 redo file에 쓰고, flusher가 fsync해서 `flushed_to_disk_lsn`을 올린다.
> write와 fsync는 각각 다른 thread가 하고, 여러 commit이 fsync 한 번에 묶인다. redo는 `#innodb_redo` 아래 파일들에 원형으로 쓰이고, 전체 크기는 `innodb_redo_log_capacity`다.

| fact | value |
|---|---|
| `innodb_redo_log_capacity` default | 100 MiB, split into 32 files |
| invariant | `flushed_to_disk_lsn ≤ write_lsn` |

**Event** · `logthreads → redo` · Disk · `write + fsync up to commit_lsn` · E.G. 512 B
**Sources** · [R7] [R8] [R1] [R2]

##### 5.9 `move` — COMMIT 반환
*부제:* flush notifier가 기다리던 thread를 깨우고, client가 OK를 받는다.
> 이 순간 data page는 메모리에서만 바뀌어 있고, 디스크에는 redo만 있다. crash가 나면 redo로 다시 만든다(lesson 8). 이것이 WAL이다.

| fact | value |
|---|---|
| durable when | `flushed_to_disk_lsn ≥ commit_lsn` (value 1) |

**Event** · `logthreads → client` · SQL · `OK` · —
**Decoder** · D5.2
**Sources** · [R7] [O1]

**Replay:** `client → trx → undo (old v) → index (v=5 in memory) → logbuf (LSN) → bpool (dirty) → COMMIT → logthreads write + fsync → redo → client OK`.

### Decoders

**D5.1 One redo record (`MLOG_UNDO_INSERT`)** — shown in 5.3 · `wire: true`. A redo record says "on page X, do Y"; its body carries the bytes.

| offset | field | bytes | value |
|---|---|---|---|
| 0 | type | `14` | `MLOG_UNDO_INSERT` (20) |
| 1 | space id (compressed) | `FB EF` | E.G. undo tablespace id |
| 3 | page no (compressed) | `81 23` | E.G. 291 |
| 5 | body length | `00 1F` | 31 |
| 7 | body | 31 bytes | the undo record of D9.1 |

The next record in the same mtr, `MLOG_REC_UPDATE_IN_PLACE` (0x46), is shown as type + space + page + **opaque body**. The mtr ends with `MLOG_MULTI_REC_END` (0x1F).
Sources: [R13] [R14] [R15] [R18]

**D5.2 `SHOW ENGINE INNODB STATUS` — LOG lines** — shown in 5.9 · `wire: false`. LSNs are E.G.

```
Log sequence number          20602560
Log flushed up to            20602560
Pages flushed up to          20590000
Last checkpoint at           20590000
```

Step 5.8 waits for `Log flushed up to` to reach the commit LSN.
Sources: [O1]

### Self-check

1. **Q:** With the default setting, what must be true before `COMMIT` returns? **A:** Redo is written and fsynced up to the commit LSN.
2. **Q:** What can be lost with value 2, and with value 0? **A:** With 2, about 1 s of commits on an OS crash or power loss (a mysqld crash alone is safe). With 0, about 1 s even on a mysqld crash.
3. **Q:** Is the changed data page on disk at commit? **A:** No, only redo is. The page cleaner writes the page later.
4. **Q:** Which status line shows redo durability? **A:** `Log flushed up to`.

---

## Lesson 6 — `binlog-2pc`

**Goal:** Follow a COMMIT when the binary log is on. Then it is a two-phase commit between InnoDB redo and the binlog, done in groups. Finally, see how crash recovery uses the binlog to decide each prepared transaction.
**Critical path:** `client → bgc → trx (InnoDB prepare) → redo (group flush) → binlog (write) → binlog (fsync) → trx (InnoDB commit) → client`
**Interview questions:**
- Why does MySQL need 2PC between the binlog and InnoDB?
- What is the "double 1" setting?
- What is group commit?
- After a crash, is a prepared transaction committed or rolled back?

**Nodes:** `client`, `bgc`, `trx`, `logthreads`, `redo`, `binlog`. **Layers:** SQL, Binlog, Redo, Disk.
**Overview line:** binary logging is on by default; it is disabled only with `--skip-log-bin` / `--disable-log-bin`.

##### 6.1 `move` — COMMIT이 2PC로 간다
*부제:* binlog와 InnoDB 양쪽에 쓴 transaction이면 binlog가 coordinator가 된다.
> `ha_commit_trans()`는 read-write 참여자가 둘 이상이면 `prepare`를 먼저, `commit`을 그다음에 부른다. replica와 PITR이 binlog를 쓰므로, binlog와 InnoDB는 같은 결과여야 한다.

| fact | value |
|---|---|
| condition | `rw_ha_count > 1` → `tc_log->prepare()` then `tc_log->commit()` |

**Event** · `client → bgc` · SQL · `COMMIT (2PC)` · —
**Sources** · [X1] [X9]

##### 6.2 `mutate` — InnoDB prepare (fsync는 미룬다)
*부제:* InnoDB가 transaction을 PREPARED로 만든다. 이 trx 혼자서는 redo를 fsync하지 않는다.
> binlog의 `prepare()`는 durability를 `HA_IGNORE_DURABILITY`로 설정한다. 그래서 InnoDB는 prepare record를 redo log buffer에 쓰기만 하고, fsync는 group의 flush stage에서 한 번에 한다.

| fact | value |
|---|---|
| durability flag | `thd->durability_property = HA_IGNORE_DURABILITY` |
| InnoDB | prepare redo written to the log buffer, not flushed here |

**Event** · `bgc → trx` · Redo · `innobase_xa_prepare()` · —
**State (trx)** · before: `ACTIVE` → after: `PREPARED (redo in log buffer)`
**Sources** · [X2] [X3] [X11]

##### 6.3 `mutate` — flush stage: leader가 group을 가져간다
*부제:* 먼저 온 thread가 leader가 되어, 대기 중인 transaction들을 한 group으로 처리한다.
> group commit의 핵심은 여러 transaction의 fsync를 한 번으로 묶는 것이다. stage는 flush → sync → commit 세 개다.

| fact | value |
|---|---|
| stages | `BINLOG_FLUSH_STAGE` → `SYNC_STAGE` → `COMMIT_STAGE` |

**Event** · `bgc → bgc` · Binlog · `leader takes flush queue [T1 T2 T3]` · —
**State (bgc)** · before: `flush queue [T1 T2 T3]` → after: `flush group [T1 T2 T3] (leader T1)`
**Sources** · [X5] [X4]

##### 6.4 `move` — group의 prepare redo를 먼저 디스크에
*부제:* binlog에 쓰기 직전에 `ha_flush_logs(true)`로 group 전체의 InnoDB redo를 flush한다.
> 순서가 중요하다. prepare가 redo에서 durable해진 뒤에야 binlog에 쓴다. 그래야 crash 뒤에 "binlog에는 있는데 InnoDB에는 없는" transaction이 생기지 않는다.

| fact | value |
|---|---|
| source comment | "guaranteeing to flush prepared records of transactions before flushing them to binary log, which is required by crash recovery" |
| fsync | when `innodb_flush_log_at_trx_commit = 1` |

**Event** · `bgc → redo` · Redo · `ha_flush_logs(group)` · —
**Sources** · [X4] [R12]

##### 6.5 `move` — binlog에 event와 Xid를 쓴다
*부제:* 각 transaction의 row event 뒤에 `Xid_log_event`가 붙어 binlog file에 쓰인다(write만).
> `Xid` event는 binlog 기준으로 이 transaction이 commit됐다는 표시다. crash recovery는 이 XID들을 읽는다(6.9).

| fact | value |
|---|---|
| end event | `Xid_log_event(thd, xid)` for a 2PC transaction |

**Event** · `bgc → binlog` · Binlog · `write events + Xid ×3` · E.G. 1 KB
**Decoder** · D6.1
**Sources** · [X7] [X5]

##### 6.6 `mutate` — sync stage: binlog fsync (`sync_binlog`)
*부제:* `sync_binlog = 1`이면 group마다 binlog를 fsync한다.
> `sync_binlog = N`이면 N group마다 fsync하고, 0이면 OS에 맡긴다. `binlog_group_commit_sync_delay`(기본 0 µs)를 주면 fsync 전에 group이 더 모이기를 기다린다. 처리량은 늘지만 지연도 는다.

| fact | value |
|---|---|
| `sync_binlog` default | 1 |
| `binlog_group_commit_sync_delay` default | 0 µs |

**Event** · `bgc → binlog` · Disk · `fsync binlog (once per group)` · —
**State (binlog)** · before: `[… T1 T2 T3 (unsynced)]` → after: `[… T1✓ T2✓ T3✓ (durable)]`
**Sources** · [X5] [X6]

##### 6.7 `mutate` — commit stage: InnoDB commit을 binlog 순서대로
*부제:* leader가 group의 InnoDB commit을 binlog에 쓴 순서대로 실행한다.
> `binlog_order_commits`(기본 ON)이면 InnoDB commit 순서가 binlog 순서와 같다. 이 시점에는 prepare redo와 binlog XID가 이미 durable하다. 그래서 InnoDB commit 자체가 fsync를 기다리지 않아도 복구할 수 있다.

| fact | value |
|---|---|
| `binlog_order_commits` default | ON |

**Event** · `bgc → trx` · SQL · `ha_commit_low() ×3 in order` · —
**State (trx)** · before: `PREPARED` → after: `COMMITTED`
**Sources** · [X5] [X6] [R11]

##### 6.8 `move` — client에 OK
*부제:* group의 모든 thread가 깨어나 OK를 돌려준다.
> commit 하나에 드는 비용은 redo fsync 한 번과 binlog fsync 한 번인데, 이 비용을 group이 나눠서 낸다.

| fact | value |
|---|---|
| fsyncs per group | 1 redo (flush stage) + 1 binlog (sync stage, `sync_binlog=1`) |

**Event** · `bgc → client` · SQL · `OK ×3` · —
**Sources** · [X4] [X5]

##### 6.9 `mutate` — crash 뒤: binlog가 판정한다
*부제:* PREPARED인 InnoDB transaction은 XID가 binlog에 있으면 commit, 없으면 rollback한다.
> 재시작하면 MySQL은 마지막 binlog에서 `Xid` event를 모은다. 그다음 InnoDB가 보고한 prepared transaction마다 XID를 찾는다. 있으면 `commit_by_xid`, 없으면 `rollback_by_xid`를 부른다. 그래서 binlog와 InnoDB가 같은 결과로 맞춰진다.

| fact | value |
|---|---|
| rule | XID in binlog → commit; not in binlog → roll back |

**Event** · `binlog → trx` · Binlog · `recover: XID found → commit` · —
**State (trx)** · before: `T4 PREPARED (crash)` → after: `T4 COMMITTED if XID in binlog, else ROLLED BACK`
**Sources** · [X8]

##### 6.10 `mutate` — "double 1"이 아니면
*부제:* 둘 중 하나라도 1이 아니면, 전원 장애 뒤 binlog와 InnoDB가 어긋날 수 있다.
> `innodb_flush_log_at_trx_commit = 2`면 prepare redo가 OS cache에만 있을 수 있어, 전원이 나가면 binlog에는 있는 transaction이 InnoDB에서 사라질 수 있다. `sync_binlog = 0`이면 반대로, InnoDB에서 commit된 transaction이 binlog에서 빠질 수 있다. 어느 쪽이든 replica와 source가 달라진다. (6.4, 6.6, 6.9의 동작에서 끌어낸 결론이다.)

| fact | value |
|---|---|
| safe setting | `innodb_flush_log_at_trx_commit = 1` and `sync_binlog = 1` (both defaults) |

**Event** · `redo → binlog` · Disk · `power loss with relaxed settings` · —
**State (binlog)** · before: `binlog ⇔ InnoDB match` → after: `possible mismatch (replica drift)`
**Sources** · [R9] [X6] [X4] [X8]

**Replay:** `client COMMIT → bgc → InnoDB prepare → flush stage: redo flush (group) → binlog write (+Xid) → sync stage: binlog fsync → commit stage: InnoDB commit in order → client OK`.

### Decoders

**D6.1 Binlog transaction as written in 6.5** — shown in 6.5 · `wire: false`. This is the event sequence, not bytes; the binlog event byte layout was not decoded for this plan.

| # | event | meaning |
|---|---|---|
| 1 | `Gtid` | E.G. GTID of the transaction (if GTID mode is on) |
| 2 | `Query BEGIN` | transaction start |
| 3 | `Table_map` / `Update_rows` | row change for `t` (row format) |
| 4 | `Xid = 812` | E.G. XID; the commit marker that recovery looks for |

Sources: [X7]. Events 1–3 are listed for orientation only; their exact order and names were not traced in the source for this plan. **Unverified.**

### Self-check

1. **Q:** Why must the group's prepare redo be flushed before the binlog write? **A:** Recovery commits any prepared transaction whose XID is in the binlog, so that transaction must exist as prepared in InnoDB.
2. **Q:** How does recovery decide a prepared transaction? **A:** It commits it if its XID is in the binlog, and rolls it back otherwise.
3. **Q:** What does group commit save? **A:** fsyncs. There is one redo flush and one binlog fsync per group instead of per transaction.
4. **Q:** What is "double 1", and what breaks without it? **A:** `innodb_flush_log_at_trx_commit=1` and `sync_binlog=1`. Without both, a power loss can leave the binlog and InnoDB disagreeing, so replicas drift.

---

## Lesson 7 — `flush-doublewrite`

**Goal:** Follow a dirty page from the flush list to the data file: the WAL check, the doublewrite copy, and the in-place write.
**Critical path:** `bpool (flush list) → cleaner → (WAL: redo ≥ page LSN) → dblwr (write [+ fsync]) → ibd (write) → bpool (clean)`
**Interview questions:**
- Why must redo reach disk before the page?
- What does the doublewrite buffer protect against?
- What drives flushing?

**Nodes:** `bpool`, `cleaner`, `logthreads`, `redo`, `dblwr`, `ibd`. **Layers:** Buffer Pool, Redo, Disk.

##### 7.1 `mutate` — 가장 오래된 dirty page부터
*부제:* flush list는 `oldest_modification` 순이고, 맨 뒤가 가장 오래된 page다.
> 가장 오래된 dirty page가 checkpoint를 붙잡고 있다(lesson 8). 그래서 flush는 대체로 오래된 page부터 한다.

| fact | value |
|---|---|
| `innodb_max_dirty_pages_pct` default | 90 |

**Event** · `bpool → bpool` · Buffer Pool · `select oldest P` · —
**State (bpool)** · before: `flush [d3 d2 P]` → after: `flush [d3 d2 P*]` (`*` selected)
**Sources** · [B19] [B14]

##### 7.2 `move` — page cleaner가 batch를 시작한다
*부제:* `innodb_io_capacity`(기본 10000)를 예산으로 page를 flush한다.
> page cleaner는 dirty 비율과 redo 여유를 보고 flush할 양을 정한다(adaptive flushing). `innodb_io_capacity_max`를 따로 정하지 않으면 io_capacity의 2배까지 늘린다.

| fact | value |
|---|---|
| `innodb_io_capacity` / `_max` | 10000 / 2 × io_capacity if unset |

**Event** · `cleaner → bpool` · Buffer Pool · `flush batch` · E.G. 100 pages
**Sources** · [F12] [F15]

##### 7.3 `move` — WAL 규칙
*부제:* page의 newest LSN까지 redo가 fsync되지 않았으면 redo부터 flush한다.
> data page가 redo보다 먼저 디스크에 닿는 일은 없다. 그래야 crash 뒤 redo로 page를 맞출 수 있다.

| fact | value |
|---|---|
| check | `flushed_to_disk_lsn < page newest LSN` → `log_write_up_to(newest LSN, true)` |

**Event** · `cleaner → redo` · Redo · `ensure redo ≥ P.newest_lsn` · —
**Sources** · [F1]

##### 7.4 `mutate` — page 마무리: LSN과 checksum
*부제:* `FIL_PAGE_LSN`과 page 끝 8 bytes(checksum + LSN 하위 4 bytes)를 쓴다.
> 나중에 읽을 때 header의 LSN과 끝의 LSN이 다르거나 checksum이 틀리면, page가 반만 쓰였다(torn)는 뜻이다.

| fact | value |
|---|---|
| fields | `FIL_PAGE_LSN` (offset 16), trailer (last 8 B) |

**Event** · `cleaner → bpool` · Buffer Pool · `init page for write` · 8 B trailer
**State (bpool)** · before: `P.FIL_PAGE_LSN = old` → after: `P.FIL_PAGE_LSN = newest, trailer set`
**Decoder** · D7.1
**Sources** · [F1] [F9]

##### 7.5 `mutate` — doublewrite 파일에 먼저 쓴다
*부제:* page batch를 `#ib_16384_0.dblwr`에 쓰고, O_DIRECT가 아니면 fsync한다.
> 원래 자리에 쓰다가 전원이 나가면 page가 반만 남을 수 있다. redo는 온전한 page에만 적용할 수 있으므로 온전한 사본이 따로 필요하다. 8.4의 Linux 기본 `innodb_flush_method`는 지원되면 O_DIRECT다.

| fact | value |
|---|---|
| `innodb_doublewrite` default | ON |
| fsync | only if the flush method is not `O_DIRECT` / `O_DIRECT_NO_FSYNC` |

**Event** · `cleaner → dblwr` · Disk · `write_dblwr_pages()` · 16384 B × batch
**State (dblwr)** · before: `[]` → after: `[P copy, …] (durable)`
**Sources** · [F3] [F4] [F5] [F6] [F10]

##### 7.6 `move` — 이제 원래 자리에 쓴다
*부제:* 각 page를 `.ibd`의 제자리에 쓴다.
> 이 쓰기가 도중에 찢어져도 doublewrite에 온전한 사본이 있다.

| fact | value |
|---|---|
| order | `write_dblwr_pages()` then `write_data_pages()` |

**Event** · `dblwr → ibd` · Disk · `write P in place` · 16384 B
**Sources** · [F3]

##### 7.7 `mutate` — clean으로
*부제:* 쓰기가 끝나면 page는 flush list에서 빠지고, LRU에는 남는다.
> 이제 page를 evict할 수 있다. 가장 오래된 dirty page가 바뀌었으므로 checkpoint도 앞으로 갈 수 있다.

| fact | value |
|---|---|
| after | `oldest_modification = 0` |

**Event** · `ibd → bpool` · Buffer Pool · `P clean` · —
**State (bpool)** · before: `flush [d3 d2 P*]` → after: `flush [d3 d2]`
**Sources** · [F16] [B12]

##### 7.8 `mutate` — LRU 끝 page가 dirty라면
*부제:* free page가 없으면 쿼리 thread가 직접 page 하나를 flush하고 기다린다.
> lesson 4.2의 마지막 경로이고, 같은 WAL 확인과 doublewrite를 거친다. flush가 밀리면 쿼리 지연으로 나타난다.

| fact | value |
|---|---|
| status line | `Pending writes: LRU N, flush list N, single page N` |

**Event** · `bpool → bpool` · Buffer Pool · `single page flush from LRU tail` · 16384 B
**State (bpool)** · before: `free [] · LRU tail dirty` → after: `tail flushed → free [frame]`
**Sources** · [B17] [O2]

**Replay:** `bpool flush list (oldest P) → cleaner → redo ≥ P.LSN → dblwr write (+fsync) → ibd write in place → P clean`.

### Decoders

**D7.1 FIL header LSN and trailer of P** — shown in 7.4 · `wire: true`.

| offset | field | bytes | value |
|---|---|---|---|
| 16 | `FIL_PAGE_LSN` | `00 00 00 00 01 3A 5F 10` | E.G. |
| 16376 | trailer checksum | `5E 6F 70 81` | E.G. |
| 16380 | trailer: low 4 bytes of LSN | `01 3A 5F 10` | must equal bytes 20–23 |

Sources: [I1] [F9]

### Self-check

1. **Q:** What does InnoDB check before writing a dirty page? **A:** That redo is fsynced up to the page's newest LSN. If it is not, InnoDB flushes redo first.
2. **Q:** Why is redo not enough to repair a half-written page? **A:** Redo applies changes to an intact page, and a torn page has no intact base. The doublewrite copy provides one.
3. **Q:** In what order are the two writes made? **A:** First the doublewrite file (fsynced unless `O_DIRECT`), then the page in place.
4. **Q:** When does a query thread flush a page itself? **A:** When there is no free page and no clean page at the LRU tail.

---

## Lesson 8 — `checkpoint-recovery`

**Goal:** See how far redo can be reused (the checkpoint), why flushing lag stalls writes, and what a restart does after a crash.
**Critical path:** `bpool (oldest dirty LSN) → logthreads (checkpoint) → redo (checkpoint LSN)` … crash … `dblwr → ibd (repair torn pages) → redo → ibd (replay from checkpoint) → undo (roll back uncommitted)`
**Interview questions:**
- What is a checkpoint?
- What happens when redo fills up?
- What are the steps of crash recovery?

**Nodes:** `bpool`, `logthreads`, `redo`, `dblwr`, `ibd`, `undo`. **Layers:** Buffer Pool, Redo, Disk, Undo.

##### 8.1 `mutate` — redo는 원형이다
*부제:* redo 파일들은 합계 `innodb_redo_log_capacity`(기본 100MiB)를 원형으로 재사용한다.
> 앞부분을 덮어쓰려면, 그 부분의 redo가 고친 page들이 이미 디스크에 있어야 한다.

| fact | value |
|---|---|
| `innodb_redo_log_capacity` default | 100 MiB |

**Event** · `redo → redo` · Redo · `ring of #ib_redoN` · 100 MiB
**State (redo)** · before: `—` → after: `[checkpoint … current LSN]` (E.G.)
**Sources** · [R1] [R2]

##### 8.2 `mutate` — checkpoint 후보 = 가장 오래된 dirty page
*부제:* `available_for_checkpoint_lsn`: 이 LSN까지의 변경은 모두 page로 디스크에 있다.
> 이 값은 flush list에서 가장 오래된 `oldest_modification`이 정한다. 오래된 page 하나가 쓰이지 않으면 checkpoint 전체가 멈춘다.

| fact | value |
|---|---|
| source | oldest modification in the flush lists (minus recent-closed slack) |

**Event** · `bpool → logthreads` · Buffer Pool · `oldest dirty = 0x01390000` (E.G.) · —
**State (redo)** · before: `available_for_checkpoint 0x01380000` → after: `0x01390000` (E.G.)
**Sources** · [R8]

##### 8.3 `move` — checkpointer가 checkpoint LSN을 쓴다
*부제:* redo file header의 checkpoint 칸에 LSN을 쓴다. 그 앞의 redo는 재사용할 수 있다.
> `last_checkpoint_lsn`은 복구가 시작할 위치다.

| fact | value |
|---|---|
| meaning | "points to place where recovery is supposed to start" |

**Event** · `logthreads → redo` · Redo · `write checkpoint 0x01390000` (E.G.) · 8 B
**Decoder** · D8.1
**Sources** · [F14] [R8] [R3]

##### 8.4 `mutate` — flush가 밀리면 checkpoint age가 커진다
*부제:* current LSN − checkpoint LSN이 capacity에 가까워지면 checkpointer가 동기 flush를 강제한다.
> 쓰기가 page flush보다 빠르면 redo 여유가 줄어든다. 그러면 page cleaner가 강제로 flush하고, user thread의 쓰기는 redo 공간을 기다린다. redo capacity가 작거나 `innodb_io_capacity`가 낮을 때 생기는 전형적인 쓰기 stall이다.

| fact | value |
|---|---|
| checkpointer duty | "Checking if synchronous flush of dirty pages should be forced … because of space in redo log or age of the oldest page" |

**Event** · `logthreads → bpool` · Redo · `force sync flush` · —
**State (redo)** · before: `age 60% of capacity` (E.G.) → after: `age ~95%: sync flush, writers wait` (E.G.)
**Sources** · [F14] [O1]

##### 8.5 `mutate` — crash
*부제:* 전원이 나가, 메모리의 dirty page와 log buffer가 사라진다.
> 디스크에 남는 것은 redo(마지막 fsync까지), doublewrite, `.ibd`, undo, binlog다. `.ibd`의 일부 page는 반쯤 쓰였을 수 있다.

| fact | value |
|---|---|
| survives | redo up to `flushed_to_disk_lsn`, doublewrite, data files, binlog |

**Event** · `bpool → bpool` · Buffer Pool · `power loss` · —
**State (bpool)** · before: `dirty [d1 d2 …]` → after: `(lost)`
**Sources** · [R8]

##### 8.6 `move` — 시작 1: doublewrite로 찢어진 page 복원
*부제:* data file page의 checksum이 틀리면 doublewrite 사본으로 덮어쓴다.
> error log의 "Database page corruption … Trying to recover it from the doublewrite file." 메시지가 이 단계다.

| fact | value |
|---|---|
| detect | page checksum / LSN mismatch |

**Event** · `dblwr → ibd` · Disk · `restore torn P` · 16384 B
**Sources** · [F8]

##### 8.7 `move` — 시작 2: checkpoint부터 redo 재적용
*부제:* page의 `FIL_PAGE_LSN`보다 새 redo record만 그 page에 적용한다.
> 이 단계가 commit된 변경을 되살린다. checkpoint가 오래됐을수록 읽을 redo가 많아 시작이 느리다.

| fact | value |
|---|---|
| start | `last_checkpoint_lsn` |

**Event** · `redo → ibd` · Redo · `replay redo ≥ checkpoint` · —
**Sources** · [R8] [I1]

##### 8.8 `mutate` — 시작 3: 끝나지 않은 transaction 처리
*부제:* ACTIVE였던 trx는 undo로 rollback하고, PREPARED였던 trx는 binlog XID로 판정한다(lesson 6).
> redo 재적용이 끝나면 undo log에는 commit 안 된 transaction의 변경이 남아 있고, 그 변경을 되돌린다. binlog가 켜져 있으면 prepared transaction은 XID가 binlog에 있을 때만 commit된다.

| fact | value |
|---|---|
| ACTIVE | rolled back with undo |
| PREPARED | commit iff XID in binlog |

**Event** · `undo → ibd` · Undo · `rollback uncommitted; resolve prepared` · —
**State (undo)** · before: `[T5 ACTIVE, T4 PREPARED]` → after: `[T5 rolled back, T4 committed (XID found)]`
**Sources** · [X8]

##### 8.9 `mutate` — status로 확인하기
*부제:* `SHOW ENGINE INNODB STATUS` LOG 구간의 LSN 네 개를 본다.
> `Log sequence number − Last checkpoint at`이 checkpoint age다. 이 값이 capacity에 붙어 있으면 8.4의 stall이 일어나고 있는 것이다.

| fact | value |
|---|---|
| lines | `Log sequence number`, `Log flushed up to`, `Pages flushed up to`, `Last checkpoint at` |

**Event** · `redo → logthreads` · Redo · `status LSNs` · —
**State (redo)** · before: `—` → after: `LSN, flushed, pages flushed, checkpoint (D5.2 format)`
**Sources** · [O1]

**Replay:** `oldest dirty page → checkpoint LSN written to redo` … crash … `doublewrite repairs torn pages → redo replays from checkpoint → undo rolls back ACTIVE, binlog XID decides PREPARED`.

### Decoders

**D8.1 Checkpoint block in a redo file** — shown in 8.3 · `wire: true`.

| offset in block | field | bytes | value |
|---|---|---|---|
| 8 | `LOG_CHECKPOINT_LSN` | `00 00 00 00 01 39 00 00` | E.G. |

The checkpoint blocks sit at file offsets 512 (`LOG_CHECKPOINT_1`) and 1536 (`LOG_CHECKPOINT_2`).
Sources: [R3]

### Self-check

1. **Q:** What limits the checkpoint LSN? **A:** The oldest modification LSN among dirty pages. That page must be flushed before the redo ahead of it can be reused.
2. **Q:** Why do writes stall when flushing lags? **A:** Checkpoint age nears redo capacity, so the checkpointer forces synchronous flushing and writers wait for redo space.
3. **Q:** What are the three restart steps? **A:** Repair torn pages from doublewrite, replay redo from the checkpoint, then roll back ACTIVE transactions and resolve PREPARED ones by binlog XID.
4. **Q:** How do you read checkpoint age from the status output? **A:** `Log sequence number` minus `Last checkpoint at`.

---

## Lesson 9 — `mvcc-read-view`

**Goal:** See how a reader gets an older version without locks, through an undo chain plus a ReadView, and why a long transaction grows undo.
**Critical path:**
- Writer: `client (A UPDATE) → undo (old version) → index (new version, roll ptr → undo)`
- Reader: `client2 (B SELECT) → trx (ReadView) → index (reject new) → undo (follow roll ptr) → client2 (old value)`

**Interview questions:**
- How does InnoDB do non-locking consistent reads?
- What is in a ReadView, and how is visibility decided?
- Why does a long-running transaction hurt?

**Nodes:** `client`, `client2`, `trx`, `index`, `undo`, `purge`. **Layers:** SQL, B+Tree, Undo.
**Isolation in this lesson:** REPEATABLE READ (the default). Lesson 10 compares the levels.

##### 9.1 `mutate` — 시작 상태
*부제:* row `id=10`은 trx 0x0F11이 썼고, `DB_ROLL_PTR`은 그 이전 undo를 가리킨다.
> 모든 clustered record에는 `DB_TRX_ID`와 `DB_ROLL_PTR`이 있다. 이 둘이 version chain의 머리다.

| fact | value |
|---|---|
| roll ptr | 7 B: insert flag, rollback segment, page no, offset |

**Event** · `index → index` · B+Tree · `id=10 v=1 trx 0x0F11` (E.G.) · 13 B hidden
**State (index)** · before: `—` → after: `id=10 v=1 trx 0x0F11 roll→insert undo` (E.G.)
**Sources** · [I8] [M2]

##### 9.2 `mutate` — A가 UPDATE: undo에 옛 버전
*부제:* undo record = 옛 `DB_TRX_ID`, 옛 `DB_ROLL_PTR`, PK, 바뀐 컬럼의 옛 값.
> undo record가 옛 roll pointer를 담고 있어 버전들이 체인으로 이어진다. 오래된 버전일수록 체인 뒤쪽에 있다.

| fact | value |
|---|---|
| type | `TRX_UNDO_UPD_EXIST_REC` (12) |

**Event** · `client → undo` · Undo · `undo: v=1, trx 0x0F11` · 35 B
**State (undo)** · before: `[insert undo 0x0F11]` → after: `[upd undo (v=1, trx 0x0F11) → insert undo 0x0F11]`
**Decoder** · D9.1
**Sources** · [M4] [M3]

##### 9.3 `mutate` — row에 새 버전
*부제:* `v=5`, `DB_TRX_ID=A`, `DB_ROLL_PTR` → 방금 쓴 undo.
> 최신 버전은 page에, 이전 버전들은 undo에 있다. A는 아직 commit 전이다.

| fact | value |
|---|---|
| order | undo first, then `row_upd_rec_sys_fields()` |

**Event** · `undo → index` · B+Tree · `id=10 v=5 trx 0x0F20` (E.G.) · 13 B
**State (index)** · before: `v=1 trx 0x0F11` → after: `v=5 trx 0x0F20 roll→upd undo`
**Sources** · [M20]

##### 9.4 `mutate` — B의 첫 SELECT: ReadView 생성
*부제:* REPEATABLE READ에서 view는 BEGIN 때가 아니라 첫 consistent read 때 만들어진다.
> view는 그 순간 활성인 read-write trx id 목록을 복사하고, A(0x0F20)도 여기에 들어간다. `m_up_limit_id`는 그 목록의 최솟값, `m_low_limit_id`는 다음에 줄 trx id다.

| fact | value |
|---|---|
| fields | `m_low_limit_id` (high water), `m_up_limit_id` (low water), `m_ids` |

**Event** · `client2 → trx` · SQL · `SELECT v FROM t WHERE id=10` · —
**State (trx)** · before: `B: no view` → after: `B view {low 0x0F21, up 0x0F20, ids [0x0F20]}` (E.G.)
**Decoder** · D9.2
**Sources** · [M9] [M8] [M7]

##### 9.5 `mutate` — 최신 버전은 안 보이므로 체인을 따라간다
*부제:* 0x0F20은 `m_ids`에 있어 안 보인다 → `DB_ROLL_PTR`로 이전 버전을 만든다 → 0x0F11 < up이므로 보인다.
> 규칙: id < `m_up_limit_id`이거나 자기 자신이면 보이고, id ≥ `m_low_limit_id`면 안 보인다. 그 사이면 `m_ids`에 없을 때만 보인다. B는 lock 없이 `v=1`을 읽고, A도 기다리지 않는다.

| fact | value |
|---|---|
| visible | `id < up_limit` or own id; else invisible if `id ≥ low_limit`; else visible iff `id ∉ m_ids` |
| result | `v = 1` |

**Event** · `index → undo` · Undo · `build previous version` · 35 B read
**State (trx)** · before: `candidate trx 0x0F20` → after: `rejected → version trx 0x0F11 accepted, v=1`
**Sources** · [M6] [M12] [M13]

##### 9.6 `mutate` — secondary index로 읽으면
*부제:* secondary record에는 trx id가 없어 page의 `PAGE_MAX_TRX_ID`로 판단하고, 애매하면 clustered로 간다.
> `PAGE_MAX_TRX_ID < m_up_limit_id`면 page 전체가 보인다. 그렇지 않으면 covering index라도 clustered record와 undo로 버전을 확인한다(lesson 1.8의 예외).

| fact | value |
|---|---|
| check | `lock_sec_rec_cons_read_sees()` → `PAGE_MAX_TRX_ID < m_up_limit_id` |
| else | `goto requires_clust_rec` |

**Event** · `trx → index` · B+Tree · `secondary page too new → clustered` · —
**State (trx)** · before: `covering read via idx_k` → after: `clustered lookup for version check`
**Sources** · [I18] [I20] [I17]

##### 9.7 `move` — A가 COMMIT
*부제:* A의 update undo는 history list로 가고, 아직 지우지 않는다.
> B의 view처럼 옛 버전이 필요한 view가 남아 있을 수 있기 때문이다.

| fact | value |
|---|---|
| update undo | added to the history list |

**Event** · `client → trx` · SQL · `COMMIT 0x0F20` · —
**Sources** · [M14]

##### 9.8 `mutate` — purge는 가장 오래된 view까지만 지운다
*부제:* 어떤 view도 더는 필요로 하지 않는 undo만 purge가 지운다.
> 오래 열린 transaction 하나(몇 시간 걸린 batch, commit하지 않은 session 등)가 view를 잡고 있으면 history list가 계속 쌓인다. undo가 커지고, version chain이 길어져 읽기도 느려진다.

| fact | value |
|---|---|
| bound | `m_low_limit_no` of the oldest view |
| status line | `History list length N` |

**Event** · `purge → undo` · Undo · `purge up to oldest view` · —
**State (undo)** · before: `history [0x0F20 … ] growing` → after: `kept while B's view is open; purged after B commits`
**Sources** · [M6] [M14] [O4]

##### 9.9 `mutate` — B의 두 번째 SELECT (RR)
*부제:* 같은 view를 다시 쓰므로, A가 commit했어도 `v=1`이다.
> RR에서는 view가 transaction이 끝날 때까지 유지된다. READ COMMITTED는 다르다(lesson 10).

| fact | value |
|---|---|
| reuse | a view is opened only if none is active |

**Event** · `client2 → trx` · SQL · `SELECT again → v=1` · —
**State (trx)** · before: `B view ids [0x0F20]` → after: `same view, v=1`
**Sources** · [M8] [M10]

**Replay:** `A UPDATE → undo (old v=1) → row (v=5, roll ptr → undo)`; `B SELECT → ReadView → reject 0x0F20 → follow roll ptr → v=1`.

### Decoders

**D9.1 Undo record for `UPDATE t SET v=5 WHERE id=10`** — shown in 9.2 · `wire: true`. Only the fields an engineer needs are named; the header bytes are grouped into one row.

| offset | field | bytes | value |
|---|---|---|---|
| 0 | next-record offset | `?? ??` | E.G. |
| 2 | header: type · flag · undo_no · table_id · info bits | `5C 00 00 84 2A 00` | type `0x5C` = 12 \| cmpl_info 1 ×16 \| 0x40 — **E.G.** (see open questions) |
| 8 | old `DB_TRX_ID` | `00 00 00 0F 11` | E.G. 0x0F11 (compressed u64) |
| 13 | old `DB_ROLL_PTR` | `E0 85 00 00 01 23 01 10` | E.G. (compressed u64) — the chain link |
| 21 | PK `id` (len + value) | `04 80 00 00 0A` | 10 |
| 26 | changed fields: count · field no · len · old value | `01 04 04 80 00 00 01` | 1 field: `v` (field 4) was 1 |
| 33 | start offset of this record | `?? ??` | E.G. |

Sources: [M4] [M5] [M15] [M19] [G7]

**D9.2 B's `ReadView`** — shown in 9.4 · `wire: false` (in memory).

| field | value | meaning |
|---|---|---|
| `m_low_limit_id` | E.G. 0x0F21 | ids ≥ this are invisible |
| `m_up_limit_id` | E.G. 0x0F20 | ids < this are visible |
| `m_ids` | E.G. `[0x0F20]` | active rw transactions at snapshot time |
| `m_creator_trx_id` | E.G. 0 | B's own id (0 while B has written nothing — **unverified**) |
| `m_low_limit_no` | E.G. 0x0F1E | purge may remove undo below this |

Sources: [M6] [M7]

### Self-check

1. **Q:** How can B read `v=1` while A holds an X lock on the row? **A:** A consistent read takes no lock. It rejects A's version through the ReadView and rebuilds the old version from undo.
2. **Q:** What is the visibility rule? **A:** Visible if `id < m_up_limit_id` or it is the reader's own id. Invisible if `id ≥ m_low_limit_id`. Otherwise visible only if `id` is not in `m_ids`.
3. **Q:** When is the RR snapshot taken? **A:** At the transaction's first consistent read.
4. **Q:** Why does one idle open transaction hurt the server? **A:** Its view blocks purge, so the history list (undo) keeps growing and version chains get longer.

---

## Lesson 10 — `isolation-phantom`

**Goal:** Run the same range SELECT twice around a concurrent INSERT, and see what each isolation level shows. Then see how a snapshot read differs from a locking ("current") read.
**Critical path:** `client2 (B SELECT range) → trx (view?) → index` · `client (A INSERT 25, COMMIT)` · `client2 (B SELECT again) → result differs by level and by read kind`
**Interview questions:**
- What is a phantom read?
- Does REPEATABLE READ prevent it in InnoDB?
- How do READ COMMITTED and REPEATABLE READ differ?
- What does SERIALIZABLE change?

**Nodes:** `client`, `client2`, `trx`, `index`, `locks`. **Layers:** SQL, B+Tree, Lock.
**Setup:** rows 10, 20, 30. B runs `SELECT * FROM t WHERE id BETWEEN 10 AND 30`.

##### 10.1 `mutate` — B의 첫 범위 SELECT (RR)
*부제:* view를 만들고 3 rows(10, 20, 30)를 읽는다.
> 기본 isolation은 `REPEATABLE-READ`이고, 잠금 없는 SELECT는 view로 읽는다(lesson 9).

| fact | value |
|---|---|
| `transaction_isolation` default | `REPEATABLE-READ` |

**Event** · `client2 → index` · SQL · `SELECT … BETWEEN 10 AND 30 → 3 rows` · —
**State (trx)** · before: `B: no view` → after: `B view {ids []}` (E.G.), `result [10 20 30]`
**Sources** · [G4] [M9]

##### 10.2 `move` — A가 25를 INSERT하고 COMMIT
*부제:* B가 읽는 범위 안에 새 row 25가 생긴다.
> plain SELECT는 lock을 잡지 않으므로 A는 기다리지 않는다.

| fact | value |
|---|---|
| A | `INSERT INTO t VALUES (25, 250, 0); COMMIT` |

**Event** · `client → index` · B+Tree · `INSERT 25, COMMIT` · 30 B record
**Sources** · [S1]

##### 10.3 `mutate` — RR: 같은 SELECT → 여전히 3 rows
*부제:* 같은 view를 쓰므로 25의 `DB_TRX_ID`(A)가 보이지 않는다. snapshot read에는 phantom이 없다.
> RR은 view를 transaction이 끝날 때까지 쓴다. A의 id는 view를 만든 뒤에 받았으므로 `≥ m_low_limit_id`이고, 그래서 25는 결과에 없다.

| fact | value |
|---|---|
| RR view | reused until commit |

**Event** · `client2 → index` · SQL · `RR again → [10 20 30]` · —
**State (trx)** · before: `result [10 20 30]` → after: `result [10 20 30]` (same view)
**Sources** · [M8] [M6]

##### 10.4 `mutate` — RC: 같은 SELECT → 4 rows
*부제:* READ COMMITTED는 statement마다 view를 새로 만들므로, commit된 25가 보인다.
> statement가 끝나면 view를 닫고, 다음 read가 새 view를 만든다. 그래서 같은 transaction 안에서 결과가 바뀐다. 이것이 non-repeatable read와 phantom이다.

| fact | value |
|---|---|
| RC view | closed at statement end (`isolation_level <= READ_COMMITTED`) |

**Event** · `client2 → index` · SQL · `RC again → [10 20 25 30]` · —
**State (trx)** · before: `result [10 20 30]` → after: `new view; result [10 20 25 30]`
**Sources** · [M10]

##### 10.5 `mutate` — RR에서도 locking read는 최신 버전을 읽는다
*부제:* `SELECT … FOR UPDATE`는 view를 쓰지 않고, 최신 commit 버전에 lock을 걸고 읽는다 → 4 rows.
> locking read(`FOR UPDATE`, `FOR SHARE`, UPDATE/DELETE의 검색)는 "current read"다. 그래서 같은 RR transaction 안에서 snapshot read는 3 rows, current read는 4 rows를 돌려줄 수 있다.

| fact | value |
|---|---|
| read kind | `select_lock_type != LOCK_NONE` → lock + latest version; `LOCK_NONE` → ReadView |
| UPDATE/DELETE | `F_WRLCK` → `LOCK_X` (current read) |

**Event** · `client2 → index` · SQL · `RR FOR UPDATE → [10 20 25 30]` · —
**State (trx)** · before: `snapshot result [10 20 30]` → after: `current read [10 20 25 30]`
**Sources** · [S4] [L6] [M9]

##### 10.6 `mutate` — RR의 locking read는 gap을 잠가 새 INSERT를 막는다
*부제:* 범위에 next-key lock을 걸어, 그 구간의 INSERT가 기다리게 한다(lesson 11).
> 그래서 InnoDB RR에서는 locking read 사이에도 phantom이 생기지 않는다. RC는 gap lock을 걸지 않으므로 막지 못한다.

| fact | value |
|---|---|
| RR | next-key / gap locks |
| RC | record locks only (`skip_gap_locks()`) |

**Event** · `client2 → locks` · Lock · `next-key locks on 10…30, supremum/gap` · —
**State (locks)** · before: `[]` → after: `[B: 10 X,REC_NOT_GAP · 20 X · 25 X · 30 X …]` (RR, see 11.3)
**Sources** · [L5] [L8]

##### 10.7 `mutate` — RR의 함정: UPDATE가 snapshot에 phantom을 만든다
*부제:* B가 `UPDATE t SET v=0 WHERE id BETWEEN 10 AND 30`을 실행하면 25도 바뀌고, 그 뒤 B의 snapshot SELECT에 25가 나타난다.
> UPDATE는 current read이므로 25를 찾아 바꾸고, 25의 `DB_TRX_ID`가 B가 된다. view 규칙에서 자기 trx의 변경은 항상 보이므로, 다음 snapshot SELECT에 25가 포함된다.

| fact | value |
|---|---|
| own changes | `id == m_creator_trx_id` → visible |

**Event** · `client2 → index` · SQL · `UPDATE … → 4 rows changed; SELECT → [10 20 25 30]` · —
**State (trx)** · before: `snapshot [10 20 30]` → after: `snapshot [10 20 25 30]` (25 now written by B)
**Sources** · [M6] [S4]

##### 10.8 `mutate` — SERIALIZABLE과 READ UNCOMMITTED
*부제:* SERIALIZABLE은 transaction 안의 plain SELECT를 `LOCK_S`로 바꾸고, READ UNCOMMITTED는 view 없이 최신 버전(commit 전 포함)을 읽는다.
> SERIALIZABLE이라도 autocommit인 한 문장짜리 SELECT는 lock 없이 읽는다. READ UNCOMMITTED는 dirty read를 허용한다.

| fact | value |
|---|---|
| SERIALIZABLE | plain SELECT in a transaction → `LOCK_S` (autocommit SELECT → `LOCK_NONE`) |
| READ UNCOMMITTED | "let a non-locking SELECT read the latest version" |

**Event** · `client2 → trx` · SQL · `level switch` · —
**State (trx)** · before: `RR` → after: `SERIALIZABLE: SELECT = FOR SHARE; RU: latest version`
**Decoder** · D10.1
**Sources** · [S1] [S2] [S3]

##### 10.9 `mutate` — 정리 표
*부제:* isolation level × read 종류 → 무엇이 보이고 어떤 lock을 잡는가.
> 면접 질문의 답이 이 표 한 장에 있다. "InnoDB RR에서 phantom이 생기나?"의 답은 이렇다. snapshot read끼리, locking read끼리는 생기지 않는다. 10.7처럼 둘을 섞으면 생긴다.

| fact | value |
|---|---|
| RR snapshot | same view, no phantom |
| RC snapshot | new view per statement, phantoms |

**Event** · `trx → client2` · SQL · `summary` · —
**State (trx)** · before: `(scenes 10.1–10.8)` → after: `table D10.1`
**Decoder** · D10.1
**Sources** · [S1] [M10] [L8]

**Replay:** `B SELECT (view, 3 rows) → A INSERT 25 + COMMIT → B RR SELECT (3) · B RC SELECT (4) · B RR FOR UPDATE (4, next-key locks)`.

### Decoders

**D10.1 InnoDB read-lock chart** — shown in 10.8 and 10.9 · `wire: false`. Built from the comment chart in `ha_innobase::external_lock()`, plus the view and gap rules.

| statement \ level | READ UNCOMMITTED | READ COMMITTED | REPEATABLE READ | SERIALIZABLE |
|---|---|---|---|---|
| plain `SELECT` | no lock, latest version | no lock, view per statement | no lock, one view per trx | `S` lock (in a trx); no lock if autocommit |
| `SELECT … FOR SHARE` | `S` | `S`, record only | `S`, next-key/gap | `S`, next-key/gap |
| `SELECT … FOR UPDATE` / UPDATE / DELETE | `X` | `X`, record only | `X`, next-key/gap | `X`, next-key/gap |

Sources: [S1] [S2] [S3] [M10] [L8]

### Self-check

1. **Q:** Under InnoDB RR, does a repeated plain SELECT see a row that another transaction just inserted and committed? **A:** No. It reuses the same view.
2. **Q:** Under RC? **A:** Yes. Each statement gets a new view.
3. **Q:** Why can `SELECT … FOR UPDATE` in RR return more rows than a plain SELECT in the same transaction? **A:** A locking read reads the latest committed version, not the view.
4. **Q:** How can a phantom appear in an RR snapshot read? **A:** The same transaction runs an UPDATE (a current read) that touches the new row. The row then carries the reader's own trx id, so it becomes visible.
5. **Q:** What does SERIALIZABLE change for a plain SELECT inside a transaction? **A:** It takes `S` locks, like `FOR SHARE`.

---

## Lesson 11 — `row-locks`

**Goal:** For common locking statements under RR, see exactly which index records and gaps are locked, and how a conflicting writer waits.
**Critical path:** `client (locking read) → locks (table IX) → index (search) → locks (record / gap / next-key) → client2 (INSERT) → locks (insert-intention waits)`
**Interview questions:**
- What are record, gap, next-key and insert-intention locks?
- What does `FOR UPDATE` lock for a unique hit, a range, and a non-unique key?
- What changes under RC?
- What happens on a lock wait timeout?

**Nodes:** `client`, `client2`, `locks`, `index`. **Layers:** Lock, B+Tree.
**Notation:** values of `performance_schema.data_locks.LOCK_MODE`: `X` = next-key, `X,REC_NOT_GAP`, `X,GAP`, `X,GAP,INSERT_INTENTION`.

##### 11.1 `mutate` — 먼저 table IX
*부제:* row에 X lock을 걸기 전에 table에 `IX`를 건다.
> intention lock끼리는 충돌하지 않는다. 그래서 여러 transaction이 같은 table의 서로 다른 row를 동시에 잠글 수 있다. IX는 `LOCK TABLES`의 table S/X와만 충돌한다.

| fact | value |
|---|---|
| IX vs IX | compatible |

**Event** · `client → locks` · Lock · `TABLE t IX GRANTED` · —
**State (locks)** · before: `[]` → after: `[A TABLE IX]`
**Sources** · [L1] [L3]

##### 11.2 `mutate` — unique 일치: record만 잠근다
*부제:* `WHERE id = 20 FOR UPDATE` → 20에 `X,REC_NOT_GAP`.
> PK 전체를 equality로 찾았고 그 record가 delete-mark되지 않았으면 gap을 잠글 필요가 없다. 같은 key가 새로 생길 수 없기 때문이다.

| fact | value |
|---|---|
| lock | `PRIMARY 20 X,REC_NOT_GAP` |

**Event** · `client → locks` · Lock · `20 X,REC_NOT_GAP` · —
**State (locks)** · before: `[A IX]` → after: `[A IX, A 20 X,REC_NOT_GAP]`
**Sources** · [L7] [L5]

##### 11.3 `mutate` — 범위: next-key, 끝은 gap만 (8.4 기준)
*부제:* `WHERE id >= 10 AND id < 25 FOR UPDATE` → 10은 `REC_NOT_GAP`, 20은 `X`, 30은 `X,GAP`.
> 시작 key와 같은 10은 record만 잠근다. 범위 안의 20은 next-key(`X`)로 20과 (10, 20) gap을 잠근다. 범위 끝을 넘은 첫 row 30은 (20, 30) gap만 잠근다. 이것은 8.4 코드의 clustered-index range scan 기준이고, 옛 자료(5.7)에는 30도 next-key로 나온다.

| fact | value |
|---|---|
| inside range | `LOCK_ORDINARY` = next-key (`X`) |
| first row past the end | `X,GAP`; if the stop key itself is found, no lock |

**Event** · `client → locks` · Lock · `10 X,REC_NOT_GAP · 20 X · 30 X,GAP` · —
**State (locks)** · before: `[A IX]` → after: `[A IX, 10 X,REC_NOT_GAP, 20 X, 30 X,GAP]`
**Decoder** · D11.1
**Sources** · [L5] [L6]

##### 11.4 `mutate` — non-unique secondary 일치
*부제:* `WHERE k = 200 FOR UPDATE` → `idx_k (200,20)`에 `X`, `(300,30)`에 `X,GAP`, PRIMARY 20에 `X,REC_NOT_GAP`.
> 같은 `k` 값이 더 생길 수 있으므로 일치한 record는 next-key로 잠그고, 다음 record 앞의 gap도 잠근다. secondary로 찾아간 clustered record는 record만 잠근다.

| fact | value |
|---|---|
| secondary | match → `X`; first non-match → `X,GAP` |
| clustered | `X,REC_NOT_GAP` |

**Event** · `client → locks` · Lock · `idx_k 200 X · idx_k 300 X,GAP · PRIMARY 20 X,REC_NOT_GAP` · —
**State (locks)** · before: `[A IX]` → after: `[A IX, idx_k 200 X, idx_k 300 X,GAP, PRIMARY 20 X,REC_NOT_GAP]`
**Sources** · [L6] [L21]

##### 11.5 `mutate` — index를 쓰지 못하면
*부제:* WHERE 컬럼에 index가 없으면, clustered index를 처음부터 끝까지 읽으며 모든 record에 lock을 건다.
> RR의 locking read는 결과 row만이 아니라 검사한 record마다 lock을 건다. index 없는 `UPDATE … WHERE`가 사실상 table 전체를 잠그는 이유다.

| fact | value |
|---|---|
| RR | locks every scanned record (next-key) + supremum |

**Event** · `client → locks` · Lock · `full scan: 10 X · 20 X · 30 X · supremum X` · —
**State (locks)** · before: `[A IX]` → after: `[A IX, 10 X, 20 X, 30 X, supremum X]`
**Sources** · [L6] [L23] [L22]

##### 11.6 `mutate` — READ COMMITTED에서는
*부제:* gap/next-key 없이 record lock만 걸고, 조건에 맞지 않은 row의 lock은 푼다.
> RC는 gap을 잠그지 않으므로 phantom을 막지 못한다. 대신 lock 범위가 작아 충돌과 deadlock이 줄어든다.

| fact | value |
|---|---|
| `skip_gap_locks()` | true for RC and RU |
| non-matching rows | locks released (`releases_non_matching_rows`) |

**Event** · `client → locks` · Lock · `RC: 10, 20 X,REC_NOT_GAP` · —
**State (locks)** · before: `[A IX, 10 X,REC_NOT_GAP, 20 X, 30 X,GAP]` (RR) → after: `[A IX, 10 X,REC_NOT_GAP, 20 X,REC_NOT_GAP]` (RC)
**Sources** · [L8] [L22]

##### 11.7 `mutate` — 다른 session의 INSERT가 기다린다
*부제:* B가 `INSERT (15, …)`를 하면 다음 record 20에 `X,GAP,INSERT_INTENTION`을 요청하고, A의 next-key 때문에 WAITING이 된다.
> gap lock끼리는 충돌하지 않는다. 남의 gap/next-key를 기다리는 것은 insert intention뿐이고, insert intention lock을 기다리는 쪽은 없다.

| fact | value |
|---|---|
| insert checks | the successor record (20) |
| rule | gap vs gap: no conflict; insert intention vs others' gap/next-key: wait |

**Event** · `client2 → locks` · Lock · `20 X,GAP,INSERT_INTENTION WAITING` · —
**State (locks)** · before: `[A …, 20 X]` → after: `[A …, 20 X, B 20 X,GAP,INSERT_INTENTION WAITING]`
**Sources** · [L9] [L4]

##### 11.8 `mutate` — 50초 뒤: lock wait timeout
*부제:* `ER_LOCK_WAIT_TIMEOUT` (1205). 기본으로는 마지막 statement만 rollback된다.
> transaction 전체가 아니라 statement 하나만 rollback된다. 앞의 변경과 그 lock은 남아 있으므로 application이 직접 rollback하거나 재시도해야 한다.

| fact | value |
|---|---|
| `innodb_lock_wait_timeout` default | 50 s |
| `innodb_rollback_on_timeout` default | OFF (statement only) |

**Event** · `locks → client2` · Lock · `ERROR 1205` · —
**State (locks)** · before: `B WAITING` → after: `B request removed; B's earlier locks kept`
**Sources** · [L13] [L14] [L17] [L18]

**Replay:** `A FOR UPDATE → IX → records/gaps locked (10 REC_NOT_GAP, 20 X, 30 GAP) → B INSERT 15 → insert intention on 20 WAITING → timeout 1205`.

### Decoders

**D11.1 `performance_schema.data_locks` after 11.3** — shown in 11.3 · `wire: false`. Trx id E.G.

| `ENGINE_TRANSACTION_ID` | `INDEX_NAME` | `LOCK_TYPE` | `LOCK_MODE` | `LOCK_STATUS` | `LOCK_DATA` |
|---|---|---|---|---|---|
| 3900 | NULL | TABLE | IX | GRANTED | NULL |
| 3900 | PRIMARY | RECORD | X,REC_NOT_GAP | GRANTED | 10 |
| 3900 | PRIMARY | RECORD | X | GRANTED | 20 |
| 3900 | PRIMARY | RECORD | X,GAP | GRANTED | 30 |

The `LOCK_DATA` format (the PK value, `10`) and `INDEX_NAME` = NULL for table locks are **unverified**.
Sources: [L10] [L12] [L19]

### Self-check

1. **Q:** Under RR, what does `FOR UPDATE` lock for an existing PK value? **A:** `X,REC_NOT_GAP` on that record, plus table `IX`.
2. **Q:** What conflicts with a gap lock? **A:** Only insert-intention requests from other transactions. Gap locks never conflict with each other.
3. **Q:** Why can `UPDATE … WHERE unindexed_col = ?` block the whole table under RR? **A:** It scans the clustered index and locks every record it scans (next-key), up to the supremum.
4. **Q:** After a lock wait timeout, what is rolled back by default? **A:** Only the statement, with error 1205. The transaction and its earlier locks remain.

---

## Lesson 12 — `deadlock`

**Goal:** Follow a real deadlock between two "lock if exists, else insert" transactions, up to the victim's error.
**Critical path:** `client (T1 gap) → client2 (T2 gap) → client (T1 insert waits) → client2 (T2 insert waits) → locks (cycle) → victim rollback → 1213`
**Interview questions:**
- How does InnoDB detect a deadlock?
- Which transaction is rolled back?
- How is a deadlock different from a lock wait timeout?
- How do you find out what happened?

**Nodes:** `client`, `client2`, `locks`, `index`. **Layers:** Lock, B+Tree.
**Setup:** rows 10, 20, 30, under REPEATABLE READ.

##### 12.1 `mutate` — T1: 없는 id를 잠근다
*부제:* `SELECT * FROM t WHERE id = 15 FOR UPDATE` → 없음 → 20에 `X,GAP`, 즉 (10, 20) gap.
> cursor는 다음 record인 20에 선다. key가 일치하지 않으므로 RR에서는 20 앞의 gap을 잠근다.

| fact | value |
|---|---|
| lock | `PRIMARY 20 X,GAP` (T1) |

**Event** · `client → locks` · Lock · `id=15 miss → 20 X,GAP GRANTED` · —
**State (locks)** · before: `[]` → after: `[T1 20 X,GAP]`
**Sources** · [L6] [L7]

##### 12.2 `mutate` — T2: 같은 gap
*부제:* `… WHERE id = 16 FOR UPDATE` → 20에 `X,GAP`이 또 GRANTED된다.
> gap lock끼리는 충돌하지 않으므로, 두 transaction 모두 같은 gap을 막았다고 생각한다.

| fact | value |
|---|---|
| rule | gap request without insert intention → no conflict |

**Event** · `client2 → locks` · Lock · `id=16 miss → 20 X,GAP GRANTED` · —
**State (locks)** · before: `[T1 20 X,GAP]` → after: `[T1 20 X,GAP, T2 20 X,GAP]`
**Sources** · [L4]

##### 12.3 `mutate` — T1이 15를 INSERT: 기다린다
*부제:* 20에 insert intention을 요청하지만, T2의 gap 때문에 WAITING이 된다.
> insert는 다음 record(20)에 다른 trx의 gap lock이 있는지 확인한다. T2의 lock이 있으므로 기다린다.

| fact | value |
|---|---|
| request | `X,GAP,INSERT_INTENTION` on 20 |

**Event** · `client → locks` · Lock · `INSERT 15 → WAITING (T2)` · —
**State (locks)** · before: `[T1 GAP, T2 GAP]` → after: `[T1 GAP, T2 GAP, T1 II WAITING]`
**Sources** · [L9]

##### 12.4 `mutate` — T2가 16을 INSERT: 역시 기다린다 → cycle
*부제:* T2는 T1의 gap을 기다린다. T1 → T2 → T1.
> 둘 다 상대가 lock을 놓기를 기다리고, 어느 쪽도 먼저 놓지 않는다.

| fact | value |
|---|---|
| wait-for | T1 → T2, T2 → T1 |

**Event** · `client2 → locks` · Lock · `INSERT 16 → WAITING (T1)` · —
**State (locks)** · before: `[…, T1 II WAITING]` → after: `[…, T1 II WAITING, T2 II WAITING]; cycle`
**Sources** · [L9] [L4]

##### 12.5 `mutate` — detector가 cycle을 찾는다
*부제:* background thread가 wait-for graph에서 deadlock을 찾는다(최대 1초 간격).
> `innodb_deadlock_detect`가 ON(기본)이면 timeout(50초)까지 기다리지 않고 바로 해소한다. OFF면 `innodb_lock_wait_timeout`에 맡긴다.

| fact | value |
|---|---|
| `innodb_deadlock_detect` default | ON |
| thread | `lock_wait_timeout_thread()` wakes at most every 1 s |

**Event** · `locks → locks` · Lock · `cycle {T1, T2}` · —
**State (locks)** · before: `cycle unresolved` → after: `victim pending`
**Sources** · [L15] [L14]

##### 12.6 `mutate` — victim: 더 "가벼운" transaction
*부제:* weight = 바꾼 row 수(undo_no) + 잡은 lock 수이고, 작은 쪽을 rollback한다.
> 큰 작업을 날리지 않으려는 규칙이다. non-transactional table을 고친 trx는 무거운 쪽으로 친다.

| fact | value |
|---|---|
| `TRX_WEIGHT` | `undo_no + number of locks` |

**Event** · `locks → locks` · Lock · `victim = T2` (E.G.) · —
**State (locks)** · before: `{T1 w=3, T2 w=3}` (E.G.) → after: `victim T2`
**Sources** · [L16] [L15]

##### 12.7 `move` — victim은 1213을 받고, T1은 진행한다
*부제:* `ER_LOCK_DEADLOCK` (1213, SQLSTATE 40001)로 transaction 전체가 rollback되고, T1의 INSERT는 lock을 얻는다.
> deadlock은 transaction 전체를 되돌린다(1205 timeout은 statement만 되돌린다). 메시지가 말하듯 application은 transaction 전체를 다시 시도해야 한다.

| fact | value |
|---|---|
| error | 1213 / `40001` "Deadlock found when trying to get lock; try restarting transaction" |
| rollback scope | whole transaction |

**Event** · `locks → client2` · SQL · `ERROR 1213 (40001)` · —
**Sources** · [L17] [L18]

##### 12.8 `mutate` — 사후 분석
*부제:* `SHOW ENGINE INNODB STATUS`의 `LATEST DETECTED DEADLOCK`을 보거나, `innodb_print_all_deadlocks`로 모든 deadlock을 error log에 남긴다.
> status에는 마지막 deadlock 하나만 남는다. 운영에서 반복되는 deadlock을 추적하려면 `innodb_print_all_deadlocks`(기본 OFF)를 켠다. 출력에는 두 trx가 각자 잡은 lock과 기다린 lock, 그리고 `*** WE ROLL BACK TRANSACTION (n)` 줄이 있다.

| fact | value |
|---|---|
| status section | `LATEST DETECTED DEADLOCK` |
| `innodb_print_all_deadlocks` default | OFF |

**Event** · `locks → client` · Lock · `SHOW ENGINE INNODB STATUS` · —
**State (locks)** · before: `[T1 GAP, T1 II GRANTED]` → after: `deadlock report (D12.1)`
**Decoder** · D12.1
**Sources** · [O3] [L14]

**Replay:** `T1 gap on 20 → T2 gap on 20 → T1 insert waits → T2 insert waits → cycle → T2 rolled back (1213) → T1 inserts`.

### Decoders

**D12.1 `performance_schema.data_locks` just before detection (after 12.4)** — shown in 12.8 · `wire: false`. Trx ids E.G.

| `ENGINE_TRANSACTION_ID` | `INDEX_NAME` | `LOCK_TYPE` | `LOCK_MODE` | `LOCK_STATUS` | `LOCK_DATA` |
|---|---|---|---|---|---|
| 3900 (T1) | PRIMARY | RECORD | X,GAP | GRANTED | 20 |
| 3901 (T2) | PRIMARY | RECORD | X,GAP | GRANTED | 20 |
| 3900 (T1) | PRIMARY | RECORD | X,GAP,INSERT_INTENTION | WAITING | 20 |
| 3901 (T2) | PRIMARY | RECORD | X,GAP,INSERT_INTENTION | WAITING | 20 |

Table `IX` rows are omitted. The `LOCK_DATA` format is **unverified** (as in D11.1).
Sources: [L10] [L12] [L19]

### Self-check

1. **Q:** Why did two `FOR UPDATE`s on missing ids not block each other? **A:** Both took gap locks on 20, and gap locks are compatible.
2. **Q:** What made the cycle? **A:** Each `INSERT` needs an insert-intention lock on 20, which waits for the other transaction's gap lock.
3. **Q:** Who becomes the victim? **A:** The transaction with the smaller weight (undo records written plus locks held).
4. **Q:** 1213 vs 1205: what is rolled back? **A:** 1213 rolls back the whole transaction. 1205 rolls back only the statement, by default.
5. **Q:** How do you capture every deadlock, not only the last one? **A:** Set `innodb_print_all_deadlocks=ON`; each one is then written to the error log.

---

## Source index

Every URL is pinned to tag `mysql-8.4.13`, and the version for every entry is **MySQL 8.4.13**.

### General

| ID | Label | URL |
|---|---|---|
| G1 | `MYSQL_VERSION` (8.4.13, LTS) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/MYSQL_VERSION#L1-L6 |
| G2 | Page size constants (`univ.i`) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/univ.i#L310-L325 |
| G3 | `innodb_page_size` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22837-L22842 |
| G4 | `transaction_isolation` default | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/sys_vars.cc#L5001-L5005 |
| G7 | INT stored big-endian, sign bit negated | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0mysql.cc#L416-L417 |

### Index and pages

| ID | Label | URL |
|---|---|---|
| I1 | FIL header (`FIL_PAGE_PREV/NEXT`, `FIL_PAGE_LSN`) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/fil0types.h#L39-L119 |
| I3 | Index page header offsets | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/page0types.h#L52-L137 |
| I6 | Compact record header, delete flag | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/rem/rec.h#L86-L161 |
| I8 | `DATA_ROW_ID_LEN`, `DATA_TRX_ID_LEN`, `DATA_ROLL_PTR_LEN` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/data0type.h#L179-L191 |
| I9 | Clustered index system columns | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/dict/dict0dict.cc#L3187-L3202 |
| I10 | Secondary index gets PK columns | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/dict/dict0dict.cc#L3369-L3376 |
| I11 | `GEN_CLUST_INDEX` creation | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L12415-L12428 |
| I12 | UNIQUE NOT NULL key sorted first, may become PK | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/sql_table.cc#L3960-L3990 |
| I13 | Global row id counter | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/dict0boot.ic#L36-L50 |
| I14 | B+Tree descent, tree height | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0cur.cc#L1100-L1107 |
| I16 | `need_to_access_clustered` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L8562-L8570 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L8670 |
| I17 | Secondary → clustered lookup in `row_search_mvcc()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L5351-L5376 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L5444-L5465 |
| I18 | `lock_sec_rec_cons_read_sees()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L272-L301 |
| I20 | `PAGE_MAX_TRX_ID` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/page0types.h#L75-L77 |
| I22 | `FIL_NULL` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/fil0fil.h#L1183 |

### Composite index and EXPLAIN

| ID | Label | URL |
|---|---|---|
| C1 | Field-by-field key comparison | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/rem/rem0cmp.cc#L601-L692 |
| C2 | `calc_length_and_keyparts()`: key parts must be a prefix; length = Σ `store_length` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/sql_select.cc#L2307-L2331 |
| C3 | `store_length` (+1 nullable, +2 VARCHAR/BLOB); constants | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/table.cc#L700-L715 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/handler.h#L618-L619 |
| C4 | INT `PACK_LENGTH = 4`; `key_length()` = `pack_length()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/field.h#L2350-L2380 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/field.h#L1166 |
| C5 | EXPLAIN `type` names | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/opt_explain.cc#L118-L120 |
| C6 | EXPLAIN `Extra` strings | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/opt_explain_traditional.cc#L46-L86 |
| C7 | EXPLAIN columns | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/sql_class.cc#L1935-L1968 |
| C8 | Skip scan conditions; `optimizer_switch` default (ICP, skip_scan on) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/range_optimizer/index_skip_scan_plan.cc#L163-L194 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/sys_vars.cc#L200-L216 |
| C9 | ICP check before clustered fetch | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L3769 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L5428-L5444 |

### Split and merge

| ID | Label | URL |
|---|---|---|
| P1 | `btr_page_split_and_insert()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0btr.cc#L2299-L2640 |
| P2 | `btr_page_get_split_rec_to_right()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0btr.cc#L1701-L1750 |
| P5 | `PAGE_DIRECTION` values | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/page0types.h#L140-L147 |
| P6 | `DICT_INDEX_MERGE_THRESHOLD_DEFAULT = 50` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/dict0mem.h#L1041 |
| P7 | `BTR_CUR_PAGE_COMPRESS_LIMIT` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/btr0cur.h#L607-L611 |
| P8 | `btr_cur_compress_recommendation()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/btr0cur.ic#L104-L131 |
| P9 | `btr_cur_compress_if_useful()` after pessimistic delete | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0cur.cc#L4502-L4537 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0cur.cc#L4812 |
| P10 | `btr_compress()` left then right | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0btr.cc#L3024-L3130 |
| P11 | `btr_can_merge_with_page()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0btr.cc#L4668-L4740 |
| P15 | Insert direction bookkeeping | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/page/page0cur.cc#L1368-L1398 |
| P16 | `btr_cur_del_mark_set_clust_rec()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0cur.cc#L4283-L4292 |
| P17 | Purge removes delete-marked record | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0purge.cc#L133-L250 |

### Buffer pool

| ID | Label | URL |
|---|---|---|
| B1 | `innodb_buffer_pool_size` (128 MiB) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22554-L22562 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/srv/srv0srv.cc#L430 |
| B6 | Midpoint insert (`buf_LRU_add_block_low`) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0lru.cc#L1647-L1716 |
| B7 | Read → old sublist | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0buf.cc#L4995 |
| B8 | Young / too-old checks | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/buf0buf.ic#L161-L203 |
| B9 | `innodb_old_blocks_pct`, `innodb_old_blocks_time` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L23040-L23050 |
| B10 | `buf_LRU_make_block_young()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0lru.cc#L1717-L1730 |
| B12 | `buf_page_t` fields | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/buf0buf.h#L1636-L1696 |
| B13 | `innodb_lru_scan_depth` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22707-L22711 |
| B14 | `innodb_max_dirty_pages_pct` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22404-L22416 |
| B16 | `buf_page_get_gen()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0buf.cc#L4465 |
| B17 | Free block strategy | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0lru.cc#L1284-L1311 |
| B19 | Insert into flush list | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0flu.cc#L503-L515 |

### Redo and commit

| ID | Label | URL |
|---|---|---|
| R1 | Redo dir/files, `LOG_N_FILES = 32` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/log0constants.h#L73-L103 |
| R2 | `innodb_redo_log_capacity` (100 MiB) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22863-L22868 |
| R3 | Checkpoint offsets, `LOG_CHECKPOINT_LSN` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/log0constants.h#L167-L176 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/log0constants.h#L245 |
| R5 | `innodb_log_buffer_size` (64 MiB) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/log0constants.h#L485-L491 |
| R6 | `mtr_t::Command::execute()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/mtr/mtr0mtr.cc#L836-L878 |
| R7 | Redo log threads | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/log/log0write.cc#L105-L133 |
| R8 | LSN definitions | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/log/log0log.cc#L316-L416 |
| R9 | `trx_flush_log_if_needed_low()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0trx.cc#L1758-L1785 |
| R10 | `innodb_flush_log_at_trx_commit`, `_timeout` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22369-L22380 |
| R11 | Commit flush decision, `trx_commit_low()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0trx.cc#L2075-L2094 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0trx.cc#L2165-L2199 |
| R12 | `innobase_flush_logs()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L5906-L5943 |
| R13 | `mlog_id_t` values | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/mtr0types.h#L63-L255 |
| R14 | Redo record header; compressed integers | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/mtr0log.ic#L169-L184 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/mach0data.ic#L155-L190 |
| R15 | `MLOG_UNDO_INSERT` body | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0rec.cc#L70-L99 |
| R18 | `MLOG_MULTI_REC_END` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/mtr/mtr0mtr.cc#L790-L804 |

### Binlog two-phase commit

| ID | Label | URL |
|---|---|---|
| X1 | `ha_commit_trans()`: prepare then commit when `rw_ha_count > 1` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/handler.cc#L1785-L1812 |
| X2 | Binlog `prepare()` sets `HA_IGNORE_DURABILITY` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/binlog.cc#L8097-L8114 |
| X3 | InnoDB `trx_flush_logs()` skips flush on `HA_IGNORE_DURABILITY` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0trx.cc#L3670-L3705 |
| X4 | Flush stage: `ha_flush_logs(true)` before binlog write | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/binlog.cc#L8494-L8526 |
| X5 | `ordered_commit()` stages; `sync_binlog_file()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/binlog.cc#L8942-L9150 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/binlog.cc#L8746-L8766 |
| X6 | `sync_binlog`, `binlog_order_commits`, `binlog_group_commit_sync_delay` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/sys_vars.cc#L6165-L6171 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/sys_vars.cc#L1699-L1703 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/sys_vars.cc#L1269-L1286 |
| X7 | `Xid_log_event` ends a 2PC transaction | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/binlog.cc#L8300-L8316 |
| X8 | Recovery: XID in binlog → commit, else rollback | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/xa/recovery.cc#L50-L59 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/xa/recovery.cc#L241-L266 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/binlog/log_sanitizer.cc#L95-L110 |
| X9 | Binary log on by default (`--skip-log-bin` to disable) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/mysqld.cc#L10710-L10716 |
| X11 | InnoDB handlerton `prepare` / `recover` / `commit_by_xid` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L5440-L5443 |

### Flush, doublewrite, checkpoint

| ID | Label | URL |
|---|---|---|
| F1 | WAL rule in `buf_flush_write_block_low()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0flu.cc#L1169-L1257 |
| F3 | Doublewrite then data pages | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0dblwr.cc#L2163-L2255 |
| F4 | `is_fsync_required()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0dblwr.cc#L805-L809 |
| F5 | Doublewrite file name | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0dblwr.cc#L2666-L2668 |
| F6 | `innodb_doublewrite` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22595-L22600 |
| F8 | Recovery from doublewrite | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0dblwr.cc#L3065-L3080 |
| F9 | FIL trailer | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/fil0types.h#L113-L119 |
| F10 | `innodb_flush_method` default | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L4961-L4966 |
| F12 | `innodb_io_capacity`, computed `_max` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22259-L22268 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L4842-L4846 |
| F14 | Log checkpointer duties | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/log/log0write.cc#L389-L400 |
| F15 | `innodb_adaptive_flushing` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22416-L22424 |
| F16 | `dblwr::write_complete()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0flu.cc#L928-L931 |

### MVCC and isolation

| ID | Label | URL |
|---|---|---|
| M2 | Roll pointer layout | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/trx0undo.ic#L45-L76 |
| M3 | Undo record types | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/trx0rec.h#L295-L319 |
| M4 | Update undo record layout | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0rec.cc#L1154-L1372 |
| M5 | Undo record next/start offsets | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0rec.cc#L184-L222 |
| M6 | `ReadView::changes_visible()`, members | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/read0types.h#L163-L188 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/read0types.h#L282-L302 |
| M7 | `ReadView::prepare()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/read/read0read.cc#L447-L469 |
| M8 | `trx_assign_read_view()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0trx.cc#L2319-L2333 |
| M9 | Consistent read assigns the view | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L4824-L4830 |
| M10 | RC closes the view per statement | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L19157-L19163 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L19750-L19759 |
| M12 | `lock_clust_rec_cons_read_sees()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L235-L261 |
| M13 | Build previous version | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L5325-L5345 |
| M14 | Insert undo freed; update undo → history | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0undo.cc#L1922-L1957 |
| M15 | `cmpl_info` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0upd.cc#L3191-L3200 |
| M19 | Compressed u64 formats | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/mach0data.ic#L393-L441 |
| M20 | Update in place: undo then sys fields | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0cur.cc#L3380-L3393 |
| S1 | Read-lock chart in `external_lock()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L19022-L19060 |
| S2 | SERIALIZABLE plain SELECT → `LOCK_S` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L19073-L19077 |
| S3 | READ UNCOMMITTED reads the latest version | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L5311-L5318 |
| S4 | Write statements / `FOR UPDATE` → `LOCK_X` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L19006-L19011 |

### Locks

| ID | Label | URL |
|---|---|---|
| L1 | Lock modes | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/lock0types.h#L55-L62 |
| L3 | Compatibility matrix | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/lock0priv.h#L575-L599 |
| L4 | Record lock conflict rules | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L553-L640 |
| L5 | `row_compare_row_to_range()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L4268-L4375 |
| L6 | Lock type choice; miss → gap | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L5214-L5232 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L5139-L5150 |
| L7 | `unique_search` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L4605-L4618 |
| L8 | `skip_gap_locks()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/trx0trx.h#L1108-L1124 |
| L9 | Insert intention check | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L5139-L5200 |
| L10 | Lock mode strings | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L87-L93 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L5704-L5765 |
| L12 | `data_locks` columns | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/perfschema/table_data_locks.cc#L56-L68 |
| L13 | `innodb_lock_wait_timeout` (50) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L1088-L1092 |
| L14 | `innodb_deadlock_detect`, `innodb_print_all_deadlocks`, `innodb_rollback_on_timeout` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22733-L22738 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L23312-L23315 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22447-L22451 |
| L15 | Deadlock detector thread, victim choice | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0wait.cc#L911-L960 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0wait.cc#L1429-L1460 |
| L16 | `TRX_WEIGHT`, `trx_weight_ge()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/trx0trx.h#L1248-L1254 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0trx.cc#L2899-L2923 |
| L17 | Deadlock vs timeout rollback scope | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L2128-L2149 |
| L18 | Errors 1205, 1213 | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/share/messages_to_clients.txt#L4359-L4362 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/share/messages_to_clients.txt#L4475-L4477 |
| L19 | `LOCK_STATUS` strings | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/p_s.cc#L486-L488 |
| L21 | Clustered lock via secondary = `REC_NOT_GAP` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L3268-L3277 |
| L22 | `releases_non_matching_rows()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/trx0trx.h#L1127-L1131 |
| L23 | Supremum locked in a locking scan | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L4967-L5030 |

### Operator output

| ID | Label | URL |
|---|---|---|
| O1 | `SHOW ENGINE INNODB STATUS` LOG lines | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/log/log0log.cc#L1176-L1200 |
| O2 | BUFFER POOL lines (hit rate, young/not young, pending writes) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0buf.cc#L6780-L6822 |
| O3 | `LATEST DETECTED DEADLOCK`, `WE ROLL BACK TRANSACTION` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L4462-L4470 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L6185 |
| O4 | `History list length` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L4525-L4526 |

Error numbers 1205 and 1213 were derived by counting entries from `start-error-number 1000` in `messages_to_clients.txt`. SQLSTATE `40001` is on the `ER_LOCK_DEADLOCK` line itself.

---

## Open questions and unverified facts

1. **Reference manual.** `dev.mysql.com` is still blocked (retried 2026-11-04), so every fact cites source code. To add manual links, allow the host in the environment's network settings.
2. **Kept, but labeled:**
   - D9.1 `type_cmpl = 0x5C` (E.G.). `cmpl_info = UPD_NODE_NO_ORD_CHANGE` is sourced. Whether `UPD_NODE_NO_SIZE_CHANGE` is also ORed in (which would give `0x7C`) was not traced.
   - The `LOCK_DATA` format in D11.1 and D12.1.
   - `m_creator_trx_id = 0` for a transaction that has not written (D9.2).
   - 11.3 "8.4 기준": gap-only lock on the first row past a clustered range scan.
3. **D6.1 binlog event list:** only `Xid_log_event` is sourced. The `Gtid` / `Query BEGIN` / `Table_map` / `Update_rows` sequence is there for orientation and is unverified.
4. **Lesson 6.10** is a conclusion reasoned from the sourced mechanics of 6.4, 6.6 and 6.9, not a quoted source statement. Confirm it against the manual's `sync_binlog` and `innodb_flush_log_at_trx_commit` sections once the manual is reachable.
5. **2.5:** whether the optimizer picks `ALL` or `index` for `WHERE b = 2` depends on cost. Only "not `ref`" is sourced.
6. **9.7 pin:** if the topic moves to 9.7, re-check `innodb_change_buffering`. Its code default is `IBUF_USE_NONE` in 8.4.13 but `IBUF_USE_ALL` in 9.7.4.

## Cut by must-know rule

These items were in the previous plan. Each one is removed, merged, or reduced to one overview line. The corrections from the 2026-11-04 review are recorded here so they are not lost.

| Removed | Why | Where it went |
|---|---|---|
| FIL header full decode (checksum, `FIL_PAGE_TYPE` 17855, flush LSN, space id) | Engineers do not read page headers | Kept only `FIL_PAGE_PREV/NEXT` (D3.1) and `FIL_PAGE_LSN` + trailer (D7.1) |
| Index page header full decode (`PAGE_N_DIR_SLOTS`, `PAGE_HEAP_TOP`, `PAGE_N_HEAP`, `PAGE_FREE`, `PAGE_GARBAGE`, FSEG headers) | Internal constants | — |
| Infimum/supremum bytes; page directory slots (2 B, 4–8 owned) | Internal | One overview line in lesson 1 |
| Node pointer record layout, `REC_STATUS_*`, `REC_NODE_PTR_SIZE` | Internal | Prose in 1.3 |
| Root raise steps and `REC_INFO_MIN_REC_FLAG` | Rare; no operational effect | One overview line in lesson 3 |
| Split internals (step labels 1–8, "2 free pages", extent 64 pages, `FSP_UP` hint) | Internal | — |
| Old step 1.13 (`PAGE_MAX_TRX_ID` for covering reads) | Moved, not cut | Lesson 9.6 |
| Buffer pool instances formula, chunk size, AHI OFF, change buffering none (old 3.12–3.13) | Config trivia | — |
| `freed_page_clock == 0` step (old 3.9) | Merged | One sentence in 4.6 |
| LRU constants (`BUF_LRU_OLD_RATIO_DIV` 1024, `BUF_LRU_OLD_MIN_LEN` 512, tolerance 20) | Internal constants | — |
| Read-ahead step (threshold 56, random read-ahead OFF) | Rarely tuned | One overview line in lesson 4 |
| `INNODB_BUFFER_POOL_STATS` column decode | Duplicates the status lines | D4.2 uses `SHOW ENGINE INNODB STATUS` instead |
| Redo log block header (`LOG_BLOCK_HDR_NO`, data len, first rec group, epoch) | Internal. Correction: the trailer checksum is **CRC32** (`log_block_calc_checksum_crc32`, over the first 508 bytes) when `innodb_log_checksums` = ON (default) | — |
| Redo file header decode (old D4.3) | Internal. Correction: `LOG_HEADER_CREATOR` is at offset 16, max 31 bytes, content `"MySQL " + version`; `LOG_HEADER_FLAGS` is at offset **48** (`CREATOR + 31 + 1` for `\0`), not 47 | — |
| `MLOG_REC_UPDATE_IN_PLACE` body | Internal | Shown as opaque in D5.1 |
| Recent-written links, write-ahead size 8192, `LOG_START_LSN` 8192, `MLOG_SINGLE_REC_FLAG` | Internal | — |
| Checkpoint block fields beyond `LOG_CHECKPOINT_LSN` | Not read | D8.1 keeps only `LOG_CHECKPOINT_LSN` |
| Doublewrite modes `DETECT_ONLY` / `DETECT_AND_RECOVER`, `innodb_doublewrite_pages` 128 / `_files` 2, `.bdblwr` | Exotic config | — |
| `innodb_flush_neighbors`, `innodb_page_cleaners` formula, adaptive flushing lwm | Rarely tuned | — |
| `START TRANSACTION WITH CONSISTENT SNAPSHOT` (old 6.12) | Niche | — |
| Undo framing details (undo_no and table_id encoding, flag byte) | Internal | Grouped into one header row in D9.1 |
| Rollback segments (128), undo slots, `innodb_purge_threads`, `innodb_undo_log_truncate`, `innodb_max_undo_log_size` | Config trivia | History list length kept (9.8) |
| `lock_t::type_mode` bit decode (old D7.2) | Internal | — |
| Supremum as its own step (old 7.5) | Merged | 11.5 |
| GEN_CLUST row id persist margin (256) | Internal | — |
| `innodb_fill_factor`; `MERGE_THRESHOLD` COMMENT syntax and 1–50 range | Niche | — |
| The manual's "15/16 fill" claim, root page "3 or 4", the `mysql-8.4.12` tag remark, the 9.7 change-buffering help text | Unverified or trivia | Dropped |
