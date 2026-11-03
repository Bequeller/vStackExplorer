---
last-verified: 2026-11-03
sources: [https://github.com/mysql/mysql-server/tree/mysql-8.4.13/storage/innobase]
---

# MySQL InnoDB lesson plan (research)

This is the content plan for the MySQL InnoDB topic. It is written to turn into lesson data once the engine and schema redesign settles. It is not TypeScript, and it assumes no field names beyond those in `docs/ARCHITECTURE.md` (Lesson format) and `docs/DESIGN.md` (Required screens).

## How to read this plan

- Lessons are numbered `1`–`7`, and steps `n.m`. Each step gives:
  - `move` or `mutate`, a title, and a one-line subtitle.
  - Korean prose (at most 5 lines), and 2–4 facts.
  - One event-log row, written as `source → destination · layer · info · size`.
  - For `mutate`: the state **before → after**.
  - Source IDs, which resolve in [Source index](#source-index).
- **E.G.** marks a value that changes from run to run (LSN, trx id, page number, checksum, space id). Every other value is a constant or default read from the pinned source.
- Byte offsets in decoders are from the start of the structure named in the decoder title.
- A duration is written only when the source gives it (for example `1000 ms`). Otherwise the size column holds a byte size, or `—`.

## Version pin

| Item | Value | How it was checked |
|---|---|---|
| Pinned version | **MySQL 8.4.13 (LTS)** | Tag `mysql-8.4.13` exists in `github.com/mysql/mysql-server` (`git ls-remote --tags`, 2026-11-03). `MYSQL_VERSION` at that tag reads `MAJOR=8 MINOR=4 PATCH=13 MATURITY="LTS"` [G1]. Tag commit date: 2026-09-30. |
| Other current LTS | MySQL 9.7.4 | Tag `mysql-9.7.4`. Its `MYSQL_VERSION` also says `MATURITY="LTS"`. |
| Other 8.4 tags seen | 8.4.0 … 8.4.11, 8.4.13 | No `mysql-8.4.12` tag in the repository on 2026-11-03. Release notes not read (see [Open questions](#open-questions-and-unverified-facts)). |

**Why 8.4.13:** the 8.4 LTS line matches the `refman/8.4` manual that interview prep material cites. It is also the line a team upgrading from 8.0 moves to. This is a judgement, not a sourced fact. I checked 9.7.4 for the key defaults used below, and they are identical, with one exception: `innodb_change_buffering` (see open questions). So the plan carries over to 9.7 if the owner prefers it.

**How facts were sourced.** This session's network policy denied `dev.mysql.com` (proxy `403` on CONNECT, and `ENOTFOUND` from the fetch tool). The MySQL Reference Manual could not be opened. Every fact below comes from the **MySQL server source code at tag `mysql-8.4.13`**, which decision 0004 prefers anyway (release-tag URLs with line anchors). Reference-manual pages I would also cite are listed under open questions, as *not opened*.

**Running example (all lessons).** One table, chosen so every column is fixed-length and `NOT NULL`. A compact record then has no variable-length list and no NULL bitmap, so the decoder bytes stay exact.

```sql
CREATE TABLE t (
  id INT NOT NULL PRIMARY KEY,
  k  INT NOT NULL,
  v  INT NOT NULL,
  KEY idx_k (k)
) ENGINE=InnoDB;            -- ROW_FORMAT defaults to DYNAMIC [G6]
INSERT INTO t VALUES (10,100,1), (20,200,2), (30,300,3);
```

## Lesson overview

| # | Lesson id | One mechanism | Steps |
|---|---|---|---|
| 1 | `index-lookup` | Secondary → clustered B+Tree lookup, covering index, implicit PK | 14 |
| 2 | `page-split-merge` | Leaf page split (sequential vs random) and merge on delete | 13 |
| 3 | `buffer-pool-lru` | Buffer pool LRU with young/old sublists, midpoint insert, eviction | 13 |
| 4 | `redo-commit` | Redo log (WAL) and the commit path to a durable LSN | 14 |
| 5 | `flush-doublewrite` | Dirty-page flush, WAL rule, doublewrite, checkpoint, recovery | 12 |
| 6 | `mvcc-read-view` | Undo log and the read view under REPEATABLE READ vs READ COMMITTED | 13 |
| 7 | `row-locks-deadlock` | Record, gap, next-key and insert-intention locks, and a deadlock | 15 |

The order follows the task's ranking. The task listed redo, WAL, commit and doublewrite as one item; I split them into lessons 4 and 5, because one lesson can show only one mechanism (`docs/DESIGN.md`, Principles). Whether lessons 6–7 (MVCC, locks) should come before 3–5 is a product call. It is listed in open questions.

Topic-level values for `meta.ts`:

- `versions: { "MySQL": "8.4.13" }`
- Layer selector values used across lessons: `SQL`, `Handler`, `B+Tree`, `Page`, `Buffer Pool`, `Redo`, `Undo`, `Lock`, `Disk`. Each lesson lists the subset it uses.

---

## Lesson 1 — `index-lookup`

**Goal:** Follow `SELECT v FROM t WHERE k = 200` from the secondary index `idx_k` to the clustered index. Then see why `SELECT id … WHERE k = 200` can stop at the secondary leaf (a covering index), and when it still cannot.

**Interview questions it answers**
- What does a clustered index store, and what does a secondary index leaf store?
- Why does a secondary-index lookup cost two B+Tree descents? What is a covering index?
- What happens in a table without a primary key?
- Why does a covering index read sometimes still touch the clustered index (MVCC)?

**Layer selector:** `SQL` · `Handler` · `B+Tree` · `Page`

**Nodes**

| id | label / sublabel | kind | layer | Isometric illustration idea |
|---|---|---|---|---|
| `client` | mysql client / `COM_QUERY` | client | SQL | Laptop with a terminal window showing `mysql>` |
| `sql` | SQL layer / optimizer | framework | SQL | Stack of gears beside a query-plan card |
| `handler` | `ha_innobase` / handler API | framework | Handler | Socket-shaped adapter block, plug side up |
| `sec_root` | `idx_k` root / PAGE_LEVEL 1 | storage | B+Tree | One 16KB page slab with a "LVL 1" tab, arrows down |
| `sec_leaf` | `idx_k` leaf / PAGE_LEVEL 0 | storage | Page | Page slab with rows `(k,id)` as thin bars |
| `clu_root` | `PRIMARY` root / PAGE_LEVEL 1 | storage | B+Tree | Same as `sec_root`, brown tint, "PRIMARY" plate |
| `clu_leaf` | `PRIMARY` leaf / PAGE_LEVEL 0 | storage | Page | Thicker page slab, rows show all columns + 2 hidden stripes |

States (mutate targets): `handler` (list: template flags), `sec_leaf` (table: record fields), `clu_leaf` (table: record fields).

### Steps

##### 1.1 `move` — 쿼리 도착
*부제:* `SELECT v FROM t WHERE k = 200`이 SQL layer에 들어온다.
> 테이블 `t`는 `PRIMARY KEY(id)`와 secondary index `idx_k(k)`를 가진다. InnoDB의 모든 index는 16KB page로 이루어진 B+Tree다. `ROW_FORMAT`을 생략하면 `DYNAMIC`이고, `DYNAMIC`은 COMPACT 계열 record 형식을 쓴다.

| fact | value |
|---|---|
| `innodb_page_size` default | 16384 (`UNIV_PAGE_SIZE_DEF = 1 << 14`); min 4096, max 65536 |
| `innodb_default_row_format` default | `DYNAMIC` |
| COMPACT flag | `DICT_TF_COMPACT = 1` = "ROW_FORMAT != REDUNDANT" |

**Event** · `client → sql` · SQL · `SELECT v FROM t WHERE k = 200` · —
**Sources** · [G2] [G3] [G5] [G6]

##### 1.2 `mutate` — 읽을 컬럼으로 template 만들기
*부제:* `v`는 `idx_k`에 없으므로 clustered index를 반드시 읽어야 한다.
> 이 예시에서는 optimizer가 `idx_k`를 골랐다고 가정한다. `ha_innobase::build_template()`은 필요한 컬럼마다 index 안 위치를 찾는다. secondary index에 없는 컬럼이 하나라도 있으면 `need_to_access_clustered = true`가 된다.

| fact | value |
|---|---|
| `idx_k` leaf columns | `k`, then the PK columns (`id`) |
| Flag set when a column is missing | `prebuilt->need_to_access_clustered = true` |

**Event** · `sql → handler` · Handler · `index_read(idx_k, k=200)` · —
**State (handler)** · before: `need_to_access_clustered = ?` → after: `need_to_access_clustered = true`
**Sources** · [I16] [I10]

##### 1.3 `move` — root page에서 하강 시작
*부제:* `btr_cur_search_to_nth_level()`은 항상 root page부터 읽는다.
> root page 번호는 index metadata에 있다. root의 `PAGE_LEVEL`이 tree 높이를 알려 준다. leaf는 level 0이고, root는 가장 큰 level이다.

| fact | value |
|---|---|
| `PAGE_LEVEL` | page header offset 26, 2 bytes; leaf = 0 |
| tree height | `root PAGE_LEVEL + 1` (`cursor->tree_height = root_height + 1`) |
| `FIL_PAGE_TYPE` of an index page | `FIL_PAGE_INDEX = 17855` (0x45BF) |

**Event** · `handler → sec_root` · B+Tree · `search_to_nth_level(idx_k, level 0, PAGE_CUR_GE)` · 16384 B page
**Sources** · [I14] [I3] [I2]

##### 1.4 `mutate` — page 안에서 binary search
*부제:* page directory slot으로 binary search, 그다음 slot 안에서 linear search.
> page 끝에서 거꾸로 자라는 page directory는 2-byte slot의 배열이다. slot 하나가 4~8개 record를 "소유"한다. `page_cur_search_with_match()`는 slot 사이를 binary search로 좁힌 뒤, 그 slot이 소유한 record만 next 포인터로 훑는다.

| fact | value |
|---|---|
| slot size | `PAGE_DIR_SLOT_SIZE = 2` bytes |
| records owned per slot | min 4, max 8 (`PAGE_DIR_SLOT_MIN/MAX_N_OWNED`); first/last slot may own fewer |
| directory start | `PAGE_DIR = FIL_PAGE_DATA_END = 8` bytes before page end |

**Event** · `sec_root → sec_root` · Page · `page_cur_search_with_match(k=200)` · —
**State (sec_root)** · before: cursor = infimum → after: cursor = node pointer `(k=200 → child page)`
**Sources** · [I15] [I4]

##### 1.5 `move` — node pointer를 따라 leaf로
*부제:* 비-leaf record는 key + 자식 page 번호(4 bytes)다.
> 비-leaf page의 record는 "node pointer"다. 이 record는 자식 page의 가장 작은 key와 자식 page 번호를 담는다. record header의 status가 `REC_STATUS_NODE_PTR`인 것이 leaf record와 다른 점이다.

| fact | value |
|---|---|
| child page number field | `REC_NODE_PTR_SIZE = 4` bytes |
| record status values | 0 ordinary, 1 node ptr, 2 infimum, 3 supremum |

**Event** · `sec_root → sec_leaf` · B+Tree · `child page_no` (E.G. 5) · 16384 B page
**Sources** · [I7] [I14]

##### 1.6 `mutate` — secondary leaf에서 `(k=200, id=20)` 발견
*부제:* secondary index leaf에는 key와 PK만 있다.
> `idx_k` leaf record는 `k`와 PK 컬럼 `id`로만 이루어진다. InnoDB는 secondary index를 만들 때 clustered index를 유일하게 찾는 데 필요한 컬럼(PK)을 덧붙인다. `DB_TRX_ID`와 `DB_ROLL_PTR`은 clustered index record에만 있다.

| fact | value |
|---|---|
| secondary leaf record | `k (4 B)`, `id (4 B)` + 5-byte compact header |
| INT on disk | big-endian, sign bit flipped: `20 → 80 00 00 14` |

**Event** · `sec_leaf → sec_leaf` · Page · `match (k=200, id=20)` · 13 B record
**State (sec_leaf)** · before: cursor before `(200,20)` → after: cursor on `(200,20)`
**Sources** · [I10] [I9] [G7]

##### 1.7 `mutate` — secondary record는 바로 믿어도 되나?
*부제:* secondary page의 `PAGE_MAX_TRX_ID`로 MVCC 가시성을 대충 판단한다.
> secondary record에는 trx id가 없다. 그래서 InnoDB는 page header의 `PAGE_MAX_TRX_ID`를 read view와 비교한다. 이 값이 view의 `m_up_limit_id`보다 작으면, page의 모든 변경이 보인다. 그렇지 않으면 clustered index에서 올바른 버전을 찾아야 한다.

| fact | value |
|---|---|
| `PAGE_MAX_TRX_ID` | page header offset 18, 8 bytes; "defined only in secondary indexes and in the insert buffer tree" |
| check | `lock_sec_rec_cons_read_sees()` → `view->sees(max_trx_id)` = `max_trx_id < m_up_limit_id` |

**Event** · `sec_leaf → sec_leaf` · Page · `lock_sec_rec_cons_read_sees(PAGE_MAX_TRX_ID)` · 8 B
**State (sec_leaf)** · before: visibility unknown → after: visible (E.G.)
**Sources** · [I18] [I20] [M6]

##### 1.8 `move` — PK로 clustered index 다시 하강
*부제:* `id = 20`으로 `PRIMARY` B+Tree를 root부터 다시 탄다.
> `need_to_access_clustered`가 true이므로 `row_search_mvcc()`는 `row_sel_get_clust_rec_for_mysql()`를 부른다. secondary record에서 꺼낸 PK로 clustered index를 처음부터 다시 검색한다. 이것이 "두 번 하강"의 두 번째다.

| fact | value |
|---|---|
| function | `Row_sel_get_clust_rec_for_mysql::operator()` |
| search key | PK columns copied from the secondary record (`id = 20`) |

**Event** · `sec_leaf → clu_root` · B+Tree · `clust search id=20` · 16384 B page
**Sources** · [I17]

##### 1.9 `move` — clustered leaf로
*부제:* root의 node pointer가 `id=20`이 있는 leaf를 가리킨다.
> clustered index도 같은 방식으로 root → leaf로 내려간다. clustered index의 leaf page가 곧 테이블 데이터다.

| fact | value |
|---|---|
| leaf link | leaf pages on one level are a doubly linked list via `FIL_PAGE_PREV` (offset 8) / `FIL_PAGE_NEXT` (offset 12) |
| null link | `FIL_NULL = 0xFFFFFFFF` |

**Event** · `clu_root → clu_leaf` · B+Tree · `child page_no` (E.G. 4) · 16384 B page
**Sources** · [I1] [I22]

##### 1.10 `mutate` — 전체 row 확인
*부제:* clustered leaf record = PK + `DB_TRX_ID` + `DB_ROLL_PTR` + 나머지 컬럼.
> clustered leaf record의 필드 순서는 PK, 숨은 컬럼 `DB_TRX_ID`(6 bytes)와 `DB_ROLL_PTR`(7 bytes), 나머지 컬럼이다. `DB_TRX_ID`는 마지막으로 바꾼 transaction이고, `DB_ROLL_PTR`은 이전 버전이 있는 undo record를 가리킨다. 아래 decoder D1.4가 이 record다.

| fact | value |
|---|---|
| `DATA_TRX_ID_LEN` | 6 |
| `DATA_ROLL_PTR_LEN` | 7 |
| record size here | 5 B header + 4 + 6 + 7 + 4 + 4 = 30 B |

**Event** · `clu_leaf → clu_leaf` · Page · `row (20,200,2)` · 30 B record
**State (clu_leaf)** · before: cursor before `id=20` → after: cursor on `id=20`, `v=2`
**Sources** · [I9] [I8] [I6]

##### 1.11 `move` — 결과 반환
*부제:* `v = 2`가 handler를 거쳐 client로 간다.
> 첫 쿼리는 secondary index 하강 한 번과 clustered index 하강 한 번으로 끝난다. 범위 검색이면 secondary record마다 이 clustered 검색이 반복된다.

| fact | value |
|---|---|
| result | `v = 2` |
| descents | 2 (one per B+Tree) |

**Event** · `clu_leaf → client` · SQL · `1 row: v=2` · —
**Sources** · [I17]

##### 1.12 `move` — covering index 쿼리
*부제:* `SELECT id FROM t WHERE k = 200`은 `idx_k`만으로 답할 수 있다.
> 필요한 컬럼 `k`와 `id`가 모두 `idx_k` leaf에 있으므로 template의 모든 필드가 secondary index에서 나온다. `need_to_access_clustered`는 false로 남는다. EXPLAIN의 Extra에는 `Using index`가 뜬다.

| fact | value |
|---|---|
| initial value | `need_to_access_clustered = (index == clust_index)` → false for `idx_k` |
| EXPLAIN Extra | `Using index` (`ET_USING_INDEX`) |

**Event** · `client → sql` · SQL · `SELECT id FROM t WHERE k = 200` · —
**Sources** · [I16] [I19]

##### 1.13 `mutate` — covering이어도 clustered를 볼 때
*부제:* `PAGE_MAX_TRX_ID`가 너무 새로우면 결국 clustered index로 간다.
> covering index라도 secondary page에 최근 변경이 있으면 `lock_sec_rec_cons_read_sees()`가 false다. 그러면 `row_search_mvcc()`는 ICP 조건이 맞을 때 `requires_clust_rec`로 가서 clustered record와 undo로 올바른 버전을 만든다. covering index는 "항상 clustered를 안 본다"가 아니다.

| fact | value |
|---|---|
| branch | `!lock_sec_rec_cons_read_sees(...)` → `goto requires_clust_rec` (on `ICP_MATCH`) |
| reason (source comment) | "we can only get the undo information via the clustered index record" |

**Event** · `sec_leaf → clu_root` · B+Tree · `requires_clust_rec (MVCC)` · 16384 B page
**State (sec_leaf)** · before: covering, no clustered access → after: clustered access for this record
**Sources** · [I17] [I18]

##### 1.14 `mutate` — PK가 없다면
*부제:* `GEN_CLUST_INDEX`와 6-byte `DB_ROW_ID`.
> PK가 없으면 SQL layer는 `UNIQUE NOT NULL` key를 맨 앞으로 정렬하고, 첫 번째 key를 PK로 삼는다. 그런 key도 없으면 InnoDB가 `GEN_CLUST_INDEX`를 만들고, 6-byte `DB_ROW_ID`로 정렬한다. row id는 모든 테이블이 공유하는 전역 counter에서 `dict_sys` mutex를 잡고 받는다.

| fact | value |
|---|---|
| implicit index name | `GEN_CLUST_INDEX` |
| `DATA_ROW_ID_LEN` | 6 |
| row id counter | `dict_sys->row_id++` under `dict_sys` mutex; persisted every `DICT_HDR_ROW_ID_WRITE_MARGIN = 256` ids |

**Event** · `handler → clu_leaf` · Handler · `create_clustered_index_when_no_primary()` · 6 B row id
**State (clu_leaf)** · before: key = `id` → after: key = `DB_ROW_ID` (hypothetical table without PK)
**Sources** · [I11] [I12] [I13] [I8]

### Decoder records

**D1.1 FIL header (page offset 0–37, 38 bytes)** — the `PRIMARY` leaf page holding the 3 rows. Layer bar: `FIL header`.

| offset | field | bytes (hex) | value | meaning |
|---|---|---|---|---|
| 0 | `FIL_PAGE_SPACE_OR_CHKSUM` | `1A 2B 3C 4D` | E.G. | page checksum (new style) |
| 4 | `FIL_PAGE_OFFSET` | `00 00 00 04` | E.G. 4 | page number in the tablespace |
| 8 | `FIL_PAGE_PREV` | `FF FF FF FF` | `FIL_NULL` | no left sibling |
| 12 | `FIL_PAGE_NEXT` | `FF FF FF FF` | `FIL_NULL` | no right sibling |
| 16 | `FIL_PAGE_LSN` | `00 00 00 00 01 3A 5F 10` | E.G. | LSN of the newest change to this page |
| 24 | `FIL_PAGE_TYPE` | `45 BF` | 17855 | `FIL_PAGE_INDEX` |
| 26 | `FIL_PAGE_FILE_FLUSH_LSN` | `00 00 00 00 00 00 00 00` | 0 | only used on page 0 of the system tablespace |
| 34 | `FIL_PAGE_SPACE_ID` | `00 00 00 05` | E.G. 5 | tablespace id |

Sources: [I1] [I2] [I22]

**D1.2 Index page header (page offset 38–93, 56 bytes)** — same page, after inserting `id` 10, 20, 30 in order. Layer bar: `PAGE header` · `FSEG headers`.

| offset | field | bytes | value | meaning |
|---|---|---|---|---|
| 38 | `PAGE_N_DIR_SLOTS` | `00 02` | 2 | infimum slot + supremum slot |
| 40 | `PAGE_HEAP_TOP` | `00 D2` | 210 | first free byte of the record heap |
| 42 | `PAGE_N_HEAP` | `80 05` | 0x8000 \| 5 | bit 15 = compact format; 5 = infimum, supremum, 3 records |
| 44 | `PAGE_FREE` | `00 00` | 0 | no deleted-record free list |
| 46 | `PAGE_GARBAGE` | `00 00` | 0 | bytes in deleted records |
| 48 | `PAGE_LAST_INSERT` | `00 B9` | 185 | origin of record `id=30` |
| 50 | `PAGE_DIRECTION` | `00 02` | `PAGE_RIGHT` | last inserts went right |
| 52 | `PAGE_N_DIRECTION` | `00 02` | 2 | consecutive inserts in that direction |
| 54 | `PAGE_N_RECS` | `00 03` | 3 | user records |
| 56 | `PAGE_MAX_TRX_ID` | `00 ×8` | 0 | defined only for secondary indexes |
| 64 | `PAGE_LEVEL` | `00 00` | 0 | leaf |
| 66 | `PAGE_INDEX_ID` | `00 00 00 00 00 00 00 9C` | E.G. 156 | index id |
| 74 | `PAGE_BTR_SEG_LEAF` | 10 bytes | E.G. | FSEG header: space(4) page_no(4) offset(2); root page only |
| 84 | `PAGE_BTR_SEG_TOP` | 10 bytes | E.G. | FSEG header for non-leaf segment; root page only |

Derivation: `PAGE_DATA = 38 + 36 + 2 × 10 = 94`. Infimum origin = 94 + 5 = 99, supremum origin = 94 + 2×5 + 8 = 112, supremum end = 120. With three 30-byte records, heap top = 120 + 90 = 210. `PAGE_DIRECTION`/`PAGE_N_DIRECTION` follow `page_cur_insert_rec_low` step 6: first insert sets `PAGE_NO_DIRECTION, 0`; each insert right after the last one adds 1 with `PAGE_RIGHT`.
Sources: [I3] [I21] [P5] [P15]

**D1.3 Infimum and supremum (page offset 94–119, 26 bytes)** — the fixed bytes every new COMPACT page starts with.

| offset | field | bytes | value |
|---|---|---|---|
| 94 | infimum info bits / `n_owned` | `01` | info 0, n_owned 1 |
| 95 | infimum `heap_no` / status | `00 02` | heap_no 0, `REC_STATUS_INFIMUM` (2) |
| 97 | infimum next | `00 1A` | +26 → 125 (record `id=10`) — after the 3 inserts (empty page: `00 0D` → 112) |
| 99 | infimum data | `69 6E 66 69 6D 75 6D 00` | `"infimum\0"` |
| 107 | supremum info bits / `n_owned` | `04` | n_owned 4 after the 3 inserts (empty page: `01`) |
| 108 | supremum `heap_no` / status | `00 0B` | heap_no 1, `REC_STATUS_SUPREMUM` (3) |
| 110 | supremum next | `00 00` | end of list |
| 112 | supremum data | `73 75 70 72 65 6D 75 6D` | `"supremum"` |

Sources: [I5] [I6] [I7] [I4]

**D1.4 Clustered leaf record `id=20` (5-byte header + 25-byte data, origin at page offset 155)** — layer bar: `record header` · `PK` · `hidden columns` · `columns`.

| offset from origin | field | bytes | value | meaning |
|---|---|---|---|---|
| −5 | info bits (high 4) + `n_owned` (low 4) | `00` | info 0, owned 0 | `REC_INFO_DELETED_FLAG` = 0x20, `MIN_REC_FLAG` = 0x10 |
| −4 | `heap_no` (13 bits) + status (3 bits) | `00 18` | heap_no 3, status 0 | `REC_HEAP_NO_SHIFT = 3` |
| −2 | next record (relative, 16 bits) | `00 1E` | +30 → 185 | `REC_NEXT_MASK = 0xFFFF` |
| 0 | `id` | `80 00 00 14` | 20 | sign bit flipped |
| 4 | `DB_TRX_ID` | `00 00 00 00 0F 11` | E.G. 3857 | last modifier |
| 10 | `DB_ROLL_PTR` | `85 00 00 01 23 01 10` | E.G. | insert=1, rseg 5, page 291, offset 272 (see D6.3) |
| 17 | `k` | `80 00 00 C8` | 200 | |
| 21 | `v` | `80 00 00 02` | 2 | |

The last record, `id=30` (origin 185), has next `FF B7` (= −73, which points back to the supremum at 112).
Sources: [I6] [I8] [I9] [G7] [M2]

**D1.5 `idx_k` records** — leaf record `(k=200, id=20)`, 5 + 8 bytes, and a node-pointer record on the root, 5 + 4 + 4 bytes.

| record | field | bytes | value |
|---|---|---|---|
| leaf | header | `00 00 18 00 0D` | owned 0, heap_no 3, status 0, next E.G. +13 |
| leaf | `k` | `80 00 00 C8` | 200 |
| leaf | `id` | `80 00 00 14` | 20 |
| node ptr | header | `00 00 19 00 0D` | heap_no 3, status 1 (`REC_STATUS_NODE_PTR`): `3<<3 \| 1 = 0x19`; next E.G. |
| node ptr | key `k` (+ `id`) | `80 00 00 C8 …` | smallest key on child (E.G.) |
| node ptr | child page no | `00 00 00 05` | E.G. 5 |

Sources: [I7] [I10] [I6]. (Whether a node pointer in a non-unique secondary index carries the PK suffix is **unverified** here; the key bytes are marked E.G.)

### Self-check

1. **Q:** In `t`, what bytes does an `idx_k` leaf record hold besides its header? **A:** `k` and the PK `id`, 4 bytes each. No `DB_TRX_ID`/`DB_ROLL_PTR`.
2. **Q:** Why does `SELECT v … WHERE k=200` read two B+Trees? **A:** `v` is not in `idx_k`, so `need_to_access_clustered` is true, and InnoDB searches `PRIMARY` with the PK taken from the secondary record.
3. **Q:** Give one case where a covering-index read still visits the clustered index. **A:** When the secondary page's `PAGE_MAX_TRX_ID` is not below the read view's `m_up_limit_id`. The right version is only reachable through the clustered record's undo chain.
4. **Q:** A table has no PK and no `UNIQUE NOT NULL` key. What is the clustered key? **A:** `GEN_CLUST_INDEX` on a 6-byte `DB_ROW_ID`, taken from a global counter.
5. **Q:** How is a page searched? **A:** Binary search over 2-byte page-directory slots, then a linear walk inside the slot (4–8 records).

---

## Lesson 2 — `page-split-merge`

**Goal:** See a full leaf page split when it gets an insert. Sequential and random inserts split differently. Then see how deletes and purge lead to a merge below `MERGE_THRESHOLD`.

**Interview questions it answers**
- Why does an `AUTO_INCREMENT` PK fill pages better than a random UUID PK?
- What happens when the root page fills?
- When does InnoDB merge pages, and what is `MERGE_THRESHOLD`?
- Why does `DELETE` not free space at once?

**Layer selector:** `Handler` · `B+Tree` · `Page`

**Nodes**

| id | label / sublabel | kind | layer | Isometric illustration idea |
|---|---|---|---|---|
| `client` | mysql client | client | Handler | Laptop sending `INSERT` cards |
| `btr` | `btr0btr` / tree ops | framework | B+Tree | Crane arm over pages |
| `parent` | parent page / level 1 | storage | B+Tree | Page slab with node-pointer bars |
| `leaf_a` | leaf A / page N | storage | Page | Page slab; fill gauge on its side |
| `leaf_b` | leaf B / page N+1 | storage | Page | New page slab that draws in on split |
| `purge` | purge thread | container | Handler | Small robot with a broom |

States: `leaf_a`, `leaf_b`, `parent` (table: records and page header fields).

### Steps

##### 2.1 `move` — 순차 INSERT
*부제:* PK가 계속 증가하는 INSERT가 같은 leaf page 끝에 붙는다.
> `id`가 증가하는 INSERT는 매번 leaf page의 마지막 record 뒤에 들어간다. InnoDB는 page header에 마지막 insert 위치와 방향을 적어 두고, 이 정보를 split 판단에 쓴다.

| fact | value |
|---|---|
| `PAGE_LAST_INSERT` / `PAGE_DIRECTION` / `PAGE_N_DIRECTION` | header offsets 10 / 12 / 14 |
| direction values | `PAGE_LEFT 1`, `PAGE_RIGHT 2`, `PAGE_SAME_REC 3`, `PAGE_SAME_PAGE 4`, `PAGE_NO_DIRECTION 5` |

**Event** · `client → leaf_a` · Page · `INSERT id=40` · 30 B record
**Sources** · [P5] [P15]

##### 2.2 `mutate` — 방향 카운터 증가
*부제:* 직전 insert 바로 뒤에 들어오면 `PAGE_RIGHT`, 카운터 +1.
> 새 record가 `PAGE_LAST_INSERT` 바로 다음이면 `PAGE_DIRECTION = PAGE_RIGHT`, `PAGE_N_DIRECTION`이 1 늘어난다. 그 밖의 위치면 `PAGE_NO_DIRECTION`, 0으로 초기화된다.

| fact | value |
|---|---|
| rule | `last_insert == current_rec && direction != PAGE_LEFT` → `PAGE_RIGHT`, `n_direction + 1` |
| reset | otherwise `PAGE_NO_DIRECTION`, `n_direction = 0` |

**Event** · `leaf_a → leaf_a` · Page · `PAGE_N_DIRECTION++` · 2 B
**State (leaf_a)** · before: `PAGE_DIRECTION=RIGHT, N_DIRECTION=2, N_RECS=3` → after: `RIGHT, 3, 4`
**Sources** · [P15]

##### 2.3 `mutate` — page가 가득 참
*부제:* optimistic insert 실패 → tree latch를 잡고 pessimistic insert.
> page에 공간이 없으면 insert는 page 하나만 건드리는 optimistic 경로에서 실패한다. 다시 index tree x-latch를 잡고 `btr_page_split_and_insert()`로 간다. 이 함수는 되돌릴 수 없으므로, 호출 전에 빈 page 2개를 확보해 두어야 한다.

| fact | value |
|---|---|
| precondition (source comment) | "enough free disk space (2 pages) must be guaranteed" |
| latch | mtr holds an x-latch on the index tree |

**Event** · `leaf_a → btr` · B+Tree · `btr_page_split_and_insert()` · 16384 B page
**State (leaf_a)** · before: free space < record size → after: split pending
**Sources** · [P1]

##### 2.4 `mutate` — split 지점 결정 (순차)
*부제:* `btr_page_get_split_rec_to_right()`: 새 record에서 자른다.
> 새 insert 위치가 `PAGE_LAST_INSERT`와 같으면 InnoDB는 순차 insert로 본다. 그 뒤에 user record가 0~1개면 새 record 자체에서 자른다. 그래서 새 page에는 새 record만 들어가고, 기존 page는 꽉 찬 채로 남는다. 뒤에 2개 이상 있으면 1개만 남기고 잘라낸다(adaptive hash index를 위해).

| fact | value |
|---|---|
| sequential test | `PAGE_LAST_INSERT == insert_point` |
| split record | `nullptr` (split at the new record), or `next_next_rec` if ≥ 2 records follow |
| direction / hint | `FSP_UP`, `hint_page_no = page_no + 1` |

**Event** · `btr → leaf_a` · B+Tree · `split_rec = new record` · —
**State (leaf_a)** · before: `split_rec = ?` → after: `split_rec = (new id=41)`
**Sources** · [P2] [P1]

##### 2.5 `mutate` — 새 page 할당
*부제:* 2단계: index segment에서 page N+1 근처를 할당한다.
> `btr_page_alloc()`은 hint page 번호와 방향을 받아 같은 index의 segment에서 page를 할당한다. 새 page는 같은 `PAGE_LEVEL`과 `PAGE_INDEX_ID`로 초기화된다.

| fact | value |
|---|---|
| step label in source | "2. Allocate a new page to the index" |
| extent size (16KB pages) | 64 pages = 1 MiB |

**Event** · `btr → leaf_b` · Page · `btr_page_alloc(hint N+1, FSP_UP)` · 16384 B page
**State (leaf_b)** · before: (not allocated) → after: empty leaf, level 0
**Sources** · [P1] [I21]

##### 2.6 `mutate` — tree 구조부터 바꾼다
*부제:* 4단계: parent에 node pointer 추가, 형제 링크 연결.
> `btr_attach_half_pages()`가 parent page에 새 page를 가리키는 node pointer를 넣는다. 같은 level의 page는 `FIL_PAGE_PREV`/`FIL_PAGE_NEXT`로 양방향 연결되므로, A ↔ B 링크도 고친다. record 이동은 그 다음이다.

| fact | value |
|---|---|
| step label | "4. Do first the modifications in the tree structure" |
| sibling links | `FIL_PAGE_PREV` offset 8, `FIL_PAGE_NEXT` offset 12 |

**Event** · `btr → parent` · B+Tree · `insert node ptr (min key of B → page N+1)` · E.G. 13 B
**State (parent)** · before: `[…, (10→N)]` → after: `[…, (10→N), (41→N+1)]`
**Sources** · [P1] [I1]

##### 2.7 `mutate` — record 이동과 insert
*부제:* 5단계 record 이동, 7단계 새 record insert.
> split record 뒤의 record를 새 page로 옮기고(`page_move_rec_list_end`), lock table도 함께 옮긴다(`lock_update_split_*`). 그다음 cursor를 다시 잡아 새 record를 insert한다. 그래도 안 들어가면 8단계에서 page를 재구성하고 다시 시도한다.

| fact | value |
|---|---|
| step labels | "5. Move then the records to the new page", "7. Reposition the cursor for insert and try insertion", "8. If insert did not fit, try page reorganization" |
| sequential result | A stays full, B holds only `id=41` |

**Event** · `leaf_a → leaf_b` · Page · `insert id=41 into B` · 30 B record
**State (leaf_b)** · before: 0 records → after: 1 record `id=41`
**Sources** · [P1]

##### 2.8 `mutate` — 랜덤 INSERT면?
*부제:* 두 heuristic 모두 아니면 page 가운데 record에서 자른다.
> insert 위치가 `PAGE_LAST_INSERT`와 무관하면(예: random UUID PK) `page_get_middle_rec()`에서 자른다. 두 page는 대략 반씩 차고, 남은 반은 나중 insert가 채울 때까지 빈 공간이 된다. 순차 PK와 랜덤 PK의 page 채움률 차이는 여기서 나온다.

| fact | value |
|---|---|
| random split record | `page_get_middle_rec(page)` (if `n_recs > 1`) |
| sequential split | at the new record → old page stays full |
| `innodb_fill_factor` default | 100 — "Percentage of B-tree page filled during bulk insert" (sorted index build only, not normal inserts) |

**Event** · `btr → leaf_a` · B+Tree · `split_rec = middle` · —
**State (leaf_a)** · before: 100% full → after: about half (split at middle record)
**Sources** · [P1] [P2] [P3] [P12]

##### 2.9 `mutate` — root가 가득 차면
*부제:* `btr_root_raise_and_insert()`: tree 높이 +1, root page 번호는 그대로.
> root가 가득 차면 root의 record를 새 page로 모두 옮긴다. 그다음 root를 비우고, 새 page를 가리키는 node pointer 하나만 넣은 뒤, 새 page를 split한다. 그 node pointer에는 `REC_INFO_MIN_REC_FLAG`가 붙는다. root page 위치가 바뀌지 않으므로 index metadata를 고칠 필요가 없다.

| fact | value |
|---|---|
| procedure (source comment) | "moving the root records to the new page, emptying the root, putting a node pointer to the new page, and then splitting the new page" |
| `REC_INFO_MIN_REC_FLAG` | 0x10 (leftmost record of a non-leaf level) |

**Event** · `btr → parent` · B+Tree · `root raise: level L → L+1` · 16384 B page
**State (parent)** · before: root level 1, full → after: root level 2, 1 node ptr
**Sources** · [P4] [P14]

##### 2.10 `move` — DELETE는 표시만 한다
*부제:* `DELETE`는 record에 delete mark를 붙이고 undo를 남긴다.
> `btr_cur_del_mark_set_clust_rec()`는 record의 info bits에 delete flag를 켠다. undo record를 쓰고, `DB_TRX_ID`/`DB_ROLL_PTR`을 갱신한다. 이때 record는 물리적으로 page에 남아 있다. 다른 transaction의 read view가 이전 버전을 볼 수 있기 때문이다.

| fact | value |
|---|---|
| delete flag | `REC_INFO_DELETED_FLAG = 0x20` in the record header info bits |
| undo type | `TRX_UNDO_DEL_MARK_REC = 14` |

**Event** · `client → leaf_a` · Page · `DELETE … (delete-mark)` · 1 B info bits
**State (leaf_a)** · before: record `id=20` live → after: `id=20` delete-marked
**Sources** · [P16] [I6] [M3]

##### 2.11 `mutate` — purge가 물리적으로 지운다
*부제:* `row_purge_remove_clust_if_poss()`: leaf만 먼저, 안 되면 tree 연산.
> purge thread는 더 이상 아무 read view도 필요 없는 delete-marked record를 지운다. 먼저 `BTR_MODIFY_LEAF`로 optimistic delete를 시도하고, 실패하면 tree latch를 잡고 pessimistic delete를 한다. pessimistic delete 끝에서 `btr_cur_compress_if_useful()`이 merge가 필요한지 본다.

| fact | value |
|---|---|
| first try | `row_purge_remove_clust_if_poss_low(node, BTR_MODIFY_LEAF)` |
| merge check | `btr_cur_pessimistic_delete()` → `btr_cur_compress_if_useful()` |

**Event** · `purge → leaf_a` · Page · `remove delete-marked id=20` · 30 B freed
**State (leaf_a)** · before: `N_RECS=k`, delete-marked present → after: `N_RECS=k−1`, `PAGE_GARBAGE += 30`
**Sources** · [P17] [P9]

##### 2.12 `mutate` — merge 할까?
*부제:* data size < page × `MERGE_THRESHOLD`% 이면 merge 권고.
> `btr_cur_compress_recommendation()`은 page의 data 크기가 `UNIV_PAGE_SIZE × merge_threshold / 100`보다 작을 때 merge를 권한다. 그 level에 page가 하나뿐일 때도 권한다. 단 root page는 대상이 아니다. 기본값 50이면 16KB page에서 8192 bytes 미만이다.

| fact | value |
|---|---|
| `DICT_INDEX_MERGE_THRESHOLD_DEFAULT` | 50 |
| limit for 16KB | 16384 × 50 / 100 = 8192 bytes |
| per-table/index override | `MERGE_THRESHOLD=NN` in the COMMENT string; valid 1–50, otherwise warning and ignored |

**Event** · `btr → leaf_a` · B+Tree · `compress_recommendation: data 7.9 KB < 8 KB` (E.G.) · —
**State (leaf_a)** · before: keep → after: merge recommended
**Sources** · [P6] [P7] [P8] [P18]

##### 2.13 `mutate` — 왼쪽 형제와 합치기
*부제:* `btr_compress()`: 왼쪽 먼저, 안 되면 오른쪽. 그 level에 page가 하나뿐이면 위로 올린다.
> `btr_can_merge_with_page()`가 형제 page에 record가 모두 들어가는지 확인한다(필요하면 재구성 후 크기까지 계산). 들어가면 record를 옮기고, parent에서 node pointer를 지우고, 빈 page를 해제한다. 그 level에 page가 하나뿐이면 `btr_lift_page_up()`으로 한 level을 없앤다.

| fact | value |
|---|---|
| order | left sibling (`is_left`) first, then right |
| fit check | `data_size > page_get_max_insert_size_after_reorganize(mpage, n_recs)` → no merge |
| only page on level | `btr_lift_page_up()` |

**Event** · `leaf_b → leaf_a` · B+Tree · `merge into left sibling, free page` · 16384 B page freed
**State (parent)** · before: `[(10→N), (41→N+1)]` → after: `[(10→N)]`
**Sources** · [P10] [P11]

### Decoder records

**D2.1 Leaf A page header, before and after the sequential split** — offsets as in D1.2. Values for a page full of 30-byte records are E.G.

| offset | field | before split | after split |
|---|---|---|---|
| 12 | `FIL_PAGE_NEXT` | `FF FF FF FF` (`FIL_NULL`) | `00 00 00 05` (E.G. page N+1) |
| 48 | `PAGE_LAST_INSERT` | origin of last record (E.G.) | unchanged (the new record went to B) |
| 50 | `PAGE_DIRECTION` | `00 02` `PAGE_RIGHT` | `00 02` |
| 54 | `PAGE_N_RECS` | E.G. `01 F0` (496) | unchanged |

**D2.2 Leaf B page header after the split**

| offset | field | bytes | value |
|---|---|---|---|
| 4 | `FIL_PAGE_OFFSET` | `00 00 00 05` | E.G. N+1 |
| 8 | `FIL_PAGE_PREV` | `00 00 00 04` | E.G. N |
| 12 | `FIL_PAGE_NEXT` | `FF FF FF FF` | `FIL_NULL` |
| 54 | `PAGE_N_RECS` | `00 01` | 1 |
| 64 | `PAGE_LEVEL` | `00 00` | 0 |

**D2.3 New node pointer in the parent** — header (status 1) + key `id` + child page no.

| field | bytes | value |
|---|---|---|
| header | `00 00 ?? ?? ??` | status `REC_STATUS_NODE_PTR`, heap_no and next E.G. |
| `id` | `80 00 00 29` | 41 |
| child page no | `00 00 00 05` | E.G. N+1 |

Sources for D2.*: [I1] [I3] [I7] [P1] [P5]

### Self-check

1. **Q:** Why does an increasing PK leave the old page full after a split? **A:** `btr_page_get_split_rec_to_right` sees the insert right after `PAGE_LAST_INSERT` and splits at the new record. Only the new record moves to the new page.
2. **Q:** Where does a random-key split cut? **A:** At `page_get_middle_rec()`, so both pages end up about half full.
3. **Q:** How does the tree grow taller, and does the root move? **A:** The root's records move to a new page, the root keeps one node pointer, and its level goes up by 1. The root page number stays the same.
4. **Q:** With the default settings, below what data size is a 16KB page a merge candidate? **A:** 8192 bytes (`MERGE_THRESHOLD` 50%). The root is never merged.
5. **Q:** Why doesn't `DELETE` merge pages right away? **A:** `DELETE` only sets the delete flag (0x20). Purge removes the record later. The merge check runs in that physical (pessimistic) delete.

---

## Lesson 3 — `buffer-pool-lru`

**Goal:** Follow one page read into the buffer pool. See why it lands at the midpoint (head of the old sublist), when it is made young, and how eviction finds a free block.

**Interview questions it answers**
- How is InnoDB's LRU different from plain LRU, and why (full table scans)?
- What do `innodb_old_blocks_pct` and `innodb_old_blocks_time` do?
- What happens when there is no free page? What about a dirty page at the tail?
- What are the buffer pool's default size, instances, and chunk size?

**Layer selector:** `Handler` · `Buffer Pool` · `Disk`

**Nodes**

| id | label / sublabel | kind | layer | Isometric illustration idea |
|---|---|---|---|---|
| `handler` | `ha_innobase` / page request | framework | Handler | Adapter block holding a page id tag `(space, page_no)` |
| `bp_hash` | page hash / lookup | framework | Buffer Pool | Grid of pigeonholes |
| `lru` | LRU list / young ⟶ old | framework | Buffer Pool | Long conveyor belt in two colors; a midpoint marker post at 5/8 |
| `free` | free list | framework | Buffer Pool | Short stack of empty frames |
| `flush` | flush list / dirty pages | framework | Buffer Pool | Belt of pages with red "dirty" flags, LSN tags |
| `ibd` | `t.ibd` / tablespace file | storage | Disk | Disk cylinder with page grid on its side |

States: `lru` (list: young head … `LRU_old` … tail), `free` (list), `flush` (list).

### Steps

##### 3.1 `move` — page 요청
*부제:* `buf_page_get_gen()`이 `(space, page_no)`로 buffer pool을 찾는다.
> B+Tree가 page를 읽을 때마다 `buf_page_get_gen()`을 통한다. buffer pool에 있으면 바로 쓰고, 없으면 디스크에서 읽어 와야 한다.

| fact | value |
|---|---|
| `innodb_buffer_pool_size` default | 134217728 (128 MiB, `srv_buf_pool_def_size`) |
| page frame | 16384 B (one page) |

**Event** · `handler → bp_hash` · Buffer Pool · `buf_page_get_gen(5, 4)` (E.G. ids) · —
**Sources** · [B16] [B1]

##### 3.2 `mutate` — miss: free block 구하기
*부제:* free list에서 먼저, 없으면 LRU 끝에서 clean page를 비운다.
> `buf_LRU_get_free_block()`은 free list에서 block을 꺼낸다. 비어 있으면 LRU 끝에서 최대 `innodb_lru_scan_depth`만큼 clean page를 찾아 free list로 보낸다. 그래도 없으면 LRU 끝의 dirty page 하나를 flush해서 비운다.

| fact | value |
|---|---|
| order (source comment) | free list → scan LRU for a clean block → flush one dirty page from the LRU tail → scan the whole LRU |
| `innodb_lru_scan_depth` default | 1024 (min 100) |

**Event** · `bp_hash → free` · Buffer Pool · `buf_LRU_get_free_block()` · 16384 B frame
**State (free)** · before: `[f1, f2, …]` → after: `[f2, …]` (f1 taken)
**Sources** · [B17] [B13]

##### 3.3 `move` — 디스크에서 읽기
*부제:* `t.ibd`에서 16KB page를 읽어 frame에 채운다.
> 읽은 page는 `buf_page_init_for_read()`로 초기화되고 page hash에 등록된다. 이 함수는 page를 LRU의 "old" 쪽에 넣으라고 요청한다.

| fact | value |
|---|---|
| call | `buf_LRU_add_block(bpage, true /* to old blocks */)` |
| size | 16384 B |

**Event** · `ibd → lru` · Disk · `read page (5, 4)` (E.G.) · 16384 B
**Sources** · [B7]

##### 3.4 `mutate` — midpoint에 삽입
*부제:* 새 page는 LRU 맨 앞이 아니라 old sublist 맨 앞(`LRU_old` 뒤)에 들어간다.
> `buf_LRU_add_block_low()`는 `old = true`이면 page를 `LRU_old` 바로 뒤에 넣고 `old` flag를 켠다. LRU가 아직 512 page보다 짧으면 old 구간이 없으므로 그냥 맨 앞에 넣는다.

| fact | value |
|---|---|
| insert point | `UT_LIST_INSERT_AFTER(LRU, LRU_old, bpage)` |
| `BUF_LRU_OLD_MIN_LEN` | 512 (= 8 × 1024 / 16) |
| new page from `buf_page_create()` | goes to the young head (`old = false`) |

**Event** · `lru → lru` · Buffer Pool · `insert at LRU_old (midpoint)` · —
**State (lru)** · before: `young[ … ] | old[ o1 … tail ]` → after: `young[ … ] | old[ P, o1 … tail ]`
**Sources** · [B6] [B4] [B7]

##### 3.5 `mutate` — old 구간 길이 유지
*부제:* old sublist는 LRU의 약 37%(3/8)로 유지된다.
> `innodb_old_blocks_pct`는 `LRU_old_ratio`로 바뀐다(분모 1024). page가 들어오고 나갈 때 `buf_LRU_old_adjust_len()`이 `LRU_old` 포인터를 옮겨, 목표 길이와 20 page 이상 차이 나지 않게 한다.

| fact | value |
|---|---|
| `innodb_old_blocks_pct` default | `100 * 3 / 8` = 37 (range 5–95) |
| `BUF_LRU_OLD_RATIO_DIV` | 1024 |
| `BUF_LRU_OLD_TOLERANCE` | 20 pages |

**Event** · `lru → lru` · Buffer Pool · `buf_LRU_old_adjust_len()` · —
**State (lru)** · before: old len = target + 21 (E.G.) → after: old len within ±20 of target
**Sources** · [B9] [B4] [B5]

##### 3.6 `mutate` — 바로 다시 읽어도 young이 아니다
*부제:* 첫 접근 후 1000 ms 안의 재접근은 young으로 올리지 않는다.
> full scan은 한 page를 짧은 시간에 여러 번 읽는다. `buf_page_peek_if_too_old()`는 old page의 첫 접근 시각과 지금 차이가 `innodb_old_blocks_time`보다 작으면 false를 돌려준다. 그 page는 old에 남고 `n_pages_not_made_young`만 늘어난다.

| fact | value |
|---|---|
| `innodb_old_blocks_time` default | 1000 ms (0 disables) |
| counter | `buf_pool->stat.n_pages_not_made_young++` |

**Event** · `handler → lru` · Buffer Pool · `access P (Δt < 1000 ms)` · —
**State (lru)** · before: P in old → after: P in old (not made young)
**Sources** · [B8] [B9]

##### 3.7 `mutate` — 1초 뒤 재접근: young으로
*부제:* `buf_page_make_young()`이 page를 LRU 맨 앞으로 옮긴다.
> 첫 접근 뒤 `innodb_old_blocks_time` 이상 지나서 다시 접근하면 page가 정말 자주 쓰인다고 본다. page는 LRU head(young 맨 앞)로 옮겨지고 `old` flag가 꺼진다.

| fact | value |
|---|---|
| condition | `now − access_time ≥ old_threshold` and `bpage->old` |
| counter | `n_pages_made_young++` |

**Event** · `lru → lru` · Buffer Pool · `buf_page_make_young(P)` · —
**State (lru)** · before: `young[a,b,…] | old[…,P,…]` → after: `young[P,a,b,…] | old[…]`
**Sources** · [B8] [B10] [B18]

##### 3.8 `mutate` — young 앞쪽 1/4은 움직이지 않는다
*부제:* 이미 충분히 young인 page는 다시 옮기지 않는다(mutex 비용 절약).
> young page에 접근할 때는 `buf_page_peek_if_young()`이 그 page 이후 evict된 page 수를 본다. 그 수가 young 구간 크기의 1/4보다 작으면 page를 옮기지 않는다. 뜨거운 page를 계속 맨 앞으로 옮기는 비용을 줄인다.

| fact | value |
|---|---|
| test | `freed_page_clock(pool) < freed_page_clock(page) + curr_size × (1024 − LRU_old_ratio) / (1024 × 4)` |
| field | `buf_page_t::freed_page_clock` (32-bit) |

**Event** · `handler → lru` · Buffer Pool · `access hot page (no move)` · —
**State (lru)** · before: H at young position 3 → after: H at young position 3
**Sources** · [B8] [B12]

##### 3.9 `mutate` — 아직 evict 전이면 아무것도 안 옮긴다
*부제:* `freed_page_clock == 0`이면 LRU 순서를 건드리지 않는다.
> buffer pool이 아직 한 번도 page를 evict하지 않았다면(warm-up 또는 전부 메모리에 들어가는 workload), `buf_page_peek_if_too_old()`는 바로 false를 돌려준다. 메모리가 충분하면 LRU 관리 비용이 0에 가깝다.

| fact | value |
|---|---|
| source comment | "If eviction has not started yet, do not update the statistics or move blocks in the LRU list." |

**Event** · `lru → lru` · Buffer Pool · `freed_page_clock == 0 → skip` · —
**State (lru)** · before: order X → after: order X
**Sources** · [B8]

##### 3.10 `move` — read-ahead
*부제:* extent 안에서 56 page 이상 순차 접근하면 다음 extent를 미리 읽는다.
> linear read-ahead는 한 extent(16KB page면 64 page) 안에서 `innodb_read_ahead_threshold`만큼 순차 접근이 보이면 다음 extent를 비동기로 읽는다. random read-ahead는 기본 OFF다. 미리 읽은 page도 old sublist로 들어가므로, 안 쓰이면 young을 밀어내지 않고 빠진다.

| fact | value |
|---|---|
| `innodb_read_ahead_threshold` default | 56 (0–64) |
| `innodb_random_read_ahead` default | OFF |
| extent size (16KB) | 64 pages = 1 MiB |

**Event** · `ibd → lru` · Disk · `linear read-ahead next extent` · 64 × 16384 B
**Sources** · [B11] [I21] [B7]

##### 3.11 `mutate` — LRU 끝에서 evict
*부제:* clean page는 바로 free list로, dirty page는 먼저 flush.
> LRU 끝 page가 clean이면 page hash에서 빼고 free list로 보낸다. dirty page면 먼저 디스크에 써야 한다. 이때도 WAL 규칙과 doublewrite를 거친다(lesson 5).

| fact | value |
|---|---|
| function | `buf_LRU_free_page()` / `buf_LRU_scan_and_free_block()` |
| dirty fallback | "flush one dirty page from tail of LRU to disk" |

**Event** · `lru → free` · Buffer Pool · `evict tail page` · 16384 B frame
**State (lru)** · before: `old[…, x, tail]` → after: `old[…, x]`; free `[tail]`
**Sources** · [B17]

##### 3.12 `mutate` — dirty page는 flush list에도 있다
*부제:* 수정된 page는 LRU와 별개로 flush list에 `oldest_modification` 순으로 걸린다.
> page가 처음 수정되면 `buf_flush_insert_into_flush_list()`가 flush list에 넣고 `oldest_modification`을 적는다. LRU는 "언제 쫓아낼지", flush list는 "언제 디스크에 쓸지"를 정한다. flush list 순서는 log recent closed buffer 크기만큼 느슨할 수 있다.

| fact | value |
|---|---|
| fields | `buf_page_t::oldest_modification`, `newest_modification` |
| `innodb_max_dirty_pages_pct` / `_lwm` default | 90.0 / 10 |

**Event** · `lru → flush` · Buffer Pool · `page dirty → flush list` · —
**State (flush)** · before: `[d1(lsn 100), d2(lsn 140)]` (E.G.) → after: `[P(lsn 180), d1, d2]` (E.G.)
**Sources** · [B19] [B12] [B14] [R8]

##### 3.13 `mutate` — instance와 chunk
*부제:* 1 GiB 미만이면 instance 1개. 그 이상이면 크기와 CPU 수로 정한다.
> 8.4에서 `innodb_buffer_pool_instances` 기본값은 계산된다. pool이 1 GiB 미만이면 1이다. 그 이상이면 `min(pool / (chunk × 2), CPU / 4)`를 1~64로 자른다. 같은 8.4 기본값으로 adaptive hash index는 OFF, change buffering은 none이다.

| fact | value |
|---|---|
| `innodb_buffer_pool_chunk_size` default | 134217728 (128 MiB) |
| instances | 1 if size < 1 GiB, else `clamp(min(size/(chunk*2), cpus/4), 1, 64)` |
| `innodb_adaptive_hash_index` / `innodb_change_buffering` default | OFF / `IBUF_USE_NONE` (8.4.13) |

**Event** · `handler → lru` · Buffer Pool · `srv_buf_pool_instances = 1` · 128 MiB
**State (lru)** · before: (config) → after: 1 instance × 128 MiB
**Sources** · [B2] [B3] [B15]

### Decoder records

**D3.1 `buf_page_t` control block of page P (in memory, not on disk)** — real member names from `buf0buf.h`. The raw pane shows a text dump, not bytes.

| field | value | meaning |
|---|---|---|
| `id` | `(space 5, page_no 4)` E.G. | page id |
| `old` | `true` → `false` | in the old sublist? |
| `access_time` | E.G. `t0` | time of first access; drives `innodb_old_blocks_time` |
| `freed_page_clock` | E.G. 18342 | `buf_pool->freed_page_clock` when last made young |
| `oldest_modification` | E.G. 0 (clean) / `0x013A5E10` | start LSN of the oldest unflushed change |
| `newest_modification` | E.G. `0x013A5F10` | LSN of the newest change; becomes `FIL_PAGE_LSN` on write |

Sources: [B12]

**D3.2 `INFORMATION_SCHEMA.INNODB_BUFFER_POOL_STATS` row** — column names from `i_s.cc`. All values E.G., for a fresh 128 MiB pool.

| column | value |
|---|---|
| `POOL_SIZE` | 8192 (128 MiB / 16 KiB) — derived, not read |
| `FREE_BUFFERS` | E.G. 7000 |
| `DATABASE_PAGES` | E.G. 1180 |
| `OLD_DATABASE_PAGES` | E.G. 435 |
| `MODIFIED_DATABASE_PAGES` | E.G. 12 |
| `PAGES_MADE_YOUNG` | E.G. 3 |
| `PAGES_NOT_MADE_YOUNG` | E.G. 920 |

Sources: [B20]

### Self-check

1. **Q:** Where does a page read from disk enter the LRU, and why? **A:** At the head of the old sublist (right after `LRU_old`), so a one-off scan does not push hot pages out.
2. **Q:** What two defaults govern young/old? **A:** `innodb_old_blocks_pct` = 37 and `innodb_old_blocks_time` = 1000 ms.
3. **Q:** A scan reads a page 3 times within 10 ms. Is it made young? **A:** No. A re-access under 1000 ms after the first only increments `n_pages_not_made_young`.
4. **Q:** No free block and the LRU tail is dirty — what happens? **A:** InnoDB scans up to `innodb_lru_scan_depth` (1024) for a clean block. If it finds none, it flushes one dirty page from the tail, which then becomes free.
5. **Q:** How many buffer pool instances does a default 8.4 server get? **A:** 1, because the default 128 MiB is under 1 GiB.

---

## Lesson 4 — `redo-commit`

**Goal:** Follow `UPDATE t SET v = 5 WHERE id = 10; COMMIT;` from the page change, into a mini-transaction's redo records, the log buffer, and the redo files. Then up to the moment `COMMIT` returns under `innodb_flush_log_at_trx_commit = 1`.

**Interview questions it answers**
- What is WAL, and what does "durable at commit" mean in InnoDB?
- What do the values 0, 1 and 2 of `innodb_flush_log_at_trx_commit` change?
- What is an LSN? What are a mini-transaction (mtr) and a redo log block?
- How does the redo flush relate to binlog group commit?

**Layer selector:** `Handler` · `Buffer Pool` · `Redo` · `Disk`

**Nodes**

| id | label / sublabel | kind | layer | Isometric illustration idea |
|---|---|---|---|---|
| `client` | mysql client | client | Handler | Laptop |
| `trx` | `trx_t` / transaction | framework | Handler | Folder with a trx-id badge |
| `page` | buffer pool page / `t` leaf | framework | Buffer Pool | Page frame in a rack |
| `mtr` | mini-transaction / `mtr_t` | framework | Redo | Small envelope collecting record slips |
| `logbuf` | log buffer / 64 MiB | framework | Redo | Ring-shaped tape with an LSN ruler |
| `writer` | `log_writer` thread | container | Redo | Worker with a pen at the tape's end |
| `flusher` | `log_flusher` thread | container | Redo | Worker pressing a big "fsync" stamp |
| `redo` | `#innodb_redo/#ib_redoN` | storage | Disk | 32 stacked thin file slabs |

States: `page` (table: `v`, `oldest/newest_modification`), `mtr` (list: log records), `logbuf` (table: LSN markers), `trx` (table: state, commit lsn).

### Steps

##### 4.1 `move` — UPDATE 도착
*부제:* `UPDATE t SET v = 5 WHERE id = 10`.
> transaction이 시작되고 row lock을 잡은 뒤(lesson 7), clustered leaf record를 고친다. 모든 page 변경은 mini-transaction(mtr) 안에서 일어나고, mtr이 그 변경의 redo record를 모은다.

| fact | value |
|---|---|
| `innodb_flush_log_at_trx_commit` default | 1 (range 0–2) |
| `innodb_log_buffer_size` default | 67108864 (64 MiB; min 256 KiB) |

**Event** · `client → trx` · Handler · `UPDATE t SET v=5 WHERE id=10` · —
**Sources** · [R10] [R5]

##### 4.2 `mutate` — undo 먼저, 그다음 record
*부제:* undo record를 쓰고, record의 `DB_TRX_ID`/`DB_ROLL_PTR`을 바꾼다.
> `btr_cur_update_in_place()`는 먼저 `btr_cur_upd_lock_and_undo()`로 undo record를 쓴다. 그다음 `row_upd_rec_sys_fields()`로 record의 `DB_TRX_ID`와 `DB_ROLL_PTR`을 바꾸고 `v`를 5로 쓴다. undo page를 고치는 것도 page 변경이라 redo가 남는다(`MLOG_UNDO_INSERT`).

| fact | value |
|---|---|
| undo redo type | `MLOG_UNDO_INSERT = 20` |
| record update redo type | `MLOG_REC_UPDATE_IN_PLACE = 70` |

**Event** · `trx → page` · Buffer Pool · `update in place v: 1 → 5` · 4 B field
**State (page)** · before: `v=1, DB_TRX_ID=0x0F11` (E.G.) → after: `v=5, DB_TRX_ID=0x0F20` (E.G.)
**Sources** · [M20] [R13] [R15]

##### 4.3 `mutate` — mtr이 redo record를 모은다
*부제:* record 하나면 `MLOG_SINGLE_REC_FLAG`, 여러 개면 끝에 `MLOG_MULTI_REC_END`.
> redo record는 type 1 byte, space id와 page no(압축 정수), 그리고 type별 body로 이루어진다. mtr에 record가 하나면 첫 type byte에 0x80을 OR한다. 여러 개면 끝에 1-byte `MLOG_MULTI_REC_END`를 붙인다. 복구는 mtr 단위로 원자적이다.

| fact | value |
|---|---|
| `MLOG_SINGLE_REC_FLAG` | 128 (0x80) |
| `MLOG_MULTI_REC_END` | 31 (0x1F) |
| header size | 3–11 bytes (type + compressed space + compressed page) |

**Event** · `page → mtr` · Redo · `[MLOG_UNDO_INSERT, MLOG_REC_UPDATE_IN_PLACE, MLOG_MULTI_REC_END]` · E.G. 70 B
**State (mtr)** · before: `[]` → after: `[UNDO_INSERT, REC_UPDATE_IN_PLACE, MULTI_REC_END]`
**Sources** · [R13] [R14] [R18]

##### 4.4 `move` — log buffer에 공간 예약
*부제:* `log_buffer_reserve()`가 LSN 구간 `[start_lsn, end_lsn)`을 준다.
> mtr commit(`mtr_t::Command::execute()`)은 redo 길이만큼 log buffer를 예약한다. LSN은 redo log에 쓴 byte 위치다. 여러 thread가 동시에 각자 구간을 예약하고 복사할 수 있다.

| fact | value |
|---|---|
| first LSN | `LOG_START_LSN = 16 × 512` = 8192 |
| LSN max | `(1 << 63) − 1` |

**Event** · `mtr → logbuf` · Redo · `reserve [0x013A5E10, 0x013A5E56)` (E.G.) · E.G. 70 B
**State (logbuf)** · before: `sn → 0x013A5E10` → after: `sn → 0x013A5E56` (E.G.)
**Sources** · [R6] [R17]

##### 4.5 `mutate` — 복사하고 recent_written에 link
*부제:* 복사가 끝나면 그 구간의 link를 걸어, log writer가 빈틈없는 지점까지 쓰게 한다.
> 각 thread는 자기 구간을 log buffer에 복사한 뒤 recent written buffer에 "start_lsn부터 n bytes 썼음"이라는 link를 남긴다. log writer는 link를 따라가다 빈 곳에서 멈추고, 그 지점까지를 `buf_ready_for_write_lsn`으로 올린다.

| fact | value |
|---|---|
| hole rule (source) | "The log buffer has no holes up to the `log.buf_ready_for_write_lsn`" |
| writer stops after | traversing more than 4 kB of links |

**Event** · `mtr → logbuf` · Redo · `copy + link recent_written` · E.G. 70 B
**State (logbuf)** · before: `buf_ready_for_write_lsn = A` → after: `buf_ready_for_write_lsn = B ≥ A` (E.G.)
**Sources** · [R7]

##### 4.6 `mutate` — dirty page를 flush list에
*부제:* `add_dirty_blocks_to_flush_list(start_lsn, end_lsn)`.
> 같은 mtr commit에서, 이 mtr이 고친 page를 flush list에 넣는다. 처음 dirty가 된 page는 `oldest_modification = start_lsn`이 된다. `newest_modification`은 `end_lsn`으로 갱신된다. 그다음 page latch를 푼다.

| fact | value |
|---|---|
| order in `execute()` | reserve → write → wait recent_closed → add dirty blocks → `log_buffer_close` → release latches |
| result | page dirty, on flush list |

**Event** · `logbuf → page` · Buffer Pool · `page dirty, oldest_lsn = 0x013A5E10` (E.G.) · —
**State (page)** · before: `oldest_modification = 0` → after: `0x013A5E10` (E.G.)
**Sources** · [R6] [B12]

##### 4.7 `move` — COMMIT
*부제:* `COMMIT`이 `trx_commit()`을 부른다.
> COMMIT은 transaction 상태를 바꾸는 마지막 mtr을 commit하고, 그 mtr의 end LSN을 commit LSN으로 삼는다. COMMIT이 durable하려면 redo가 적어도 이 LSN까지 디스크에 있어야 한다.

| fact | value |
|---|---|
| functions | `trx_commit()` → `trx_commit_low()` → `trx_commit_in_memory()` |
| commit lsn | `trx->commit_lsn = lsn` |

**Event** · `client → trx` · Handler · `COMMIT` · —
**Sources** · [R11]

##### 4.8 `mutate` — undo 정리와 commit lsn
*부제:* insert undo는 바로 해제, update undo는 history list로.
> commit 때 insert undo log는 더 필요 없으므로 해제된다. update undo log는 다른 read view가 이전 버전을 볼 수 있으므로 history list에 붙어 purge를 기다린다(lesson 6).

| fact | value |
|---|---|
| insert undo | `trx_undo_insert_cleanup()` — "Knowledge of inserts is not needed after a commit or rollback" |
| update undo | `trx_undo_update_cleanup()` → `trx_purge_add_update_undo_to_history()` |

**Event** · `trx → trx` · Undo · `update undo → history list` · —
**State (trx)** · before: `ACTIVE` → after: `COMMITTED_IN_MEMORY`, `commit_lsn = 0x013A5E80` (E.G.)
**Sources** · [M14] [R11]

##### 4.9 `mutate` — flush 정책 결정
*부제:* 1이면 write + fsync, 2면 write만, 0이면 아무것도 안 함.
> `trx_flush_log_if_needed_low()`가 `innodb_flush_log_at_trx_commit`을 본다. 1이면 `log_write_up_to(lsn, flush=true)`, 2면 `flush=false`(OS buffer까지만), 0이면 기다리지 않는다. 0과 2는 background flush(`innodb_flush_log_at_timeout`, 기본 1초)에 맡긴다.

| fact | value |
|---|---|
| value 1 | `log_write_up_to(*log_sys, lsn, true)` |
| value 2 | `log_write_up_to(*log_sys, lsn, false)` |
| `innodb_flush_log_at_timeout` default | 1 s (0–2700) |

**Event** · `trx → logbuf` · Redo · `log_write_up_to(commit_lsn, flush=true)` · —
**State (trx)** · before: `waiting = no` → after: `waiting for flushed_to_disk_lsn ≥ commit_lsn`
**Sources** · [R9] [R10] [R16]

##### 4.10 `move` — log writer: write()
*부제:* log writer가 log buffer를 redo file로 써서 OS buffer에 넣는다.
> log writer thread는 준비된 구간을 redo file에 쓴다. 완성된 512-byte block은 header와 checksum을 채워 그대로 쓴다. 덜 찬 마지막 block은 별도 buffer에 복사해 0x00으로 채워 쓴다. fsync는 하지 않는다. 그 결과가 `log.write_lsn`이다.

| fact | value |
|---|---|
| block | 512 B = 12 B header + 496 B data + 4 B trailer (checksum) |
| `innodb_log_write_ahead_size` default | 8192 |

**Event** · `writer → redo` · Disk · `pwrite up to write_lsn` · E.G. 512 B
**State (logbuf)** · before: `write_lsn < commit_lsn` → after: `write_lsn ≥ commit_lsn`
**Sources** · [R7] [R4] [R8] [R17]

##### 4.11 `move` — log flusher: fsync()
*부제:* `log.flushed_to_disk_lsn`이 commit LSN을 넘는다.
> log flusher thread가 redo file을 fsync하고 `flushed_to_disk_lsn`을 올린다. 항상 `flushed_to_disk_lsn ≤ write_lsn`이다.

| fact | value |
|---|---|
| invariant | `log.flushed_to_disk_lsn <= log.write_lsn` |
| thread | `log_flusher()` |

**Event** · `flusher → redo` · Disk · `fsync` · —
**State (logbuf)** · before: `flushed_to_disk_lsn < commit_lsn` → after: `≥ commit_lsn`
**Sources** · [R7] [R8] [R16]

##### 4.12 `move` — 사용자 thread 깨우기
*부제:* `log_flush_notifier`가 기다리던 COMMIT을 깨운다.
> flush notifier thread는 `flushed_to_disk_lsn`이 오르면 그 LSN을 기다리던 user thread를 깨운다. 이 순간 COMMIT이 client에게 OK를 돌려준다. 이것이 WAL이다. data page는 아직 디스크에 없어도 되고, redo만 있으면 crash 뒤 복구된다.

| fact | value |
|---|---|
| threads | log writer, log flusher, log write_notifier, log flush_notifier, log checkpointer |
| durability point | `flushed_to_disk_lsn ≥ commit_lsn` (value 1) |

**Event** · `flusher → client` · Handler · `OK (COMMIT)` · —
**State (trx)** · before: waiting → after: returned
**Sources** · [R7]

##### 4.13 `mutate` — binlog이 켜져 있으면
*부제:* redo flush는 binlog group commit의 flush stage에서 한꺼번에 일어난다.
> binlog과 2PC를 쓰면 commit은 `flush_log_later`로 표시돼 바로 flush하지 않는다. binlog group commit의 flush stage가 `innobase_flush_logs(binlog_group_flush=true)`를 한 번 불러 그룹 전체의 redo를 쓴다. value 1이면 fsync까지 한다.

| fact | value |
|---|---|
| deferred flag | `trx->flush_log_later` → `must_flush_log_later = true` |
| group flush | `log_buffer_flush_to_disk(!binlog_group_flush \|\| srv_flush_log_at_trx_commit == 1)` |

**Event** · `trx → logbuf` · Redo · `innobase_flush_logs(binlog_group_flush)` · —
**State (trx)** · before: `flush_log_later = true` → after: flushed by group
**Sources** · [R11] [R12]

##### 4.14 `mutate` — redo file 구조
*부제:* `#innodb_redo` 아래 32개 파일, 합계 `innodb_redo_log_capacity`.
> 8.4의 redo는 `#innodb_redo` 디렉터리 아래 `#ib_redoN` 파일들이다. 전체 크기는 `innodb_redo_log_capacity`(기본 100 MiB)로 정하고, InnoDB가 32개 파일로 나눠 원형으로 쓴다. 각 파일은 4 block(2048 B) 헤더로 시작하고, checkpoint 2개는 block 1과 3에 있다.

| fact | value |
|---|---|
| names | dir `#innodb_redo`, file base `#ib_redo`; `LOG_N_FILES = 32` |
| `innodb_redo_log_capacity` default | 104857600 (100 MiB); min 8 MiB, max 512 GiB |
| file header | `LOG_FILE_HDR_SIZE = 4 × 512`; `LOG_CHECKPOINT_1` = 512, `LOG_CHECKPOINT_2` = 1536 |

**Event** · `redo → redo` · Disk · `32 × #ib_redoN` · 100 MiB total
**State (redo)** · before: — → after: files `#ib_redo0…` (E.G. numbering)
**Sources** · [R1] [R2] [R3]

### Decoder records

**D4.1 Redo log block header (12 bytes) + trailer (4 bytes)** — the block that holds the update, E.G. block start LSN `0x013A5E00`.

| offset | field | bytes | value | meaning |
|---|---|---|---|---|
| 0 | `LOG_BLOCK_HDR_NO` | `00 00 9D 30` | 40240 | `1 + lsn / 512 % LOG_BLOCK_MAX_NO` = 1 + 0x9D2F (E.G. from LSN) |
| 4 | `LOG_BLOCK_HDR_DATA_LEN` | `01 FC` | E.G. 508 | bytes used incl. header (bit 15 = encrypted) |
| 6 | `LOG_BLOCK_FIRST_REC_GROUP` | `00 10` | E.G. 16 | offset of the first mtr starting in this block |
| 8 | `LOG_BLOCK_EPOCH_NO` | `00 00 00 00` | 0 | `lsn / 512 / LOG_BLOCK_MAX_NO` |
| 508 | `LOG_BLOCK_CHECKSUM` | `?? ?? ?? ??` | E.G. | 4-byte checksum (algorithm **unverified** here) |

Sources: [R4] [R19]

**D4.2 The mtr's redo records** — an `MLOG_UNDO_INSERT` carrying the undo record D6.1, an `MLOG_REC_UPDATE_IN_PLACE`, and the end marker.

| offset | field | bytes | value | meaning |
|---|---|---|---|---|
| 0 | type | `14` | 20 | `MLOG_UNDO_INSERT` (no 0x80: multi-record mtr) |
| 1 | space id (compressed) | `FB EF` | E.G. 0xFFFFFFEF | extended form `111110nn nnnnnnnn` for ids ≥ 0xFFFFFC00 |
| 3 | page no (compressed) | `81 23` | E.G. 291 | `10nnnnnn nnnnnnnn` (< 0x4000) |
| 5 | len | `00 1F` | 31 | undo record length without its 2+2 framing bytes |
| 7 | undo record body | 31 bytes | see D6.1 | copied from the undo page |
| 38 | type | `46` | 70 | `MLOG_REC_UPDATE_IN_PLACE` |
| 39 | space, page, body | … | E.G. | index info + update vector; body layout **unverified** here |
| n | type | `1F` | 31 | `MLOG_MULTI_REC_END` |

Space id 0xFFFFFFEF is a sample undo-tablespace id near the top of the range (`s_max_undo_space_id = s_log_space_id − 1`). The exact value is E.G.
Sources: [R13] [R14] [R15] [R18] [R20]

**D4.3 Redo file header block (`#ib_redoN`, offset 0)**

| offset | field | value |
|---|---|---|
| 0 | `LOG_HEADER_FORMAT` | E.G. (format version, 4 B) |
| 4 | `LOG_HEADER_LOG_UUID` | E.G. (4 B) |
| 8 | `LOG_HEADER_START_LSN` | E.G. (8 B, start LSN of this file) |
| 16 | `LOG_HEADER_CREATOR` | E.G. `"MySQL 8.4.13"` (max 31 B; text **unverified**) |
| 47 | `LOG_HEADER_FLAGS` | E.G. 0 (`NO_LOGGING` 1, `CRASH_UNSAFE` 2, `NOT_INITIALIZED` 3, `FILE_FULL` 4) |

Sources: [R3]. (Offset 47 = `LOG_HEADER_CREATOR_END`, derived from `16 + 31`. The exact definition of `CREATOR_END` was not opened; **unverified**.)

### Self-check

1. **Q:** Under `innodb_flush_log_at_trx_commit=1`, what must be true before `COMMIT` returns? **A:** `log.flushed_to_disk_lsn ≥ trx->commit_lsn`: the redo up to the commit LSN has been written and fsynced.
2. **Q:** What changes with value 2, and with value 0? **A:** 2 writes to the OS at commit but does not fsync. 0 does neither at commit. Both rely on the 1-second background flush.
3. **Q:** What is the smallest unit of redo that recovery treats atomically? **A:** A mini-transaction: either all its records (ending in `MLOG_MULTI_REC_END`, or one record with the 0x80 flag) or none.
4. **Q:** Name the background redo threads. **A:** `log_writer` (write), `log_flusher` (fsync), `log_write_notifier`, `log_flush_notifier`, and `log_checkpointer`.
5. **Q:** Where does the 8.4 redo log live, and how big is it by default? **A:** 32 `#ib_redoN` files in `#innodb_redo`, totaling `innodb_redo_log_capacity` = 100 MiB.

---

## Lesson 5 — `flush-doublewrite`

**Goal:** Follow one dirty page from the flush list to the tablespace. That means the WAL rule check, the doublewrite file, and the data-file write. Then the checkpoint that lets redo be reused, and the crash case where doublewrite saves a torn page.

**Interview questions it answers**
- Why must redo reach disk before the data page (WAL rule)?
- What problem does the doublewrite buffer solve that redo alone cannot?
- What is a checkpoint, and what limits how far it can advance?
- What do `innodb_io_capacity`, `innodb_max_dirty_pages_pct`, and `innodb_flush_method` do?

**Layer selector:** `Buffer Pool` · `Redo` · `Disk`

**Nodes**

| id | label / sublabel | kind | layer | Isometric illustration idea |
|---|---|---|---|---|
| `cleaner` | page cleaner / coordinator | container | Buffer Pool | Worker with a cart |
| `flush` | flush list | framework | Buffer Pool | Belt of red-flagged pages with LSN tags |
| `page` | dirty page P | framework | Buffer Pool | Page frame with red flag |
| `redo` | redo files | storage | Disk | Thin file slabs |
| `dblwr` | `#ib_16384_0.dblwr` | storage | Disk | Small file with two page slots side by side |
| `ibd` | `t.ibd` | storage | Disk | Disk cylinder |
| `chkp` | `log_checkpointer` | container | Redo | Worker planting a flag on the LSN ruler |

States: `flush` (list), `page` (table: LSNs, checksum), `chkp` (table: checkpoint LSN).

### Steps

##### 5.1 `mutate` — flush list 상태
*부제:* dirty page들이 `oldest_modification`이 오래된 순으로 늘어서 있다.
> 가장 오래된 dirty page의 `oldest_modification`이 checkpoint가 갈 수 있는 한계다. 그 page가 디스크에 쓰여야 그 앞의 redo를 재사용할 수 있다.

| fact | value |
|---|---|
| list | `buf_pool->flush_list`, ordered by oldest modification (relaxed by the recent-closed buffer size) |
| `innodb_max_dirty_pages_pct` | 90.0 |

**Event** · `flush → flush` · Buffer Pool · `oldest = P (lsn 0x013A5E10)` (E.G.) · —
**State (flush)** · before: `[…, P]` (tail = oldest) → after: same, P selected
**Sources** · [B19] [R8] [B14]

##### 5.2 `move` — page cleaner가 flush를 시작
*부제:* 기본 IO 예산 `innodb_io_capacity` = 10000, 최대는 그 2배.
> page cleaner coordinator는 dirty 비율, redo 여유, adaptive flushing을 보고 flush할 양을 정한다. 기본값으로 page cleaner thread 수는 buffer pool instance 수와 같다. `innodb_io_capacity_max`는 지정하지 않으면 `2 × innodb_io_capacity`다.

| fact | value |
|---|---|
| `innodb_io_capacity` default | 10000 (min 100) |
| `innodb_io_capacity_max` | not set → `clamp(2 × io_capacity, 100, limit)` = 20000 |
| `innodb_page_cleaners` | set to `innodb_buffer_pool_instances` unless set lower |
| `innodb_adaptive_flushing` / `_lwm` | ON / 10 (% of log capacity) |

**Event** · `cleaner → flush` · Buffer Pool · `flush batch` · E.G. 100 pages
**Sources** · [F12] [F11] [F15]

##### 5.3 `mutate` — page를 쓰기 전 마무리
*부제:* `FIL_PAGE_LSN`을 `newest_modification`으로, 끝 8 bytes에 checksum과 LSN.
> `buf_flush_init_for_writing()`은 page header의 `FIL_PAGE_LSN`을 newest LSN으로 쓴다. trailer 8 bytes 중 앞 4는 checksum, 뒤 4는 `FIL_PAGE_LSN`의 하위 4 bytes다. 읽을 때 이 두 곳이 맞지 않으면 page가 찢어졌다(torn)는 뜻이다.

| fact | value |
|---|---|
| `FIL_PAGE_LSN` | offset 16, 8 B |
| trailer `FIL_PAGE_END_LSN_OLD_CHKSUM` | last 8 B: 4 B checksum + low 4 B of LSN |

**Event** · `page → page` · Buffer Pool · `buf_flush_init_for_writing()` · 8 B trailer
**State (page)** · before: `FIL_PAGE_LSN = old` → after: `FIL_PAGE_LSN = newest_modification`, trailer set
**Sources** · [F1] [F9] [I1]

##### 5.4 `move` — WAL 규칙 확인
*부제:* page의 newest LSN까지 redo가 fsync되지 않았으면 먼저 redo를 flush한다.
> `buf_flush_write_block_low()`는 page를 쓰기 전에 `log_sys->flushed_to_disk_lsn < newest_lsn`인지 본다. 그렇다면 `log_write_up_to(newest_lsn, true)`로 redo를 먼저 디스크에 둔다. data page가 redo보다 먼저 디스크에 닿는 일은 없다.

| fact | value |
|---|---|
| source comment | "Force the log to the disk before writing the modified block" |
| check | `log_sys->flushed_to_disk_lsn.load() < flush_to_lsn` |

**Event** · `page → redo` · Redo · `log_write_up_to(newest_lsn, flush)` · —
**State (page)** · before: redo flushed < page LSN (E.G.) → after: redo flushed ≥ page LSN
**Sources** · [F1]

##### 5.5 `move` — doublewrite 파일에 먼저 쓴다
*부제:* `dblwr::write()` → batch를 `#ib_16384_0.dblwr`에 쓴다.
> page는 바로 `.ibd`에 가지 않는다. 먼저 doublewrite 파일의 batch segment에 순서대로 쓴다. 파일 이름은 `#ib_<page size>_<id>.dblwr`이다.

| fact | value |
|---|---|
| file name | `"#ib_" + srv_page_size + "_" + id + ".dblwr"` → `#ib_16384_0.dblwr` |
| `innodb_doublewrite_files` / `_pages` default | 2 / 128 |

**Event** · `page → dblwr` · Disk · `write_dblwr_pages()` · 16384 B × batch
**Sources** · [F2] [F3] [F5] [F6]

##### 5.6 `mutate` — doublewrite fsync (조건부)
*부제:* `innodb_flush_method`가 `O_DIRECT`이면 dblwr segment flush를 건너뛴다.
> `is_fsync_required()`는 flush method가 `O_DIRECT`나 `O_DIRECT_NO_FSYNC`가 아닐 때만 true다. 8.4에서 Unix의 `innodb_flush_method`는 O_DIRECT를 쓸 수 있으면 `O_DIRECT`가 기본이다.

| fact | value |
|---|---|
| `is_fsync_required()` | `flush_method != O_DIRECT && != O_DIRECT_NO_FSYNC` |
| default flush method (Unix) | `O_DIRECT` if `os_is_o_direct_supported()`, else `fsync` |

**Event** · `dblwr → dblwr` · Disk · `batch_segment->flush()` (if required) · —
**State (dblwr)** · before: batch written → after: batch durable
**Sources** · [F3] [F4] [F10]

##### 5.7 `move` — 이제 tablespace에 쓴다
*부제:* `write_data_pages()`가 각 page를 원래 위치에 쓴다.
> doublewrite 사본이 안전해진 뒤에야 각 page를 `.ibd`의 원래 offset에 쓴다. 이 쓰기 도중 전원이 나가 page가 반만 쓰여도, 온전한 사본이 doublewrite 파일에 있다.

| fact | value |
|---|---|
| order | `write_dblwr_pages()` then `write_data_pages()` |
| `innodb_flush_neighbors` default | 0 (do not flush neighbors) |

**Event** · `dblwr → ibd` · Disk · `write_to_datafile(P)` · 16384 B
**Sources** · [F3] [F13]

##### 5.8 `mutate` — clean으로 표시
*부제:* 쓰기가 끝나면 page는 flush list에서 빠진다.
> write completion에서 `dblwr::write_complete()`가 불리고, page는 flush list에서 빠져 clean이 된다. LRU에서는 그대로 남아 계속 읽을 수 있다.

| fact | value |
|---|---|
| completion | `dblwr::write_complete(bpage, flush_type)` |
| after | `oldest_modification = 0` |

**Event** · `ibd → flush` · Buffer Pool · `P clean` · —
**State (flush)** · before: `[…, P]` → after: `[…]`
**Sources** · [F16] [B12]

##### 5.9 `mutate` — checkpoint 전진
*부제:* `log_checkpointer`가 가장 오래된 dirty page 기준으로 checkpoint LSN을 쓴다.
> `available_for_checkpoint_lsn`은 "이 LSN까지의 dirty page는 모두 디스크에 있다"는 값이다. flush list의 가장 오래된 수정 LSN에서 recent closed buffer 크기를 뺀다. checkpointer가 이 값을 redo file header의 checkpoint block에 쓰면 그 앞 redo는 논리적으로 지워진다.

| fact | value |
|---|---|
| definition | `last_checkpoint_lsn`: "The lsn value points to place where recovery is supposed to start" |
| header slots | `LOG_CHECKPOINT_1` = 512, `LOG_CHECKPOINT_2` = 1536; `LOG_CHECKPOINT_LSN` at +8 |

**Event** · `chkp → redo` · Redo · `write checkpoint lsn` (E.G. 0x013A5E00) · 8 B
**State (chkp)** · before: `last_checkpoint_lsn = 0x01300000` (E.G.) → after: `0x013A5E00` (E.G.)
**Sources** · [F14] [R8] [R3]

##### 5.10 `mutate` — crash: 찢어진 page 발견
*부제:* 복구 중 data file page의 checksum이 틀리면 doublewrite 사본으로 복원한다.
> 재시작하면 InnoDB는 doublewrite 파일의 page를 읽어 둔다. data file에서 같은 page를 읽고 `is_corrupted()`가 true면 "Trying to recover it from the doublewrite file" 메시지와 함께 사본으로 덮는다. redo는 page 안의 변경만 기록하므로, 찢어진 page에는 redo를 적용할 수 없다. 그래서 doublewrite가 필요하다.

| fact | value |
|---|---|
| detection | `BlockReporter(...).is_corrupted()` on the data-file page |
| log text | "Database page corruption or a failed file read of page … Trying to recover it from the doublewrite file." |

**Event** · `dblwr → ibd` · Disk · `restore P from dblwr` · 16384 B
**State (page)** · before: on-disk P torn (checksum ≠) → after: P = doublewrite copy
**Sources** · [F8] [F9]

##### 5.11 `mutate` — redo 재적용
*부제:* checkpoint LSN부터 redo를 읽어, page LSN보다 새 record만 적용한다.
> 복구는 `last_checkpoint_lsn`에서 시작한다. 각 page의 `FIL_PAGE_LSN`보다 새 redo record를 page에 다시 적용해, commit된 변경을 되살린다. commit 안 된 transaction은 그 뒤 undo로 rollback된다.

| fact | value |
|---|---|
| start point | `log.last_checkpoint_lsn` |
| page LSN | `FIL_PAGE_LSN`, offset 16 |

**Event** · `redo → ibd` · Redo · `apply redo ≥ checkpoint` · —
**State (page)** · before: `FIL_PAGE_LSN = L0` → after: `FIL_PAGE_LSN = L1 > L0` (E.G.)
**Sources** · [R8] [I1]

##### 5.12 `mutate` — doublewrite 모드
*부제:* `ON`(기본), `DETECT_AND_RECOVER`(= ON), `DETECT_ONLY`, `OFF`.
> `DETECT_ONLY`는 page 내용 대신 `(space_id, page_no, lsn)` 같은 축약 정보만 dblwr에 쓴다. 그래서 찢어진 page를 찾을 수는 있지만 복원은 못 한다. `OFF`는 doublewrite를 끈다.

| fact | value |
|---|---|
| `innodb_doublewrite` default | `ON` |
| `DETECT_ONLY` entry | `Reduced_entry { m_space_id, m_page_no, m_lsn }` |

**Event** · `dblwr → dblwr` · Disk · `mode = ON` · —
**State (dblwr)** · before: — → after: mode `ON`
**Sources** · [F6] [F7]

### Decoder records

**D5.1 FIL trailer (page offset 16376–16383)** — of page P after the flush.

| offset | field | bytes | value |
|---|---|---|---|
| 16376 | checksum (low 4 of `FIL_PAGE_END_LSN_OLD_CHKSUM`) | `5E 6F 70 81` | E.G. |
| 16380 | low 4 bytes of `FIL_PAGE_LSN` | `01 3A 5F 10` | must equal bytes 20–23 of the header (E.G.) |

A torn write shows as a mismatch between bytes 20–23 and 16380–16383, or as a bad checksum.
Sources: [F9] [I1]

**D5.2 Checkpoint block (redo file offset 512 or 1536)**

| offset in block | field | bytes | value |
|---|---|---|---|
| 8 | `LOG_CHECKPOINT_LSN` | `00 00 00 00 01 3A 5E 00` | E.G. |

Sources: [R3]. (Other fields of the checkpoint block not read; **unverified**.)

**D5.3 Doublewrite file name**

| part | value | source |
|---|---|---|
| prefix | `#ib_` | [F5] |
| page size | `16384` | [F5] |
| instance id | `0` (E.G.) | [F5] |
| extension | `.dblwr` (`.bdblwr` is the other suffix in `dot_ext`) | [F5] |

### Self-check

1. **Q:** What check runs before a dirty page is written? **A:** If `flushed_to_disk_lsn < page newest LSN`, InnoDB first calls `log_write_up_to(newest LSN, true)`. Redo always reaches disk first.
2. **Q:** Why can't redo alone fix a half-written page? **A:** Redo records describe changes to a valid page. A torn page has no valid base to apply them to. The doublewrite copy provides a whole page.
3. **Q:** In what order are the two writes made? **A:** The batch goes to the `.dblwr` file first (and is flushed, unless `O_DIRECT`), then each page goes to its `.ibd` location.
4. **Q:** What bounds the checkpoint LSN? **A:** The oldest modification LSN among dirty pages (minus the recent-closed slack). Pages older than it must be flushed first.
5. **Q:** What are the 8.4 defaults for `innodb_io_capacity` and `innodb_flush_method` on Linux? **A:** 10000, and `O_DIRECT` when supported.

---

## Lesson 6 — `mvcc-read-view`

**Goal:** Transaction A updates a row and has not committed. Watch transaction B read the old version through the undo chain. Then see why B's second read differs under REPEATABLE READ and READ COMMITTED.

**Interview questions it answers**
- How does InnoDB give non-locking consistent reads?
- What is in a read view, and how is a version's visibility decided?
- When is the snapshot taken under REPEATABLE READ and under READ COMMITTED?
- What is purge, and why does a long transaction grow undo?

**Layer selector:** `Handler` · `Undo` · `Page`

**Nodes**

| id | label / sublabel | kind | layer | Isometric illustration idea |
|---|---|---|---|---|
| `trx_a` | Transaction A / writer | client | Handler | Laptop A with a pen |
| `trx_b` | Transaction B / reader | client | Handler | Laptop B with a magnifier |
| `trx_sys` | `trx_sys` / active rw ids | framework | Handler | Board with id tags pinned |
| `view` | B's `ReadView` | framework | Handler | Camera with a snapshot card |
| `row` | clustered record `id=10` | storage | Page | Page slab with one highlighted row and a chain hook |
| `undo` | undo log page | storage | Undo | Stack of older row cards linked by a chain |
| `purge` | purge thread | container | Undo | Robot with a broom |

States: `row` (table: `v`, `DB_TRX_ID`, `DB_ROLL_PTR`), `undo` (list: versions), `view` (table: view fields).

### Steps

##### 6.1 `mutate` — 시작 상태
*부제:* row `id=10`은 trx 0x0F11이 insert했고, `DB_ROLL_PTR`은 insert undo를 가리킨다.
> 모든 clustered record에는 `DB_TRX_ID`(마지막 수정 trx, 6 bytes)와 `DB_ROLL_PTR`(이전 버전 undo record 위치, 7 bytes)이 있다. roll pointer의 최상위 bit는 insert undo인지 표시한다.

| fact | value |
|---|---|
| `DB_ROLL_PTR` bits | 1 bit insert flag \| 7 bit rseg id \| 32 bit page no \| 16 bit offset = 56 bits |
| rollback segments | `TRX_SYS_N_RSEGS = 128` |

**Event** · `row → row` · Page · `id=10: v=1, trx 0x0F11` (E.G.) · 13 B hidden cols
**State (row)** · before: — → after: `v=1, DB_TRX_ID=0x0F11, DB_ROLL_PTR=insert(rseg 5, page 291, off 272)` (E.G.)
**Sources** · [I8] [M2] [M16]

##### 6.2 `move` — A가 UPDATE
*부제:* A(trx id 0x0F20, E.G.)가 `UPDATE t SET v=5 WHERE id=10`.
> A는 record에 X lock을 잡는다(lesson 7). 그다음 record를 고치기 전에 지금 값을 undo log에 복사한다. 이 undo가 다른 transaction이 볼 이전 버전이다.

| fact | value |
|---|---|
| undo op | `TRX_UNDO_MODIFY_OP = 2` |
| cmpl_info for non-index column | `UPD_NODE_NO_ORD_CHANGE = 1` |

**Event** · `trx_a → row` · Handler · `UPDATE v=5 WHERE id=10` · —
**Sources** · [M3] [M15]

##### 6.3 `mutate` — undo record 작성
*부제:* `TRX_UNDO_UPD_EXIST_REC`: 옛 `DB_TRX_ID`, 옛 `DB_ROLL_PTR`, PK, 바뀐 컬럼의 옛 값.
> `trx_undo_page_report_modify()`는 undo record에 type, undo_no, table_id, info bits, 원래 `DB_TRX_ID`와 `DB_ROLL_PTR`, PK, 바뀐 field의 옛 값을 쓴다. 옛 roll pointer를 담으므로 undo record끼리 체인을 이룬다. 아래 D6.1이 그 bytes다.

| fact | value |
|---|---|
| `TRX_UNDO_UPD_EXIST_REC` | 12 |
| type byte | `12 \| cmpl_info×16 \| TRX_UNDO_MODIFY_BLOB(64)` |
| framing | 2 B next-record offset in front, 2 B start offset at the end |

**Event** · `row → undo` · Undo · `undo UPD_EXIST_REC (old v=1)` · 35 B (31 + 4)
**State (undo)** · before: `[insert undo of 0x0F11]` → after: `[upd undo of 0x0F20 → insert undo of 0x0F11]`
**Sources** · [M4] [M5] [M3]

##### 6.4 `mutate` — record에 새 값과 새 포인터
*부제:* record의 `DB_TRX_ID = A`, `DB_ROLL_PTR` → 방금 쓴 undo record.
> `row_upd_rec_sys_fields()`가 `DB_TRX_ID`에 A의 id를, `DB_ROLL_PTR`에 새 undo record 위치(insert flag 0)를 쓴다. 그리고 `v`가 5가 된다. 최신 버전은 page에, 옛 버전은 undo에 있다.

| fact | value |
|---|---|
| order | undo first (`btr_cur_upd_lock_and_undo`), then `row_upd_rec_sys_fields` |
| new roll ptr insert bit | 0 (update undo) |

**Event** · `undo → row` · Page · `DB_ROLL_PTR → upd undo` · 13 B
**State (row)** · before: `v=1, trx 0x0F11, roll→insert` → after: `v=5, trx 0x0F20, roll→upd(rseg 5, page 300, off 150)` (E.G.)
**Sources** · [M20] [M2]

##### 6.5 `move` — B가 첫 SELECT (REPEATABLE READ)
*부제:* 첫 consistent read에서 read view를 만든다.
> B의 isolation은 기본값 `REPEATABLE-READ`다. B가 잠금 없이 `SELECT`하면 `row_search_mvcc()`가 `trx_assign_read_view()`를 부른다. view가 아직 없을 때만 새로 만든다. `BEGIN` 시점이 아니라 첫 read 시점이다.

| fact | value |
|---|---|
| `transaction_isolation` default | `REPEATABLE-READ` |
| condition | `select_lock_type == LOCK_NONE` → consistent read → `trx_assign_read_view(trx)` |

**Event** · `trx_b → trx_sys` · Handler · `SELECT v FROM t WHERE id=10` · —
**Sources** · [G4] [M9] [M8]

##### 6.6 `mutate` — ReadView::prepare
*부제:* `m_low_limit_id` = 다음 trx id, `m_ids` = 지금 활성인 rw trx, `m_up_limit_id` = 그중 최소.
> view는 만드는 순간 `trx_sys`의 활성 read-write transaction id 목록을 복사한다. A(0x0F20)는 아직 commit 전이라 `m_ids`에 들어간다. `m_up_limit_id`는 `m_ids`의 최솟값이고, 목록이 비면 `m_low_limit_id`와 같다.

| fact | value |
|---|---|
| `m_low_limit_id` | `trx_sys_get_next_trx_id_or_no()` — "high water mark" |
| `m_up_limit_id` | `m_ids.front()` or `m_low_limit_id` — "low water mark" |
| `m_creator_trx_id` | the view owner's trx id |

**Event** · `trx_sys → view` · Handler · `ReadView{low=0x0F21, up=0x0F20, ids=[0x0F20]}` (E.G.) · —
**State (view)** · before: (closed) → after: `low_limit=0x0F21, up_limit=0x0F20, ids=[0x0F20]` (E.G.)
**Sources** · [M7] [M6]

##### 6.7 `mutate` — 최신 버전은 안 보인다
*부제:* `changes_visible(0x0F20)` = false → undo로 이전 버전을 만든다.
> 규칙: id < `m_up_limit_id`이거나 자기 자신이면 보인다. id ≥ `m_low_limit_id`이면 안 보인다. 그 사이면 `m_ids`에 없을 때만 보인다. 0x0F20은 `m_ids`에 있으므로 안 보인다. `row_vers_build_for_consistent_read()`가 `DB_ROLL_PTR`을 따라가 이전 버전을 만든다.

| fact | value |
|---|---|
| visible if | `id < m_up_limit_id \|\| id == m_creator_trx_id` |
| invisible if | `id >= m_low_limit_id` |
| otherwise | visible iff `id ∉ m_ids` (binary search) |

**Event** · `row → undo` · Undo · `build prev version via roll ptr` · 35 B undo read
**State (view)** · before: candidate `trx 0x0F20` → after: rejected, follow roll ptr
**Sources** · [M6] [M12] [M13]

##### 6.8 `mutate` — 이전 버전은 보인다
*부제:* 이전 버전의 `DB_TRX_ID` 0x0F11 < `m_up_limit_id` → `v=1` 반환.
> undo에서 다시 만든 버전의 `DB_TRX_ID`는 0x0F11이다. 이 값은 low water mark보다 작으므로 보인다. B는 `v=1`을 읽는다. 아무 lock도 잡지 않았고 A도 기다리지 않는다.

| fact | value |
|---|---|
| result | `v = 1` |
| locks taken by B | none (consistent read) |

**Event** · `undo → trx_b` · Handler · `1 row: v=1` · —
**State (view)** · before: rebuilding → after: version `trx 0x0F11` accepted
**Sources** · [M6] [M13]

##### 6.9 `move` — A가 COMMIT
*부제:* A의 update undo는 history list로 간다.
> A가 commit하면 `trx_sys`의 활성 목록에서 빠진다. update undo는 아직 지우지 않는다. B처럼 옛 버전이 필요한 view가 있을 수 있기 때문이다.

| fact | value |
|---|---|
| update undo | `trx_purge_add_update_undo_to_history()` |
| insert undo | freed at commit (`trx_undo_insert_cleanup`) |

**Event** · `trx_a → trx_sys` · Handler · `COMMIT 0x0F20` · —
**State (row)** · before: `trx 0x0F20 active` → after: `trx 0x0F20 committed`
**Sources** · [M14]

##### 6.10 `mutate` — RR: 같은 view를 다시 쓴다
*부제:* REPEATABLE READ에서는 view가 transaction 끝까지 유지된다 → 여전히 `v=1`.
> `trx_assign_read_view()`는 view가 이미 열려 있으면 새로 만들지 않는다. RR에서는 statement가 끝나도 view를 닫는 코드가 돌지 않는다. B의 두 번째 SELECT도 `m_ids`에 0x0F20이 있는 같은 view로 판단하므로 `v=1`을 본다.

| fact | value |
|---|---|
| reuse | `if (!MVCC::is_view_active(trx->read_view)) view_open(...)` |
| close at statement end | only when `isolation_level <= READ_COMMITTED` |

**Event** · `trx_b → view` · Handler · `SELECT again → v=1` · —
**State (view)** · before: `ids=[0x0F20]` → after: `ids=[0x0F20]` (unchanged)
**Sources** · [M8] [M10]

##### 6.11 `mutate` — RC: statement마다 새 view
*부제:* READ COMMITTED에서는 statement 끝에 view를 닫고, 다음 read가 새로 만든다 → `v=5`.
> `ha_innobase::external_lock()`과 `store_lock()`은 isolation이 READ COMMITTED 이하이면 열린 view를 `view_close()`로 닫는다(source 주석: "each consistent read set its own snapshot"). 다음 SELECT의 새 view에는 0x0F20이 없으므로 최신 `v=5`가 보인다.

| fact | value |
|---|---|
| close condition | `trx->isolation_level <= TRX_ISO_READ_COMMITTED && MVCC::is_view_active(...)` |
| new view | `ids=[]` → `up_limit = low_limit` (E.G.) |

**Event** · `trx_b → view` · Handler · `RC: new ReadView → v=5` · —
**State (view)** · before: `ids=[0x0F20]` → after: `ids=[]`, `low=up=0x0F21` (E.G.)
**Sources** · [M10] [M7]

##### 6.12 `mutate` — `WITH CONSISTENT SNAPSHOT`
*부제:* `START TRANSACTION WITH CONSISTENT SNAPSHOT`은 RR에서만 즉시 view를 만든다.
> 이 구문은 첫 read를 기다리지 않고 바로 `trx_assign_read_view()`를 부른다. 다른 isolation에서는 view를 만들지 않고 warning만 낸다.

| fact | value |
|---|---|
| condition | `trx->isolation_level == TRX_ISO_REPEATABLE_READ` |
| otherwise | warning "InnoDB: WITH CONSISTENT SNAPSHOT … REPEATABLE READ isolation level." |

**Event** · `trx_b → view` · Handler · `START TRANSACTION WITH CONSISTENT SNAPSHOT` · —
**State (view)** · before: closed → after: open at BEGIN (RR only)
**Sources** · [M11]

##### 6.13 `mutate` — purge와 긴 transaction
*부제:* 가장 오래된 view의 `m_low_limit_no`보다 오래된 undo만 지울 수 있다.
> purge는 history list의 undo를 처리해 delete-marked record를 지우고 undo page를 해제한다. 어떤 view의 `m_low_limit_no`보다 작은 trx no의 undo만 지울 수 있다. 그래서 오래 열린 RR transaction 하나가 history를 계속 쌓이게 만든다.

| fact | value |
|---|---|
| `m_low_limit_no` | "transactions whose transaction number is strictly smaller (<) than this value … can be removed in purge if not needed by other views" |
| `innodb_purge_threads` default | 1 if ≤ 16 CPUs, else 4 |
| `innodb_undo_log_truncate` / `innodb_max_undo_log_size` | ON / 1 GiB |

**Event** · `purge → undo` · Undo · `purge up to oldest view` · —
**State (undo)** · before: history `[0x0F20, …]` → after: history keeps `0x0F20` while B's view is open
**Sources** · [M6] [M17] [M14]

### Decoder records

**D6.1 Undo record `TRX_UNDO_UPD_EXIST_REC` for `UPDATE t SET v=5 WHERE id=10`** — layer bar: `framing` · `header` · `system columns` · `PK` · `update vector` · `framing`.

| offset | field | bytes | value | meaning |
|---|---|---|---|---|
| 0 | next record offset | `?? ??` | E.G. | written by `trx_undo_page_set_next_prev_and_add` = end of this record |
| 2 | `type_cmpl` | `5C` | 12 \| 1×16 \| 64 | `UPD_EXIST_REC`, `cmpl_info=1`, `TRX_UNDO_MODIFY_BLOB` |
| 3 | new 1-byte flag | `00` | 0 | "Introducing a new 1-byte flag" |
| 4 | `undo_no` (much-compressed) | `00` | E.G. 0 | first undo record of A |
| 5 | `table_id` (much-compressed) | `84 2A` | E.G. 1066 | `10nnnnnn nnnnnnnn` |
| 7 | info bits | `00` | 0 | record was not delete-marked |
| 8 | old `DB_TRX_ID` (u64 compressed) | `00 00 00 0F 11` | E.G. 0x0F11 | high 32 bits compressed (`00`) + low 4 B |
| 13 | old `DB_ROLL_PTR` (u64 compressed) | `E0 85 00 00 01 23 01 10` | E.G. | high 32 = 0x00850000 as `1110nnnn…` + low 4 B |
| 21 | PK `id` length | `04` | 4 | compressed length |
| 22 | PK `id` | `80 00 00 0A` | 10 | |
| 26 | `n_updated` | `01` | 1 | one field changed |
| 27 | field position | `04` | 4 | `v` is field 4: `id, DB_TRX_ID, DB_ROLL_PTR, k, v` |
| 28 | old value length | `04` | 4 | |
| 29 | old value of `v` | `80 00 00 01` | 1 | |
| 33 | start offset of this record | `?? ??` | E.G. | lets the reader walk backwards |

Body length without the 2 + 2 framing bytes = 31 (0x1F). That is the `len` in D4.2.
Notes: (1) No ordering-field section follows, because it is written only when `!(cmpl_info & UPD_NODE_NO_ORD_CHANGE)`. (2) Whether `UPD_NODE_NO_SIZE_CHANGE` (2) is also ORed into `cmpl_info` before the undo is written was not traced; if it is, the type byte is `0x7C`. **Unverified.**
Sources: [M4] [M5] [M3] [M15] [M19] [M18] [I9] [G7] (the next/start offsets are kept consistent with `TRX_UNDO_PAGE_FREE`, undo page header offset 4)

**D6.2 `ReadView` of B at its first SELECT (in memory)**

| field | value | meaning |
|---|---|---|
| `m_low_limit_id` | E.G. 0x0F21 | ids ≥ this are invisible |
| `m_up_limit_id` | E.G. 0x0F20 | ids < this are visible |
| `m_creator_trx_id` | E.G. 0 | B has written nothing; trx id 0 for read-only use is **unverified** |
| `m_ids` | E.G. `[0x0F20]` | active rw trx at snapshot time |
| `m_low_limit_no` | E.G. 0x0F1E | purge may remove undo of trx no < this |

Sources: [M6] [M7]

**D6.3 `DB_ROLL_PTR` bit layout (7 bytes)** — value `85 00 00 01 23 01 10` from D1.4.

| bits | field | value |
|---|---|---|
| 55 | `is_insert` | 1 |
| 48–54 | `rseg_id` | 5 |
| 16–47 | `page_no` | 0x00000123 = 291 |
| 0–15 | `offset` | 0x0110 = 272 |

Sources: [M2]

### Self-check

1. **Q:** List the three visibility rules of `ReadView::changes_visible`. **A:** Visible if `id < m_up_limit_id` or it is the creator. Invisible if `id ≥ m_low_limit_id`. Otherwise visible only if `id` is not in `m_ids`.
2. **Q:** Under RR, when is the snapshot taken? **A:** At the transaction's first consistent read, not at `BEGIN`. The exception is `START TRANSACTION WITH CONSISTENT SNAPSHOT`, which takes it at once (RR only).
3. **Q:** What makes RC see newly committed rows on each statement? **A:** `external_lock`/`store_lock` close the view at statement boundaries when the isolation is ≤ RC. The next consistent read builds a new one.
4. **Q:** What does an update undo record store to rebuild the old version? **A:** The old `DB_TRX_ID`, the old `DB_ROLL_PTR` (the chain link), the PK, and the old values of the changed fields.
5. **Q:** Why can one idle RR transaction bloat undo? **A:** Its view's `m_low_limit_no` stays old, and purge cannot remove undo that the view may still need.

---

## Lesson 7 — `row-locks-deadlock`

**Goal:** See which record, gap, and next-key locks InnoDB sets for common locking reads under REPEATABLE READ. See how READ COMMITTED differs. Then follow a real deadlock, made by two "select-for-update, then insert" transactions, to its victim.

**Interview questions it answers**
- What are record, gap, next-key, and insert-intention locks? Which conflict?
- Which locks does `… FOR UPDATE` take for a unique match, a range, a non-unique match, or a miss?
- Why do gap locks disappear under READ COMMITTED?
- How does InnoDB detect a deadlock and choose the victim? How is that different from a lock wait timeout?

**Layer selector:** `Handler` · `Lock` · `Page`

**Nodes**

| id | label / sublabel | kind | layer | Isometric illustration idea |
|---|---|---|---|---|
| `t1` | Transaction T1 | client | Handler | Laptop, blue badge |
| `t2` | Transaction T2 | client | Handler | Laptop, purple badge |
| `locksys` | `lock_sys` / record lock hash | framework | Lock | Cabinet of padlocks on hooks keyed by `(page, heap_no)` |
| `leaf` | `PRIMARY` leaf / ids 10,20,30 | storage | Page | Page slab with rows and visible gaps between them; supremum at the end |
| `sec` | `idx_k` leaf | storage | Page | Page slab with `(k,id)` rows |
| `detector` | `lock_wait_timeout_thread` | container | Lock | Watchman with a clock and a magnifier over a wait-for graph |

States: `locksys` (table: trx, index, record, mode, status), `detector` (list: wait-for edges).

Lock notation follows `performance_schema.data_locks.LOCK_MODE`: `X` = next-key, `X,REC_NOT_GAP`, `X,GAP`, `X,GAP,INSERT_INTENTION`.

### Steps

##### 7.1 `mutate` — 먼저 table IX
*부제:* row에 X lock을 걸기 전 table에 `IX` intention lock.
> InnoDB는 row에 S/X를 걸기 전에 table에 IS/IX를 건다. intention lock끼리는 서로 막지 않는다. table 전체 S/X(`LOCK TABLES`)와만 충돌한다. 그래서 여러 transaction이 같은 table의 다른 row를 동시에 잠글 수 있다.

| fact | value |
|---|---|
| modes | `LOCK_IS 0, LOCK_IX 1, LOCK_S 2, LOCK_X 3, LOCK_AUTO_INC 4` |
| IX vs IX | compatible; IX vs S, X: conflict |
| insert precondition | "the table must be at least IX-locked" |

**Event** · `t1 → locksys` · Lock · `TABLE t: IX GRANTED` · —
**State (locksys)** · before: `[]` → after: `[T1 TABLE IX GRANTED]`
**Sources** · [L1] [L3] [L9]

##### 7.2 `mutate` — unique 일치: record만
*부제:* `SELECT * FROM t WHERE id = 20 FOR UPDATE` → `X,REC_NOT_GAP` on 20.
> PK 전체로 equality 검색이면 `unique_search`다. 찾은 record가 delete-mark되지 않았으면 gap을 잠글 필요가 없다. 같은 key가 gap에 새로 들어올 수 없기 때문이다. 그래서 record lock만 건다.

| fact | value |
|---|---|
| condition | `unique_search && !rec_get_deleted_flag(rec)` → `gap_can_intersect_range = false` → `LOCK_REC_NOT_GAP` |
| `LOCK_REC_NOT_GAP` | 1024 |

**Event** · `t1 → leaf` · Lock · `id=20: X,REC_NOT_GAP GRANTED` · —
**State (locksys)** · before: `[IX]` → after: `[IX, PRIMARY 20 X,REC_NOT_GAP]`
**Sources** · [L7] [L5] [L6] [L2]

##### 7.3 `mutate` — 범위: next-key + 끝 gap
*부제:* `WHERE id >= 10 AND id < 25 FOR UPDATE` → 10은 record, 20은 next-key, 30은 gap만.
> 시작 key와 정확히 같은 10은 그 앞 gap을 잠글 필요가 없으므로 `REC_NOT_GAP`이다. 범위 안의 20은 next-key(`X`)이므로, 20과 (10,20) gap을 잠근다. 범위 끝을 넘은 30은 row 자체는 결과가 아니므로 gap만(`X,GAP`) 잠근다. 이 끝 처리는 clustered index를 정순으로 읽는 range scan에만 적용된다.

| fact | value |
|---|---|
| start key equal (clustered, `PAGE_CUR_GE`) | `LOCK_REC_NOT_GAP` |
| inside range | `LOCK_ORDINARY` (0) = next-key |
| first row past stop key | `row_can_be_in_range = false` → `LOCK_GAP` (512); if the stop key itself was found, no lock |

**Event** · `t1 → leaf` · Lock · `10 X,REC_NOT_GAP · 20 X · 30 X,GAP` · —
**State (locksys)** · before: `[IX]` → after: `[IX, 10 X,REC_NOT_GAP, 20 X, 30 X,GAP]`
**Sources** · [L5] [L6] [L2]

##### 7.4 `mutate` — non-unique secondary 일치
*부제:* `WHERE k = 200 FOR UPDATE` → `idx_k`에서 next-key + 다음 record gap, PRIMARY는 record.
> non-unique index equality는 같은 k가 더 있을 수 있으므로 일치한 `(200,20)`에 next-key를 건다. 그다음 처음으로 일치하지 않는 `(300,30)`에는 gap lock만 건다. secondary로 찾은 clustered record에는 unique 조건이므로 `REC_NOT_GAP`을 건다.

| fact | value |
|---|---|
| matched secondary rec | `LOCK_ORDINARY` (`X`) |
| first non-matching rec (`ROW_SEL_EXACT`) | `LOCK_GAP` |
| clustered rec via secondary | `LOCK_REC_NOT_GAP` |

**Event** · `t1 → sec` · Lock · `idx_k (200,20) X · (300,30) X,GAP · PRIMARY 20 X,REC_NOT_GAP` · —
**State (locksys)** · before: `[IX]` → after: `[IX, idx_k 200 X, idx_k 300 X,GAP, PRIMARY 20 X,REC_NOT_GAP]`
**Sources** · [L6] [L21] [L5]

##### 7.5 `mutate` — supremum: 끝없는 범위
*부제:* `WHERE id > 25 FOR UPDATE`는 30과 page의 supremum까지 잠근다.
> 범위가 page 끝까지 가면 InnoDB는 page의 supremum pseudo-record에 lock을 건다. supremum에 걸린 lock은 gap처럼 취급된다. `data_locks`의 `LOCK_DATA`에는 `supremum pseudo-record`로 나온다.

| fact | value |
|---|---|
| supremum rule | `lock_is_on_supremum` is handled like `LOCK_GAP` in conflict checks |
| `LOCK_DATA` text | `supremum pseudo-record` |

**Event** · `t1 → leaf` · Lock · `30 X · supremum X` · —
**State (locksys)** · before: `[IX]` → after: `[IX, 30 X, supremum X]`
**Sources** · [L4] [L11] [L23]

##### 7.6 `mutate` — READ COMMITTED에서는
*부제:* `skip_gap_locks()` = true → gap 없이 record lock만.
> READ COMMITTED와 READ UNCOMMITTED에서 `trx->skip_gap_locks()`가 true다. locking read는 `REC_NOT_GAP`만 걸고, gap/next-key는 걸지 않는다. 그래서 phantom을 막지 못한다. 조건에 안 맞는 row의 lock은 풀 수 있다(`releases_non_matching_rows`).

| fact | value |
|---|---|
| `skip_gap_locks()` | true for `READ_UNCOMMITTED`, `READ_COMMITTED` |
| RC lock type | `LOCK_REC_NOT_GAP` |

**Event** · `t1 → leaf` · Lock · `RC: 10, 20 X,REC_NOT_GAP only` · —
**State (locksys)** · before: `[IX, 10 X,REC_NOT_GAP, 20 X, 30 X,GAP]` (RR) → after: `[IX, 10 X,REC_NOT_GAP, 20 X,REC_NOT_GAP]` (RC)
**Sources** · [L8] [L5] [L22]

##### 7.7 `mutate` — 충돌 규칙
*부제:* gap lock은 기다리지 않는다. insert intention만 gap 때문에 기다린다.
> 같은 trx이거나 mode가 호환되면 충돌이 없다. insert intention이 아닌 gap(또는 supremum) 요청은 아무것도 기다리지 않는다. record lock은 남의 gap lock을 기다리지 않는다. 누구도 insert intention lock을 기다리지 않는다. 남은 경우, 즉 insert intention 대 남의 gap/next-key, 또는 record 대 record는 기다린다.

| fact | value |
|---|---|
| gap vs gap (any mode) | no conflict ("different users can have conflicting lock types on gaps") |
| insert intention | `LOCK_X \| LOCK_GAP \| LOCK_INSERT_INTENTION` (2048) |
| waits for insert intention | never |

**Event** · `locksys → locksys` · Lock · `rec_lock_check_conflict()` · —
**State (locksys)** · before: — → after: — (rule card)
**Sources** · [L4] [L9] [L2]

##### 7.8 `mutate` — 교착 시나리오 ①: T1이 없는 id를 잠근다
*부제:* T1: `SELECT * FROM t WHERE id = 15 FOR UPDATE` → 없음 → 20 앞 gap에 `X,GAP`.
> "있으면 update, 없으면 insert" 패턴이다. id=15가 없으므로 cursor는 다음 record 20에 선다. key가 일치하지 않으므로(`ROW_SEL_EXACT`) RR에서 20에 gap lock을 건다. 즉 (10, 20) 구간이 잠긴다.

| fact | value |
|---|---|
| lock | `PRIMARY 20 X,GAP` (T1) |
| rule | exact match fails → `sel_set_rec_lock(..., LOCK_GAP)` |

**Event** · `t1 → leaf` · Lock · `id=15 miss → 20 X,GAP GRANTED` · —
**State (locksys)** · before: `[]` → after: `[T1 20 X,GAP GRANTED]`
**Sources** · [L6] [L7]

##### 7.9 `mutate` — ② T2도 같은 gap을 잠근다
*부제:* T2: `… WHERE id = 16 FOR UPDATE` → 20에 `X,GAP` 또 GRANTED.
> gap lock끼리는 충돌하지 않는다. T2도 같은 (10, 20) gap에 `X,GAP`을 얻는다. 두 transaction 모두 "아무도 이 구간에 insert 못 한다"는 lock을 가진다.

| fact | value |
|---|---|
| lock | `PRIMARY 20 X,GAP` (T2), GRANTED |
| reason | gap request without insert intention → `NO_CONFLICT` |

**Event** · `t2 → leaf` · Lock · `id=16 miss → 20 X,GAP GRANTED` · —
**State (locksys)** · before: `[T1 20 X,GAP]` → after: `[T1 20 X,GAP, T2 20 X,GAP]`
**Sources** · [L4] [L6]

##### 7.10 `mutate` — ③ T1의 INSERT가 기다린다
*부제:* T1: `INSERT … (15, …)` → 다음 record 20에 `X,GAP,INSERT_INTENTION` 요청 → T2의 gap 때문에 WAITING.
> insert는 넣을 위치의 다음 record(20)에 다른 trx의 gap/next-key lock이 있는지 본다. T2의 `X,GAP`이 있으므로 T1의 insert intention lock은 WAITING이 된다.

| fact | value |
|---|---|
| checked record | `page_rec_get_next(rec)` = successor (20) |
| requested mode | `LOCK_X \| LOCK_GAP \| LOCK_INSERT_INTENTION` |

**Event** · `t1 → leaf` · Lock · `INSERT 15: 20 X,GAP,INSERT_INTENTION WAITING` · —
**State (locksys)** · before: `[T1 GAP, T2 GAP]` → after: `[T1 GAP, T2 GAP, T1 II WAITING]`
**Sources** · [L9] [L4]

##### 7.11 `mutate` — ④ T2의 INSERT도 기다린다 → cycle
*부제:* T2: `INSERT … (16, …)` → T1의 gap 때문에 WAITING. T1 → T2 → T1.
> T2의 insert intention도 T1의 `X,GAP` 때문에 기다린다. 이제 T1은 T2를, T2는 T1을 기다린다. wait-for graph에 cycle이 생긴다.

| fact | value |
|---|---|
| wait-for edges | T1 → T2, T2 → T1 |
| state | both `LOCK_WAIT` (256) set |

**Event** · `t2 → leaf` · Lock · `INSERT 16: 20 X,GAP,INSERT_INTENTION WAITING` · —
**State (detector)** · before: `[T1→T2]` → after: `[T1→T2, T2→T1]` (cycle)
**Sources** · [L9] [L4] [L2]

##### 7.12 `mutate` — deadlock 감지
*부제:* `lock_wait_timeout_thread`가 wait-for graph에서 cycle을 찾는다.
> 8.4에서는 별도 background thread가 lock wait를 관리한다. 이 thread는 timeout을 확인하고, wait-for graph 변화를 분석하고, deadlock을 찾아 해결한다. 기다리는 lock이 있으면 최대 1초마다 깨어나며, 루프마다 deadlock 검사를 한다. `innodb_deadlock_detect`가 OFF면 감지하지 않고 timeout에 맡긴다.

| fact | value |
|---|---|
| thread | `lock_wait_timeout_thread()`; "checks for deadlocks and resolves them" |
| wake-up | `os_event_wait_time_low(event, 1 s)` |
| `innodb_deadlock_detect` default | ON |

**Event** · `detector → locksys` · Lock · `cycle found {T1, T2}` · —
**State (detector)** · before: cycle unresolved → after: victim pending
**Sources** · [L15] [L14]

##### 7.13 `mutate` — victim 선택
*부제:* weight = undo_no + 잡은 lock 수. "가벼운" 쪽을 rollback한다.
> `lock_wait_choose_victim()`은 cycle의 transaction을 비교한다. 우선 non-transactional table을 고친 trx를 무거운 쪽으로 본다. 그다음 `TRX_WEIGHT = undo_no + lock 수`를 비교해, 작은 쪽을 victim으로 고른다. high-priority trx가 있으면 그 규칙이 먼저다.

| fact | value |
|---|---|
| `TRX_WEIGHT(t)` | `t->undo_no + UT_LIST_GET_LEN(t->lock.trx_locks)` |
| tie-break | `trx_weight_ge(chosen, trx)` → the joining smaller trx becomes victim |

**Event** · `detector → t2` · Lock · `victim = T2` (E.G.) · —
**State (detector)** · before: `{T1 w=3, T2 w=3}` (E.G.) → after: victim T2
**Sources** · [L16] [L15]

##### 7.14 `move` — victim에게 1213
*부제:* `ER_LOCK_DEADLOCK` (1213, SQLSTATE 40001) — transaction 전체 rollback.
> victim은 `DB_DEADLOCK`을 받고, InnoDB는 transaction 전체를 rollback한다. 그래서 binlog cache도 비운다. lock wait timeout(1205)은 다르다. 기본으로 마지막 statement만 rollback한다(`innodb_rollback_on_timeout` OFF). T1은 lock을 얻어 insert를 끝낸다.

| fact | value |
|---|---|
| deadlock | `ER_LOCK_DEADLOCK` 1213, SQLSTATE `40001`, "Deadlock found when trying to get lock; try restarting transaction" |
| timeout | `ER_LOCK_WAIT_TIMEOUT` 1205 after `innodb_lock_wait_timeout` = 50 s |
| `innodb_rollback_on_timeout` default | OFF |

**Event** · `locksys → t2` · Handler · `ERROR 1213 (40001)` · —
**State (locksys)** · before: `[T1 GAP, T2 GAP, T1 II WAITING, T2 II WAITING]` → after: `[T1 GAP, T1 II GRANTED]`
**Sources** · [L17] [L18] [L13] [L14]

##### 7.15 `mutate` — 관찰 방법
*부제:* `performance_schema.data_locks`와 `innodb_print_all_deadlocks`.
> 실제 lock은 `performance_schema.data_locks`에서 볼 수 있다. `LOCK_MODE` 문자열은 mode 뒤에 `GAP`, `REC_NOT_GAP`, `INSERT_INTENTION` flag를 쉼표로 붙인 것이다. 모든 deadlock을 error log에 남기려면 `innodb_print_all_deadlocks`를 켠다(기본 OFF).

| fact | value |
|---|---|
| `LOCK_MODE` build | `X` + `,GAP` / `,REC_NOT_GAP` / `,INSERT_INTENTION` (ascending flag order) |
| `LOCK_STATUS` | `GRANTED` or `WAITING` |
| `innodb_print_all_deadlocks` default | OFF |

**Event** · `locksys → t1` · Lock · `SELECT * FROM performance_schema.data_locks` · —
**State (locksys)** · before: — → after: rows as D7.1
**Sources** · [L10] [L12] [L19] [L14]

### Decoder records

**D7.1 `performance_schema.data_locks` at step 7.11** — column names from `table_data_locks.cc`. Trx ids E.G.

| `ENGINE_TRANSACTION_ID` | `OBJECT_NAME` | `INDEX_NAME` | `LOCK_TYPE` | `LOCK_MODE` | `LOCK_STATUS` | `LOCK_DATA` |
|---|---|---|---|---|---|---|
| 3900 (T1) | t | NULL | TABLE | IX | GRANTED | NULL |
| 3900 (T1) | t | PRIMARY | RECORD | X,GAP | GRANTED | 20 |
| 3901 (T2) | t | NULL | TABLE | IX | GRANTED | NULL |
| 3901 (T2) | t | PRIMARY | RECORD | X,GAP | GRANTED | 20 |
| 3900 (T1) | t | PRIMARY | RECORD | X,GAP,INSERT_INTENTION | WAITING | 20 |
| 3901 (T2) | t | PRIMARY | RECORD | X,GAP,INSERT_INTENTION | WAITING | 20 |

Sources: [L10] [L12] [L19] [L11]. (The `LOCK_DATA` rendering of a PK value as `20`, and `INDEX_NAME` = NULL for table locks, are **unverified** here.)

**D7.2 `lock_t::type_mode` bits** — the waiting insert-intention lock of T1.

| bits | constant | value |
|---|---|---|
| 0–3 (`LOCK_MODE_MASK` 0xF) | `LOCK_X` | 3 |
| 4–7 (`LOCK_TYPE_MASK` 0xF0) | `LOCK_REC` | 32 |
| 8 | `LOCK_WAIT` | 256 |
| 9 | `LOCK_GAP` | 512 |
| 10 | `LOCK_REC_NOT_GAP` | 0 (not set) |
| 11 | `LOCK_INSERT_INTENTION` | 2048 |
| **total** | | 3 + 32 + 256 + 512 + 2048 = **2851** |

A next-key lock has none of the gap/not-gap bits (`LOCK_ORDINARY = 0`): `X` granted = 3 + 32 = 35.
Sources: [L1] [L2]

### Self-check

1. **Q:** `SELECT … WHERE id = 20 FOR UPDATE` on an existing PK under RR — which lock? **A:** `X,REC_NOT_GAP` on 20 only, plus table `IX`.
2. **Q:** Two transactions both hold `X,GAP` on the same record. Is that legal? **A:** Yes. Gap locks never conflict with each other. They only block insert-intention requests.
3. **Q:** Explain the deadlock in steps 7.8–7.11. **A:** Both took `X,GAP` on 20 by locking a missing id. Each `INSERT` then needs `X,GAP,INSERT_INTENTION` on 20, which waits for the other's gap lock. That is a cycle.
4. **Q:** How is the victim chosen? **A:** A trx that edited non-transactional tables counts as heavier. Then the lower `undo_no + number of locks` loses.
5. **Q:** Deadlock vs lock wait timeout: error codes and what is rolled back? **A:** 1213 (40001) rolls back the whole transaction. 1205, after 50 s, rolls back only the statement by default.
6. **Q:** How does RC change 7.3's locks? **A:** `skip_gap_locks()` is true, so only `X,REC_NOT_GAP` record locks are taken. There are no gap or next-key locks.

---

## Source index

All URLs are pinned to the tag `mysql-8.4.13`. Version for every entry: **MySQL 8.4.13**. Base: `https://github.com/mysql/mysql-server/blob/mysql-8.4.13/`. For brevity, the base is written as `…/` below, and `IB` stands for `…/storage/innobase`.

### General

| ID | Label | URL |
|---|---|---|
| G1 | `MYSQL_VERSION` (8.4.13, LTS) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/MYSQL_VERSION#L1-L6 |
| G2 | `univ.i` page size constants | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/univ.i#L310-L325 |
| G3 | `innodb_page_size` sysvar | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22837-L22842 |
| G4 | `transaction_isolation` default | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/sys_vars.cc#L5001-L5005 |
| G5 | `DICT_TF_COMPACT` (= not REDUNDANT) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/dict0mem.h#L147-L156 |
| G6 | `innodb_default_row_format` sysvar | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L23343-L23349 |
| G7 | Integer storage: big-endian, sign bit negated | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0mysql.cc#L416-L417 |

### Lesson 1 (index)

| ID | Label | URL |
|---|---|---|
| I1 | FIL header offsets (`fil0types.h`) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/fil0types.h#L39-L119 |
| I2 | `FIL_PAGE_INDEX = 17855` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/fil0fil.h#L1249 |
| I3 | Index page header offsets (`page0types.h`) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/page0types.h#L52-L137 |
| I4 | Page directory constants (`page0page.h`) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/page0page.h#L58-L74 |
| I5 | `infimum_supremum_compact[]` bytes | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/page/page0page.cc#L295-L301 |
| I6 | Compact record header bit fields (`rem/rec.h`) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/rem/rec.h#L86-L161 |
| I7 | Record status values, `REC_NODE_PTR_SIZE` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/rem/rec.h#L181-L190 |
| I8 | `DATA_ROW_ID_LEN`, `DATA_TRX_ID_LEN`, `DATA_ROLL_PTR_LEN` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/data0type.h#L179-L191 |
| I9 | Clustered index system columns | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/dict/dict0dict.cc#L3187-L3202 |
| I10 | Secondary index gets PK columns | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/dict/dict0dict.cc#L3369-L3376 |
| I11 | `create_clustered_index_when_no_primary()`; `GEN_CLUST_INDEX` name | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L12415-L12428 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/dict0mem.h#L1030 |
| I12 | Key sort: UNIQUE NOT NULL first, key #0 may become PK | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/sql_table.cc#L3960-L3990 |
| I13 | Global row id counter | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/dict0boot.ic#L36-L50 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/dict0boot.h#L334 |
| I14 | `btr_cur_search_to_nth_level()` root height, child page | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0cur.cc#L1100-L1107 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0cur.cc#L1542 |
| I15 | `page_cur_search_with_match()` binary then linear | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/page/page0cur.cc#L487-L540 |
| I16 | `need_to_access_clustered` in `build_template` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L8562-L8570 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L8670 |
| I17 | `row_search_mvcc()` secondary → `requires_clust_rec` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L5351-L5376 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L5444-L5465 |
| I18 | `lock_sec_rec_cons_read_sees()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L272-L301 |
| I19 | EXPLAIN `Using index` string | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/sql/opt_explain_traditional.cc#L58 |
| I20 | `PAGE_MAX_TRX_ID` comment | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/page0types.h#L75-L77 |
| I21 | Extent size table; FSEG header | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/fsp0types.h#L60-L94 |
| I22 | `FIL_NULL` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/fil0fil.h#L1183 |

### Lesson 2 (split and merge)

| ID | Label | URL |
|---|---|---|
| P1 | `btr_page_split_and_insert()` (numbered steps 1–8) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0btr.cc#L2299-L2640 |
| P2 | `btr_page_get_split_rec_to_right()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0btr.cc#L1701-L1750 |
| P3 | `btr_page_get_split_rec_to_left()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0btr.cc#L1663-L1699 |
| P4 | `btr_root_raise_and_insert()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0btr.cc#L1477-L1617 |
| P5 | `PAGE_DIRECTION` values and header offsets | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/page0types.h#L66-L72 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/page0types.h#L140-L147 |
| P6 | `DICT_INDEX_MERGE_THRESHOLD_DEFAULT = 50` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/dict0mem.h#L1041 |
| P7 | `BTR_CUR_PAGE_COMPRESS_LIMIT` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/btr0cur.h#L607-L611 |
| P8 | `btr_cur_compress_recommendation()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/btr0cur.ic#L104-L131 |
| P9 | `btr_cur_compress_if_useful()`; call in pessimistic delete | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0cur.cc#L4502-L4537 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0cur.cc#L4812 |
| P10 | `btr_compress()` left then right, lift up | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0btr.cc#L3024-L3130 |
| P11 | `btr_can_merge_with_page()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0btr.cc#L4668-L4740 |
| P12 | `innodb_fill_factor` sysvar (bulk load only) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22739-L22742 |
| P14 | `REC_INFO_MIN_REC_FLAG` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/rem/rec.h#L142-L146 |
| P15 | Insert direction bookkeeping (`page_cur_insert_rec_low` step 6) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/page/page0cur.cc#L1368-L1398 |
| P16 | `btr_cur_del_mark_set_clust_rec()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0cur.cc#L4283-L4292 |
| P17 | `row_purge_remove_clust_if_poss[_low]()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0purge.cc#L133-L250 |
| P18 | `innobase_parse_merge_threshold()` (1–50) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L13672-L13700 |

### Lesson 3 (buffer pool)

| ID | Label | URL |
|---|---|---|
| B1 | `innodb_buffer_pool_size` sysvar; 128 MiB default | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22554-L22562 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/srv/srv0srv.cc#L430 |
| B2 | Instances sysvar, computed default, `BUF_POOL_SIZE_THRESHOLD` = 1 GiB | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22625-L22630 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L4603-L4623 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/srv0start.h#L67 |
| B3 | `innodb_buffer_pool_chunk_size` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22565-L22572 |
| B4 | `BUF_LRU_OLD_MIN_LEN`, `BUF_LRU_OLD_RATIO_*` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/buf0lru.h#L59 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/buf0lru.h#L217-L227 |
| B5 | `BUF_LRU_OLD_TOLERANCE`, `BUF_LRU_NON_OLD_MIN_LEN` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0lru.cc#L60-L74 |
| B6 | `buf_LRU_add_block_low()` midpoint insert | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0lru.cc#L1647-L1716 |
| B7 | Read → old (`buf_page_init_for_read`), create → young (`buf_page_create`) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0buf.cc#L4995 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0buf.cc#L5198 |
| B8 | `buf_page_peek_if_young()`, `buf_page_peek_if_too_old()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/buf0buf.ic#L161-L203 |
| B9 | `innodb_old_blocks_pct`, `innodb_old_blocks_time` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L23040-L23050 |
| B10 | `buf_LRU_make_block_young()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0lru.cc#L1717-L1730 |
| B11 | `innodb_read_ahead_threshold`, `innodb_random_read_ahead` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L23269-L23279 |
| B12 | `buf_page_t` LSN and LRU fields | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/buf0buf.h#L1636-L1696 |
| B13 | `innodb_lru_scan_depth` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22707-L22711 |
| B14 | `innodb_max_dirty_pages_pct` and `_lwm` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22404-L22416 |
| B15 | `innodb_adaptive_hash_index`, `innodb_change_buffering` defaults | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22495-L22500 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L23230-L23235 |
| B16 | `buf_page_get_gen()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0buf.cc#L4465 |
| B17 | `buf_LRU_get_free_block()` strategy comment | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0lru.cc#L1284-L1311 |
| B18 | `n_pages_made_young++` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0lru.cc#L1723 |
| B19 | `buf_flush_insert_into_flush_list()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0flu.cc#L503-L515 |
| B20 | `INNODB_BUFFER_POOL_STATS` columns | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/i_s.cc#L3726-L3800 |

### Lesson 4 (redo and commit)

| ID | Label | URL |
|---|---|---|
| R1 | Redo dir/file names, `LOG_N_FILES`, capacity limits | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/log0constants.h#L73-L103 |
| R2 | `innodb_redo_log_capacity` sysvar | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22863-L22868 |
| R3 | Redo file header and checkpoint offsets | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/log0constants.h#L153-L245 |
| R4 | Log block header/trailer; `OS_FILE_LOG_BLOCK_SIZE = 512` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/log0constants.h#L250-L313 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/os0file.h#L192 |
| R5 | `innodb_log_buffer_size` default 64 MiB | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/log0constants.h#L485-L491 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22845-L22850 |
| R6 | `mtr_t::Command::execute()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/mtr/mtr0mtr.cc#L836-L878 |
| R7 | Redo log threads overview (`log0write.cc`) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/log/log0write.cc#L105-L200 |
| R8 | LSN definitions: `write_lsn`, `flushed_to_disk_lsn`, `available_for_checkpoint_lsn`, `last_checkpoint_lsn` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/log/log0log.cc#L316-L416 |
| R9 | `trx_flush_log_if_needed_low()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0trx.cc#L1758-L1785 |
| R10 | `innodb_flush_log_at_trx_commit`, `innodb_flush_log_at_timeout` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22369-L22380 |
| R11 | `trx_commit_in_memory()` flush decision, `trx_commit_low()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0trx.cc#L2075-L2094 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0trx.cc#L2165-L2199 |
| R12 | `innobase_flush_logs()` (binlog group flush) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L5906-L5943 |
| R13 | `mlog_id_t` values | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/mtr0types.h#L63-L255 |
| R14 | Initial log record; compressed integers | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/mtr0log.ic#L169-L184 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/mach0data.ic#L155-L190 |
| R15 | `MLOG_UNDO_INSERT` write and parse | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0rec.cc#L70-L135 |
| R16 | `log_write_up_to()`, `log_writer()`, `log_flusher()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/log/log0write.cc#L1086 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/log/log0write.cc#L2239 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/log/log0write.cc#L2504 |
| R17 | `LOG_START_LSN`; `innodb_log_write_ahead_size` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/log0constants.h#L153 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/log0constants.h#L521 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22881-L22888 |
| R18 | Single-record flag vs `MLOG_MULTI_REC_END` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/mtr/mtr0mtr.cc#L790-L804 |
| R19 | `log_block_convert_lsn_to_hdr_no()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/log0files_io.h#L548-L551 |
| R20 | Undo tablespace id range (`dict0dict.h`) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/dict0dict.h#L1110-L1127 |

### Lesson 5 (flush and doublewrite)

| ID | Label | URL |
|---|---|---|
| F1 | `buf_flush_write_block_low()` WAL rule and page init | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0flu.cc#L1169-L1257 |
| F2 | `dblwr::write()` call | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0flu.cc#L1252 |
| F3 | `write_dblwr_pages()`, `write_data_pages()`, `write_pages()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0dblwr.cc#L2163-L2255 |
| F4 | `is_fsync_required()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0dblwr.cc#L805-L809 |
| F5 | Doublewrite file name; `dot_ext[]` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0dblwr.cc#L2666-L2668 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/fil/fil0fil.cc#L288-L289 |
| F6 | `innodb_doublewrite`, `_pages`, `_files` sysvars | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22595-L22619 |
| F7 | Doublewrite modes; `Reduced_entry` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/buf0dblwr.h#L268-L325 |
| F8 | Recovery from doublewrite | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0dblwr.cc#L3065-L3080 |
| F9 | FIL trailer | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/fil0types.h#L113-L119 |
| F10 | `innodb_flush_method` and its computed default | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22381-L22385 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L4961-L4966 |
| F11 | `innodb_page_cleaners` and its adjustment | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22398-L22404 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L5038-L5043 |
| F12 | `innodb_io_capacity`, `_max`, and computed max | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22259-L22268 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L4842-L4846 |
| F13 | `innodb_flush_neighbors` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22712-L22719 |
| F14 | Log checkpointer responsibilities | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/log/log0write.cc#L389-L400 |
| F15 | `innodb_adaptive_flushing`, `_lwm` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22416-L22424 |
| F16 | `dblwr::write_complete()` on I/O completion | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/buf/buf0flu.cc#L930 |

### Lesson 6 (MVCC)

| ID | Label | URL |
|---|---|---|
| M2 | Roll pointer build/decode | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/trx0undo.ic#L45-L76 |
| M3 | Undo record types and flags | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/trx0rec.h#L295-L319 |
| M4 | `trx_undo_page_report_modify()` layout | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0rec.cc#L1154-L1372 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0rec.cc#L1500 |
| M5 | `trx_undo_page_set_next_prev_and_add()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0rec.cc#L184-L222 |
| M6 | `ReadView::changes_visible()`, `sees()`, members | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/read0types.h#L163-L188 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/read0types.h#L282-L302 |
| M7 | `ReadView::prepare()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/read/read0read.cc#L447-L469 |
| M8 | `trx_assign_read_view()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0trx.cc#L2319-L2333 |
| M9 | Consistent read assigns the view | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L4824-L4830 |
| M10 | RC view close in `external_lock()` and `store_lock()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L19157-L19163 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L19750-L19759 |
| M11 | `WITH CONSISTENT SNAPSHOT` (RR only) | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L5965-L5999 |
| M12 | `lock_clust_rec_cons_read_sees()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L235-L261 |
| M13 | Build previous version for consistent read | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L5325-L5345 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0vers.cc#L1249 |
| M14 | Insert undo freed; update undo to history | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0undo.cc#L1922-L1957 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0purge.cc#L313-L315 |
| M15 | `cmpl_info` computation; `UPD_NODE_*` flags | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0upd.cc#L3191-L3200 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/row0upd.h#L822-L827 |
| M16 | `TRX_SYS_N_RSEGS`; `TRX_RSEG_N_SLOTS` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/fsp0types.h#L398-L405 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/trx0rseg.h#L189 |
| M17 | `innodb_purge_threads`, `innodb_undo_log_truncate`, `innodb_max_undo_log_size` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22335-L22344 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L23135-L23151 |
| M18 | Undo page header offsets | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/trx0undo.h#L463-L480 |
| M19 | `mach_u64_write_compressed()`, `_much_compressed()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/mach0data.ic#L393-L441 |
| M20 | `btr_cur_update_in_place()`: undo then sys fields | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/btr/btr0cur.cc#L3380-L3393 |

### Lesson 7 (locks)

| ID | Label | URL |
|---|---|---|
| L1 | `lock_mode` enum | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/lock0types.h#L55-L62 |
| L2 | Lock type and precise-mode flags | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/lock0lock.h#L949-L987 |
| L3 | `lock_compatibility_matrix` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/lock0priv.h#L575-L599 |
| L4 | `rec_lock_check_conflict()` rules | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L553-L640 |
| L5 | `row_compare_row_to_range()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L4268-L4375 |
| L6 | Lock type choice; exact-match miss → gap | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L5214-L5232 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L5139-L5150 |
| L7 | `unique_search` condition | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L4605-L4618 |
| L8 | `trx_t::skip_gap_locks()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/trx0trx.h#L1108-L1131 |
| L9 | `lock_rec_insert_check_and_lock()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L5139-L5200 |
| L10 | Lock mode names; `lock_get_mode_str()`; `"RECORD"`/`"TABLE"` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L87-L93 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0lock.cc#L5704-L5765 |
| L11 | `infimum`/`supremum pseudo-record` text | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0i_s.cc#L594-L597 |
| L12 | `performance_schema.data_locks` columns | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/perfschema/table_data_locks.cc#L56-L68 |
| L13 | `innodb_lock_wait_timeout` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L1088-L1092 |
| L14 | `innodb_deadlock_detect`, `innodb_print_all_deadlocks`, `innodb_rollback_on_timeout` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22733-L22738 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L23312-L23315 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L22447-L22451 |
| L15 | `lock_wait_choose_victim()`, `lock_wait_timeout_thread()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0wait.cc#L911-L960 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/lock/lock0wait.cc#L1429-L1460 |
| L16 | `trx_weight_ge()`; `TRX_WEIGHT()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/trx/trx0trx.cc#L2899-L2923 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/trx0trx.h#L1248-L1254 |
| L17 | Deadlock vs timeout rollback scope | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/ha_innodb.cc#L2128-L2149 |
| L18 | Error messages 1205, 1213 | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/share/messages_to_clients.txt#L4359-L4362 and https://github.com/mysql/mysql-server/blob/mysql-8.4.13/share/messages_to_clients.txt#L4475-L4477 |
| L19 | `LOCK_STATUS` `"WAITING"`/`"GRANTED"` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/handler/p_s.cc#L488 |
| L21 | Clustered lock via secondary is `REC_NOT_GAP` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L3268-L3277 |
| L23 | Supremum is locked with `LOCK_ORDINARY` in a locking scan | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/row/row0sel.cc#L4967-L5030 |
| L22 | `releases_non_matching_rows()` | https://github.com/mysql/mysql-server/blob/mysql-8.4.13/storage/innobase/include/trx0trx.h#L1127-L1131 |

The error numbers 1205 and 1213 were derived by counting entries from `start-error-number 1000` in `messages_to_clients.txt`. Both match the `ER_LOCK_WAIT_TIMEOUT`/`ER_LOCK_DEADLOCK` positions. The deadlock entry carries SQLSTATE `40001` on its line.

---

## Open questions and unverified facts

**Access**
1. **Reference Manual not opened.** `dev.mysql.com` was blocked by this session's network policy (CONNECT 403, DNS `ENOTFOUND`). To add manual links next to the code links, allow `dev.mysql.com` in the environment's network settings. Then check these pages, pinned to `/doc/refman/8.4/en/`: `innodb-index-types.html`, `innodb-physical-structure.html`, `index-page-merge-threshold.html`, `innodb-buffer-pool.html`, `innodb-performance-midpoint_insertion.html`, `innodb-redo-log.html`, `innodb-doublewrite-buffer.html`, `innodb-undo-logs.html`, `innodb-multi-versioning.html`, `innodb-consistent-read.html`, `innodb-transaction-isolation-levels.html`, `innodb-locking.html`, `innodb-next-key-locking.html`, `innodb-deadlock-detection.html`, `innodb-parameters.html`.
2. **Release notes not read.** The 8.4.13 release date and the missing `mysql-8.4.12` tag could not be confirmed against `dev.mysql.com/doc/relnotes`. The tag commit date (2026-09-30) is from `git log` only.

**Facts I did not state, or stated as unverified**
3. The manual's "15/16 fill for sequential inserts, 1/2 to 15/16 for random" claim is *not* in this plan. The code shows the split rule (split at the new record, or at the middle record), but no 15/16 constant. Check it against `innodb-physical-structure.html` before adding it.
4. The redo block checksum algorithm (D4.1), the body layout of `MLOG_REC_UPDATE_IN_PLACE` (D4.2), and `LOG_HEADER_CREATOR` text and offset (D4.3) are not decoded.
5. Undo `type_cmpl` byte (D6.1): `0x5C` assumes `cmpl_info = UPD_NODE_NO_ORD_CHANGE` only. Whether `UPD_NODE_NO_SIZE_CHANGE` is ORed in before the undo is written (→ `0x7C`) was not traced.
6. Whether a node pointer in a non-unique secondary index carries the PK suffix (D1.5) is unverified.
7. `LOCK_DATA` value format (`20`) and `INDEX_NAME` for table locks (D7.1) are unverified.
8. A read-only transaction having `m_creator_trx_id = 0` (D6.2) is unverified.
9. The common claim that the first user index's root is page 3 or 4 of a file-per-table tablespace is not used. Page numbers are marked E.G.

**Version differences to decide on**
10. In **9.7.4**, `innodb_change_buffering` has code default `IBUF_USE_ALL`, but its help text still says "OFF (default)". In 8.4.13, the default is `IBUF_USE_NONE`. If the topic pins 9.7, resolve this from the 9.7 manual or from `innodb_init_params()` before writing the fact. Otherwise the plan's other checked defaults are the same in 9.7.4: `old_blocks_pct`, `old_blocks_time`, `io_capacity`, `flush_log_at_trx_commit`, `redo_log_capacity`, `doublewrite_pages`, `doublewrite_files`, `adaptive_hash_index`, `flush_neighbors`, `deadlock_detect`, `log_buffer_size`, `lock_wait_timeout`, `MERGE_THRESHOLD`.
11. The range-scan behavior in step 7.3 (a gap-only lock on the first row past the range end, and no lock when the stop key is found) comes from `row_compare_row_to_range()` in 8.4.13. Older material (5.7-era blogs and books) shows a next-key lock on that row. The release that changed this was not identified. Learners will meet the old answer in interviews, so the lesson should say "8.4 기준".

**Product questions for the owner**
12. Order: the plan keeps the task's order (index → split → buffer pool → redo → flush → MVCC → locks). MVCC and locks are often asked first in interviews. Should lessons 6–7 move up to 2–3? Lessons 1 and 6 are self-contained enough for either order.
13. Lesson 4 + 5 split: the task named "redo log and WAL, and the commit path with the doublewrite buffer" as one item. I split it into a commit lesson and a flush/doublewrite lesson to keep one mechanism per lesson. Confirm.
14. Engine needs that these lessons rely on (for the redesign session):
    - two clients acting at once (lessons 6–7);
    - a `mutate` on a list state that reorders items (LRU, flush list);
    - decoders that are in-memory structs with a text raw pane rather than bytes (D3.1, D6.2, D7.2);
    - one decoder that is a result table (D7.1).
