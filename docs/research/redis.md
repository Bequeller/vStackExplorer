---
last-verified: 2026-11-03
sources: [https://github.com/redis/redis/tree/8.10.3, https://github.com/redis/docs/tree/ff4f956f400e348ffd3a00b12ea163016e56f139]
---

# Redis lessons: content plan

Research only. This file is the content plan for the Redis topic. It will be turned into lesson data after the owner reviews the engine and schema redesign. It names no TypeScript types, because the schema is changing. Each step lists `move` or `mutate`, a title, a subtitle, Korean prose, facts, an event-log row, the state (for `mutate`), and sources.

## Pinned version and license

- **Pinned version: Redis Open Source 8.10.3**, released 2026-10-26 ([00-RELEASENOTES#L24-L29](https://github.com/redis/redis/blob/8.10.3/00-RELEASENOTES#L24-L29), [version.h#L1](https://github.com/redis/redis/blob/8.10.3/src/version.h#L1)). It is the newest GA tag in `redis/redis`. 8.12 exists only as release candidates (`8.12-rc1`, `8.12-rc2` tags; [8.12 release notes#L15-L19](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.12-release-notes.md#L15-L19)).
- **License:** Redis 8.0 and later are tri-licensed: RSALv2, SSPLv1, or AGPLv3, at the user's choice. Redis 7.2 and earlier stay under BSD-3-Clause ([LICENSE.txt#L1-L8](https://github.com/redis/redis/blob/8.10.3/LICENSE.txt#L1-L8), [8.0 release notes#L129-L132](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.0-release-notes.md#L129-L132)). For this site that only matters for quoting. We link to the source and paraphrase it, and copy no code.
- **redis.io could not be opened from this session** (the network policy refuses `redis.io`). Every docs fact was checked in the redis.io docs source repository, `redis/docs`, pinned to commit `ff4f956f400e348ffd3a00b12ea163016e56f139` (HEAD on 2026-11-03). That repository renders redis.io, so the text is the same. It is not tagged per Redis version (see Open questions).

### Source conventions

- Links under `https://github.com/redis/redis/blob/8.10.3/` are Redis source at the release tag. Use version label `Redis 8.10.3`.
- Links under `https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/` are the redis.io docs source. Use version label `Redis Open Source 8.10 docs (redis/docs ff4f956)`.
- Every line anchor was checked against the pinned trees on 2026-11-03: each file exists and each range is in bounds.
- `E.G.` marks a value that changes per run (a client id, a timestamp, a pid, an address).
- "unverified" marks anything not confirmed in the pinned source or docs. It must not go into a lesson as a fact.

## Lesson set

Order by interview value. One mechanism per lesson. Cache patterns are not a lesson of their own. Each pattern closes the lesson whose mechanism explains it: stampede after expiration, lock caveats after replication.

| # | id | Title (Korean) | Mechanism | Steps |
|---|---|---|---|---|
| 1 | `command-path` | 명령 한 건이 Redis를 지나가는 길 | Event loop, I/O threads, RESP, `processCommand` → `call()` → reply | 16 |
| 2 | `encodings` | 작은 자료구조는 listpack, 커지면 변신한다 | Object encodings, conversion thresholds, skiplist + dict, incremental rehash | 15 |
| 3 | `expire-evict` | 키는 언제 사라지는가: 만료와 eviction | Lazy + active expiration, maxmemory eviction (approximated LRU/LFU), cache stampede | 16 |
| 4 | `rdb` | fork 한 번으로 스냅샷: RDB와 copy-on-write | `BGSAVE`, `fork()`, COW, RDB file format | 12 |
| 5 | `aof` | 모든 쓰기를 기록한다: AOF와 multi-part rewrite | `appendfsync`, background fsync, MP-AOF manifest, rewrite | 14 |
| 6 | `replication` | replid와 offset으로 따라잡기: 복제와 PSYNC | Handshake, full sync over the rdb channel, backlog, partial resync, failover ID shift, lock caveats | 15 |
| 7 | `cluster` | 16384개 slot과 MOVED/ASK, 그리고 failover | Key → slot, redirects, resharding, cluster bus, failure detection, replica election | 15 |

### Topic-wide node kinds

The current kinds map onto Redis like this. The scene illustrations are our own isometric line art.

| Kind | Redis use |
|---|---|
| `client` | `redis-cli`, a client library, a cluster-aware client |
| `app` | The developer's service (for example a Spring app using Redis as a cache) |
| `container` | Kernel and OS pieces: socket, `epoll`, page cache, `fork()` child as a process |
| `framework` | Redis internals: main thread, I/O thread, bio thread, replication buffer, cluster bus |
| `storage` | Keyspace (`kvstore`), objects in memory, RDB/AOF files on disk, the database behind a cache |

---

## Lesson 1. `command-path`: 명령 한 건이 Redis를 지나가는 길

**Goal.** Follow one `SET user:1 alice` from the TCP accept to the `+OK` on the wire: which thread reads it, which thread runs it, and what runs between the two.

**Interview questions it answers**
- Redis는 왜 single-threaded인데 빠른가? I/O threads는 정확히 무엇을 병렬화하는가?
- 명령 하나가 원자적으로 실행되는 이유는? `KEYS *` 하나가 왜 전체 지연을 만드는가?
- RESP2와 RESP3의 차이는? pipelining이 줄이는 비용은?
- `processCommand`에서 명령이 거부되는 경우는(arity, ACL, cluster redirect, OOM)?

**Scenario.** `io-threads 4` (the default is `1`; the lesson shows 4 so the I/O-thread hand-off is visible, and step 12 says what happens with the default).

**Nodes**

| id | label | sublabel | kind | Illustration idea | First appears |
|---|---|---|---|---|---|
| `client` | redis-cli | RESP2 → RESP3 | `client` | Laptop with a terminal prompt | S2 |
| `socket` | TCP :6379 | `epoll` | `container` | Socket plug with a fan of fd lines | S1 |
| `main` | Main thread | `aeMain` / `call()` | `framework` | Single gear with a circular arrow (the loop) | S1 |
| `io1` | I/O thread #1 | own `aeEventLoop` | `framework` | Smaller gear beside a conveyor belt | S3 |
| `keyspace` | db0 keyspace | `kvstore` → `dict` | `storage` | Isometric drawer cabinet with labeled drawers | S9 |

**Layer selector:** `Network` (TCP, RESP bytes) · `Event loop` (ae, threads) · `Command` (`processCommand`, `call`) · `Data` (keyspace).

### Steps

#### S1 · `mutate` main · 이벤트 루프가 기다린다
- **Subtitle:** `aeMain`은 beforeSleep → `epoll_wait` → afterSleep → 이벤트 처리 순서로 계속 돈다.
- **Prose:**
  > Redis의 main thread는 `aeMain()` 안에서 `aeProcessEvents()`를 끝없이 반복합니다.
  > 한 바퀴는 `beforeSleep` → `aeApiPoll`(Linux에서는 `epoll`) → `afterSleep` → file events → time events 순서입니다.
  > `serverCron` 같은 timer는 time event로 돌고, 기본 `hz 10`이면 100 ms마다 한 번 실행됩니다.
  > 멀티플렉서는 빌드할 때 evport > epoll > kqueue > select 순으로 고릅니다.
- **Facts:**
  - `hz` default: `10` (range 1–500)
  - `dynamic-hz` default: `yes` (raises hz while clients/hz > 200)
  - Linux multiplexer: `epoll` (`HAVE_EPOLL`)
- **Event log:** `main → main · Event loop · aeProcessEvents: beforeSleep → epoll_wait → afterSleep · next timer 100 ms (hz 10)`
- **State (main: loop phase):**
  - before: `phase = —`
  - after: `phase = epoll_wait (sleeping)`, `timer serverCron = every 100 ms`
- **Sources:** [ae.c#L382-L412](https://github.com/redis/redis/blob/8.10.3/src/ae.c#L382-L412), [ae.c#L497-L504](https://github.com/redis/redis/blob/8.10.3/src/ae.c#L497-L504), [ae.c#L30-L44](https://github.com/redis/redis/blob/8.10.3/src/ae.c#L30-L44), [config.h#L84-L86](https://github.com/redis/redis/blob/8.10.3/src/config.h#L84-L86), [server.h#L119-L122](https://github.com/redis/redis/blob/8.10.3/src/server.h#L119-L122), [server.c#L1575-L1585](https://github.com/redis/redis/blob/8.10.3/src/server.c#L1575-L1585), [redis.conf#L2521-L2529](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2521-L2529)

#### S2 · `move` client → socket · TCP 연결 수락
- **Subtitle:** listening socket이 readable이 되면 `connSocketAcceptHandler`가 연결을 받는다.
- **Prose:**
  > listening socket은 `AE_READABLE` 이벤트로 main loop에 등록되어 있습니다.
  > 연결이 오면 `connSocketAcceptHandler`가 한 번에 최대 `max-new-connections-per-cycle`(기본 10)개까지 accept합니다.
  > `maxclients`(기본 10000)를 넘으면 `-ERR max number of clients reached`로 거절합니다.
  > 예전 글에 나오는 `acceptTcpHandler`라는 이름은 8.10.3 소스에 없습니다.
- **Token:** `request` · `TCP connect :6379`
- **Facts:**
  - `tcp-backlog` default: `511` (the kernel truncates it to `somaxconn`)
  - `max-new-connections-per-cycle` default: `10`
  - `maxclients` default: `10000`
- **Event log:** `client → socket · Network · TCP accept, fd=12 (E.G.) · —`
- **Sources:** [server.c#L2835-L2839](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2835-L2839), [socket.c#L301-L320](https://github.com/redis/redis/blob/8.10.3/src/socket.c#L301-L320), [config.c#L3556](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3556), [networking.c#L1686-L1704](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L1686-L1704), [config.c#L3553](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3553), [redis.conf#L141-L148](https://github.com/redis/redis/blob/8.10.3/redis.conf#L141-L148)

#### S3 · `mutate` main · client를 만들고 I/O thread에 붙인다
- **Subtitle:** `createClient()` 후 가장 한가한 I/O thread에 client를 배정한다.
- **Prose:**
  > `createClient()`는 `TCP_NODELAY`를 켜고, read handler로 `readQueryFromClient`를 달고, 16 KB reply buffer를 잡습니다.
  > 새 연결은 항상 RESP2(`c->resp = 2`)로 시작합니다.
  > `io-threads`가 1보다 크면 client를 client 수가 가장 적은 I/O thread에 붙입니다. 이후 이 client의 read와 write는 그 thread의 event loop가 맡습니다.
- **Facts:**
  - `io-threads` default: `1`, max `128`, immutable; thread 0 is the main thread, so `io-threads 4` starts 3 I/O threads
  - Assignment rule: the I/O thread with the fewest clients
  - New client protocol: RESP2; static reply buffer `PROTO_REPLY_CHUNK_BYTES` = 16 KB
- **Event log:** `main → io1 · Event loop · assignClientToIOThread, client id=7 (E.G.) → thread 1 · —`
- **State (main: I/O thread client counts):**
  - before: `t1 = 0`, `t2 = 0`, `t3 = 0`
  - after: `t1 = 1` (client 7), `t2 = 0`, `t3 = 0`
- **Sources:** [networking.c#L122-L148](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L122-L148), [networking.c#L1662-L1663](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L1662-L1663), [config.c#L3507](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3507), [iothread.c#L332-L334](https://github.com/redis/redis/blob/8.10.3/src/iothread.c#L332-L334), [iothread.c#L1003-L1004](https://github.com/redis/redis/blob/8.10.3/src/iothread.c#L1003-L1004), [server.h#L191](https://github.com/redis/redis/blob/8.10.3/src/server.h#L191)

#### S4 · `move` client → io1 · RESP 요청 36바이트
- **Subtitle:** 명령은 bulk string의 array로 보낸다: `*3 $3 SET $6 user:1 $5 alice`.
- **Prose:**
  > client는 명령을 bulk string의 array로 보냅니다. 첫 바이트 `*`가 array, `$`가 bulk string 길이입니다.
  > `SET user:1 alice`는 CRLF 포함 36바이트입니다.
  > 첫 바이트가 `*`가 아니면 Redis는 공백으로 나뉜 inline command로 해석합니다. telnet으로도 명령을 보낼 수 있는 이유입니다.
- **Token:** `request` · `SET user:1 alice`
- **Facts:**
  - Request shape: array of bulk strings
  - First byte `*` → `PROTO_REQ_MULTIBULK`; anything else → `PROTO_REQ_INLINE`
  - Size: 36 bytes (decoder D1.1)
- **Event log:** `client → io1 · RESP2 · *3 SET user:1 alice · 36 B`
- **Record:** D1.1
- **Sources:** [protocol-spec.md#L94](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L94), [protocol-spec.md#L124-L139](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L124-L139), [protocol-spec.md#L742-L750](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L742-L750), [protocol-spec.md#L776](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L776), [networking.c#L3739-L3745](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L3739-L3745)

#### S5 · `mutate` io1 · query buffer에 읽어 들인다
- **Subtitle:** `readQueryFromClient`가 최대 16 KB씩 읽어 `querybuf`에 붙인다.
- **Prose:**
  > I/O thread #1이 `readQueryFromClient()`로 socket을 읽습니다. 한 번에 `PROTO_IOBUF_LEN`(16 KB)을 읽습니다.
  > 32 KB 이상인 큰 인자는 복사를 피하려고 별도 buffer로 받습니다.
  > query buffer가 `client-query-buffer-limit`(기본 1 GB, 인증 전 client는 1 MB)를 넘으면 client를 끊습니다.
- **Facts:**
  - `PROTO_IOBUF_LEN`: 16 KB
  - `PROTO_MBULK_BIG_ARG`: 32 KB
  - `client-query-buffer-limit`: 1 GB (1 MB before AUTH)
- **Event log:** `io1 → io1 · Network · read() 36 B into querybuf · 36 B`
- **State (io1: client 7 query buffer):**
  - before: `querybuf = ""`, `qb_pos = 0`
  - after: `querybuf = "*3\r\n$3\r\nSET…alice\r\n"` (36 B), `qb_pos = 0`
- **Sources:** [networking.c#L3918-L3927](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L3918-L3927), [server.h#L190-L193](https://github.com/redis/redis/blob/8.10.3/src/server.h#L190-L193), [config.c#L3610](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3610), [networking.c#L4029-L4038](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L4029-L4038)

#### S6 · `mutate` io1 · 파싱은 I/O thread, 실행은 아니다
- **Subtitle:** `processMultibulkBuffer`가 `argv`를 만들고, client에 "실행 대기" 표시만 한다.
- **Prose:**
  > I/O thread는 `processMultibulkBuffer()`로 `argv = [SET, user:1, alice]`를 만듭니다. protocol parsing까지 I/O thread가 합니다.
  > 하지만 명령 실행은 하지 않습니다. `CLIENT_IO_PENDING_COMMAND` flag를 붙이고 main thread 대기열에 넣을 뿐입니다.
  > 8.x의 `lookahead`(기본 16)는 pipeline에 쌓인 명령을 최대 16개까지 미리 parse하고 key를 prefetch합니다.
- **Facts:**
  - Parsing runs on the I/O thread; commands never execute there
  - `lookahead` default: `16` (1 for unauthenticated clients)
  - `io-threads-do-reads`: deprecated, accepted and ignored
- **Event log:** `io1 → io1 · Command · parsed argv[3], flag CLIENT_IO_PENDING_COMMAND · —`
- **State (io1: client 7):**
  - before: `argc = 0`, `argv = []`, `io_flags = —`
  - after: `argc = 3`, `argv = [SET, user:1, alice]`, `io_flags = PENDING_COMMAND`
- **Sources:** [networking.c#L3278](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L3278), [networking.c#L3843-L3847](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L3843-L3847), [server.h#L212](https://github.com/redis/redis/blob/8.10.3/src/server.h#L212), [redis.conf#L2486-L2487](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2486-L2487), [redis.conf#L1414-L1416](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1414-L1416), [config.c#L502](https://github.com/redis/redis/blob/8.10.3/src/config.c#L502)

#### S7 · `move` io1 → main · main thread로 넘긴다
- **Subtitle:** event notifier로 main thread를 깨우고, client를 묶음으로 넘긴다.
- **Prose:**
  > I/O thread와 main thread는 event notifier로 서로를 깨웁니다.
  > client는 최대 16개씩 묶어서 넘깁니다. main thread는 넘겨받은 client마다 `processPendingCommandAndInputBuffer()`를 부릅니다.
  > 모든 명령이 한 thread에서 순서대로 실행되므로 명령 하나는 다른 명령과 섞이지 않습니다.
- **Token:** `call` · `client 7: SET pending`
- **Facts:**
  - Hand-off batch: `IO_THREAD_MAX_PENDING_CLIENTS` = 16
  - Each I/O thread runs its own `aeEventLoop`
  - Only the main thread frees clients
- **Event log:** `io1 → main · Event loop · enqueuePendingClientsToMainThread, 1 client · —`
- **Sources:** [iothread.c#L973-L987](https://github.com/redis/redis/blob/8.10.3/src/iothread.c#L973-L987), [server.h#L230](https://github.com/redis/redis/blob/8.10.3/src/server.h#L230), [iothread.c#L663-L673](https://github.com/redis/redis/blob/8.10.3/src/iothread.c#L663-L673), [iothread.c#L595-L596](https://github.com/redis/redis/blob/8.10.3/src/iothread.c#L595-L596)

#### S8 · `mutate` main · `processCommand`의 관문들
- **Subtitle:** 명령 조회 → arity → ACL → cluster redirect → OOM → MULTI 여부를 차례로 검사한다.
- **Prose:**
  > `processCommand()`는 `lookupCommand()`로 명령을 찾고 arity를 확인합니다. `SET`의 arity는 `-3`, 즉 인자가 3개 이상입니다.
  > 다음은 ACL(`-NOPERM`), cluster 모드의 slot 검사(`-MOVED`/`-ASK`), 메모리 검사입니다.
  > `maxmemory`가 설정되어 있으면 여기서 `performEvictions()`를 부르고, 실패하면 `DENYOOM` 명령(`SET` 포함)만 `-OOM`으로 거절합니다.
  > `MULTI` 안이면 실행하지 않고 `+QUEUED`로 답합니다. 아니면 `call()`로 갑니다.
- **Facts:**
  - `SET` arity: `-3`; flags include `DENYOOM`
  - Arity error: `wrong number of arguments for 'set' command`
  - OOM check runs only when `maxmemory` ≠ 0 (default 0)
- **Event log:** `main → main · Command · processCommand: lookup ✓ arity ✓ ACL ✓ OOM — · —`
- **State (main: checks for client 7):**
  - before: `lookup = 대기`, `arity = 대기`, `ACL = 대기`, `cluster = 대기`, `OOM = 대기`, `MULTI = 대기`
  - after: `lookup = SET`, `arity = 3 ≥ 3`, `ACL = 통과`, `cluster = standalone, 건너뜀`, `OOM = maxmemory 0, 건너뜀`, `MULTI = 아님 → call()`
- **Sources:** [server.c#L4506-L4535](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4506-L4535), [server.c#L4380](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4380), [server.c#L4590-L4596](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4590-L4596), [server.c#L4603-L4622](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4603-L4622), [server.c#L4655-L4671](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4655-L4671), [server.c#L4831-L4844](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4831-L4844), [set.json#L7](https://github.com/redis/redis/blob/8.10.3/src/commands/set.json#L7), [set.json#L32-L34](https://github.com/redis/redis/blob/8.10.3/src/commands/set.json#L32-L34)

#### S9 · `mutate` keyspace · `setCommand`가 키를 쓴다
- **Subtitle:** `call()`이 `c->cmd->proc(c)`를 부르고, `user:1`이 db0에 들어간다.
- **Prose:**
  > `call()`은 `c->cmd->proc(c)`, 여기서는 `setCommand`를 부릅니다.
  > 키는 db0의 `kvstore`(standalone에서는 dict 1개)에 들어가고, 변경 수 `server.dirty`가 1 늘어납니다.
  > Redis는 한 순간에 요청 하나만 처리하므로, 이 사이에 다른 client의 명령은 끼어들 수 없습니다.
- **Facts:**
  - Keyspace: `kvstore` of dicts (1 dict standalone, 16384 in cluster mode)
  - `dirty` counts changes; it drives propagation (S10) and RDB save points (lesson 4)
- **Event log:** `main → keyspace · Data · dbAdd user:1 · 5 B value`
- **State (keyspace: db0):**
  - before: `(empty)`
  - after: `user:1 → "alice"`
- **Sources:** [server.c#L4046](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4046), [kvstore.c#L28-L44](https://github.com/redis/redis/blob/8.10.3/src/kvstore.c#L28-L44), [server.h#L1226-L1228](https://github.com/redis/redis/blob/8.10.3/src/server.h#L1226-L1228), [latency.md#L174-L177](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/latency.md#L174-L177)

#### S10 · `mutate` main · 실행 뒤 처리: slowlog, 통계, 전파
- **Subtitle:** 걸린 시간을 기록하고, 데이터가 바뀌었으면 AOF와 replica로 전파를 예약한다.
- **Prose:**
  > `call()`은 실행 시간을 재서 `slowlog-log-slower-than`(기본 10000 µs)을 넘으면 slowlog에 남깁니다.
  > `commandstats`의 호출 수와 누적 시간도 올립니다.
  > `dirty`가 늘었으면 `PROPAGATE_AOF|PROPAGATE_REPL`로 `alsoPropagate()`합니다. 실행 단위가 끝날 때 `propagatePendingCommands()`가 내보내고, 여러 개면 `MULTI`/`EXEC`로 감쌉니다.
- **Facts:**
  - `slowlog-log-slower-than`: 10000 µs; `slowlog-max-len`: 128
  - Propagate only when the command changed data (`dirty`)
  - Several propagated ops in one unit are wrapped in `MULTI`/`EXEC`
- **Event log:** `main → main · Command · call() done, cmdstat_set calls+1, propagate SET · 12 µs (E.G.)`
- **State (main: stats and propagation queue):**
  - before: `cmdstat_set.calls = 0`, `also_propagate = []`
  - after: `cmdstat_set.calls = 1`, `also_propagate = [SET user:1 alice]`
- **Sources:** [server.c#L4112-L4131](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4112-L4131), [server.c#L4174-L4196](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4174-L4196), [server.c#L3851-L3876](https://github.com/redis/redis/blob/8.10.3/src/server.c#L3851-L3876), [server.c#L3915](https://github.com/redis/redis/blob/8.10.3/src/server.c#L3915), [config.c#L3568](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3568), [config.c#L3579](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3579)

#### S11 · `mutate` main · 응답은 먼저 buffer에 쌓는다
- **Subtitle:** `addReply(shared.ok)`는 소켓에 쓰지 않고 client buffer에 넣고 대기열에 올린다.
- **Prose:**
  > `setCommand`는 미리 만들어 둔 `shared.ok`(`+OK\r\n`)를 `addReply()`합니다.
  > 응답은 16 KB 고정 buffer에 먼저 들어가고, 넘치면 reply list로 갑니다.
  > 바로 write handler를 달지 않고 `clients_pending_write`에 올립니다. 루프로 돌아가기 전에 한 번에 쓰면 system call을 아낄 수 있기 때문입니다.
- **Facts:**
  - `shared.ok` = `+OK\r\n`
  - Reply goes to the static buffer first, then to the `c->reply` list
  - The write handler is installed only if one write cannot send everything
- **Event log:** `main → main · Command · addReply +OK → clients_pending_write · 5 B`
- **State (main: client 7 output):**
  - before: `buf = ""`, `pending_write = no`
  - after: `buf = "+OK\r\n"` (5 B), `pending_write = yes`
- **Sources:** [server.c#L2208](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2208), [networking.c#L546-L548](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L546-L548), [networking.c#L284-L310](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L284-L310)

#### S12 · `move` main → io1 · beforeSleep에서 쓰기를 넘긴다
- **Subtitle:** AOF flush 다음에 `handleClientsWithPendingWrites`가 client를 I/O thread로 돌려보낸다.
- **Prose:**
  > main thread가 다시 잠들기 전 `beforeSleep()`에서 먼저 AOF buffer를 flush합니다(`appendfsync always`일 때 응답보다 먼저 디스크에 가야 하므로).
  > 그다음 `handleClientsWithPendingWrites()`가 응답을 처리합니다.
  > `io-threads`가 1(기본)이면 main thread가 `writeToClient()`로 직접 씁니다. 1보다 크면 client를 원래 I/O thread로 돌려보내 거기서 씁니다.
- **Token:** `call` · `client 7: reply ready`
- **Facts:**
  - `beforeSleep` order: `flushAppendOnlyFile` → `handleClientsWithPendingWrites` → `sendPendingClientsToIOThreads`
  - Default `io-threads 1`: the main thread writes the reply itself
- **Event log:** `main → io1 · Event loop · sendPendingClientsToIOThreads, 1 client · —`
- **Sources:** [server.c#L2053-L2111](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2053-L2111), [networking.c#L2958-L2997](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L2958-L2997), [iothread.c#L697-L703](https://github.com/redis/redis/blob/8.10.3/src/iothread.c#L697-L703)

#### S13 · `move` io1 → client · `+OK` 5바이트
- **Subtitle:** I/O thread가 응답을 쓰고, 남은 데이터가 있을 때만 write handler를 단다.
- **Prose:**
  > I/O thread #1이 `+OK\r\n` 5바이트를 socket에 씁니다.
  > 한 이벤트에서 일반 client에게 쓰는 양은 `NET_MAX_WRITES_PER_EVENT`(64 KB)로 제한합니다. 큰 응답 하나가 루프를 독점하지 못하게 하려는 것입니다.
  > 다 못 쓴 응답은 output buffer에 남고, `client-output-buffer-limit`을 넘으면 client를 끊습니다.
- **Token:** `response` · `+OK`
- **Facts:**
  - Reply size: 5 bytes (decoder D1.2)
  - `NET_MAX_WRITES_PER_EVENT`: 64 KB (normal clients)
  - `client-output-buffer-limit` defaults: normal `0 0 0`, replica `256mb 64mb 60`, pubsub `32mb 8mb 60`
- **Event log:** `io1 → client · RESP2 · +OK · 5 B`
- **Record:** D1.2
- **Sources:** [protocol-spec.md#L152-L154](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L152-L154), [iothread.c#L831-L836](https://github.com/redis/redis/blob/8.10.3/src/iothread.c#L831-L836), [server.h#L125](https://github.com/redis/redis/blob/8.10.3/src/server.h#L125), [networking.c#L2874-L2890](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L2874-L2890), [redis.conf#L2474-L2476](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2474-L2476)

#### S14 · `move` client → io1 · `HELLO 3`로 RESP3 전환
- **Subtitle:** 연결은 RESP2로 시작하고, `HELLO 3`을 보내야 RESP3가 된다.
- **Prose:**
  > 모든 연결은 RESP2로 시작합니다. client가 `HELLO 3`을 보내면 이 연결의 `c->resp`가 3으로 바뀝니다.
  > RESP3는 map(`%`), set(`~`), null(`_`), double(`,`), boolean(`#`), push(`>`) 같은 타입을 더합니다.
  > push 데이터(예: client-side caching invalidation)는 응답 사이에 올 수 있지만, 응답 중간에 끼지는 않습니다.
- **Token:** `request` · `HELLO 3`
- **Facts:**
  - Default protocol per connection: RESP2
  - `HELLO` arity: `-1`
  - Request size: 22 bytes (`*2\r\n$5\r\nHELLO\r\n$1\r\n3\r\n`)
- **Event log:** `client → io1 · RESP2 · HELLO 3 · 22 B`
- **Sources:** [protocol-spec.md#L695](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L695), [protocol-spec.md#L124-L139](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L124-L139), [protocol-spec.md#L612-L621](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L612-L621), [hello.json#L7](https://github.com/redis/redis/blob/8.10.3/src/commands/hello.json#L7), [networking.c#L5011-L5012](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L5011-L5012)

#### S15 · `move` io1 → client · RESP3 map으로 서버 정보를 받는다
- **Subtitle:** `HELLO` 응답은 7개 항목짜리 map: server, version, proto, id, mode, role, modules.
- **Prose:**
  > `HELLO`는 연결 정보를 RESP3 map(`%7`)으로 돌려줍니다. sentinel 모드에서는 `role`이 빠져 6개입니다.
  > `proto`는 이 연결의 현재 protocol 버전입니다(docs는 "highest supported"라고 쓰지만 코드는 `c->resp`를 넣습니다).
  > 이후 이 연결에서 없는 키를 `GET`하면 RESP2의 `$-1\r\n` 대신 `_\r\n`이 옵니다.
- **Token:** `response` · `%7 server redis …`
- **Facts:**
  - Map entries: 7 (6 in sentinel mode)
  - Null: RESP2 `$-1\r\n` (5 B) vs RESP3 `_\r\n` (3 B)
  - Reply size: 145 bytes with `id 7` and no modules (E.G.; decoder D1.3)
- **Event log:** `io1 → client · RESP3 · %7 server=redis version=8.10.3 proto=3 · 145 B (E.G.)`
- **Record:** D1.3, D1.4
- **Sources:** [networking.c#L5012-L5039](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L5012-L5039), [protocol-spec.md#L717-L728](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L717-L728), [protocol-spec.md#L252](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L252), [protocol-spec.md#L367](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L367), [server.c#L2261-L2262](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2261-L2262)

#### S16 · `mutate` main · 느린 명령 하나가 모두를 기다리게 한다
- **Subtitle:** 실행은 한 thread이므로 `KEYS *` 같은 O(N) 명령 동안 다른 client는 모두 멈춘다.
- **Prose:**
  > I/O threads는 읽기, 쓰기, 파싱만 나눠 가집니다. 명령 실행은 여전히 main thread 하나입니다.
  > 그래서 큰 `KEYS *`, `SORT`, `LREM`, `SUNION`이 도는 동안 다른 client의 명령은 모두 기다립니다.
  > 같은 이유로 `MULTI`/`EXEC`, Lua script, function은 실행 중 다른 명령이 끼어들지 않습니다(원자성). 대신 길면 서버 전체가 멈춥니다.
- **Facts:**
  - "Redis can serve a single request in every given moment"
  - `KEYS` in production is called "a VERY common source of latency"
  - Scripts block all server activity while they run
- **Event log:** `main → main · Command · KEYS * on 1M keys (E.G.) blocks loop · 300 ms (E.G.)`
- **State (main: waiting clients):**
  - before: `running = —`, `waiting = []`
  - after: `running = client 9: KEYS *`, `waiting = [client 7: GET user:1, client 8: INCR hits]`
- **Sources:** [latency.md#L174-L177](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/latency.md#L174-L177), [latency.md#L191-L197](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/latency.md#L191-L197), [latency.md#L214-L216](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/latency.md#L214-L216), [transactions.md#L28-L32](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/using-commands/transactions.md#L28-L32), [eval-intro.md#L28-L29](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/programmability/eval-intro.md#L28-L29)

### Decoder records

**D1.1 RESP2 request `SET user:1 alice` (36 B).** Layers: array header · bulk 1 · bulk 2 · bulk 3.

| Offset | Bytes (text) | Field | Meaning |
|---|---|---|---|
| 0–3 | `*3\r\n` | array header | `*` = array, 3 elements |
| 4–7 | `$3\r\n` | bulk length | `$` = bulk string, 3 bytes |
| 8–12 | `SET\r\n` | argv[0] | command name (case-insensitive) |
| 13–16 | `$6\r\n` | bulk length | 6 bytes |
| 17–24 | `user:1\r\n` | argv[1] | key |
| 25–28 | `$5\r\n` | bulk length | 5 bytes |
| 29–35 | `alice\r\n` | argv[2] | value |

Sources: [protocol-spec.md#L94](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L94), [protocol-spec.md#L221-L225](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L221-L225), [protocol-spec.md#L742-L750](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L742-L750).

**D1.2 RESP2 reply `+OK` (5 B).**

| Offset | Bytes | Field | Meaning |
|---|---|---|---|
| 0 | `2B` (`+`) | type | simple string |
| 1–2 | `4F 4B` (`OK`) | payload | no CR or LF allowed inside |
| 3–4 | `0D 0A` | terminator | CRLF |

Sources: [protocol-spec.md#L152-L154](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L152-L154), [server.c#L2208](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2208).

**D1.3 RESP3 `HELLO 3` reply (145 B, E.G.).** Layers: map header · 7 key/value pairs.

| Bytes (text) | Field | Value | E.G.? |
|---|---|---|---|
| `%7\r\n` | map header | 7 pairs (6 in sentinel mode) | |
| `$6\r\nserver\r\n` `$5\r\nredis\r\n` | server | `redis` | |
| `$7\r\nversion\r\n` `$6\r\n8.10.3\r\n` | version | `8.10.3` | |
| `$5\r\nproto\r\n` `:3\r\n` | proto | `3` (integer) | |
| `$2\r\nid\r\n` `:7\r\n` | id | client id `7` | E.G. |
| `$4\r\nmode\r\n` `$10\r\nstandalone\r\n` | mode | `standalone` / `cluster` / `sentinel` | |
| `$4\r\nrole\r\n` `$6\r\nmaster\r\n` | role | `master` or `replica` | |
| `$7\r\nmodules\r\n` `*0\r\n` | modules | array of loaded modules, empty here | E.G. |

Sources: [networking.c#L5012-L5039](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L5012-L5039), [protocol-spec.md#L502](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L502), [protocol-spec.md#L717-L728](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L717-L728).

**D1.4 Type first bytes (reference card for the decoder legend).**

| Byte | Type | Protocol |
|---|---|---|
| `+` | simple string | RESP2 |
| `-` | simple error | RESP2 |
| `:` | integer | RESP2 |
| `$` | bulk string (`$-1\r\n` = null in RESP2) | RESP2 |
| `*` | array (`*-1\r\n` = null array in RESP2) | RESP2 |
| `_` | null | RESP3 |
| `#` | boolean | RESP3 |
| `,` | double | RESP3 |
| `(` | big number | RESP3 |
| `!` | bulk error | RESP3 |
| `=` | verbatim string | RESP3 |
| `%` | map | RESP3 |
| `\|` | attribute | RESP3 |
| `~` | set | RESP3 |
| `>` | push | RESP3 |

Sources: [protocol-spec.md#L124-L139](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L124-L139), null array at [protocol-spec.md#L330-L335](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/protocol-spec.md#L330-L335).

### Self-check

1. **Q:** `io-threads 4`이면 명령을 실행하는 thread는 몇 개인가? **A:** 1개(main thread). I/O thread 3개는 socket read/write와 RESP 파싱만 하고, 명령 실행은 main thread에 넘긴다.
2. **Q:** `SET user:1 alice`의 RESP2 요청은 몇 바이트이고 어떻게 생겼나? **A:** 36바이트. `*3\r\n$3\r\nSET\r\n$6\r\nuser:1\r\n$5\r\nalice\r\n`.
3. **Q:** `processCommand`가 `call()` 전에 하는 검사 네 가지는? **A:** 명령 조회와 arity, ACL, cluster slot 검사(MOVED/ASK), maxmemory 검사(필요하면 eviction 후 `DENYOOM` 명령 거절). 그리고 MULTI 중이면 큐에 넣는다.
4. **Q:** 응답을 바로 socket에 쓰지 않고 `clients_pending_write`에 올리는 이유는? **A:** 루프가 잠들기 전 `beforeSleep`에서 한 번에 써서 write handler 등록과 system call을 줄이기 위해서. 다 못 쓸 때만 write handler를 단다.
5. **Q:** `appendfsync always`에서 응답 전에 무엇이 끝나 있어야 하고, 코드에서 그 순서를 지키는 곳은? **A:** AOF write와 fsync. `beforeSleep`이 `flushAppendOnlyFile`을 `handleClientsWithPendingWrites`보다 먼저 부른다.
6. **Q:** RESP3에서 없는 키의 `GET` 응답은? RESP2에서는? **A:** RESP3 `_\r\n`, RESP2 `$-1\r\n`.
7. **Q:** `KEYS *`가 위험한 이유를 thread 모델로 설명하라. **A:** 명령 실행은 main thread 하나가 순서대로 하므로, O(N) 명령이 도는 동안 다른 모든 client의 명령이 대기한다.

---

## Lesson 2. `encodings`: 작은 자료구조는 listpack, 커지면 변신한다

**Goal.** Watch one hash, one set, one list, and one sorted set change their internal encoding as they cross the configured thresholds, then watch the keyspace dict grow with incremental rehash.

**Interview questions it answers**
- Redis hash에 필드 10개를 넣으면 메모리에서 어떤 구조인가? 언제 hashtable로 바뀌는가?
- sorted set은 왜 skiplist와 dict를 함께 쓰는가? `ZSCORE`와 `ZRANGE`의 복잡도는?
- ziplist는 어디 갔나? (7.0에서 listpack으로 교체, 설정 이름은 alias로 남음)
- Redis dict의 rehash는 왜 incremental이고, 그동안 조회는 어떻게 하나? fork 중에는 왜 resize를 피하나?

**Nodes**

| id | label | sublabel | kind | Illustration idea | First appears |
|---|---|---|---|---|---|
| `client` | redis-cli | | `client` | Laptop with terminal | S2 |
| `main` | Main thread | `t_hash.c` / `t_zset.c` | `framework` | Gear | S2 |
| `robj` | redisObject | type · encoding · lru | `storage` | A tag card with 4 punched fields | S1 |
| `hash` | `user:1` | hash | `storage` | Flat strip of cells (listpack) that later unfolds into a bucket rack (hashtable) | S2 |
| `set` | `tags` | set | `storage` | Row of number tiles that widen | S5 |
| `list` | `queue` | list | `storage` | Chain of small boxes (quicklist nodes) | S7 |
| `zset` | `lb` | sorted set | `storage` | Multi-level ladder (skiplist) beside a key rack (dict) | S9 |
| `dict` | db0 dict | `ht_table[0]` / `[1]` | `storage` | Two bucket racks side by side with a moving cursor | S12 |

**Layer selector:** `Object` (redisObject) · `Encoding` (listpack, intset, quicklist, skiplist) · `Dict` (hash table, rehash).

### Steps

#### S1 · `mutate` robj · 모든 값은 16바이트 redisObject로 시작한다
- **Subtitle:** type 4비트, encoding 4비트, LRU/LFU 24비트, 그리고 실제 데이터를 가리키는 `ptr`.
- **Prose:**
  > Redis의 모든 값은 `redisObject`(`robj`)입니다. `type`은 string/list/set/zset/hash 같은 논리 타입, `encoding`은 메모리 속 실제 구조입니다.
  > `lru` 24비트는 LRU 시계 또는 LFU 데이터(상위 16비트 시간, 하위 8비트 빈도)를 담습니다(lesson 3).
  > 8.x에서는 `refcount`가 23비트로 줄고 `iskvobj`, `metabits`가 생겼습니다. 키를 robj 바로 뒤에 붙여 저장하는 `kvobj` 때문입니다.
- **Facts:**
  - Fields: `type:4`, `encoding:4`, `refcount:23`, `iskvobj:1`, `metabits:8`, `lru:24`, `ptr`
  - `OBJECT ENCODING` names: `raw`, `int`, `embstr`, `listpack`, `listpackex`, `quicklist`, `intset`, `hashtable`, `skiplist`, `stream`, plus 8.10's `template-listpack`, `template-array`
  - String: integer-looking strings of ≤ 20 chars → `int`; ≤ 44 bytes → `embstr`; longer → `raw`
- **Event log:** `main → robj · Object · createObject(OBJ_HASH, OBJ_ENCODING_LISTPACK) · 16 B header`
- **State (robj: fields of `user:1`):**
  - before: `—`
  - after: `type = hash`, `encoding = listpack`, `refcount = 1`, `lru = 0x2A51F3 (E.G.)`
- **Sources:** [object.h#L92-L113](https://github.com/redis/redis/blob/8.10.3/src/object.h#L92-L113), [object.h#L24-L42](https://github.com/redis/redis/blob/8.10.3/src/object.h#L24-L42), [object.h#L75-L90](https://github.com/redis/redis/blob/8.10.3/src/object.h#L75-L90), [object.c#L1302-L1316](https://github.com/redis/redis/blob/8.10.3/src/object.c#L1302-L1316), [object.c#L332-L341](https://github.com/redis/redis/blob/8.10.3/src/object.c#L332-L341), [object.c#L960-L967](https://github.com/redis/redis/blob/8.10.3/src/object.c#L960-L967)

#### S2 · `move` client → main · `HSET user:1 name redis age 7`
- **Subtitle:** 필드가 적고 값이 짧으면 hash는 listpack 하나로 만들어진다.
- **Prose:**
  > 새 hash는 listpack으로 시작합니다. field와 value를 차례로 붙여 넣는 연속된 메모리 한 덩어리입니다.
  > 포인터가 없어 작은 hash에서는 hashtable보다 메모리를 훨씬 적게 씁니다(docs: 최대 10배, 평균 5배).
  > 필드 수가 `hash-max-listpack-entries`(512) 이하이고 모든 field/value가 `hash-max-listpack-value`(64바이트) 이하인 동안 listpack을 유지합니다.
- **Token:** `request` · `HSET user:1 name redis age 7`
- **Facts:**
  - `hash-max-listpack-entries`: 512; `hash-max-listpack-value`: 64
  - Old names `hash-max-ziplist-*` still work as aliases (7.0 rename)
  - Docs: small aggregates use "up to 10 times less memory"
- **Event log:** `client → main · RESP2 · HSET user:1 name redis age 7 · 63 B`
- **Sources:** [redis.conf#L2215-L2216](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2215-L2216), [config.c#L3593](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3593), [t_hash.c#L1925-L1928](https://github.com/redis/redis/blob/8.10.3/src/t_hash.c#L1925-L1928), [memory-optimization.md#L18-L19](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/memory-optimization.md#L18-L19), [memory-optimization.md#L36-L44](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/memory-optimization.md#L36-L44)

#### S3 · `mutate` hash · listpack 27바이트
- **Subtitle:** 6바이트 header, entry 4개, 끝 표시 `0xFF`. entry마다 끝에 자기 길이(backlen)를 붙인다.
- **Prose:**
  > listpack은 전체 바이트 수(32비트)와 원소 수(16비트) header로 시작해 `0xFF`로 끝납니다.
  > 각 entry는 encoding+data 뒤에 backlen을 붙입니다. backlen 덕분에 뒤에서 앞으로도 걸어갈 수 있습니다.
  > 문자열 `"7"`은 정수로 바뀌어 1바이트(7-bit uint)로 저장됩니다.
- **Facts:**
  - Header: 6 bytes (`uint32` total bytes + `uint16` count, little-endian)
  - End byte: `0xFF`
  - 6-bit string: first byte `10xxxxxx`; 7-bit uint: `0xxxxxxx`
  - This example: 27 bytes (decoder D2.1)
- **Event log:** `main → hash · Encoding · lpAppend ×4 · 27 B`
- **State (hash: `user:1`):**
  - before: `encoding = —`, `entries = 0`, `bytes = 0`
  - after: `encoding = listpack`, `entries = 4 (2 fields)`, `bytes = 27`
- **Record:** D2.1
- **Sources:** [listpack.c#L27-L28](https://github.com/redis/redis/blob/8.10.3/src/listpack.c#L27-L28), [listpack.c#L34-L76](https://github.com/redis/redis/blob/8.10.3/src/listpack.c#L34-L76), [listpack.c#L321-L373](https://github.com/redis/redis/blob/8.10.3/src/listpack.c#L321-L373), [listpack.c#L85-L102](https://github.com/redis/redis/blob/8.10.3/src/listpack.c#L85-L102)

#### S4 · `mutate` hash · 65바이트 값 하나에 hashtable로 바뀐다
- **Subtitle:** `HSET user:1 bio <65바이트>` — value가 64바이트를 넘는 순간 변환된다. 되돌아가지 않는다.
- **Prose:**
  > `hashTypeTryConversion()`은 새 field나 value가 `hash-max-listpack-value`보다 길거나 field 수가 512를 넘으면 hashtable로 바꿉니다.
  > 변환은 한 방향입니다. 나중에 필드를 지워 작아져도 listpack으로 돌아가지 않습니다.
  > `HEXPIRE`(7.4+)로 field에 TTL을 주면 listpack은 `listpackex`가 됩니다. 8.10의 compact hash(`template-listpack`)는 기본값 0으로 꺼져 있습니다.
- **Facts:**
  - Trigger: field count > 512, or any field/value > 64 bytes
  - HT → listpack: never (`serverPanic("Not implemented")`)
  - `hash-min-template-entries` / `hash-max-template-entries`: default 0 (compact hashes off)
- **Event log:** `main → hash · Encoding · hashTypeConvert listpack → hashtable · 65 B value`
- **State (hash: `user:1`):**
  - before: `encoding = listpack`, `fields = 2`
  - after: `encoding = hashtable`, `fields = 3`
- **Sources:** [t_hash.c#L1561-L1595](https://github.com/redis/redis/blob/8.10.3/src/t_hash.c#L1561-L1595), [t_hash.c#L1147-L1148](https://github.com/redis/redis/blob/8.10.3/src/t_hash.c#L1147-L1148), [t_hash.c#L2281-L2282](https://github.com/redis/redis/blob/8.10.3/src/t_hash.c#L2281-L2282), [redis.conf#L2235](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2235), [redis.conf#L2243](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2243), [00-RELEASENOTES#L77-L78](https://github.com/redis/redis/blob/8.10.3/00-RELEASENOTES#L77-L78)

#### S5 · `mutate` set · 정수만 있으면 intset
- **Subtitle:** `SADD tags 1 2 3` — 정렬된 정수 배열. 가장 작은 폭 INT16으로 시작한다.
- **Prose:**
  > 원소가 모두 정수이고 512개(`set-max-intset-entries`) 이하이면 set은 intset입니다.
  > intset은 header(encoding, length)와 정렬된 정수 배열이고, 찾기는 binary search입니다.
  > 새 intset은 원소당 2바이트(INT16)로 시작합니다.
- **Token:** `request` · `SADD tags 1 2 3`
- **Facts:**
  - `set-max-intset-entries`: 512
  - Header: `uint32 encoding`, `uint32 length`; values little-endian
  - Lookup: binary search, O(log N)
- **Event log:** `main → set · Encoding · intsetAdd ×3, INT16 · 14 B`
- **State (set: `tags`):**
  - before: `—`
  - after: `encoding = intset (INT16)`, `contents = [1, 2, 3]`, `bytes = 14`
- **Record:** D2.2 (before)
- **Sources:** [redis.conf#L2319](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2319), [intset.h#L35-L39](https://github.com/redis/redis/blob/8.10.3/src/intset.h#L35-L39), [intset.c#L41-L43](https://github.com/redis/redis/blob/8.10.3/src/intset.c#L41-L43), [intset.c#L60-L75](https://github.com/redis/redis/blob/8.10.3/src/intset.c#L60-L75), [intset.c#L98-L102](https://github.com/redis/redis/blob/8.10.3/src/intset.c#L98-L102), [intset.c#L123-L162](https://github.com/redis/redis/blob/8.10.3/src/intset.c#L123-L162), [t_set.c#L46-L57](https://github.com/redis/redis/blob/8.10.3/src/t_set.c#L46-L57)

#### S6 · `mutate` set · 70000이 들어오면 INT32로 upgrade, 문자열이 오면 listpack
- **Subtitle:** 폭이 넓은 정수는 배열 전체를 다시 쓰게 하고, 정수가 아닌 값은 encoding 자체를 바꾼다.
- **Prose:**
  > `SADD tags 70000`: 70000은 INT16 범위를 넘으므로 모든 원소를 4바이트로 넓힙니다. 새 값은 기존 범위 밖이라 끝(음수면 앞)에 붙습니다. 다시 좁아지지는 않습니다.
  > `SADD tags redis`: 정수가 아니므로 intset을 그만둡니다. 128개(`set-max-listpack-entries`) 이하이고 64바이트 이하면 listpack, 아니면 hashtable입니다.
- **Facts:**
  - Encodings: INT16 → INT32 → INT64 (2/4/8 bytes per element); no downgrade
  - `set-max-listpack-entries`: 128; `set-max-listpack-value`: 64 (setting added in 7.2)
  - Back to intset only for `*STORE` results with integers only
- **Event log:** `main → set · Encoding · intsetUpgradeAndAdd INT16 → INT32 · 24 B`
- **State (set: `tags`):**
  - before: `encoding = intset (INT16)`, `contents = [1, 2, 3]`, `bytes = 14`
  - after (70000): `encoding = intset (INT32)`, `contents = [1, 2, 3, 70000]`, `bytes = 24`
  - after (`redis`): `encoding = listpack`, `members = 5`
- **Record:** D2.2 (after)
- **Sources:** [intset.c#L165-L192](https://github.com/redis/redis/blob/8.10.3/src/intset.c#L165-L192), [intset.c#L216-L223](https://github.com/redis/redis/blob/8.10.3/src/intset.c#L216-L223), [intset.c#L242-L259](https://github.com/redis/redis/blob/8.10.3/src/intset.c#L242-L259), [t_set.c#L186-L229](https://github.com/redis/redis/blob/8.10.3/src/t_set.c#L186-L229), [redis.conf#L2325-L2326](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2325-L2326), [t_set.c#L1547](https://github.com/redis/redis/blob/8.10.3/src/t_set.c#L1547), [memory-optimization.md#L46-L53](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/optimization/memory-optimization.md#L46-L53)

#### S7 · `mutate` list · listpack 하나가 8 KB를 넘으면 quicklist
- **Subtitle:** `list-max-listpack-size -2`는 "node 하나당 8 KB". 넘으면 listpack들의 linked list가 된다.
- **Prose:**
  > 작은 list는 listpack 하나입니다. 크기가 `list-max-listpack-size` 한도를 넘으면 quicklist로 바뀝니다.
  > quicklist는 listpack node들을 양방향으로 이은 list입니다. node 하나의 크기는 기본 8 KB로 제한됩니다.
  > list가 줄어들면 node가 하나이고 한도의 절반 아래일 때만 다시 listpack으로 돌아갑니다. 경계에서 계속 바뀌는 것을 막기 위해서입니다.
- **Facts:**
  - `list-max-listpack-size`: `-2` = 8 KB per node (−1..−5 = 4/8/16/32/64 KB)
  - Element bigger than the limit: its own `PLAIN` node
  - quicklist → listpack: only with one node and below half the limit
- **Event log:** `main → list · Encoding · listTypeTryConversion listpack → quicklist · 8 KB`
- **State (list: `queue`):**
  - before: `encoding = listpack`, `bytes = 8190 (E.G.)`
  - after: `encoding = quicklist`, `nodes = 2`, `fill = -2`
- **Sources:** [redis.conf#L2286-L2296](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2286-L2296), [quicklist.c#L48](https://github.com/redis/redis/blob/8.10.3/src/quicklist.c#L48), [quicklist.c#L487-L538](https://github.com/redis/redis/blob/8.10.3/src/quicklist.c#L487-L538), [t_list.c#L40-L95](https://github.com/redis/redis/blob/8.10.3/src/t_list.c#L40-L95), [config.c#L3511](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3511)

#### S8 · `mutate` list · 가운데 node는 LZF로 압축할 수 있다
- **Subtitle:** `list-compress-depth`(기본 0, 끔)를 켜면 양 끝 node를 빼고 압축한다.
- **Prose:**
  > quicklist node는 `prev`, `next`, `entry`, `sz`, `count`, `encoding`(RAW/LZF), `container`(PLAIN/PACKED) 등을 가집니다.
  > `list-compress-depth 1`이면 head와 tail node 하나씩은 그대로 두고 가운데만 LZF로 압축합니다. push/pop이 양 끝에서 일어나기 때문입니다.
  > 48바이트보다 작은 node는 압축하지 않고, 8바이트 이상 줄지 않으면 압축을 버립니다.
- **Facts:**
  - `list-compress-depth`: 0 (no compression)
  - Minimum node size to try LZF: 48 bytes; must save ≥ 8 bytes
  - quicklistNode struct: 32 bytes
- **Event log:** `main → list · Encoding · __quicklistCompressNode node 2 · 8 KB → 3 KB (E.G.)`
- **State (list: nodes, `list-compress-depth 1`):**
  - before: `[RAW, RAW, RAW]`
  - after: `[RAW, LZF, RAW]`
- **Sources:** [quicklist.h#L38-L59](https://github.com/redis/redis/blob/8.10.3/src/quicklist.h#L38-L59), [quicklist.c#L78-L83](https://github.com/redis/redis/blob/8.10.3/src/quicklist.c#L78-L83), [quicklist.c#L240-L262](https://github.com/redis/redis/blob/8.10.3/src/quicklist.c#L240-L262), [redis.conf#L2298-L2312](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2298-L2312)

#### S9 · `mutate` zset · 작은 sorted set도 listpack
- **Subtitle:** `ZADD lb 100 alice 90 bob` — member와 score를 score 순서로 나란히 저장한다.
- **Prose:**
  > sorted set도 128개(`zset-max-listpack-entries`) 이하, member 64바이트 이하이면 listpack입니다.
  > member와 score를 한 쌍씩, score 순으로 붙여 둡니다. 원소가 적으면 선형 탐색도 충분히 빠릅니다.
- **Token:** `request` · `ZADD lb 100 alice 90 bob`
- **Facts:**
  - `zset-max-listpack-entries`: 128; `zset-max-listpack-value`: 64
  - Old alias: `zset-max-ziplist-*`
- **Event log:** `main → zset · Encoding · zsetTypeCreate listpack · 4 entries`
- **State (zset: `lb`):**
  - before: `—`
  - after: `encoding = listpack`, `[bob 90, alice 100]`
- **Sources:** [redis.conf#L2331-L2332](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2331-L2332), [t_zset.c#L1413-L1424](https://github.com/redis/redis/blob/8.10.3/src/t_zset.c#L1413-L1424), [config.c#L3605-L3607](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3605-L3607)

#### S10 · `mutate` zset · 129번째 member에서 skiplist + dict
- **Subtitle:** `zzlLength+1 > 128`이거나 member가 64바이트를 넘으면 변환한다. `ZREM`으로 줄어도 돌아가지 않는다.
- **Prose:**
  > `ZADD`가 129번째 원소를 넣으려 하면 `zsetConvertAndExpand()`로 skiplist encoding이 됩니다.
  > 이 encoding은 dict(member → node)와 skiplist(score 순)를 함께 가집니다.
  > listpack으로 돌아가는 것은 `ZUNIONSTORE` 같은 store 결과와 RDB load 때뿐입니다.
- **Facts:**
  - Trigger: `zzlLength(zl)+1 > zset_max_listpack_entries` or `sdslen(ele) > zset_max_listpack_value`
  - Back to listpack: store commands and RDB load only
- **Event log:** `main → zset · Encoding · zsetConvert listpack → skiplist · 129 members`
- **State (zset: `lb`):**
  - before: `encoding = listpack`, `members = 128`
  - after: `encoding = skiplist`, `members = 129`, `dict = 129 entries`
- **Sources:** [t_zset.c#L1655-L1659](https://github.com/redis/redis/blob/8.10.3/src/t_zset.c#L1655-L1659), [t_zset.c#L3148](https://github.com/redis/redis/blob/8.10.3/src/t_zset.c#L3148), [rdb.c#L3112](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L3112)

#### S11 · `mutate` zset · skiplist의 층은 확률로 정한다
- **Subtitle:** 새 node의 level은 25% 확률로 한 층씩 올라가고, 최대 32층이다.
- **Prose:**
  > `zslRandomLevel()`은 `ZSKIPLIST_P = 0.25` 확률로 level을 하나씩 올립니다. 최대 `ZSKIPLIST_MAXLEVEL = 32`입니다.
  > 각 층의 `forward` 포인터는 `span`(건너뛰는 원소 수)을 가집니다. 내려가며 span을 더하면 `ZRANK`가 나옵니다.
  > 8.x에서는 member sds를 node 뒤에 붙여 저장하고, level 0의 span 자리를 node 정보로 씁니다.
- **Facts:**
  - `ZSKIPLIST_MAXLEVEL`: 32; `ZSKIPLIST_P`: 0.25
  - Node: `score`, `backward`, `level[]{forward, span}`, embedded sds member
  - Rank = sum of spans on the search path (1-based)
- **Event log:** `main → zset · Encoding · zslInsert carol score 95, level 2 (E.G.) · —`
- **State (zset: skiplist levels, E.G.):**
  - before: `L2: bob ───────────→ dave`, `L1: bob → alice → dave`
  - after: `L2: bob → carol ───→ dave`, `L1: bob → carol → alice → dave`
- **Sources:** [server.h#L656-L657](https://github.com/redis/redis/blob/8.10.3/src/server.h#L656-L657), [t_zset.c#L254-L260](https://github.com/redis/redis/blob/8.10.3/src/t_zset.c#L254-L260), [server.h#L1791-L1819](https://github.com/redis/redis/blob/8.10.3/src/server.h#L1791-L1819), [t_zset.c#L640-L661](https://github.com/redis/redis/blob/8.10.3/src/t_zset.c#L640-L661)

#### S12 · `move` main → zset · `ZSCORE`는 dict, `ZRANGE`는 skiplist
- **Subtitle:** 두 구조를 같이 두는 이유: member로 찾기는 O(1), 순서로 훑기는 O(log N + M).
- **Prose:**
  > `ZSCORE lb alice`는 dict에서 node를 찾아 `score`를 바로 읽습니다.
  > `ZRANGE lb 0 9`나 `ZRANK`는 skiplist를 따라갑니다.
  > 같은 원소를 두 구조가 가리키지만 member 문자열은 node 하나에만 있습니다(dict는 node 포인터를 저장).
- **Token:** `call` · `ZSCORE lb alice`
- **Facts:**
  - `ZSCORE`: `dictFind` + `node->score`
  - The dict stores node pointers (`no_value`)
- **Event log:** `main → zset · Encoding · dictFind(alice) → score 100 · O(1)`
- **Sources:** [t_zset.c#L20-L26](https://github.com/redis/redis/blob/8.10.3/src/t_zset.c#L20-L26), [t_zset.c#L53-L64](https://github.com/redis/redis/blob/8.10.3/src/t_zset.c#L53-L64), [t_zset.c#L1545-L1550](https://github.com/redis/redis/blob/8.10.3/src/t_zset.c#L1545-L1550)

#### S13 · `mutate` dict · bucket 수만큼 차면 두 배로
- **Subtitle:** keyspace dict에 키 5번째가 들어올 때 `ht_table[1]`을 8칸으로 만들고 `rehashidx = 0`.
- **Prose:**
  > keyspace도 hashtable(dict)입니다. 8.x에서는 `kvstore`가 dict 배열을 관리합니다(standalone 1개, cluster 16384개).
  > 원소 수가 bucket 수와 같아지면(load factor 1) 다음 2의 거듭제곱 크기로 `ht_table[1]`을 만듭니다.
  > 한 번에 옮기지 않습니다. `rehashidx`를 0으로 두고 조금씩 옮깁니다. 수백만 키를 한 번에 옮기면 그동안 서버가 멈추기 때문입니다.
- **Facts:**
  - Initial size: 4 buckets
  - Expand at `used >= size` (1:1); with a fork child at `used >= 4 × size` (`dict_force_resize_ratio = 4`)
  - Shrink at ≤ 1/8 fill (`HASHTABLE_MIN_FILL 8`); never below 4 buckets
- **Event log:** `main → dict · Dict · _dictExpandIfNeeded 4 → 8 buckets · —`
- **State (dict: db0):**
  - before: `ht[0] = 4 buckets, used 4`, `ht[1] = —`, `rehashidx = -1`
  - after: `ht[0] = 4 buckets, used 4`, `ht[1] = 8 buckets, used 0`, `rehashidx = 0`
- **Sources:** [dict.c#L1658-L1673](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L1658-L1673), [dict.h#L162-L178](https://github.com/redis/redis/blob/8.10.3/src/dict.h#L162-L178), [dict.h#L212-L213](https://github.com/redis/redis/blob/8.10.3/src/dict.h#L212-L213), [dict.c#L46](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L46), [dict.h#L53](https://github.com/redis/redis/blob/8.10.3/src/dict.h#L53), [dict.c#L1692-L1706](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L1692-L1706), [server.c#L3094-L3102](https://github.com/redis/redis/blob/8.10.3/src/server.c#L3094-L3102)

#### S14 · `mutate` dict · 명령 하나마다 bucket 하나씩 옮긴다
- **Subtitle:** rehash 중에는 조회는 두 table을 보고, 삽입은 새 table에만 한다.
- **Prose:**
  > rehash 중 dict를 건드리는 연산마다 `_dictRehashStep()`이 `dictRehash(d, 1)`로 bucket 하나를 옮깁니다. 빈 bucket은 최대 `n × 10`개까지만 건너뜁니다.
  > 조회는 `ht[0]`(아직 안 옮긴 부분)과 `ht[1]`을 모두 봅니다. 새 키는 `ht[1]`에만 넣습니다.
  > 그래서 `ht[0]`은 줄기만 하고, 끝나면 `ht[1]`이 `ht[0]`이 됩니다.
- **Facts:**
  - Per operation: `dictRehash(d, 1)`
  - Empty-bucket cap: `empty_visits = n * 10`
  - Lookup skips `ht[0]` buckets below `rehashidx`
- **Event log:** `main → dict · Dict · dictRehash(d,1) bucket 0 → ht[1] · —`
- **State (dict: db0):**
  - before: `rehashidx = 0`, `ht[0].used = 4`, `ht[1].used = 1`
  - after: `rehashidx = 1`, `ht[0].used = 3`, `ht[1].used = 2`
- **Sources:** [dict.c#L407](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L407), [dict.c#L471-L473](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L471-L473), [dict.c#L550-L552](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L550-L552), [dict.c#L786-L789](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L786-L789), [dict.c#L1720-L1733](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L1720-L1733)

#### S15 · `mutate` dict · 한가할 때는 serverCron이 1 ms씩 옮긴다
- **Subtitle:** `activerehashing yes`면 매 cron tick마다 최대 1000 µs 동안 100 bucket씩 옮긴다.
- **Prose:**
  > 요청이 없으면 step 방식 rehash는 끝나지 않습니다. 그래서 `databasesCron`이 `kvstoreIncrementallyRehash()`로 tick마다 최대 1 ms 동안 rehash합니다.
  > 기본 `hz 10`이면 100 ms마다 1 ms입니다.
  > fork한 자식(RDB, AOF rewrite)이 있으면 active rehash를 건너뛰고 resize도 피합니다. 페이지를 덜 건드려야 copy-on-write 복사가 줄기 때문입니다(lesson 4).
- **Facts:**
  - `activerehashing`: yes
  - Budget: `INCREMENTAL_REHASHING_THRESHOLD_US` = 1000 µs per tick, in batches of `dictRehash(d,100)`
  - Skipped while a child process is active
- **Event log:** `main → dict · Dict · dictRehashMicroseconds(1000) done · 0.2 ms (E.G.)`
- **State (dict: db0):**
  - before: `rehashidx = 1`, `ht[0] = 4 buckets`, `ht[1] = 8 buckets`
  - after: `rehashidx = -1`, `ht[0] = 8 buckets, used 5`, `ht[1] = —`
- **Sources:** [redis.conf#L2414](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2414), [redis.conf#L2432](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2432), [server.h#L147](https://github.com/redis/redis/blob/8.10.3/src/server.h#L147), [server.c#L1328-L1362](https://github.com/redis/redis/blob/8.10.3/src/server.c#L1328-L1362), [kvstore.c#L674-L692](https://github.com/redis/redis/blob/8.10.3/src/kvstore.c#L674-L692), [dict.c#L449-L460](https://github.com/redis/redis/blob/8.10.3/src/dict.c#L449-L460), [server.c#L819-L833](https://github.com/redis/redis/blob/8.10.3/src/server.c#L819-L833)

### Decoder records

**D2.1 listpack of `HSET user:1 name redis age 7` (27 B).** Layers: header · entry 1 · entry 2 · entry 3 · entry 4 · end. Computed from the encoding rules in `listpack.c`, not dumped from a live server.

| Offset | Bytes (hex) | Field | Value | Meaning |
|---|---|---|---|---|
| 0–3 | `1B 00 00 00` | total-bytes | 27 | uint32 LE, whole listpack |
| 4–5 | `04 00` | num-elements | 4 | uint16 LE (65535 = unknown, must scan) |
| 6 | `84` | encoding | `10`·000100 | 6-bit string, length 4 |
| 7–10 | `6E 61 6D 65` | data | `name` | field 1 |
| 11 | `05` | backlen | 5 | length of encoding + data |
| 12 | `85` | encoding | `10`·000101 | 6-bit string, length 5 |
| 13–17 | `72 65 64 69 73` | data | `redis` | value 1 |
| 18 | `06` | backlen | 6 | |
| 19 | `83` | encoding | `10`·000011 | 6-bit string, length 3 |
| 20–22 | `61 67 65` | data | `age` | field 2 |
| 23 | `04` | backlen | 4 | |
| 24 | `07` | encoding+data | `0`·0000111 | 7-bit uint = 7 (string "7" stored as integer) |
| 25 | `01` | backlen | 1 | |
| 26 | `FF` | end | | `LP_EOF` |

Other first-byte patterns for the legend: `110xxxxx` 13-bit int, `1110xxxx` 12-bit string, `F0` 32-bit string, `F1`/`F2`/`F3`/`F4` 16/24/32/64-bit int. Sources: [listpack.c#L27-L76](https://github.com/redis/redis/blob/8.10.3/src/listpack.c#L27-L76), [listpack.c#L249-L373](https://github.com/redis/redis/blob/8.10.3/src/listpack.c#L249-L373), [listpack.c#L443-L460](https://github.com/redis/redis/blob/8.10.3/src/listpack.c#L443-L460).

**D2.2 intset `tags` before and after `SADD tags 70000`.** Layers: header · contents.

| State | Bytes (hex) | Fields |
|---|---|---|
| before (14 B) | `02 00 00 00` `03 00 00 00` `01 00` `02 00` `03 00` | encoding = 2 (INT16), length = 3, contents = 1, 2, 3 |
| after (24 B) | `04 00 00 00` `04 00 00 00` `01 00 00 00` `02 00 00 00` `03 00 00 00` `70 11 01 00` | encoding = 4 (INT32), length = 4, contents = 1, 2, 3, 70000 (0x00011170) |

Sources: [intset.h#L35-L39](https://github.com/redis/redis/blob/8.10.3/src/intset.h#L35-L39), [intset.c#L41-L43](https://github.com/redis/redis/blob/8.10.3/src/intset.c#L41-L43), [intset.c#L60-L75](https://github.com/redis/redis/blob/8.10.3/src/intset.c#L60-L75), [intset.c#L165-L192](https://github.com/redis/redis/blob/8.10.3/src/intset.c#L165-L192). Computed, not dumped from a live server.

### Self-check

1. **Q:** hash가 listpack에서 hashtable로 바뀌는 두 조건과 기본값은? **A:** field 수 > `hash-max-listpack-entries`(512), 또는 field/value 길이 > `hash-max-listpack-value`(64바이트). 한 번 바뀌면 돌아가지 않는다.
2. **Q:** listpack entry의 backlen은 왜 있나? **A:** 각 entry 끝에 자기 길이를 적어 두어 뒤에서 앞으로 순회할 수 있게 한다(예: `LRANGE` 음수 index, `RPOP`).
3. **Q:** `SADD s 1 2 3` 후 `SADD s 70000`을 하면 메모리에서 무슨 일이 일어나나? **A:** intset이 INT16에서 INT32로 upgrade되어 모든 원소를 4바이트로 다시 쓴다. 정렬 상태는 유지, downgrade는 없다.
4. **Q:** sorted set이 skiplist와 dict를 함께 쓰는 이유는? **A:** dict로 member → score를 O(1)에 찾고(`ZSCORE`), skiplist로 score 순 범위와 rank를 O(log N)에 찾기 위해서.
5. **Q:** dict incremental rehash 중 `GET`은 어느 table을 보나? 새 키는 어디에 들어가나? **A:** `ht[0]`(rehashidx 이후)과 `ht[1]`을 모두 본다. 새 키는 `ht[1]`에만 넣는다.
6. **Q:** BGSAVE 중에 dict resize를 피하는 이유는? **A:** fork 후 부모가 메모리 페이지를 건드릴 때마다 copy-on-write로 페이지가 복사된다. resize는 많은 페이지를 건드리므로 load factor 4 이상일 때만 허용한다.

---

## Lesson 3. `expire-evict`: 키는 언제 사라지는가, 만료와 eviction

**Goal.** Show the two ways an expired key disappears (on access, and by the sampling cycle), then what happens when memory hits `maxmemory`, and close with the cache stampede that a hot key's expiry causes.

**Interview questions it answers**
- TTL이 지난 키는 바로 지워지나? 메모리에 남아 있을 수 있나?
- active expire cycle은 어떻게 동작하나? (예전 "20개 샘플, 25% 넘으면 반복" 설명은 지금 코드와 다르다)
- replica에서 만료된 키를 읽으면? replica는 직접 지우나?
- `maxmemory`에 닿으면 무슨 일이? 기본 정책은? LRU가 "근사"인 이유와 LFU counter 구조는?
- cache stampede는 왜 생기고, Redis로 어떻게 막나?

**Nodes**

| id | label | sublabel | kind | Illustration idea | First appears |
|---|---|---|---|---|---|
| `app1` | order-api #1 | Spring app | `app` | Small server box with a leaf badge | S1 |
| `app2` | order-api #2…#N | Spring app ×N | `app` | Stack of the same box | S14 |
| `main` | Redis main | `expire.c` / `evict.c` | `framework` | Gear with an hourglass | S1 |
| `keys` | db0 keys | `kvstore` | `storage` | Drawer cabinet | S2 |
| `expires` | db0 expires | `kvstore` | `storage` | Second cabinet with clock tags | S2 |
| `pool` | eviction pool | 16 slots | `framework` | Tray with 16 numbered slots | S11 |
| `replica` | Replica | read-only | `framework` | Mirror-image gear | S5 |
| `db` | MySQL | `orders` | `storage` | Database cylinder | S14 |

**Layer selector:** `Command` · `Expire` · `Evict` · `Cache pattern`.

**Example clock.** The command runs at `1793750400000` ms = 2026-11-04T00:00:00Z (E.G.).

### Steps

#### S1 · `move` app1 → main · `SET session:42 v EX 60`
- **Subtitle:** 상대 TTL을 받지만 저장은 절대 시각(Unix ms)으로 한다.
- **Prose:**
  > `EXPIRE`, `PEXPIRE`, `EXPIREAT`, `SET … EX`는 모두 같은 길을 타고, 만료 시각을 Unix epoch 밀리초 절대값으로 바꿉니다.
  > 그래서 Redis가 꺼져 있는 동안에도 시간은 흐르고, 서버 시계를 앞으로 돌리면 키가 즉시 만료될 수 있습니다.
  > 전파할 때도 상대값이 아니라 `SET … PXAT <ms>` / `PEXPIREAT`로 보냅니다. replica와 AOF가 같은 시각을 쓰게 하려는 것입니다.
- **Token:** `request` · `SET session:42 v EX 60`
- **Facts:**
  - Stored as: absolute Unix time in ms (`when = now + 60*1000`)
  - Propagated as: `SET session:42 v PXAT 1793750460000` (E.G.)
  - Expire accuracy since 2.6: 0–1 ms
- **Event log:** `app1 → main · RESP2 · SET session:42 v EX 60 · 53 B`
- **Sources:** [expire.c#L726-L754](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L726-L754), [t_string.c#L193-L205](https://github.com/redis/redis/blob/8.10.3/src/t_string.c#L193-L205), [expire.c#L824-L828](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L824-L828), [expire.md#L238-L254](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/expire.md#L238-L254)

#### S2 · `mutate` expires · 만료 시각은 키 옆 metadata로 붙는다
- **Subtitle:** `db->expires`에 같은 키 객체를 등록하고, 시각은 객체 앞 8바이트 metadata에 둔다(8.x).
- **Prose:**
  > 각 DB에는 `keys`와 `expires` 두 `kvstore`가 있습니다. TTL이 있는 키만 `expires`에 들어갑니다.
  > 8.x에서는 만료 시각을 별도 값으로 두지 않고, `kvobj` 앞의 metadata class 0(8바이트)에 둡니다. `expires`는 같은 객체를 가리킵니다.
  > hash field TTL(`HEXPIRE`, 7.4+)은 따로 `subexpires`에서 관리합니다.
- **Facts:**
  - Per-DB: `kvstore *keys`, `kvstore *expires`, `estore *subexpires`
  - Expire metadata: class 0, placed before the `kvobj`
- **Event log:** `main → expires · Expire · kvstoreDictAddRaw(expires, session:42) · 8 B metadata`
- **State (expires: db0):**
  - before: `(empty)`
  - after: `session:42 → 1793750460000 (E.G.)`
- **Sources:** [server.h#L1226-L1229](https://github.com/redis/redis/blob/8.10.3/src/server.h#L1226-L1229), [object.h#L45-L57](https://github.com/redis/redis/blob/8.10.3/src/object.h#L45-L57), [db.c#L2807-L2808](https://github.com/redis/redis/blob/8.10.3/src/db.c#L2807-L2808), [hexpire.md#L79](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/hexpire.md#L79)

#### S3 · `move` app1 → main · `TTL`의 세 가지 답
- **Subtitle:** 남은 초, `-1`(TTL 없음), `-2`(키 없음).
- **Prose:**
  > `TTL`은 남은 초를 돌려줍니다. 키는 있는데 TTL이 없으면 `-1`, 키가 없으면 `-2`입니다(2.8 이전에는 둘 다 `-1`).
  > TTL은 내용을 지우거나 덮어쓰는 명령(`DEL`, `SET`, `GETSET`, `*STORE`)만 없앱니다. `INCR`, `LPUSH`, `HSET`은 TTL을 그대로 둡니다.
  > `SET`은 `KEEPTTL` 없이 쓰면 기존 TTL을 버립니다. `PERSIST`는 TTL만 지웁니다.
- **Token:** `request` · `TTL session:42` → `:57`
- **Facts:**
  - `-2`: key does not exist; `-1`: no expire
  - `SET` without `KEEPTTL` discards the TTL
  - `RENAME` carries the TTL to the new name
- **Event log:** `app1 → main · RESP2 · TTL session:42 → :57 (E.G.) · 30 B / 5 B`
- **Sources:** [ttl.md#L58-L63](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/ttl.md#L58-L63), [expire.md#L81-L94](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/expire.md#L81-L94), [set.md#L140](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/set.md#L140), [set.md#L228](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/set.md#L228)

#### S4 · `mutate` keys · 읽을 때 만료를 확인한다 (lazy)
- **Subtitle:** 60초 뒤 `GET session:42` → `lookupKey` → `expireIfNeeded` → 삭제하고 null.
- **Prose:**
  > 키를 읽을 때마다 `lookupKey()`가 `expireIfNeeded()`를 부릅니다. `now > when`이면 그 자리에서 지우고 키가 없는 것처럼 답합니다.
  > `now`는 명령 시작 시점에 찍은 값이라, 명령이나 script 하나 안에서는 시간이 멈춘 것처럼 보입니다.
  > 이것만으로는 다시 읽히지 않는 키가 영원히 남습니다. 그래서 active cycle(S6)이 있습니다.
- **Facts:**
  - Check: `now > when`, with `now` = per-command time snapshot
  - Never expire while loading (`server.loading`)
  - Expired key event: `expired` keyspace notification
- **Event log:** `main → keys · Expire · expireIfNeeded(session:42) → deleted · —`
- **State (keys / expires: db0):**
  - before: `keys: session:42`, `expires: session:42 → 1793750460000`
  - after: `keys: —`, `expires: —`
- **Sources:** [db.c#L279-L306](https://github.com/redis/redis/blob/8.10.3/src/db.c#L279-L306), [db.c#L2941-L2951](https://github.com/redis/redis/blob/8.10.3/src/db.c#L2941-L2951), [server.c#L262-L276](https://github.com/redis/redis/blob/8.10.3/src/server.c#L262-L276), [expire.md#L258-L267](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/expire.md#L258-L267)

#### S5 · `move` main → replica · 만료 삭제는 master가 DEL로 보낸다
- **Subtitle:** replica는 직접 지우지 않고 master의 `DEL`(또는 `UNLINK`)을 기다린다.
- **Prose:**
  > master는 만료로 지운 키를 `DEL`로 AOF와 모든 replica에 전파합니다. `lazyfree-lazy-expire yes`면 `UNLINK`입니다.
  > replica는 독립적으로 키를 만료시키지 않습니다. 다만 읽기 명령에는 자기 시계로 "없다"고 답합니다.
  > master에서 온 명령은 만료 검사를 건너뜁니다. 그래서 복제 스트림의 순서가 지켜집니다.
- **Token:** `data` · `DEL session:42`
- **Facts:**
  - `lazyfree-lazy-expire`: no → `DEL`; yes → `UNLINK`
  - Replica read of an expired key: reported as missing, not deleted
- **Event log:** `main → replica · Replication · *2 DEL session:42 · 30 B`
- **Sources:** [db.c#L2876-L2930](https://github.com/redis/redis/blob/8.10.3/src/db.c#L2876-L2930), [db.c#L2962-L2970](https://github.com/redis/redis/blob/8.10.3/src/db.c#L2962-L2970), [db.c#L3049-L3052](https://github.com/redis/redis/blob/8.10.3/src/db.c#L3049-L3052), [config.c#L3411](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3411), [expire.md#L271-L281](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/expire.md#L271-L281), [replication.md#L282-L283](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L282-L283)

#### S6 · `mutate` expires · slow cycle: CPU 25% 안에서 샘플링
- **Subtitle:** serverCron(10 Hz)이 `activeExpireCycle(SLOW)`를 부르고, 한 번에 최대 25 ms를 쓴다.
- **Prose:**
  > master는 `databasesCron`에서 `activeExpireCycle(ACTIVE_EXPIRE_CYCLE_SLOW)`를 부릅니다.
  > 시간 한도는 `25 × 1,000,000 / hz / 100` µs, 기본 hz 10이면 25 ms입니다.
  > `expires`를 cursor로 훑으며 한 번에 20개씩 보고, 만료된 비율이 10%를 넘으면 같은 DB를 다시 봅니다.
  > 예전 글의 "무작위 20개, 25% 넘으면 반복"과 다릅니다. 지금의 25%는 CPU 시간 한도입니다.
- **Facts:**
  - `ACTIVE_EXPIRE_CYCLE_KEYS_PER_LOOP`: 20
  - `ACTIVE_EXPIRE_CYCLE_SLOW_TIME_PERC`: 25 (% of CPU) → 25 ms per call at hz 10
  - `ACTIVE_EXPIRE_CYCLE_ACCEPTABLE_STALE`: 10 (%)
- **Event log:** `main → expires · Expire · activeExpireCycle SLOW: sampled 20, expired 8 · 0.4 ms (E.G.)`
- **State (expires: one loop, E.G.):**
  - before: `cursor = 0`, `sampled = 0`, `expired = 0`
  - after: `cursor = 0x3a (E.G.)`, `sampled = 20`, `expired = 8 (40% > 10% → repeat)`
- **Sources:** [expire.c#L56-L100](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L56-L100), [expire.c#L347-L352](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L347-L352), [expire.c#L433-L447](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L433-L447), [server.c#L1312-L1318](https://github.com/redis/redis/blob/8.10.3/src/server.c#L1312-L1318)

#### S7 · `mutate` expires · fast cycle: 잠들기 전 1 ms
- **Subtitle:** `beforeSleep`이 짧은 cycle을 돌린다. 지난 slow cycle이 시간 초과였거나 stale이 많을 때만.
- **Prose:**
  > event loop가 잠들기 전마다 `activeExpireCycle(ACTIVE_EXPIRE_CYCLE_FAST)`를 부릅니다. 한도는 1000 µs입니다.
  > 지난 slow cycle이 시간 한도로 끝나지 않았고 stale 추정치가 10% 미만이면 바로 돌아갑니다.
  > 직전 fast cycle 시작 후 2000 µs 안에는 다시 돌지 않습니다.
- **Facts:**
  - `ACTIVE_EXPIRE_CYCLE_FAST_DURATION`: 1000 µs
  - Gate: last slow cycle timed out, or stale ≥ acceptable %
  - Min gap: 2 × fast duration
- **Event log:** `main → expires · Expire · activeExpireCycle FAST · ≤ 1000 µs`
- **State (main: expire stats):**
  - before: `stat_expired_stale_perc = 0.12 (E.G.)`, `last_fast_cycle = t−5 ms`
  - after: `expired_keys += 31 (E.G.)`, `last_fast_cycle = t`
- **Sources:** [expire.c#L323-L327](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L323-L327), [server.c#L2006-L2009](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2006-L2009), [expire.c#L96-L100](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L96-L100)

#### S8 · `mutate` main · `active-expire-effort`로 세게 돌린다
- **Subtitle:** 1(기본)~10. 올리면 샘플 수, 시간 한도, CPU 비율이 늘고 허용 stale 비율이 준다.
- **Prose:**
  > `active-expire-effort`를 올리면 네 값이 같이 바뀝니다. 만료 키가 메모리에 오래 남는 대신 CPU를 쓰는 trade-off입니다.
  > 최대 10이면 한 번에 65개 샘플, fast cycle 3250 µs, slow cycle CPU 43%, 허용 stale 1%입니다.
- **Facts:**
  - `active-expire-effort`: default 1, range 1–10
  - keys per loop `20 + 5×(e−1)`: 20 → 65
  - slow CPU % `25 + 2×(e−1)`: 25 → 43; acceptable stale `10 − (e−1)`: 10 → 1
- **Event log:** `main → main · Expire · CONFIG SET active-expire-effort 10 · —`
- **State (main: expire parameters):**
  - before (effort 1): `keys/loop = 20`, `fast = 1000 µs`, `slow CPU = 25%`, `stale = 10%`
  - after (effort 10): `keys/loop = 65`, `fast = 3250 µs`, `slow CPU = 43%`, `stale = 1%`
- **Sources:** [expire.c#L292-L300](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L292-L300), [config.c#L3536](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3536), [redis.conf#L1314-L1323](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1314-L1323)

#### S9 · `mutate` main · maxmemory에 닿았다: 기본은 쓰기 거절
- **Subtitle:** 기본 `maxmemory-policy noeviction` — `DENYOOM` 명령은 `-OOM`, 읽기는 계속 된다.
- **Prose:**
  > `maxmemory`는 기본 0(64비트에서 제한 없음)입니다. 설정하면 `processCommand()`가 명령 전에 `performEvictions()`를 부릅니다.
  > 기본 정책 `noeviction`은 아무것도 지우지 않고 실패를 돌려줍니다. 그러면 `SET` 같은 `DENYOOM` 명령은 `-OOM` 오류를 받고, `GET`은 그대로 됩니다.
  > replica 출력 buffer 중 backlog를 넘는 부분과 AOF buffer는 사용량 계산에서 뺍니다. DEL을 밀어 넣다가 buffer가 커지는 되먹임을 막으려는 것입니다.
- **Facts:**
  - `maxmemory`: 0; `maxmemory-policy`: `noeviction`
  - Error: `-OOM command not allowed when used memory > 'maxmemory'.`
  - Not counted: replica output buffers above `repl-backlog-size`, AOF buffer
- **Event log:** `app1 → main · RESP2 · SET cart:9 … → -OOM · 1.02 GB used / 1 GB max (E.G.)`
- **State (main: memory):**
  - before: `used = 0.99 GB (E.G.)`, `maxmemory = 1gb (E.G.)`, `policy = noeviction`
  - after: `used = 1.02 GB`, `state = EVICT_FAIL`, `writes = -OOM`, `reads = OK`
- **Sources:** [config.c#L3589](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3589), [config.c#L3491](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3491), [server.c#L4655-L4671](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4655-L4671), [server.c#L2249-L2250](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2249-L2250), [evict.c#L549-L551](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L549-L551), [evict.c#L310-L358](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L310-L358), [eviction/index.md#L60-L76](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/eviction/index.md#L60-L76)

#### S10 · `mutate` main · 정책은 10가지 (8.6부터 LRM 추가)
- **Subtitle:** `allkeys-*`는 모든 키, `volatile-*`는 TTL 있는 키만 후보. 기준은 LRU, LFU, LRM, random, TTL.
- **Prose:**
  > 정책 이름은 범위(`allkeys`/`volatile`)와 기준의 조합입니다. 8.6부터 쓰기만 시각을 갱신하는 LRM(Least Recently Modified)이 추가되어 10개입니다.
  > `volatile-*` 정책에서 TTL 있는 키가 하나도 없으면 `noeviction`처럼 동작합니다.
  > 캐시로만 쓰면 보통 `allkeys-lru`나 `allkeys-lfu`를 고릅니다.
- **Facts:**
  - Policies: `volatile-lru`, `allkeys-lru`, `volatile-lfu`, `allkeys-lfu`, `volatile-lrm`, `allkeys-lrm`, `volatile-random`, `allkeys-random`, `volatile-ttl`, `noeviction`
  - LRM: since 8.6
  - `volatile-*` with no TTL keys behaves like `noeviction`
- **Event log:** `app1 → main · RESP2 · CONFIG SET maxmemory-policy allkeys-lru · —`
- **State (main: policy):**
  - before: `noeviction`
  - after: `allkeys-lru`
- **Sources:** [config.c#L39-L51](https://github.com/redis/redis/blob/8.10.3/src/config.c#L39-L51), [redis.conf#L1233-L1266](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1233-L1266), [eviction/index.md#L104-L118](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/eviction/index.md#L104-L118), [eviction/index.md#L305](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/eviction/index.md#L305)

#### S11 · `mutate` pool · 근사 LRU: 5개 샘플, 16칸 pool
- **Subtitle:** 전체를 정렬하지 않는다. 키 몇 개를 뽑아 pool에 넣고, 가장 오래 안 쓴 키를 지운다.
- **Prose:**
  > 정확한 LRU는 모든 키를 순서대로 엮어야 해서 메모리가 듭니다. Redis는 DB마다 `maxmemory-samples`(기본 5)개를 뽑습니다.
  > 뽑은 키를 idle 시간 순으로 16칸 eviction pool에 넣고, 가장 idle이 긴 키부터 지웁니다. pool은 호출 사이에도 유지되어 좋은 후보가 쌓입니다.
  > 한 번에 메모리를 다 못 비우면 timer로 이어서 지웁니다. 시간 한도는 `maxmemory-eviction-tenacity`(기본 10 → 500 µs)가 정합니다.
- **Facts:**
  - `maxmemory-samples`: 5 (max 64; 10 is "very close" to true LRU)
  - `EVPOOL_SIZE`: 16
  - `maxmemory-eviction-tenacity`: 10 → 500 µs per call (`50 µs × tenacity` up to 10)
- **Event log:** `main → pool · Evict · evictionPoolPopulate 5 samples → evict product:311 · 2.1 KB freed (E.G.)`
- **State (pool, E.G.):**
  - before: `[]`
  - after: `[product:311 idle 9000 s, cart:12 idle 4200 s, user:7 idle 300 s, …]` → `product:311` evicted
- **Sources:** [evict.c#L36](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L36), [evict.c#L93-L96](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L93-L96), [evict.c#L134](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L134), [evict.c#L491-L521](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L491-L521), [config.c#L3522-L3523](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3522-L3523), [redis.conf#L1270-L1278](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1270-L1278), [eviction/index.md#L205-L207](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/reference/eviction/index.md#L205-L207)

#### S12 · `mutate` robj · LRU 시계는 24비트, 초 단위
- **Subtitle:** 객체마다 마지막 접근 시각을 24비트 초 단위 시계로 저장한다.
- **Prose:**
  > `lru` 24비트에는 마지막 접근 시각을 1000 ms 해상도로 담습니다.
  > idle 시간은 지금의 LRU 시계에서 이 값을 빼서 구합니다. 24비트 초는 약 194일마다 한 바퀴 돕니다(계산값).
- **Facts:**
  - `LRU_BITS`: 24; `LRU_CLOCK_RESOLUTION`: 1000 ms
  - `getLRUClock() = (mstime()/1000) & LRU_CLOCK_MAX`
  - Wrap-around: 2^24 s ≈ 194 days (computed)
- **Event log:** `main → robj · Evict · touch cart:12, lru = clock · —`
- **State (robj: `cart:12`):**
  - before: `lru = 0x2A3F10 (E.G.)`
  - after: `lru = 0x2A51F3 (E.G.)`
- **Sources:** [object.h#L92-L94](https://github.com/redis/redis/blob/8.10.3/src/object.h#L92-L94), [evict.c#L55-L57](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L55-L57)

#### S13 · `mutate` robj · LFU: 8비트 로그 counter와 16비트 분 단위 시각
- **Subtitle:** 접근할수록 counter가 오르지만 오를 확률은 점점 작아지고, 시간이 지나면 줄어든다.
- **Prose:**
  > LFU 정책에서는 같은 24비트를 상위 16비트(마지막 감소 시각, 분)와 하위 8비트(counter)로 나눕니다.
  > 새 객체는 counter 5(`LFU_INIT_VAL`)로 시작합니다. 접근할 때 `p = 1 / ((counter − 5) × lfu-log-factor + 1)` 확률로 1 오르고, 255에서 멈춥니다.
  > `lfu-decay-time`(기본 1분)마다 counter가 1씩 줄어 예전에만 인기 있던 키가 밀려납니다.
- **Facts:**
  - Layout: 16-bit time (minutes) + 8-bit counter; `LFU_INIT_VAL` = 5
  - `lfu-log-factor`: 10 (≈ 1M hits → 255); `lfu-decay-time`: 1 minute
  - redis.conf writes `1/(old_value*factor+1)`; the code subtracts `LFU_INIT_VAL` first
- **Event log:** `main → robj · Evict · LFULogIncr counter 5 → 6 (p = 1.0) · —`
- **State (robj: `product:7` LFU, E.G.):**
  - before: `time = 29895840 min & 0xFFFF`, `counter = 5`
  - after: `counter = 6`
- **Sources:** [evict.c#L230-L267](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L230-L267), [evict.c#L281-L308](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L281-L308), [server.h#L4471](https://github.com/redis/redis/blob/8.10.3/src/server.h#L4471), [object.c#L125](https://github.com/redis/redis/blob/8.10.3/src/object.c#L125), [config.c#L3518-L3519](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3518-L3519), [redis.conf#L2571-L2608](https://github.com/redis/redis/blob/8.10.3/redis.conf#L2571-L2608)

#### S14 · `move` app2 → db · 인기 키가 만료되면: cache stampede
- **Subtitle:** `product:7`이 만료된 순간 N개 instance가 동시에 miss하고 모두 DB로 간다.
- **Prose:**
  > cache-aside에서 인기 키가 만료되면 동시에 들어온 요청이 모두 miss합니다.
  > 각 instance가 같은 행을 DB에서 다시 읽고 다시 `SET`합니다. 캐시가 막으려던 부하가 한꺼번에 DB로 몰립니다.
  > 만료 자체는 정상 동작(S4, S6)이므로 Redis 쪽에서 막을 수 없고, 애플리케이션이 재계산을 한 번만 하도록 조율해야 합니다.
- **Token:** `request` · `SELECT * FROM product WHERE id=7` ×N
- **Facts:**
  - Docs name it "a cache stampede that amplifies the exact load spike caching was supposed to prevent"
  - Docs list mitigations: mutex lock or probabilistic early refresh, done atomically with Lua
- **Event log:** `app2 → db · SQL · 200 concurrent SELECT product:7 (E.G.) · 200 × 15 ms (E.G.)`
- **Sources:** [cache-aside/_index.md#L24](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/_index.md#L24), [cache-aside/_index.md#L58-L60](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/_index.md#L58-L60)

#### S15 · `move` app1 → main · 한 instance만 재계산: `SET NX PX` lock
- **Subtitle:** `SET lock:product:7 <token> NX PX 30000` — 성공한 하나만 DB를 읽고, 나머지는 cache를 다시 본다.
- **Prose:**
  > miss한 instance는 먼저 `SET lock:… <random token> NX PX 30000`을 시도합니다. 키가 없을 때만 성공하므로 하나만 lock을 얻습니다.
  > lock을 얻은 쪽이 DB를 읽어 cache를 채우고, 나머지는 잠깐 기다렸다가 cache를 다시 읽습니다.
  > token은 client마다 달라야 합니다. 그래야 TTL이 지나 남의 lock이 된 키를 실수로 지우지 않습니다.
- **Token:** `request` · `SET lock:product:7 8f14… NX PX 30000`
- **Facts:**
  - Acquire: `SET resource_name my_random_value NX PX 30000`
  - Token: unique per client and per request (docs suggest 20 bytes from `/dev/urandom`)
  - Losers: poll the cache (docs worked example)
- **Event log:** `app1 → main · RESP2 · SET lock:product:7 <token> NX PX 30000 → +OK · 100 B (token E.G.)`
- **Sources:** [distributed-locks.md#L99-L102](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L99-L102), [distributed-locks.md#L117-L120](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L117-L120), [cache-aside/redis-py/_index.md#L121-L135](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/use-cases/cache-aside/redis-py/_index.md#L121-L135), [set.md#L101-L111](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/set.md#L101-L111)

#### S16 · `move` app1 → main · 내 lock일 때만 지운다: `DELEX … IFEQ`
- **Subtitle:** 8.4부터 `DELEX key IFEQ token`. 그 전에는 GET 비교 후 DEL하는 Lua script.
- **Prose:**
  > 일이 끝나면 lock을 풀어야 하는데, 그냥 `DEL`하면 내 TTL이 이미 지나 다른 instance가 잡은 lock을 지울 수 있습니다.
  > 8.4부터는 `DELEX lock:product:7 IFEQ <token>`으로 값이 같을 때만 지웁니다. 지우면 1, 아니면 0입니다.
  > 8.4 이전에는 `GET`과 비교 후 `DEL`하는 Lua script를 썼습니다. script는 원자적으로 실행되므로 사이에 끼어들 수 없습니다.
- **Token:** `request` · `DELEX lock:product:7 IFEQ 8f14…`
- **Facts:**
  - `DELEX`: since 8.4.0; returns 1 if deleted, 0 if not
  - `SET … IFEQ/IFNE/IFDEQ/IFDNE`: since 8.4.0
  - Pre-8.4 release: `if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`
- **Event log:** `app1 → main · RESP2 · DELEX lock:product:7 IFEQ <token> → :1 · 85 B (token E.G.)`
- **Sources:** [distributed-locks.md#L107-L115](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L107-L115), [delex.md#L64-L67](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/delex.md#L64-L67), [delex.md#L129](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/delex.md#L129), [set.md#L110-L111](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/set.md#L110-L111), [commands.def#L13077](https://github.com/redis/redis/blob/8.10.3/src/commands.def#L13077)

### Decoder records

**D3.1 Propagated form of `SET session:42 v EX 60` (what replicas and the AOF see).** Layers: array header · argv[0..4].

| Bytes (text) | Field | Value | E.G.? |
|---|---|---|---|
| `*5\r\n` | array header | 5 args | |
| `$3\r\nSET\r\n` | argv[0] | `SET` | |
| `$10\r\nsession:42\r\n` | argv[1] | key | |
| `$1\r\nv\r\n` | argv[2] | value | |
| `$4\r\nPXAT\r\n` | argv[3] | `EX` rewritten to `PXAT` | |
| `$13\r\n1793750460000\r\n` | argv[4] | `now + 60000` ms | E.G. |

Sources: [t_string.c#L193-L205](https://github.com/redis/redis/blob/8.10.3/src/t_string.c#L193-L205), [t_string.c#L256-L260](https://github.com/redis/redis/blob/8.10.3/src/t_string.c#L256-L260), [server.c#L2338](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2338).

**D3.2 LFU data in the 24-bit `lru` field.** Layers: time · counter.

| Bits | Field | Value | Meaning |
|---|---|---|---|
| 23–8 (16 bits) | ldt | `(unixtime/60) & 65535` | last decrement time, minutes (E.G.) |
| 7–0 (8 bits) | LOG_C | 5 at creation | logarithmic access counter, saturates at 255 |

Sources: [evict.c#L230-L267](https://github.com/redis/redis/blob/8.10.3/src/evict.c#L230-L267), [object.h#L109-L111](https://github.com/redis/redis/blob/8.10.3/src/object.h#L109-L111).

### Self-check

1. **Q:** TTL이 지난 키가 메모리에 남아 있을 수 있나? 어떻게 지워지나? **A:** 남을 수 있다. 접근할 때 지우는 lazy 방식과, serverCron(slow, 기본 25 ms/100 ms)과 beforeSleep(fast, 1 ms)에서 샘플링해 지우는 active 방식 두 가지로 지운다.
2. **Q:** active expire cycle이 같은 DB를 다시 훑는 조건은? **A:** 한 번 본 키 중 만료 비율이 `ACTIVE_EXPIRE_CYCLE_ACCEPTABLE_STALE`(10%, effort 1)을 넘을 때. 시간 한도에 닿으면 멈춘다.
3. **Q:** replica에서 만료된 키를 `GET`하면? **A:** replica는 키를 지우지 않지만 읽기 명령에는 없다고 답한다. 실제 삭제는 master가 보내는 `DEL`/`UNLINK`로 한다.
4. **Q:** `maxmemory`를 설정하고 정책을 안 바꾸면 메모리가 꽉 찰 때 무슨 일이 일어나나? **A:** `noeviction`이므로 `DENYOOM` 명령은 `-OOM command not allowed when used memory > 'maxmemory'.`를 받고, 읽기는 계속 된다.
5. **Q:** Redis LRU가 "근사"인 이유는? **A:** 전체 키를 순서대로 관리하지 않고, `maxmemory-samples`(5)개를 뽑아 16칸 pool에서 idle이 가장 긴 키를 지우기 때문.
6. **Q:** LFU counter가 8비트로 충분한 이유는? **A:** 로그 확률로 증가한다(`1/((c−5)×10+1)`). 기본 factor 10이면 약 100만 번 접근해야 255가 된다. 또 시간이 지나면 줄어든다.
7. **Q:** cache stampede를 Redis lock으로 막을 때 lock 값을 랜덤 token으로 하는 이유와 해제 방법은? **A:** TTL이 지나 다른 client가 잡은 lock을 지우지 않으려고. 8.4+는 `DELEX key IFEQ token`, 이전은 GET 비교 후 DEL하는 Lua script.

---

## Lesson 4. `rdb`: fork 한 번으로 스냅샷, RDB와 copy-on-write

**Goal.** Follow one `BGSAVE`: the parent forks, parent and child share memory pages until the parent writes, the child streams a compact binary file and renames it into place, and the parent learns how much memory copy-on-write cost.

**Interview questions it answers**
- RDB 저장 중에도 Redis가 요청을 계속 받을 수 있는 이유는?
- fork 후 메모리가 두 배가 되나? copy-on-write는 언제 페이지를 복사하나?
- RDB만 쓸 때 잃을 수 있는 데이터 범위는? 기본 save point는?
- `MISCONF` 오류는 왜 나오나?

**Nodes**

| id | label | sublabel | kind | Illustration idea | First appears |
|---|---|---|---|---|---|
| `client` | app | | `client` | Laptop | S2 |
| `parent` | Redis (parent) | main thread | `framework` | Gear | S1 |
| `pages` | Memory pages | page table | `container` | Grid of page tiles with arrows from two processes | S4 |
| `child` | redis-rdb-bgsave | fork child | `container` | Smaller copy of the gear, dashed outline | S3 |
| `tmp` | temp-<pid>.rdb | | `storage` | Paper sheet being written | S6 |
| `rdb` | dump.rdb | | `storage` | Disk platter with a file tab | S9 |

**Layer selector:** `Process` (fork, signals, child info pipe) · `Memory` (pages, COW) · `File` (RDB bytes).

### Steps

#### S1 · `mutate` parent · save point을 센다
- **Subtitle:** 기본 save point는 `3600 1`, `300 100`, `60 10000`. 변경 수(`dirty`)와 지난 시간이 둘 다 넘으면 저장한다.
- **Prose:**
  > `serverCron`은 자식 프로세스가 없을 때 save point을 검사합니다.
  > "N초가 지났고 그동안 변경이 M번 이상"인 조건 하나라도 맞으면 `BGSAVE`를 시작합니다.
  > `save` 줄이 없으면 기본값 `3600 1 300 100 60 10000`이 쓰이고, `save ""`이면 꺼집니다. 실패 직후에는 5초 기다렸다 다시 시도합니다.
- **Facts:**
  - Default save points: 1 change in 3600 s, 100 in 300 s, 10000 in 60 s
  - Retry delay after a failed BGSAVE: `CONFIG_BGSAVE_RETRY_DELAY` = 5 s
  - Log: `%d changes in %d seconds. Saving...`
- **Event log:** `parent → parent · Process · serverCron: 100 changes in 300 seconds → BGSAVE (E.G.) · —`
- **State (parent: save state):**
  - before: `dirty = 99`, `lastsave = t−301 s`
  - after: `dirty = 100` → `save point 300 100 matched`
- **Sources:** [server.c#L2489-L2491](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2489-L2491), [redis.conf#L497-L506](https://github.com/redis/redis/blob/8.10.3/redis.conf#L497-L506), [server.c#L1700-L1727](https://github.com/redis/redis/blob/8.10.3/src/server.c#L1700-L1727), [server.h#L136](https://github.com/redis/redis/blob/8.10.3/src/server.h#L136)

#### S2 · `move` client → parent · `BGSAVE`
- **Subtitle:** 직접 명령으로도 시작한다. 이미 자식이 있으면 거절하거나 `SCHEDULE`로 예약한다.
- **Prose:**
  > `BGSAVE`는 즉시 `Background saving started`로 답하고 저장은 자식이 합니다.
  > 이미 RDB 저장 중이면 `Background save already in progress`, AOF rewrite 같은 다른 자식이 있으면 거절합니다. `BGSAVE SCHEDULE`은 그 자식이 끝난 뒤로 예약합니다.
  > `SAVE`는 main thread에서 직접 저장하므로 그동안 모든 client가 멈춥니다.
- **Token:** `request` · `BGSAVE`
- **Facts:**
  - Reply: `+Background saving started`
  - Only one child process (RDB or AOF rewrite) at a time
- **Event log:** `client → parent · RESP2 · BGSAVE → +Background saving started · 28 B reply`
- **Sources:** [rdb.c#L5473-L5507](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L5473-L5507)

#### S3 · `mutate` parent · `fork()`
- **Subtitle:** `redisFork(CHILD_TYPE_RDB)`. 큰 dataset에서는 fork 자체가 수 ms~1초 걸릴 수 있다.
- **Prose:**
  > 부모는 `redisFork()`로 자식을 만듭니다. 자식의 프로세스 이름은 `redis-rdb-bgsave`입니다.
  > fork는 page table을 복사하므로 dataset이 크면 오래 걸리고, 그동안 부모는 client를 받지 못합니다. 걸린 시간은 `INFO`의 `latest_fork_usec`에 남습니다.
  > fork 직후 부모는 dict resize를 피하고(`AVOID`), 자식은 금지합니다(`FORBID`). 메모리를 덜 건드려야 복사가 줄기 때문입니다.
- **Facts:**
  - Docs: fork "can be time consuming if the dataset is big … for some milliseconds or even for one second"
  - Resize policy: parent `AVOID` (resize only at load factor ≥ 4), child `FORBID`
  - Child OOM score: `CONFIG_OOM_BGCHILD`
- **Event log:** `parent → child · Process · fork() pid 48213 (E.G.) · 12 ms (E.G.)`
- **State (parent: child status):**
  - before: `child_type = none`, `dict resize = ENABLE`
  - after: `child_type = RDB`, `child_pid = 48213 (E.G.)`, `dict resize = AVOID`
- **Sources:** [rdb.c#L2223-L2255](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L2223-L2255), [server.c#L7497-L7566](https://github.com/redis/redis/blob/8.10.3/src/server.c#L7497-L7566), [server.c#L819-L832](https://github.com/redis/redis/blob/8.10.3/src/server.c#L819-L832), [server.c#L6790](https://github.com/redis/redis/blob/8.10.3/src/server.c#L6790), [persistence.md#L38](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L38)

#### S4 · `mutate` pages · 두 프로세스가 같은 페이지를 본다
- **Subtitle:** fork 직후에는 복사가 없다. 부모와 자식의 page table이 같은 물리 페이지를 가리킨다.
- **Prose:**
  > fork 직후 부모와 자식은 같은 물리 메모리 페이지를 공유합니다. 커널은 공유 페이지를 읽기 전용으로 표시해 둡니다.
  > 자식은 fork 순간의 메모리를 그대로 보므로, 따로 lock 없이 일관된 스냅샷을 쓸 수 있습니다.
  > docs는 이를 "copy-on-write semantics"를 이용한다고 설명합니다.
- **Facts:**
  - Snapshot consistency comes from the fork moment, not from locking
  - Docs: "This method allows Redis to benefit from copy-on-write semantics"
- **Event log:** `child → pages · Memory · share all pages with parent · 0 MB copied`
- **State (pages, E.G.):**
  - before: `P1..P4 → parent`
  - after: `P1..P4 → parent + child (shared, read-only)`
- **Sources:** [persistence.md#L91-L99](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L91-L99)

#### S5 · `mutate` pages · 부모가 쓰는 페이지만 복사된다
- **Subtitle:** 저장 중 `SET user:1 bob`이 P3를 건드리면 커널이 P3를 복사해 부모에게 준다.
- **Prose:**
  > 저장 중에도 부모는 쓰기를 받습니다. 공유 페이지에 처음 쓰는 순간 커널이 그 페이지를 복사합니다.
  > 자식은 여전히 옛 P3를 보므로 스냅샷은 fork 시점 그대로입니다.
  > 쓰기가 많을수록 복사가 늘어, 최악에는 메모리 사용이 두 배 가까이 됩니다. 자식은 `/proc/self/smaps`의 `Private_Dirty`로 이 양을 잽니다.
- **Facts:**
  - Measured as `Private_Dirty` (`zmalloc_get_private_dirty`)
  - INFO: `current_cow_size`, `current_cow_peak`, `rdb_last_cow_size`
- **Event log:** `client → parent · RESP2 · SET user:1 bob → page P3 copied · 4 KB (page size E.G.)`
- **State (pages, E.G.):**
  - before: `P3 → parent + child (shared)`
  - after: `P3 → child`, `P3' → parent (private copy)`
- **Sources:** [childinfo.c#L71-L82](https://github.com/redis/redis/blob/8.10.3/src/childinfo.c#L71-L82), [zmalloc.c#L1196-L1197](https://github.com/redis/redis/blob/8.10.3/src/zmalloc.c#L1196-L1197), [server.c#L6617-L6633](https://github.com/redis/redis/blob/8.10.3/src/server.c#L6617-L6633), [persistence.md#L224-L225](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L224-L225)

#### S6 · `move` child → tmp · header와 AUX 필드
- **Subtitle:** `REDIS0015` 9바이트, 그다음 `redis-ver`, `redis-bits`, `ctime`, `used-mem`, `aof-base` AUX.
- **Prose:**
  > 자식은 `temp-<pid>.rdb`를 엽니다. 파일은 magic `REDIS`와 4자리 RDB 버전(8.10.3은 `0015`)으로 시작합니다.
  > 다음은 AUX(`0xFA`) 필드들입니다. 각각 key 문자열과 value 문자열이며, 만든 Redis 버전, 비트 수, 생성 시각, 메모리, AOF preamble 여부를 적습니다.
  > replica를 위한 RDB면 `repl-id`, `repl-offset`도 적습니다.
- **Token:** `data` · `REDIS0015 + AUX`
- **Facts:**
  - `RDB_VERSION`: 15 → magic `REDIS0015`
  - AUX opcode: `0xFA` (250)
  - Always: `redis-ver`, `redis-bits`, `ctime`, `used-mem`, `aof-base`
- **Event log:** `child → tmp · File · write header + 5 AUX fields · ~90 B (E.G.)`
- **Record:** D4.1
- **Sources:** [rdb.h#L21](https://github.com/redis/redis/blob/8.10.3/src/rdb.h#L21), [rdb.c#L2036-L2037](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L2036-L2037), [rdb.c#L1738-L1795](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L1738-L1795), [rdb.h#L101-L114](https://github.com/redis/redis/blob/8.10.3/src/rdb.h#L101-L114)

#### S7 · `move` child → tmp · DB와 키를 쓴다
- **Subtitle:** `SELECTDB 0`, `RESIZEDB`, 그리고 키마다 [만료 시각] [type] key value.
- **Prose:**
  > DB마다 `SELECTDB`(`0xFE`)와 DB 번호, `RESIZEDB`(`0xFB`)와 키 수/만료 키 수를 씁니다. load할 때 hashtable 크기를 미리 잡게 하려는 것입니다.
  > 키 하나는 만료가 있으면 `EXPIRETIME_MS`(`0xFC`) + 8바이트 little-endian ms, 그다음 type 바이트, key, value입니다.
  > LRU/LFU 정책일 때만 `IDLE`/`FREQ`를 함께 씁니다. listpack 같은 작은 encoding은 그대로 덤프합니다(`RDB_TYPE_HASH_LISTPACK` = 16).
- **Token:** `data` · `FC … 00 user:1 alice`
- **Facts:**
  - `SELECTDB` 0xFE, `RESIZEDB` 0xFB, `EXPIRETIME_MS` 0xFC
  - Type bytes: string 0, list quicklist 18, set listpack 20, hash listpack 16, zset listpack 17
  - Strings ≤ 11 chars that parse as integers are int-encoded; strings > 20 bytes are LZF-compressed when `rdbcompression yes`
- **Event log:** `child → tmp · File · SELECTDB 0, RESIZEDB 1 1, key user:1 · 28 B`
- **Record:** D4.2
- **Sources:** [rdb.c#L1930-L1952](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L1930-L1952), [rdb.c#L1689-L1729](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L1689-L1729), [rdb.c#L135-L139](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L135-L139), [rdb.h#L55-L89](https://github.com/redis/redis/blob/8.10.3/src/rdb.h#L55-L89), [rdb.c#L457-L478](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L457-L478)

#### S8 · `move` child → tmp · EOF와 CRC64
- **Subtitle:** `0xFF` 다음 8바이트 CRC64. `rdbchecksum no`면 0으로 채운다.
- **Prose:**
  > 모든 DB를 쓰면 `EOF`(`0xFF`)와 파일 전체의 CRC64 8바이트를 씁니다.
  > `rdbchecksum`(기본 yes)을 끄면 checksum은 0이고, load할 때 검사를 건너뜁니다. 저장과 load가 약 10% 빨라집니다.
  > 그리고 `fflush`와 `fsync`로 디스크에 내립니다.
- **Token:** `data` · `FF + CRC64`
- **Facts:**
  - `EOF` opcode: 0xFF; checksum: 8 bytes, little-endian
  - `rdbchecksum`: yes (immutable at runtime); `rdbcompression`: yes (LZF)
- **Event log:** `child → tmp · File · EOF + CRC64, fsync · 9 B`
- **Sources:** [rdb.c#L2063-L2070](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L2063-L2070), [rdb.c#L2145-L2146](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L2145-L2146), [redis.conf#L523-L536](https://github.com/redis/redis/blob/8.10.3/redis.conf#L523-L536), [config.c#L3400](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3400), [config.c#L3404](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3404)

#### S9 · `mutate` rdb · `rename()`으로 한 번에 바꾼다
- **Subtitle:** 완성된 임시 파일을 `dump.rdb`로 rename하고 디렉터리도 fsync한다. 반쯤 쓴 RDB는 남지 않는다.
- **Prose:**
  > 자식이 직접 `rename(temp-<pid>.rdb, dump.rdb)`를 합니다. rename은 원자적이라 읽는 쪽은 옛 파일이나 새 파일 중 하나만 봅니다.
  > 그래서 Redis가 돌고 있을 때 RDB 파일을 그대로 복사해 백업해도 안전합니다.
- **Facts:**
  - `dbfilename`: `dump.rdb`
  - Docs: "the RDB is never modified once produced … renamed into its final destination atomically using rename(2)"
- **Event log:** `child → rdb · File · rename temp-48213.rdb → dump.rdb · —`
- **State (rdb: files in `dir`):**
  - before: `dump.rdb (old, t−301 s)`, `temp-48213.rdb (complete)`
  - after: `dump.rdb (new)`
- **Sources:** [rdb.c#L2180-L2215](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L2180-L2215), [redis.conf#L554](https://github.com/redis/redis/blob/8.10.3/redis.conf#L554), [persistence.md#L321-L324](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L321-L324)

#### S10 · `move` child → parent · COW 사용량을 알리고 종료
- **Subtitle:** child info pipe로 COW 크기를 보내고 exit code 0으로 끝난다.
- **Prose:**
  > 자식은 `sendChildCowInfo()`로 copy-on-write 크기를 pipe에 쓰고, `Fork CoW for RDB: current … MB, peak … MB` 로그를 남깁니다.
  > 부모는 1초마다 pipe를 읽어 `current_cow_size`를 갱신합니다. 저장이 끝나면 peak 값이 `rdb_last_cow_size`가 됩니다.
- **Token:** `data` · `CHILD_INFO_TYPE_RDB_COW_SIZE`
- **Facts:**
  - Parent reads the pipe every 1000 ms (`run_with_period(1000) receiveChildInfo()`)
  - `rdb_last_cow_size` = peak COW during the save
- **Event log:** `child → parent · Process · child info: COW peak 38 MB (E.G.), exit 0 · —`
- **Sources:** [rdb.c#L2223-L2255](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L2223-L2255), [childinfo.c#L71-L114](https://github.com/redis/redis/blob/8.10.3/src/childinfo.c#L71-L114), [server.c#L1702](https://github.com/redis/redis/blob/8.10.3/src/server.c#L1702)

#### S11 · `mutate` parent · 끝 처리: dirty를 빼고 lastsave 갱신
- **Subtitle:** `backgroundSaveDoneHandler`가 저장 중에 생긴 변경만 `dirty`에 남긴다.
- **Prose:**
  > 부모는 `SIGCHLD`로 자식 종료를 알고 `backgroundSaveDoneHandler()`를 부릅니다.
  > `dirty`에서 fork 시점의 값을 빼 저장 중 생긴 변경만 남기고, `lastsave`와 `lastbgsave_status = ok`를 기록합니다.
  > 자식이 signal로 죽었으면 임시 파일을 지웁니다.
- **Facts:**
  - `dirty = dirty − dirty_before_bgsave`
  - Log: `Background saving terminated with success`
- **Event log:** `parent → parent · Process · backgroundSaveDoneHandler ok · 1.8 s total (E.G.)`
- **State (parent: save state):**
  - before: `dirty = 140 (E.G.)`, `dirty_before_bgsave = 100`, `lastbgsave_status = —`
  - after: `dirty = 40`, `lastsave = now`, `lastbgsave_status = ok`, `child_type = none`, `dict resize = ENABLE`
- **Sources:** [rdb.c#L5184-L5212](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L5184-L5212), [rdb.c#L5245](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L5245)

#### S12 · `mutate` parent · 저장이 실패하면 쓰기를 막는다 (`MISCONF`)
- **Subtitle:** `stop-writes-on-bgsave-error yes`(기본) — 마지막 BGSAVE가 실패했으면 쓰기 명령을 거절한다.
- **Prose:**
  > 디스크가 꽉 차는 등으로 BGSAVE가 실패하면, 기본 설정에서는 쓰기 명령을 `-MISCONF`로 거절합니다. 저장이 안 되는 줄 모르고 쓰는 것을 막으려는 것입니다.
  > 다음 BGSAVE가 성공하면 다시 받습니다.
  > RDB만 쓰면 마지막 스냅샷 이후 몇 분치 데이터를 잃을 수 있습니다. 그래서 docs는 RDB와 AOF를 함께 쓰라고 권합니다(lesson 5).
- **Facts:**
  - `stop-writes-on-bgsave-error`: yes
  - Error starts with: `-MISCONF Redis is configured to save RDB snapshots, but it's currently unable to persist to disk.`
  - Docs: with RDB "you should be prepared to lose the latest minutes of data"
- **Event log:** `client → parent · RESP2 · SET x 1 → -MISCONF … · —`
- **State (parent):**
  - before: `lastbgsave_status = ok`, `writes = accepted`
  - after: `lastbgsave_status = err`, `writes = -MISCONF`
- **Sources:** [redis.conf#L521](https://github.com/redis/redis/blob/8.10.3/redis.conf#L521), [config.c#L3407](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3407), [server.c#L2244](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2244), [persistence.md#L37](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L37), [persistence.md#L61-L69](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L61-L69)

### Decoder records

**D4.1 RDB file start (`REDIS0015` + first AUX field).** Layers: magic · version · AUX.

| Offset | Bytes (hex) | Field | Value |
|---|---|---|---|
| 0–4 | `52 45 44 49 53` | magic | `REDIS` |
| 5–8 | `30 30 31 35` | rdb version | `0015` (ASCII) |
| 9 | `FA` | opcode | `RDB_OPCODE_AUX` (250) |
| 10 | `09` | key length | 9 (`00`·001001, 6-bit length) |
| 11–19 | `72 65 64 69 73 2D 76 65 72` | key | `redis-ver` |
| 20 | `06` | value length | 6 |
| 21–26 | `38 2E 31 30 2E 33` | value | `8.10.3` |
| 27… | `FA 0A 72 65 64 69 73 2D 62 69 74 73 …` | next AUX | `redis-bits` = `64` (value bytes: see Unverified) |

The other AUX fields are `ctime` (E.G.), `used-mem` (E.G.), and `aof-base` (`0` for a plain RDB, `1` for an AOF preamble). Sources: [rdb.c#L2036-L2037](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L2036-L2037), [rdb.c#L1738-L1795](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L1738-L1795), [rdb.h#L22-L41](https://github.com/redis/redis/blob/8.10.3/src/rdb.h#L22-L41).

**D4.2 RDB entry: db0 header and `user:1` = `alice` with a ms expire (28 B).** Layers: DB header · expire · type · key · value.

| Offset | Bytes (hex) | Field | Value | E.G.? |
|---|---|---|---|---|
| 0 | `FE` | opcode | `SELECTDB` (254) | |
| 1 | `00` | db number | 0 | |
| 2 | `FB` | opcode | `RESIZEDB` (251) | |
| 3 | `01` | db_size | 1 key | E.G. |
| 4 | `01` | expires_size | 1 key with TTL | E.G. |
| 5 | `FC` | opcode | `EXPIRETIME_MS` (252) | |
| 6–13 | `60 E6 DB A3 A1 01 00 00` | expire | int64 LE = 1793750460000 = 2026-11-04T00:01:00Z | E.G. |
| 14 | `00` | value type | `RDB_TYPE_STRING` (0) | |
| 15 | `06` | key length | 6 | |
| 16–21 | `75 73 65 72 3A 31` | key | `user:1` | |
| 22 | `05` | value length | 5 | |
| 23–27 | `61 6C 69 63 65` | value | `alice` | |

Length prefixes: `00xxxxxx` 6-bit, `01xxxxxx xxxxxxxx` 14-bit big-endian, `0x80` + 32-bit big-endian, `0x81` + 64-bit big-endian, `11xxxxxx` special (`0xC0`/`C1`/`C2` = int8/16/32 little-endian, `0xC3` = LZF). Sources: [rdb.c#L1930-L1952](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L1930-L1952), [rdb.c#L1689-L1729](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L1689-L1729), [rdb.c#L135-L139](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L135-L139), [rdb.h#L22-L50](https://github.com/redis/redis/blob/8.10.3/src/rdb.h#L22-L50), [rdb.c#L176-L206](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L176-L206), [rdb.c#L270-L290](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L270-L290). Computed from the writer code, not dumped from a live file.

### Self-check

1. **Q:** BGSAVE 중에도 쓰기를 받을 수 있는 이유는? **A:** fork한 자식이 fork 시점의 메모리를 보고 파일을 쓰고, 부모는 계속 요청을 처리한다. 부모가 쓰는 페이지만 copy-on-write로 복사된다.
2. **Q:** BGSAVE 중 메모리가 최대 얼마까지 늘 수 있나? 무엇으로 확인하나? **A:** 저장 중 부모가 건드린 페이지만큼 늘고, 모든 페이지를 건드리면 거의 두 배. `INFO persistence`의 `current_cow_size`, `rdb_last_cow_size`로 본다.
3. **Q:** fork 중 dict resize를 피하는 이유는? **A:** resize(rehash)는 많은 페이지를 건드려 COW 복사를 늘린다. 그래서 부모는 load factor 4 이상일 때만 resize하고, 자식은 resize하지 않는다.
4. **Q:** RDB 파일이 반쯤 쓰인 채 남지 않는 이유는? **A:** `temp-<pid>.rdb`에 다 쓰고 fsync한 뒤 `rename()`으로 원자적으로 바꾸기 때문.
5. **Q:** `-MISCONF` 오류는 언제 나오나? **A:** `stop-writes-on-bgsave-error yes`(기본)에서 마지막 BGSAVE가 실패했을 때 쓰기 명령에.
6. **Q:** 기본 save point와 RDB만 쓸 때의 데이터 손실 범위는? **A:** `3600 1 300 100 60 10000`. 마지막 스냅샷 이후의 쓰기(몇 분치)를 잃을 수 있다.

---

## Lesson 5. `aof`: 모든 쓰기를 기록한다, AOF와 multi-part rewrite

**Goal.** Follow one write into the AOF buffer, out to the file, and onto the disk under each `appendfsync` policy, then watch a rewrite produce a new BASE file while new writes keep going to a fresh INCR file.

**Interview questions it answers**
- `appendfsync` 세 가지의 차이와 각각 잃을 수 있는 데이터는?
- `everysec`은 어떻게 main thread를 막지 않고 fsync하나? 디스크가 느리면?
- AOF rewrite는 왜 필요하고, 7.0 이후 multi-part AOF에서는 어떻게 동작하나?
- AOF에 `SET k v EX 60`은 어떤 모양으로 남나?

**Nodes**

| id | label | sublabel | kind | Illustration idea | First appears |
|---|---|---|---|---|---|
| `client` | app | | `client` | Laptop | S2 |
| `main` | Redis main | `aof_buf` | `framework` | Gear with a notepad | S2 |
| `bio` | bio thread | `BIO_AOF_FSYNC` | `framework` | Small worker gear with a stopwatch | S6 |
| `pagecache` | Page cache | kernel | `container` | Translucent box over the disk | S4 |
| `dir` | appendonlydir/ | base · incr · manifest | `storage` | Folder with three file tabs | S1 |
| `child` | redis-aof-rewrite | fork child | `container` | Dashed gear | S11 |

**Layer selector:** `Command` (propagation) · `Buffer` (`aof_buf`, page cache) · `Disk` (fsync, files) · `Manifest`.

### Steps

#### S1 · `mutate` dir · AOF를 켜면 디렉터리 하나에 세 종류 파일
- **Subtitle:** `appendonly yes` → `appendonlydir/`에 BASE, INCR, manifest. 7.0부터의 multi-part AOF.
- **Prose:**
  > AOF는 기본으로 꺼져 있습니다(`appendonly no`). 켜면 `appenddirname`(기본 `appendonlydir`) 아래에 파일이 생깁니다.
  > BASE는 마지막 rewrite 시점의 스냅샷(기본은 RDB 형식), INCR는 그 뒤의 쓰기 명령, manifest는 어떤 파일을 어떤 순서로 읽을지 적은 목록입니다.
  > 7.0 이전에는 파일 하나(`appendonly.aof`)였습니다.
- **Facts:**
  - `appendonly`: no; `appendfilename`: `appendonly.aof`; `appenddirname`: `appendonlydir`
  - BASE: at most one; file name `<appendfilename>.<seq>.base.rdb` (`.base.aof` without preamble)
  - INCR: `<appendfilename>.<seq>.incr.aof`; manifest: `appendonly.aof.manifest`
- **Event log:** `main → dir · Manifest · create appendonly.aof.1.base.rdb, appendonly.aof.1.incr.aof · —`
- **State (dir: manifest):**
  - before: `(AOF off)`
  - after: `appendonly.aof.1.base.rdb seq 1 type b`, `appendonly.aof.1.incr.aof seq 1 type i`
- **Sources:** [redis.conf#L1491](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1491), [redis.conf#L1512-L1524](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1512-L1524), [aof.c#L44-L71](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L44-L71), [aof.c#L174-L181](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L174-L181), [aof.c#L436-L473](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L436-L473), [persistence.md#L120-L123](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L120-L123)

#### S2 · `move` client → main · `SET user:1 alice EX 60`
- **Subtitle:** 명령은 먼저 실행되고, 바뀐 데이터만 AOF와 replica로 전파된다.
- **Prose:**
  > AOF는 명령을 실행한 뒤에 기록합니다(write-ahead가 아니라 write-after). 실패한 명령이나 읽기 명령은 남지 않습니다.
  > 기록 대상은 `call()`이 `dirty`를 보고 예약한 전파 목록입니다(lesson 1 S10).
- **Token:** `request` · `SET user:1 alice EX 60`
- **Facts:**
  - Only commands that changed data are propagated (`PROPAGATE_AOF|PROPAGATE_REPL`)
  - AOF and replication use the same propagated argv
- **Event log:** `client → main · RESP2 · SET user:1 alice EX 60 · 52 B`
- **Sources:** [server.c#L4174-L4196](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4174-L4196), [aof.c#L1686-L1688](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1686-L1688)

#### S3 · `mutate` main · `EX 60`은 `PXAT <절대 ms>`로 바뀌어 `aof_buf`에
- **Subtitle:** 상대 TTL을 절대 시각으로 바꿔 적는다. 재생할 때 TTL이 늘어나지 않게.
- **Prose:**
  > `SET … EX 60`은 전파 전에 `SET … PXAT 1793750460000`으로 바뀝니다. AOF를 나중에 재생해도 만료 시각이 같습니다.
  > DB가 바뀌면 앞에 `SELECT`를 넣습니다. 그리고 RESP 형식 그대로 `aof_buf`에 붙입니다.
  > `aof-timestamp-enabled yes`면 1초에 한 번 `#TS:<unix 초>` 줄을 넣습니다(기본 no).
- **Facts:**
  - `SET … EX/PX/EXAT` → `SET … PXAT <ms>`; `EXPIRE` family → `PEXPIREAT`
  - `SELECT` written when the db differs from `aof_selected_db` (starts at −1)
  - `aof-timestamp-enabled`: no; annotation `#TS:<seconds>\r\n`
- **Event log:** `main → main · Buffer · feedAppendOnlyFile SELECT 0 + SET … PXAT · 89 B`
- **State (main: aof_buf):**
  - before: `""`
  - after: `"*2 SELECT 0" + "*5 SET user:1 alice PXAT 1793750460000"` (89 B)
- **Record:** D5.1
- **Sources:** [t_string.c#L193-L205](https://github.com/redis/redis/blob/8.10.3/src/t_string.c#L193-L205), [expire.c#L824-L827](https://github.com/redis/redis/blob/8.10.3/src/expire.c#L824-L827), [aof.c#L1609-L1648](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1609-L1648), [aof.c#L1674-L1688](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1674-L1688), [server.c#L2458](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2458), [redis.conf#L1645](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1645)

#### S4 · `move` main → pagecache · 응답 전에 `write()`
- **Subtitle:** `beforeSleep`이 client에게 답하기 전에 `flushAppendOnlyFile()`로 `aof_buf`를 파일에 쓴다.
- **Prose:**
  > main thread는 잠들기 전 `beforeSleep()`에서 먼저 `aof_buf`를 `write()`하고, 그다음 응답을 보냅니다.
  > `write()`는 커널 page cache까지만 보냅니다. 디스크에 확실히 남기려면 `fsync()`가 필요하고, 그 시점을 정하는 것이 `appendfsync`입니다.
- **Token:** `data` · `aof_buf 89 B`
- **Facts:**
  - Order in `beforeSleep`: AOF flush before `handleClientsWithPendingWrites`
  - `write()` reaches the page cache; durability needs `fsync()`
- **Event log:** `main → pagecache · Buffer · write(appendonly.aof.1.incr.aof) · 89 B`
- **Sources:** [server.c#L2053-L2057](https://github.com/redis/redis/blob/8.10.3/src/server.c#L2053-L2057), [persistence.md#L159-L166](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L159-L166)

#### S5 · `mutate` pagecache · `always`: 응답 전에 main thread가 fsync
- **Subtitle:** 가장 안전하고 가장 느리다. fsync가 실패하면 Redis가 종료한다.
- **Prose:**
  > `appendfsync always`면 main thread가 `write()` 직후 직접 fsync합니다. 응답은 그 뒤에 나갑니다.
  > 같은 루프에서 처리한 여러 client의 쓰기는 한 번의 write와 fsync로 묶입니다(group commit).
  > fsync가 실패하면 데이터 일관성을 보장할 수 없으므로 프로세스를 종료합니다.
- **Facts:**
  - Docs: "a single write and a single fsync (before sending the replies)"
  - fsync error under `always`: Redis exits
- **Event log:** `pagecache → dir · Disk · fsync (main thread) · 2 ms (E.G.)`
- **State (pagecache: incr file):**
  - before: `dirty in page cache = 89 B`
  - after: `on disk = 89 B`
- **Sources:** [aof.c#L1581-L1597](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1581-L1597), [persistence.md#L159-L166](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L159-L166), [redis.conf#L1538-L1551](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1538-L1551)

#### S6 · `move` main → bio · `everysec`(기본): 1초마다 bio thread가 fsync
- **Subtitle:** 마지막 fsync 후 1000 ms가 지났고 진행 중인 fsync가 없으면 bio job을 넣는다.
- **Prose:**
  > 기본 `everysec`에서는 main thread가 fsync하지 않습니다. 대신 background I/O(bio) thread에 fsync job을 넘깁니다.
  > 조건은 지난 fsync 후 1000 ms 이상 지났고, 이미 대기 중인 fsync job이 없을 것입니다.
  > 그래서 정전 시 최대 약 1초치(아래 S7의 경우 2초 이상) 쓰기를 잃을 수 있습니다.
- **Token:** `call` · `bioCreateFsyncJob(fd)`
- **Facts:**
  - `appendfsync` default: `everysec`
  - Condition: `mstime − aof_last_fsync ≥ 1000` and no pending `BIO_AOF_FSYNC` job
  - Docs: "you can only lose one second worth of writes"
- **Event log:** `main → bio · Disk · bioCreateFsyncJob · —`
- **Sources:** [config.c#L3492](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3492), [aof.c#L1224-L1235](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1224-L1235), [aof.c#L1598-L1604](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1598-L1604), [persistence.md#L42](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L42)

#### S7 · `mutate` main · 디스크가 느리면 write를 최대 2초 미룬다
- **Subtitle:** 이전 fsync가 아직 안 끝났으면 `write()`를 미루고, 2초가 넘으면 기다리지 않고 쓴다.
- **Prose:**
  > fsync 중인 파일에 `write()`하면 커널에서 막힐 수 있습니다. 그래서 `everysec`에서는 bio fsync가 진행 중이면 write를 미룹니다.
  > 2초까지는 계속 미루고, 넘으면 `aof_delayed_fsync`를 올리고 경고를 남긴 뒤 그냥 씁니다.
  > 미루는 동안의 쓰기는 버퍼에만 있으므로, 디스크가 느릴 때 손실 범위는 1초보다 길어집니다.
- **Facts:**
  - Postpone window: < 2000 ms
  - Log: `Asynchronous AOF fsync is taking too long (disk is busy?). Writing the AOF buffer without waiting for fsync to complete, this may slow down Redis.`
  - INFO counter: `aof_delayed_fsync`
- **Event log:** `main → main · Buffer · flush postponed, fsync in progress · 2000 ms max`
- **State (main):**
  - before: `aof_flush_postponed_start = 0`, `aof_delayed_fsync = 0`
  - after (2 s later): `aof_flush_postponed_start = t`, `aof_delayed_fsync = 1`, `write = forced`
- **Sources:** [aof.c#L1437-L1457](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1437-L1457), [server.c#L1748-L1754](https://github.com/redis/redis/blob/8.10.3/src/server.c#L1748-L1754)

#### S8 · `mutate` pagecache · `no`: fsync는 OS에 맡긴다
- **Subtitle:** Redis는 fsync하지 않는다. Linux는 보통 30초마다 내린다.
- **Prose:**
  > `appendfsync no`면 Redis는 `write()`만 하고 fsync는 커널에 맡깁니다. 가장 빠르지만 손실 범위가 가장 큽니다.
  > `no-appendfsync-on-rewrite yes`로 하면 rewrite나 BGSAVE 자식이 있는 동안에도 fsync를 건너뜁니다(기본 no).
- **Facts:**
  - Docs: "Normally Linux will flush data every 30 seconds"
  - `no-appendfsync-on-rewrite`: no
- **Event log:** `pagecache → dir · Disk · kernel writeback · ~30 s (Linux, per docs)`
- **State (pagecache):**
  - before: `dirty = 89 B`
  - after: `dirty = 89 B (until kernel writeback)`
- **Sources:** [persistence.md#L159-L166](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L159-L166), [redis.conf#L1572](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1572), [aof.c#L1576-L1578](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1576-L1578)

#### S9 · `mutate` main · rewrite 시점: 2배 그리고 64 MB
- **Subtitle:** INCR가 쌓여 AOF가 BASE 대비 100% 커지고 64 MB를 넘으면 rewrite한다.
- **Prose:**
  > 같은 키를 1000번 `INCR`하면 AOF에는 1000줄이 남지만 필요한 것은 마지막 값 하나입니다. rewrite는 현재 메모리로 새 BASE를 만들어 이것을 줄입니다.
  > `serverCron`은 `growth = 현재 크기 × 100 / base 크기 − 100`이 `auto-aof-rewrite-percentage`(100) 이상이고 크기가 `auto-aof-rewrite-min-size`(64 MB) 이상이면 시작합니다.
  > `BGREWRITEAOF`로 직접 시작할 수도 있습니다.
- **Facts:**
  - `auto-aof-rewrite-percentage`: 100; `auto-aof-rewrite-min-size`: 64mb
  - Skipped while a `BACKUP` (8.10) is in progress or while rewrites are being limited after failures
- **Event log:** `main → main · Manifest · growth 112% ≥ 100%, size 72 MB (E.G.) → rewrite · —`
- **State (main):**
  - before: `aof_base_size = 34 MB (E.G.)`, `aof_current_size = 72 MB (E.G.)`
  - after: `rewrite = scheduled`
- **Sources:** [redis.conf#L1591-L1592](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1591-L1592), [config.c#L3509](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3509), [config.c#L3616](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3616), [server.c#L1730-L1742](https://github.com/redis/redis/blob/8.10.3/src/server.c#L1730-L1742)

#### S10 · `mutate` dir · fork 전에 새 INCR 파일부터 연다
- **Subtitle:** 부모가 `appendonly.aof.2.incr.aof`를 열고 manifest를 동기적으로 갱신한 뒤 fork한다.
- **Prose:**
  > 7.0 이후 rewrite의 첫 단계는 부모가 새 INCR 파일을 여는 것입니다. 이후 모든 쓰기는 이 파일로 갑니다.
  > manifest는 임시 파일에 쓰고 fsync한 뒤 rename으로 바꿉니다. 중간에 죽어도 manifest는 옛것 아니면 새것입니다.
  > 그 다음에 fork합니다. 7.0 이전처럼 rewrite 중 쓰기를 메모리 buffer에 모았다가 다시 쓰는 일이 없습니다.
- **Facts:**
  - Order: `openNewIncrAofForAppend()` then `redisFork(CHILD_TYPE_AOF)`
  - Manifest update: temp file → fsync → `rename()` → dir fsync
  - Docs: the pre-7.0 rewrite buffer cost memory and wrote data "to disk twice"
- **Event log:** `main → dir · Manifest · open appendonly.aof.2.incr.aof, persist manifest · —`
- **State (dir: manifest):**
  - before: `1.base.rdb b`, `1.incr.aof i`
  - after: `1.base.rdb b`, `1.incr.aof i`, `2.incr.aof i`
- **Sources:** [aof.c#L3218-L3245](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L3218-L3245), [aof.c#L1041-L1053](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1041-L1053), [aof.c#L576-L600](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L576-L600), [persistence.md#L52-L56](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L52-L56), [persistence.md#L146-L151](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L146-L151)

#### S11 · `move` main → child · 자식은 메모리를 새 BASE로 쓴다
- **Subtitle:** `aof-use-rdb-preamble yes`(기본)면 BASE는 RDB 형식. 명령을 나열하는 것보다 작고 빠르다.
- **Prose:**
  > 자식은 fork 시점 메모리를 `temp-rewriteaof-bg-<pid>.aof`에 씁니다. RDB와 같은 copy-on-write를 씁니다.
  > preamble이 켜져 있으면 `rdbSaveRio()`로 RDB 형식을 쓰고, AUX `aof-base`를 1로 둡니다.
  > 그동안 부모는 새 쓰기를 `2.incr.aof`에만 붙입니다.
- **Token:** `call` · `fork → rewriteAppendOnlyFile`
- **Facts:**
  - `aof-use-rdb-preamble`: yes
  - Temp file: `temp-rewriteaof-bg-<pid>.aof`
  - Rewrite refused while a `BACKUP` is snapshotting (8.10)
- **Event log:** `main → child · Disk · fork pid 48990 (E.G.), write RDB preamble · 21 MB (E.G.)`
- **Sources:** [aof.c#L3139-L3163](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L3139-L3163), [aof.c#L3183-L3205](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L3183-L3205), [redis.conf#L1640](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1640), [persistence.md#L224-L225](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L224-L225)

#### S12 · `mutate` dir · 끝나면 BASE 교체, 옛 파일은 history
- **Subtitle:** temp → `2.base.rdb` rename, 옛 BASE와 rewrite 전 INCR는 history로 표시, manifest 교체, history 삭제.
- **Prose:**
  > 부모의 done handler는 임시 파일을 새 BASE 이름으로 rename합니다.
  > 옛 BASE와 rewrite에 포함된 INCR 파일을 history(`type h`)로 바꾸고 manifest를 원자적으로 교체합니다.
  > history 파일은 bio thread가 지웁니다. 이제 manifest는 `2.base.rdb`와 `2.incr.aof` 두 줄입니다.
- **Facts:**
  - Steps (aof.c comment): 4a new BASE name, 4b rename, 4c mark INCR as history, 4d persist manifest, 4e delete history via bio
  - Manifest line format: `file <name> seq <n> type <b|h|i>` (8.x adds optional `startoffset`/`endoffset` on INCR lines)
- **Event log:** `main → dir · Manifest · rename → appendonly.aof.2.base.rdb, history ×2 deleted · —`
- **State (dir: manifest):**
  - before: `1.base.rdb b`, `1.incr.aof i`, `2.incr.aof i`
  - after: `2.base.rdb b`, `2.incr.aof i` (history `1.base.rdb`, `1.incr.aof` removed)
- **Record:** D5.2
- **Sources:** [aof.c#L3183-L3196](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L3183-L3196), [aof.c#L3847-L3946](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L3847-L3946), [aof.c#L689-L713](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L689-L713), [aof.c#L123-L135](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L123-L135), [aof-multi-part.tcl#L1344-L1348](https://github.com/redis/redis/blob/8.10.3/tests/integration/aof-multi-part.tcl#L1344-L1348)

#### S13 · `move` dir → main · 재시작: manifest 순서대로 load
- **Subtitle:** BASE(파일이 `REDIS`로 시작하면 RDB로) → INCR 순서로 읽는다. 마지막 파일 끝이 잘렸으면 잘라내고 load.
- **Prose:**
  > 시작할 때 manifest를 읽고 BASE부터 load합니다. 파일이 `REDIS`로 시작하면 RDB로, 아니면 명령으로 읽습니다.
  > 그다음 INCR 파일의 명령을 재생합니다. `#`로 시작하는 annotation 줄은 건너뜁니다.
  > 전원이 꺼져 마지막 명령이 잘렸으면 `aof-load-truncated yes`(기본)에 따라 마지막 파일만 잘라내고 계속합니다. 중간 파일이 잘렸으면 시작하지 않습니다.
- **Token:** `data` · `manifest → base → incr`
- **Facts:**
  - `aof-load-truncated`: yes (only for the last file)
  - `aof-load-corrupt-tail-max-size`: 0 (off; 8.x)
  - Repair tool: `redis-check-aof --fix <file.manifest|file.aof>`
- **Event log:** `dir → main · Disk · load 2.base.rdb (RDB preamble) + 2.incr.aof · 1.4 s (E.G.)`
- **Sources:** [aof.c#L1853-L1864](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1853-L1864), [aof.c#L1914](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1914), [aof.c#L2041-L2069](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L2041-L2069), [aof.c#L2158-L2162](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L2158-L2162), [redis.conf#L1616-L1635](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1616-L1635), [redis-check-aof.c#L586](https://github.com/redis/redis/blob/8.10.3/src/redis-check-aof.c#L586), [persistence.md#L192-L220](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L192-L220)

#### S14 · `mutate` main · RDB와 AOF를 같이 쓰라는 권고
- **Subtitle:** docs 권고: PostgreSQL 수준의 안전을 원하면 둘 다. AOF만 쓰는 것은 권하지 않는다.
- **Prose:**
  > RDB는 백업과 빠른 재시작에 좋고, AOF는 손실 범위를 1초 안팎으로 줄입니다.
  > docs는 둘을 함께 쓰라고 하고, AOF만 쓰는 것은 권하지 않습니다. RDB 스냅샷이 백업에 유리하기 때문입니다.
  > 8.10부터는 MP-AOF 파일 묶음을 그대로 백업하는 `BACKUP` 명령도 있습니다.
- **Facts:**
  - Docs: "you should use both persistence methods" for PostgreSQL-like safety
  - Docs: "There are many users using AOF alone, but we discourage it"
  - `BACKUP`: since 8.10.0, built on MP-AOF
- **Event log:** `main → main · Disk · CONFIG GET appendonly → yes, save → 3600 1 … · —`
- **State (main: persistence config):**
  - before: `appendonly = no`, `save = 3600 1 300 100 60 10000`
  - after: `appendonly = yes`, `appendfsync = everysec`, `save = 3600 1 300 100 60 10000`
- **Sources:** [persistence.md#L61-L69](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L61-L69), [persistence.md#L364-L368](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/persistence.md#L364-L368), [00-RELEASENOTES#L82](https://github.com/redis/redis/blob/8.10.3/00-RELEASENOTES#L82)

### Decoder records

**D5.1 AOF bytes for `SET user:1 alice EX 60` (first write to db 0, `aof-timestamp-enabled yes`).** Layers: annotation · SELECT · SET.

| Bytes (text) | Field | Value | E.G.? |
|---|---|---|---|
| `#TS:1793750400\r\n` (16 B) | annotation | Unix seconds; only with `aof-timestamp-enabled yes`, at most once per second | E.G. |
| `*2\r\n$6\r\nSELECT\r\n$1\r\n0\r\n` (23 B) | SELECT | db 0, written because `aof_selected_db` was −1 | |
| `*5\r\n` | array header | 5 args | |
| `$3\r\nSET\r\n` | argv[0] | `SET` (case as sent by the client) | |
| `$6\r\nuser:1\r\n` | argv[1] | key | |
| `$5\r\nalice\r\n` | argv[2] | value | |
| `$4\r\nPXAT\r\n` | argv[3] | was `EX` | |
| `$13\r\n1793750460000\r\n` | argv[4] | 1793750400000 + 60000 | E.G. |

SET frame: 66 B. Without the annotation the whole record is 89 B. Sources: [aof.c#L1609-L1648](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1609-L1648), [aof.c#L1674-L1684](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1674-L1684), [t_string.c#L193-L205](https://github.com/redis/redis/blob/8.10.3/src/t_string.c#L193-L205), [t_string.c#L256-L260](https://github.com/redis/redis/blob/8.10.3/src/t_string.c#L256-L260).

**D5.2 Manifest after the rewrite.** Layers: one line per file.

```
file appendonly.aof.2.base.rdb seq 2 type b\n
file appendonly.aof.2.incr.aof seq 2 type i startoffset 1048576\n
```

| Token | Meaning |
|---|---|
| `file <name>` | file in `appenddirname` |
| `seq <n>` | sequence number; BASE and INCR count separately |
| `type b` / `h` / `i` | base / history / incr |
| `startoffset <n>` | replication offset when the INCR file was opened (8.x; value E.G.) |
| `endoffset <n>` | written on graceful close (8.x) |

Lines are ordered base, history, incr. Sources: [aof.c#L44-L71](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L44-L71), [aof.c#L123-L135](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L123-L135), [aof.c#L199-L231](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L199-L231), [aof.c#L1121-L1132](https://github.com/redis/redis/blob/8.10.3/src/aof.c#L1121-L1132).

### Self-check

1. **Q:** `appendfsync` 세 가지와 각각의 손실 범위는? **A:** `always`: 응답 전 fsync, 거의 손실 없음(가장 느림). `everysec`(기본): bio thread가 1초마다 fsync, 약 1초(디스크가 느리면 2초 이상). `no`: OS에 맡김, Linux 기준 약 30초.
2. **Q:** `everysec`이 main thread를 막지 않는 방법과, 디스크가 느릴 때의 동작은? **A:** fsync를 bio thread에 넘긴다. 이전 fsync가 진행 중이면 write를 최대 2초 미루고, 넘으면 `aof_delayed_fsync`를 올리고 그냥 쓴다.
3. **Q:** AOF에 `SET k v EX 60`은 어떻게 남나? 왜? **A:** `SET k v PXAT <절대 ms>`. 재생 시점과 관계없이 같은 만료 시각을 쓰기 위해서.
4. **Q:** 7.0 이후 AOF rewrite가 rewrite buffer 없이 동작하는 방법은? **A:** fork 전에 부모가 새 INCR 파일을 열어 이후 쓰기를 거기에 붙이고, 자식은 새 BASE만 만든다. 끝나면 manifest를 원자적으로 바꿔 옛 BASE/INCR를 history로 돌린다.
5. **Q:** 전원이 꺼져 AOF 끝이 잘렸다. 재시작하면? **A:** `aof-load-truncated yes`(기본)면 마지막 파일의 잘린 부분을 버리고 시작한다. 마지막이 아닌 파일이 잘렸으면 시작하지 않고 `redis-check-aof`로 고쳐야 한다.

---

## Lesson 6. `replication`: replid와 offset으로 따라잡기, 복제와 PSYNC

**Goal.** Follow a replica from its first connection (full sync over the 8.x rdb channel) through steady-state streaming, a short disconnect (partial resync from the backlog), and a failover (the promoted replica keeps the old ID as `replid2`), then show why a lock taken on the old master can be lost.

**Interview questions it answers**
- Redis 복제는 동기인가 비동기인가? `WAIT`을 쓰면 강한 일관성이 되나?
- `PSYNC`가 partial resync를 할 수 있는 조건은? backlog 크기 기본값은?
- full sync는 어떻게 동작하나? diskless replication이란?
- failover 뒤 다른 replica가 full sync 없이 새 master를 따라갈 수 있는 이유는?
- master-replica 구성에서 `SET NX` 분산 락이 안전하지 않은 이유는? Redlock은?

**Nodes**

| id | label | sublabel | kind | Illustration idea | First appears |
|---|---|---|---|---|---|
| `clientA` | client A | app | `client` | Laptop A | S9 |
| `master` | master | `replid`, `master_repl_offset` | `framework` | Gear with a crown | S1 |
| `backlog` | repl buffer | shared `replBufBlock`s + backlog | `framework` | Conveyor of blocks with refcount badges | S1 |
| `replica1` | replica-1 | | `framework` | Gear with a mirror outline | S2 |
| `replica2` | replica-2 | | `framework` | Second mirror gear | S12 |
| `clientB` | client B | app | `client` | Laptop B | S14 |

**Layer selector:** `Handshake` · `Full sync` · `Stream` (replication stream, ACK) · `Failover` · `Lock`.

**Example ID.** `replid = 8de1787ba490483314a4d30f1c628bc5025eb761` (E.G., 40 hex chars).

### Steps

#### S1 · `mutate` master · replication ID와 offset
- **Subtitle:** master는 데이터 이력마다 40자 hex `replid`를 갖고, 복제 스트림의 바이트 수를 `master_repl_offset`으로 센다.
- **Prose:**
  > replication ID는 "이 데이터셋의 이력"을 가리키는 랜덤 문자열입니다. offset은 그 이력에서 몇 바이트째인지입니다.
  > (replid, offset) 한 쌍이 데이터셋의 정확한 버전을 가리킵니다. offset은 replica가 없어도 늘어납니다.
  > 7.0 이후 backlog는 replica들과 같은 buffer block을 공유하는 view입니다. block마다 refcount가 있습니다.
- **Facts:**
  - `replid`: 40 hex chars (`CONFIG_RUN_ID_SIZE`)
  - `repl-backlog-size`: 1mb; allocated only once a replica connects
  - `repl-backlog-ttl`: 3600 s (replicas never free theirs)
- **Event log:** `master → master · Stream · replid=8de1…b761 (E.G.) offset=1048576 (E.G.) · —`
- **State (master):**
  - before: `replid = 8de1…b761`, `replid2 = 0000…`, `master_repl_offset = 1048576`, `backlog = none`
  - after: same, `backlog = 1 MB (created on first replica)`
- **Sources:** [replication.md#L74-L83](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L74-L83), [server.h#L133](https://github.com/redis/redis/blob/8.10.3/src/server.h#L133), [server.h#L2423-L2426](https://github.com/redis/redis/blob/8.10.3/src/server.h#L2423-L2426), [server.h#L1175-L1221](https://github.com/redis/redis/blob/8.10.3/src/server.h#L1175-L1221), [config.c#L3585](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3585), [config.c#L3614](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3614), [redis.conf#L777-L792](https://github.com/redis/redis/blob/8.10.3/redis.conf#L777-L792)

#### S2 · `move` replica1 → master · handshake: PING, REPLCONF
- **Subtitle:** `PING` 후 AUTH, `REPLCONF listening-port`, `REPLCONF capa eof capa psync2 capa rdb-channel-repl`를 한 번에 보낸다.
- **Prose:**
  > `REPLICAOF host port` 후 replica는 상태 기계를 따라 master에 붙습니다. 먼저 `PING`으로 연결을 확인합니다.
  > 다음 명령들은 pipeline으로 한 번에 보내고 답을 차례로 읽습니다. capa는 replica가 처리할 수 있는 기능입니다.
  > `eof`는 diskless 전송의 EOF 표시, `psync2`는 replid를 바꾸는 `+CONTINUE`, `rdb-channel-repl`은 8.x의 두 번째 연결을 뜻합니다.
- **Token:** `request` · `REPLCONF capa eof capa psync2 capa rdb-channel-repl`
- **Facts:**
  - States in order: `CONNECTING` → `RECEIVE_PING_REPLY` → `SEND_HANDSHAKE` → `RECEIVE_AUTH/PORT/IP/REQ/CLIENT_COMP/CAPA_REPLY` → `SEND_PSYNC` → `RECEIVE_PSYNC_REPLY` → `TRANSFER` → `CONNECTED`
  - `rdb-channel-repl` capa is sent when `repl-rdb-channel` is on (hidden config, default yes)
- **Event log:** `replica1 → master · Handshake · REPLCONF capa eof psync2 rdb-channel-repl · 92 B`
- **Sources:** [server.h#L536-L552](https://github.com/redis/redis/blob/8.10.3/src/server.h#L536-L552), [replication.c#L3172-L3195](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L3172-L3195), [replication.c#L3212-L3274](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L3212-L3274), [config.c#L3417](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3417)

#### S3 · `move` replica1 → master · `PSYNC ? -1`
- **Subtitle:** 처음이면 알고 있는 이력이 없으니 `?`와 `-1`로 full sync를 요청한다.
- **Prose:**
  > replica는 cached master(예전 연결 정보)가 있으면 그 replid와 offset+1을 보냅니다.
  > 처음 붙는 replica는 없으므로 `PSYNC ? -1`을 보냅니다. `?`는 "full resync를 원한다"는 뜻입니다.
- **Token:** `request` · `PSYNC ? -1`
- **Facts:**
  - First sync: `PSYNC ? -1`
  - Reconnect: `PSYNC <cached replid> <cached reploff + 1>`
- **Event log:** `replica1 → master · Handshake · PSYNC ? -1 · 30 B`
- **Record:** D6.1
- **Sources:** [replication.c#L2965-L2983](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L2965-L2983), [replication.c#L1023](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L1023)

#### S4 · `move` master → replica1 · `+RDBCHANNELSYNC`: RDB는 다른 연결로
- **Subtitle:** 8.x 기본(diskless + rdb channel)에서는 `+FULLRESYNC` 대신 `+RDBCHANNELSYNC <client id>`.
- **Prose:**
  > partial resync가 불가능하고 replica가 rdb channel을 지원하면 master는 `+RDBCHANNELSYNC <client id>`로 답합니다.
  > replica는 두 번째 연결(rdb channel)을 열어 `REPLCONF … rdb-only 1 rdb-channel 1 main-ch-client-id <id>`로 자신을 밝히고, 그 연결에서 full sync를 요청해 `+FULLRESYNC <replid> <offset>`을 받습니다.
  > 이 경로는 diskless sync가 켜져 있을 때만 쓰입니다. 끄면 예전처럼 한 연결에서 `+FULLRESYNC`를 받습니다.
- **Token:** `response` · `+RDBCHANNELSYNC 12`
- **Facts:**
  - Classic reply: `+FULLRESYNC <replid> <offset>`
  - 8.x reply: `+RDBCHANNELSYNC <cid>`, requires `repl-rdb-channel yes` and `repl-diskless-sync yes`
  - `repl-diskless-sync`: yes (default)
- **Event log:** `master → replica1 · Full sync · +RDBCHANNELSYNC 12 (E.G.) · 20 B`
- **Sources:** [replication.c#L1300-L1321](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L1300-L1321), [replication.c#L1502-L1504](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L1502-L1504), [replication.c#L3784-L3816](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L3784-L3816), [replication.c#L3890-L3901](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L3890-L3901), [replication.c#L992-L993](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L992-L993), [redis.conf#L679](https://github.com/redis/redis/blob/8.10.3/redis.conf#L679)

#### S5 · `mutate` master · 5초 기다렸다 fork, RDB를 소켓으로 바로
- **Subtitle:** `repl-diskless-sync-delay 5` — 다른 replica도 함께 받도록 기다린 뒤 fork해 RDB를 디스크 없이 보낸다.
- **Prose:**
  > master는 다른 replica가 붙을 시간을 주려고 기본 5초 기다립니다. 그다음 fork하고, 자식이 RDB를 rdb channel로 바로 씁니다.
  > fork 전에 main channel을 backlog의 스냅샷 끝 offset에 붙여 둡니다. RDB 이후의 쓰기를 빠짐없이 보내기 위해서입니다.
  > 디스크 없이 보내므로 크기를 미리 모릅니다. 그래서 `$EOF:<40자 hex>`로 시작하고 같은 40자로 끝냅니다.
- **Facts:**
  - `repl-diskless-sync-delay`: 5 s; `repl-diskless-sync-max-replicas`: 0 (no early start)
  - EOF marker: `$EOF:<40 random hex>\r\n` … same 40 bytes at the end (`RDB_EOF_MARK_SIZE` 40)
  - Log: `Starting BGSAVE for SYNC with target: …`
- **Event log:** `master → replica1 · Full sync · fork, RDB over rdb channel · 85 MB (E.G.)`
- **State (master: replica-1 state):**
  - before: `main channel = WAIT_RDB_CHANNEL`
  - after: `main channel = attached to backlog at offset 1048576 (E.G.)`, `rdb channel = streaming RDB`
- **Record:** D6.2
- **Sources:** [redis.conf#L689-L697](https://github.com/redis/redis/blob/8.10.3/redis.conf#L689-L697), [config.c#L3521](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3521), [replication.c#L1133-L1138](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L1133-L1138), [rdb.c#L2083-L2098](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L2083-L2098), [server.h#L134](https://github.com/redis/redis/blob/8.10.3/src/server.h#L134), [replication.c#L3784-L3816](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L3784-L3816), [replication.md#L152-L154](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L152-L154)

#### S6 · `mutate` replica1 · RDB를 받는 동안 새 쓰기는 replica가 쌓아 둔다
- **Subtitle:** main channel로 오는 복제 스트림을 replica 쪽 buffer에 모았다가, RDB load 후 적용한다.
- **Prose:**
  > rdb channel 방식에서는 RDB와 그 뒤의 쓰기가 두 연결로 동시에 옵니다. 쓰기는 replica의 로컬 buffer에 쌓입니다.
  > 예전 방식에서는 이 buffer가 master 쪽에 있었습니다. 지금은 master 부담이 replica로 옮겨졌습니다.
  > RDB load가 끝나면 rdb channel을 닫고, 쌓아 둔 스트림을 적용하면 sync가 끝납니다.
- **Facts:**
  - `replica-full-sync-buffer-limit`: 0 = inherit the replica `client-output-buffer-limit` hard limit
  - `repl-diskless-load`: `disabled` (the replica saves the RDB to disk, then loads it)
- **Event log:** `replica1 → replica1 · Full sync · load RDB 85 MB, apply buffered stream 2.3 MB (E.G.) · 4.1 s (E.G.)`
- **State (replica1):**
  - before: `state = TRANSFER`, `local buffer = 0`
  - after: `state = CONNECTED`, `master_replid = 8de1…b761`, `offset = 1048576 + applied stream`
- **Sources:** [replication.c#L3784-L3816](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L3784-L3816), [redis.conf#L718-L732](https://github.com/redis/redis/blob/8.10.3/redis.conf#L718-L732), [redis.conf#L796-L810](https://github.com/redis/redis/blob/8.10.3/redis.conf#L796-L810), [config.c#L3586](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3586)

#### S7 · `move` master → replica1 · 평상시: 명령을 RESP 그대로 흘려보낸다
- **Subtitle:** 쓰기 명령을 공유 replication buffer에 붙이고, 그 바이트 수만큼 offset이 늘어난다.
- **Prose:**
  > master는 전파할 명령을 `replicationFeedSlaves()`로 RESP 형식 그대로 공유 buffer에 씁니다. DB가 바뀌면 `SELECT`를 먼저 넣습니다.
  > `master_repl_offset`은 쓴 바이트 수만큼 늘어납니다. 같은 block을 backlog와 모든 replica가 refcount로 공유합니다.
  > master는 replica의 처리를 기다리지 않고 바로 client에게 답합니다(비동기).
- **Token:** `data` · `SET user:1 alice` (36 B)
- **Facts:**
  - `master_repl_offset += total bytes written`
  - Docs: "the master does not wait every time for a command to be processed by the replicas"
- **Event log:** `master → replica1 · Stream · *3 SET user:1 alice · 36 B`
- **State (master):**
  - before: `master_repl_offset = 1048576`
  - after: `master_repl_offset = 1048612`
- **Sources:** [replication.c#L596](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L596), [replication.c#L639-L733](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L639-L733), [replication.md#L25-L30](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L25-L30)

#### S8 · `move` replica1 → master · 1초마다 `REPLCONF ACK <offset>`
- **Subtitle:** replica는 처리한 offset을 매초 알리고, master는 10초마다 PING을 보낸다.
- **Prose:**
  > replica는 `replicationCron`(1초 주기)마다 `REPLCONF ACK <offset>`을 보냅니다. AOF fsync offset 추적이 필요하면 `FACK`도 붙습니다.
  > master는 스트림이 조용하면 `repl-ping-replica-period`(10초)마다 PING을 보냅니다.
  > 둘 다 `repl-timeout`(60초) 동안 아무것도 받지 못하면 연결을 끊습니다.
- **Token:** `data` · `REPLCONF ACK 1048612`
- **Facts:**
  - ACK period: 1 s (`run_with_period(1000) replicationCron()`)
  - `repl-ping-replica-period`: 10 s; `repl-timeout`: 60 s
  - `min-replicas-to-write`: 0 (off); `min-replicas-max-lag`: 10 s
- **Event log:** `replica1 → master · Stream · REPLCONF ACK 1048612 · 40 B`
- **Sources:** [replication.c#L193-L197](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L193-L197), [replication.c#L4622-L4628](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L4622-L4628), [server.c#L1778-L1780](https://github.com/redis/redis/blob/8.10.3/src/server.c#L1778-L1780), [config.c#L3531-L3532](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3531-L3532), [config.c#L3538-L3539](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3538-L3539), [replication.md#L251](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L251)

#### S9 · `move` replica1 → master · 끊겼다 다시 붙으면 `PSYNC <replid> <offset+1>`
- **Subtitle:** 잠깐의 네트워크 단절. replica는 마지막으로 받은 다음 바이트부터 달라고 한다.
- **Prose:**
  > 연결이 끊긴 동안에도 master는 쓰기를 받고 offset을 올립니다. 그 바이트들은 backlog에 남아 있습니다.
  > 다시 붙은 replica는 기억해 둔 master의 replid와 offset+1로 `PSYNC`를 보냅니다.
- **Token:** `request` · `PSYNC 8de1…b761 1048613`
- **Facts:**
  - Request: `PSYNC <replid> <reploff+1>`
  - Missed bytes: `master_repl_offset − replica offset` = 1388 B (E.G.)
- **Event log:** `replica1 → master · Handshake · PSYNC 8de1…b761 1048613 · 75 B`
- **Sources:** [replication.c#L2965-L2983](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L2965-L2983), [replication.md#L85-L90](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L85-L90)

#### S10 · `mutate` backlog · backlog 안이면 `+CONTINUE`, 밖이면 full sync
- **Subtitle:** replid가 같고, 요청 offset이 backlog 범위 안이면 빠진 바이트만 보낸다.
- **Prose:**
  > master는 두 가지를 봅니다. replid가 자신의 `replid`와 같은가(또는 `replid2`이고 offset이 `second_replid_offset` 이하인가). 그리고 offset이 backlog 범위 안인가.
  > 둘 다 맞으면 `+CONTINUE <replid>`로 답하고 backlog에서 그 offset부터 보냅니다.
  > 끊긴 동안 1 MB 넘게 쓰였으면 backlog에서 밀려났으므로 full sync입니다. 쓰기가 많은 서비스는 `repl-backlog-size`를 늘립니다.
- **Facts:**
  - Range check: `backlog->offset ≤ psync_offset ≤ backlog->offset + histlen`
  - Reply: `+CONTINUE <replid>` (PSYNC2), `+CONTINUE` for old replicas
- **Event log:** `master → replica1 · Stream · +CONTINUE 8de1…b761, send 1388 B from backlog (E.G.) · 52 B + 1388 B`
- **State (backlog):**
  - before: `backlog offset = 1424 (E.G.)`, `histlen = 1048576` (covers 1424…1050000), `request = 1048613` → in range
  - after: `replica1 = online`, `sent from 1048613 to 1050000 (E.G.)`
- **Record:** D6.1
- **Sources:** [replication.c#L1019-L1075](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L1019-L1075), [server.h#L1424-L1434](https://github.com/redis/redis/blob/8.10.3/src/server.h#L1424-L1434), [replication.md#L85-L90](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L85-L90)

#### S11 · `mutate` replica1 · failover: replica가 master가 되며 ID를 바꾼다
- **Subtitle:** 승격된 replica는 옛 replid를 `replid2`로 보관하고 새 replid를 만든다.
- **Prose:**
  > master가 죽고 replica-1이 승격되면(Sentinel, Cluster, 또는 `REPLICAOF NO ONE`), `shiftReplicationId()`가 옛 ID를 `replid2`로 옮깁니다.
  > `second_replid_offset`은 그때 offset+1이고, 그다음 새 랜덤 replid를 만듭니다.
  > 새 ID를 쓰는 이유는 네트워크 분할로 옛 master가 아직 살아 있을 수 있기 때문입니다. 같은 ID로 두 이력이 갈라지면 안 됩니다.
- **Facts:**
  - `replid2 = old replid`, `second_replid_offset = master_repl_offset + 1`
  - Called from `replicationUnsetMaster()`
- **Event log:** `replica1 → replica1 · Failover · shiftReplicationId, new replid c0ff…ee01 (E.G.) · —`
- **State (replica1):**
  - before: `role = replica`, `replid = 8de1…b761`, `replid2 = 0000…`, `offset = 1050000`
  - after: `role = master`, `replid = c0ff…ee01`, `replid2 = 8de1…b761`, `second_replid_offset = 1050001`
- **Sources:** [replication.c#L2142-L2151](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L2142-L2151), [replication.c#L3691-L3700](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L3691-L3700), [replication.md#L126-L144](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L126-L144)

#### S12 · `move` replica2 → replica1 · 다른 replica는 옛 ID로 partial resync
- **Subtitle:** replica-2가 옛 replid로 `PSYNC`해도 새 master가 `replid2`로 알아보고 `+CONTINUE <새 ID>`로 답한다.
- **Prose:**
  > replica-2는 옛 master의 replid로 `PSYNC 8de1…b761 1049800`을 보냅니다.
  > 새 master는 이것이 자신의 `replid2`이고 offset이 `second_replid_offset` 이하이므로 받아들입니다.
  > `+CONTINUE c0ff…ee01`로 새 ID를 알려 주면, replica-2는 옛 ID를 자기 `replid2`로 옮기고 계속 따라갑니다. full sync가 필요 없습니다.
- **Token:** `request` · `PSYNC 8de1…b761 1049800`
- **Facts:**
  - Accept if `replid == replid2` and `offset ≤ second_replid_offset`
  - Replica on new ID: `replid2 = old`, `second_replid_offset = master_repl_offset + 1`, then disconnects its own sub-replicas
- **Event log:** `replica2 → replica1 · Handshake · PSYNC 8de1…b761 1049800 → +CONTINUE c0ff…ee01 (E.G.) · 75 B / 52 B`
- **Sources:** [replication.c#L1019-L1021](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L1019-L1021), [replication.c#L3064-L3089](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L3064-L3089), [replication.md#L126-L136](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L126-L136)

#### S13 · `move` clientA → master · 비동기라서 생기는 틈: lock A
- **Subtitle:** client A가 master에서 lock을 얻고 `+OK`를 받았다. 이 쓰기는 아직 replica에 가지 않았다.
- **Prose:**
  > client A가 `SET lock:order:9 <tokenA> NX PX 30000`을 보내고 `+OK`를 받습니다.
  > master는 replica를 기다리지 않고 답하므로, 이 순간 lock은 master에만 있습니다.
  > 바로 이때 master가 죽으면 이 쓰기는 replica에 전달되지 않습니다.
- **Token:** `request` · `SET lock:order:9 tokenA NX PX 30000`
- **Facts:**
  - Docs: "Redis replication is asynchronous"
  - Docs (Sentinel): Redis "does not guarantee that acknowledged writes are retained during failures"
- **Event log:** `clientA → master · RESP2 · SET lock:order:9 tokenA NX PX 30000 → +OK · —`
- **State (master / replica1: `lock:order:9`):**
  - before: `master: —`, `replica1: —`
  - after: `master: tokenA`, `replica1: — (not yet replicated)`
- **Sources:** [distributed-locks.md#L80-L89](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L80-L89), [sentinel.md#L87](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/sentinel.md#L87)

#### S14 · `move` clientB → replica1 · 승격된 replica에서 lock B도 성공한다
- **Subtitle:** master가 죽고 replica-1이 승격됐다. lock 키가 없으니 client B도 같은 lock을 얻는다.
- **Prose:**
  > master가 lock을 복제하기 전에 죽었고, replica-1이 새 master가 되었습니다.
  > client B가 같은 `SET … NX`를 보내면 키가 없으므로 성공합니다. 이제 A와 B가 동시에 lock을 가졌다고 믿습니다.
  > docs는 이를 "SAFETY VIOLATION"이라고 부릅니다. 복제가 비동기인 한 master-replica failover로는 상호 배제를 보장할 수 없습니다.
- **Token:** `request` · `SET lock:order:9 tokenB NX PX 30000`
- **Facts:**
  - Docs sequence: A acquires on master → master crashes before replicating → replica promoted → B acquires
- **Event log:** `clientB → replica1 · RESP2 · SET lock:order:9 tokenB NX PX 30000 → +OK · —`
- **State (replica1 as master: `lock:order:9`):**
  - before: `—`
  - after: `tokenB` (client A still believes it holds the lock)
- **Sources:** [distributed-locks.md#L80-L89](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L80-L89), [cluster-spec.md#L84](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L84)

#### S15 · `mutate` master · `WAIT`, `WAITAOF`, Redlock, fencing token
- **Subtitle:** `WAIT`은 틈을 줄일 뿐 없애지 않는다. Redlock은 독립 master 5개의 과반, 그래도 fencing token을 권한다.
- **Prose:**
  > `WAIT 1 100`은 replica 1개가 ACK할 때까지(최대 100 ms) 기다리고 ACK한 수를 돌려줍니다. 하지만 docs는 이것이 Redis를 strongly consistent store로 만들지 않는다고 말합니다.
  > Redlock은 복제 없이 독립된 master N개(예: 5)에 차례로 lock을 걸어 과반(3) 이상, 그리고 유효 시간 안에 성공해야 lock을 얻은 것으로 봅니다.
  > 그래도 TTL은 monotonic clock이 아니라서 시계가 바뀌면 깨질 수 있습니다. docs는 fencing token을 쓰라고 권합니다.
- **Facts:**
  - `WAIT numreplicas timeout` (since 3.0.0) → integer; `WAITAOF numlocal numreplicas timeout` (since 7.2.0) → [local, replicas]
  - Redlock: N = 5, majority 3, validity = TTL − elapsed − clock drift
  - `min-replicas-to-write` default 0 (off)
- **Event log:** `clientA → master · RESP2 · WAIT 1 100 → :1 · 30 B`
- **State (lock safety options):**
  - before: `SET NX on master only`
  - after: `+ WAIT (narrower window)`, `Redlock (5 independent masters)`, `fencing token (checked by the resource)`
- **Sources:** [wait.md#L36-L83](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/wait.md#L36-L83), [waitaof.md#L39-L42](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/waitaof.md#L39-L42), [waitaof.md#L95-L96](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/waitaof.md#L95-L96), [waitaof.md#L139-L141](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/waitaof.md#L139-L141), [replication.md#L32-L37](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/management/replication.md#L32-L37), [distributed-locks.md#L130-L162](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L130-L162), [distributed-locks.md#L232-L240](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/develop/clients/patterns/distributed-locks.md#L232-L240)

### Decoder records

**D6.1 PSYNC exchange (bytes).** Layers: request · reply.

| Frame | Bytes (text) | Size | Fields |
|---|---|---|---|
| first sync request | `*3\r\n$5\r\nPSYNC\r\n$1\r\n?\r\n$2\r\n-1\r\n` | 30 B | replid `?`, offset `-1` |
| classic full sync reply | `+FULLRESYNC 8de1787ba490483314a4d30f1c628bc5025eb761 1048576\r\n` | 62 B | replid (40 hex, E.G.), offset (E.G.) |
| 8.x rdb-channel reply | `+RDBCHANNELSYNC 12\r\n` | 20 B | main-channel client id (E.G.) |
| reconnect request | `*3\r\n$5\r\nPSYNC\r\n$40\r\n8de1…b761\r\n$7\r\n1048613\r\n` | 75 B | cached replid, cached offset + 1 (E.G.) |
| partial resync reply | `+CONTINUE 8de1787ba490483314a4d30f1c628bc5025eb761\r\n` | 52 B | current replid (PSYNC2 replicas) |
| ACK | `*3\r\n$8\r\nREPLCONF\r\n$3\r\nACK\r\n$7\r\n1048612\r\n` | 40 B | processed offset (E.G.) |

Sources: [replication.c#L992-L993](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L992-L993), [replication.c#L1071-L1075](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L1071-L1075), [replication.c#L1321](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L1321), [replication.c#L2965-L2983](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L2965-L2983), [replication.c#L4622-L4628](https://github.com/redis/redis/blob/8.10.3/src/replication.c#L4622-L4628).

**D6.2 Diskless RDB payload framing.** Layers: EOF prefix · RDB bytes · EOF suffix.

| Part | Bytes | Meaning |
|---|---|---|
| prefix | `$EOF:` + 40 hex chars + `\r\n` (47 B) | announces an unknown-length transfer; the 40 chars are random (E.G.) |
| body | `REDIS0015 FA … FF <CRC64>` | a normal RDB file (lesson 4, D4.1 and D4.2) |
| suffix | the same 40 chars | the replica stops reading when it sees them |

Source: [rdb.c#L2083-L2098](https://github.com/redis/redis/blob/8.10.3/src/rdb.c#L2083-L2098).

### Self-check

1. **Q:** (replid, offset)가 뜻하는 것은? **A:** 특정 데이터 이력(replid)에서 몇 바이트까지 적용했는지. 이 쌍이 데이터셋의 정확한 버전을 가리킨다.
2. **Q:** partial resync가 되는 두 조건은? **A:** 요청 replid가 master의 replid와 같거나(또는 replid2이고 offset ≤ second_replid_offset), 요청 offset이 backlog 범위 안일 것. 기본 backlog는 1 MB.
3. **Q:** 8.x 기본 설정에서 full sync는 어떻게 다른가? **A:** master가 `+RDBCHANNELSYNC`로 답하면 replica가 두 번째 연결을 열고, fork 자식이 그 연결로 RDB를 diskless로 보낸다. 그동안 새 쓰기는 main 연결로 와서 replica 쪽 buffer에 쌓인다.
4. **Q:** failover 후 다른 replica가 full sync 없이 새 master를 따라가는 원리는? **A:** 승격된 replica가 옛 replid를 replid2로 보관하므로, 옛 ID로 온 PSYNC도 `+CONTINUE <새 ID>`로 받아 준다.
5. **Q:** master-replica에서 `SET NX PX` lock이 깨지는 순서는? **A:** A가 master에서 lock 획득 → 복제 전에 master 장애 → replica 승격 → B가 같은 lock 획득. 복제가 비동기이기 때문.
6. **Q:** `WAIT`을 쓰면 해결되나? **A:** 아니다. 틈을 줄일 뿐이고 docs도 "does not make Redis a strongly consistent store"라고 한다. failover 시 여전히 쓰기를 잃을 수 있다.

---

## Lesson 7. `cluster`: 16384개 slot과 MOVED/ASK, 그리고 failover

**Goal.** Route one key to its slot and node, follow a `MOVED` and an `ASK` redirect during resharding, then watch the cluster bus detect a dead master and elect its replica.

**Interview questions it answers**
- Redis Cluster는 키를 어떻게 나누나? 왜 consistent hashing이 아니라 hash slot인가? hash tag는?
- `MOVED`와 `ASK`의 차이는? client는 각각 어떻게 반응해야 하나?
- master 장애를 누가 어떻게 판단하나(PFAIL → FAIL)? replica는 어떻게 선출되나?
- Redis Cluster에서 확인 응답을 받은 쓰기도 잃을 수 있는 경우는?

**Scenario.** Three masters with slot ranges A `0–5460`, B `5461–10922`, C `10923–16383` (E.G.; ranges depend on how the cluster was created), each with one replica. Only A's replica `A1` is drawn.

**Nodes**

| id | label | sublabel | kind | Illustration idea | First appears |
|---|---|---|---|---|---|
| `client` | cluster client | slot map cache | `client` | Laptop with a small slot-map table | S1 |
| `A` | master A | slots 0–5460 (E.G.) | `framework` | Server tower with a ring segment | S2 |
| `B` | master B | slots 5461–10922 (E.G.) | `framework` | Server tower, second ring segment | S2 |
| `C` | master C | slots 10923–16383 (E.G.) | `framework` | Server tower, third ring segment | S9 |
| `A1` | replica A1 | replica of A | `framework` | Smaller tower with a mirror outline | S11 |
| `bus` | cluster bus | port + 10000 | `container` | Dashed mesh between towers | S8 |

**Layer selector:** `Routing` (slot, redirects) · `Resharding` · `Bus` (gossip, failure detection) · `Failover`.

### Steps

#### S1 · `mutate` client · 키 → slot: CRC16 mod 16384
- **Subtitle:** `user:1000` → CRC16(XMODEM) = 0x4671 → 0x4671 & 0x3FFF = slot 1649.
- **Prose:**
  > Redis Cluster는 키 공간을 16384개 hash slot으로 나눕니다. slot = `CRC16(key) mod 16384`이고, 코드에서는 하위 14비트(`& 0x3FFF`)를 씁니다.
  > CRC16은 XMODEM 변형(다항식 0x1021)입니다. `"123456789"`의 결과는 0x31C3입니다.
  > 키에 `{…}`가 있으면 처음 `{`와 그 뒤 첫 `}` 사이만 hash합니다. 그래서 `{user:1000}.following`도 slot 1649이고, 같은 slot의 키끼리만 multi-key 명령을 쓸 수 있습니다.
- **Facts:**
  - `HASH_SLOT = CRC16(key) mod 16384`; 14 of 16 CRC bits are used
  - `user:1000` → slot 1649; `{user:1000}.following` → 1649 (computed with XMODEM CRC16, checked against the spec's test vector and the `CLUSTER KEYSLOT` doc examples)
  - Empty tag `foo{}{bar}` hashes the whole key
- **Event log:** `client → client · Routing · keyHashSlot(user:1000) = 1649 · —`
- **State (client: slot map, stale):**
  - before: `0–5460 → B (stale)`, `5461–10922 → B`, `10923–16383 → C`
  - after: same (lookup only): `slot 1649 → B`
- **Sources:** [cluster-spec.md#L160-L174](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L160-L174), [cluster-spec.md#L194-L207](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L194-L207), [cluster.h#L22-L23](https://github.com/redis/redis/blob/8.10.3/src/cluster.h#L22-L23), [cluster.h#L54-L79](https://github.com/redis/redis/blob/8.10.3/src/cluster.h#L54-L79), [crc16.c#L34-L44](https://github.com/redis/redis/blob/8.10.3/src/crc16.c#L34-L44), [cluster-keyslot.md#L53-L56](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/cluster-keyslot.md#L53-L56)

#### S2 · `move` client → B · 잘못된 node로 보냈다
- **Subtitle:** client의 slot map이 오래되어 slot 1649를 B로 알고 있다.
- **Prose:**
  > client는 캐시한 slot map에 따라 `GET user:1000`을 B에 보냅니다.
  > B는 `processCommand()`의 cluster 검사에서 `getNodeByQuery()`로 이 slot의 주인이 A임을 압니다.
- **Token:** `request` · `GET user:1000`
- **Facts:**
  - Redirect decision: `getNodeByQuery()`
  - Cluster check runs in `processCommand` before `call()`
- **Event log:** `client → B · RESP2 · GET user:1000 · 28 B`
- **Sources:** [server.c#L4603-L4622](https://github.com/redis/redis/blob/8.10.3/src/server.c#L4603-L4622), [cluster.c#L1236-L1488](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1236-L1488)

#### S3 · `move` B → client · `-MOVED 1649 10.0.0.1:6379`
- **Subtitle:** "이 slot은 영구히 저 node에 있다." client는 slot map을 고친다.
- **Prose:**
  > B는 `-MOVED <slot> <endpoint>:<port>`로 답합니다. MOVED는 slot의 주인이 바뀌었다는 뜻입니다.
  > client는 그 slot을 새 node로 기록하고, 가능하면 `CLUSTER SHARDS`로 전체 map을 새로 받습니다. `CLUSTER SLOTS`는 7.0부터 deprecated입니다.
  > endpoint는 `cluster-preferred-endpoint-type`(기본 ip)에 따라 IP, hostname, 또는 빈 값입니다.
- **Token:** `response` · `-MOVED 1649 10.0.0.1:6379`
- **Facts:**
  - Format: `-MOVED <slot> <endpoint>:<port>` (same printf as ASK)
  - Client action: update the slot → node mapping
  - `cluster-preferred-endpoint-type`: ip
- **Event log:** `B → client · RESP2 · -MOVED 1649 10.0.0.1:6379 (address E.G.) · 27 B`
- **State (client: slot map):**
  - before: `1649 → B`
  - after: `0–5460 → A` (after `CLUSTER SHARDS`)
- **Record:** D7.1
- **Sources:** [cluster.c#L1512-L1520](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1512-L1520), [cluster-spec.md#L385-L410](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L385-L410), [cluster-shards.md#L26](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/cluster-shards.md#L26), [cluster-slots.md#L19](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/cluster-slots.md#L19), [redis.conf#L1960](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1960)

#### S4 · `move` client → A · 올바른 node에서 처리
- **Subtitle:** 다시 보낸 `GET user:1000`을 A가 처리한다.
- **Prose:**
  > client는 갱신된 map에 따라 A로 다시 보냅니다. A는 slot 1649의 주인이므로 그대로 실행합니다.
  > 키가 여러 slot에 걸친 명령은 `-CROSSSLOT`으로 거절됩니다. 같은 hash tag를 쓰면 피할 수 있습니다.
- **Token:** `request` · `GET user:1000`
- **Facts:**
  - Cross-slot error: `-CROSSSLOT Keys in request don't hash to the same slot`
- **Event log:** `client → A · RESP2 · GET user:1000 → $5 alice · 28 B / 11 B`
- **Sources:** [cluster.c#L1487](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1487), [cluster.c#L1500](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1500)

#### S5 · `mutate` A · resharding: slot 1649를 A에서 B로 옮기기 시작
- **Subtitle:** B에 `IMPORTING A`, A에 `MIGRATING B`를 걸고 `MIGRATE`로 키를 하나씩 옮긴다.
- **Prose:**
  > 전통적인 resharding은 먼저 B에 `CLUSTER SETSLOT 1649 IMPORTING <A>`, 그다음 A에 `CLUSTER SETSLOT 1649 MIGRATING <B>`를 겁니다.
  > 그리고 `CLUSTER GETKEYSINSLOT`으로 키를 얻어 `MIGRATE … KEYS …`로 B에 옮깁니다.
  > 옮기는 동안 slot의 키는 A와 B에 나뉘어 있습니다. 이것이 ASK가 필요한 이유입니다.
- **Facts:**
  - Order: B `IMPORTING` first, then A `MIGRATING`
  - Finish: `CLUSTER SETSLOT <slot> NODE <B>`
- **Event log:** `A → B · Resharding · MIGRATE {user:1000}.following · 1 key`
- **State (A / B: slot 1649):**
  - before: `A: owner, stable`, `B: —`
  - after: `A: owner, MIGRATING → B`, `B: IMPORTING ← A`, `{user:1000}.following moved to B`
- **Sources:** [cluster-spec.md#L446-L505](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L446-L505), [cluster.c#L1432-L1433](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1432-L1433)

#### S6 · `move` A → client · `-ASK 1649 10.0.0.2:6379`
- **Subtitle:** A에 키가 없고 slot이 MIGRATING이면 "이번 한 번만 B에 물어봐라".
- **Prose:**
  > client가 `GET {user:1000}.following`을 A에 보냅니다. A는 slot 주인이지만 키가 이미 B로 갔습니다.
  > slot이 MIGRATING이고 요청한 키가 모두 없으면 A는 `-ASK`로 답합니다. 일부만 있으면 `-TRYAGAIN`입니다.
  > ASK는 일시적인 redirect입니다. client는 slot map을 바꾸지 않습니다.
- **Token:** `response` · `-ASK 1649 10.0.0.2:6379`
- **Facts:**
  - ASK when: slot is MIGRATING and all keys are missing locally
  - Some keys missing: `-TRYAGAIN Multiple keys request during rehashing of slot`
  - Client: do not update the slot map
- **Event log:** `A → client · RESP2 · -ASK 1649 10.0.0.2:6379 (address E.G.) · 25 B`
- **Record:** D7.1
- **Sources:** [cluster.c#L1357-L1363](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1357-L1363), [cluster.c#L1437-L1446](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1437-L1446), [cluster.c#L1505](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1505), [cluster-spec.md#L552-L555](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L552-L555)

#### S7 · `move` client → B · `ASKING` 다음에 같은 명령
- **Subtitle:** IMPORTING 중인 B는 `ASKING`을 먼저 받은 요청만 처리한다. 플래그는 한 명령 뒤 사라진다.
- **Prose:**
  > client는 B에 `ASKING`을 보내고 바로 `GET {user:1000}.following`을 보냅니다.
  > B는 slot 주인이 아니지만 IMPORTING 상태이고 client에 `CLIENT_ASKING` 플래그가 있으므로 실행합니다. `ASKING` 없이 보내면 A로 `MOVED`합니다.
  > 옮기기가 끝나면 `SETSLOT … NODE B`로 주인이 바뀌고, 이후 A는 이 slot에 `MOVED`로 답합니다.
- **Token:** `request` · `ASKING` + `GET {user:1000}.following`
- **Facts:**
  - `ASKING` sets `CLIENT_ASKING`, cleared after the next command (unless in MULTI)
  - B serves only if `importing_slot && CLIENT_ASKING`
- **Event log:** `client → B · RESP2 · ASKING, GET {user:1000}.following · 16 B + 41 B`
- **Sources:** [cluster.c#L1738-L1745](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1738-L1745), [networking.c#L3052-L3055](https://github.com/redis/redis/blob/8.10.3/src/networking.c#L3052-L3055), [cluster.c#L1452-L1461](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1452-L1461), [cluster-spec.md#L552-L555](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L552-L555)

#### S8 · `mutate` B · 8.4+: atomic slot migration은 ASK 없이 넘긴다
- **Subtitle:** `CLUSTER MIGRATION IMPORT` — snapshot과 스트림을 받은 뒤 한 번에 소유권을 넘긴다. 8.10의 `redis-cli --cluster reshard`가 이것을 쓴다.
- **Prose:**
  > 8.4부터는 대상 node가 `CLUSTER MIGRATION IMPORT <slots>`로 slot 전체를 가져올 수 있습니다.
  > 원본은 fork해서 slot snapshot을 보내고 새 쓰기는 스트림으로 보냅니다. 거의 따라잡으면 원본이 잠깐 쓰기를 멈추고, 대상이 소유권을 가져갑니다.
  > 그동안 원본이 slot을 계속 서비스하므로 ASK가 없고, 넘긴 뒤에는 MOVED만 나옵니다. MIGRATING/IMPORTING 상태가 있는 동안에는 시작할 수 없습니다.
- **Facts:**
  - `CLUSTER MIGRATION`: since 8.4.0 (`IMPORT`, `CANCEL`, `STATUS`)
  - `cluster-slot-migration-write-pause-timeout`: 10000 ms; `cluster-slot-migration-handoff-max-lag-bytes`: 1 MB
  - 8.10: `redis-cli --cluster reshard` and `rebalance` use it
- **Event log:** `B → A · Resharding · CLUSTER MIGRATION IMPORT 1649 1649 · —`
- **State (A / B: slot 1649, ASM):**
  - before: `A: owner`, `B: —`
  - after: `A: trimming migrated keys`, `B: owner` (config updated over the cluster bus)
- **Sources:** [cluster_asm.c#L9-L43](https://github.com/redis/redis/blob/8.10.3/src/cluster_asm.c#L9-L43), [cluster_asm.c#L698-L703](https://github.com/redis/redis/blob/8.10.3/src/cluster_asm.c#L698-L703), [cluster-migration.md#L69-L72](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/cluster-migration.md#L69-L72), [config.c#L3576-L3577](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3576-L3577), [00-RELEASENOTES#L290](https://github.com/redis/redis/blob/8.10.3/00-RELEASENOTES#L290), [atomic-slot-migration.tcl#L1668-L1673](https://github.com/redis/redis/blob/8.10.3/tests/unit/cluster/atomic-slot-migration.tcl#L1668-L1673)

#### S9 · `move` A → C · cluster bus: PING/PONG와 gossip
- **Subtitle:** 각 node는 data port + 10000(예: 16379)으로 서로 PING을 보내고, 다른 node 소식을 몇 개씩 실어 보낸다.
- **Prose:**
  > node끼리는 cluster bus(기본 data port + 10000)로 이진 메시지를 주고받습니다. header는 `RCmb`로 시작하고 2256바이트입니다.
  > header에는 보내는 node의 epoch, 자기 slot bitmap(2048바이트), master ID, IP, 상태가 들어갑니다. 그래서 PING 하나로 slot 소유권도 퍼집니다.
  > 본문에는 다른 node에 대한 gossip을 최소 3개, 보통 node 수의 1/10개 싣습니다.
- **Token:** `data` · `PING (type 0)`
- **Facts:**
  - Bus port: `port + 10000` (`cluster-port` 0 = default)
  - Header: 2256 bytes up to `data`; `myslots` is 16384 bits = 2048 bytes
  - Gossip entries per message: `max(3, nodes/10)`; each 104 bytes
- **Event log:** `A → C · Bus · PING currentEpoch=6 configEpoch=1 gossip×3 (E.G.) · 2568 B (E.G.)`
- **Record:** D7.2
- **Sources:** [cluster_legacy.h#L18](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.h#L18), [redis.conf#L1769-L1772](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1769-L1772), [cluster_legacy.h#L96-L122](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.h#L96-L122), [cluster_legacy.h#L232-L289](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.h#L232-L289), [cluster_legacy.c#L3807-L3808](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L3807-L3808), [cluster-spec.md#L312-L318](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L312-L318)

#### S10 · `mutate` B · node timeout이 지나면 PFAIL
- **Subtitle:** A가 `cluster-node-timeout`(15000 ms)보다 오래 응답하지 않으면 B는 A에 PFAIL 표시를 한다.
- **Prose:**
  > A가 죽었습니다. B는 A에 보낸 PING의 답이 node timeout보다 오래 없으면 A를 `PFAIL`(possibly failed)로 표시합니다.
  > PFAIL은 B 혼자의 판단입니다. 이것만으로는 failover가 시작되지 않습니다.
  > B는 이후 gossip에 "A는 PFAIL"을 실어 다른 node에 알립니다.
- **Facts:**
  - `cluster-node-timeout`: 15000 ms
  - PFAIL flag value: 4; FAIL flag value: 8
- **Event log:** `B → B · Bus · node A no PONG for 15000 ms → PFAIL · 15 s`
- **State (B: view of A):**
  - before: `A flags = master`
  - after: `A flags = master,PFAIL`
- **Sources:** [cluster-spec.md#L732](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L732), [cluster_legacy.c#L5002-L5006](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L5002-L5006), [redis.conf#L1767](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1767), [config.c#L3574](https://github.com/redis/redis/blob/8.10.3/src/config.c#L3574), [cluster_legacy.h#L60-L64](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.h#L60-L64)

#### S11 · `move` B → A1 · 과반 master가 동의하면 FAIL을 방송
- **Subtitle:** `node_timeout × 2` 안에 과반 master의 PFAIL 보고가 모이면 FAIL로 바꾸고 모든 node에 알린다.
- **Prose:**
  > B는 gossip으로 받은 다른 master들의 보고를 셉니다. 자기 판단을 포함해 과반(`size/2 + 1`)이 `node_timeout × 2` 안에 PFAIL/FAIL을 보고했으면 A를 `FAIL`로 바꿉니다.
  > 그리고 FAIL 메시지를 모든 node에 방송합니다. FAIL은 모두가 받아들이는 판단입니다.
- **Token:** `data` · `FAIL (type 3) A`
- **Facts:**
  - Quorum: `size/2 + 1` masters; window `node_timeout × CLUSTER_FAIL_REPORT_VALIDITY_MULT` (2) = 30 s
  - Message type `FAIL` = 3
- **Event log:** `B → A1 · Bus · FAIL about A (2 of 3 masters) · —`
- **State (cluster view of A):**
  - before: `A flags = master,PFAIL`, `reports = [B]`
  - after: `A flags = master,FAIL`, `reports = [B, C]`
- **Sources:** [cluster-spec.md#L746](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L746), [cluster_legacy.h#L22](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.h#L22), [cluster_legacy.c#L1935-L1961](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L1935-L1961), [cluster_legacy.h#L96-L107](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.h#L96-L107)

#### S12 · `mutate` A1 · replica는 잠깐 기다린 뒤 선거를 연다
- **Subtitle:** DELAY = 500 ms + random(0~500 ms) + rank × 1000 ms. offset이 가장 앞선 replica의 rank가 0이다.
- **Prose:**
  > A1은 바로 나서지 않습니다. FAIL이 퍼질 시간과 다른 replica와의 경쟁을 고려해 `500 + random(0..500) + rank × 1000` ms를 기다립니다.
  > rank는 복제 offset 순위입니다. 데이터가 가장 최신인 replica가 먼저 나서게 됩니다.
  > 기다린 뒤 `currentEpoch`를 1 올리고 모든 master에 `FAILOVER_AUTH_REQUEST`를 보냅니다.
- **Facts:**
  - Delay: `500 + random() % 500 + rank × 1000` ms (manual failover: 0)
  - Auth timeout: `max(2 × node_timeout, 2000 ms)`; retry after twice that
  - `cluster-replica-validity-factor`: 10 (a replica disconnected too long does not run)
- **Event log:** `A1 → A1 · Failover · rank 0, delay 742 ms (E.G.), currentEpoch 6 → 7 · 742 ms`
- **State (A1):**
  - before: `currentEpoch = 6`, `failover_auth_rank = 0`
  - after: `currentEpoch = 7`, `failover_auth_epoch = 7`, `votes = 0`
- **Sources:** [cluster-spec.md#L840-L849](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L840-L849), [cluster_legacy.c#L4483-L4498](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L4483-L4498), [cluster_legacy.c#L4428-L4430](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L4428-L4430), [cluster_legacy.c#L4547-L4552](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L4547-L4552), [redis.conf#L1842](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1842)

#### S13 · `move` B → A1 · master는 epoch마다 한 표
- **Subtitle:** B와 C가 `FAILOVER_AUTH_ACK`로 투표한다. 과반을 얻으면 당선.
- **Prose:**
  > 각 master는 한 epoch에 한 번만 투표합니다. 같은 master의 replica에게는 `node_timeout × 2` 안에 다시 투표하지 않습니다.
  > 요청한 slot에 더 높은 configEpoch를 가진 주인이 있으면 투표하지 않습니다.
  > A1이 과반(3개 중 2개)의 ACK를 받으면 당선입니다.
- **Token:** `data` · `FAILOVER_AUTH_ACK (type 6)`
- **Facts:**
  - One vote per epoch (`lastVoteEpoch == currentEpoch` → refuse)
  - No second vote for the same master's replicas within `2 × node_timeout`
  - Message types: `FAILOVER_AUTH_REQUEST` 5, `FAILOVER_AUTH_ACK` 6
- **Event log:** `B → A1 · Bus · FAILOVER_AUTH_ACK epoch 7 · —`
- **State (A1: votes):**
  - before: `votes = 0 / needed 2`
  - after: `votes = 2 / needed 2` → elected
- **Sources:** [cluster_legacy.c#L4189](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L4189), [cluster_legacy.c#L4222](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L4222), [cluster_legacy.c#L4235-L4251](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L4235-L4251), [cluster_legacy.c#L4561-L4576](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L4561-L4576)

#### S14 · `mutate` A1 · 새 master: slot을 가져가고 PONG을 방송
- **Subtitle:** A1의 configEpoch = 7. 더 높은 configEpoch가 slot을 가져가는 "last failover wins".
- **Prose:**
  > A1은 자기 configEpoch를 선거 epoch(7)로 두고 A의 slot을 자기 것으로 바꾼 뒤 모든 node에 PONG을 방송합니다.
  > 다른 node는 더 높은 configEpoch로 slot을 주장하는 메시지를 받으면 그쪽으로 slot을 다시 묶습니다. 이를 "last failover wins"라고 합니다.
  > 옛 정보를 가진 node에는 `UPDATE` 메시지를 보냅니다. A가 돌아오면 A1의 replica가 됩니다.
- **Facts:**
  - Winner: `configEpoch = failover_auth_epoch`, takes the old master's slots
  - Stale node: gets `UPDATE` (type 7)
  - Manual: `CLUSTER FAILOVER [FORCE | TAKEOVER]` (`TAKEOVER` skips the vote)
- **Event log:** `A1 → B · Bus · PONG configEpoch=7 slots 0–5460 (E.G.) · —`
- **State (cluster: slots 0–5460):**
  - before: `owner = A (configEpoch 1)`
  - after: `owner = A1 (configEpoch 7)`, `A = replica of A1 when it returns`
- **Sources:** [cluster_legacy.c#L4370-L4401](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L4370-L4401), [cluster-spec.md#L859](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L859), [cluster-spec.md#L961-L975](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L961-L975), [cluster_legacy.c#L3295-L3303](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L3295-L3303), [cluster-failover.md#L40-L97](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/commands/cluster-failover.md#L40-L97)

#### S15 · `mutate` A · 받은 쓰기도 잃을 수 있다: write safety
- **Subtitle:** 비동기 복제와 last failover wins 때문에 분할 중에는 쓰기를 잃는 시간 창이 있다.
- **Prose:**
  > A가 쓰기에 `+OK`를 답했지만 A1에 복제되기 전에 죽으면, 그 쓰기는 A1이 승격되며 사라집니다.
  > 네트워크 분할로 소수 쪽에 남은 A에 옛 map을 가진 client가 계속 쓰는 경우도 있습니다. 이 쓰기도 A가 replica로 돌아갈 때 사라집니다.
  > 다만 소수 쪽 master는 과반과 `NODE_TIMEOUT` 동안 연락이 없으면 쓰기를 거절하므로, 잃는 범위는 그 시간으로 제한됩니다.
- **Facts:**
  - Spec: "There is always a window of time when it is possible to lose writes during partitions."
  - Minority master refuses writes after `NODE_TIMEOUT` without the majority (cluster state `FAIL`)
  - `cluster-require-full-coverage`: yes; `cluster-allow-reads-when-down`: no
- **Event log:** `client → A · RESP2 · SET x 1 → +OK, lost after failover (E.G.) · —`
- **State (A, minority side):**
  - before: `state = ok`, `writes = accepted`
  - after (15 s): `state = fail`, `writes = -CLUSTERDOWN The cluster is down`
- **Sources:** [cluster-spec.md#L76-L98](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L76-L98), [cluster_legacy.c#L5368-L5374](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L5368-L5374), [cluster.c#L1507-L1511](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1507-L1511), [redis.conf#L1883](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1883), [redis.conf#L1909](https://github.com/redis/redis/blob/8.10.3/redis.conf#L1909)

### Decoder records

**D7.1 Redirect errors.** Layers: type · kind · slot · endpoint.

| Frame | Bytes (text) | Size | Fields |
|---|---|---|---|
| MOVED | `-MOVED 1649 10.0.0.1:6379\r\n` | 27 B | `-` error · `MOVED` · slot 1649 · endpoint (E.G.) : port |
| ASK | `-ASK 1649 10.0.0.2:6379\r\n` | 25 B | `-` error · `ASK` · slot 1649 · endpoint (E.G.) : port |

Sources: [cluster.c#L1512-L1520](https://github.com/redis/redis/blob/8.10.3/src/cluster.c#L1512-L1520), [cluster-spec.md#L385-L390](https://github.com/redis/docs/blob/ff4f956f400e348ffd3a00b12ea163016e56f139/content/operate/oss_and_stack/reference/cluster-spec.md#L385-L390).

**D7.2 Cluster bus message header `clusterMsg` (fields up to `data`, 2256 B; multi-byte integers in network byte order).** Layers: fixed header · slot bitmap · identity · flags · data.

| Offset | Size | Field | Example value | E.G.? |
|---|---|---|---|---|
| 0 | 4 | `sig` | `RCmb` | |
| 4 | 4 | `totlen` | 2568 (header + 3 gossip entries; computed) | E.G. |
| 8 | 2 | `ver` | 1 (`CLUSTER_PROTO_VER`) | |
| 10 | 2 | `port` | 6379 | E.G. |
| 12 | 2 | `type` | 0 = PING (1 PONG, 2 MEET, 3 FAIL, 4 PUBLISH, 5 AUTH_REQUEST, 6 AUTH_ACK, 7 UPDATE, 8 MFSTART, 9 MODULE, 10 PUBLISHSHARD) | |
| 14 | 2 | `count` | 3 gossip entries | E.G. |
| 16 | 8 | `currentEpoch` | 6 | E.G. |
| 24 | 8 | `configEpoch` | 1 | E.G. |
| 32 | 8 | `offset` | replication offset | E.G. |
| 40 | 40 | `sender` | 40-char node id | E.G. |
| 80 | 2048 | `myslots` | bits 0–5460 set | E.G. |
| 2128 | 40 | `slaveof` | all zero for a master | |
| 2168 | 46 | `myip` | `10.0.0.1` | E.G. |
| 2214 | 2 | `extensions` | number of ping extensions | E.G. |
| 2216 | 30 | `notused1` | zero | |
| 2246 | 2 | `pport` | secondary port (TLS/plain) | E.G. |
| 2248 | 2 | `cport` | 16379 | E.G. |
| 2250 | 2 | `flags` | `myself->flags`: master (1) + myself (16) = 0x0011 | |
| 2252 | 1 | `state` | 0 = `CLUSTER_OK` | |
| 2253 | 3 | `mflags` | manual-failover flags | |
| 2256 | … | `data` | union: gossip entries (104 B each) for PING/PONG/MEET | |

Gossip entry (`clusterMsgDataGossip`, 104 B): `nodename[40]`, `ping_sent`, `pong_received`, `ip[46]`, `port`, `cport`, `flags`, `pport`, `notused1`. Sources: [cluster_legacy.h#L96-L122](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.h#L96-L122), [cluster_legacy.h#L230-L289](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.h#L230-L289), [cluster_legacy.c#L3690-L3743](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.c#L3690-L3743), [cluster_legacy.h#L60-L64](https://github.com/redis/redis/blob/8.10.3/src/cluster_legacy.h#L60-L64), [cluster.h#L27-L28](https://github.com/redis/redis/blob/8.10.3/src/cluster.h#L27-L28).

### Self-check

1. **Q:** `user:1000`과 `{user:1000}.following`이 같은 node에 있는 이유는? **A:** 두 번째 키는 hash tag `{user:1000}` 안만 hash하므로 둘 다 CRC16("user:1000") mod 16384 = 1649.
2. **Q:** MOVED와 ASK의 차이와 client 동작은? **A:** MOVED는 slot 주인이 바뀐 것, client는 slot map을 갱신한다. ASK는 migration 중 일시적인 것, `ASKING` 후 그 한 명령만 대상 node로 보내고 map은 바꾸지 않는다.
3. **Q:** PFAIL과 FAIL의 차이는? **A:** PFAIL은 한 node가 node timeout(기본 15 s) 동안 답을 못 받아 내린 판단. FAIL은 과반 master의 보고가 node timeout × 2 안에 모여 방송된 판단이고, failover의 조건이다.
4. **Q:** replica가 선거 전에 기다리는 시간과 그 이유는? **A:** 500 ms + random(0~500 ms) + rank × 1000 ms. FAIL이 퍼질 시간을 주고, offset이 가장 앞선 replica(rank 0)가 먼저 나서게 한다.
5. **Q:** 두 replica가 같은 slot을 주장하면 누가 이기나? **A:** configEpoch가 더 큰 쪽(last failover wins).
6. **Q:** 8.4+의 `CLUSTER MIGRATION`은 전통 resharding과 무엇이 다른가? **A:** slot 단위로 snapshot과 스트림을 보내고 한 번에 소유권을 넘기므로 키가 두 node에 나뉜 상태와 ASK redirect가 없다.
7. **Q:** Redis Cluster에서 `+OK`를 받은 쓰기를 잃는 경우는? **A:** 복제 전에 master가 죽어 replica가 승격될 때, 그리고 분할된 소수 쪽 master가 NODE_TIMEOUT 전까지 받은 쓰기.

---

## Open questions

1. **Docs pinning.** `redis/docs` has no per-release tags. This plan pins it to commit `ff4f956` (2026-11-03). Decision 0004 asks for release-tag URLs. Should a commit pin count as "pinned" for redis.io docs, or should every docs-only fact also get a source-code anchor at `8.10.3`? Most steps already have both.
2. **`io-threads` in the scene.** The default is `1`. Lesson 1 shows `io-threads 4` so that the hand-off is visible. Is that acceptable if S3 and S12 say plainly that the default is 1 and what changes?
3. **Lock caveats placement.** Lock safety sits at the end of `replication` (S13–S15) and the stampede lock at the end of `expire-evict` (S14–S16). A separate `cache-patterns` lesson would break "one mechanism per lesson". Keep them as closing steps?
4. **8.x-only features.** The plan teaches the rdb-channel full sync (S4–S6 of lesson 6), atomic slot migration (lesson 7 S8), `DELEX`/`IFEQ` (lesson 3 S16), LRM eviction, and 8.10 compact hashes as current behavior. Interviewers may expect the 7.x picture. Should each such step carry a "7.x에서는" line?
5. **Decoder for a live dump.** D2.1, D2.2, D4.1, and D4.2 were computed from the code, not dumped from a running server. Before they ship, someone should run `redis-server 8.10.3` locally and confirm the bytes with `DEBUG LISTPACK`, `OBJECT ENCODING`, and a hex dump of a one-key `dump.rdb`.
6. **Scene for lesson 4 pages.** A page-table view (S4–S5) is a new state shape. It may need a primitive the redesigned engine does not have yet.
7. **Event-log protocol column.** The plan uses the layer names as the protocol column (`RESP2`, `RESP3`, `Bus`, `Stream`, `File`). Confirm against the redesigned log schema.

## Facts not verified

These must not go into lesson data until checked. Each is either absent from the pinned sources or was not traced in code.

- **Why 16384 slots.** The usual answer (a 2 KB slot bitmap in every heartbeat versus 8 KB for 65536, and clusters of about 1000 nodes) is not in `cluster-spec.md` or the code. The source is a GitHub issue comment (redis/redis#2576) that was not opened. Only the 2048-byte bitmap is verified (from `clusterMsg` offsets). Lesson 7 does not state the reason.
- **TTL jitter as a stampede fix.** No official Redis page found that recommends randomizing TTLs. The cache-aside page names only "mutex locks or probabilistic early refresh". The probabilistic early-expiration formula (XFetch) is not on any page read. Lesson 3 uses only the lock.
- **Runtime encoding of 41–44-byte strings.** 8.x embeds a value in the key object only if robj + key + value fit in a 64-byte cache line (`object.c#L283-L295`), so `OBJECT ENCODING` may report `raw` where older material says `embstr`. Not tested on a live server. Lesson 2 S1 states only the 44-byte `embstr` limit from `createStringObject`.
- **Integer AUX values in RDB.** `redis-bits` = 64 is probably written int-encoded (`C0 40`), inferred from `rdbSaveRawString`. Not observed in a real file. D4.1 stops before that value.
- **Versions in which things changed:** the rdb-channel replication (8.0 release notes say only "improved replication mechanism"), the shared replication buffer (believed 7.0), `repl-diskless-sync` defaulting to `yes`, the `startoffset`/`endoffset` manifest fields, `KEY_META`/`HASH_TEMPLATE` RDB opcodes, `lookahead`, expire metadata inside `kvobj`, cluster ping extensions (believed 7.0), and the rename of `acceptTcpHandler`. The pinned clone is shallow, so git history was not available. The lessons describe 8.10.3 behavior without naming the version a change arrived in, except where a doc or release note names it (MP-AOF 7.0, `HEXPIRE` 7.4, LRM 8.6, `DELEX`/`IFEQ`/`CLUSTER MIGRATION` 8.4, `BACKUP`/compact hashes 8.10, I/O-threading rewrite 8.0).
- **RDB version numbers of older releases** (for example 7.2 = 11). Only `RDB_VERSION 15` at 8.10.3 is verified.
- **Exact rejoin-delay behavior** of a minority master after a partition heals (`CLUSTER_MIN_REJOIN_DELAY` 500, `CLUSTER_MAX_REJOIN_DELAY` 5000, `CLUSTER_WRITABLE_DELAY` 2000 exist at `cluster_legacy.c#L5269-L5271` but were not traced).
- **Default slot ranges** `0–5460 / 5461–10922 / 10923–16383` for a three-master cluster. Used only as an E.G. layout in lesson 7; not checked in `redis-cli`.
- **`modules` in the `HELLO` reply.** Whether the official binary distributions load modules by default (making the array non-empty) was not checked; D1.3 marks it E.G.
- **Docs that disagree with the code (use the code):**
  - `protocol-spec.md` says `HELLO`'s `proto` is "the highest supported version"; the code returns the connection's current `c->resp`.
  - `redis.conf` says active expiry avoids "consuming more than 25% of total memory"; the code's 25% is CPU time.
  - `redis.conf` gives the LFU increment as `1/(old_value*lfu_log_factor+1)`; the code subtracts `LFU_INIT_VAL` (5) first.
  - `replication.md` says diskless sync "can be enabled"; it is on by default, and the page does not describe the rdb channel.
  - `hashes.md` and `redis.conf` call compact-hash conversion one-way; setting a field TTL converts a template hash to `listpackex` or `hashtable` (`t_hash.c#L2283-L2287`).
  - `latency.md` does not mention I/O threads.
  - `memory-optimization.md` still mentions `hash-max-zipmap-*` in one section, and the `OBJECT ENCODING` page does not list `listpackex`, `template-listpack`, or `template-array`.
- **INCREX.** `src/commands/increx.json` (since 8.8.0) exists at 8.10.3 and may be useful for rate limiting, but it was not researched and is not used in any lesson.
