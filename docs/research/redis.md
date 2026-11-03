---
last-verified: 2026-11-04
sources: [https://github.com/redis/redis/tree/8.10.3, https://github.com/redis/docs/tree/ff4f956f400e348ffd3a00b12ea163016e56f139]
---

# Redis lessons: content plan

Research only. This is the content plan for the Redis topic. It becomes lesson data after the engine prep lands.

It follows:
- `docs/PRODUCT.md` (north star; "Content rule: must-know only")
- `docs/DESIGN.md` (Principles)
- decision 0010 (one mechanism per lesson, about 8 to 12 steps)
- decision 0011 (structure and critical-path flow first, no trivia)

**Changes after the two reviews on 2026-11-04:**
- 12 lessons, matching the Scope list. `expire`, `evict`, and `cache-lock` are separate. `atomicity`, `bigkey-lazyfree`, and `sentinel` are new.
- All lessons share one fixed node layout. Each lesson has a one-line critical path and ends with a replay of it.
- Facts were cut by the must-know test. Byte layouts that engineers never read are gone: listpack, intset, RDB opcodes, and the cluster bus header. Decoders now show what engineers do read: RESP frames, `INFO` sections, `SLOWLOG` entries, AOF text, redirect errors, and Sentinel events.
- 8.x-only features are cut or reduced to one overview line. See "Cut by must-know rule".
- A `move` never changes state. A `mutate` targets a node that has a state panel, and it gives that panel's whole view. Each decoder record names its step and says whether it is wire bytes.

## Pinned version and license

- **Pinned version: Redis Open Source 8.10.3**, released 2026-10-26.
  - Sources: [00-RELEASENOTES#L24](https://github.com/redis/redis/blob/8.10.3/00-RELEASENOTES#L24), [version.h#L1](https://github.com/redis/redis/blob/8.10.3/src/version.h#L1).
  - It is the newest GA tag. 8.12 has only release candidates ([8.12 release notes#L15-L19](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.12-release-notes.md#L15-L19)).
- **License:**
  - Redis 8.0 and later: RSALv2, SSPLv1, or AGPLv3, at the user's choice.
  - Redis 7.2 and earlier: BSD-3-Clause.
  - Sources: [LICENSE.txt#L1-L8](https://github.com/redis/redis/blob/8.10.3/LICENSE.txt#L1-L8), [8.0 release notes#L129-L132](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.0-release-notes.md#L129-L132).
  - We link and paraphrase. We copy no code.
- **Docs source:**
  - redis.io is reachable from local sessions. This cloud session's proxy refused it again on 2026-11-04 (HTTP 403 on CONNECT).
  - So every docs fact was checked in `redis/docs`, the repository that renders redis.io. It is pinned to commit `ff4f956f400e348ffd3a00b12ea163016e56f139`, which was HEAD on 2026-11-03.
- **This differs from decision 0004:**
  - Decision 0004 asks for release-tag URLs. `redis/docs` has no per-release tags, so docs links are pinned to a commit instead.
  - Source-code links use the release tag `8.10.3`, as 0004 asks.
  - The engine session will record a decision on commit pins.

### Source conventions

- **Source code:** links under `https://github.com/redis/redis/blob/8.10.3/`. Version label `Redis 8.10.3`.
- **Docs:** links under `https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/`. Version label `Redis Open Source 8.10 docs (redis/docs ff4f956)`.
- **Line anchors:** every anchor was checked against the pinned trees. Each file exists and each range is in bounds.
- **`E.G.`:** marks a value that changes per run (client id, timestamp, pid, address).

### Step format

- **`move`:** a token travels between two nodes. It changes no state.
- **`mutate`:** a change inside one node that has a state panel. "State" gives the panel's whole view before and after.
- **Record:** names the decoder record the step opens. It is marked `wire` (bytes on a network connection) or `not wire` (file content or a memory view).
- **Limits:** prose has at most 5 lines and 320 characters. Each step has 2 to 3 facts.
- **"(side path)":** marks a step that is not on the critical path. Draw it weaker.
- **Replay:** lists the hops that play once, without stops, at the end of the lesson.

## Topic layout

One layout for all Redis lessons, in scene units (1000 × 640). Each lesson shows only the slots it uses, and a slot's label changes with its role.

The critical path reads left to right: client → I/O → main thread → memory. Disk sits below memory. Other Redis servers sit in the right column.

| Slot id | Position (x, y) | Kind | Role by lesson |
|---|---|---|---|
| `client` | 90, 320 | `client` (`app` in cache-lock) | `redis-cli`; the app; cluster-aware client; Sentinel-aware client |
| `db` | 90, 540 | `storage` | MySQL behind the cache (cache-lock only) |
| `io` | 250, 320 | `framework` | I/O thread (command-path only) |
| `main` | 430, 320 | `framework` | Main thread; master (replication, sentinel); cluster node A |
| `mem` | 620, 200 | `storage` | Keyspace and objects in memory |
| `bg` | 430, 530 | `container` or `framework` | `fork()` child (rdb, aof); bio thread (aof, bigkey-lazyfree) |
| `disk` | 620, 530 | `storage` | `dump.rdb`, `appendonlydir/` |
| `peer1` | 860, 160 | `framework` | Replica 1; cluster node B |
| `peer2` | 860, 320 | `framework` | Replica 2; cluster node C |
| `peer3` | 860, 480 | `framework` | Cluster replica A1 |
| `sen1` `sen2` `sen3` | (300, 70) (430, 70) (560, 70) | `framework` | Sentinels (sentinel only) |

**Illustration ideas** (our own isometric line art):

| Slot | Drawing |
|---|---|
| `client` | laptop |
| `db` | cylinder |
| `io` | small gear on a conveyor |
| `main` | large gear with a loop arrow |
| `mem` | drawer cabinet |
| `bg` | dashed gear (a child process) or a worker gear with a stopwatch (bio) |
| `disk` | platter with file tabs |
| `peer*` | server towers |
| `sen*` | watchtowers |

## Lesson set

| # | id | Title (Korean) | Critical path in one line | Steps |
|---|---|---|---|---|
| 1 | `command-path` | 명령 한 건이 Redis를 지나가는 길 | client → I/O thread (read, parse) → main thread (check, execute) → memory → reply buffer → client | 9 |
| 2 | `encodings` | 작은 자료구조는 listpack, 커지면 변신한다 | write → size check → compact encoding, or a one-way conversion to hashtable / skiplist / quicklist | 8 |
| 3 | `expire` | TTL이 지난 키는 언제 사라지나 | `SET EX` → absolute deadline → deleted on access or by the cron sampler → `DEL` to replicas and AOF | 7 |
| 4 | `evict` | 메모리가 꽉 차면 무엇을 버리나 | write → over `maxmemory` → policy picks a sampled victim → delete → `DEL` to replicas | 8 |
| 5 | `cache-lock` | cache stampede와 Redis lock | miss → DB → fill with TTL; on a hot-key expiry, one `SET NX PX` winner reloads while the others wait | 10 |
| 6 | `atomicity` | 다른 명령이 끼어들지 못하게 | `WATCH` → `MULTI` → queue → `EXEC` runs all at once, or aborts if a watched key changed | 10 |
| 7 | `bigkey-lazyfree` | 큰 키 하나가 서버를 멈춘다 | O(N) command on a big key → the one main thread is busy → every client waits; `UNLINK` frees in the background | 10 |
| 8 | `rdb` | fork 한 번으로 스냅샷 | save point → `fork()` → child writes a temp file while the parent serves (copy-on-write) → atomic rename | 9 |
| 9 | `aof` | 모든 쓰기를 기록한다 | write → AOF buffer → `write()` before the reply → `fsync` per policy → rewrite into a new BASE + INCR | 10 |
| 10 | `replication` | replid와 offset으로 따라잡기 | `PSYNC` → full sync (RDB + buffered writes) → async stream → reconnect from the backlog | 10 |
| 11 | `sentinel` | 누가 master의 죽음을 판정하나 | PING timeout → SDOWN → quorum → ODOWN → majority elects a leader → promote a replica → clients switch | 11 |
| 12 | `cluster` | 16384개 slot과 MOVED/ASK | key → slot → owner node, or a MOVED/ASK redirect; dead master → PFAIL → FAIL → replica elected | 12 |

---

## Lesson 1. `command-path`: 명령 한 건이 Redis를 지나가는 길

**Goal.** See which thread reads a command, which thread runs it, and where the reply waits, for one `SET user:1 alice`.

**Critical path.** client → I/O thread (read, parse) → main thread (check, execute) → memory → reply buffer → client.

**Interview and incident questions**
- Redis는 왜 single-threaded인가? I/O threads는 무엇을 나눠 하나?
- 명령 하나가 원자적인 이유는?
- `-OOM`, `-MOVED` 같은 거절은 어디서 나오나?

**Overview (one line each, not steps).** RESP3(`HELLO 3`)는 map/null 같은 타입을 더한다(연결은 RESP2로 시작). I/O thread 구현은 8.0에서 바뀌었다(8.0 release notes); 원리(실행은 main thread 하나)는 같다.

**Nodes** (topic layout): `client` (redis-cli), `io` (I/O thread), `main` (main thread), `mem` (db0).

**State panels**

| Node | Panel | Initial rows |
|---|---|---|
| `io` | client 7 입력 | `querybuf` = ""; `argv` = [] |
| `main` | client 7 | `검사` = —; `전파 대기` = []; `응답 buffer` = — |
| `mem` | db0 | (empty) |

**Layer selector:** `Network` · `Thread` · `Command` · `Data`.

### Steps

#### S1 · `move` client → main · 연결
- **Subtitle:** main thread 하나가 event loop를 돌며 새 연결을 받는다.
- **Prose:**
  > Redis는 main thread 하나가 event loop(`aeMain`)를 돌며 연결, 읽기, 쓰기 이벤트를 처리합니다. Linux에서는 `epoll`을 씁니다.
  > 연결 수가 `maxclients`를 넘으면 새 연결을 거절합니다.
- **Token:** `request` · `TCP connect :6379`
- **Facts:**
  - `maxclients`: 10000 (over the limit: `-ERR max number of clients reached`)
  - Linux multiplexer: `epoll`
- **Event log:** `client → main · Network · accept fd=12 (E.G.) · —`
- **Sources:** [ae.c#L30-L44](https://github.com/redis/redis/blob/8.10.3/src/ae.c#L30-L44), [config.h#L84-L86](https://github.com/redis/redis/blob/8.10.3/src/config.h#L84-L86), [config.c#L3553](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3553), [networking.c#L1686-L1704](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L1686-L1704)

#### S2 · `move` client → io · RESP 요청 36바이트
- **Subtitle:** 명령은 bulk string의 array: `*3 $3 SET $6 user:1 $5 alice`.
- **Prose:**
  > client는 명령을 bulk string array로 보냅니다. `*`는 원소 수, `$`는 다음 문자열의 바이트 수입니다.
  > 길이를 앞에 적으므로 서버는 값을 훑지 않고 정확히 그만큼 읽습니다.
- **Token:** `request` · `SET user:1 alice`
- **Facts:**
  - Request: array of bulk strings, 36 bytes here
  - A connection starts in RESP2; `HELLO 3` switches it to RESP3
- **Event log:** `client → io · RESP2 · *3 SET user:1 alice · 36 B`
- **Record:** D1.1 (`wire`)
- **Sources:** [protocol-spec.md#L94](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L94), [protocol-spec.md#L221-L225](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L221-L225), [protocol-spec.md#L695](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L695)

#### S3 · `mutate` io · 읽고 파싱만 한다
- **Subtitle:** I/O thread가 socket을 읽어 `argv`를 만든다. 실행은 하지 않는다.
- **Prose:**
  > `io-threads`를 켜면 I/O thread가 socket 읽기, RESP 파싱, 응답 쓰기를 나눠 맡습니다. 기본값 1이면 이것도 main thread가 합니다.
  > 파싱이 끝난 client는 "실행 대기"로 표시되어 main thread로 넘어갑니다.
- **Facts:**
  - `io-threads`: default 1 (main thread only)
  - I/O threads read, parse, and write; they never execute commands
- **Event log:** `io → io · Network · read 36 B, argv[3] · 36 B`
- **State (io: client 7 입력):**
  - before: `querybuf` = ""; `argv` = []
  - after: `querybuf` = 36 B; `argv` = [SET, user:1, alice]
- **Sources:** [config.c#L3507](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3507), [redis.conf#L1414-L1416](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1414-L1416), [networking.c#L3843-L3847](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L3843-L3847)

#### S4 · `move` io → main · 실행은 한 thread에서
- **Subtitle:** 모든 명령은 main thread 하나가 순서대로 실행한다.
- **Prose:**
  > 실행은 main thread 하나가 한 번에 하나씩 합니다. 그래서 명령 하나는 다른 명령과 섞이지 않습니다.
  > 같은 이유로 느린 명령 하나가 도는 동안 다른 모든 client가 기다립니다(lesson 7).
- **Token:** `call` · `client 7: SET`
- **Facts:**
  - Docs: "Redis can serve a single request in every given moment"
  - One slow command delays every other client
- **Event log:** `io → main · Thread · hand client 7 to main thread · —`
- **Sources:** [iothread.c#L663-L673](https://github.com/redis/redis/blob/8.10.3/src/iothread.c#L663-L673), [latency.md#L174-L177](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/latency.md#L174-L177), [latency.md#L191-L197](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/latency.md#L191-L197)

#### S5 · `mutate` main · 실행 전 관문
- **Subtitle:** arity와 ACL, cluster slot, 메모리 검사를 통과해야 실행한다.
- **Prose:**
  > `processCommand()`는 명령과 인자 수, ACL을 확인합니다.
  > cluster 모드면 key의 slot이 이 node 것인지 보고, 아니면 `-MOVED`로 돌려보냅니다(lesson 12).
  > `maxmemory`를 넘었으면 eviction을 시도하고, 실패하면 쓰기 명령을 `-OOM`으로 거절합니다(lesson 4).
- **Facts:**
  - Order: lookup and arity → ACL (`-NOPERM`) → cluster redirect → OOM check → `MULTI` queueing or `call()`
  - Only `DENYOOM` commands (writes such as `SET`) are rejected on OOM; reads still run
- **Event log:** `main → main · Command · processCommand checks passed · —`
- **State (main: client 7):**
  - before: `검사` = —; `전파 대기` = []; `응답 buffer` = —
  - after: `검사` = arity ✓ ACL ✓ slot — OOM — → `call()`; `전파 대기` = []; `응답 buffer` = —
- **Sources:** [server.c#L4506-L4535](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4506-L4535), [server.c#L4590-L4622](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4590-L4622), [server.c#L4655-L4671](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4655-L4671), [server.c#L4831-L4844](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4831-L4844), [set.json#L32-L34](https://github.com/redis/redis/blob/8.10.3/src/commands/set.json#L32-L34)

#### S6 · `mutate` mem · 메모리에 쓴다
- **Subtitle:** `setCommand`가 db0 hash table에 `user:1`을 넣는다.
- **Prose:**
  > `call()`이 `setCommand`를 실행해 키를 메모리의 hash table에 넣습니다. 디스크는 이 경로에 없습니다.
  > 변경 수(`dirty`)가 1 늘고, 이것이 전파와 RDB 저장 시점의 기준이 됩니다.
- **Facts:**
  - All data is in memory; persistence is a separate path (lessons 8, 9)
  - `dirty` counts changes since the last save
- **Event log:** `main → mem · Data · SET user:1 · 5 B value`
- **State (mem: db0):**
  - before: (empty)
  - after: `user:1` → `"alice"`
- **Sources:** [server.c#L4046](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4046), [server.c#L4174-L4196](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4174-L4196)

#### S7 · `mutate` main · slowlog과 전파 예약
- **Subtitle:** 느렸으면 slowlog에 남기고, 데이터를 바꿨으면 AOF와 replica로 보낼 명령을 예약한다.
- **Prose:**
  > 실행 시간이 10 ms를 넘으면 slowlog에 남습니다. 장애 때 가장 먼저 보는 곳입니다.
  > 데이터를 바꾼 명령은 AOF와 replica로 전파할 목록에 들어갑니다.
- **Facts:**
  - `slowlog-log-slower-than`: 10000 µs; `slowlog-max-len`: 128
  - Propagated only if data changed: to AOF and to replicas
- **Event log:** `main → main · Command · call() 12 µs (E.G.), propagate SET · —`
- **State (main: client 7):**
  - before: `검사` = arity ✓ ACL ✓ slot — OOM — → `call()`; `전파 대기` = []; `응답 buffer` = —
  - after: `검사` = arity ✓ ACL ✓ slot — OOM — → `call()`; `전파 대기` = [SET user:1 alice]; `응답 buffer` = `+OK\r\n`
- **Sources:** [server.c#L4112-L4131](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4112-L4131), [config.c#L3568](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3568), [config.c#L3579](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3579), [server.c#L2208](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2208), [networking.c#L284-L310](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L284-L310)

#### S8 · `move` main → io · 잠들기 전: AOF 먼저, 응답은 다음
- **Subtitle:** `beforeSleep`이 AOF buffer를 먼저 파일에 쓰고, 그다음 응답을 보낸다.
- **Prose:**
  > 응답은 바로 socket에 쓰지 않고 buffer에 모아 둡니다. event loop가 잠들기 직전 `beforeSleep()`이 AOF를 먼저 쓰고, 그다음 응답을 내보냅니다.
  > 그래서 `appendfsync always`에서는 응답이 나가기 전에 쓰기가 디스크에 있습니다.
- **Token:** `call` · `client 7: reply ready`
- **Facts:**
  - `beforeSleep` order: `flushAppendOnlyFile` → `handleClientsWithPendingWrites`
  - Batching writes before sleep saves system calls
- **Event log:** `main → io · Thread · beforeSleep: AOF flush, then reply · —`
- **Sources:** [server.c#L2053-L2111](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2053-L2111), [networking.c#L2958-L2997](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L2958-L2997)

#### S9 · `move` io → client · `+OK`
- **Subtitle:** 5바이트 응답. 읽지 않는 client의 응답이 쌓이면 output buffer 한도에서 끊긴다.
- **Prose:**
  > `+OK\r\n`이 client로 갑니다.
  > client가 응답을 읽지 않으면 output buffer에 쌓입니다. 한도를 넘으면 Redis가 연결을 끊습니다. replica와 pub/sub 연결이 실제로 자주 걸리는 지점입니다.
- **Token:** `response` · `+OK`
- **Facts:**
  - Reply: 5 bytes
  - `client-output-buffer-limit` (hard, soft, seconds): normal `0 0 0`, replica `256mb 64mb 60`, pubsub `32mb 8mb 60`
- **Event log:** `io → client · RESP2 · +OK · 5 B`
- **Record:** D1.2 (`wire`)
- **Sources:** [protocol-spec.md#L152-L154](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L152-L154), [redis.conf#L2474-L2476](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2474-L2476)

### Replay

S2 → S4 → S6 → S8 → S9: client → io → main → mem → io → client.

### Decoder records

**D1.1 · step S2 · `wire` · `SET user:1 alice` (36 B).**

| Bytes (text) | Field | Meaning |
|---|---|---|
| `*3\r\n` | array header | 3 elements |
| `$3\r\nSET\r\n` | argv[0] | command |
| `$6\r\nuser:1\r\n` | argv[1] | key |
| `$5\r\nalice\r\n` | argv[2] | value |

Source: [protocol-spec.md#L742-L750](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L742-L750).

**D1.2 · step S9 · `wire` · `+OK` (5 B).**

| Bytes | Field | Meaning |
|---|---|---|
| `+` | type | simple string |
| `OK` | payload | |
| `\r\n` | terminator | |

Footer legend (first byte → type): `+` simple string, `-` error, `:` integer, `$` bulk string, `*` array; RESP3 adds `_` null, `%` map, `>` push and others. Source: [protocol-spec.md#L124-L139](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L124-L139).

### Self-check

1. **Q:** `io-threads 4`이면 명령을 실행하는 thread는 몇 개인가? **A:** 1개. I/O thread는 읽기, 파싱, 쓰기만 한다.
2. **Q:** `-OOM`은 어느 단계에서, 어떤 명령에 나오나? **A:** `processCommand`의 메모리 검사에서, eviction으로도 메모리를 못 비웠을 때 쓰기(`DENYOOM`) 명령에.
3. **Q:** 응답이 output buffer에 쌓이다 연결이 끊기는 경우는? **A:** client가 읽는 속도보다 응답이 빨리 쌓일 때. replica 256mb/64mb 60s, pubsub 32mb/8mb 60s 한도를 넘으면 끊는다.

---

## Lesson 2. `encodings`: 작은 자료구조는 listpack, 커지면 변신한다

**Goal.** See why a small hash costs a fraction of a big one, when it converts, and why the memory jump is one-way.

**Critical path.** write → size check against the thresholds → stays compact (listpack / intset), or converts once to hashtable / skiplist / quicklist.

**Interview and incident questions**
- 작은 hash/zset은 메모리에서 어떤 구조인가? 언제 바뀌나?
- sorted set은 왜 skiplist와 dict를 함께 쓰나?
- 필드를 조금 늘렸을 뿐인데 메모리가 크게 뛴 이유는?

**Overview (one line).** 8.10은 같은 schema의 hash에서 field 이름을 공유하는 "compact hash" 인코딩을 opt-in(기본 꺼짐)으로 추가했다(00-RELEASENOTES).

**Nodes:** `client` (redis-cli), `main`, `mem` (objects).

**State panels**

| Node | Panel | Columns | Initial rows |
|---|---|---|---|
| `mem` | objects | key · type · encoding · size | `db0 dict` · — · hashtable · 4 buckets, 4 keys |

**Layer selector:** `Command` · `Encoding`.

### Steps

#### S1 · `move` client → main · `HSET user:1 name redis age 7`
- **Subtitle:** 필드 2개짜리 작은 hash를 만든다.
- **Prose:**
  > 모든 값은 논리 타입(`type`)과 메모리 속 구조(`encoding`)를 가진 객체입니다. 같은 hash라도 크기에 따라 encoding이 다릅니다.
- **Token:** `request` · `HSET user:1 name redis age 7`
- **Facts:**
  - `OBJECT ENCODING <key>` shows the encoding
  - Common encodings: `listpack`, `intset`, `hashtable`, `skiplist`, `quicklist`, `int`, `embstr`, `raw`
- **Event log:** `client → main · RESP2 · HSET user:1 name redis age 7 · 63 B`
- **Sources:** [object.c#L1302-L1316](https://github.com/redis/redis/blob/8.10.3/src/object.c#L1302-L1316), [object-encoding.md#L62-L93](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/object-encoding.md#L62-L93)

#### S2 · `mutate` mem · 작으면 listpack 한 덩어리
- **Subtitle:** field와 value를 포인터 없이 연속 메모리에 나란히 둔다.
- **Prose:**
  > 작은 hash는 listpack, 즉 field와 value를 이어 붙인 연속 메모리 한 덩어리입니다. 포인터가 없어 hashtable보다 훨씬 작습니다.
  > 찾기는 선형 탐색이지만 원소가 적어 빠릅니다.
- **Facts:**
  - `hash-max-listpack-entries`: 512; `hash-max-listpack-value`: 64 bytes
  - Docs: small aggregates use "up to 10 times less memory"
- **Event log:** `main → mem · Encoding · user:1 created as listpack · 27 B (E.G.)`
- **State (mem: objects):**
  - before: `db0 dict` · — · hashtable · 4 buckets, 4 keys
  - after: `db0 dict` · — · hashtable · 4 buckets, 5 keys; `user:1` · hash · listpack · 2 fields
- **Sources:** [redis.conf#L2215-L2216](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2215-L2216), [memory-optimization.md#L18-L19](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/memory-optimization.md#L18-L19), [memory-optimization.md#L36-L44](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/memory-optimization.md#L36-L44)

#### S3 · `mutate` mem · 한도를 넘으면 hashtable로, 되돌아가지 않는다
- **Subtitle:** 65바이트 값 하나에 전체가 hashtable로 바뀐다. 줄어도 listpack으로 돌아오지 않는다.
- **Prose:**
  > field 수가 512를 넘거나 field/value 하나가 64바이트를 넘는 순간 hashtable로 바뀝니다.
  > 바뀐 hash는 필드를 지워도 listpack으로 돌아가지 않습니다. 긴 값 하나가 메모리를 크게 늘리는 이유입니다.
- **Facts:**
  - Trigger: entries > 512 or any field/value > 64 bytes
  - Hash hashtable → listpack: never
- **Event log:** `main → mem · Encoding · user:1 listpack → hashtable · 65 B value`
- **State (mem: objects):**
  - before: `db0 dict` · — · hashtable · 4 buckets, 5 keys; `user:1` · hash · listpack · 2 fields
  - after: `db0 dict` · — · hashtable · 4 buckets, 5 keys; `user:1` · hash · hashtable · 3 fields
- **Sources:** [t_hash.c#L1561-L1595](https://github.com/redis/redis/blob/8.10.3/src/t_hash.c#L1561-L1595), [t_hash.c#L1147-L1148](https://github.com/redis/redis/blob/8.10.3/src/t_hash.c#L1147-L1148), [memory-optimization.md#L55-L56](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/memory-optimization.md#L55-L56)

#### S4 · `mutate` mem · 정수만 있는 set은 intset
- **Subtitle:** `SADD tags 1 2 3` — 정렬된 정수 배열.
- **Prose:**
  > 원소가 모두 정수이고 512개 이하면 set은 정렬된 정수 배열(intset)입니다. 찾기는 binary search입니다.
- **Facts:**
  - `set-max-intset-entries`: 512
  - Lookup: binary search over a sorted array
- **Event log:** `main → mem · Encoding · tags created as intset · 3 members`
- **State (mem: objects):**
  - before: `db0 dict` · — · hashtable · 4 buckets, 5 keys; `user:1` · hash · hashtable · 3 fields
  - after: `db0 dict` · — · hashtable · 4 buckets, 6 keys; `user:1` · hash · hashtable · 3 fields; `tags` · set · intset · 3 members
- **Sources:** [redis.conf#L2319](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2319), [intset.c#L123-L162](https://github.com/redis/redis/blob/8.10.3/src/intset.c#L123-L162), [t_set.c#L46-L57](https://github.com/redis/redis/blob/8.10.3/src/t_set.c#L46-L57)

#### S5 · `mutate` mem · 문자열이 들어오면 listpack
- **Subtitle:** `SADD tags redis` — 정수가 아니므로 intset을 그만둔다.
- **Prose:**
  > 정수가 아닌 원소가 들어오면 set은 listpack으로, 128개를 넘거나 원소가 64바이트를 넘으면 hashtable로 바뀝니다.
- **Facts:**
  - `set-max-listpack-entries`: 128; `set-max-listpack-value`: 64
  - Order: intset → listpack → hashtable
- **Event log:** `main → mem · Encoding · tags intset → listpack · 4 members`
- **State (mem: objects):**
  - before: `db0 dict` · — · hashtable · 4 buckets, 6 keys; `user:1` · hash · hashtable · 3 fields; `tags` · set · intset · 3 members
  - after: `db0 dict` · — · hashtable · 4 buckets, 6 keys; `user:1` · hash · hashtable · 3 fields; `tags` · set · listpack · 4 members
- **Sources:** [t_set.c#L186-L229](https://github.com/redis/redis/blob/8.10.3/src/t_set.c#L186-L229), [redis.conf#L2325-L2326](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2325-L2326)

#### S6 · `mutate` mem · list는 8 KB listpack의 사슬 (quicklist)
- **Subtitle:** list가 listpack 하나의 한도를 넘으면, listpack 여러 개를 이은 quicklist가 된다.
- **Prose:**
  > 작은 list는 listpack 하나, 크면 listpack node들을 양방향으로 이은 quicklist입니다. node 하나는 기본 8 KB입니다.
  > 양 끝 push/pop은 O(1), 가운데 index 접근은 O(N)입니다.
- **Facts:**
  - `list-max-listpack-size`: −2 (8 KB per node)
  - Back to listpack only when one node is left and under half the limit
- **Event log:** `main → mem · Encoding · queue listpack → quicklist · 2 nodes (E.G.)`
- **State (mem: objects):**
  - before: `db0 dict` · — · hashtable · 4 buckets, 6 keys; `user:1` · hash · hashtable · 3 fields; `tags` · set · listpack · 4 members
  - after: `db0 dict` · — · hashtable · 4 buckets, 7 keys; `user:1` · hash · hashtable · 3 fields; `tags` · set · listpack · 4 members; `queue` · list · quicklist · 2 nodes
- **Sources:** [redis.conf#L2286-L2296](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2286-L2296), [t_list.c#L40-L95](https://github.com/redis/redis/blob/8.10.3/src/t_list.c#L40-L95)

#### S7 · `mutate` mem · sorted set: 129번째 member에서 skiplist + dict
- **Subtitle:** score 순 범위는 skiplist, member로 score 찾기는 dict.
- **Prose:**
  > 작은 sorted set은 listpack(128개, 64바이트까지)입니다. 넘으면 skiplist와 dict를 함께 쓰는 구조로 바뀝니다.
  > `ZSCORE`는 dict로 O(1), `ZRANGE`와 `ZRANK`는 skiplist로 O(log N)입니다. 같은 원소를 두 구조가 함께 가리킵니다.
- **Facts:**
  - `zset-max-listpack-entries`: 128; `zset-max-listpack-value`: 64
  - `ZRANGE` by rank or score: O(log N + M) for M returned members
- **Event log:** `main → mem · Encoding · lb listpack → skiplist · 129 members`
- **State (mem: objects):**
  - before: `db0 dict` · — · hashtable · 4 buckets, 7 keys; `user:1` · hash · hashtable · 3 fields; `tags` · set · listpack · 4 members; `queue` · list · quicklist · 2 nodes
  - after: `db0 dict` · — · hashtable · 4 buckets, 8 keys; `user:1` · hash · hashtable · 3 fields; `tags` · set · listpack · 4 members; `queue` · list · quicklist · 2 nodes; `lb` · zset · skiplist · 129 members
- **Sources:** [redis.conf#L2331-L2332](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2331-L2332), [t_zset.c#L1655-L1659](https://github.com/redis/redis/blob/8.10.3/src/t_zset.c#L1655-L1659), [t_zset.c#L20-L26](https://github.com/redis/redis/blob/8.10.3/src/t_zset.c#L20-L26), [zrange.md#L66](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/zrange.md#L66)

#### S8 · `mutate` mem · hashtable은 조금씩 옮기며 커진다 (incremental rehash)
- **Subtitle:** 키 수가 bucket 수에 닿으면 2배 table을 만들고, 명령마다 조금씩, 한가하면 1 ms씩 옮긴다.
- **Prose:**
  > keyspace도 hashtable입니다. 꽉 차면 두 배 table을 만들고 한 번에 옮기지 않습니다. 명령마다 bucket 하나씩, cron이 1 ms씩 옮깁니다.
  > 옮기는 동안 조회는 두 table을 다 보고, 새 키는 새 table에 넣습니다. fork 자식이 있으면 resize를 미룹니다(lesson 8).
- **Facts:**
  - Expand at keys ≥ buckets; with a fork child only at keys ≥ 4 × buckets
  - `activerehashing yes`: up to 1 ms per cron tick
- **Event log:** `main → mem · Encoding · db0 dict 4 → 8 buckets, rehashing · —`
- **State (mem: objects):**
  - before: `db0 dict` · — · hashtable · 4 buckets, 8 keys; `user:1` · hash · hashtable · 3 fields; `tags` · set · listpack · 4 members; `queue` · list · quicklist · 2 nodes; `lb` · zset · skiplist · 129 members
  - after: `db0 dict` · — · hashtable · rehashing 4 → 8 buckets, 8 keys; `user:1` · hash · hashtable · 3 fields; `tags` · set · listpack · 4 members; `queue` · list · quicklist · 2 nodes; `lb` · zset · skiplist · 129 members
- **Sources:** [dict.c#L1658-L1673](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L1658-L1673), [dict.c#L471-L473](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L471-L473), [dict.c#L786-L789](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L786-L789), [dict.c#L550-L552](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L550-L552), [server.h#L147](https://github.com/redis/redis/blob/8.10.3/src/server.h#L147), [redis.conf#L2414-L2432](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2414-L2432), [server.c#L819-L833](https://github.com/redis/redis/blob/8.10.3/src/server.c#L819-L833)

### Replay

S1 → S2 → S3: client → main → mem (listpack) → mem (hashtable).

### Decoder records

None. The listpack and intset byte layouts were cut by the must-know rule. `OBJECT ENCODING` and `MEMORY USAGE` are what engineers use, and S1 names them.

### Self-check

1. **Q:** hash가 listpack에서 hashtable로 바뀌는 조건은? **A:** field 수 > 512, 또는 field/value 하나 > 64바이트. 되돌아가지 않는다.
2. **Q:** sorted set이 skiplist와 dict를 함께 쓰는 이유는? **A:** dict로 member → score를 O(1)에, skiplist로 score 순 범위와 rank를 O(log N)에 찾기 위해서.
3. **Q:** keyspace가 커질 때 서버가 멈추지 않는 이유는? **A:** incremental rehash. 두 table을 두고 명령마다, 그리고 cron이 1 ms씩 bucket을 옮긴다.

---

## Lesson 3. `expire`: TTL이 지난 키는 언제 사라지나

**Goal.** See that an expired key leaves memory in two ways (on access, and by a sampling job), and that only the master deletes it.

**Critical path.** `SET EX` → absolute deadline stored → deleted on access or by the cron sampler → `DEL` to replicas and AOF.

**Interview and incident questions**
- TTL이 지난 키는 바로 지워지나? 메모리에 남을 수 있나?
- replica에서 만료된 키를 읽으면?
- `SET`으로 값을 바꿨더니 TTL이 사라진 이유는?
- 많은 키가 같은 순간에 만료되면 무슨 일이?

**Nodes:** `client` (app), `main`, `mem` (db0), `peer1` (replica).

**State panels**

| Node | Panel | Columns | Initial rows |
|---|---|---|---|
| `mem` | db0 | key · value · expires at | `cart:1` · … · 1793750401000 (E.G.); `cart:2` · … · 1793750401000 (E.G.) |
| `main` | expire cycle | item · value | `stale %` = 0; `repeat` = no |

**Layer selector:** `Command` · `Expire` · `Replication`.

**Example clock:** `1793750400000` ms = 2026-11-04T00:00:00Z (E.G.).

### Steps

#### S1 · `move` client → main · `SET session:42 v EX 60`
- **Subtitle:** 60초 TTL로 쓴다.
- **Prose:**
  > `EX`, `PX`, `EXPIRE`는 모두 "지금 + TTL"을 절대 시각(Unix ms)으로 바꿔 저장합니다.
- **Token:** `request` · `SET session:42 v EX 60`
- **Facts:**
  - Stored as an absolute Unix time in ms
  - `TTL` returns seconds left, `-1` for no TTL, `-2` for a missing key
- **Event log:** `client → main · RESP2 · SET session:42 v EX 60 · 53 B`
- **Sources:** [expire.c#L726-L754](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L726-L754), [ttl.md#L58-L63](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/ttl.md#L58-L63)

#### S2 · `mutate` mem · 만료 시각을 절대값으로 저장
- **Subtitle:** 서버 시계 기준 절대 시각. 값을 덮어쓰는 `SET`은 TTL을 지운다.
- **Prose:**
  > 만료 시각은 서버의 wall clock 기준 절대값입니다. Redis가 꺼져 있어도 시간은 흐르고, 시계를 앞으로 돌리면 키가 바로 만료됩니다.
  > 흔한 버그: `KEEPTTL` 없이 `SET`하면 TTL이 사라집니다. `INCR`, `HSET` 같은 수정은 TTL을 유지합니다.
- **Facts:**
  - `SET` without `KEEPTTL` discards the TTL; `DEL`, `SET`, `GETSET`, `*STORE` clear it; `INCR`/`LPUSH`/`HSET` keep it
  - Propagated to replicas and AOF as `SET … PXAT <ms>`, so every copy uses the same deadline
- **Event log:** `main → mem · Expire · session:42 expires at 1793750460000 (E.G.) · —`
- **State (mem: db0):**
  - before: `cart:1` · … · 1793750401000; `cart:2` · … · 1793750401000
  - after: `cart:1` · … · 1793750401000; `cart:2` · … · 1793750401000; `session:42` · v · 1793750460000
- **Record:** D3.1 (`wire`)
- **Sources:** [expire.md#L81-L94](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/expire.md#L81-L94), [expire.md#L242-L254](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/expire.md#L242-L254), [set.md#L140](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/set.md#L140), [t_string.c#L193-L205](https://github.com/redis/redis/blob/8.10.3/src/t_string.c#L193-L205)

#### S3 · `move` client → main · 60초 뒤 `GET session:42`
- **Subtitle:** 이미 만료된 키를 읽는다.
- **Prose:**
  > 키를 찾을 때마다 Redis는 먼저 만료 시각을 확인합니다.
- **Token:** `request` · `GET session:42`
- **Facts:**
  - Every key lookup checks `now > expires at` first
  - `now` is fixed at the start of a command or script, so a key cannot expire halfway through one
- **Event log:** `client → main · RESP2 · GET session:42 · 30 B`
- **Sources:** [db.c#L279-L306](https://github.com/redis/redis/blob/8.10.3/src/db.c#L279-L306), [db.c#L2941-L2951](https://github.com/redis/redis/blob/8.10.3/src/db.c#L2941-L2951), [server.c#L262-L276](https://github.com/redis/redis/blob/8.10.3/src/server.c#L262-L276)

#### S4 · `mutate` mem · 읽을 때 지운다 (lazy)
- **Subtitle:** 만료됐으면 그 자리에서 지우고 null을 돌려준다.
- **Prose:**
  > 만료된 키는 읽는 순간 지워지고 client는 null을 받습니다(lazy expiration).
  > 다시 읽히지 않는 키는 이 방식으로는 영원히 남습니다. 그래서 따로 훑는 작업(S6)이 있습니다.
- **Facts:**
  - Docs: "A key is passively expired when a client tries to access it and the key is timed out"
  - Keyspace event: `expired`
- **Event log:** `main → mem · Expire · session:42 expired on access → nil · —`
- **State (mem: db0):**
  - before: `cart:1` · … · 1793750401000; `cart:2` · … · 1793750401000; `session:42` · v · 1793750460000
  - after: `cart:1` · … · 1793750401000; `cart:2` · … · 1793750401000
- **Sources:** [expire.md#L258-L267](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/expire.md#L258-L267), [db.c#L2890-L2892](https://github.com/redis/redis/blob/8.10.3/src/db.c#L2890-L2892)

#### S5 · `move` main → peer1 · 지운 사실은 `DEL`로 전파
- **Subtitle:** replica는 스스로 지우지 않고 master의 `DEL`을 기다린다.
- **Prose:**
  > 만료 삭제는 master만 합니다. 지우면 `DEL`(lazyfree를 켜면 `UNLINK`)을 AOF와 replica로 보냅니다.
  > replica는 자기 시계로 만료를 판단해 읽기에는 "없다"고 답하지만, 실제로 지우지는 않습니다.
- **Token:** `data` · `DEL session:42`
- **Facts:**
  - Expiry is centralized in the master; replicas wait for its `DEL`
  - Replica reads of an expired key return nothing
- **Event log:** `main → peer1 · Replication · DEL session:42 · 30 B`
- **Sources:** [expire.md#L271-L281](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/expire.md#L271-L281), [replication.md#L282-L283](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L282-L283), [db.c#L2918-L2930](https://github.com/redis/redis/blob/8.10.3/src/db.c#L2918-L2930)

#### S6 · `mutate` mem · 읽히지 않는 키는 cron이 샘플링해 지운다 (active)
- **Subtitle:** 초당 10번, TTL 있는 키를 20개씩 훑고, 만료 비율이 높으면 반복한다.
- **Prose:**
  > master의 `serverCron`이 TTL 있는 키를 20개씩 훑어 만료된 것을 지웁니다. 만료된 비율이 10%를 넘으면 반복합니다.
  > 한 번에 CPU 시간의 25%까지만 씁니다. 그래서 만료된 키가 잠시 메모리에 남을 수 있습니다.
- **Facts:**
  - Runs `hz` times per second (default 10), 20 keys per loop
  - Repeats while more than 10% of sampled keys were expired; time cap 25% of CPU
- **Event log:** `main → mem · Expire · active cycle: sampled 20, expired 2 · 0.3 ms (E.G.)`
- **State (mem: db0):**
  - before: `cart:1` · … · 1793750401000; `cart:2` · … · 1793750401000
  - after: (empty)
- **Sources:** [expire.c#L56-L100](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L56-L100), [expire.c#L433-L447](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L433-L447), [server.c#L1312-L1318](https://github.com/redis/redis/blob/8.10.3/src/server.c#L1312-L1318), [server.h#L119](https://github.com/redis/redis/blob/8.10.3/src/server.h#L119)

#### S7 · `mutate` main · 같은 순간에 많이 만료되면 지연 (side path)
- **Subtitle:** 같은 시각으로 `EXPIREAT`한 키가 많으면 active cycle이 반복되며 지연이 생긴다.
- **Prose:**
  > 만료 비율이 높으면 cycle이 계속 반복되므로, 같은 순간에 많은 키가 만료되면 서버가 잠시 막힐 수 있습니다.
  > docs는 같은 Unix 시각으로 `EXPIREAT`을 많이 거는 경우를 예로 듭니다.
- **Facts:**
  - Docs: "many keys expiring at the same moment can be a source of latency"
  - Big expired values are freed on the main thread unless `lazyfree-lazy-expire yes` (default `no`)
- **Event log:** `main → main · Expire · active cycle repeating, 100k keys expired at 00:00:01 (E.G.) · 25 ms`
- **State (main: expire cycle):**
  - before: `stale %` = 0; `repeat` = no
  - after: `stale %` = 80 (E.G.); `repeat` = yes, until the time cap
- **Sources:** [latency.md#L571-L575](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/latency.md#L571-L575), [config.c#L3411](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3411)

### Replay

S1 → S3 → S5: client → main → mem (deadline, then deleted) → peer1 (`DEL`).

### Decoder records

**D3.1 · step S2 · `wire` · how `SET session:42 v EX 60` reaches replicas and the AOF.**

| Bytes (text) | Field | Value |
|---|---|---|
| `*5\r\n` | array header | 5 args |
| `$3\r\nSET\r\n` `$10\r\nsession:42\r\n` `$1\r\nv\r\n` | command, key, value | |
| `$4\r\nPXAT\r\n` | expire option | `EX` rewritten to `PXAT` |
| `$13\r\n1793750460000\r\n` | deadline | now + 60000 ms (E.G.) |

Sources: [t_string.c#L193-L205](https://github.com/redis/redis/blob/8.10.3/src/t_string.c#L193-L205), [expire.c#L824-L828](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L824-L828).

### Self-check

1. **Q:** 만료된 키가 지워지는 두 경로는? **A:** 읽을 때 확인해 지우는 lazy, cron이 TTL 있는 키를 샘플링해 지우는 active.
2. **Q:** replica에서 만료된 키를 읽으면? 누가 지우나? **A:** 없다고 답한다. 삭제는 master가 보내는 `DEL`로 한다.
3. **Q:** `SET key newvalue` 후 TTL이 `-1`이 된 이유는? **A:** `SET`은 `KEEPTTL` 없이 쓰면 기존 TTL을 버린다.

---

## Lesson 4. `evict`: 메모리가 꽉 차면 무엇을 버리나

**Goal.** See what happens to a write when memory hits `maxmemory`: rejected under the default policy, or a sampled victim is deleted under an eviction policy.

**Critical path.** write → over `maxmemory` → policy picks a sampled victim → delete → `DEL` to replicas.

**Interview and incident questions**
- `maxmemory`에 닿으면? 기본 정책은?
- 캐시 용도라면 어떤 정책을? `volatile-*`를 골랐는데 `-OOM`이 나는 이유는?
- Redis LRU가 "근사"인 이유는?

**Overview (one line).** 8.6부터 쓰기 시각 기준 LRM 정책 2개가 추가되었다(eviction docs).

**Nodes:** `client` (app), `main`, `mem` (db0), `peer1` (replica).

**State panels**

| Node | Panel | Columns | Initial rows |
|---|---|---|---|
| `main` | memory | item · value | `used` = 0.99 GB (E.G.); `maxmemory` = 1gb (E.G.); `policy` = noeviction; `결과` = — |
| `mem` | db0 (idle time) | key · idle | `product:311` · 9000 s; `cart:12` · 4200 s; `user:7` · 3 s (E.G.) |

**Layer selector:** `Command` · `Evict` · `Replication`.

### Steps

#### S1 · `move` client → main · 메모리가 한도에 닿은 상태에서 쓰기
- **Subtitle:** `SET cart:9 …` — 이 쓰기로 사용량이 `maxmemory`를 넘는다.
- **Prose:**
  > 쓰기 명령이 오면 실행 전에 메모리를 확인합니다(lesson 1 S5). `maxmemory`가 설정되어 있고 넘었으면 정책에 따라 메모리를 비웁니다.
- **Token:** `request` · `SET cart:9 …`
- **Facts:**
  - `maxmemory`: 0 by default = no limit on 64-bit systems
  - The check runs before every command while `maxmemory` is set
- **Event log:** `client → main · RESP2 · SET cart:9 … · 2 KB (E.G.)`
- **Sources:** [config.c#L3589](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3589), [eviction/index.md#L60-L62](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/eviction/index.md#L60-L62), [server.c#L4655-L4671](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4655-L4671)

#### S2 · `mutate` main · 기본 정책 `noeviction`: 쓰기 거절
- **Subtitle:** 아무것도 지우지 않고 쓰기 명령에 `-OOM`을 돌려준다. 읽기는 계속 된다.
- **Prose:**
  > 기본 정책 `noeviction`은 메모리를 비우지 않습니다. 쓰기 명령은 `-OOM` 오류, 읽기는 정상입니다.
  > 캐시로 쓰면서 정책을 안 바꾸면, 메모리가 찬 순간 쓰기 장애가 됩니다.
  > replica 출력 buffer(backlog 초과분)와 AOF buffer는 사용량 계산에서 뺍니다.
- **Facts:**
  - `maxmemory-policy`: `noeviction`
  - Error: `-OOM command not allowed when used memory > 'maxmemory'.`
- **Event log:** `main → client · RESP2 · -OOM command not allowed … · 58 B`
- **State (main: memory):**
  - before: `used` = 0.99 GB; `maxmemory` = 1gb; `policy` = noeviction; `결과` = —
  - after: `used` = 1.00 GB; `maxmemory` = 1gb; `policy` = noeviction; `결과` = 쓰기 `-OOM`, 읽기 OK
- **Record:** D4.1 (`wire`)
- **Sources:** [config.c#L3491](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3491), [server.c#L2249-L2250](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2249-L2250), [evict.c#L549-L551](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L549-L551), [evict.c#L310-L358](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L310-L358)

#### S3 · `mutate` main · 캐시라면 eviction 정책을 고른다
- **Subtitle:** 범위(`allkeys` / `volatile`) × 기준(LRU, LFU, random, TTL).
- **Prose:**
  > `allkeys-*`는 모든 키, `volatile-*`는 TTL 있는 키만 후보입니다. TTL 있는 키가 하나도 없으면 `volatile-*`는 `noeviction`처럼 `-OOM`을 냅니다.
  > 캐시 전용이면 보통 `allkeys-lru`나 `allkeys-lfu`입니다.
- **Facts:**
  - Policies: `noeviction`, `allkeys-lru`, `volatile-lru`, `allkeys-lfu`, `volatile-lfu`, `allkeys-random`, `volatile-random`, `volatile-ttl`
  - Docs: `volatile-*` "behave like `noeviction` if no keys have an associated expiration"
- **Event log:** `client → main · RESP2 · CONFIG SET maxmemory-policy allkeys-lru · —`
- **State (main: memory):**
  - before: `used` = 1.00 GB; `maxmemory` = 1gb; `policy` = noeviction; `결과` = 쓰기 `-OOM`, 읽기 OK
  - after: `used` = 1.00 GB; `maxmemory` = 1gb; `policy` = allkeys-lru; `결과` = —
- **Sources:** [redis.conf#L1233-L1266](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1233-L1266), [eviction/index.md#L104-L118](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/eviction/index.md#L104-L118)

#### S4 · `move` client → main · 같은 쓰기를 다시
- **Subtitle:** 이번에는 실행 전에 eviction이 돈다.
- **Prose:**
  > 같은 `SET`이 다시 옵니다. `processCommand()`가 명령 실행 전에 `performEvictions()`를 불러, 한도 아래로 내려갈 때까지 키를 지웁니다.
- **Token:** `request` · `SET cart:9 …`
- **Facts:**
  - Eviction runs synchronously before the command, on the main thread
  - If one pass cannot free enough, it continues in later event loop iterations
- **Event log:** `client → main · RESP2 · SET cart:9 … · 2 KB (E.G.)`
- **Sources:** [server.c#L4655-L4671](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4655-L4671), [evict.c#L515-L521](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L515-L521)

#### S5 · `mutate` main · 근사 LRU: 몇 개만 뽑아 가장 오래 안 쓴 키를 고른다
- **Subtitle:** 전체를 정렬하지 않는다. 5개를 샘플링해 후보 pool에 넣고 idle이 가장 긴 키를 고른다.
- **Prose:**
  > 정확한 LRU는 모든 키를 순서대로 엮어야 해 메모리가 듭니다. Redis는 `maxmemory-samples`(5)개를 뽑아 후보 pool에 넣고, 그중 가장 오래 안 쓴 키를 지웁니다.
  > 샘플을 10으로 올리면 실제 LRU에 가까워지고 CPU를 더 씁니다.
- **Facts:**
  - `maxmemory-samples`: 5 (10 approximates true LRU very closely, at more CPU)
  - Idle time comes from a per-object access clock with 1-second resolution
- **Event log:** `main → main · Evict · sampled 5, victim product:311 (idle 9000 s) · —`
- **State (main: memory):**
  - before: `used` = 1.00 GB; `maxmemory` = 1gb; `policy` = allkeys-lru; `결과` = —
  - after: `used` = 1.00 GB; `maxmemory` = 1gb; `policy` = allkeys-lru; `결과` = victim `product:311`
- **Sources:** [redis.conf#L1270-L1278](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1270-L1278), [config.c#L3522](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3522), [evict.c#L93-L96](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L93-L96), [object.h#L92-L94](https://github.com/redis/redis/blob/8.10.3/src/object.h#L92-L94)

#### S6 · `mutate` mem · 희생 키 삭제
- **Subtitle:** `product:311`을 지우고 메모리가 한도 아래로 내려가면 `SET`을 실행한다.
- **Prose:**
  > 고른 키를 지웁니다. 기본은 main thread에서 바로 해제하므로, 큰 키가 뽑히면 그만큼 지연이 생깁니다(`lazyfree-lazy-eviction`, lesson 7).
  > `INFO stats`의 `evicted_keys`가 늘어납니다.
- **Facts:**
  - `lazyfree-lazy-eviction`: no (freed on the main thread)
  - Counter: `evicted_keys` in `INFO stats`
- **Event log:** `main → mem · Evict · evict product:311 · 2.1 KB freed (E.G.)`
- **State (mem: db0):**
  - before: `product:311` · 9000 s; `cart:12` · 4200 s; `user:7` · 3 s
  - after: `cart:12` · 4200 s; `user:7` · 3 s; `cart:9` · 0 s
- **Sources:** [evict.c#L686](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L686), [db.c#L2895-L2896](https://github.com/redis/redis/blob/8.10.3/src/db.c#L2895-L2896), [db.c#L2842](https://github.com/redis/redis/blob/8.10.3/src/db.c#L2842), [config.c#L3410](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3410)

#### S7 · `move` main → peer1 · eviction도 `DEL`로 전파
- **Subtitle:** replica는 스스로 evict하지 않고 master의 `DEL`을 따른다.
- **Prose:**
  > master가 지운 키는 `DEL`로 replica와 AOF에 전파됩니다.
  > replica는 기본적으로 `maxmemory`를 무시합니다. 그래서 replica 메모리도 master와 같은 여유가 필요합니다.
- **Token:** `data` · `DEL product:311`
- **Facts:**
  - `replica-ignore-maxmemory`: yes
  - Docs: eviction "will be just handled by the master, sending the DEL commands to the replica"
- **Event log:** `main → peer1 · Replication · DEL product:311 · 31 B`
- **Sources:** [db.c#L2918-L2930](https://github.com/redis/redis/blob/8.10.3/src/db.c#L2918-L2930), [redis.conf#L1288-L1306](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1288-L1306), [config.c#L3429](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3429)

#### S8 · `mutate` main · 자주 쓰는 키를 지키려면 LFU
- **Subtitle:** LFU는 최근성 대신 접근 빈도로 고른다. 빈도는 로그로 늘고 시간이 지나면 줄어든다.
- **Prose:**
  > LRU는 한 번 훑고 지나간 키도 "최근"으로 봅니다. LFU는 접근 빈도를 세서, 자주 쓰는 키를 남깁니다.
  > counter는 로그 확률로 늘고 1분마다 줄어, 예전에만 인기 있던 키는 밀려납니다. `OBJECT FREQ`로 볼 수 있습니다.
- **Facts:**
  - `lfu-log-factor`: 10 (about 1M hits saturate the 8-bit counter); `lfu-decay-time`: 1 minute
  - `OBJECT FREQ` works only under an LFU policy
- **Event log:** `client → main · RESP2 · CONFIG SET maxmemory-policy allkeys-lfu · —`
- **State (main: memory):**
  - before: `used` = 1.00 GB; `maxmemory` = 1gb; `policy` = allkeys-lru; `결과` = victim `product:311`
  - after: `used` = 1.00 GB; `maxmemory` = 1gb; `policy` = allkeys-lfu; `결과` = —
- **Sources:** [redis.conf#L2571-L2608](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2571-L2608), [config.c#L3518-L3519](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3518-L3519), [object-freq.md#L51](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/object-freq.md#L51)

### Replay

S4 → S5 → S6 → S7: client → main (sample) → mem (delete) → peer1 (`DEL`).

### Decoder records

**D4.1 · step S2 · `wire` · OOM error reply.**

| Bytes (text) | Field | Meaning |
|---|---|---|
| `-` | type | error |
| `OOM` | error code | first word; client libraries map it to an exception type |
| ` command not allowed when used memory > 'maxmemory'.` | message | |
| `\r\n` | terminator | |

Source: [server.c#L2249-L2250](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2249-L2250).

### Self-check

1. **Q:** 기본 설정에서 메모리가 `maxmemory`에 닿으면? **A:** `noeviction`이므로 쓰기 명령은 `-OOM`, 읽기는 정상.
2. **Q:** `volatile-lru`인데 `-OOM`이 나는 이유는? **A:** TTL 있는 키가 없으면 후보가 없어 `noeviction`처럼 동작한다.
3. **Q:** Redis LRU가 근사인 이유는? **A:** 전체를 정렬하지 않고 5개를 샘플링해 후보 pool에서 idle이 가장 긴 키를 지운다.

---

## Lesson 5. `cache-lock`: cache stampede와 Redis lock

**Goal.** See the cache-aside read and write paths, what a hot key's expiry does to the database, how a `SET NX PX` lock lets one instance reload, and why that lock can break on failover.

**Critical path.** miss → DB → fill with TTL; on a hot-key expiry, one `SET NX PX` winner reloads while the others wait.

**Interview and incident questions**
- cache-aside에서 DB를 바꿀 때 캐시는? 오래된 값은 얼마나 남나?
- cache stampede(thundering herd)는 왜 생기고 어떻게 막나?
- `SET NX PX` lock의 값을 랜덤 token으로 하는 이유와 해제 방법은?
- master-replica에서 이 lock이 안전하지 않은 이유는?

**Overview (one line).** 8.4부터 `DELEX key IFEQ token`으로 Lua 없이 비교 후 삭제할 수 있다(distributed-locks docs).

**Nodes:** `client` (app: order-api ×N, kind `app`), `db` (MySQL), `main` (Redis master), `mem` (keys), `peer1` (replica).

**State panels**

| Node | Panel | Columns | Initial rows |
|---|---|---|---|
| `mem` | keys | key · value · TTL | (empty) |
| `peer1` | replica | item · value | `role` = replica; `lock:order:9` = — |

**Layer selector:** `Cache` · `Lock` · `Failover`.

### Steps

#### S1 · `move` client → main · 캐시에서 먼저 읽는다
- **Subtitle:** `GET product:7` → 없음(miss).
- **Prose:**
  > cache-aside에서 앱은 먼저 Redis를 읽습니다. 없으면 DB에서 읽어 Redis에 넣습니다. 캐시는 앱이 채우고 지웁니다.
- **Token:** `request` · `GET product:7`
- **Facts:**
  - Docs: "The application reads from Redis on every request, falls back to the primary on a miss, and writes the result back to Redis"
  - Key per entity, for example `cache:{entity}:{id}`
- **Event log:** `client → main · RESP2 · GET product:7 → nil · 28 B / 5 B`
- **Sources:** [cache-aside/_index.md#L41](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/_index.md#L41)

#### S2 · `move` client → db · miss면 DB에서 읽는다
- **Subtitle:** `SELECT … WHERE id = 7`.
- **Prose:**
  > miss면 원본 DB(primary)에서 읽습니다. 이 왕복이 캐시가 아끼려던 비용입니다.
- **Token:** `request` · `SELECT * FROM product WHERE id=7`
- **Facts:**
  - The primary stays the source of truth; the cache holds a copy
  - A miss costs one DB round trip plus one Redis write
- **Event log:** `client → db · SQL · SELECT product 7 · 15 ms (E.G.)`
- **Sources:** [cache-aside/_index.md#L41](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/_index.md#L41), [cache-aside/redis-py/_index.md#L33-L42](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/redis-py/_index.md#L33-L42)

#### S3 · `mutate` mem · TTL을 붙여 채운다
- **Subtitle:** `SET product:7 {…} EX 600` — TTL이 오래된 값이 남을 수 있는 최대 시간이다.
- **Prose:**
  > 읽은 값을 TTL과 함께 넣습니다. TTL은 캐시가 원본과 달라도 그 시간 뒤에는 사라진다는 상한입니다.
- **Facts:**
  - Docs: TTL "bounds how long stale data can be served"
  - Use `SET … EX` (one command) rather than `SET` then `EXPIRE`
- **Event log:** `client → main · RESP2 · SET product:7 … EX 600 · —`
- **State (mem: keys):**
  - before: (empty)
  - after: `product:7` · {…} · 600 s
- **Sources:** [cache-aside/_index.md#L41-L49](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/_index.md#L41-L49)

#### S4 · `mutate` mem · DB를 바꾸면 캐시 키를 지운다
- **Subtitle:** 쓰기는 DB에 하고, 캐시는 갱신하지 않고 `DEL`한다. 다음 읽기가 새 값을 채운다.
- **Prose:**
  > 상품 정보를 바꾸면 앱은 DB에 쓰고 캐시 키를 지웁니다. 다음 읽기가 miss로 새 값을 다시 채웁니다.
  > 지우기 전에 읽은 client는 잠시 옛 값을 볼 수 있고, 그 범위를 TTL이 묶어 둡니다.
- **Facts:**
  - Docs: "On updates, the application writes the primary and invalidates the cache key"
  - Invalidation command: `DEL`
- **Event log:** `client → main · RESP2 · DEL product:7 (after UPDATE in DB) · —`
- **State (mem: keys):**
  - before: `product:7` · {…} · 600 s
  - after: (empty)
- **Sources:** [cache-aside/_index.md#L35](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/_index.md#L35), [cache-aside/_index.md#L41](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/_index.md#L41), [cache-aside/redis-py/_index.md#L191-L196](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/redis-py/_index.md#L191-L196)

#### S5 · `move` client → db · 인기 키가 사라진 순간: stampede
- **Subtitle:** 수백 개 요청이 동시에 miss하고 모두 DB로 간다.
- **Prose:**
  > 인기 키가 만료되거나 지워진 순간 들어온 요청은 모두 miss합니다. instance마다 같은 행을 DB에서 다시 읽습니다.
  > 캐시가 막던 부하가 한꺼번에 DB로 몰립니다.
- **Token:** `request` · `SELECT … ×200 (E.G.)`
- **Facts:**
  - Docs: "a cache stampede that amplifies the exact load spike caching was supposed to prevent"
  - Docs list mutex locks or probabilistic early refresh as mitigations
- **Event log:** `client → db · SQL · 200 concurrent SELECT product 7 (E.G.) · DB CPU spike`
- **Sources:** [cache-aside/_index.md#L24](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/_index.md#L24), [cache-aside/_index.md#L58-L60](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/_index.md#L58-L60)

#### S6 · `mutate` mem · 한 instance만 lock을 얻는다
- **Subtitle:** `SET lock:product:7 <token> NX PX 30000` — 키가 없을 때만 성공한다.
- **Prose:**
  > miss한 instance는 먼저 `SET lock:… <token> NX PX 30000`을 보냅니다. 키가 없을 때만 성공하므로 하나만 이깁니다.
  > 진 쪽은 DB로 가지 않고 잠깐 기다렸다 캐시를 다시 읽습니다. `PX`는 lock 주인이 죽어도 lock이 풀리게 합니다.
- **Facts:**
  - Acquire: `SET resource_name my_random_value NX PX 30000`
  - The value must be unique per client and request (docs: 20 random bytes)
  - Losers poll the cache instead of reading the DB
- **Event log:** `client → main · RESP2 · SET lock:product:7 <token> NX PX 30000 → +OK (1 of 200) · —`
- **State (mem: keys):**
  - before: (empty)
  - after: `lock:product:7` · tokenA · 30 s
- **Sources:** [distributed-locks.md#L99-L102](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L99-L102), [distributed-locks.md#L117-L120](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L117-L120), [cache-aside/redis-py/_index.md#L121-L135](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/redis-py/_index.md#L121-L135)

#### S7 · `mutate` mem · 이긴 쪽이 다시 채운다
- **Subtitle:** DB를 한 번 읽어 `SET product:7 … EX 600`. 기다리던 instance들은 이 값을 읽는다.
- **Prose:**
  > lock을 얻은 instance만 DB를 읽고 캐시를 채웁니다. 기다리던 instance들은 다시 읽어 hit합니다.
  > DB에는 요청이 한 번만 갑니다.
- **Facts:**
  - One DB read per expiry instead of one per waiting request
  - Docs example: losers "wait briefly for the cache to populate, then return that value"
- **Event log:** `client → main · RESP2 · SET product:7 … EX 600 · —`
- **State (mem: keys):**
  - before: `lock:product:7` · tokenA · 30 s
  - after: `lock:product:7` · tokenA · 29 s; `product:7` · {…} · 600 s
- **Sources:** [cache-aside/redis-py/_index.md#L40-L42](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/redis-py/_index.md#L40-L42)

#### S8 · `mutate` mem · 내 token일 때만 lock을 지운다
- **Subtitle:** `GET`으로 비교하고 같을 때만 `DEL`하는 Lua script. script는 원자적이다.
- **Prose:**
  > 그냥 `DEL`하면, 내가 오래 멈춘 사이 TTL이 지나 다른 instance가 잡은 lock을 지울 수 있습니다.
  > 그래서 값이 내 token과 같을 때만 지우는 Lua script를 씁니다. script 실행 중에는 다른 명령이 끼어들지 않습니다.
- **Facts:**
  - Release script: `if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`
  - Docs: the random value avoids "removing a lock that was created by another client"
- **Event log:** `client → main · RESP2 · EVAL <release> 1 lock:product:7 tokenA → :1 · —`
- **State (mem: keys):**
  - before: `lock:product:7` · tokenA · 29 s; `product:7` · {…} · 600 s
  - after: `product:7` · {…} · 600 s
- **Sources:** [distributed-locks.md#L107-L118](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L107-L118), [eval-intro.md#L28-L30](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/programmability/eval-intro.md#L28-L30)

#### S9 · `move` client → peer1 · failover 뒤 다른 instance도 같은 lock을 얻는다 (side path)
- **Subtitle:** lock이 replica에 복제되기 전에 master가 죽고 replica가 승격되었다.
- **Prose:**
  > A가 master에서 lock을 얻고 `+OK`를 받았습니다. 복제는 비동기라 이 쓰기가 replica에 가기 전에 master가 죽을 수 있습니다.
  > replica가 승격되면 lock 키가 없으므로 B의 `SET NX`도 성공합니다.
- **Token:** `request` · `SET lock:order:9 tokenB NX PX 30000`
- **Facts:**
  - Docs: "we can't implement our safety property of mutual exclusion, because Redis replication is asynchronous"
  - Sequence: A locks on master → master crashes before replicating → replica promoted → B locks
- **Event log:** `client → peer1 · RESP2 · SET lock:order:9 tokenB NX PX 30000 → +OK · —`
- **Sources:** [distributed-locks.md#L80-L89](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L80-L89)

#### S10 · `mutate` peer1 · 두 client가 같은 lock을 가졌다 (side path)
- **Subtitle:** 정확성이 중요한 lock이면 fencing token으로 자원 쪽에서 막아야 한다.
- **Prose:**
  > A와 B가 모두 lock을 가졌다고 믿습니다. 캐시 재계산이라면 DB 읽기가 한 번 더 늘 뿐이지만, 정확성이 필요한 작업이면 데이터가 깨집니다.
  > `WAIT`은 틈을 줄일 뿐이고, Redlock(독립 master 5개 과반)도 docs가 fencing token을 함께 권합니다.
- **Facts:**
  - `WAIT numreplicas timeout` "does not make Redis a strongly consistent store"
  - Redlock: N = 5 independent masters, majority 3, validity = TTL − elapsed − clock drift
  - Docs: "You should implement fencing tokens"
- **Event log:** `peer1 → peer1 · Failover · lock:order:9 held by A (believes) and B · —`
- **State (peer1: replica):**
  - before: `role` = replica; `lock:order:9` = —
  - after: `role` = master (promoted); `lock:order:9` = tokenB (A also believes it holds it)
- **Sources:** [wait.md#L79-L83](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/wait.md#L79-L83), [distributed-locks.md#L130-L162](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L130-L162), [distributed-locks.md#L232-L240](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L232-L240)

### Replay

S1 → S2 → S3, then S5 → S6 → S7 → S8: client → main (miss) → db → mem (fill); expiry → db rush → mem (lock) → mem (fill) → mem (release).

### Decoder records

**D5.1 · step S6 · `wire` · lock acquire request.**

| Bytes (text) | Field | Meaning |
|---|---|---|
| `*6\r\n` | array header | 6 args |
| `$3\r\nSET\r\n` | command | |
| `$14\r\nlock:product:7\r\n` | key | one lock key per resource |
| `$32\r\n<token>\r\n` | value | random per client and request (E.G.) |
| `$2\r\nNX\r\n` | condition | set only if the key does not exist |
| `$2\r\nPX\r\n` `$5\r\n30000\r\n` | expiry | lock auto-releases after 30 s |

Sources: [distributed-locks.md#L99-L102](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L99-L102), [set.md#L133-L135](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/set.md#L133-L135).

### Self-check

1. **Q:** cache-aside에서 DB를 바꿀 때 캐시는 어떻게 하나? **A:** DB에 쓰고 캐시 키를 `DEL`한다. 오래된 값이 남는 시간은 TTL이 상한이다.
2. **Q:** stampede를 lock으로 막는 흐름은? **A:** miss한 instance가 `SET lock NX PX`를 시도해 하나만 DB를 읽고 채운다. 나머지는 캐시를 다시 읽는다.
3. **Q:** lock 해제를 그냥 `DEL`로 하면 안 되는 이유는? **A:** TTL이 지나 다른 client가 잡은 lock을 지울 수 있다. token을 비교하고 지우는 Lua script를 쓴다.
4. **Q:** master-replica에서 lock이 깨지는 순서는? **A:** A가 master에서 획득 → 복제 전 master 장애 → replica 승격 → B가 같은 lock 획득.

---

## Lesson 6. `atomicity`: 다른 명령이 끼어들지 못하게

**Goal.** See how `MULTI`/`EXEC` queues commands and runs them together, how `WATCH` aborts on a conflict, what "no rollback" means, and when a Lua script blocks the whole server.

**Critical path.** `WATCH` → `MULTI` → commands queued → `EXEC` runs all at once, or returns null if a watched key changed.

**Interview and incident questions**
- Redis transaction은 원자적인가? rollback은?
- `WATCH`로 어떻게 check-and-set을 하나?
- Lua script가 오래 돌면 무슨 일이? `-BUSY`는?
- 재시작이나 failover 뒤 `EVALSHA`가 `-NOSCRIPT`를 내는 이유는?

**Overview (one line).** 8.4부터 `SET … IFEQ` 같은 단일 명령 compare-and-set도 있다(transactions docs).

**Nodes:** `client` (app), `main`, `mem` (db0).

**State panels**

| Node | Panel | Initial rows |
|---|---|---|
| `main` | client 7 transaction | `mode` = normal; `queue` = []; `watched` = []; `결과` = — |
| `mem` | db0 | `balance:A` = 500; `balance:B` = 0 |

**Layer selector:** `Command` · `Transaction` · `Script`.

### Steps

#### S1 · `mutate` main · `WATCH balance:A`
- **Subtitle:** 이 키가 `EXEC` 전에 바뀌면 transaction 전체를 취소하라고 표시한다.
- **Prose:**
  > `WATCH`는 낙관적 lock입니다. 키를 지켜보다가 `EXEC` 전에 누군가 바꾸면 transaction을 실행하지 않습니다.
  > 앱은 `WATCH` → 값 읽기 → 계산 → `MULTI`/`EXEC` 순서로 쓰고, 실패하면 처음부터 다시 합니다.
- **Facts:**
  - Docs: "This form of locking is called _optimistic locking_"
  - Changes by other clients, expiry, and eviction all abort it
- **Event log:** `client → main · RESP2 · WATCH balance:A → +OK · —`
- **State (main: client 7 transaction):**
  - before: `mode` = normal; `queue` = []; `watched` = []; `결과` = —
  - after: `mode` = normal; `queue` = []; `watched` = [balance:A]; `결과` = —
- **Sources:** [transactions.md#L181-L184](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L181-L184), [transactions.md#L191-L220](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L191-L220), [transactions.md#L233-L241](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L233-L241)

#### S2 · `move` client → main · `MULTI` 다음 명령들
- **Subtitle:** `MULTI`, `DECRBY balance:A 100`, `INCRBY balance:B 100` — 각각 `+QUEUED`.
- **Prose:**
  > `MULTI` 뒤의 명령은 실행되지 않고 큐에 쌓입니다. 서버는 명령마다 `+QUEUED`로 답합니다.
- **Token:** `request` · `MULTI; DECRBY balance:A 100; INCRBY balance:B 100`
- **Facts:**
  - Reply to each queued command: `+QUEUED`
  - Queued commands do not trigger `WATCH`
- **Event log:** `client → main · RESP2 · MULTI + 2 commands → +OK +QUEUED +QUEUED · —`
- **Sources:** [transactions.md#L56-L59](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L56-L59), [server.c#L4831-L4841](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4831-L4841), [transactions.md#L242-L243](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L242-L243)

#### S3 · `mutate` main · 큐에 쌓인다
- **Subtitle:** 아직 아무 키도 바뀌지 않았다.
- **Prose:**
  > 명령은 client의 큐에만 있습니다. 이 사이에 다른 client의 명령은 평소처럼 실행됩니다.
- **Facts:**
  - Nothing runs until `EXEC`; `DISCARD` drops the queue and the watches
  - Arity or unknown-command errors are caught here (S7)
- **Event log:** `main → main · Transaction · queue = 2 commands · —`
- **State (main: client 7 transaction):**
  - before: `mode` = normal; `queue` = []; `watched` = [balance:A]; `결과` = —
  - after: `mode` = MULTI; `queue` = [DECRBY balance:A 100, INCRBY balance:B 100]; `watched` = [balance:A]; `결과` = —
- **Sources:** [multi.c#L91-L99](https://github.com/redis/redis/blob/8.10.3/src/multi.c#L91-L99), [multi.c#L77-L82](https://github.com/redis/redis/blob/8.10.3/src/multi.c#L77-L82)

#### S4 · `move` client → main · `EXEC`
- **Subtitle:** 지켜본 키가 그대로인지 확인하고 큐를 실행한다.
- **Prose:**
  > `EXEC`가 오면 먼저 지켜본 키가 바뀌었는지 봅니다. 그대로면 큐의 명령을 순서대로 실행합니다.
- **Token:** `request` · `EXEC`
- **Facts:**
  - Watches are cleared at `EXEC`, whether it runs or aborts
  - A watched key changed → nothing runs (S6); otherwise all queued commands run in order
- **Event log:** `client → main · RESP2 · EXEC · —`
- **Sources:** [multi.c#L139-L167](https://github.com/redis/redis/blob/8.10.3/src/multi.c#L139-L167), [transactions.md#L250-L252](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L250-L252)

#### S5 · `mutate` mem · 한꺼번에 실행, 사이에 끼어들 수 없다
- **Subtitle:** 두 명령이 연속으로 실행되고, 결과는 array로 한 번에 온다.
- **Prose:**
  > 큐의 명령은 다른 client의 명령 없이 연속으로 실행됩니다. 결과는 명령 순서대로 담긴 array입니다.
  > AOF와 replica에는 `MULTI`/`EXEC`로 묶여 한 번에 전달됩니다.
- **Facts:**
  - Docs: "A request sent by another client will never be served in the middle of the execution of a Redis Transaction"
  - Propagated wrapped in `MULTI`/`EXEC`; written to the AOF with a single `write(2)`
- **Event log:** `main → mem · Transaction · EXEC ran 2 commands → *2 :400 :100 · —`
- **State (mem: db0):**
  - before: `balance:A` = 500; `balance:B` = 0
  - after: `balance:A` = 400; `balance:B` = 100
- **Record:** D6.1 (`wire`)
- **Sources:** [transactions.md#L28-L32](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L28-L32), [transactions.md#L39-L44](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L39-L44), [transactions.md#L78-L80](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L78-L80), [server.c#L3851-L3888](https://github.com/redis/redis/blob/8.10.3/src/server.c#L3851-L3888)

#### S6 · `mutate` main · 누가 먼저 바꿨다면 `EXEC`는 null (side path)
- **Subtitle:** `WATCH`와 `EXEC` 사이에 다른 client가 `balance:A`를 바꿨다 → 아무것도 실행하지 않는다.
- **Prose:**
  > 지켜본 키가 바뀌었으면 `EXEC`는 아무것도 실행하지 않고 null을 돌려줍니다. 앱은 다시 `WATCH`부터 시도합니다.
  > 경쟁이 심한 키에서는 재시도가 많아집니다.
- **Facts:**
  - Abort reply: RESP2 `*-1\r\n`, RESP3 `_\r\n`
  - Key expiry between `WATCH` and `EXEC` also aborts
- **Event log:** `main → client · RESP2 · EXEC → *-1 (aborted) · 5 B`
- **State (main: client 7 transaction):**
  - before: `mode` = MULTI; `queue` = [DECRBY balance:A 100, INCRBY balance:B 100]; `watched` = [balance:A]; `결과` = —
  - after: `mode` = normal; `queue` = []; `watched` = []; `결과` = null (balance:A changed), retry
- **Sources:** [multi.c#L144-L155](https://github.com/redis/redis/blob/8.10.3/src/multi.c#L144-L155), [server.c#L2264-L2267](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2264-L2267), [multi.c#L389-L428](https://github.com/redis/redis/blob/8.10.3/src/multi.c#L389-L428)

#### S7 · `mutate` main · 오류와 rollback 없음 (side path)
- **Subtitle:** 큐에 넣을 때 오류면 전체 취소(`EXECABORT`). 실행 중 오류면 나머지는 그대로 실행된다.
- **Prose:**
  > 잘못된 명령(인자 수 오류 등)은 큐에 넣을 때 걸리고, `EXEC`는 `-EXECABORT`로 전체를 버립니다.
  > 실행 중 오류(예: 문자열에 `LPOP`)는 그 명령만 실패하고 나머지는 실행됩니다. Redis는 rollback하지 않습니다.
- **Facts:**
  - `-EXECABORT Transaction discarded because of previous errors.`
  - Docs: "Redis does not support rollbacks of transactions"
- **Event log:** `main → client · RESP2 · EXEC → *2 +OK -WRONGTYPE … · —`
- **State (main: client 7 transaction):**
  - before: `mode` = normal; `queue` = []; `watched` = []; `결과` = null (balance:A changed), retry
  - after: `mode` = normal; `queue` = []; `watched` = []; `결과` = `*2 [+OK, -WRONGTYPE]` (first command kept)
- **Sources:** [server.c#L2251-L2252](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2251-L2252), [transactions.md#L98-L109](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L98-L109), [transactions.md#L118-L127](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L118-L127), [transactions.md#L153-L154](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L153-L154)

#### S8 · `move` client → main · 조건이 있으면 Lua script로
- **Subtitle:** `EVAL <script> 2 balance:A balance:B 100` — 읽고, 판단하고, 쓰기를 서버 안에서 한 번에.
- **Prose:**
  > `MULTI`는 중간 결과를 보고 판단할 수 없습니다. "잔액이 있으면 이체" 같은 조건은 Lua script로 서버 안에서 실행합니다.
  > script 실행 중에는 서버의 다른 모든 일이 멈춥니다. 그래서 원자적입니다.
- **Token:** `request` · `EVAL <transfer.lua> 2 balance:A balance:B 100`
- **Facts:**
  - Docs: "all server activities are blocked during its entire runtime"
  - Pass every key in `KEYS`; scripts must not build key names (cluster routing)
- **Event log:** `client → main · RESP2 · EVAL transfer 2 balance:A balance:B 100 · —`
- **Sources:** [eval-intro.md#L28-L30](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/programmability/eval-intro.md#L28-L30), [eval-intro.md#L98-L101](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/programmability/eval-intro.md#L98-L101)

#### S9 · `mutate` main · 5초가 넘으면 `-BUSY`
- **Subtitle:** 오래 도는 script는 자동으로 멈추지 않는다. 다른 client는 `-BUSY`를 받는다.
- **Prose:**
  > script가 `busy-reply-threshold`(5초)를 넘으면 다른 client는 `-BUSY`를 받습니다. script는 계속 돕니다.
  > `SCRIPT KILL`은 아직 쓰지 않은 script만 멈춥니다. 이미 썼다면 `SHUTDOWN NOSAVE`밖에 없습니다.
- **Facts:**
  - `busy-reply-threshold` (alias `lua-time-limit`): 5000 ms
  - Wrote already: `-UNKILLABLE …`; only `SHUTDOWN NOSAVE` stops it
- **Event log:** `main → main · Script · script 5000 ms+, other clients get -BUSY · 5 s+`
- **State (main: client 7 transaction):**
  - before: `mode` = normal; `queue` = []; `watched` = []; `결과` = `*2 [+OK, -WRONGTYPE]` (first command kept)
  - after: `mode` = script running; `queue` = []; `watched` = []; `결과` = others get `-BUSY`; `SCRIPT KILL` → `-UNKILLABLE` (already wrote)
- **Sources:** [config.c#L3573](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3573), [programmability/_index.md#L115-L132](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/programmability/_index.md#L115-L132), [server.c#L2235-L2238](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2235-L2238), [script.c#L371-L377](https://github.com/redis/redis/blob/8.10.3/src/script.c#L371-L377)

#### S10 · `mutate` main · script cache는 사라지고, Function은 남는다
- **Subtitle:** `EVALSHA`의 cache는 재시작과 failover에서 비어 `-NOSCRIPT`가 난다. Function은 RDB/AOF와 replica에 남는다.
- **Prose:**
  > `SCRIPT LOAD`로 올린 script cache는 저장되지 않습니다. 재시작이나 failover 뒤 `EVALSHA`는 `-NOSCRIPT`를 받으므로 client는 `EVAL`로 다시 보내야 합니다.
  > `FUNCTION LOAD`로 올린 Function은 데이터처럼 저장되고 복제됩니다. replica로는 script가 아니라 실행한 명령들이 갑니다.
- **Facts:**
  - `-NOSCRIPT No matching script. Please use EVAL.`
  - Docs: functions "are as durable as the data itself"
  - Scripts replicate as effects: the commands they ran, wrapped in `MULTI`/`EXEC`
- **Event log:** `client → main · RESP2 · EVALSHA <sha> … → -NOSCRIPT (after failover) · —`
- **State (main: client 7 transaction):**
  - before: `mode` = script running; `queue` = []; `watched` = []; `결과` = others get `-BUSY`; `SCRIPT KILL` → `-UNKILLABLE` (already wrote)
  - after: `mode` = normal; `queue` = []; `watched` = []; `결과` = `EVALSHA` → `-NOSCRIPT`; `FCALL` works
- **Sources:** [eval-intro.md#L153-L179](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/programmability/eval-intro.md#L153-L179), [server.c#L2231-L2232](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2231-L2232), [functions-intro.md#L83-L87](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/programmability/functions-intro.md#L83-L87), [eval-intro.md#L276-L277](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/programmability/eval-intro.md#L276-L277)

### Replay

S1 → S2 → S4 → S5: client → main (`WATCH`, queue) → main (`EXEC`) → mem (both writes at once).

### Decoder records

**D6.1 · step S5 · `wire` · `EXEC` reply.**

| Bytes (text) | Field | Meaning |
|---|---|---|
| `*2\r\n` | array header | one reply per queued command |
| `:400\r\n` | reply 1 | `DECRBY balance:A 100` |
| `:100\r\n` | reply 2 | `INCRBY balance:B 100` |

On a `WATCH` conflict the whole reply is `*-1\r\n` (RESP2) or `_\r\n` (RESP3). Sources: [multi.c#L185-L230](https://github.com/redis/redis/blob/8.10.3/src/multi.c#L185-L230), [exec.md#L54-L62](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/exec.md#L54-L62).

### Self-check

1. **Q:** `MULTI`/`EXEC`에서 두 번째 명령이 실행 중 실패하면 첫 번째는? **A:** 그대로 남는다. Redis는 rollback하지 않는다. 큐에 넣을 때의 오류만 `EXECABORT`로 전체를 취소한다.
2. **Q:** `WATCH`로 check-and-set을 하는 순서는? **A:** `WATCH` → 읽기 → 계산 → `MULTI` → 쓰기 → `EXEC`. null이면 처음부터 재시도.
3. **Q:** Lua script가 6초째 돌고 있다. 다른 client와 운영자는 무엇을 보나? **A:** 다른 client는 `-BUSY`. 쓰기 전이면 `SCRIPT KILL`, 이미 썼으면 `SHUTDOWN NOSAVE`뿐.
4. **Q:** failover 뒤 `EVALSHA`가 실패하는 이유와 대책은? **A:** script cache는 저장, 복제되지 않는다. `EVAL`로 다시 보내거나 Function을 쓴다.

---

## Lesson 7. `bigkey-lazyfree`: 큰 키 하나가 서버를 멈춘다

**Goal.** See why one command on a big key stalls every client, why deleting a big key is itself slow, how `UNLINK` moves the free to a background thread, and how to find big and hot keys without `KEYS`.

**Critical path.** O(N) command on a big key → the one main thread is busy → every client waits; `UNLINK` → O(1) unlink → background thread frees.

**Interview and incident questions**
- big key가 왜 문제인가? 어떻게 찾나?
- `DEL`과 `UNLINK`의 차이는? 만료나 eviction으로 지워질 때는?
- 운영에서 `KEYS *`를 쓰면 안 되는 이유와 대안은?
- hot key는 어떻게 찾고 줄이나?

**Overview (one line).** 8.6부터 CPU와 네트워크 기준으로 hot key를 기록하는 `HOTKEYS` 명령이 있다(hotkeys docs).

**Nodes:** `client` (app, redis-cli), `main`, `mem` (db0), `bg` (bio lazyfree thread).

**State panels**

| Node | Panel | Initial rows |
|---|---|---|
| `main` | main thread | `실행 중` = —; `대기 client` = 0; `lazyfree 설정` = 모두 no |
| `mem` | db0 | `big:hash` = hash, 1M fields (E.G.); `big:set` = set, 2M members (E.G.); `user:7` = string |
| `bg` | lazyfree | `대기 객체` = 0; `해제 완료` = 0 |

**Layer selector:** `Command` · `Thread` · `Memory`.

### Steps

#### S1 · `move` client → main · 큰 hash 전체 읽기
- **Subtitle:** `HGETALL big:hash` — field 100만 개.
- **Prose:**
  > 원소가 많은 키에 O(N) 명령(`HGETALL`, `SMEMBERS`, `LRANGE 0 -1`)을 보내면 N에 비례해 시간이 걸립니다.
  > 실행은 main thread 하나이므로 그동안 다른 명령은 실행되지 않습니다.
- **Token:** `request` · `HGETALL big:hash`
- **Facts:**
  - Docs: "when a request is slow to serve all the other clients will wait"
  - Docs advice: avoid slow commands on values with many elements, or run them on a replica
- **Event log:** `client → main · RESP2 · HGETALL big:hash · 31 B`
- **Sources:** [latency.md#L191-L204](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/latency.md#L191-L204)

#### S2 · `mutate` main · 모두가 기다린다
- **Subtitle:** 수백 ms 동안 main thread가 이 명령만 처리한다. slowlog에 남고 응답은 수십 MB다.
- **Prose:**
  > 이 명령이 도는 동안 다른 client의 명령은 대기열에 쌓이고, 앱에서는 timeout으로 보입니다.
  > 실행 시간은 slowlog에 남습니다. 큰 응답은 output buffer에 쌓여 메모리도 씁니다.
- **Facts:**
  - `SLOWLOG GET` shows id, time, duration (µs), args, client address, client name
  - Slowlog measures execution only, not network time
- **Event log:** `main → main · Thread · HGETALL 1M fields · 800 ms (E.G.)`
- **State (main: main thread):**
  - before: `실행 중` = —; `대기 client` = 0; `lazyfree 설정` = 모두 no
  - after: `실행 중` = HGETALL big:hash (800 ms, E.G.); `대기 client` = 120 (E.G.); `lazyfree 설정` = 모두 no
- **Record:** D7.1 (`wire`)
- **Sources:** [slowlog-get.md#L48-L62](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/slowlog-get.md#L48-L62), [config.c#L3579](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3579), [clients.md#L90-L92](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/clients.md#L90-L92)

#### S3 · `move` client → main · 큰 키를 `DEL`
- **Subtitle:** 지우는 것도 O(N)이다.
- **Prose:**
  > `DEL`은 문자열이면 O(1)이지만, hash/set/list/zset이면 원소 수 M에 비례합니다. 원소마다 메모리를 하나씩 해제하기 때문입니다.
- **Token:** `request` · `DEL big:hash`
- **Facts:**
  - Docs: deleting a non-string key is "O(M) where M is the number of elements"
  - Deleting a string is O(1)
- **Event log:** `client → main · RESP2 · DEL big:hash · 27 B`
- **Sources:** [del.md#L25-L28](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/del.md#L25-L28)

#### S4 · `mutate` main · `DEL`은 main thread에서 해제한다
- **Subtitle:** 원소 100만 개를 하나씩 free하는 동안 서버가 멈춘다.
- **Prose:**
  > `DEL`은 main thread에서 메모리를 바로 해제합니다. 원소가 수백만 개면 몇 초까지 걸릴 수 있습니다.
- **Facts:**
  - redis.conf: DEL on a key with "millions of elements" can "block for a long time (even seconds)"
  - `lazyfree-lazy-user-del yes` makes `DEL` behave like `UNLINK` (default `no`)
- **Event log:** `main → main · Thread · DEL big:hash, free 1M allocations · 1.2 s (E.G.)`
- **State (main: main thread):**
  - before: `실행 중` = HGETALL big:hash (800 ms, E.G.); `대기 client` = 120 (E.G.); `lazyfree 설정` = 모두 no
  - after: `실행 중` = DEL big:hash (1.2 s, E.G.); `대기 client` = 300 (E.G.); `lazyfree 설정` = 모두 no
- **Sources:** [redis.conf#L1327-L1334](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1327-L1334), [redis.conf#L1374-L1379](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1374-L1379), [config.c#L3413](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3413)

#### S5 · `move` client → main · 대신 `UNLINK`
- **Subtitle:** `UNLINK big:set` — 키만 떼어 내고 해제는 다른 thread에 맡긴다.
- **Prose:**
  > `UNLINK`는 키를 keyspace에서 떼어 내는 것만 main thread에서 합니다(O(1)). 실제 메모리 해제는 다른 thread가 합니다.
- **Token:** `request` · `UNLINK big:set`
- **Facts:**
  - Docs: "O(1) for each key removed regardless of its size", then O(N) in a different thread
  - `FLUSHALL ASYNC` / `FLUSHDB ASYNC` do the same for whole databases
- **Event log:** `client → main · RESP2 · UNLINK big:set · 29 B`
- **Sources:** [unlink.md#L26-L28](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/unlink.md#L26-L28), [unlink.md#L60-L64](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/unlink.md#L60-L64), [flushall.md#L61-L62](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/flushall.md#L61-L62)

#### S6 · `mutate` mem · 키는 즉시 사라진다
- **Subtitle:** 다른 client에게 `big:set`은 이미 없다.
- **Prose:**
  > keyspace에서 키를 떼어 내면 다른 client에게 그 키는 바로 없는 것처럼 보입니다. 해제할 객체는 background 대기열로 갑니다.
- **Facts:**
  - The key is gone from the keyspace before the memory is freed
  - Values with 64 allocations or fewer (strings, small listpacks) are freed on the spot; the thread hand-off would cost more
- **Event log:** `main → mem · Memory · unlink big:set · O(1)`
- **State (mem: db0):**
  - before: `big:hash` = hash, 1M fields (E.G.); `big:set` = set, 2M members (E.G.); `user:7` = string
  - after: `user:7` = string
- **Sources:** [db.c#L918-L922](https://github.com/redis/redis/blob/8.10.3/src/db.c#L918-L922), [lazyfree.c#L221-L241](https://github.com/redis/redis/blob/8.10.3/src/lazyfree.c#L221-L241)

#### S7 · `mutate` bg · background thread가 해제한다
- **Subtitle:** bio lazyfree thread가 200만 원소를 해제하는 동안 main thread는 다른 명령을 처리한다.
- **Prose:**
  > 해제는 bio thread가 합니다. `INFO memory`의 `lazyfree_pending_objects`가 대기 중인 객체 수입니다.
  > 메모리는 해제가 끝나야 줄어듭니다. `used_memory`가 바로 떨어지지 않는 이유입니다.
- **Facts:**
  - Thread: `bio_lazy_free`
  - `INFO memory`: `lazyfree_pending_objects`, `lazyfreed_objects`
- **Event log:** `bg → bg · Memory · free big:set (2M members) · 1.5 s, main thread not blocked (E.G.)`
- **State (bg: lazyfree):**
  - before: `대기 객체` = 0; `해제 완료` = 0
  - after: `대기 객체` = 0; `해제 완료` = 1 (big:set)
- **Sources:** [bio.c#L51-L63](https://github.com/redis/redis/blob/8.10.3/src/bio.c#L51-L63), [server.c#L6597-L6598](https://github.com/redis/redis/blob/8.10.3/src/server.c#L6597-L6598), [info.md#L214-L217](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/info.md#L214-L217)

#### S8 · `mutate` main · 만료, eviction, 덮어쓰기도 기본은 동기 해제
- **Subtitle:** 사용자가 `DEL`하지 않아도 큰 키는 지워진다. 기본값은 모두 main thread에서 해제다.
- **Prose:**
  > 큰 키가 만료되거나, eviction되거나, `SET`/`RENAME`으로 덮어써지거나, replica가 full sync 전에 데이터를 비울 때도 기본은 main thread에서 해제합니다.
  > 큰 키가 있는 서버는 `lazyfree-lazy-*`를 켜는 것을 검토합니다.
- **Facts:**
  - All default `no`: `lazyfree-lazy-eviction`, `lazyfree-lazy-expire`, `lazyfree-lazy-server-del`, `replica-lazy-flush`, `lazyfree-lazy-user-del`
  - redis.conf: "In all the above cases the default is to delete objects in a blocking way"
- **Event log:** `client → main · RESP2 · CONFIG SET lazyfree-lazy-expire yes (and others) · —`
- **State (main: main thread):**
  - before: `실행 중` = DEL big:hash (1.2 s, E.G.); `대기 client` = 300 (E.G.); `lazyfree 설정` = 모두 no
  - after: `실행 중` = —; `대기 client` = 0; `lazyfree 설정` = eviction, expire, server-del, replica-flush = yes
- **Sources:** [redis.conf#L1349-L1386](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1349-L1386), [config.c#L3410-L3414](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3410-L3414), [config.c#L3426](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3426), [replication.md#L48](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L48)

#### S9 · `move` client → main · big key 찾기: `--bigkeys`, `--memkeys`
- **Subtitle:** `SCAN`으로 조금씩 훑는다. 운영에서 `KEYS *`는 쓰지 않는다.
- **Prose:**
  > `redis-cli --bigkeys`는 `SCAN`으로 키를 조금씩 훑으며 타입별 크기(원소 수)가 가장 큰 키를 찾습니다. `--memkeys`는 `MEMORY USAGE`로 바이트를 봅니다.
  > `KEYS *`는 한 번에 전체를 훑어 큰 DB에서 서버를 멈춥니다.
- **Token:** `request` · `SCAN 0 COUNT 10` …
- **Facts:**
  - `--bigkeys`: `SCAN` + `TYPE` + `STRLEN`/`LLEN`/`SCARD`/`HLEN`/`ZCARD`/`XLEN`; `-i` throttles it
  - `SCAN` returns every element present for the whole iteration, maybe more than once; `COUNT` default 10
  - Docs on `KEYS`: "Don't use `KEYS` in your regular application code"
- **Event log:** `client → main · RESP2 · redis-cli --bigkeys (SCAN …) · —`
- **Sources:** [cli.md#L557-L560](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/tools/cli.md#L557-L560), [redis-cli.c#L9762-L9805](https://github.com/redis/redis/blob/8.10.3/src/redis-cli.c#L9762-L9805), [scan.md#L158-L178](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/scan.md#L158-L178), [keys.md#L62-L69](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/keys.md#L62-L69)

#### S10 · `move` client → main · hot key 찾기: `--hotkeys`
- **Subtitle:** LFU 정책일 때만 `OBJECT FREQ`로 접근 빈도를 볼 수 있다.
- **Prose:**
  > `redis-cli --hotkeys`는 `OBJECT FREQ`로 접근 빈도를 봅니다. `maxmemory-policy`가 LFU일 때만 동작합니다.
  > 한 키에 몰리는 읽기는 replica에서 읽게 하거나 client-side caching으로 줄입니다.
- **Token:** `request` · `OBJECT FREQ product:7`
- **Facts:**
  - Without an LFU policy: `An LFU maxmemory policy is not selected, access frequency not tracked. …`
  - Mitigations in the docs: read replicas, client-side caching
- **Event log:** `client → main · RESP2 · redis-cli --hotkeys (OBJECT FREQ …) · —`
- **Sources:** [redis-cli.c#L3301-L3302](https://github.com/redis/redis/blob/8.10.3/src/redis-cli.c#L3301-L3302), [object.c#L1790-L1791](https://github.com/redis/redis/blob/8.10.3/src/object.c#L1790-L1791), [replication.md#L49](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L49), [client-side-caching.md#L72-L75](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/client-side-caching.md#L72-L75)

### Replay

S1 → S2, then S5 → S6 → S7: client → main (busy, all wait); client → main → mem (unlink) → bg (free).

### Decoder records

**D7.1 · step S2 · `wire` · one `SLOWLOG GET` entry (RESP array of 7).**

| Field | Example | Meaning |
|---|---|---|
| id | `14` (E.G.) | entry id |
| timestamp | `1793750400` (E.G.) | Unix time the command ran |
| duration | `800213` (E.G.) | execution time in µs (no network time) |
| arguments | `["HGETALL","big:hash"]` | the command |
| client | `10.0.3.17:52144` (E.G.) | client address |
| client name | `order-api` (E.G.) | set by `CLIENT SETNAME` |
| total args | `2` | original argument count |

Sources: [slowlog-get.md#L54-L62](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/slowlog-get.md#L54-L62), [slowlog.c#L178-L187](https://github.com/redis/redis/blob/8.10.3/src/slowlog.c#L178-L187).

### Self-check

1. **Q:** big key 하나가 전체 지연을 만드는 이유는? **A:** 명령 실행이 main thread 하나라서, O(N) 명령이나 큰 키 삭제가 도는 동안 모든 client가 기다린다.
2. **Q:** `DEL`과 `UNLINK`의 차이는? **A:** `DEL`은 main thread에서 바로 해제(O(M)), `UNLINK`는 키만 떼고(O(1)) 해제는 bio thread가 한다.
3. **Q:** 큰 키가 TTL로 만료될 때도 막히나? **A:** 기본은 그렇다(`lazyfree-lazy-expire no`). 켜면 background에서 해제한다.
4. **Q:** 운영에서 big key를 찾는 방법은? **A:** `redis-cli --bigkeys`/`--memkeys`(SCAN 기반). `KEYS *`는 쓰지 않는다.

---

## Lesson 8. `rdb`: fork 한 번으로 스냅샷

**Goal.** See how a snapshot is written while the server keeps serving: `fork()`, shared pages, copy-on-write when the parent writes, and an atomic rename.

**Critical path.** save point → `fork()` → the child writes a temp file while the parent serves (copy-on-write) → atomic rename to `dump.rdb`.

**Interview and incident questions**
- RDB 저장 중에도 요청을 받는 원리는? 메모리는 얼마나 더 필요한가?
- fork가 왜 지연을 만들 수 있나?
- RDB만 쓰면 무엇을 잃을 수 있나? `MISCONF`는 왜 나오나?

**Nodes:** `client` (app), `main` (parent), `mem` (memory pages), `bg` (fork child), `disk`.

**State panels**

| Node | Panel | Initial rows |
|---|---|---|
| `main` | persistence | `dirty` = 99; `child` = none; `last bgsave` = ok |
| `mem` | pages (E.G.) | `P1..P4` → parent |
| `disk` | files | `dump.rdb` (previous snapshot) |

**Layer selector:** `Process` · `Memory` · `File`.

### Steps

#### S1 · `mutate` main · 저장 조건을 만족했다
- **Subtitle:** "300초 동안 변경 100번 이상" 같은 save point 하나에 닿으면 `BGSAVE`가 시작된다.
- **Prose:**
  > `serverCron`이 변경 수(`dirty`)와 마지막 저장 후 시간을 보고 save point에 닿으면 `BGSAVE`를 시작합니다.
  > `BGSAVE` 명령으로 직접 시작할 수도 있습니다.
- **Facts:**
  - Default save points: `3600 1 300 100 60 10000` (seconds, changes); `save ""` disables
  - Only one child (RDB or AOF rewrite) at a time
- **Event log:** `main → main · Process · 100 changes in 300 seconds. Saving... · —`
- **State (main: persistence):**
  - before: `dirty` = 99; `child` = none; `last bgsave` = ok
  - after: `dirty` = 100; `child` = starting; `last bgsave` = ok
- **Sources:** [server.c#L2489-L2491](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2489-L2491), [redis.conf#L497-L506](https://github.com/redis/redis/blob/8.10.3/redis.conf#L497-L506), [server.c#L1700-L1727](https://github.com/redis/redis/blob/8.10.3/src/server.c#L1700-L1727), [rdb.c#L5473-L5507](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L5473-L5507)

#### S2 · `mutate` main · `fork()` — 그 순간 main thread가 멈춘다
- **Subtitle:** page table을 복사하는 동안 요청을 받지 못한다. 메모리가 클수록 길다.
- **Prose:**
  > 부모가 `fork()`로 자식을 만듭니다. 데이터가 크면 fork 자체가 수 ms에서 1초까지 걸리고, 그동안 요청을 받지 못합니다.
  > 걸린 시간은 `INFO stats`의 `latest_fork_usec`에 남습니다.
- **Facts:**
  - Docs: fork "can be time consuming if the dataset is big … or even for one second"
  - Measured in `latest_fork_usec`
- **Event log:** `main → bg · Process · fork() pid 48213 (E.G.) · 12 ms (E.G.)`
- **State (main: persistence):**
  - before: `dirty` = 100; `child` = starting; `last bgsave` = ok
  - after: `dirty` = 100; `child` = RDB pid 48213 (E.G.); `last bgsave` = ok
- **Sources:** [persistence.md#L38](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L38), [server.c#L7497-L7566](https://github.com/redis/redis/blob/8.10.3/src/server.c#L7497-L7566), [server.c#L6790](https://github.com/redis/redis/blob/8.10.3/src/server.c#L6790)

#### S3 · `mutate` mem · 부모와 자식이 같은 페이지를 본다
- **Subtitle:** fork 직후에는 아무것도 복사되지 않는다.
- **Prose:**
  > fork 직후 두 프로세스는 같은 물리 메모리 페이지를 공유합니다. 자식은 fork 순간의 데이터를 그대로 보므로 lock 없이 일관된 스냅샷을 씁니다.
- **Facts:**
  - Docs: "This method allows Redis to benefit from copy-on-write semantics"
  - The snapshot is the data at the moment of `fork()`
- **Event log:** `bg → mem · Memory · share all pages with parent · 0 MB copied`
- **State (mem: pages):**
  - before: `P1..P4` → parent
  - after: `P1..P4` → parent + child (shared)
- **Sources:** [persistence.md#L91-L99](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L91-L99)

#### S4 · `move` client → main · 저장 중에도 쓰기를 받는다
- **Subtitle:** `SET user:1 bob`.
- **Prose:**
  > 부모는 저장 중에도 평소처럼 쓰기를 처리합니다. 디스크 I/O는 자식이 합니다.
- **Token:** `request` · `SET user:1 bob`
- **Facts:**
  - Docs: "The parent process will never perform disk I/O" for RDB
  - Writes during the save are not in this snapshot
- **Event log:** `client → main · RESP2 · SET user:1 bob · 34 B`
- **Sources:** [persistence.md#L31](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L31)

#### S5 · `mutate` mem · 쓴 페이지만 복사된다 (copy-on-write)
- **Subtitle:** 부모가 P3을 바꾸는 순간 커널이 P3을 복사한다. 쓰기가 많을수록 메모리가 늘어난다.
- **Prose:**
  > 공유 페이지에 처음 쓰는 순간 커널이 그 페이지를 복사합니다. 자식은 옛 P3을, 부모는 새 P3'을 봅니다.
  > 저장 중 쓰기가 많으면 복사가 늘어 최악에는 메모리가 거의 두 배가 됩니다. 그래서 메모리 여유를 남겨 둡니다.
- **Facts:**
  - Copy size: `INFO persistence` `current_cow_size`, and `rdb_last_cow_size` after the save
  - During a child, the keyspace dict avoids resizing to limit copies (lesson 2 S8)
- **Event log:** `main → mem · Memory · page P3 copied · 4 KB (E.G.)`
- **State (mem: pages):**
  - before: `P1..P4` → parent + child (shared)
  - after: `P1, P2, P4` → shared; `P3` → child; `P3'` → parent
- **Sources:** [childinfo.c#L71-L82](https://github.com/redis/redis/blob/8.10.3/src/childinfo.c#L71-L82), [server.c#L6617-L6633](https://github.com/redis/redis/blob/8.10.3/src/server.c#L6617-L6633), [server.c#L819-L832](https://github.com/redis/redis/blob/8.10.3/src/server.c#L819-L832)

#### S6 · `move` bg → disk · 자식이 임시 파일에 쓴다
- **Subtitle:** `temp-<pid>.rdb`에 압축된 바이너리 스냅샷을 쓰고 fsync한다.
- **Prose:**
  > 자식은 fork 시점의 메모리를 압축된 바이너리 형식으로 `temp-<pid>.rdb`에 씁니다. 끝에 checksum을 붙이고 fsync합니다.
  > 같은 형식이 replica full sync에도 쓰입니다(lesson 10).
- **Token:** `data` · `temp-48213.rdb`
- **Facts:**
  - Compact binary, LZF-compressed by default (`rdbcompression yes`), with a CRC64 checksum
  - Fast to load on restart compared with replaying an AOF
- **Event log:** `bg → disk · File · write temp-48213.rdb · 1.2 GB, 9 s (E.G.)`
- **Sources:** [rdb.c#L2180-L2215](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L2180-L2215), [redis.conf#L523-L536](https://github.com/redis/redis/blob/8.10.3/redis.conf#L523-L536), [persistence.md#L31-L36](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L31-L36)

#### S7 · `mutate` disk · `rename()`으로 한 번에 바꾼다
- **Subtitle:** 완성된 파일만 `dump.rdb`가 된다. 반쯤 쓴 RDB는 남지 않는다.
- **Prose:**
  > 다 쓴 임시 파일을 `rename()`으로 `dump.rdb`에 덮습니다. rename은 원자적이라 언제 복사해도 완전한 파일입니다. 백업은 이 파일을 복사하면 됩니다.
- **Facts:**
  - Docs: "renamed into its final destination atomically using rename(2)"
  - Safe to copy for backups while Redis runs
- **Event log:** `bg → disk · File · rename temp-48213.rdb → dump.rdb · —`
- **State (disk: files):**
  - before: `dump.rdb` (previous snapshot); `temp-48213.rdb` (complete)
  - after: `dump.rdb` (new snapshot)
- **Sources:** [rdb.c#L2180-L2215](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L2180-L2215), [persistence.md#L321-L324](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L321-L324)

#### S8 · `mutate` main · 끝: 상태와 COW 크기를 기록
- **Subtitle:** 자식이 종료하면 부모가 저장 시각, 성공 여부, COW 크기를 기록한다.
- **Prose:**
  > 자식이 끝나면 부모가 `lastsave`와 성공 여부를 기록하고, 저장 중 생긴 변경만 `dirty`에 남깁니다.
  > 운영에서는 `INFO persistence`로 상태를 확인합니다.
- **Facts:**
  - Log: `Background saving terminated with success`
  - `dirty` keeps only the changes made during the save
- **Event log:** `bg → main · Process · child exit 0, COW peak 38 MB (E.G.) · 9.4 s (E.G.)`
- **State (main: persistence):**
  - before: `dirty` = 100; `child` = RDB pid 48213 (E.G.); `last bgsave` = ok
  - after: `dirty` = 40 (E.G.); `child` = none; `last bgsave` = ok, now
- **Record:** D8.1 (`wire`)
- **Sources:** [rdb.c#L5184-L5212](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L5184-L5212), [server.c#L6617-L6633](https://github.com/redis/redis/blob/8.10.3/src/server.c#L6617-L6633)

#### S9 · `mutate` main · 저장이 실패하면 쓰기를 막는다 (side path)
- **Subtitle:** 디스크가 꽉 차 `BGSAVE`가 실패하면 쓰기 명령이 `-MISCONF`를 받는다.
- **Prose:**
  > 마지막 `BGSAVE`가 실패하면 기본 설정에서는 쓰기를 거절합니다. 저장이 안 되는 줄 모르고 쓰는 것을 막기 위해서입니다. 다음 저장이 성공하면 풀립니다.
  > RDB만 쓰면 마지막 스냅샷 이후 몇 분치 쓰기를 잃을 수 있습니다.
- **Facts:**
  - `stop-writes-on-bgsave-error`: yes
  - Error begins `-MISCONF Redis is configured to save RDB snapshots, but it's currently unable to persist to disk.`
  - Docs: with RDB "you should be prepared to lose the latest minutes of data"
- **Event log:** `client → main · RESP2 · SET x 1 → -MISCONF … · —`
- **State (main: persistence):**
  - before: `dirty` = 40 (E.G.); `child` = none; `last bgsave` = ok, now
  - after: `dirty` = 40; `child` = none; `last bgsave` = err (disk full), writes → `-MISCONF`
- **Sources:** [redis.conf#L521](https://github.com/redis/redis/blob/8.10.3/redis.conf#L521), [server.c#L2244](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2244), [persistence.md#L37](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L37)

### Replay

S1 → S2 → S3 → S4 → S5 → S6 → S7: main (save point) → bg (fork) → mem (shared) → client write → mem (copy) → disk (temp) → disk (rename).

### Decoder records

**D8.1 · step S8 · `wire` · `INFO persistence` lines an engineer reads (part of a bulk-string reply).**

| Field | Example | Meaning |
|---|---|---|
| `rdb_changes_since_last_save` | `40` (E.G.) | `dirty`: writes not yet in a snapshot |
| `rdb_bgsave_in_progress` | `0` | 1 while a child is saving |
| `rdb_last_save_time` | `1793750409` (E.G.) | Unix time of the last successful save |
| `rdb_last_bgsave_status` | `ok` | `err` → writes may be refused (`MISCONF`) |
| `rdb_last_cow_size` | `39845888` (E.G.) | bytes copied by copy-on-write during the last save |

`latest_fork_usec` is in `INFO stats`. Sources: [server.c#L6617-L6633](https://github.com/redis/redis/blob/8.10.3/src/server.c#L6617-L6633), [server.c#L6790](https://github.com/redis/redis/blob/8.10.3/src/server.c#L6790).

### Self-check

1. **Q:** RDB 저장 중에도 쓰기를 받을 수 있는 원리는? **A:** fork한 자식이 fork 순간의 메모리를 쓰고, 부모는 계속 처리한다. 부모가 바꾼 페이지만 copy-on-write로 복사된다.
2. **Q:** RDB 때문에 메모리가 부족해질 수 있는 이유는? **A:** 저장 중 쓰기가 많으면 복사된 페이지만큼 메모리가 늘어난다. 최악에는 거의 두 배.
3. **Q:** `-MISCONF`가 나오면 무엇을 보나? **A:** `rdb_last_bgsave_status:err`와 로그의 저장 실패 원인(디스크 공간 등).

---

## Lesson 9. `aof`: 모든 쓰기를 기록한다

**Goal.** Follow one write into the AOF buffer, to the file before the reply, and onto the disk under the fsync policy. Then watch a rewrite replace the base while new writes keep going to a fresh incremental file.

**Critical path.** write → AOF buffer → `write()` before the reply → `fsync` per policy → rewrite into a new BASE + INCR.

**Interview and incident questions**
- `appendfsync` 세 가지와 각각 잃을 수 있는 데이터는?
- 디스크가 느리면 Redis가 왜 느려지나?
- AOF rewrite는 왜, 어떻게 하나?
- 실수로 `FLUSHALL`했다. AOF로 되살릴 수 있나?

**Overview (one line).** 8.10부터 MP-AOF 파일 묶음을 그대로 백업하는 `BACKUP` 명령이 있다(persistence docs).

**Nodes:** `client` (app), `main`, `bg` (bio fsync thread, then the rewrite child), `disk` (`appendonlydir/`).

**State panels**

| Node | Panel | Initial rows |
|---|---|---|
| `main` | AOF | `policy` = everysec; `aof_buf` = ""; `fsync 대기` = no |
| `disk` | appendonlydir | `base` = appendonly.aof.1.base.rdb; `incr` = [appendonly.aof.1.incr.aof]; `fsync된 범위` = 이전 쓰기 전부 |

**Layer selector:** `Command` · `Buffer` · `Disk`.

### Steps

#### S1 · `move` client → main · `SET user:1 alice EX 60`
- **Subtitle:** 실행이 먼저, 기록은 그다음.
- **Prose:**
  > AOF는 명령을 실행한 뒤 기록합니다. 데이터를 바꾼 명령만 남고, 읽기나 실패한 명령은 남지 않습니다.
- **Token:** `request` · `SET user:1 alice EX 60`
- **Facts:**
  - `appendonly`: no by default
  - AOF and replicas receive the same propagated commands
- **Event log:** `client → main · RESP2 · SET user:1 alice EX 60 · 52 B`
- **Sources:** [redis.conf#L1491](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1491), [aof.c#L1686-L1688](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1686-L1688)

#### S2 · `mutate` main · AOF buffer에 RESP 그대로 붙인다
- **Subtitle:** `EX 60`은 `PXAT <절대 ms>`로 바뀌어 기록된다. 재생해도 만료 시각이 같다.
- **Prose:**
  > 명령은 RESP 텍스트 그대로 AOF buffer에 붙습니다. DB가 바뀌면 앞에 `SELECT`가 들어갑니다.
  > 상대 TTL은 절대 시각으로 바뀌어, 나중에 재생해도 같은 순간에 만료됩니다.
- **Facts:**
  - `SET … EX 60` is logged as `SET … PXAT <ms>`
  - The file is plain RESP text: it can be read and edited by hand
- **Event log:** `main → main · Buffer · feedAppendOnlyFile SELECT 0 + SET … PXAT · 89 B`
- **State (main: AOF):**
  - before: `policy` = everysec; `aof_buf` = ""; `fsync 대기` = no
  - after: `policy` = everysec; `aof_buf` = SELECT 0 + SET user:1 alice PXAT 1793750460000 (89 B); `fsync 대기` = no
- **Record:** D9.1 (`not wire`)
- **Sources:** [t_string.c#L193-L205](https://github.com/redis/redis/blob/8.10.3/src/t_string.c#L193-L205), [aof.c#L1609-L1631](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1609-L1631), [aof.c#L1674-L1684](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1674-L1684)

#### S3 · `move` main → disk · 응답 전에 `write()`
- **Subtitle:** 잠들기 전 `beforeSleep`이 buffer를 파일에 쓰고, 그다음 응답을 보낸다.
- **Prose:**
  > main thread는 응답을 보내기 전에 AOF buffer를 파일에 `write()`합니다.
  > `write()`는 커널의 page cache까지만 갑니다. 정전에도 남으려면 `fsync()`가 필요합니다.
- **Token:** `data` · `aof_buf 89 B`
- **Facts:**
  - Order in `beforeSleep`: AOF flush, then replies
  - `write()` reaches the page cache; durability needs `fsync()`
- **Event log:** `main → disk · Disk · write(appendonly.aof.1.incr.aof) · 89 B`
- **Sources:** [server.c#L2053-L2057](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2053-L2057), [persistence.md#L159-L166](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L159-L166)

#### S4 · `move` main → bg · `everysec`: 1초마다 background fsync
- **Subtitle:** main thread는 fsync하지 않고 bio thread에 맡긴다.
- **Prose:**
  > 기본 `everysec`에서는 마지막 fsync 후 1초가 지났고 진행 중인 fsync가 없으면 bio thread에 fsync를 맡깁니다.
  > main thread는 디스크를 기다리지 않습니다.
- **Token:** `call` · `fsync job`
- **Facts:**
  - `appendfsync`: everysec
  - Docs: "fsync is performed using a background thread"
- **Event log:** `main → bg · Disk · bio fsync job · —`
- **Sources:** [config.c#L3492](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3492), [aof.c#L1224-L1235](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1224-L1235), [aof.c#L1598-L1604](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1598-L1604), [persistence.md#L42](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L42)

#### S5 · `mutate` disk · 디스크에 남았다
- **Subtitle:** 정책에 따라 잃을 수 있는 범위가 다르다.
- **Prose:**
  > fsync가 끝나면 그때까지의 쓰기는 정전에도 남습니다.
  > `always`는 응답 전에 fsync(가장 안전, 느림), `everysec`은 약 1초를 잃을 수 있고, `no`는 OS에 맡깁니다(Linux는 보통 30초).
- **Facts:**
  - `always`: fsync before replying; `everysec`: up to about 1 s lost; `no`: Linux flushes about every 30 s
  - `everysec` is the documented compromise
- **Event log:** `bg → disk · Disk · fsync appendonly.aof.1.incr.aof · 2 ms (E.G.)`
- **State (disk: appendonlydir):**
  - before: `base` = appendonly.aof.1.base.rdb; `incr` = [appendonly.aof.1.incr.aof]; `fsync된 범위` = 이전 쓰기 전부
  - after: `base` = appendonly.aof.1.base.rdb; `incr` = [appendonly.aof.1.incr.aof]; `fsync된 범위` = SET user:1 alice까지
- **Sources:** [persistence.md#L159-L166](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L159-L166), [redis.conf#L1538-L1551](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1538-L1551)

#### S6 · `mutate` main · 디스크가 느리면 write를 미룬다 (side path)
- **Subtitle:** 이전 fsync가 2초 안에 안 끝나면 기다리지 않고 쓴다. 이 경고 로그가 장애 신호다.
- **Prose:**
  > 이전 fsync가 진행 중이면 `write()`가 커널에서 막힐 수 있어 최대 2초 미룹니다. 2초가 넘으면 그냥 쓰고 경고를 남깁니다.
  > 이 로그가 보이면 디스크가 느리다는 뜻이고, 손실 범위는 1초보다 길어집니다.
- **Facts:**
  - Log: `Asynchronous AOF fsync is taking too long (disk is busy?). …`
  - Counter: `aof_delayed_fsync` in `INFO persistence`
- **Event log:** `main → main · Buffer · flush postponed, fsync still running · 2000 ms`
- **State (main: AOF):**
  - before: `policy` = everysec; `aof_buf` = SELECT 0 + SET user:1 alice PXAT 1793750460000 (89 B); `fsync 대기` = no
  - after: `policy` = everysec; `aof_buf` = 쌓이는 중; `fsync 대기` = yes, 2 s 초과 → 강제 write, `aof_delayed_fsync` +1
- **Sources:** [aof.c#L1437-L1457](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1437-L1457), [server.c#L6660](https://github.com/redis/redis/blob/8.10.3/src/server.c#L6660)

#### S7 · `mutate` disk · rewrite 시작: 새 INCR 파일부터 연다
- **Subtitle:** AOF가 base의 2배를 넘고 64 MB 이상이면 rewrite. 부모가 먼저 새 incremental 파일을 연다.
- **Prose:**
  > AOF는 같은 키를 여러 번 바꾼 기록이 쌓여 커집니다. rewrite는 현재 메모리로 새 base를 만들어 줄입니다.
  > 부모가 먼저 새 INCR 파일을 열고, 이후 쓰기는 그 파일로 갑니다. 그래서 rewrite 중 쓰기를 따로 모을 필요가 없습니다.
- **Facts:**
  - Trigger: `auto-aof-rewrite-percentage` 100 and `auto-aof-rewrite-min-size` 64mb; or `BGREWRITEAOF`
  - Files: BASE (snapshot), INCR (later writes), manifest (which files, in order)
- **Event log:** `main → disk · Disk · open appendonly.aof.2.incr.aof, update manifest · —`
- **State (disk: appendonlydir):**
  - before: `base` = appendonly.aof.1.base.rdb; `incr` = [appendonly.aof.1.incr.aof]; `fsync된 범위` = SET user:1 alice까지
  - after: `base` = appendonly.aof.1.base.rdb; `incr` = [appendonly.aof.1.incr.aof, appendonly.aof.2.incr.aof (new writes)]; `fsync된 범위` = SET user:1 alice까지
- **Sources:** [redis.conf#L1591-L1592](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1591-L1592), [server.c#L1730-L1742](https://github.com/redis/redis/blob/8.10.3/src/server.c#L1730-L1742), [aof.c#L3183-L3196](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L3183-L3196), [aof.c#L44-L71](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L44-L71), [persistence.md#L146-L151](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L146-L151)

#### S8 · `move` main → bg · 자식이 새 BASE를 쓴다
- **Subtitle:** fork한 자식이 fork 시점 메모리를 RDB 형식으로 쓴다.
- **Prose:**
  > 부모는 fork하고 자식이 새 base를 씁니다. 기본으로 RDB 형식(`aof-use-rdb-preamble yes`)이라 작고 load가 빠릅니다.
  > RDB와 같은 fork와 copy-on-write 비용이 듭니다(lesson 8).
- **Token:** `call` · `fork → rewrite`
- **Facts:**
  - `aof-use-rdb-preamble`: yes
  - Same fork and copy-on-write cost as RDB
- **Event log:** `main → bg · Disk · fork, write temp-rewriteaof-bg-48990.aof · 21 MB (E.G.)`
- **Sources:** [aof.c#L3218-L3245](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L3218-L3245), [aof.c#L3139-L3163](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L3139-L3163), [redis.conf#L1640](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1640), [persistence.md#L224-L225](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L224-L225)

#### S9 · `mutate` disk · manifest를 원자적으로 바꾸고 옛 파일을 지운다
- **Subtitle:** 새 BASE + 새 INCR가 현재 AOF가 된다. 옛 BASE와 옛 INCR는 history로 지워진다.
- **Prose:**
  > rewrite가 끝나면 임시 파일을 새 base 이름으로 바꾸고, manifest를 임시 파일 + `rename()`으로 교체합니다.
  > 옛 base와 rewrite에 포함된 INCR는 history가 되어 background에서 지워집니다.
- **Facts:**
  - Manifest line: `file <name> seq <n> type <b|h|i>`
  - Replaced via temp file + `rename()`, so a crash leaves the old or the new manifest, never a mix
- **Event log:** `main → disk · Disk · manifest → 2.base.rdb + 2.incr.aof, history deleted · —`
- **State (disk: appendonlydir):**
  - before: `base` = appendonly.aof.1.base.rdb; `incr` = [appendonly.aof.1.incr.aof, appendonly.aof.2.incr.aof (new writes)]; `fsync된 범위` = SET user:1 alice까지
  - after: `base` = appendonly.aof.2.base.rdb; `incr` = [appendonly.aof.2.incr.aof]; `fsync된 범위` = SET user:1 alice까지
- **Sources:** [aof.c#L3847-L3946](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L3847-L3946), [aof.c#L576-L600](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L576-L600), [aof.c#L123-L135](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L123-L135)

#### S10 · `move` disk → main · 재시작: BASE를 읽고 INCR를 재생한다
- **Subtitle:** 끝이 잘린 마지막 파일은 잘라내고 시작한다.
- **Prose:**
  > 재시작하면 manifest 순서대로 base를 load하고 INCR의 명령을 재생합니다.
  > 정전으로 마지막 명령이 잘렸으면 `aof-load-truncated yes`에 따라 그 부분을 버리고 시작합니다. 실수로 보낸 `FLUSHALL`은 rewrite 전이라면 AOF에서 그 줄을 지우고 재시작해 되살릴 수 있습니다.
- **Token:** `data` · `manifest → base → incr`
- **Facts:**
  - `aof-load-truncated`: yes (last file only)
  - Repair tool: `redis-check-aof --fix`
- **Event log:** `disk → main · Disk · load 2.base.rdb + replay 2.incr.aof · 1.4 s (E.G.)`
- **Sources:** [persistence.md#L45](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L45), [aof.c#L2041-L2056](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L2041-L2056), [aof.c#L2158-L2162](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L2158-L2162), [redis.conf#L1616](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1616), [persistence.md#L192-L220](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L192-L220)

### Replay

S1 → S2 → S3 → S4 → S5: client → main (buffer) → disk (`write`) → bg (`fsync`) → disk (durable).

### Decoder records

**D9.1 · step S2 · `not wire` (file content) · what `SET user:1 alice EX 60` adds to the INCR file.**

| Text | Field | Meaning |
|---|---|---|
| `*2\r\n$6\r\nSELECT\r\n$1\r\n0\r\n` | SELECT | db 0; written when the db changes |
| `*5\r\n$3\r\nSET\r\n$6\r\nuser:1\r\n$5\r\nalice\r\n` | command, key, value | |
| `$4\r\nPXAT\r\n$13\r\n1793750460000\r\n` | expiry | `EX 60` became an absolute ms deadline (E.G.) |

89 bytes in total. Sources: [aof.c#L1609-L1631](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1609-L1631), [aof.c#L1674-L1684](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1674-L1684), [t_string.c#L193-L205](https://github.com/redis/redis/blob/8.10.3/src/t_string.c#L193-L205).

### Self-check

1. **Q:** `appendfsync` 세 가지와 손실 범위는? **A:** `always` 응답 전 fsync(거의 없음, 느림), `everysec` 약 1초(기본), `no` OS 의존(Linux 약 30초).
2. **Q:** "Asynchronous AOF fsync is taking too long" 로그의 의미는? **A:** fsync가 2초 넘게 안 끝나 write를 강제로 했다. 디스크가 느리고, 손실 범위가 1초보다 길어졌다.
3. **Q:** rewrite 중의 새 쓰기는 어디로 가나? **A:** fork 전에 부모가 연 새 INCR 파일로. 끝나면 manifest가 새 BASE + 그 INCR를 가리킨다.

---

## Lesson 10. `replication`: replid와 offset으로 따라잡기

**Goal.** Follow a replica from its first full sync through async streaming to a reconnect that resumes from the backlog, and see what a failover keeps and loses.

**Critical path.** `PSYNC` → full sync (RDB + buffered writes) → async stream → reconnect from the backlog.

**Interview and incident questions**
- 복제는 동기인가 비동기인가? `+OK`를 받은 쓰기도 잃을 수 있나?
- full sync와 partial resync는 언제 일어나나? backlog 크기는 왜 중요한가?
- replica가 full sync를 끝없이 반복하는 원인은?
- failover 뒤 다른 replica가 full sync 없이 따라오는 이유는?

**Overview (one line).** 8.x 기본 설정(diskless sync)에서는 RDB를 두 번째 연결로 보내고, 그동안의 쓰기는 replica 쪽에 쌓는다(replication.c 설명 주석).

**Nodes:** `client` (app), `main` (master), `peer1` (replica 1), `peer2` (replica 2).

**State panels**

| Node | Panel | Initial rows |
|---|---|---|
| `main` | master | `replid` = 8de1…b761 (E.G.); `offset` = 1048576 (E.G.); `backlog` = 1 MB; `replica-1 buffer` = — |
| `peer1` | replica 1 | `state` = connecting; `master replid` = —; `offset` = — |
| `peer2` | replica 2 | `state` = online; `master replid` = 8de1…b761; `offset` = 1048576 |

**Layer selector:** `Handshake` · `Full sync` · `Stream` · `Failover`.

### Steps

#### S1 · `move` peer1 → main · `PSYNC ? -1`
- **Subtitle:** `PING`과 `REPLCONF` 뒤, 처음 붙는 replica는 이력이 없으니 full sync를 요청한다.
- **Prose:**
  > replica는 `PING`, 인증, `REPLCONF`로 자신을 알린 뒤 `PSYNC <replid> <offset>`을 보냅니다.
  > 처음이라 아는 이력이 없으므로 `PSYNC ? -1`입니다.
- **Token:** `request` · `PSYNC ? -1`
- **Facts:**
  - (replid, offset) identifies an exact version of the master's data
  - Reconnect form: `PSYNC <cached replid> <cached offset + 1>`
- **Event log:** `peer1 → main · Handshake · PSYNC ? -1 · 30 B`
- **Sources:** [replication.md#L74-L90](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L74-L90), [replication.c#L2965-L2983](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L2965-L2983)

#### S2 · `move` main → peer1 · `+FULLRESYNC <replid> <offset>`
- **Subtitle:** master가 자기 replid와 현재 offset을 알려 주고 RDB를 준비한다.
- **Prose:**
  > master는 `+FULLRESYNC <replid> <offset>`으로 답합니다. replica는 이 replid와 offset부터 따라가게 됩니다.
- **Token:** `response` · `+FULLRESYNC 8de1…b761 1048576`
- **Facts:**
  - `replid`: 40 hex characters, random per data history
  - `offset`: bytes of replication stream produced so far
- **Event log:** `main → peer1 · Handshake · +FULLRESYNC 8de1…b761 1048576 (E.G.) · 62 B`
- **Record:** D10.1 (`wire`)
- **Sources:** [replication.c#L992-L993](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L992-L993), [server.h#L133](https://github.com/redis/redis/blob/8.10.3/src/server.h#L133)

#### S3 · `mutate` main · RDB를 만들며 새 쓰기는 replica buffer에 쌓는다
- **Subtitle:** fork해서 RDB를 만들고, 그동안 들어온 쓰기는 그 replica의 output buffer에 모은다.
- **Prose:**
  > master는 RDB를 만들고(기본은 disk 없이 socket으로 바로), 그동안의 쓰기를 replica 연결의 output buffer에 쌓습니다.
  > 쓰기가 많아 buffer가 한도를 넘으면 연결이 끊기고 full sync를 다시 시작합니다. 끝없는 full sync 반복의 흔한 원인입니다.
- **Facts:**
  - `repl-diskless-sync`: yes; waits `repl-diskless-sync-delay` 5 s for other replicas
  - Replica buffer limit: `256mb 64mb 60` (hard; soft for 60 s)
- **Event log:** `main → main · Full sync · fork for SYNC, buffer writes for replica-1 · —`
- **State (main: master):**
  - before: `replid` = 8de1…b761; `offset` = 1048576; `backlog` = 1 MB; `replica-1 buffer` = —
  - after: `replid` = 8de1…b761; `offset` = 1050000 (E.G.); `backlog` = 1 MB; `replica-1 buffer` = 1.4 KB writes since 1048576 (E.G.)
- **Sources:** [replication.md#L94](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L94), [redis.conf#L679-L691](https://github.com/redis/redis/blob/8.10.3/redis.conf#L679-L691), [redis.conf#L2474-L2476](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2474-L2476)

#### S4 · `move` main → peer1 · RDB 전송
- **Subtitle:** 스냅샷을 통째로 보낸다. 데이터가 크면 네트워크와 시간이 많이 든다.
- **Prose:**
  > master가 RDB를 replica에 보냅니다. 데이터 크기만큼 네트워크를 쓰고, master는 그동안 fork 비용과 buffer 메모리를 씁니다.
- **Token:** `data` · `RDB 1.2 GB (E.G.)`
- **Facts:**
  - Same RDB format as `dump.rdb` (lesson 8)
  - Disk-less transfer is framed with an `$EOF:<40 random chars>` marker instead of a length
- **Event log:** `main → peer1 · Full sync · RDB · 1.2 GB, 14 s (E.G.)`
- **Sources:** [rdb.c#L2083-L2098](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L2083-L2098), [replication.md#L152-L154](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L152-L154)

#### S5 · `mutate` peer1 · 옛 데이터를 지우고 load한 뒤 밀린 쓰기를 적용
- **Subtitle:** 기존 데이터를 비우는 동안 replica는 막힐 수 있다. load가 끝나면 buffer의 쓰기를 적용한다.
- **Prose:**
  > replica는 옛 데이터를 지우고 RDB를 load합니다. 데이터가 크면 지우는 동안 몇 초 막힐 수 있습니다(`replica-lazy-flush`로 background에서 지울 수 있음).
  > load 후 master가 쌓아 둔 쓰기를 받아 적용하면 online입니다.
- **Facts:**
  - Docs: the replica "will block incoming connections during this brief window"
  - `repl-diskless-load`: disabled (the replica saves the RDB to disk, then loads it)
- **Event log:** `peer1 → peer1 · Full sync · flush, load RDB, apply 1.4 KB · 6 s (E.G.)`
- **State (peer1: replica 1):**
  - before: `state` = connecting; `master replid` = —; `offset` = —
  - after: `state` = online; `master replid` = 8de1…b761; `offset` = 1050000 (E.G.)
- **Sources:** [replication.md#L48](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L48), [redis.conf#L718-L732](https://github.com/redis/redis/blob/8.10.3/redis.conf#L718-L732)

#### S6 · `move` main → peer1 · 평상시: 명령을 그대로 흘려보낸다
- **Subtitle:** master는 client에 먼저 답하고, 같은 명령을 replica로 보낸다.
- **Prose:**
  > client의 `SET user:1 alice`에 master는 바로 `+OK`를 답합니다. 같은 명령을 RESP 그대로 replica에 보내고, offset이 그 바이트 수만큼 늘어납니다.
  > master는 replica를 기다리지 않습니다(비동기).
- **Token:** `data` · `SET user:1 alice` (36 B)
- **Facts:**
  - Docs: "the master does not wait every time for a command to be processed by the replicas"
  - `master_repl_offset` grows by the bytes sent
- **Event log:** `main → peer1 · Stream · *3 SET user:1 alice · 36 B`
- **Sources:** [replication.md#L25-L30](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L25-L30), [replication.c#L596](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L596)

#### S7 · `mutate` peer1 · 따라잡고 매초 ACK
- **Subtitle:** replica는 처리한 offset을 1초마다 알린다. 두 offset의 차이가 replica lag이다.
- **Prose:**
  > replica는 받은 만큼 offset을 올리고 1초마다 `REPLCONF ACK <offset>`을 보냅니다.
  > 운영에서는 `INFO replication`의 offset 차이와 `lag`으로 지연을 봅니다.
- **Facts:**
  - ACK every second; master PINGs replicas every 10 s (`repl-ping-replica-period`)
  - `repl-timeout`: 60 s
- **Event log:** `peer1 → main · Stream · REPLCONF ACK 1050036 · 40 B`
- **State (peer1: replica 1):**
  - before: `state` = online; `master replid` = 8de1…b761; `offset` = 1050000
  - after: `state` = online; `master replid` = 8de1…b761; `offset` = 1050036
- **Record:** D10.2 (`wire`)
- **Sources:** [replication.md#L251](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L251), [server.c#L1778-L1780](https://github.com/redis/redis/blob/8.10.3/src/server.c#L1778-L1780), [config.c#L3531-L3532](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3531-L3532), [server.c#L6957-L6972](https://github.com/redis/redis/blob/8.10.3/src/server.c#L6957-L6972)

#### S8 · `move` peer1 → main · 잠깐 끊겼다 다시 붙는다
- **Subtitle:** `PSYNC 8de1…b761 1050037` — 마지막으로 받은 다음 바이트부터 달라고 한다.
- **Prose:**
  > 네트워크가 잠깐 끊긴 동안에도 master는 쓰기를 받고, 그 바이트들은 backlog에 남습니다.
  > 다시 붙은 replica는 기억한 replid와 offset+1로 `PSYNC`를 보냅니다.
- **Token:** `request` · `PSYNC 8de1…b761 1050037`
- **Facts:**
  - The backlog is allocated once a replica has connected, and keeps recording while replicas are disconnected
  - `repl-backlog-ttl`: 3600 s after the last replica disconnects
- **Event log:** `peer1 → main · Handshake · PSYNC 8de1…b761 1050037 · 75 B`
- **Sources:** [replication.md#L85-L90](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L85-L90), [redis.conf#L777-L792](https://github.com/redis/redis/blob/8.10.3/redis.conf#L777-L792)

#### S9 · `mutate` main · backlog 안이면 `+CONTINUE`, 밖이면 full sync
- **Subtitle:** 끊긴 동안의 쓰기가 backlog(기본 1 MB)에 다 있으면 빠진 부분만 보낸다.
- **Prose:**
  > replid가 같고 요청 offset이 backlog 범위 안이면 `+CONTINUE`로 빠진 바이트만 보냅니다.
  > 끊긴 동안 1 MB보다 많이 쓰였으면 full sync입니다. 쓰기가 많은 서비스는 backlog를 늘립니다.
- **Facts:**
  - `repl-backlog-size`: 1mb
  - Size it to cover write rate × the longest expected disconnect
- **Event log:** `main → peer1 · Stream · +CONTINUE, send 2.1 KB from backlog (E.G.) · —`
- **State (main: master):**
  - before: `replid` = 8de1…b761; `offset` = 1050000 (E.G.); `backlog` = 1 MB; `replica-1 buffer` = 1.4 KB writes since 1048576 (E.G.)
  - after: `replid` = 8de1…b761; `offset` = 1052100 (E.G.); `backlog` = 1 MB, covers 1050037 → `+CONTINUE`; `replica-1 buffer` = —
- **Sources:** [replication.c#L1019-L1075](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L1019-L1075), [config.c#L3585](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3585), [replication.md#L85-L90](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L85-L90)

#### S10 · `mutate` peer1 · failover: 승격하며 옛 replid를 기억한다 (side path)
- **Subtitle:** master가 죽고 replica 1이 승격된다. 옛 replid를 replid2로 남겨 replica 2가 partial resync할 수 있다.
- **Prose:**
  > 승격된 replica는 새 replid를 만들고 옛 replid를 replid2로 기억합니다. 옛 ID로 오는 replica 2의 `PSYNC`도 받아 줄 수 있어 full sync가 필요 없습니다.
  > 다만 복제되기 전에 master가 받은 쓰기는 사라집니다. 비동기 복제이기 때문입니다.
- **Facts:**
  - New master: `replid2` = old `replid`, accepted up to the switch offset
  - Docs: `WAIT` does not prevent losing acknowledged writes during a failover
- **Event log:** `peer1 → peer1 · Failover · promoted, replid c0ff…ee01, replid2 8de1…b761 (E.G.) · —`
- **State (peer1: replica 1):**
  - before: `state` = online; `master replid` = 8de1…b761; `offset` = 1050036
  - after: `state` = master; `master replid` = c0ff…ee01 (replid2 8de1…b761); `offset` = 1052100 (E.G.)
- **Sources:** [replication.md#L126-L144](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L126-L144), [replication.c#L2142-L2151](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L2142-L2151), [replication.md#L32-L37](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L32-L37)

### Replay

S1 → S2 → S3 → S4 → S5 → S6: peer1 → main (`PSYNC`) → peer1 (`+FULLRESYNC`) → main (RDB + buffer) → peer1 (RDB) → peer1 (load) → stream.

### Decoder records

**D10.1 · step S2 · `wire` · `+FULLRESYNC` reply (62 B).**

| Text | Field | Meaning |
|---|---|---|
| `+FULLRESYNC` | type and keyword | a full sync follows |
| `8de1787ba490483314a4d30f1c628bc5025eb761` | replid | 40 hex characters (E.G.) |
| `1048576` | offset | where the replica will start following (E.G.) |

Partial resync reply: `+CONTINUE <replid>\r\n`. Sources: [replication.c#L992-L993](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L992-L993), [replication.c#L1071-L1075](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L1071-L1075).

**D10.2 · step S7 · `wire` · `INFO replication` on the master (lines an engineer reads).**

| Line | Example | Meaning |
|---|---|---|
| `role` | `master` | |
| `connected_slaves` | `2` | |
| `slave0` | `ip=10.0.1.5,port=6379,state=online,offset=1050036,lag=0` (E.G.) | per-replica state, acked offset, seconds since last ACK |
| `master_replid` | `8de1…b761` (E.G.) | current history id |
| `master_repl_offset` | `1050036` (E.G.) | master offset; minus a replica's offset = bytes behind |
| `repl_backlog_size` | `1048576` | backlog size in bytes |

Source: [server.c#L6848-L6972](https://github.com/redis/redis/blob/8.10.3/src/server.c#L6848-L6972).

### Self-check

1. **Q:** partial resync가 되는 조건은? **A:** replid가 같고(또는 failover 후 replid2), 요청 offset이 backlog 범위 안일 때. 기본 backlog는 1 MB.
2. **Q:** replica가 full sync를 계속 반복하는 흔한 원인 두 가지는? **A:** full sync 중 replica output buffer 한도(256mb/64mb 60s) 초과, 그리고 backlog보다 많은 쓰기가 쌓이는 긴 단절.
3. **Q:** failover 뒤 다른 replica가 full sync 없이 따라오는 이유는? **A:** 새 master가 옛 replid를 replid2로 기억해 옛 ID로 온 `PSYNC`를 받아 준다.

---

## Lesson 11. `sentinel`: 누가 master의 죽음을 판정하나

**Goal.** See how three Sentinels decide that a master is down (one opinion, then agreement), elect one of themselves to act, promote the best replica, and point clients at the new master.

**Critical path.** PING timeout → SDOWN → quorum → ODOWN → majority elects a leader → promote a replica → clients switch.

**Interview and incident questions**
- Sentinel은 왜 최소 3개를 서로 다른 장비에 두나?
- quorum과 majority의 차이는?
- 어떤 replica가 승격되나?
- failover 뒤 client는 새 master를 어떻게 알게 되나? 잃는 쓰기는?

**Nodes:** `client` (Sentinel-aware app), `main` (master), `peer1` (replica 1), `peer2` (replica 2), `sen1`, `sen2`, `sen3`.

**State panels**

| Node | Panel | Initial rows |
|---|---|---|
| `sen1` | view of mymaster | `상태` = ok; `동의` = —; `epoch` = 6; `leader` = —; `승격 대상` = — |
| `client` | master address | `mymaster` = 10.0.0.1:6379 (E.G.) |
| `main` | old master | `role` = master; `상태` = — |

**Layer selector:** `Detect` · `Elect` · `Promote` · `Clients`.

### Steps

#### S1 · `move` sen1 → main · 매초 PING
- **Subtitle:** Sentinel은 master, replica, 다른 Sentinel에게 1초마다 PING한다.
- **Prose:**
  > 각 Sentinel은 master와 replica에 1초마다 `PING`, 10초마다 `INFO`를 보냅니다. replica 목록은 master의 `INFO`에서 얻습니다.
  > 다른 Sentinel은 master의 `__sentinel__:hello` 채널에 2초마다 올라오는 메시지로 서로 찾습니다.
- **Token:** `request` · `PING`
- **Facts:**
  - At least 3 Sentinels on machines that fail independently
  - Config: `sentinel monitor mymaster 10.0.0.1 6379 2` (last number = quorum)
- **Event log:** `sen1 → main · Detect · PING · every 1 s`
- **Sources:** [sentinel.md#L85-L86](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L85-L86), [sentinel.md#L123](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L123), [sentinel.c#L3142-L3185](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L3142-L3185), [sentinel.md#L996-L998](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L996-L998)

#### S2 · `mutate` sen1 · 30초 응답 없음 → SDOWN
- **Subtitle:** `down-after-milliseconds` 동안 유효한 답이 없으면, 이 Sentinel 혼자 "죽은 것 같다"고 본다.
- **Prose:**
  > `down-after-milliseconds`(기본 30초) 동안 유효한 `PING` 응답이 없으면 그 Sentinel은 master를 SDOWN(주관적 다운)으로 표시합니다.
  > 아직 한 Sentinel의 의견일 뿐이고, failover는 시작되지 않습니다.
- **Facts:**
  - `down-after-milliseconds`: 30000
  - Valid replies: `+PONG`, `-LOADING`, `-MASTERDOWN`
  - Event: `+sdown`
- **Event log:** `sen1 → sen1 · Detect · +sdown master mymaster 10.0.0.1 6379 · 30 s`
- **State (sen1: view of mymaster):**
  - before: `상태` = ok; `동의` = —; `epoch` = 6; `leader` = —; `승격 대상` = —
  - after: `상태` = SDOWN; `동의` = 1/3; `epoch` = 6; `leader` = —; `승격 대상` = —
- **Sources:** [sentinel.md#L940-L958](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L940-L958), [sentinel.c#L69](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L69), [sentinel.c#L4625-L4645](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L4625-L4645)

#### S3 · `move` sen1 → sen2 · 다른 Sentinel에게 묻는다
- **Subtitle:** `SENTINEL is-master-down-by-addr` — "너도 master가 죽었다고 보니?"
- **Prose:**
  > SDOWN을 본 Sentinel은 다른 Sentinel들에게 master 상태를 1초마다 묻습니다.
- **Token:** `request` · `SENTINEL is-master-down-by-addr 10.0.0.1 6379 6 *`
- **Facts:**
  - Reply: down flag, leader runid (or `*`), leader epoch
  - Docs: "no strong consensus algorithm is used, but just a form of gossip" for ODOWN
- **Event log:** `sen1 → sen2 · Detect · is-master-down-by-addr → down=1 · —`
- **Sources:** [sentinel.c#L3964-L4015](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L3964-L4015), [sentinel.md#L964-L967](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L964-L967)

#### S4 · `mutate` sen1 · quorum이 동의 → ODOWN
- **Subtitle:** quorum(여기서는 2)개 Sentinel이 동의하면 객관적 다운.
- **Prose:**
  > SDOWN에 동의한 Sentinel 수가 quorum 이상이면 ODOWN(객관적 다운)입니다. ODOWN은 master에만 씁니다.
  > quorum은 "죽었다"는 판정에만 쓰입니다. failover 실행은 다음 단계의 과반 투표가 정합니다.
- **Facts:**
  - Docs: "the quorum is only used to detect the failure"
  - Event: `+odown … #quorum 2/2`
- **Event log:** `sen1 → sen1 · Detect · +odown master mymaster #quorum 2/2 · —`
- **State (sen1: view of mymaster):**
  - before: `상태` = SDOWN; `동의` = 1/3; `epoch` = 6; `leader` = —; `승격 대상` = —
  - after: `상태` = ODOWN; `동의` = 2/3; `epoch` = 6; `leader` = —; `승격 대상` = —
- **Sources:** [sentinel.c#L4654-L4686](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L4654-L4686), [sentinel.md#L132-L133](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L132-L133), [sentinel.md#L973-L975](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L973-L975)

#### S5 · `move` sen1 → sen2 · "나를 leader로 뽑아 줘"
- **Subtitle:** epoch를 올리고 자기 runid를 넣어 같은 명령으로 표를 요청한다.
- **Prose:**
  > failover는 Sentinel 하나만 실행합니다. sen1은 epoch를 7로 올리고 다른 Sentinel에게 자기에게 투표해 달라고 요청합니다.
  > 각 Sentinel은 epoch마다 한 번만 투표합니다.
- **Token:** `request` · `SENTINEL is-master-down-by-addr 10.0.0.1 6379 7 <sen1 runid>`
- **Facts:**
  - One vote per Sentinel per epoch
  - Events: `+new-epoch`, `+try-failover`, `+vote-for-leader`
- **Event log:** `sen1 → sen2 · Elect · vote request epoch 7 → +vote-for-leader sen1 · —`
- **Sources:** [sentinel.c#L4991-L5001](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L4991-L5001), [sentinel.c#L3973-L3975](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L3973-L3975), [sentinel.c#L4792-L4818](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L4792-L4818)

#### S6 · `mutate` sen1 · 과반을 얻어 leader가 된다
- **Subtitle:** 전체 Sentinel의 과반(그리고 quorum 이상)의 표가 있어야 failover할 수 있다.
- **Prose:**
  > 표가 Sentinel 전체의 과반이면서 quorum 이상이면 sen1이 leader입니다. 소수 쪽 partition에서는 failover가 일어나지 않습니다.
  > 실패하면 `failover-timeout`의 2배 뒤에 다시 시도합니다.
- **Facts:**
  - Docs: "Sentinel never performs a failover in the partition where a minority of Sentinels exist"
  - `failover-timeout`: 180000 ms
- **Event log:** `sen1 → sen1 · Elect · +elected-leader epoch 7 (2 of 3 votes) · —`
- **State (sen1: view of mymaster):**
  - before: `상태` = ODOWN; `동의` = 2/3; `epoch` = 6; `leader` = —; `승격 대상` = —
  - after: `상태` = ODOWN; `동의` = 2/3; `epoch` = 7; `leader` = sen1; `승격 대상` = —
- **Sources:** [sentinel.md#L1080-L1088](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L1080-L1088), [sentinel.c#L4872-L4905](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L4872-L4905), [sentinel.c#L77](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L77), [sentinel.md#L1106](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L1106)

#### S7 · `mutate` sen1 · 승격할 replica를 고른다
- **Subtitle:** 끊긴 지 오래된 replica는 빼고, priority → 복제 offset → runid 순으로 고른다.
- **Prose:**
  > 연결이 끊겼거나 오래 끊겨 있던 replica, `replica-priority 0`인 replica는 후보에서 뺍니다.
  > 남은 후보를 priority가 낮은 순, 그다음 복제 offset이 큰(데이터가 최신인) 순으로 고릅니다.
- **Facts:**
  - `replica-priority`: 100 by default; 0 = never promoted
  - Order: lower priority → higher replication offset → smaller runid
- **Event log:** `sen1 → sen1 · Promote · +selected-slave slave 10.0.0.2:6379 · —`
- **State (sen1: view of mymaster):**
  - before: `상태` = ODOWN; `동의` = 2/3; `epoch` = 7; `leader` = sen1; `승격 대상` = —
  - after: `상태` = ODOWN; `동의` = 2/3; `epoch` = 7; `leader` = sen1; `승격 대상` = replica 1 (10.0.0.2, offset 1052100, E.G.)
- **Sources:** [sentinel.c#L5044-L5100](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L5044-L5100), [sentinel.c#L5115-L5136](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L5115-L5136), [sentinel.md#L1044-L1062](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L1044-L1062), [redis.conf#L812-L825](https://github.com/redis/redis/blob/8.10.3/redis.conf#L812-L825)

#### S8 · `move` sen1 → peer1 · `REPLICAOF NO ONE`
- **Subtitle:** 고른 replica를 master로 만든다.
- **Prose:**
  > leader는 고른 replica에 `REPLICAOF NO ONE`(과 `CONFIG REWRITE`)을 보냅니다. 그 replica의 `INFO`에서 master 역할이 보이면 승격이 확정됩니다.
- **Token:** `request` · `REPLICAOF NO ONE`
- **Facts:**
  - Sent inside `MULTI`/`EXEC` with `CONFIG REWRITE` and `CLIENT KILL`
  - Events: `+failover-state-send-slaveof-noone`, then `+promoted-slave`
- **Event log:** `sen1 → peer1 · Promote · REPLICAOF NO ONE → +promoted-slave · —`
- **Sources:** [sentinel.c#L4945-L4986](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L4945-L4986), [sentinel.md#L1116](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L1116)

#### S9 · `move` sen1 → peer2 · 나머지 replica는 새 master를 따른다
- **Subtitle:** `REPLICAOF 10.0.0.2 6379`. 한 번에 `parallel-syncs`개씩.
- **Prose:**
  > 나머지 replica는 새 master를 따르도록 바꿉니다. 동시에 몇 개를 바꿀지는 `parallel-syncs`(기본 1)가 정합니다. 동시에 많이 바꾸면 그만큼 replica가 동시에 sync합니다.
- **Token:** `request` · `REPLICAOF 10.0.0.2 6379`
- **Facts:**
  - `parallel-syncs`: 1
  - Events: `+slave-reconf-sent`, `+slave-reconf-done`, `+failover-end`
- **Event log:** `sen1 → peer2 · Promote · REPLICAOF 10.0.0.2 6379 · —`
- **Sources:** [sentinel.c#L5317-L5319](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L5317-L5319), [sentinel.c#L81](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L81)

#### S10 · `mutate` client · client가 새 master로 옮긴다
- **Subtitle:** `+switch-master` 이벤트, 또는 Sentinel에 다시 물어서 새 주소를 얻는다.
- **Prose:**
  > Sentinel은 `+switch-master <이름> <옛 ip> <옛 port> <새 ip> <새 port>`를 pub/sub로 알립니다.
  > Sentinel-aware client는 `SENTINEL get-master-addr-by-name mymaster`로 주소를 받고, 연결한 뒤 `ROLE`로 master인지 확인합니다.
- **Facts:**
  - Docs: `+switch-master` is "the message most external users are interested in"
  - Client steps: ask a Sentinel → connect → verify with `ROLE` → retry if not master
- **Event log:** `sen1 → client · Clients · +switch-master mymaster 10.0.0.1 6379 10.0.0.2 6379 · —`
- **State (client: master address):**
  - before: `mymaster` = 10.0.0.1:6379
  - after: `mymaster` = 10.0.0.2:6379
- **Record:** D11.1 (`wire`)
- **Sources:** [sentinel.md#L729-L734](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L729-L734), [sentinel.md#L768](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L768), [sentinel-clients.md#L49-L80](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/sentinel-clients.md#L49-L80), [sentinel.c#L5363-L5371](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L5363-L5371)

#### S11 · `mutate` main · 옛 master가 돌아오면 replica가 된다 (side path)
- **Subtitle:** 분할 중 옛 master가 받은 쓰기는 사라진다. `min-replicas-to-write`로 그 시간을 줄인다.
- **Prose:**
  > 옛 master가 돌아오면 Sentinel이 새 master의 replica로 바꿉니다. 분할 동안 옛 master에 쓴 client의 데이터는 full sync로 지워집니다.
  > `min-replicas-to-write 1`이면 replica와 끊긴 master가 10초 뒤 쓰기를 거절해 손실을 줄입니다. 대신 가용성이 줄어듭니다.
- **Facts:**
  - Docs: "all the data written during the partition will be lost"
  - `min-replicas-to-write 1` + `min-replicas-max-lag 10` limits the window
- **Event log:** `sen1 → main · Promote · +convert-to-slave 10.0.0.1:6379 · —`
- **State (main: old master):**
  - before: `role` = master; `상태` = —
  - after: `role` = replica of 10.0.0.2; `상태` = partition writes discarded
- **Sources:** [sentinel.md#L1180-L1200](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L1180-L1200), [sentinel.c#L2711-L2725](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L2711-L2725), [sentinel.md#L1016](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L1016)

### Replay

S1 → S2 → S4 → S6 → S7 → S8 → S10: sen1 → main (no reply) → SDOWN → ODOWN → leader → choose → peer1 (promote) → client (switch).

### Decoder records

**D11.1 · step S10 · `wire` · `+switch-master` Pub/Sub message.**

| Field | Example | Meaning |
|---|---|---|
| channel | `+switch-master` | event name = channel |
| master name | `mymaster` | from `sentinel monitor` |
| old ip, old port | `10.0.0.1 6379` (E.G.) | |
| new ip, new port | `10.0.0.2 6379` (E.G.) | connect here |

`SENTINEL get-master-addr-by-name mymaster` returns the same new address as a 2-element array `[ip, port]`. Sources: [sentinel.c#L5363-L5371](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L5363-L5371), [sentinel.c#L4021-L4035](https://github.com/redis/redis/blob/8.10.3/src/sentinel.c#L4021-L4035), [sentinel.md#L768](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L768).

### Self-check

1. **Q:** SDOWN과 ODOWN의 차이는? **A:** SDOWN은 한 Sentinel이 down-after(30초) 동안 답을 못 받은 것, ODOWN은 quorum 개 Sentinel이 동의한 것.
2. **Q:** quorum이 2인데 Sentinel 3개 중 2개가 죽었다. failover가 되나? **A:** 안 된다. 살아 있는 1개는 과반 표를 얻을 수 없다.
3. **Q:** 승격 replica 선택 기준은? **A:** 오래 끊긴 것과 priority 0 제외 후, priority 낮은 순 → offset 큰 순 → runid.
4. **Q:** failover 뒤 잃을 수 있는 쓰기는? **A:** 복제되기 전 옛 master가 받은 쓰기, 분할 중 옛 master에 쓴 데이터.

---

## Lesson 12. `cluster`: 16384개 slot과 MOVED/ASK

**Goal.** Route one key to its slot and node, follow a `MOVED` and an `ASK` redirect, then watch the cluster detect a dead master and promote its replica.

**Critical path.** key → slot → owner node, or a MOVED/ASK redirect; dead master → PFAIL → FAIL → replica elected.

**Interview and incident questions**
- Redis Cluster는 키를 어떻게 나누나? hash tag는 왜 쓰나?
- `MOVED`와 `ASK`의 차이와 client 동작은?
- master 장애를 누가 판정하고, replica는 어떻게 승격되나?
- 분할 중 받은 쓰기를 잃을 수 있나?

**Overview (one line).** 8.4부터 `CLUSTER MIGRATION`으로 slot을 원자적으로 옮길 수 있다(이때는 ASK가 없다; cluster-migration docs).

**Scenario.** Three masters with one replica each. The slot split below is an example of a `redis-cli --cluster create` 3-master split: A `0–5460`, B `5461–10922`, C `10923–16383` (E.G.). Only A's replica A1 is drawn.

**Nodes:** `client` (cluster-aware client), `main` (node A), `peer1` (node B), `peer2` (node C), `peer3` (replica A1).

**State panels**

| Node | Panel | Initial rows |
|---|---|---|
| `client` | slot map (cached) | `0–5460` → B (stale, E.G.); `5461–10922` → B; `10923–16383` → C |
| `main` | node A | `slot 1649` = owner, stable; `{user:1000}.following` = here; `cluster state` = ok |
| `peer1` | node B's view of A | `A flags` = master; `reports` = — |
| `peer3` | replica A1 | `role` = replica of A; `epoch` = 6; `votes` = — |

**Layer selector:** `Routing` · `Resharding` · `Failure detection` · `Failover`.

### Steps

#### S1 · `mutate` client · key → slot
- **Subtitle:** `CRC16("user:1000") mod 16384` = 1649. `{…}` 안만 hash하면 관련 키를 한 slot에 모을 수 있다.
- **Prose:**
  > 키 공간은 16384개 slot이고, slot = `CRC16(key) mod 16384`입니다. 각 slot은 master 하나가 맡습니다.
  > 키에 `{…}`가 있으면 그 안만 hash합니다. `{user:1000}.following`도 slot 1649입니다. multi-key 명령과 transaction은 같은 slot 키끼리만 됩니다.
- **Facts:**
  - `user:1000` → slot 1649; `{user:1000}.following` → 1649 (computed with the spec's CRC16, checked against its test vector)
  - Keys in different slots in one command: `-CROSSSLOT Keys in request don't hash to the same slot`
- **Event log:** `client → client · Routing · slot(user:1000) = 1649 · —`
- **State (client: slot map):**
  - before: `0–5460` → B (stale); `5461–10922` → B; `10923–16383` → C
  - after: `0–5460` → B (stale) ← slot 1649 looked up; `5461–10922` → B; `10923–16383` → C
- **Sources:** [cluster-spec.md#L160-L174](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L160-L174), [cluster-spec.md#L194-L207](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L194-L207), [cluster.c#L1500](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1500)

#### S2 · `move` client → peer1 · 오래된 map으로 B에 보냈다
- **Subtitle:** `GET user:1000`이 slot 1649의 주인이 아닌 B에 간다.
- **Prose:**
  > client는 캐시한 slot map이 오래되어 B에 보냅니다. B는 실행 전 검사에서 slot 1649가 자기 것이 아님을 압니다.
- **Token:** `request` · `GET user:1000`
- **Facts:**
  - The check runs in `processCommand`, before execution (lesson 1 S5)
  - Nodes do not proxy requests; they redirect
- **Event log:** `client → peer1 · RESP2 · GET user:1000 · 28 B`
- **Sources:** [server.c#L4603-L4622](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4603-L4622), [cluster-spec.md#L385-L390](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L385-L390)

#### S3 · `move` peer1 → client · `-MOVED 1649 10.0.0.1:6379`
- **Subtitle:** "이 slot은 저 node 것이다." 영구적인 이동이다.
- **Prose:**
  > B는 `-MOVED <slot> <ip>:<port>`로 답합니다. client는 그 node로 다시 보내고 slot map을 고쳐야 합니다.
- **Token:** `response` · `-MOVED 1649 10.0.0.1:6379`
- **Facts:**
  - Format: `-MOVED <slot> <endpoint>:<port>`
  - Client: update the mapping; refreshing the full map with `CLUSTER SHARDS` is recommended
- **Event log:** `peer1 → client · RESP2 · -MOVED 1649 10.0.0.1:6379 (E.G.) · 27 B`
- **Record:** D12.1 (`wire`)
- **Sources:** [cluster.c#L1512-L1520](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1512-L1520), [cluster-spec.md#L397-L410](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L397-L410)

#### S4 · `mutate` client · slot map을 갱신
- **Subtitle:** `CLUSTER SHARDS`로 전체 map을 다시 받는다.
- **Prose:**
  > client는 `MOVED`를 받으면 slot map을 갱신합니다. 정상 상태에서는 redirect가 거의 없고, resharding이나 failover 뒤에만 잠깐 생깁니다.
- **Facts:**
  - `CLUSTER SHARDS` (since 7.0) replaces the deprecated `CLUSTER SLOTS`
  - Many `MOVED` replies in metrics mean clients hold stale maps
- **Event log:** `client → client · Routing · CLUSTER SHARDS → map updated · —`
- **State (client: slot map):**
  - before: `0–5460` → B (stale) ← slot 1649 looked up; `5461–10922` → B; `10923–16383` → C
  - after: `0–5460` → A; `5461–10922` → B; `10923–16383` → C
- **Sources:** [cluster-shards.md#L26](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/cluster-shards.md#L26), [cluster-slots.md#L19](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/cluster-slots.md#L19)

#### S5 · `move` client → main · 올바른 node에서 처리
- **Subtitle:** A가 `GET user:1000`을 실행한다.
- **Prose:**
  > 이제 client는 처음부터 A로 보냅니다. cluster client는 slot을 직접 계산하므로 한 번에 주인 node에 닿습니다.
- **Token:** `request` · `GET user:1000`
- **Facts:**
  - Steady state: one hop, no proxy
  - Each node serves only its own slots
- **Event log:** `client → main · RESP2 · GET user:1000 → $5 alice · 28 B / 11 B`
- **Sources:** [cluster.c#L1487](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1487), [cluster-spec.md#L385-L410](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L385-L410)

#### S6 · `mutate` main · resharding: slot 1649를 B로 옮기는 중
- **Subtitle:** A는 MIGRATING, B는 IMPORTING. 키를 하나씩 `MIGRATE`로 옮긴다.
- **Prose:**
  > slot을 옮길 때는 B를 IMPORTING, A를 MIGRATING으로 표시하고 키를 `MIGRATE`로 하나씩 옮깁니다. 끝나면 slot 주인을 B로 바꿉니다.
  > 그동안 slot의 키는 A와 B에 나뉘어 있습니다. 큰 키의 `MIGRATE`는 두 node를 모두 막습니다(lesson 7).
- **Facts:**
  - Order: B `IMPORTING`, A `MIGRATING`, `MIGRATE` keys, `SETSLOT … NODE B`
  - Docs: `MIGRATE` "blocks the two instances for the time required to transfer the key"
- **Event log:** `main → peer1 · Resharding · MIGRATE {user:1000}.following · 1 key`
- **State (main: node A):**
  - before: `slot 1649` = owner, stable; `{user:1000}.following` = here; `cluster state` = ok
  - after: `slot 1649` = owner, MIGRATING → B; `{user:1000}.following` = moved to B; `cluster state` = ok
- **Sources:** [cluster-spec.md#L446-L505](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L446-L505), [migrate.md#L144-L145](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/migrate.md#L144-L145), [cluster-spec.md#L520-L523](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L520-L523)

#### S7 · `move` main → client · `-ASK 1649 10.0.0.2:6379`
- **Subtitle:** 키가 이미 B로 갔다. "이번 한 번만 B에 물어봐라."
- **Prose:**
  > A는 slot의 주인이지만 요청한 키가 없고 slot이 MIGRATING이면 `-ASK`로 답합니다.
  > ASK는 일시적입니다. client는 slot map을 바꾸지 않습니다.
- **Token:** `response` · `-ASK 1649 10.0.0.2:6379`
- **Facts:**
  - ASK only while a slot is migrating and the keys are missing locally
  - Some keys here, some moved: `-TRYAGAIN`
- **Event log:** `main → client · RESP2 · -ASK 1649 10.0.0.2:6379 (E.G.) · 25 B`
- **Record:** D12.2 (`wire`)
- **Sources:** [cluster.c#L1357-L1363](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1357-L1363), [cluster.c#L1437-L1446](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1437-L1446), [cluster.c#L1505](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1505), [cluster-spec.md#L552-L555](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L552-L555)

#### S8 · `move` client → peer1 · `ASKING` 다음 같은 명령
- **Subtitle:** IMPORTING 중인 B는 `ASKING`을 먼저 받은 요청만 처리한다.
- **Prose:**
  > client는 B에 `ASKING`을 보낸 뒤 같은 명령을 보냅니다. `ASKING` 표시는 다음 명령 하나에만 유효합니다.
  > `ASKING` 없이 보내면 B는 아직 slot 주인이 A이므로 `MOVED`로 돌려보냅니다.
- **Token:** `request` · `ASKING` + `GET {user:1000}.following`
- **Facts:**
  - `ASKING` is a one-shot flag
  - After `SETSLOT … NODE B`, A answers `MOVED` for this slot
- **Event log:** `client → peer1 · RESP2 · ASKING, GET {user:1000}.following · 16 B + 41 B`
- **Sources:** [cluster.c#L1738-L1745](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1738-L1745), [cluster.c#L1452-L1461](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1452-L1461), [cluster-spec.md#L552-L555](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L552-L555)

#### S9 · `mutate` peer1 · A가 응답하지 않는다 → PFAIL
- **Subtitle:** node끼리는 cluster bus(port + 10000)로 PING한다. `cluster-node-timeout` 동안 답이 없으면 PFAIL.
- **Prose:**
  > node들은 data port + 10000(예: 16379)인 cluster bus로 PING/PONG을 주고받습니다. 방화벽에서 이 port도 열어야 합니다.
  > A가 15초 동안 답하지 않으면 B는 A를 PFAIL로 표시합니다. 아직 B 혼자의 판단입니다.
- **Facts:**
  - Bus port: data port + 10000 (`cluster-port` 0 = default)
  - `cluster-node-timeout`: 15000 ms
- **Event log:** `peer1 → peer1 · Failure detection · no PONG from A for 15000 ms → PFAIL · 15 s`
- **State (peer1: node B's view of A):**
  - before: `A flags` = master; `reports` = —
  - after: `A flags` = master, PFAIL; `reports` = [B]
- **Sources:** [cluster_legacy.h#L18](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.h#L18), [redis.conf#L1767-L1772](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1767-L1772), [cluster-spec.md#L732](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L732)

#### S10 · `mutate` peer1 · 과반 master가 동의 → FAIL
- **Subtitle:** gossip으로 모인 PFAIL 보고가 master 과반이면 FAIL로 바꾸고 모두에게 알린다.
- **Prose:**
  > node들은 PING에 다른 node의 상태를 실어 보냅니다(gossip). B는 master 과반의 PFAIL 보고가 `node timeout × 2` 안에 모이면 A를 FAIL로 바꾸고 FAIL 메시지를 모두에게 보냅니다.
- **Facts:**
  - Quorum: majority of masters; window: node timeout × 2
  - FAIL is broadcast to every node
- **Event log:** `peer1 → peer3 · Failure detection · FAIL about A (2 of 3 masters) · —`
- **State (peer1: node B's view of A):**
  - before: `A flags` = master, PFAIL; `reports` = [B]
  - after: `A flags` = master, FAIL; `reports` = [B, C]
- **Sources:** [cluster-spec.md#L746](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L746), [cluster_legacy.c#L1935-L1961](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L1935-L1961)

#### S11 · `mutate` peer3 · replica A1이 선거에서 이겨 master가 된다
- **Subtitle:** 잠깐 기다린 뒤 epoch를 올리고 표를 요청한다. master 과반의 표를 얻으면 A의 slot을 넘겨받는다.
- **Prose:**
  > A1은 `500 ms + 0~500 ms + rank × 1000 ms`를 기다립니다. offset이 가장 앞선 replica가 rank 0이라 먼저 나섭니다.
  > epoch를 올리고 master들에게 표를 요청합니다. 과반을 얻으면 A의 slot을 자기 것으로 알립니다. 더 높은 epoch의 주장이 이깁니다.
- **Facts:**
  - Masters vote once per epoch; majority of masters required
  - Higher `configEpoch` wins slot ownership ("last failover wins"); a returning A becomes A1's replica
- **Event log:** `peer3 → peer3 · Failover · delay 742 ms (E.G.), epoch 7, votes 2/2 → master · —`
- **State (peer3: replica A1):**
  - before: `role` = replica of A; `epoch` = 6; `votes` = —
  - after: `role` = master, slots 0–5460 (E.G.); `epoch` = 7; `votes` = 2 of 3 masters
- **Sources:** [cluster-spec.md#L840-L849](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L840-L849), [cluster_legacy.c#L4483-L4498](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L4483-L4498), [cluster_legacy.c#L4189](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L4189), [cluster-spec.md#L859](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L859), [cluster-spec.md#L961-L975](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L961-L975)

#### S12 · `mutate` main · 소수 쪽 master는 쓰기를 멈춘다 (side path)
- **Subtitle:** 분할로 혼자 남은 A는 node timeout 뒤 쓰기를 거절한다. 그 전에 받은 쓰기는 잃을 수 있다.
- **Prose:**
  > 분할로 A가 소수 쪽에 남으면, 과반과 node timeout 동안 연락이 없을 때 cluster 상태를 fail로 바꾸고 요청을 거절합니다.
  > 그 전까지 A가 받은 쓰기, 그리고 복제 전에 A가 죽어 사라진 쓰기는 잃습니다.
- **Facts:**
  - Spec: "There is always a window of time when it is possible to lose writes during partitions"
  - Minority side: refuses writes after node timeout; reply `-CLUSTERDOWN The cluster is down`
- **Event log:** `client → main · RESP2 · SET x 1 → -CLUSTERDOWN The cluster is down · —`
- **State (main: node A):**
  - before: `slot 1649` = owner, MIGRATING → B; `{user:1000}.following` = moved to B; `cluster state` = ok
  - after: `slot 1649` = owner (stale); `{user:1000}.following` = moved to B; `cluster state` = fail (minority), writes refused
- **Sources:** [cluster-spec.md#L76-L98](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L76-L98), [cluster_legacy.c#L5368-L5374](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L5368-L5374), [cluster.c#L1507-L1511](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1507-L1511)

### Replay

S1 → S2 → S3 → S4 → S5, then S9 → S10 → S11: slot → B (`MOVED`) → map → A; A silent → PFAIL → FAIL → A1 master.

### Decoder records

**D12.1 · step S3 · `wire` · `MOVED` redirect (27 B).**

| Text | Field | Meaning |
|---|---|---|
| `-MOVED` | type and kind | error reply; the slot has a new owner |
| `1649` | slot | |
| `10.0.0.1:6379` | endpoint : port | owner (E.G.); update the slot map |

**D12.2 · step S7 · `wire` · `ASK` redirect (25 B).**

| Text | Field | Meaning |
|---|---|---|
| `-ASK` | type and kind | error reply; the slot is migrating |
| `1649` | slot | |
| `10.0.0.2:6379` | endpoint : port | target (E.G.); send `ASKING` and the command there once; keep the map |

Sources: [cluster.c#L1512-L1520](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1512-L1520), [cluster-spec.md#L385-L390](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L385-L390), [cluster-spec.md#L552-L555](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L552-L555).

### Self-check

1. **Q:** `{user:1000}.following`과 `user:1000`이 같은 node에 있는 이유는? **A:** hash tag `{user:1000}` 안만 hash하므로 둘 다 slot 1649.
2. **Q:** MOVED와 ASK의 차이는? **A:** MOVED는 slot 주인이 바뀐 것(map 갱신). ASK는 migration 중 일시적인 것(`ASKING` 후 그 한 명령만, map은 그대로).
3. **Q:** master 장애 판정과 승격 순서는? **A:** node timeout(15 s) → PFAIL → master 과반 보고 → FAIL 방송 → replica가 대기 후 epoch 올려 투표 요청 → 과반 표 → master.
4. **Q:** cluster에서 `+OK`를 받은 쓰기를 잃는 경우는? **A:** 복제 전에 master가 죽을 때, 분할된 소수 쪽 master가 node timeout 전까지 받은 쓰기.

---

## Cut by must-know rule

Each item was tested with "Would the owner be blamed in an incident or design review for not knowing this?" The answer was no, so the item is cut or kept as one overview line.

**Byte layouts and internal structures**
- listpack entry encoding and backlen bytes, the intset header and its INT16 → INT32 upgrade bytes, and quicklist LZF compression and node fields.
  - What engineers use instead is `OBJECT ENCODING`, `MEMORY USAGE`, and the thresholds (lesson 2).
- `redisObject` bit fields (`type:4`, `encoding:4`, `refcount`, `lru:24`), `kvobj`, and the 44-byte `embstr` limit.
- The RDB file format: magic, AUX fields, opcodes, type bytes, length encoding, and the CRC64 trailer.
  - Lesson 8 keeps the `INFO persistence` fields instead.
- The cluster bus header (`clusterMsg` offsets, `RCmb`, gossip entry layout) and message type numbers.
  - Lesson 12 keeps the bus port and the MOVED/ASK frames.
- `HELLO 3` map bytes, the RESP3 type table, and the diskless `$EOF:` framing.
  - These remain as one fact or one line each.
- The AOF manifest `startoffset`/`endoffset` fields.

**Internal constants that do not change behavior**
- `PROTO_IOBUF_LEN`, `PROTO_MBULK_BIG_ARG`, `NET_MAX_WRITES_PER_EVENT`, `IO_THREAD_MAX_PENDING_CLIENTS`, `max-new-connections-per-cycle`, `tcp-backlog`, and `lookahead`.
- `ZSKIPLIST_MAXLEVEL`/`ZSKIPLIST_P`, `dict_force_resize_ratio` (kept only as the behavior "resize waits during fork"), `HASHTABLE_MIN_FILL`, and `empty_visits`.
- `EVPOOL_SIZE`, the LRU clock width, `LFU_INIT_VAL`, and the LFU increment formula. Kept as behavior: sampled LRU, and an LFU counter that grows logarithmically and decays.
- `active-expire-effort` scaling, fast-cycle gating, `maxmemory-eviction-tenacity`, and `LAZYFREE_THRESHOLD` (kept as "small values are freed on the spot").
- Sentinel internals: hello message field order, failover state constants, TILT mode, and the INFO period during failover.
- Cluster internals: the election auth timeout, the gossip entry count, and the manual-failover timeout.

**Version history**
- When ziplist became listpack, when MP-AOF arrived, and when effects replication became the default.
- Old RDB version numbers, the rename of `acceptTcpHandler`, and the 8.0 I/O-thread internals (client pinning, per-thread event loops). Lesson 1 keeps one overview line on the 8.0 change.

**Niche or brand-new features (one overview line at most)**
- 8.10 compact hashes (`template-listpack`, `HIMPORT`) and the 8.10 `BACKUP` family.
- 8.6 LRM eviction policies and 8.6 `HOTKEYS`.
- 8.4 `DELEX` and `SET IFEQ/IFNE/IFDEQ/IFDNE`, and 8.4 atomic slot migration (`CLUSTER MIGRATION`).
- 8.x rdb-channel replication. One overview line in lesson 10, because it changes where full-sync buffering happens at the pinned version.
- `INCREX` (8.8), `FCALL_RO` flags, `WAITAOF`, hash field expiration (`HEXPIRE`, `listpackex`), and `aof-timestamp-enabled`.
- Redlock details beyond one fact.

**Removed from the first plan per review**
- The reason for 16384 slots (only the 2048-byte slot bitmap was verified).
- TTL jitter as a stampede fix (no official source).
- All "version X changed Y" claims without a doc that states the version.
- Rejoin-delay constants of a minority master.

## Open questions

1. **Docs pinning.** `redis/docs` is pinned to a commit, not a release tag. This differs from decision 0004. The engine session will record a decision.
2. **Lessons without a decoder.** `encodings` has no decoder record after the byte layouts were cut. Is a lesson without a decoder acceptable, or should it show `MEMORY USAGE` / `OBJECT ENCODING` replies as a record?
3. **State panels added to slots.** Some lessons need a panel on a slot that is otherwise a pure actor: `client` in `sentinel` and `cluster`, and `main` in `expire`. Confirm the redesigned schema allows panels on any slot.
4. **Side-path steps.** Steps marked "(side path)" are failure branches: WATCH abort, `-MISCONF`, slow-disk AOF, failover lock loss, old master rejoin, cluster minority. The design asks for them to be drawn weaker. Confirm how the schema marks them.
5. **Replay format.** Each lesson lists its replay as step ids. Confirm whether the engine wants step ids or a separate hop list.

## Docs that disagree with the code (use the code)

- **Active expire numbers:** `latency.md` still describes "repeat if more than 25% expired". In code, 10% is the repeat threshold and 25% is the CPU-time cap. `redis.conf` also calls the 25% "memory".
- **LFU increment:** `redis.conf` gives `1/(old_value*lfu_log_factor+1)`; the code subtracts the initial value 5 first. This only matters if the formula is ever shown; it was cut.
- **`HELLO` reply:** `protocol-spec.md` says `proto` is "the highest supported version"; the code returns the connection's current version.
- **Diskless sync:** `replication.md` says diskless sync "can be enabled"; it is the default at 8.10.3. The page also does not describe the rdb channel.
- **`NOSCRIPT` error text:** the docs show `NOSCRIPT No matching script`; the code sends `NOSCRIPT No matching script. Please use EVAL.`
- **Sentinel docs:**
  - The docs list some events without the `+` prefix and omit `+promoted-slave`; the code names them with `+`.
  - The docs call the setting `is-master-down-after-milliseconds`; the real name is `down-after-milliseconds`.
- **Latency event name:** `latency-monitor.md` lists `eviction-del`; the code records `evict-del`.
- **Slowlog argument limit:** `slowlog-get.md` calls it `slowlog-max-argc`; the config is `slowlog-entry-max-argc`.

## Facts not verified

- **Computed values were not tested on a live server.** No step depends on runtime-only output, but these should be checked once on a running 8.10.3:
  - the CRC16 slots (computed with the spec's algorithm and checked against its test vector and the `CLUSTER KEYSLOT` doc examples);
  - the RESP byte counts;
  - the 145-byte `HELLO` reply size, which was cut.
- **Default slot ranges `0–5460 / 5461–10922 / 10923–16383`.** These are labeled as an example `redis-cli --cluster create` split and were not checked in `redis-cli`.
- **The `modules` array in `HELLO`.** Whether official binary builds load modules by default was not checked. HELLO was cut to one fact.
- **Frozen time inside scripts.** It is stated only in code comments (`server.c#L262-L276`), not in the docs. Lesson 3 S3 cites the code.
- **Function replication.** It rests on the docs sentence; the propagation of `FUNCTION LOAD` was not traced in code.
