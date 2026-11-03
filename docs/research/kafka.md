---
last-verified: 2026-11-04
sources: [https://github.com/apache/kafka/tree/4.4.0]
---

# Kafka lesson plan (research)

The content plan for the Kafka topic. It is research only: plain Markdown, no TypeScript. This is revision 3. It applies two sets of rules:

- The 2026-11-04 review (decision 0010): one mechanism per lesson, about 8 to 12 steps. A `move` never changes state. A `mutate` targets a node with a state panel and gives the panel's whole `after` view. Every decoder belongs to a step and says whether it is `wire`.
- The north star and the must-know rule (decision 0011): structure and critical path imprinted in 3 or fewer viewings, one layout for the whole topic, a dominant critical path, a replay at the end, and only what an engineer meets in design, operations, debugging, or incidents.

## Version and source policy

- **Pinned version: Apache Kafka 4.4.0.** The highest non-RC tag in `github.com/apache/kafka` (tag commit `1156b2752aaa28eafc0b4c4d387e63356793268d`). The review confirmed it is the latest release on kafka.apache.org/downloads, released 2026-10-22.
- **Primary sources** are the official documentation source in the repository (`docs/`, the text kafka.apache.org renders) and the code, both at tag `4.4.0`. `K/` stands for `https://github.com/apache/kafka/blob/4.4.0/`. Expand it when the plan becomes lesson data.
- **KIP pages are secondary sources.** This session cannot reach cwiki.apache.org (proxy 403). KIP short links are copied from links in the 4.4.0 docs.
- `versions` for every Kafka lesson: `{ "Apache Kafka": "4.4.0" }`.

## Conventions

- **Step header:** `S<n> · move|mutate · <node(s)> · <layer>`.
- **`move`** gives `from → to` and a **token**: `kind` (`request`, `response`, `call`, `data`) and `label`. A `move` has no state change.
- **`mutate`** names one node with a state panel. **After** is that panel's whole view, one row per ` / `. **Before** is given only where the change is subtle.
- **Path:** each step is `critical` (on the lesson's critical path, drawn dominant) or `side` (failure branch or comparison, drawn weaker).
- **Decoder** lines name a record from "Decoder records" and say `wire: yes` (bytes on the network at this hop) or `wire: no` (memory or disk).
- **Event log:** `source → destination · layer · info · size or duration`. Per-run values and every illustrative latency are marked E.G.
- **Layers** (selector values, the same in every lesson): **Client**, **Network**, **Broker**, **Storage**, **Controller**.
- **Replay:** every lesson ends with a full, continuous replay of the hops on its "Replay" line. The replay is not a new step.

## Topic layout

One fixed map for all Kafka lessons. Scene units are 1000 × 640. Each lesson shows only the nodes it uses, always at these positions.

- Producers are on the left, brokers in the middle, consumers on the right, so data flows left to right.
- Coordinators and the controller sit in the top row.
- Memory is above disk: broker memory is in row 3, logs and internal topics in row 4.

| id | Label (default) | Kind | Position (x, y) | Row | Illustration |
|---|---|---|---|---|---|
| `txcoord` | Transaction coordinator | `framework` | (260, 70) | 1 · coordinators | Server tower with ledger and gavel |
| `controller` | KRaft controller quorum | `framework` | (500, 70) | 1 | Control tower with three beacons |
| `coord` | Group coordinator | `framework` | (760, 70) | 1 | Server tower with roster clipboard |
| `producer` | Producer app + `KafkaProducer` | `app` | (80, 250) | 2 · clients and brokers | Service box feeding a funnel and a rail switch |
| `accumulator` | `RecordAccumulator` | `framework` | (80, 380) | 2 | Rack of per-partition trays |
| `sender` | `Sender` thread | `framework` | (230, 315) | 2 | Forklift leaving the rack |
| `b1` | Broker 1 (leader `orders-0`) | `container` | (480, 300) | 2 | Server tower with crown tag |
| `b2` | Broker 2 | `container` | (620, 220) | 2 | Server tower |
| `b3` | Broker 3 | `container` | (620, 380) | 2 | Server tower |
| `c1` | Consumer A | `app` | (900, 250) | 2 | Laptop with worker figure |
| `c2` | Consumer B | `app` | (900, 380) | 2 | Laptop with worker figure |
| `pstate` | Producer state (on B1) | `framework` | (360, 450) | 3 · broker memory | Ledger card |
| `pagecache` | OS page cache (on B1) | `container` | (480, 450) | 3 | Translucent RAM layer |
| `cleaner` | Log cleaner (on B1) | `framework` | (600, 450) | 3 | Broom robot on a rail |
| `txlog` | `__transaction_state` | `storage` | (240, 570) | 4 · disk | Cylinder with ledger icon |
| `index` | `.index` | `storage` | (370, 570) | 4 | Index card strip |
| `log` | `orders-0` log | `storage` | (480, 570) | 4 | Segment cylinders |
| `offsets` | `__consumer_offsets` | `storage` | (760, 570) | 4 | Cylinder with bookmark ribbon |
| `tool` | `kafka-consumer-groups.sh` | `client` | (900, 540) | 4 | Terminal window |

Lesson-specific labels: in lesson 3 `log` is `users-0` (compacted); in lesson 7 `log` is `payments-0` and `c2` is "read_committed consumer".

## Lessons

| # | id | Title | Critical path (one line) | Steps |
|---|---|---|---|---|
| 1 | `producer-send` | 레코드 한 건의 전송 경로 | `send()` → partition → accumulator batch → Sender → Produce → leader log → `acks` response | 11 |
| 2 | `broker-log` | 파티션 로그와 zero-copy | Produce → page cache → segment + sparse index → Fetch → index lookup → `sendfile` | 9 |
| 3 | `log-compaction` | 키별 최신 값만 남는 로그 | keyed writes → dirty section → cleaner builds key→offset map → recopy without old values → full replay sees final state | 8 |
| 4 | `replication` | ISR과 high watermark | leader append → follower Fetch → LEO → HW → `acks=all` response → consumer reads to HW | 10 |
| 5 | `consumer-rebalance` | 파티션 재분배 | find coordinator → join → assign → member joins → revoke → reassign | 11 |
| 6 | `offset-commit` | offset 커밋과 consumer lag | poll → process → `OffsetCommit` → `__consumer_offsets` → lag = end − committed | 9 |
| 7 | `transactions` | 트랜잭션으로 exactly-once | init (fence) → produce in txn → offsets in txn → EndTxn → PREPARE → markers → LSO → `read_committed` read | 11 |
| 8 | `kraft-failover` | 브로커 장애와 leader failover | heartbeats stop → controller fences broker → new leader from ISR → brokers apply → producer refreshes metadata and retries | 9 |

---

## Lesson 1 · `producer-send`

- **Title:** 레코드 한 건의 전송 경로
- **Subtitle:** `send()`부터 leader 로그와 `acks` 응답까지
- **Summary:** 파티션 선택, batch 대기, 전송, `acks`, 중복 제거, 파티션 단위 순서 보장을 따라간다.
- **Critical path:** `send()` → partition → accumulator batch → Sender → Produce → leader log → `acks` response.
- **Overview:** `send()`는 비동기다. 애플리케이션 스레드는 직렬화, 파티션 선택, accumulator 적재까지만 하고 `Future`를 받는다. 전송은 `Sender` 스레드가 한다. 기본 설정은 `acks=all`, idempotence 켜짐, `linger.ms=5`다. 그래서 재시도해도 중복이 생기지 않고, 레코드는 잠깐 batch에 모인다. 순서는 파티션 안에서만 보장된다.
- **Interview questions:** `linger.ms`와 `batch.size`는 무엇을 언제 보내게 하나? 키가 있을 때와 없을 때 파티션은? `acks=0/1/all`의 차이는? 재시도해도 중복이 없는 이유는? 무엇이 순서를 깨나?

### Panels

| Node | Panel (initial) |
|---|---|
| `producer` | `record`: `key: "order-42"` / `value: {"id":42}` / `partition: ?` |
| `accumulator` | `batches`: `orders-0: —` |
| `sender` | `orders-0`: `producerId/epoch: 4000/0 (E.G.)` / `next sequence: 0` |
| `log` | `orders-0`: `LEO: 1200 (E.G.)` / `last batch: —` |
| `pstate` | `pid 4000`: `cached sequence ranges: []` |

### Steps

**S1 · move · `producer → accumulator` path · Client** — *critical*
- Token: `call` · `send(orders, key=order-42)`
- Title: `send()` 호출
- Subtitle: `Future`를 바로 돌려받는다. 아직 아무것도 전송되지 않았다.
- Prose: 애플리케이션이 `ProducerRecord`를 넘기면 `send()`는 먼저 토픽 metadata를 기다린다. 이 대기와 버퍼 대기는 `max.block.ms`까지만 허용된다. 넘으면 `send()`가 예외를 던진다.
- Facts: `max.block.ms` = 60000; return = `Future<RecordMetadata>`.
- Event log: `OrderService → KafkaProducer · Client · send(orders, order-42) · —`
- Sources: [P1], [P2]

**S2 · mutate · `producer` · Client** — *critical*
- Title: 직렬화와 파티션 선택
- Subtitle: 키가 있으면 키 해시, 없으면 sticky 파티션.
- Prose: key와 value를 `byte[]`로 직렬화한 뒤 파티션을 고른다. 키가 있으면 `murmur2(keyBytes) % 파티션 수`로 정하므로, 같은 키는 같은 파티션으로 간다. 키가 없으면 한 파티션에 batch 하나 분량을 채운 뒤 다음 파티션으로 넘어간다(sticky).
- Facts: key → `toPositive(murmur2(key)) % numPartitions`; no key → sticky, switch after ≥ `batch.size` bytes; explicit partition or custom `partitioner.class` wins.
- Event log: `KafkaProducer · Client · murmur2(order-42) % 3 → 0 (E.G.) · —`
- After: `key: 8 B "order-42"` / `value: 9 B {"id":42}` / `partition: 0 (E.G.)`
- Decoder: **Record** (`wire: no`; the same bytes travel inside the batch at S7)
- Sources: [P2], [P3], [P4]

**S3 · move · `producer → accumulator` · Client** — *critical*
- Token: `data` · `append orders-0`
- Title: accumulator에 append
- Subtitle: 파티션별 대기열의 마지막 batch에 붙인다.
- Prose: accumulator는 파티션마다 batch 대기열을 두고, 마지막 batch에 레코드를 붙인다. 자리가 없으면 새 batch를 만든다. 버퍼 전체는 `buffer.memory`로 제한된다. 브로커가 느려 버퍼가 차면 `send()`가 블록되고, `max.block.ms`가 지나면 실패한다.
- Facts: `batch.size` = 16384; `buffer.memory` = 33554432 (32 MiB); full buffer → `send()` blocks up to `max.block.ms`.
- Event log: `KafkaProducer → RecordAccumulator · Client · append orders-0 · 24 B (E.G.)`
- Sources: [P1], [P5]

**S4 · mutate · `accumulator` · Client** — *critical*
- Title: `batch.size` 또는 `linger.ms`
- Subtitle: batch가 차거나 `linger.ms`가 지나면 보낼 수 있다.
- Prose: batch는 `batch.size`만큼 차거나, `linger.ms`만큼 기다렸으면 보낼 준비가 된다. 기본 `linger.ms`는 5 ms다. 값을 올리면 batch가 커져 처리량이 늘고, 그만큼 지연이 생긴다.
- Facts: `linger.ms` = 5; sendable = full ∥ linger expired ∥ buffer exhausted ∥ flush/close.
- Event log: `RecordAccumulator · Client · orders-0 ready (linger expired) · 5 ms (E.G.)`
- After: `orders-0: 1 batch · 3 records · 1.2 KiB · ready ✓ (E.G.)`
- Sources: [P6], [P7], [P8]

**S5 · move · `accumulator → sender` · Client** — *critical*
- Token: `data` · `drain node 1: [orders-0]`
- Title: Sender가 batch를 꺼낸다
- Subtitle: leader broker별로 batch를 모아 요청 하나를 만든다.
- Prose: `Sender` 스레드는 준비된 batch를 leader broker별로 모은다. 요청 하나에는 파티션마다 batch 하나씩 들어가고, 크기 상한은 `max.request.size`다.
- Facts: one batch per partition per request; `max.request.size` = 1048576.
- Event log: `RecordAccumulator → Sender · Client · drain node 1 · 1 batch (E.G.)`
- Sources: [P9]

**S6 · mutate · `sender` · Client** — *critical*
- Title: producerId와 sequence
- Subtitle: idempotent producer는 batch마다 `(producerId, epoch, baseSequence)`를 찍는다.
- Prose: idempotent producer는 처음에 브로커에서 producerId를 받는다. batch를 꺼낼 때 파티션별 다음 sequence를 찍고 레코드 수만큼 올린다. 재시도하는 batch는 처음 받은 sequence를 그대로 쓴다. 그래서 브로커가 중복을 알아볼 수 있다.
- Facts: `enable.idempotence` = true (default unless configs conflict); sequence assigned at drain; retried batch keeps its sequence.
- Event log: `Sender · Client · orders-0 pid=4000 baseSeq=0 (E.G.) · —`
- After: `producerId/epoch: 4000/0 (E.G.)` / `next sequence: 3`
- Sources: [P10], [P11]

**S7 · move · `sender → b1` · Network** — *critical*
- Token: `request` · `Produce acks=all orders-0`
- Title: Produce 요청
- Subtitle: 파티션의 leader에게 직접 보낸다.
- Prose: producer는 metadata로 각 파티션의 leader를 알고, 그 broker에 직접 Produce를 보낸다. 중간 라우팅 계층은 없다. 요청에는 `acks`와 `request.timeout.ms`가 실린다.
- Facts: sent to the partition leader; `request.timeout.ms` = 30000.
- Event log: `Sender → Broker 1 · Network · Produce acks=all orders-0 · 143 B (E.G.)`
- Decoder: **ProduceRequest** (`wire: yes`)
- Sources: [P12], [P13]

**S8 · mutate · `log` · Storage** — *critical*
- Title: leader 로그에 append
- Subtitle: leader가 offset을 매기고 로그 끝에 쓴다.
- Prose: leader는 batch를 검증하고, offset을 매겨 활성 segment 끝에 쓴다. batch는 producer가 만든 형식 그대로 저장된다(lesson 2).
- Facts: broker assigns `baseOffset`; batch stored as sent (record batch v2); compressed batches stay compressed.
- Event log: `Broker 1 → orders-0 · Storage · append at 1200 (E.G.) · 85 B (E.G.)`
- After: `LEO: 1203 (E.G.)` / `last batch: 1200–1202 · pid 4000 · seq 0–2 (E.G.)`
- Decoder: **Record batch** (`wire: no`, on disk)
- Sources: [P14], [P15]

**S9 · mutate · `pstate` · Broker** — *side*
- Title: 중복 batch 걸러 내기
- Subtitle: broker는 producer마다 최근 5개 batch의 sequence 범위를 기억한다.
- Prose: 같은 sequence 범위의 batch가 다시 오면(응답을 못 받은 재시도), broker는 다시 쓰지 않고 앞서 쓴 결과를 돌려준다. sequence가 비면 `OutOfOrderSequenceException`이다. broker가 batch 5개만 기억하므로 idempotence에는 `max.in.flight.requests.per.connection` ≤ 5가 필요하다.
- Facts: broker retains 5 batches per producer; duplicate → previous result, no append; `max.in.flight.requests.per.connection` = 5 (must be ≤ 5).
- Event log: `Broker 1 · Broker · pid 4000 seq 0–2 accepted (E.G.) · —`
- After: `cached sequence ranges: [0–2] (E.G.)`
- Sources: [P16], [P17], [P18]

**S10 · move · `b1 → sender` · Network** — *critical*
- Token: `response` · `ProduceResponse baseOffset=1200`
- Title: `acks`에 따른 응답
- Subtitle: `acks=all`이면 ISR 전원이 받은 뒤 응답한다.
- Prose: `acks=0`은 응답을 기다리지 않는다. `acks=1`은 leader가 쓴 직후 응답하므로, leader가 복제 전에 죽으면 레코드가 사라진다. 기본값 `acks=all`은 현재 ISR 전원이 받은 뒤 응답한다(lesson 4). 재시도할 수 있는 오류는 `delivery.timeout.ms` 안에서 다시 보낸다.
- Facts: `acks` = `all` (≡ -1); `acks=1` loses data if the leader dies before replication; `delivery.timeout.ms` = 120000.
- Event log: `Broker 1 → Sender · Network · ProduceResponse baseOffset=1200 (E.G.) · 3 ms (E.G.)`
- Sources: [P19], [P1]

**S11 · mutate · `log` · Storage** — *side*
- Title: 순서는 파티션 안에서만
- Subtitle: idempotence 없이 재시도하면 같은 파티션 안에서도 순서가 뒤집힐 수 있다.
- Prose: Kafka는 파티션 하나 안의 순서만 보장하고, 파티션 사이에는 순서가 없다. idempotence를 끄고 in-flight 요청이 2개 이상일 때 batch A가 실패하고 B가 성공한 뒤 A가 재전송되면, 로그에는 B가 먼저 남는다. 파티션 수를 늘려도 같은 키가 다른 파티션으로 가서 순서가 깨진다.
- Facts: order = per partition only; idempotence off + in-flight > 1 + retry → reorder; adding partitions remaps keys.
- Event log: `Broker 1 · Storage · (idempotence off) B written before retried A (E.G.) · —`
- Before: `LEO: 1200 (E.G.)` / `last batch: —`
- After: `LEO: 1206 (E.G.)` / `last batch: 1203–1205 · A (retry) · after 1200–1202 · B ✗ order (E.G.)`
- Sources: [P20], [P18], [P21]

**Replay:** `send()` → partition → accumulator → batch ready → Sender → Produce → leader log → `acks` response.

### Decoder records used

| Record | Step | wire |
|---|---|---|
| Record | S2 | no |
| ProduceRequest | S7 | yes |
| Record batch | S8 | no |

### Sources

| id | What | URL |
|---|---|---|
| P1 | Producer config defaults | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L420-L491` |
| P2 | `KafkaProducer.send`/`doSend` | `K/clients/src/main/java/org/apache/kafka/clients/producer/KafkaProducer.java#L1042-L1126` |
| P3 | `KafkaProducer.partition` | `K/clients/src/main/java/org/apache/kafka/clients/producer/KafkaProducer.java#L1556-L1575` |
| P4 | Built-in partitioner; `partitioner.class` doc | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/BuiltInPartitioner.java#L221-L256`, `#L411-L413`; `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L343-L360` |
| P5 | `RecordAccumulator.append` | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/RecordAccumulator.java#L282-L340` |
| P6 | `batch.size` and `linger.ms` docs | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L85-L103`, `#L154-L165` |
| P7 | `batchReady` conditions | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/RecordAccumulator.java#L653-L676` |
| P8 | `linger.ms` default 5 (upgrade note); secondary: KIP-1030 | `K/docs/getting-started/upgrade.md#L341`; `https://cwiki.apache.org/confluence/x/FAqpEQ` |
| P9 | `Sender.sendProducerData` | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/Sender.java#L380-L425` |
| P10 | `enable.idempotence` doc and default | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L370-L378`, `#L574-L577` |
| P11 | Sequence assigned in `drain()` | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/RecordAccumulator.java#L946-L975` |
| P12 | Producer sends to the leader directly | `K/docs/design/design.md#L123-L127` |
| P13 | `ProduceRequest` and `RequestHeader` schemas | `K/clients/src/main/resources/common/message/ProduceRequest.json#L16-L73`, `K/clients/src/main/resources/common/message/RequestHeader.json#L16-L44` |
| P14 | Record batch format | `K/docs/implementation/message-format.md#L31-L67` |
| P15 | Broker validates, keeps compressed batches | `K/docs/design/design.md#L113-L119` |
| P16 | Broker keeps 5 batches per producer | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/ProducerStateEntry.java#L31-L35`, `#L128-L137` |
| P17 | Duplicate and sequence checks | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/UnifiedLog.java#L1411-L1421`, `K/storage/src/main/java/org/apache/kafka/storage/internals/log/ProducerAppendInfo.java#L156-L198` |
| P18 | `max.in.flight.requests.per.connection` doc | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L296-L305`, `#L520-L523` |
| P19 | `acks` doc | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L133-L150` |
| P20 | Per-partition ordering | `K/docs/getting-started/introduction.md#L83` |
| P21 | Adding partitions remaps keys | `K/docs/operations/basic-kafka-operations.md#L61-L63` |

### Self-check

1. `linger.ms`와 `batch.size`의 관계는? → 둘 중 먼저 오는 쪽이 batch를 보낼 수 있게 한다. 기본값은 5 ms와 16 KiB다.
2. 키 없는 레코드는 어느 파티션으로 가나? → sticky 파티션이다. batch 하나 분량을 채운 뒤 다음 파티션으로 넘어간다.
3. 브로커가 느려 버퍼가 차면? → `send()`가 블록되고, `max.block.ms`(60 s)가 지나면 예외가 난다.
4. 재시도해도 중복이 없는 이유는? → batch의 `(producerId, sequence)`로 브로커가 최근 5개 batch와 비교해 중복을 버린다.
5. `acks=1`에서 유실 시나리오는? → leader가 응답한 직후, follower가 복제하기 전에 죽는 경우.
6. 순서가 깨지는 경우는? → idempotence를 끄고 in-flight > 1에서 재시도할 때, 파티션 수를 늘릴 때. 파티션 사이에는 원래 순서가 없다.

---

## Lesson 2 · `broker-log`

- **Title:** 파티션 로그와 zero-copy
- **Subtitle:** 파티션은 디렉터리, 로그는 segment 파일
- **Summary:** batch가 page cache를 거쳐 segment에 쌓이고, consumer fetch가 sparse index로 위치를 찾아 `sendfile`로 나가는 과정을 본다.
- **Critical path:** Produce → page cache → segment + sparse index → Fetch → index lookup → `sendfile`.
- **Overview:** Kafka가 디스크를 쓰면서도 빠른 이유는 순차 append, OS page cache, batch 단위 I/O, `sendfile` zero-copy다. 기본 설정에서 주기적 fsync는 꺼져 있고, 내구성은 복제로 얻는다(lesson 4). 브로커가 비정상 종료되면 시작할 때 마지막 segment를 CRC로 검사하고, 손상된 꼬리를 잘라 낸다. index는 다시 만든다.
- **Interview questions:** Kafka는 왜 빠른가? offset으로 레코드를 어떻게 찾나? retention은 무엇 단위로 지우나? TLS를 켜면 zero-copy는? 매 쓰기마다 fsync하나?

### Panels

| Node | Panel (initial) |
|---|---|
| `log` | `orders-0/`: `00000000000000000000.log (+ .index, .timeindex)` |
| `pagecache` | `cache`: `dirty: 0 B` / `cached: 0 B` |
| `index` | `active .index`: `(0 → 0)` / `last lookup: —` |

### Steps

**S1 · move · `producer → b1` · Network** — *critical*
- Token: `request` · `Produce orders-0 (16 KiB)`
- Title: batch가 브로커에 도착
- Subtitle: producer, broker, consumer가 같은 바이너리 형식을 쓴다.
- Prose: producer, broker, consumer가 한 가지 바이너리 형식을 쓰므로, 브로커는 받은 batch를 변환하지 않고 파일에 붙인다. 나중에도 그대로 내보낸다. 요청 하나에 메시지 여러 개가 실리므로 네트워크 왕복 비용이 나뉜다.
- Facts: one shared format (record batch v2); batching amortizes round trips.
- Event log: `Producer → Broker 1 · Network · Produce orders-0 · 16 KiB (E.G.)`
- Sources: [L1]

**S2 · mutate · `pagecache` · Storage** — *critical*
- Title: page cache에 쓰기
- Subtitle: 로그에 쓴다는 것은 커널 page cache로 넘긴다는 뜻이다. fsync는 하지 않는다.
- Prose: 브로커는 받은 데이터를 바로 로그 파일에 쓰지만, 디스크로 flush하지는 않는다. 커널 page cache로 넘어갈 뿐이다. JVM 힙 캐시를 두지 않고 page cache에 기대므로 GC 부담이 없다. 브로커를 재시작해도 page cache는 그대로 남는다.
- Facts: `log.flush.interval.messages` = Long.MAX (no forced flush); durability comes from replication; cache survives broker restart.
- Event log: `Broker 1 → page cache · Storage · write() · 16 KiB (E.G.)`
- After: `dirty: 16 KiB (E.G.)` / `cached: 16 KiB (E.G.)`
- Sources: [L2], [L3]

**S3 · mutate · `log` · Storage** — *critical*
- Title: 파티션 = 디렉터리, segment = 파일
- Subtitle: 활성 segment 끝에만 append한다.
- Prose: 파티션 `orders-0`은 디렉터리 하나다. 그 안에 segment마다 `.log`(데이터), `.index`(offset index), `.timeindex`(time index) 파일이 있다. 파일 이름은 그 segment의 첫 offset이다. append는 마지막 활성 segment에만 한다.
- Facts: file name = first offset, 20 digits; per segment `.log` + `.index` + `.timeindex`; appends go to the active segment only.
- Event log: `Broker 1 · Storage · append to 00000000000000001024.log (E.G.) · —`
- After: `00000000000000000000.log (+ .index, .timeindex)` / `00000000000000001024.log (+ .index, .timeindex) · active (E.G.)`
- Sources: [L4], [L5]

**S4 · mutate · `index` · Storage** — *critical*
- Title: sparse offset index
- Subtitle: 약 4 KiB마다 entry 하나: offset → 파일 위치.
- Prose: 레코드마다 index를 남기지 않는다. 마지막 entry 이후 쓴 바이트가 `log.index.interval.bytes`를 넘으면 그때 entry를 하나 추가한다. 그래서 index가 작아 mmap으로 메모리에 둘 수 있다.
- Facts: `log.index.interval.bytes` = 4096; entry = offset (relative) → file position; index is memory-mapped.
- Event log: `Broker 1 → .index · Storage · add (1061 → 4182) (E.G.) · 8 B`
- After: `(0 → 0)` / `(1061 → 4182) (E.G.)` / `last lookup: —`
- Sources: [L6], [L7]

**S5 · mutate · `log` · Storage** — *side*
- Title: segment roll
- Subtitle: 1 GiB가 차거나 7일이 지나면 새 segment를 연다.
- Prose: 활성 segment가 `segment.bytes`(1 GiB)를 넘거나 `segment.ms`(7일)만큼 오래되면, 닫고 새 segment를 연다. 닫힌 segment는 더 바뀌지 않는다. retention과 compaction은 닫힌 segment만 대상으로 한다.
- Facts: `log.segment.bytes` = 1073741824; `log.roll.hours` = 168; only closed segments are deleted or compacted.
- Event log: `Broker 1 · Storage · roll → 00000000000000052113.log (E.G.) · —`
- After: `00000000000000000000.log (+ index)` / `00000000000000001024.log (+ index) · closed (E.G.)` / `00000000000000052113.log (+ index) · active (E.G.)`
- Sources: [L8], [L9]

**S6 · mutate · `log` · Storage** — *side*
- Title: retention은 segment 단위
- Subtitle: 기준을 넘은 가장 오래된 segment를 통째로 지운다.
- Prose: 삭제는 segment 하나씩 한다. 시간 기준은 segment 안 가장 큰 timestamp로 판단한다. 크기 기준(`retention.bytes`)은 기본으로 꺼져 있다. 그래서 활성 segment에 든 레코드나, 늦게 들어온 레코드가 있는 segment는 7일보다 오래 남을 수 있다. 디스크가 찰 때 먼저 볼 설정이다.
- Facts: `log.retention.hours` = 168; `log.retention.bytes` = -1 (off); a segment is deleted when its newest record expires.
- Event log: `Broker 1 · Storage · delete 00000000000000000000.* (E.G.) · —`
- After: `00000000000000001024.log (+ index) · closed (E.G.)` / `00000000000000052113.log (+ index) · active (E.G.)`
- Sources: [L10], [L9]

**S7 · move · `c1 → b1` · Network** — *critical*
- Token: `request` · `Fetch orders-0 offset=1237`
- Title: Fetch (long poll)
- Subtitle: consumer가 offset을 주고 그 위치부터 당겨 간다.
- Prose: consumer는 다음 offset을 담아 Fetch를 보낸다. 데이터가 없으면 브로커가 `fetch.min.bytes`가 찰 때까지 최대 `fetch.max.wait.ms` 동안 응답을 미룬다(long poll). pull 방식이라 느린 consumer는 뒤처질 뿐, 넘치지 않는다.
- Facts: `fetch.min.bytes` = 1; `fetch.max.wait.ms` = 500; `max.partition.fetch.bytes` = 1048576.
- Event log: `Consumer A → Broker 1 · Network · Fetch offset=1237 (E.G.) · ~90 B (E.G.)`
- Decoder: **FetchRequest** (`wire: yes`, consumer column)
- Sources: [L11], [L12], [L13]

**S8 · mutate · `index` · Storage** — *critical*
- Title: offset → 파일 위치
- Subtitle: segment를 고르고, index를 binary search하고, 조금 훑는다.
- Prose: 먼저 base offset으로 1237이 든 segment를 고른다. 그 segment의 `.index`에서 1237 이하 가장 큰 entry를 binary search로 찾는다. 그 위치부터 `.log`를 앞으로 훑는다. index가 sparse라 훑는 거리는 약 4 KiB 이내다.
- Facts: lookup = greatest indexed offset ≤ target; scan ≤ ~`log.index.interval.bytes`.
- Event log: `Broker 1 · Storage · lookup 1237 → pos 4182 (E.G.) · <1 ms (E.G.)`
- After: `(0 → 0)` / `(1061 → 4182) (E.G.)` / `last lookup: 1237 → scan from 4182 (E.G.)`
- Sources: [L7], [L14]

**S9 · move · `pagecache → c1` · Network** — *critical*
- Token: `response` · `FetchResponse via sendfile`
- Title: `sendfile` zero-copy
- Subtitle: page cache에서 소켓으로 바로 간다. user space를 거치지 않는다.
- Prose: 일반 경로는 page cache → 애플리케이션 버퍼 → 소켓 버퍼 → NIC로 복사가 여러 번 일어난다. Kafka는 `sendfile`(`FileChannel.transferTo`)로 page cache에서 소켓으로 바로 보낸다. 따라잡은 consumer는 page cache에서 읽으므로 디스크 읽기가 거의 없다. TLS를 켜면 user space에서 암호화해야 하므로 `sendfile`을 쓰지 않는다.
- Facts: zero-copy = `fileChannel.transferTo(…, socketChannel)`; TLS listener → no `sendfile`; response carries `HighWatermark` and records (compressed stays compressed).
- Event log: `Broker 1 → Consumer A · Network · FetchResponse HW=1300 (E.G.) · 1 MiB (E.G.)`
- Sources: [L15], [L16], [L17]

**Replay:** Produce → page cache → active segment + index entry → Fetch → index lookup → `sendfile` to the consumer.

### Decoder records used

| Record | Step | wire |
|---|---|---|
| FetchRequest (consumer) | S7 | yes |

### Sources

| id | What | URL |
|---|---|---|
| L1 | Batching and shared binary format | `K/docs/design/design.md#L76-L92` |
| L2 | Page-cache-centric design | `K/docs/design/design.md#L53-L64` |
| L3 | Flush defaults | `K/server-common/src/main/java/org/apache/kafka/server/config/ServerLogConfigs.java#L101-L113` |
| L4 | Partition directory and file naming | `K/docs/implementation/log.md#L29-L39` |
| L5 | File suffixes; 20-digit name | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogFileUtils.java#L37-L52`, `#L102-L108` |
| L6 | Index append every `indexIntervalBytes`; default | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogSegment.java#L255-L279`, `K/server-common/src/main/java/org/apache/kafka/server/config/ServerLogConfigs.java#L97` |
| L7 | `OffsetIndex` format and lookup | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/OffsetIndex.java#L30-L56`, `#L90-L106` |
| L8 | `shouldRoll` | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogSegment.java#L167-L173` |
| L9 | Segment and retention defaults | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogConfig.java#L130-L138`, `#L160-L172`; `K/server-common/src/main/java/org/apache/kafka/server/config/ServerLogConfigs.java#L81` |
| L10 | Deletes per segment, by largest timestamp | `K/docs/implementation/log.md#L70-L72` |
| L11 | Pull and long poll | `K/docs/design/design.md#L135-L145` |
| L12 | `FetchRequest` schema | `K/clients/src/main/resources/common/message/FetchRequest.json#L16-L125` |
| L13 | Consumer fetch defaults | `K/clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerConfig.java#L212`, `#L225`, `#L235`, `#L250` |
| L14 | Reads: locate segment, binary search | `K/docs/implementation/log.md#L41-L47` |
| L15 | `sendfile` path and TLS exception | `K/docs/design/design.md#L92-L111` |
| L16 | `transferTo` call path | `K/clients/src/main/java/org/apache/kafka/common/record/internal/FileRecords.java#L280-L291`, `K/clients/src/main/java/org/apache/kafka/common/network/PlaintextTransportLayer.java#L212-L215` |
| L17 | `FetchResponse` partition fields | `K/clients/src/main/resources/common/message/FetchResponse.json#L73-L111` |

### Self-check

1. offset 1237을 찾는 과정은? → segment를 고르고, `.index`에서 1237 이하 최대 entry를 binary search로 찾은 뒤, 그 위치부터 `.log`를 훑는다.
2. index가 sparse인 이유는? → 약 4 KiB마다 entry를 하나만 두어 index를 작게 유지하고 mmap할 수 있게 한다.
3. 기본 설정에서 fsync는? → 주기적 강제 flush가 없다. 내구성은 복제로 얻는다.
4. retention이 7일인데 더 오래된 데이터가 남는 이유는? → segment 단위로, segment 안 가장 새 레코드 기준으로 지우기 때문이다. 활성 segment는 지우지 않는다.
5. zero-copy가 꺼지는 경우는? → TLS 리스너.

---

## Lesson 3 · `log-compaction`

- **Title:** 키별 최신 값만 남는 로그
- **Subtitle:** `cleanup.policy=compact`
- **Summary:** compacted 토픽에서 cleaner가 키별 마지막 offset 지도를 만들고, 오래된 값과 tombstone을 지우되 offset과 순서는 바꾸지 않는 과정을 본다.
- **Critical path:** keyed writes → dirty section → cleaner builds key→offset map → recopy without old values → full replay sees final state.
- **Overview:** `delete` 정책(기본값)은 시간이나 크기로 오래된 segment를 버린다. `compact` 정책은 키마다 최소한 마지막 값을 남긴다. DB 변경 로그, 캐시 복원, `__consumer_offsets`처럼 키별 최신 상태가 필요한 토픽에 쓴다. 정책은 토픽마다 정한다. compaction은 background thread가 segment를 다시 복사해서 하므로 읽기를 막지 않는다. idempotent·transaction 데이터는 예외 규칙이 있다. producer마다 마지막 batch를 남기고, LSO 이후는 정리하지 않는다.
- **Interview questions:** compaction은 언제 쓰나? tombstone은 언제 사라지나? compaction 후에도 offset이 그대로인 이유는? 왜 최신 레코드가 한동안 정리되지 않나?

### Panels

| Node | Panel (initial) |
|---|---|
| `log` (`users-0`) | `users-0`: `clean: —` / `dirty: —` / `active: —` |
| `cleaner` | `cleaner`: `chosen: —` / `dirty ratio: —` / `map: —` |

### Steps

**S1 · move · `producer → log` · Network** — *critical*
- Token: `data` · `key=123 → bill@gmail.com`
- Title: 같은 키의 변경 이벤트
- Subtitle: user 123의 이메일이 바뀔 때마다 key=123 레코드를 쓴다.
- Prose: 변경마다 같은 키로 레코드를 쓴다. 그대로 두면 로그가 계속 자라고, 시간으로 지우면 어떤 키의 현재 값까지 사라진다. compaction은 키마다 마지막 값을 남겨 두 문제를 함께 푼다.
- Facts: topic config `cleanup.policy=compact`; broker default `log.cleanup.policy` = `delete`; records need a key.
- Event log: `Producer → Broker 1 · Network · Produce users-0 key=123 · 40 B (E.G.)`
- Sources: [C1], [C2]

**S2 · mutate · `log` · Storage** — *critical*
- Title: clean, dirty, active
- Subtitle: 이미 정리한 구간 뒤에 아직 정리하지 않은 구간이 있다.
- Prose: cleaner는 로그를 이미 정리한 clean 구간과 그 뒤의 dirty 구간으로 나눠 본다. 활성 segment는 절대 정리하지 않는다. 그래서 최신 레코드는 segment가 roll될 때까지 그대로 남는다.
- Facts: active segment never compacted; only closed segments are cleanable.
- Event log: `Broker 1 · Storage · users-0 clean ≤ 35, dirty 36–39 (E.G.) · —`
- After: `clean: 0–35 (E.G.)` / `dirty: 36 123=bill@microsoft.com · 37 456=x · 38 123=bill@gmail.com · 39 456=y (E.G.)` / `active: 40– (E.G.)`
- Sources: [C3]

**S3 · mutate · `cleaner` · Broker** — *critical*
- Title: 정리할 로그 고르기
- Subtitle: dirty 비율이 가장 높고 `min.cleanable.dirty.ratio`를 넘은 로그.
- Prose: cleaner thread는 `compact` 로그 중 dirty 바이트 비율이 가장 높은 로그를 고른다. 비율이 `min.cleanable.dirty.ratio`(0.5) 이하면 건너뛴다. 그래서 쓰기가 적은 토픽은 오래 정리되지 않을 수 있다.
- Facts: `min.cleanable.dirty.ratio` = 0.5; `log.cleaner.threads` = 1.
- Event log: `Log cleaner · Broker · choose users-0 (ratio 0.62) (E.G.) · —`
- After: `chosen: users-0` / `dirty ratio: 0.62 (E.G.)` / `map: —`
- Sources: [C3], [C4], [C5]

**S4 · mutate · `cleaner` · Broker** — *critical*
- Title: key → 마지막 offset 지도
- Subtitle: dirty 구간을 훑어 키마다 가장 뒤의 offset을 기록한다.
- Prose: cleaner는 dirty 구간을 읽어 키마다 가장 뒤의 offset을 담은 지도를 만든다. 지도의 메모리는 `log.cleaner.dedupe.buffer.size`로 제한된다. 키가 아주 많으면 한 번에 다 담지 못해 여러 번에 나눠 정리한다.
- Facts: map = key → last offset in the dirty section; `log.cleaner.dedupe.buffer.size` = 134217728 (128 MiB).
- Event log: `Log cleaner · Broker · map 36–39 → 2 keys (E.G.) · —`
- After: `chosen: users-0` / `dirty ratio: 0.62 (E.G.)` / `map: 123 → 38 · 456 → 39 (E.G.)`
- Sources: [C3], [C4], [C6]

**S5 · mutate · `log` · Storage** — *critical*
- Title: 다시 복사하며 오래된 값 제거
- Subtitle: 지도에 더 뒤의 offset이 있는 레코드는 버린다. offset은 그대로다.
- Prose: cleaner는 segment를 다시 복사하면서, 지도에 더 뒤의 offset이 있는 키의 레코드를 뺀다. 남은 레코드는 원래 offset을 유지하고 순서도 바뀌지 않는다. 그래서 offset 36, 37, 38에서 읽기 시작하면 모두 38부터 받는다.
- Facts: offsets never change; order never changes; cleaned segments swap in one at a time.
- Event log: `Log cleaner → users-0 · Storage · recopy, drop 36 and 37 (E.G.) · —`
- After: `clean: 0–35 · 38 123=bill@gmail.com · 39 456=y (E.G.)` / `dirty: —` / `active: 40– (E.G.)`
- Sources: [C3], [C6]

**S6 · mutate · `log` · Storage** — *side*
- Title: tombstone으로 삭제
- Subtitle: value가 null인 레코드는 삭제 표시이고, `delete.retention.ms` 뒤에 자신도 사라진다.
- Prose: key가 있고 value가 null인 레코드가 tombstone이다. compaction은 tombstone보다 앞선 같은 키의 값을 지운다. tombstone 자신은 `delete.retention.ms`(24시간) 뒤에 지운다. 그보다 오래 뒤처진 consumer는 삭제를 놓친다.
- Facts: tombstone = key + null value; `delete.retention.ms` = 86400000.
- Event log: `Producer → users-0 · Storage · tombstone key=456 at 42 (E.G.) · —`
- After: `clean: 0–35 · 38 123=bill@gmail.com · 42 456=null (until +24h) (E.G.)` / `dirty: —` / `active: 43– (E.G.)`
- Sources: [C3], [C6]

**S7 · mutate · `log` · Storage** — *side*
- Title: 최신 값이 정리되지 않을 때
- Subtitle: 활성 segment가 roll되어야 정리 대상이 된다.
- Prose: 쓰기가 적은 토픽에서는 활성 segment가 오래 닫히지 않는다. 그동안 그 안의 오래된 값이 남는다. `max.compaction.lag.ms`를 정하면 segment를 그 시간 안에 roll하고, dirty 비율이 낮아도 정리한다.
- Facts: roll at min(`segment.ms`, `max.compaction.lag.ms`); `max.compaction.lag.ms` default = Long.MAX (off).
- Event log: `Broker 1 · Storage · roll users-0 (max.compaction.lag.ms) (E.G.) · —`
- After: `clean: 0–35 · 38 · 42 (E.G.)` / `dirty: 43–50 (E.G.)` / `active: 51– (E.G.)`
- Sources: [C7], [C5]

**S8 · move · `log → c1` · Network** — *critical*
- Token: `response` · `FetchResponse users-0 from 0`
- Title: 처음부터 읽으면 최종 상태
- Subtitle: 처음부터 읽는 consumer는 키마다 최종 값을 쓰인 순서대로 본다.
- Prose: 로그 처음부터 읽는 consumer는 모든 키의 최종 값을 쓰인 순서대로 본다. 캐시나 로컬 상태를 이 토픽으로 다시 만들 수 있다. 단 tombstone까지 보려면 `delete.retention.ms` 안에 끝까지 읽어야 한다.
- Facts: full replay sees final state per key; tombstones visible only within `delete.retention.ms`.
- Event log: `Broker 1 → Consumer A · Network · FetchResponse users-0 0.. · 64 KiB (E.G.)`
- Sources: [C6]

**Replay:** keyed writes → dirty section → cleaner picks the log → key→offset map → recopy without old values → consumer replays to the final state.

### Decoder records used

None. The record batch decoder from lesson 1 is not repeated here; a tombstone is a record with `valueLength = -1`.

### Sources

| id | What | URL |
|---|---|---|
| C1 | Compaction motivation and example | `K/docs/design/design.md#L366-L401` |
| C2 | `log.cleanup.policy` default | `K/server-common/src/main/java/org/apache/kafka/server/config/ServerLogConfigs.java#L89` |
| C3 | `LogCleaner` Javadoc | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogCleaner.java#L47-L95` |
| C4 | Cleaner defaults; dirtiest-log choice | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/CleanerConfig.java#L38-L44`, `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogCleanerManager.java#L277-L290` |
| C5 | Topic compaction defaults | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/CleanerConfig.java#L134-L137` |
| C6 | Compaction basics, guarantees, details | `K/docs/design/design.md#L403-L434` |
| C7 | Active segment roll and `max.compaction.lag.ms` | `K/docs/design/design.md#L437-L461` |

### Self-check

1. `delete`와 `compact`의 차이는? → `delete`는 시간이나 크기로 segment를 지운다. `compact`는 키마다 마지막 값을 남긴다.
2. compaction 후 offset 36, 37, 38에서 읽으면? → 모두 38부터 받는다. offset은 바뀌지 않는다.
3. tombstone은 언제 사라지나? → `delete.retention.ms`(24시간) 뒤에.
4. 오래된 값이 정리되지 않고 남는 흔한 이유는? → 활성 segment가 아직 roll되지 않았거나, dirty 비율이 0.5를 넘지 않았다.

---

## Lesson 4 · `replication`

- **Title:** ISR과 high watermark
- **Subtitle:** `acks=all`이 무엇을 기다리는가
- **Summary:** follower fetch로 LEO가 오르고, HW가 따라 오르고, `acks=all` 응답이 나가고, 느린 follower가 ISR에서 빠지고, `min.insync.replicas`가 쓰기를 막는 과정을 본다.
- **Critical path:** leader append → follower Fetch → LEO → HW → `acks=all` response → consumer reads to HW.
- **Overview:** 복제 단위는 파티션이다. leader 하나가 쓰기를 받고, follower가 consumer처럼 fetch해 복제한다. ISR(in-sync replicas) 전원이 받은 메시지가 committed이고, consumer는 committed 메시지만 본다. replica가 f+1개면 f개의 장애에서 committed 데이터를 잃지 않는다. 운영 표준은 RF 3, `min.insync.replicas` 2, `acks=all`이다. leader 장애와 선출은 lesson 8에서 다룬다.
- **Interview questions:** ISR은 무엇이고 언제 바뀌나? HW는 어떻게 정해지나? consumer는 왜 HW까지만 읽나? RF 3, min ISR 2에서 broker 두 대가 죽으면?

### Panels

| Node | Panel (initial) |
|---|---|
| `b1` | `orders-0 replicas`: `B1 (leader): LEO 100 · ISR` / `B2: LEO 100 · ISR` / `B3: LEO 100 · ISR` / `HW: 100` |
| `controller` | `orders-0`: `leader: 1` / `ISR: [1, 2, 3]` |

### Steps

**S1 · mutate · `b1` · Broker** — *critical*
- Title: leader에 쓰기
- Subtitle: 모든 쓰기는 leader로 가고, leader의 LEO가 먼저 오른다.
- Prose: 파티션마다 leader 하나와 follower가 있다. replication factor는 leader를 포함한 replica 수다. 쓰기는 모두 leader로 간다. leader는 로컬에 append해 LEO(log end offset)를 올린다.
- Facts: RF includes the leader; all writes go to the leader; `default.replication.factor` = 1 (set 3 in production).
- Event log: `Producer → Broker 1 · Network · Produce acks=all orders-0 · 16 KiB (E.G.)`
- After: `B1 (leader): LEO 110 · ISR (E.G.)` / `B2: LEO 100 · ISR` / `B3: LEO 100 · ISR` / `HW: 100`
- Sources: [R1]

**S2 · move · `b2 → b1` · Network** — *critical*
- Token: `request` · `Fetch fetchOffset=100 (replica 2)`
- Title: follower가 fetch한다
- Subtitle: follower는 consumer처럼 leader에서 당겨 온다.
- Prose: follower는 일반 consumer처럼 leader에 Fetch를 보내고, 받은 데이터를 자기 로그에 붙인다. 요청의 fetch offset은 follower가 다음에 받을 offset, 즉 follower의 LEO다.
- Facts: followers pull; `replica.fetch.wait.max.ms` = 500; `num.replica.fetchers` = 1.
- Event log: `Broker 2 → Broker 1 · Network · Fetch fetchOffset=100 replica=2 · ~100 B (E.G.)`
- Decoder: **FetchRequest** (`wire: yes`, follower column)
- Sources: [R2], [R3]

**S3 · mutate · `b1` · Broker** — *critical*
- Title: follower LEO 기록
- Subtitle: 다음 fetch offset이 follower의 LEO다.
- Prose: B2가 다음 fetch에서 110을 요청하면 leader는 B2가 110까지 받았다고 기록한다. 이때 B2가 leader 끝까지 따라잡은 시각도 기록한다. 이 시각이 ISR 판단 기준이다(S7).
- Facts: follower LEO = its `FetchOffset`; caught-up = `LEO == leader LEO` or caught up within `replica.lag.time.max.ms`.
- Event log: `Broker 2 → Broker 1 · Network · Fetch fetchOffset=110 · —`
- After: `B1 (leader): LEO 110 · ISR` / `B2: LEO 110 · ISR · caught up` / `B3: LEO 105 · ISR (E.G.)` / `HW: 100`
- Sources: [R4], [R5]

**S4 · mutate · `b1` · Broker** — *critical*
- Title: high watermark 전진
- Subtitle: HW = ISR 멤버 LEO 중 최솟값.
- Prose: HW는 ISR 전원이 가진 마지막 지점이다. 여기서는 B3의 105다. HW 아래 메시지가 committed다. ISR이 `min.insync.replicas`보다 작아지면 HW는 오르지 않는다.
- Facts: HW = min LEO over ISR; messages below HW are committed; HW does not advance when ISR < `min.insync.replicas`.
- Event log: `Broker 1 · Broker · HW 100 → 105 (E.G.) · —`
- After: `B1 (leader): LEO 110 · ISR` / `B2: LEO 110 · ISR` / `B3: LEO 105 · ISR (E.G.)` / `HW: 105 (E.G.)`
- Sources: [R6]

**S5 · move · `b1 → producer` · Network** — *critical*
- Token: `response` · `ProduceResponse baseOffset=100`
- Title: `acks=all` 응답
- Subtitle: HW가 요청 offset을 넘으면 응답한다.
- Prose: `acks=all` 요청은 HW가 그 요청의 offset을 넘을 때까지 브로커에서 기다린다. "all"은 할당된 모든 replica가 아니라 현재 ISR 전원이다. 그래서 ISR이 leader 하나로 줄면, `min.insync.replicas`가 없을 때 leader만으로도 성공 응답이 나간다.
- Facts: completes when HW ≥ request offset; `acks=all` = current ISR, not all replicas.
- Event log: `Broker 1 → Producer · Network · ProduceResponse baseOffset=100 · 6 ms (E.G.)`
- Sources: [R7], [R8]

**S6 · move · `c1 → b1` · Network** — *critical*
- Token: `request` · `Fetch offset=100`
- Title: consumer는 HW까지만 본다
- Subtitle: committed 메시지만 consumer에게 준다.
- Prose: consumer fetch는 HW까지만 레코드를 돌려준다. 그래서 consumer는 leader가 죽으면 사라질 수 있는 메시지를 보지 않는다. follower는 예외로 LEO까지 읽는다. 그래야 복제가 진행된다.
- Facts: consumer reads up to HW; follower reads up to LEO; `read_committed` reads up to LSO (lesson 7).
- Event log: `Consumer A → Broker 1 · Network · Fetch offset=100 → 100–104 (E.G.) · 8 KiB (E.G.)`
- Sources: [R9], [R10]

**S7 · mutate · `b1` · Broker** — *side*
- Title: 느린 follower는 ISR에서 빠진다
- Subtitle: `replica.lag.time.max.ms`(30초) 동안 따라잡지 못하면 out-of-sync다.
- Prose: B3가 30초 동안 leader 끝까지 따라잡지 못했다. 디스크가 느리거나, GC가 길거나, 네트워크가 막힌 경우다. leader는 B3를 ISR에서 빼려고 한다. replica lag 알람이 울리는 지점이 여기다.
- Facts: `replica.lag.time.max.ms` = 30000; stuck or slow follower → removed from ISR; dead broker → removed via controller session (lesson 8).
- Event log: `Broker 1 · Broker · B3 out of sync (lag 31 s) (E.G.) · —`
- After: `B1 (leader): LEO 140 · ISR` / `B2: LEO 140 · ISR` / `B3: LEO 105 · leaving ISR (E.G.)` / `HW: 105 (E.G.)`
- Sources: [R11], [R12]

**S8 · move · `b1 → controller` · Controller** — *side*
- Token: `request` · `AlterPartition orders-0 ISR=[1,2]`
- Title: ISR 변경 요청
- Subtitle: ISR 변경은 controller가 metadata에 기록해야 확정된다.
- Prose: leader는 새 ISR을 `AlterPartition`으로 controller에 보낸다. controller가 기록하면 모든 broker가 새 ISR을 안다. ISR은 바뀔 때마다 cluster metadata에 저장된다. 그래서 controller는 leader가 죽었을 때 누구를 새 leader로 뽑을지 안다.
- Facts: request = `AlterPartition`; ISR persisted in cluster metadata on every change.
- Event log: `Broker 1 → Controller · Controller · AlterPartition ISR [1,2] · ~60 B (E.G.)`
- Sources: [R13], [R14]

**S9 · mutate · `controller` · Controller** — *side*
- Title: ISR 축소 확정
- Subtitle: ISR=[1,2]. 이제 B3 없이 HW가 오른다.
- Prose: controller가 새 ISR을 기록하면, leader는 B3를 빼고 HW를 계산한다. 막혀 있던 `acks=all` 요청도 진행된다. ISR 멤버라면 누구나 다음 leader가 될 수 있다.
- Facts: ISR members are the leader candidates; HW resumes without the removed replica.
- Event log: `Controller · Controller · orders-0 ISR=[1,2] (E.G.) · —`
- After: `leader: 1` / `ISR: [1, 2]`
- Sources: [R14], [R15]

**S10 · mutate · `b1` · Broker** — *side*
- Title: `min.insync.replicas`가 쓰기를 막는다
- Subtitle: ISR이 min ISR보다 작으면 `acks=all` 쓰기를 거절한다.
- Prose: B2까지 빠져 ISR=[1]이 되면, `min.insync.replicas=2`인 토픽은 `acks=all` 쓰기를 `NOT_ENOUGH_REPLICAS`로 거절한다. 사라질 수 있는 쓰기를 받지 않는 대신 가용성을 내준다. 기본값은 1이므로 운영에서는 2로 올린다.
- Facts: ISR < `min.insync.replicas` + `acks=all` → `NOT_ENOUGH_REPLICAS`; `min.insync.replicas` = 1 (default); only applies to `acks=all`.
- Event log: `Producer → Broker 1 · Network · Produce acks=all → NOT_ENOUGH_REPLICAS · 1 ms (E.G.)`
- After: `B1 (leader): LEO 140 · ISR` / `B2: LEO 120 · out (E.G.)` / `B3: LEO 105 · out` / `HW: 140 · acks=all rejected`
- Sources: [R16], [R17], [R8]

**Replay:** Produce to leader → follower Fetch → follower LEO → HW → `acks=all` response → consumer Fetch up to HW.

### Decoder records used

| Record | Step | wire |
|---|---|---|
| FetchRequest (follower) | S2 | yes |

### Sources

| id | What | URL |
|---|---|---|
| R1 | Replication basics; `default.replication.factor` | `K/docs/design/design.md#L279-L285`, `K/server/src/main/java/org/apache/kafka/server/config/ReplicationConfigs.java#L41-L42` |
| R2 | Followers pull like consumers | `K/docs/design/design.md#L287` |
| R3 | Replica fetcher defaults | `K/server/src/main/java/org/apache/kafka/server/config/ReplicationConfigs.java#L55-L103` |
| R4 | `isFollowerInSync` | `K/core/src/main/scala/kafka/cluster/Partition.scala#L907-L911` |
| R5 | `ReplicaState.isCaughtUp` | `K/server/src/main/java/org/apache/kafka/server/replica/ReplicaState.java#L62-L67` |
| R6 | `maybeIncrementLeaderHW` (incl. min-ISR guard) | `K/core/src/main/scala/kafka/cluster/Partition.scala#L985-L1035` |
| R7 | `checkEnoughReplicasReachOffset` | `K/core/src/main/scala/kafka/cluster/Partition.scala#L947-L981` |
| R8 | `acks=all` = current ISR; min ISR trade-off | `K/docs/design/design.md#L351-L356` |
| R9 | Only committed messages reach consumers | `K/docs/design/design.md#L302-L309` |
| R10 | `FetchIsolation` | `K/server-common/src/main/java/org/apache/kafka/server/storage/log/FetchIsolation.java#L22-L39` |
| R11 | Out-of-sync detection | `K/core/src/main/scala/kafka/cluster/Partition.scala#L1133-L1161` |
| R12 | Liveness conditions | `K/docs/design/design.md#L289-L298` |
| R13 | `AlterPartition` request | `K/clients/src/main/resources/common/message/AlterPartitionRequest.json#L16-L60`, `K/metadata/src/main/java/org/apache/kafka/controller/ReplicationControlManager.java#L1078-L1083` |
| R14 | ISR persisted in metadata; ISR vs majority | `K/docs/design/design.md#L321-L333` |
| R15 | Controller elects from ISR | `K/docs/design/design.md#L360-L364` |
| R16 | `NotEnoughReplicasException` | `K/core/src/main/scala/kafka/cluster/Partition.scala#L1230-L1240` |
| R17 | `min.insync.replicas` default | `K/server-common/src/main/java/org/apache/kafka/server/config/ServerLogConfigs.java#L155` |

### Self-check

1. HW는 어떻게 정해지나? → ISR 멤버 LEO 중 최솟값이다. ISR이 min ISR보다 작으면 오르지 않는다.
2. consumer가 HW까지만 읽는 이유는? → HW 위의 메시지는 leader가 죽으면 사라질 수 있기 때문이다.
3. RF 3, min ISR 2, `acks=all`에서 broker 2대가 죽으면? → `acks=all` 쓰기가 `NOT_ENOUGH_REPLICAS`로 거절된다. 읽기는 기존 HW까지 된다.
4. RF 3, min ISR 1(기본값)이면 무엇이 위험한가? → ISR이 leader 하나로 줄어도 쓰기가 성공한다. 그 leader가 죽으면 유실된다.
5. follower가 ISR에서 빠지는 조건은? → 30초 동안 따라잡지 못하거나, 브로커가 죽어 controller 세션이 끊길 때.

---

## Lesson 5 · `consumer-rebalance`

- **Title:** 파티션 재분배
- **Subtitle:** 멤버가 바뀔 때 파티션을 어떻게 다시 나누나
- **Summary:** coordinator를 찾고, classic 프로토콜이 JoinGroup/SyncGroup으로 할당하고, eager와 cooperative가 revoke하는 방식과, KIP-848 `consumer` 프로토콜이 서버 쪽에서 멤버별로 맞추는 방식을 비교한다.
- **Critical path:** find coordinator → join → assign → member joins → revoke → reassign.
- **Overview:** 파티션 하나는 group 안에서 consumer 하나만 읽는다. 멤버가 들어오거나 나가면 파티션을 다시 나눈다. 이것이 rebalance다. 자주 일어나면 처리가 계속 멈추는 rebalance storm이 된다. 흔한 원인은 배포 재시작, 느린 처리로 인한 `max.poll.interval.ms` 초과, heartbeat 끊김이다. 4.4.0 `KafkaConsumer`의 기본은 classic 프로토콜이다. `group.protocol=consumer`로 KIP-848 프로토콜을 켤 수 있다.
- **Interview questions:** consumer가 파티션보다 많으면? eager와 cooperative의 차이는? `max.poll.interval.ms`와 `session.timeout.ms`의 차이는? rebalance storm은 어떻게 줄이나?

### Panels

| Node | Panel (initial) |
|---|---|
| `c1` | `Consumer A`: `owned: —` |
| `coord` | `order-svc`: `generation/epoch: 0` / `members: —` |

### Steps

**S1 · move · `c1 → coord` · Network** — *critical*
- Token: `request` · `FindCoordinator(order-svc)`
- Title: coordinator 찾기
- Subtitle: group.id 해시로 정해지는 `__consumer_offsets` 파티션의 leader다.
- Prose: group마다 coordinator broker가 하나 있다. `abs(groupId.hashCode()) % 50` 번 `__consumer_offsets` 파티션의 leader가 그 group의 coordinator다. membership과 커밋된 offset이 모두 이 broker에서 관리된다.
- Facts: coordinator = leader of `__consumer_offsets` partition `abs(hash(group.id)) % 50`; `offsets.topic.num.partitions` = 50.
- Event log: `Consumer A → Broker 2 · Network · FindCoordinator → node 2 (E.G.) · —`
- Sources: [G1], [G2]

**S2 · move · `c1 → coord` · Network** — *critical*
- Token: `request` · `JoinGroup(order-svc)`
- Title: JoinGroup (classic)
- Subtitle: 멤버가 모두 모일 때까지 기다리는 barrier.
- Prose: classic 프로토콜에서는 멤버마다 JoinGroup을 보내고, coordinator는 모든 멤버가 올 때까지 기다린다. 빈 group의 첫 rebalance는 멤버를 더 모으려고 3초 기다린다.
- Facts: `group.initial.rebalance.delay.ms` = 3000; `session.timeout.ms` = 45000; `heartbeat.interval.ms` = 3000.
- Event log: `Consumer A → Broker 2 · Network · JoinGroup · —`
- Sources: [G3], [G4]

**S3 · mutate · `coord` · Broker** — *critical*
- Title: generation과 group leader
- Subtitle: coordinator가 멤버 한 명을 leader로 정한다.
- Prose: barrier가 끝나면 coordinator는 generation을 올리고 멤버 하나를 leader로 정한다. leader에게는 전체 멤버 목록이 간다. classic에서는 할당을 coordinator가 아니라 이 leader consumer가 계산한다.
- Facts: generation bumps per rebalance; leader consumer computes the assignment.
- Event log: `Broker 2 → Consumer A · Network · JoinGroupResponse gen=1 leader=A · —`
- After: `generation/epoch: 1` / `members: A (leader)`
- Sources: [G5]

**S4 · move · `c1 → coord` · Network** — *critical*
- Token: `request` · `SyncGroup(A=[p0..p3])`
- Title: SyncGroup으로 할당 전달
- Subtitle: leader가 계산한 할당을 coordinator가 각 멤버에게 나눠 준다.
- Prose: leader는 `partition.assignment.strategy`의 assignor로 할당을 계산해 SyncGroup으로 보낸다. 다른 멤버는 SyncGroup 응답으로 자기 몫을 받는다.
- Facts: `partition.assignment.strategy` = `[RangeAssignor, CooperativeStickyAssignor]`.
- Event log: `Consumer A → Broker 2 · Network · SyncGroup A=[p0..p3] · —`
- Sources: [G6], [G5]

**S5 · mutate · `c1` · Client** — *critical*
- Title: 할당 받음
- Subtitle: A가 p0–p3을 소유하고 fetch를 시작한다.
- Prose: A는 `onPartitionsAssigned`를 부르고 p0–p3을 읽기 시작한다. 이후 heartbeat가 주기적으로 나간다. consumer가 파티션보다 많으면 남는 consumer는 할당을 받지 못한다.
- Facts: extra consumers beyond partition count stay idle; callback `onPartitionsAssigned`.
- Event log: `Broker 2 → Consumer A · Network · SyncGroupResponse [p0..p3] · —`
- After: `owned: p0, p1, p2, p3`
- Sources: [G7], [G1]

**S6 · mutate · `c1` · Client** — *critical*
- Title: B 합류: eager는 전부 내려놓는다
- Subtitle: rebalance 동안 group 전체가 멈춘다.
- Prose: B가 합류하면 rebalance가 시작된다. EAGER 프로토콜의 A는 다시 join하기 전에 모든 파티션을 revoke한다(`onPartitionsRevoked`). 새 할당을 받을 때까지 group 전체가 아무것도 처리하지 않는다. 이것이 stop-the-world rebalance다.
- Facts: EAGER revokes all partitions before rejoining; whole group pauses until SyncGroup completes.
- Event log: `Consumer A · Client · EAGER revoke [p0..p3] · —`
- After: `owned: —`
- Sources: [G8]

**S7 · mutate · `c1` · Client** — *critical*
- Title: cooperative는 옮길 것만 내려놓는다
- Subtitle: 가질 파티션은 쥔 채, 옮길 파티션만 revoke하고 한 번 더 rebalance한다.
- Prose: (S6과 비교) COOPERATIVE에서 A는 새 할당을 받은 뒤 "가진 것 − 할당된 것"만 revoke한다. 그러고 다시 join을 요청한다. 두 번째 rebalance에서 p2, p3이 B에게 간다. 그동안 A는 p0, p1을 계속 처리한다.
- Facts: revoked = owned − assigned; then a second rebalance; default strategy list includes `CooperativeStickyAssignor`.
- Event log: `Consumer A · Client · COOPERATIVE revoke [p2, p3], keep [p0, p1] (E.G.) · —`
- Before: `owned: p0, p1, p2, p3`
- After: `owned: p0, p1`
- Sources: [G9], [G8]

**S8 · move · `c2 → coord` · Network** — *side*
- Token: `request` · `ConsumerGroupHeartbeat epoch=0`
- Title: KIP-848 프로토콜: heartbeat 하나로
- Subtitle: `group.protocol=consumer`면 join, heartbeat, 할당 수신을 한 API가 맡는다.
- Prose: `consumer` 프로토콜에서는 consumer가 `ConsumerGroupHeartbeat`만 보낸다. `MemberEpoch=0`이면 합류, -1이면 떠남이다. 할당은 브로커의 assignor가 계산한다. heartbeat 간격과 session timeout도 브로커가 정한다.
- Facts: `group.protocol` default = `classic`; server assignor default = `uniform`; `group.consumer.session.timeout.ms` = 45000.
- Event log: `Consumer B → Broker 2 · Network · ConsumerGroupHeartbeat epoch=0 · ~80 B (E.G.)`
- Decoder: **ConsumerGroupHeartbeatRequest** (`wire: yes`)
- Sources: [G10], [G11], [G12]

**S9 · mutate · `coord` · Broker** — *side*
- Title: KIP-848: 멤버마다 따로 맞춘다
- Subtitle: global barrier 없이 A는 p2, p3만 내려놓고, B는 풀리는 대로 받는다.
- Prose: B가 합류하면 coordinator가 group epoch를 올리고 새 target 할당(A=[p0,p1], B=[p2,p3])을 계산한다. A는 heartbeat 응답으로 p2, p3 revoke를 받는다. A가 owned 목록에서 그것들을 빼면, B가 다음 heartbeat에서 받는다. 이 과정에 global synchronization barrier가 없어 A는 멈추지 않는다.
- Facts: group epoch bumps on membership change; member states `STABLE`, `UNREVOKED_PARTITIONS`, `UNRELEASED_PARTITIONS`; no global synchronization barrier.
- Event log: `Broker 2 → Consumer A · Network · HeartbeatResponse revoke [p2, p3] · —`
- After: `generation/epoch: group 6 (E.G.)` / `members: A [p0, p1] STABLE · B [p2, p3] STABLE`
- Sources: [G11], [G13], [G14]

**S10 · mutate · `coord` · Broker** — *side*
- Title: `max.poll.interval.ms` 초과
- Subtitle: heartbeat가 살아 있어도 poll이 멈추면 실패로 본다.
- Prose: 레코드 처리가 느려 `poll()` 간격이 `max.poll.interval.ms`(5분)를 넘으면, consumer는 실패로 간주되고 rebalance가 일어난다. `session.timeout.ms`는 heartbeat로 프로세스 생존을 본다. `max.poll.interval.ms`는 처리 진행을 본다. `max.poll.records`를 줄이거나 처리를 빠르게 하는 것이 해법이다.
- Facts: `max.poll.interval.ms` = 300000; `max.poll.records` = 500; poll timeout → member removed, rebalance.
- Event log: `Broker 2 · Broker · member A left (poll timeout) (E.G.) · —`
- After: `generation/epoch: group 7 (E.G.)` / `members: B [p0..p3] STABLE (E.G.)`
- Sources: [G4], [G15]

**S11 · mutate · `c1` · Client** — *side*
- Title: static membership
- Subtitle: `group.instance.id`로 배포 재시작 때 rebalance를 막는다.
- Prose: 보통 consumer를 재시작하면 새 멤버로 들어와 rebalance가 난다. `group.instance.id`를 인스턴스마다 고유하게 주면, session timeout 안에 돌아온 인스턴스는 같은 멤버로 인정되어 rebalance가 없다. 같은 id를 두 인스턴스가 쓰면 한쪽이 `FencedInstanceIdException`으로 종료된다.
- Facts: config = `group.instance.id`; rejoin within session timeout → no rebalance; duplicate id → `FencedInstanceIdException`.
- Event log: `Consumer A · Client · restart with group.instance.id=a-1 (E.G.) · no rebalance`
- Before: `owned: p0, p1` (before restart)
- After: `owned: p0, p1` (same, after restart)
- Sources: [G16], [G15]

**Replay:** FindCoordinator → JoinGroup → leader computes → SyncGroup → A owns p0–p3 → B joins → A revokes (eager: all, cooperative: p2, p3) → B gets p2, p3.

### Decoder records used

| Record | Step | wire |
|---|---|---|
| ConsumerGroupHeartbeatRequest | S8 | yes |

### Sources

| id | What | URL |
|---|---|---|
| G1 | One consumer per partition per group | `K/docs/design/design.md#L149-L159` |
| G2 | Coordinator partition; offsets topic partitions | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorService.java#L463`, `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorConfig.java#L119` |
| G3 | Initial rebalance delay | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorConfig.java#L178` |
| G4 | Consumer defaults | `K/clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerConfig.java#L467-L480`, `#L652-L661`, `#L100` |
| G5 | JoinGroup leader → leader computes assignment | `K/clients/src/main/java/org/apache/kafka/clients/consumer/internals/AbstractCoordinator.java#L678-L681`, `#L772`; `K/clients/src/main/java/org/apache/kafka/clients/consumer/internals/ConsumerCoordinator.java#L655` |
| G6 | `partition.assignment.strategy` default | `K/clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerConfig.java#L477-L480` |
| G7 | Assignment applied | `K/clients/src/main/java/org/apache/kafka/clients/consumer/internals/ConsumerCoordinator.java#L418-L452` |
| G8 | EAGER vs COOPERATIVE in `onJoinPrepare` | `K/clients/src/main/java/org/apache/kafka/clients/consumer/internals/ConsumerCoordinator.java#L826-L850` |
| G9 | COOPERATIVE: revoke owned − assigned, rejoin | `K/clients/src/main/java/org/apache/kafka/clients/consumer/internals/ConsumerCoordinator.java#L418-L452` |
| G10 | `ConsumerGroupHeartbeatRequest` | `K/clients/src/main/resources/common/message/ConsumerGroupHeartbeatRequest.json#L16-L51` |
| G11 | Consumer rebalance protocol doc (no global barrier, server-side assignors, default `classic`); secondary: KIP-848 | `K/docs/operations/consumer-rebalance-protocol.md#L29-L66`; `https://cwiki.apache.org/confluence/x/HhD1D` |
| G12 | `group.protocol` default; server session default | `K/clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerConfig.java#L121`, `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorConfig.java#L189` |
| G13 | Reconciliation state machine | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/modern/consumer/CurrentAssignmentBuilder.java#L186-L240`, `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/modern/MemberState.java#L32-L45` |
| G14 | Group epoch bump | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupMetadataManager.java#L2821-L2823` |
| G15 | `max.poll.interval.ms` and `session.timeout.ms` docs | `K/clients/src/main/java/org/apache/kafka/clients/CommonClientConfigs.java#L203-L209`, `#L225-L229` |
| G16 | Static membership | `K/docs/design/design.md#L167-L177` |

### Self-check

1. group coordinator는 어떻게 정해지나? → `abs(hash(group.id)) % 50` 번 `__consumer_offsets` 파티션의 leader.
2. classic에서 할당은 누가 계산하나? → group leader consumer. 계산한 할당을 SyncGroup으로 보낸다.
3. eager와 cooperative의 차이는? → eager는 전부 revoke해서 group 전체가 멈춘다. cooperative는 옮길 파티션만 revoke하고 한 번 더 rebalance한다.
4. `max.poll.interval.ms`와 `session.timeout.ms`의 차이는? → 처리 정지(poll 간격)를 보느냐, 프로세스 장애(heartbeat)를 보느냐.
5. 배포 때 rebalance를 줄이는 방법 두 가지는? → static membership(`group.instance.id`), cooperative assignor(또는 `consumer` 프로토콜).

---

## Lesson 6 · `offset-commit`

- **Title:** offset 커밋과 consumer lag
- **Subtitle:** 위치를 어디에 저장하고, 얼마나 뒤처졌는지 어떻게 재나
- **Summary:** consumer가 처리 위치를 `OffsetCommit`으로 보내 `__consumer_offsets`에 레코드로 남기고, 커밋 순서가 전달 의미를 정하고, lag을 두 방식으로 재는 과정을 본다.
- **Critical path:** poll → process → `OffsetCommit` → `__consumer_offsets` → lag = end − committed.
- **Overview:** consumer 위치는 파티션마다 "다음에 읽을 offset" 하나다. group coordinator가 이 값을 compacted 내부 토픽 `__consumer_offsets`에 저장한다. 처리한 뒤 커밋하면 at-least-once, 커밋한 뒤 처리하면 at-most-once다. lag은 운영 도구로는 end offset − committed로, consumer metric으로는 HW − position으로 잰다.
- **Interview questions:** offset은 어디에 저장되나? 자동 커밋이 중복이나 유실을 일으키는 경우는? lag은 무엇이고 어떻게 재나? 오래 멈춘 group이 다시 켜지면 어디서 시작하나?

### Panels

| Node | Panel (initial) |
|---|---|
| `c1` | `orders-0`: `position: 1237 (E.G.)` / `committed: 1237 (E.G.)` |
| `offsets` | `(order-svc, orders, 0)`: `1237 (E.G.)` |
| `tool` | `describe order-svc`: `—` |

### Steps

**S1 · mutate · `c1` · Client** — *critical*
- Title: poll과 position
- Subtitle: position은 다음에 읽을 offset이다. 커밋하기 전에는 메모리에만 있다.
- Prose: `poll()`이 1237–1239를 돌려주면 position은 1240이 된다. 이 값은 아직 메모리에만 있다. 커밋해야 재시작이나 다른 멤버가 이어받을 때 그 위치부터 읽는다. 커밋할 값은 마지막 처리 offset + 1이다.
- Facts: committed offset = next offset to read; `max.poll.records` = 500.
- Event log: `Consumer A · Client · poll → 1237–1239 (E.G.) · 3 records (E.G.)`
- After: `position: 1240 (E.G.)` / `committed: 1237 (E.G.)`
- Sources: [O1], [O2]

**S2 · move · `c1 → coord` · Network** — *critical*
- Token: `request` · `OffsetCommit orders-0=1240`
- Title: OffsetCommit
- Subtitle: 자동 커밋은 기본으로 켜져 있고 5초 간격이다.
- Prose: consumer는 position을 `OffsetCommit`으로 coordinator에 보낸다. 기본은 자동 커밋(`enable.auto.commit=true`)이고 5초마다 다음 `poll()` 때 커밋한다. 수동 커밋은 `commitSync`/`commitAsync`다. rebalance로 쫓겨난 멤버의 커밋은 generation(또는 member epoch)이 맞지 않아 거절된다.
- Facts: `enable.auto.commit` = true; `auto.commit.interval.ms` = 5000; stale generation/epoch → commit rejected.
- Event log: `Consumer A → Broker 2 · Network · OffsetCommit orders-0=1240 (E.G.) · ~70 B (E.G.)`
- Sources: [O3], [O2]

**S3 · mutate · `offsets` · Storage** — *critical*
- Title: `__consumer_offsets`에 레코드로 저장
- Subtitle: key = (group, topic, partition), value = offset.
- Prose: coordinator는 커밋을 `__consumer_offsets`에 레코드로 쓴다. 이 토픽은 compacted라 key마다 마지막 커밋만 남는다(lesson 3). 쓰기는 offsets 토픽 replica가 모두 받거나 `offsets.commit.timeout.ms`가 지나야 응답한다.
- Facts: key = (group, topic, partition); `cleanup.policy=compact`; `offsets.topic.replication.factor` = 3; `offsets.commit.timeout.ms` = 5000.
- Event log: `Broker 2 → __consumer_offsets-17 · Storage · OffsetCommit record · ~60 B (E.G.)`
- After: `(order-svc, orders, 0): 1240 (E.G.)`
- Decoder: **Offset commit record** (`wire: no`)
- Sources: [O4], [O5], [O6]

**S4 · mutate · `c1` · Client** — *side*
- Title: 커밋 순서가 전달 의미를 정한다
- Subtitle: 처리 후 커밋은 중복, 커밋 후 처리는 유실 위험이 있다.
- Prose: A가 1240–1244를 처리했지만 커밋 전에 죽었다. 이어받은 consumer는 1240부터 다시 읽으므로 1240–1244를 두 번 처리한다(at-least-once). 처리 로직은 멱등해야 한다. 반대로 커밋을 먼저 하고 처리하다 죽으면 그 메시지를 건너뛴다(at-most-once).
- Facts: process → commit = at-least-once (duplicates); commit → process = at-most-once (loss); Kafka default = at-least-once.
- Event log: `Consumer A · Client · crash before commit → restart at 1240 (E.G.) · —`
- Before: `position: 1245 (E.G.)` / `committed: 1240 (E.G.)`
- After: `position: 1240 (reset to committed, E.G.)` / `committed: 1240 (E.G.)`
- Sources: [O7]

**S5 · move · `tool → coord` · Network** — *critical*
- Token: `request` · `OffsetFetch(order-svc)`
- Title: 운영 도구: committed offset 조회
- Subtitle: `kafka-consumer-groups.sh --describe`
- Prose: `kafka-consumer-groups.sh --describe --group order-svc`는 coordinator에 group의 committed offset을 묻는다. 결과의 `CURRENT-OFFSET` 열이다. consumer 메모리의 position이 아니라 커밋된 값이다.
- Facts: command = `kafka-consumer-groups.sh --bootstrap-server … --describe --group …`; `CURRENT-OFFSET` = committed offset.
- Event log: `Tool → Broker 2 · Network · OffsetFetch(order-svc) · —`
- Sources: [O8], [O9]

**S6 · move · `tool → b1` · Network** — *critical*
- Token: `request` · `ListOffsets(latest)`
- Title: 운영 도구: 파티션 끝 조회
- Subtitle: `LOG-END-OFFSET` 열은 브로커가 HW로 답한 latest offset이다.
- Prose: 도구는 파티션의 latest offset을 leader에게 묻는다. 브로커는 consumer가 읽을 수 있는 끝, 즉 high watermark로 답한다. 그래서 `LOG-END-OFFSET`은 이름과 달리 raw LEO가 아니다.
- Facts: request = `ListOffsets` (latest); answer = HW (read_uncommitted) or LSO (read_committed).
- Event log: `Tool → Broker 1 · Network · ListOffsets orders-0 latest → 1300 (E.G.) · —`
- Sources: [O10], [O11]

**S7 · mutate · `tool` · Client** — *critical*
- Title: LAG = LOG-END-OFFSET − CURRENT-OFFSET
- Subtitle: 도구의 lag은 커밋 기준이다.
- Prose: 도구는 파티션마다 `LAG = LOG-END-OFFSET − CURRENT-OFFSET`을 출력한다. 커밋 기준이라 처리했지만 아직 커밋하지 않은 레코드도 lag에 들어간다. lag이 계속 늘면 consumer가 생산 속도를 못 따라가는 것이다. consumer를 늘리거나(파티션 수까지) 처리를 빠르게 해야 한다.
- Facts: columns = `TOPIC PARTITION CURRENT-OFFSET LOG-END-OFFSET LAG CONSUMER-ID HOST CLIENT-ID`; no commit → LAG empty; scale-out limit = partition count.
- Event log: `Tool · Client · describe order-svc · 1 row (E.G.)`
- After: `orders 0 · CURRENT-OFFSET 1240 · LOG-END-OFFSET 1300 · LAG 60 · consumer-A (E.G.)`
- Sources: [O8], [O12]

**S8 · mutate · `c1` · Client** — *side*
- Title: `records-lag`: consumer 쪽 lag
- Subtitle: HW − position. consumer가 직접 metric으로 낸다.
- Prose: consumer는 fetch 응답의 HW로 `HW − position`을 계산해 `records-lag`, `records-lag-max` metric으로 낸다. 도구의 LAG보다 즉각적이다. 커밋 지연은 포함하지 않는다. 브로커가 아니라 consumer가 발행하므로 consumer 쪽 모니터링에 연결해야 한다.
- Facts: lag = HW − position (LSO − position for `read_committed`); metric group `consumer-fetch-manager-metrics`; published by the consumer.
- Event log: `Consumer A · Client · records-lag orders-0 = 60 (E.G.) · —`
- After: `position: 1240 (E.G.)` / `committed: 1240 (E.G.)` / `records-lag: 60 (HW 1300 − 1240, E.G.)`
- Sources: [O13], [O14], [O15]

**S9 · mutate · `offsets` · Storage** — *side*
- Title: 빈 group의 offset은 7일 뒤 사라진다
- Subtitle: 다시 켜면 `auto.offset.reset`에 따라 시작한다. 기본은 `latest`다.
- Prose: group의 consumer가 모두 떠난 뒤 `offsets.retention.minutes`(7일)가 지나면, committed offset이 만료되어 지워진다. 그 뒤 group을 다시 켜면 커밋이 없으므로 `auto.offset.reset`을 따른다. 기본값 `latest`면 그사이 쌓인 메시지를 건너뛴다.
- Facts: `offsets.retention.minutes` = 10080, counted after the group becomes empty; `auto.offset.reset` = `latest`.
- Event log: `Broker 2 → __consumer_offsets · Storage · expire (order-svc, orders, 0) (E.G.) · —`
- After: `(order-svc, orders, 0): — (expired, E.G.)`
- Sources: [O16], [O2]

**Replay:** poll → process → OffsetCommit → `__consumer_offsets` record → tool reads committed and end offsets → LAG.

### Decoder records used

| Record | Step | wire |
|---|---|---|
| Offset commit record | S3 | no |

### Sources

| id | What | URL |
|---|---|---|
| O1 | Consumer position | `K/docs/design/design.md#L149-L159` |
| O2 | Consumer defaults (`max.poll.records`, auto commit, `auto.offset.reset`) | `K/clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerConfig.java#L100`, `#L489-L497`, `#L575-L578` |
| O3 | `OffsetCommitRequest` (`GenerationIdOrMemberEpoch`) | `K/clients/src/main/resources/common/message/OffsetCommitRequest.json#L16-L74` |
| O4 | `OffsetCommitKey`, `OffsetCommitValue` | `K/group-coordinator/src/main/resources/common/message/OffsetCommitKey.json#L16-L30`, `K/group-coordinator/src/main/resources/common/message/OffsetCommitValue.json#L16-L39` |
| O5 | Offsets topic `cleanup.policy=compact` | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorService.java#L2957-L2962` |
| O6 | Coordinator defaults; commit timeout doc | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorConfig.java#L114-L128` |
| O7 | Delivery semantics | `K/docs/design/design.md#L197-L207` |
| O8 | Checking consumer position (tool output) | `K/docs/operations/basic-kafka-operations.md#L152-L162` |
| O9 | `OffsetFetch` request | `K/clients/src/main/resources/common/message/OffsetFetchRequest.json#L16-L30` |
| O10 | Tool asks `OffsetSpec.latest()` | `K/tools/src/main/java/org/apache/kafka/tools/GroupOffsetsResetter.java#L222-L224`, `K/clients/src/main/java/org/apache/kafka/clients/admin/ListOffsetsOptions.java#L34` |
| O11 | Latest = HW or LSO | `K/core/src/main/scala/kafka/cluster/Partition.scala#L1441-L1443`, `#L1471-L1473` |
| O12 | Tool LAG computation | `K/tools/src/main/java/org/apache/kafka/tools/consumer/group/ConsumerGroupCommand.java#L579-L580` |
| O13 | `SubscriptionState.partitionLag` | `K/clients/src/main/java/org/apache/kafka/clients/consumer/internals/SubscriptionState.java#L651-L660` |
| O14 | `records-lag` metrics | `K/clients/src/main/java/org/apache/kafka/clients/consumer/internals/FetchMetricsRegistry.java#L102`, `#L135-L140` |
| O15 | Lag published by consumer | `K/docs/operations/monitoring.md#L759-L763` |
| O16 | `offsets.retention.minutes` doc and default | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorConfig.java#L150-L157` |

### Self-check

1. 커밋할 값은 무엇인가? → 다음에 읽을 offset, 즉 마지막 처리 offset + 1.
2. offset은 어디에 저장되나? → group coordinator가 compacted 토픽 `__consumer_offsets`에 key (group, topic, partition) 레코드로 저장한다.
3. at-least-once가 되는 순서와 그 대가는? → 처리 후 커밋. 대가는 장애 시 중복 처리이므로, 처리를 멱등하게 만든다.
4. 도구의 LAG와 `records-lag`의 차이는? → LAG는 end offset(HW) − committed다. `records-lag`은 HW − 현재 position이고 consumer가 낸다.
5. 2주 꺼 둔 group을 다시 켜면? → 빈 group의 offset은 7일 뒤 만료된다. `auto.offset.reset=latest`(기본)면 그사이 메시지를 건너뛴다.

---

## Lesson 7 · `transactions`

- **Title:** 트랜잭션으로 exactly-once
- **Subtitle:** consume-process-produce를 원자적으로
- **Summary:** `transactional.id` producer가 출력 쓰기와 offset 커밋을 한 transaction으로 묶고, coordinator가 PREPARE → markers로 끝내고, `read_committed` consumer가 LSO까지만 읽는 과정을 본다.
- **Critical path:** init (fence) → produce in txn → offsets in txn → EndTxn → PREPARE_COMMIT → markers → LSO → `read_committed` read.
- **Overview:** transactional한 것은 producer뿐이다. 다만 producer는 consumer의 offset 커밋도 transaction에 넣을 수 있다. exactly-once는 Kafka에서 읽고 Kafka에 쓰는 처리에만 적용된다. 외부 DB에 쓰는 처리는 보장하지 않는다. 마커가 다 쓰이면 coordinator가 `COMPLETE_COMMIT`을 기록한다. **Abort:** abort되면 ABORT 마커가 쓰이고 출력은 `read_committed` consumer에게 보이지 않는다. 하지만 consumer 위치는 자동으로 되감기지 않는다. committed offset으로 `seek()`하거나 producer와 consumer를 다시 만들어야 한다.
- **Interview questions:** Kafka exactly-once의 범위는? commit은 어떤 단계로 진행되나? zombie producer는 어떻게 막나? `read_committed`는 어디까지 읽나? transaction이 오래 열려 있으면 무슨 일이 생기나?

### Panels

| Node | Panel (initial) |
|---|---|
| `producer` | `TransactionManager`: `state: UNINITIALIZED` / `producerId/epoch: —` |
| `txcoord` | `copier-0`: `producerId/epoch: 7001/3 (E.G.)` / `state: COMPLETE_COMMIT` |
| `txlog` | `copier-0`: `state: COMPLETE_COMMIT` / `partitions: []` |
| `log` (`payments-0`) | `payments-0`: `tail: committed` / `HW: 5040 (E.G.)` / `LSO: 5040 (E.G.)` |
| `c2` (read_committed) | `payments-0`: `read up to: 5040 (E.G.)` / `skipped: —` |

### Steps

**S1 · move · `producer → txcoord` · Network** — *critical*
- Token: `request` · `InitProducerId(copier-0)`
- Title: initTransactions
- Subtitle: transaction coordinator를 찾아 producerId를 받는다.
- Prose: producer는 `transactional.id`를, consumer는 `isolation.level=read_committed`와 `enable.auto.commit=false`를 설정한다. `initTransactions()`는 coordinator를 찾아 `InitProducerId`를 보낸다. coordinator는 `transactional.id` 해시로 정한 `__transaction_state` 파티션의 leader다.
- Facts: coordinator = leader of `__transaction_state` partition `abs(hash(transactional.id)) % 50`; `transaction.timeout.ms` = 60000.
- Event log: `Copier → Broker 3 · Network · InitProducerId(copier-0) · —`
- Sources: [T1], [T2], [T3]

**S2 · mutate · `txcoord` · Broker** — *critical*
- Title: epoch fencing
- Subtitle: 같은 `transactional.id`의 이전 인스턴스는 epoch가 올라가며 막힌다.
- Prose: coordinator는 epoch를 올리고, 이전 인스턴스가 열어 둔 transaction을 abort한다. 옛 epoch로 오는 요청은 이후 모두 거절된다. 그래서 죽은 줄 알았던 인스턴스(zombie)가 돌아와도 쓸 수 없다.
- Facts: epoch bump fences the previous instance; its open transaction is aborted.
- Event log: `Broker 3 → Copier · Network · InitProducerIdResponse pid 7001 epoch 4 (E.G.) · —`
- After: `producerId/epoch: 7001/4 (E.G.)` / `state: EMPTY`
- Sources: [T4], [T1]

**S3 · mutate · `producer` · Client** — *critical*
- Title: beginTransaction
- Subtitle: 클라이언트 상태만 바뀌고 요청은 없다.
- Prose: `InitProducerId` 응답으로 producer는 producerId와 epoch를 갖는다. `beginTransaction()`은 상태를 `IN_TRANSACTION`으로 바꿀 뿐 요청을 보내지 않는다. coordinator는 첫 파티션이 추가될 때 transaction을 안다.
- Facts: `beginTransaction()` sends no request; coordinator learns of the txn when the first partition is added.
- Event log: `Copier · Client · beginTransaction() · —`
- Before: `state: UNINITIALIZED` / `producerId/epoch: —`
- After: `state: IN_TRANSACTION` / `producerId/epoch: 7001/4 (E.G.)`
- Sources: [T5]

**S4 · move · `producer → log` · Network** — *critical*
- Token: `request` · `Produce txn payments-0`
- Title: transaction 안에서 쓰기
- Subtitle: batch에 transactional 표시가 붙고, 파티션이 transaction에 추가된다.
- Prose: 레코드는 transactional 비트가 켜진 batch로 파티션 leader에 간다. 서버 기본인 transaction v2에서는 이 Produce가 파티션을 transaction에 추가하는 역할도 한다. 브로커는 첫 쓰기 때 coordinator에 확인해, coordinator가 모르는 transactional 레코드가 로그에 들어가지 않게 한다.
- Facts: batch attribute `isTransactional` = 1; Produce adds the partition to the txn (transaction v2, server default); broker verifies with the coordinator on first write.
- Event log: `Copier → Broker 1 · Network · Produce txn payments-0 · 4 KiB (E.G.)`
- Decoder: **Record batch** (`wire: yes`, transactional variant)
- Sources: [T6], [T7], [T8]

**S5 · mutate · `txlog` · Storage** — *critical*
- Title: ONGOING 기록
- Subtitle: 참여 파티션과 상태가 `__transaction_state`에 남는다.
- Prose: coordinator는 상태 `ONGOING`과 참여 파티션 목록을 `__transaction_state`에 쓴다. coordinator가 바뀌면 새 coordinator가 이 로그로 상태를 되살린다. `transaction.timeout.ms` 안에 끝나지 않으면 coordinator가 abort한다.
- Facts: states `EMPTY → ONGOING → PREPARE_COMMIT → COMPLETE_COMMIT` (or `PREPARE_ABORT → COMPLETE_ABORT`); timeout → coordinator aborts.
- Event log: `Broker 3 → __transaction_state · Storage · copier-0 ONGOING · ~100 B (E.G.)`
- After: `state: ONGOING` / `partitions: [payments-0, payments-1]`
- Decoder: **TransactionLogValue** (`wire: no`)
- Sources: [T9], [T10], [T2]

**S6 · move · `producer → coord` · Network** — *critical*
- Token: `request` · `TxnOffsetCommit(order-svc, orders-0=1240)`
- Title: offset도 transaction에 넣기
- Subtitle: `sendOffsetsToTransaction`은 consumer offset을 pending으로 맡긴다.
- Prose: producer는 consumer group의 offset을 `TxnOffsetCommit`으로 group coordinator에 보낸다. group coordinator는 이 offset을 producerId별 pending으로 둔다. commit 마커가 오면 진짜 offset으로 옮기고, abort면 버린다. 출력 쓰기와 offset 커밋이 함께 성공하거나 함께 실패한다.
- Facts: offsets held in `pendingTransactionalOffsets` until the marker; commit → become committed offsets, abort → discarded.
- Event log: `Copier → Broker 2 · Network · TxnOffsetCommit orders-0=1240 (E.G.) · ~90 B (E.G.)`
- Sources: [T11], [T12]

**S7 · move · `producer → txcoord` · Network** — *critical*
- Token: `request` · `EndTxn(commit)`
- Title: commitTransaction
- Subtitle: producer는 남은 batch를 flush하고 commit을 요청한다.
- Prose: `commitTransaction()`은 남은 batch를 모두 보낸 뒤 `EndTxn(commit)`을 보낸다. 이후 단계는 coordinator가 진행한다.
- Facts: flush before EndTxn; request carries `transactional.id`, producerId, epoch, commit/abort.
- Event log: `Copier → Broker 3 · Network · EndTxn commit · 46 B (E.G.)`
- Sources: [T13]

**S8 · mutate · `txlog` · Storage** — *critical*
- Title: PREPARE_COMMIT
- Subtitle: 이 기록이 끝나면 commit이 확정된다.
- Prose: coordinator는 `PREPARE_COMMIT`을 `__transaction_state`에 쓴다. 이 기록이 복제되면 transaction은 반드시 commit된다. coordinator가 지금 죽어도 새 coordinator가 로그를 읽어 commit을 마저 끝낸다.
- Facts: PREPARE_COMMIT is the commit point; recovery completes it after coordinator failover.
- Event log: `Broker 3 → __transaction_state · Storage · copier-0 PREPARE_COMMIT · ~100 B (E.G.)`
- After: `state: PREPARE_COMMIT` / `partitions: [payments-0, payments-1]`
- Sources: [T13], [T9]

**S9 · move · `txcoord → log` · Network** — *critical*
- Token: `request` · `WriteTxnMarkers COMMIT pid=7001`
- Title: 파티션마다 COMMIT 마커
- Subtitle: 참여한 모든 파티션 leader에 마커를 쓰게 한다.
- Prose: coordinator는 참여한 모든 파티션의 leader에 `WriteTxnMarkers`를 보낸다. offset이 담긴 `__consumer_offsets` 파티션도 이 마커를 받는다. 그래야 pending offset이 확정된다.
- Facts: one marker per participating partition (data and offsets).
- Event log: `Broker 3 → Broker 1 · Network · WriteTxnMarkers COMMIT payments-0 · —`
- Sources: [T14], [T12]

**S10 · mutate · `log` · Storage** — *critical*
- Title: COMMIT 마커와 LSO
- Subtitle: 마커가 쓰이면 transaction이 결정되고 LSO가 오른다.
- Prose: leader는 COMMIT control record를 로그에 쓴다. control record는 애플리케이션에 전달되지 않는다. LSO(last stable offset)는 아직 열린 transaction의 첫 offset이다. 열린 transaction이 없으면 HW다. 이제 열린 transaction이 없으므로 LSO가 HW까지 오른다.
- Facts: control record type 1 = COMMIT, 0 = ABORT; LSO = min(first open txn offset, HW).
- Event log: `Broker 1 → payments-0 · Storage · COMMIT marker at 5099 (E.G.) · 78 B (E.G.)`
- Before: `tail: 5040–5098 txn pid 7001 (open) (E.G.)` / `HW: 5099 (E.G.)` / `LSO: 5040 (E.G.)`
- After: `tail: 5040–5098 txn pid 7001 · 5099 COMMIT (E.G.)` / `HW: 5100 (E.G.)` / `LSO: 5100 (E.G.)`
- Decoder: **Control batch** (`wire: no`)
- Sources: [T6], [T15]

**S11 · mutate · `c2` · Client** — *critical*
- Title: read_committed는 LSO까지
- Subtitle: 열린 transaction이 있으면 그 뒤 메시지는 기다리고, abort된 batch는 건너뛴다.
- Prose: `read_committed` consumer는 LSO까지만 읽는다. 오래 열린 transaction이 있으면 LSO가 멈춰, 그 뒤의 모든 메시지가 막힌다. 이것이 transaction이 오래 걸리면 lag이 생기는 이유다. abort된 batch는 응답에 함께 오는 aborted 목록으로 걸러 낸다.
- Facts: `isolation.level` default = `read_uncommitted`; `read_committed` reads up to LSO; open txn stalls LSO for all consumers; aborted batches filtered.
- Event log: `Broker 1 → read_committed consumer · Network · FetchResponse LSO=5100 (E.G.) · 64 KiB (E.G.)`
- After: `read up to: 5100 (E.G.)` / `skipped: aborted pid 6900 · 5020–5030 (E.G.)`
- Sources: [T15], [T16], [T17]

**Replay:** InitProducerId (fence) → Produce in txn → ONGOING → TxnOffsetCommit → EndTxn → PREPARE_COMMIT → markers → LSO advances → `read_committed` consumer reads.

### Decoder records used

| Record | Step | wire |
|---|---|---|
| Record batch (transactional variant) | S4 | yes |
| TransactionLogValue | S5 | no |
| Control batch | S10 | no |

### Sources

| id | What | URL |
|---|---|---|
| T1 | Using transactions; abort handling; scope | `K/docs/design/design.md#L203-L244` |
| T2 | `transaction.timeout.ms` | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L579-L582` |
| T3 | Transaction coordinator partition; topic defaults | `K/core/src/main/scala/kafka/coordinator/transaction/TransactionStateManager.scala#L439`, `K/transaction-coordinator/src/main/java/org/apache/kafka/coordinator/transaction/TransactionLogConfig.java#L32` |
| T4 | `InitProducerId` handling, epoch fence | `K/core/src/main/scala/kafka/coordinator/transaction/TransactionCoordinator.scala#L118-L290` |
| T5 | Client states; `beginTransaction` | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/TransactionManager.java#L157-L166`, `#L356-L361` |
| T6 | Batch attributes; control batches | `K/docs/implementation/message-format.md#L41-L52`, `#L73-L131` |
| T7 | Transaction protocol v2 doc; secondary: KIP-890 | `K/docs/operations/transaction-protocol.md#L29-L37`; `https://cwiki.apache.org/confluence/x/B40ODg` |
| T8 | Write verification guard | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/UnifiedLog.java#L1423-L1433` |
| T9 | Coordinator `TransactionState` | `K/transaction-coordinator/src/main/java/org/apache/kafka/coordinator/transaction/TransactionState.java#L39-L82` |
| T10 | `TransactionLogValue` | `K/transaction-coordinator/src/main/resources/common/message/TransactionLogValue.json#L16-L53` |
| T11 | `sendOffsetsToTransaction` path | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/TransactionManager.java#L441-L460` |
| T12 | `pendingTransactionalOffsets`; end-marker replay | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/OffsetMetadataManager.java#L180-L185`, `#L1251-L1262` |
| T13 | `handleEndTransaction`; `EndTxnRequest` | `K/core/src/main/scala/kafka/coordinator/transaction/TransactionCoordinator.scala#L516-L708`, `K/clients/src/main/resources/common/message/EndTxnRequest.json#L16-L43` |
| T14 | `WriteTxnMarkers` request | `K/clients/src/main/resources/common/message/WriteTxnMarkersRequest.json#L16-L49` |
| T15 | LSO definition | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/UnifiedLog.java#L672-L686` |
| T16 | `FetchResponse` `LastStableOffset`, `AbortedTransactions` | `K/clients/src/main/resources/common/message/FetchResponse.json#L75`, `#L102-L108` |
| T17 | `isolation.level` default; fetch isolation | `K/clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerConfig.java#L382`, `K/server-common/src/main/java/org/apache/kafka/server/storage/log/FetchIsolation.java#L22-L39` |

### Self-check

1. exactly-once에 필요한 설정 세 가지는? → producer `transactional.id`, consumer `isolation.level=read_committed`, `enable.auto.commit=false`.
2. commit의 서버 쪽 단계는? → PREPARE_COMMIT 기록 → 파티션마다 COMMIT 마커 → COMPLETE_COMMIT 기록.
3. zombie producer는 어떻게 막나? → `InitProducerId`가 epoch를 올리고, 옛 epoch 요청은 거절된다.
4. transaction 안의 offset은 언제 보이나? → COMMIT 마커가 offset 파티션에 도착할 때.
5. 오래 열린 transaction의 부작용은? → LSO가 멈춰 `read_committed` consumer가 그 뒤 메시지를 읽지 못한다.
6. Kafka exactly-once가 보장하지 않는 것은? → 외부 시스템(DB 등)에 쓰는 부수 효과.

---

## Lesson 8 · `kraft-failover`

- **Title:** 브로커 장애와 leader failover
- **Subtitle:** KRaft controller가 장애를 감지하고 leader를 바꾸는 경로
- **Summary:** broker heartbeat가 끊기면 controller가 broker를 fence하고, ISR에서 새 leader를 고르고, broker와 producer가 새 leader로 옮겨 가는 과정을 본다.
- **Critical path:** heartbeats stop → controller fences broker → new leader from ISR → brokers apply → producer refreshes metadata and retries.
- **Overview:** ZooKeeper 대신 controller 노드들(KRaft quorum, 보통 3대)이 cluster metadata를 `__cluster_metadata`라는 로그 하나에 복제해 관리한다. 과반이 살아 있어야 metadata를 바꿀 수 있으므로, 3대는 1대, 5대는 2대의 장애를 견딘다. broker는 이 로그를 따라 읽으며 자기 역할을 정한다. 4.x는 ISR이 모두 죽었을 때를 대비해, ISR 밖이지만 안전한 replica를 leader 후보(ELR)로 기록할 수 있다(새 클러스터는 4.1부터 기본 활성).
- **Interview questions:** broker가 죽으면 무슨 일이 몇 초 안에 일어나나? controller는 몇 대가 필요한가? producer는 새 leader를 어떻게 아나? ISR이 모두 죽으면?

### Panels

| Node | Panel (initial) |
|---|---|
| `controller` | `cluster`: `active controller: 1 of 3` / `broker 1: alive` / `broker 2: alive` / `orders-0: leader 2 · epoch 8 · ISR [1, 2] (E.G.)` |
| `b1` | `orders-0`: `role: follower` |
| `sender` | `metadata`: `orders-0 leader: 2 (E.G.)` |

### Steps

**S1 · mutate · `controller` · Controller** — *critical*
- Title: controller quorum
- Subtitle: controller 3대 중 하나가 active이고, metadata는 로그 하나다.
- Prose: `process.roles=controller` 노드들이 quorum을 이룬다. 그중 하나가 active controller다. 토픽, 파티션 leader, ISR, broker 상태가 모두 `__cluster_metadata` 로그의 레코드다. N대 장애를 견디려면 2N+1대가 필요하다. 운영 환경에서는 broker와 controller를 같은 프로세스에 두지 않는다.
- Facts: 3 controllers tolerate 1 failure, 5 tolerate 2; metadata log = `__cluster_metadata`; avoid combined `broker,controller` in production.
- Event log: `Controller 1 · Controller · active, voters [1, 2, 3] (E.G.) · —`
- After: `active controller: 1 of 3` / `broker 1: alive` / `broker 2: alive` / `orders-0: leader 2 · epoch 8 · ISR [1, 2] (E.G.)`
- Sources: [K1], [K2]

**S2 · move · `b2 → controller` · Controller** — *critical*
- Token: `request` · `BrokerHeartbeat broker=2`
- Title: broker heartbeat
- Subtitle: broker는 2초마다 heartbeat를 보내 세션을 유지한다.
- Prose: broker는 `broker.heartbeat.interval.ms`(2초)마다 controller에 heartbeat를 보낸다. 이 세션이 살아 있는 동안만 controller는 broker를 정상으로 본다. broker는 metadata 로그를 fetch해 따라가지만, 투표하지는 않는다.
- Facts: `broker.heartbeat.interval.ms` = 2000; `broker.session.timeout.ms` = 9000.
- Event log: `Broker 2 → Controller · Controller · BrokerHeartbeat · —`
- Sources: [K3], [K4]

**S3 · mutate · `controller` · Controller** — *critical*
- Title: heartbeat 끊김 → fence
- Subtitle: 9초 동안 heartbeat가 없으면 broker를 offline으로 본다.
- Prose: Broker 2가 죽어 heartbeat가 9초 동안 오지 않는다. controller는 B2를 fence한다. 그러면 B2는 leader가 될 수 없고, 모든 ISR에서 빠진다. 프로세스가 죽은 경우만이 아니라 긴 GC 정지나 네트워크 단절도 같은 결과를 낸다.
- Facts: no heartbeat for `broker.session.timeout.ms` → fenced; fenced broker removed from ISRs and leadership.
- Event log: `Controller · Controller · fence broker 2 (session expired) · 9 s (E.G.)`
- After: `active controller: 1 of 3` / `broker 1: alive` / `broker 2: fenced` / `orders-0: leader 2 · epoch 8 · ISR [1, 2] (E.G.)`
- Sources: [K5], [K6]

**S4 · mutate · `controller` · Controller** — *critical*
- Title: ISR에서 새 leader 선출
- Subtitle: 남은 ISR 멤버 B1이 leader가 되고 leader epoch가 오른다.
- Prose: controller는 B2가 leader이던 파티션마다 남은 ISR에서 새 leader를 고른다. 여러 파티션을 한 번에 처리한다. 결과는 metadata 로그에 기록된다. leader epoch가 오르므로 옛 leader가 돌아와도 자기가 leader라고 착각하지 않는다.
- Facts: new leader chosen from ISR; leader epoch increments; changes batched across partitions.
- Event log: `Controller · Controller · orders-0 leader 2 → 1, epoch 9 (E.G.) · —`
- After: `active controller: 1 of 3` / `broker 1: alive` / `broker 2: fenced` / `orders-0: leader 1 · epoch 9 · ISR [1] (E.G.)`
- Decoder: **Partition state** (`wire: no`)
- Sources: [K7], [K8]

**S5 · move · `controller → b1` · Controller** — *critical*
- Token: `response` · `metadata: orders-0 leader=1 epoch=9`
- Title: broker가 변경을 받는다
- Subtitle: broker는 metadata 로그를 fetch해 새 레코드를 받는다.
- Prose: B1은 metadata 로그를 계속 fetch하고 있으므로, 다음 응답에서 파티션 변경 레코드를 받는다. 변경이 없을 때도 controller는 주기적으로 빈 레코드를 써서 로그가 살아 있게 한다.
- Facts: brokers follow the metadata log as observers; change record = leader, epoch, ISR.
- Event log: `Controller → Broker 1 · Controller · PartitionChangeRecord orders-0 (E.G.) · —`
- Sources: [K9], [K10]

**S6 · mutate · `b1` · Broker** — *critical*
- Title: B1이 leader가 된다
- Subtitle: 새 epoch로 쓰기를 받기 시작한다.
- Prose: B1은 레코드를 적용하고 `orders-0`의 leader 역할을 시작한다. 이제 Produce와 Fetch를 받는다. ISR이 [1]뿐이므로, `min.insync.replicas=2`인 토픽은 B2가 돌아와 따라잡을 때까지 `acks=all` 쓰기를 거절한다(lesson 4).
- Facts: new leader serves produce/fetch at the new epoch; ISR [1] + min ISR 2 → `acks=all` rejected until a follower catches up.
- Event log: `Broker 1 · Broker · orders-0 become leader, epoch 9 (E.G.) · —`
- After: `role: leader · epoch 9 (E.G.)`
- Sources: [K8], [R16]

**S7 · move · `b1 → sender` · Network** — *critical*
- Token: `response` · `NOT_LEADER_OR_FOLLOWER`
- Title: producer가 옛 leader 오류를 받는다
- Subtitle: 오류를 받으면 metadata를 새로 받는다.
- Prose: producer는 아직 B2를 leader로 알고 있다. 요청이 실패하거나 `NOT_LEADER_OR_FOLLOWER` 같은 metadata 오류를 받으면 metadata 갱신을 요청한다. 오류 응답에 새 leader 정보가 실려 오면 그것을 바로 쓴다. 이 사이에 쌓인 batch는 accumulator에서 기다린다.
- Facts: `NotLeaderOrFollowerException` is an `InvalidMetadataException` → metadata update requested; response may carry the current leader; otherwise metadata refreshes every `metadata.max.age.ms` (300000).
- Event log: `Broker 1 → Sender · Network · ProduceResponse NOT_LEADER_OR_FOLLOWER (E.G.) · —`
- Sources: [K11], [K12]

**S8 · mutate · `sender` · Client** — *critical*
- Title: 새 leader로 재시도
- Subtitle: idempotent producer는 같은 sequence로 다시 보내므로 중복이 생기지 않는다.
- Prose: 새 metadata로 B1이 leader임을 알게 된 producer는 실패한 batch를 B1으로 다시 보낸다. sequence가 같으므로, 옛 leader가 이미 받아 복제해 둔 batch라면 B1이 중복으로 알아본다. 장애 중 지연은 대략 session timeout + 선출 + metadata 갱신이다. 그 전체가 `delivery.timeout.ms` 안에 끝나야 한다.
- Facts: retry keeps sequence (no duplicate); failover delay ≈ `broker.session.timeout.ms` + election + metadata refresh; must fit in `delivery.timeout.ms` (120000).
- Event log: `Sender → Broker 1 · Network · Produce retry orders-0 · 10 s total (E.G.)`
- After: `orders-0 leader: 1 · epoch 9 (E.G.)`
- Sources: [P11], [P1], [K3]

**S9 · mutate · `controller` · Controller** — *side*
- Title: ISR이 모두 죽으면
- Subtitle: 기본은 ISR replica가 돌아올 때까지 파티션이 멈춘다.
- Prose: ISR 전원이 죽으면 기본 설정(`unclean.leader.election.enable=false`)에서는 파티션이 offline이 된다. ISR replica가 돌아올 때까지 읽기와 쓰기가 모두 멈춘다. `true`로 바꾸면 ISR 밖 replica가 leader가 되어 빨리 복구되지만, committed 메시지를 잃을 수 있다.
- Facts: `unclean.leader.election.enable` = false; unclean = availability over durability, may lose committed data.
- Event log: `Controller · Controller · orders-0 offline (no ISR alive) (E.G.) · —`
- After: `active controller: 1 of 3` / `broker 1: fenced` / `broker 2: fenced` / `orders-0: leader none · ISR [1] · offline (E.G.)`
- Sources: [K13], [K14]

**Replay:** B2 heartbeats stop → controller fences B2 → new leader B1 from ISR → B1 applies the change → producer gets `NOT_LEADER_OR_FOLLOWER` → refreshes metadata → retries to B1.

### Decoder records used

| Record | Step | wire |
|---|---|---|
| Partition state | S4 | no |

### Sources

| id | What | URL |
|---|---|---|
| K1 | `process.roles`, quorum size | `K/docs/operations/kraft.md#L33-L49` |
| K2 | Deploying considerations (2N+1, no combined mode) | `K/docs/operations/kraft.md#L318-L322` |
| K3 | Broker heartbeat and session defaults | `K/raft/src/main/java/org/apache/kafka/raft/KRaftConfigs.java#L39-L44` |
| K4 | Active session via heartbeats | `K/docs/design/design.md#L289-L298` |
| K5 | Heartbeat tracking and fencing | `K/metadata/src/main/java/org/apache/kafka/controller/BrokerHeartbeatManager.java#L199-L246` |
| K6 | `handleBrokerFenced` | `K/metadata/src/main/java/org/apache/kafka/controller/ReplicationControlManager.java#L1428` |
| K7 | Controller elects from ISR, batches changes | `K/docs/design/design.md#L360-L364` |
| K8 | Partition record fields | `K/metadata/src/main/resources/common/metadata/PartitionRecord.json#L16-L53`, `K/metadata/src/main/resources/common/metadata/PartitionChangeRecord.json#L16-L56` |
| K9 | Brokers as observers fetching the metadata log | `K/raft/src/main/java/org/apache/kafka/raft/KafkaRaftClient.java#L130-L169` |
| K10 | Periodic no-op record when idle | `K/raft/src/main/java/org/apache/kafka/raft/MetadataLogConfig.java#L75-L79`, `K/metadata/src/main/java/org/apache/kafka/controller/QuorumController.java#L1638-L1640` |
| K11 | Producer requests metadata update on `InvalidMetadataException` | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/Sender.java#L713-L730`, `K/clients/src/main/java/org/apache/kafka/common/errors/NotLeaderOrFollowerException.java#L31` |
| K12 | `metadata.max.age.ms` default | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L494` |
| K13 | Unclean leader election | `K/docs/design/design.md#L337-L349` |
| K14 | `unclean.leader.election.enable` default | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogConfig.java#L138` |

(P1 and P11 are lesson 1 sources and R16 is a lesson 4 source, reused here. The overview's ELR line cites `K/docs/operations/eligible-leader-replicas.md#L29-L37`; secondary: KIP-966 `https://cwiki.apache.org/confluence/x/mpOzDw`.)

### Self-check

1. broker가 죽은 뒤 failover 순서는? → heartbeat 끊김(9초) → fence → ISR에서 새 leader 선출 → broker 적용 → producer가 metadata 갱신 후 재시도.
2. controller 3대와 5대는 각각 몇 대 장애를 견디나? → 1대, 2대(2N+1).
3. producer는 새 leader를 어떻게 아나? → `NOT_LEADER_OR_FOLLOWER` 등 metadata 오류나 요청 실패를 받으면 metadata를 다시 받는다.
4. failover 중 중복이 생기지 않는 이유는? → idempotent producer가 같은 sequence로 재시도하기 때문이다.
5. ISR이 모두 죽으면 기본 동작은? → 파티션이 offline이 되고 ISR replica가 돌아올 때까지 기다린다.

---

## Decoder records

Only the fields an engineer reads in practice are in the tables. The rest of each structure is one line under the table. Byte values were computed for this plan (zig-zag varints, CRC-32C over `attributes`..end; the CRC code was checked against `crc32c("123456789") = 0xE3069283`). **E.G.** marks per-run values.

### Decoder: record batch

- Used by: L1 S8 (`wire: no`), L7 S4 (`wire: yes`, transactional variant).
- One record (`key="order-42"`, `value={"id":42}`), uncompressed, idempotent, on disk. 85 B.
- Layers: **Batch header** (0–60) · **Records** (61–84).

| Offset | Field | Value | Hex | Why you read it |
|---|---|---|---|---|
| 0 | `baseOffset` | 1200 **E.G.** | `00 00 00 00 00 00 04 b0` | Offset of the first record |
| 8 | `batchLength` | 73 | `00 00 00 49` | Batch size on disk − 12 |
| 21 | `attributes` | 0 | `00 00` | Compression (bits 0–2), transactional (bit 4), control (bit 5) |
| 23 | `lastOffsetDelta` | 0 | `00 00 00 00` | Last offset = base + delta |
| 27 | `baseTimestamp` | 1793696400000 **E.G.** | `00 00 01 a1 a0 a3 02 80` | Used by time retention |
| 43 | `producerId` | 4000 **E.G.** | `00 00 00 00 00 00 0f a0` | Which producer; -1 if not idempotent |
| 51 | `producerEpoch` | 0 **E.G.** | `00 00` | Fencing |
| 53 | `baseSequence` | 0 **E.G.** | `00 00 00 00` | Duplicate detection |
| 57 | `recordsCount` | 1 | `00 00 00 01` | |

Not shown: `partitionLeaderEpoch` (12), `magic=2` (16), `crc` (17, `d0 0e ea e0`), `maxTimestamp` (35). They are integrity and fencing fields that engineers do not read.

Raw (85 B):
```
00 00 00 00 00 00 04 b0 00 00 00 49 00 00 00 03 02 d0 0e ea e0 00 00 00 00 00 00
00 00 01 a1 a0 a3 02 80 00 00 01 a1 a0 a3 02 80 00 00 00 00 00 00 0f a0 00 00 00
00 00 00 00 00 00 01 2e 00 00 00 10 6f 72 64 65 72 2d 34 32 12 7b 22 69 64 22 3a
34 32 7d 00
```

Transactional variant (L7 S4): `attributes = 0x0010`, `producerId/epoch = 7001/4` (**E.G.**).

Sources: [P14], `K/clients/src/main/java/org/apache/kafka/common/record/internal/DefaultRecordBatch.java#L104-L131`.

### Decoder: record

- Used by: L1 S2 (`wire: no`).

| Field | Value | Hex |
|---|---|---|
| `length` | 23 | `2e` |
| `timestampDelta` | 0 | `00` |
| `offsetDelta` | 0 | `00` |
| `key` (`keyLength` 8) | `order-42` **E.G.** | `10` + `6f 72 64 65 72 2d 34 32` |
| `value` (`valueLength` 9) | `{"id":42}` **E.G.** | `12` + `7b 22 69 64 22 3a 34 32 7d` |
| `headers` (count 0) | — | `00` |

Not shown: `attributes` (unused). Lengths are zig-zag varints; a null value (tombstone) has length -1. Sources: `K/docs/implementation/message-format.md#L133-L162`, `K/clients/src/main/java/org/apache/kafka/common/record/internal/DefaultRecord.java#L175-L215`.

### Decoder: ProduceRequest

- Used by: L1 S7 (`wire: yes`). 143 B on the wire.
- Layers: **Size** · **Request header** · **Produce body** · **Record batch**.

| Field | Value | Hex | Why you read it |
|---|---|---|---|
| `message_size` | 139 | `00 00 00 8b` | Frame length |
| `RequestApiKey` | 0 (Produce) | `00 00` | Request type |
| `CorrelationId` | 7 **E.G.** | `00 00 00 07` | Matches the response |
| `ClientId` | `producer-1` **E.G.** | `00 0a 70 72 6f 64 75 63 65 72 2d 31` | Shows in broker logs and quotas |
| `TransactionalId` | null | `00` | Set only for transactional producers |
| `Acks` | -1 (all) | `ff ff` | Durability level |
| `TimeoutMs` | 30000 | `00 00 75 30` | `request.timeout.ms` |
| `TopicId` | `5zoAlv-xEh9xRANKXt1Lbg` **E.G.** | `e7 3a 00 96 ff b1 12 1f 71 44 03 4a 5e dd 4b 6e` | Target topic |
| `Index` (partition) | 0 | `00 00 00 00` | Target partition |
| `Records` | 85 B batch | `56` + batch | The record batch above |

Not shown: `RequestApiVersion` (13), and the compact length and tagged-field bytes (`00`, `02`). Version numbers and encoding details do not affect behavior.

Raw (143 B):
```
00 00 00 8b 00 00 00 0d 00 00 00 07 00 0a 70 72 6f 64 75 63 65 72 2d 31 00 00 ff
ff 00 00 75 30 02 e7 3a 00 96 ff b1 12 1f 71 44 03 4a 5e dd 4b 6e 02 00 00 00 00
56 00 00 00 00 00 00 00 00 00 00 00 49 ff ff ff ff 02 d0 0e ea e0 00 00 00 00 00
00 00 00 01 a1 a0 a3 02 80 00 00 01 a1 a0 a3 02 80 00 00 00 00 00 00 0f a0 00 00
00 00 00 00 00 00 00 01 2e 00 00 00 10 6f 72 64 65 72 2d 34 32 12 7b 22 69 64 22
3a 34 32 7d 00 00 00 00
```
(Inside a request the producer's batch has `baseOffset = 0` and `partitionLeaderEpoch = -1`.)

Sources: [P13], `K/docs/design/protocol.md#L141-L172`; TopicId from `K/docs/operations/kraft.md#L301-L311`.

### Decoder: FetchRequest

- Used by: L2 S7 (`wire: yes`, consumer), L4 S2 (`wire: yes`, follower). A field table only.

| Field | Consumer (L2 S7) | Follower (L4 S2) | Why you read it |
|---|---|---|---|
| `ReplicaState.ReplicaId` | absent (consumer) | 2 | Consumer vs follower: decides HW vs LEO limit |
| `MaxWaitMs` | 500 (`fetch.max.wait.ms`) | 500 (`replica.fetch.wait.max.ms`) | Long-poll wait |
| `MinBytes` | 1 (`fetch.min.bytes`) | — | Long-poll threshold |
| `IsolationLevel` | 0 (read_uncommitted) | 0 | HW vs LSO limit |
| `FetchOffset` | 1237 **E.G.** | 100 **E.G.** (= follower LEO) | Where to read from |
| `PartitionMaxBytes` | 1048576 (`max.partition.fetch.bytes`) | 1048576 (`replica.fetch.max.bytes`) | Per-partition cap |

Not shown: session id/epoch, `CurrentLeaderEpoch`, `LastFetchedEpoch`, `LogStartOffset`, `RackId`, tagged fields. Sources: [L12], [L13], [R3].

### Decoder: ConsumerGroupHeartbeatRequest

- Used by: L5 S8 (`wire: yes`). A field table only.

| Field | Value | Why you read it |
|---|---|---|
| `GroupId` | `order-svc` **E.G.** | Which group |
| `MemberId` | client-generated **E.G.** | Which member |
| `MemberEpoch` | 0 (join; -1 leave) | Member's place in the group epoch |
| `SubscribedTopicNames` | `[orders]` | Subscription; a change triggers reassignment |
| `TopicPartitions` | `[]` | Partitions the member owns; removing them completes a revoke |

Not shown: `InstanceId`, `RackId`, `RebalanceTimeoutMs`, `SubscribedTopicRegex`, `ServerAssignor`. Sources: [G10].

### Decoder: offset commit record

- Used by: L6 S3 (`wire: no`). The key and value of one record in `__consumer_offsets`.

| Part | Field | Value | Hex |
|---|---|---|---|
| key | `group` | `order-svc` **E.G.** | `00 09 6f 72 64 65 72 2d 73 76 63` |
| key | `topic` | `orders` **E.G.** | `00 06 6f 72 64 65 72 73` |
| key | `partition` | 0 | `00 00 00 00` |
| value | `offset` | 1240 **E.G.** | `00 00 00 00 00 00 04 d8` |
| value | `leaderEpoch` | 3 **E.G.** | `00 00 00 03` |
| value | `metadata` | `""` | `01` |
| value | `commitTimestamp` | 1793696405000 **E.G.** | `00 00 01 a1 a0 a3 16 08` |

Not shown: the key's type prefix `00 01`, the value's version prefix `00 04`, and the tagged `topicId`. Sources: [O4], `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorRecordHelpers.java#L470-L503`.

### Decoder: TransactionLogValue

- Used by: L7 S5 (`wire: no`). A field table only.

| Field | Value | Why you read it |
|---|---|---|
| `ProducerId` / `ProducerEpoch` | 7001 / 4 **E.G.** | Which producer instance owns the transaction |
| `TransactionStatus` | 1 (ONGOING) | Where the transaction is |
| `TransactionPartitions` | `payments: [0, 1]` | Who will get markers |
| `TransactionTimeoutMs` | 60000 | When the coordinator aborts it |
| `TransactionStartTimestampMs` | **E.G.** | How long it has been open |

Not shown: previous/next producer id and epoch, `ClientTransactionVersion`, last-update timestamp. Sources: [T10].

### Decoder: control batch

- Used by: L7 S10 (`wire: no`).

| Part | Field | Value |
|---|---|---|
| batch | `attributes` | `0x0030` (transactional + control) |
| batch | `producerId` / `producerEpoch` | 7001 / 4 **E.G.** |
| record key | `type` | 1 = COMMIT (0 = ABORT) |

Not shown: key `version` (0), value (`CoordinatorEpoch`). Key bytes for COMMIT are `00 00 00 01`. Sources: [T6], `K/clients/src/main/resources/common/message/EndTxnMarker.json#L16-L26`.

### Decoder: partition state

- Used by: L8 S4 (`wire: no`). The partition record as `kafka-metadata-shell.sh` prints it (docs example values), showing what changes at failover.

| Field | Before (E.G.) | After (E.G.) | Why you read it |
|---|---|---|---|
| `leader` | 2 | 1 | Where clients send produce and fetch |
| `leaderEpoch` | 8 | 9 | Fences the old leader |
| `replicas` | [1, 2] | [1, 2] | Assignment; does not change at failover |
| `isr` | [1, 2] | [1] | Who can be the next leader |

Not shown: `partitionEpoch`, `removingReplicas`, `addingReplicas`, `directories`, ELR fields. Sources: [K8], `K/docs/operations/kraft.md#L301-L311`.

---

## Cut by must-know rule

| Cut | From | Why |
|---|---|---|
| Raft internals: Vote, PreVote, `BeginQuorumEpoch`, election timeouts, voter fetch, snapshots and checkpoint file names, metadata record framing, `NoOpRecord` | old KRaft lesson (S2–S5, S8) | Operators do not tune or debug these. Lesson 8 now teaches broker failover, which is what incidents involve. "Quorum of 2N+1" stays. |
| Producer-id block allocation | old KRaft S9 | Internal constant; no behavior an engineer acts on. |
| ELR steps and record fields | old replication S13, decoders | Brand-new and automatic. Kept as one line in the lesson 8 overview. |
| API keys and version ranges (`Produce v3–13`, API key numbers, flexible versions), `RequestApiVersion` | all lessons, decoders | Version tables do not change behavior. API names stay. |
| `linger.ms` 0 → 5 history, idempotence fallback history, transaction v1 vs v2 differences (`AddPartitionsToTxn`, `AddOffsetsToTxn`) | lessons 1 and 7 | Version history. Only current behavior is taught. |
| CRC computation, `partitionLeaderEpoch`, `magic`, compact encodings, tagged-field framing, coordinator key/value version prefixes | decoders | Encoding trivia; listed in one "Not shown" line per decoder. |
| `BufferPool` sizing, adaptive partitioner flags, `partitioner.ignore.keys`, retry backoff values, sequence wraparound | lesson 1 | Exotic config and internal constants. |
| Time index details, index file sizing (`log.index.size.max.bytes`), `.txnindex`/`.snapshot` files, segment delete delay, recovery threads, TLS 32 KiB buffer | lesson 2 | Internal constants. Crash recovery is one overview line, and TLS is one fact. |
| Offset index entry decoder | lesson 2 | The lookup step shows the entry; byte layout adds nothing. |
| Cleaner OffsetMap 24 B/entry, load factor, I/O throttle, cleaner backoff, idempotent/transaction compaction rules as a step | lesson 3 | Internal constants; transaction rules moved to one overview line. |
| Maximal ISR, `DivergingEpoch` truncation, `LeaderRecoveryState`, HW checkpoint interval, purgatory naming | lesson 4 | Internals behind the rule; the rule (HW = min ISR LEO, strict min ISR) stays. |
| Server-side assignor plug-in interface, regex subscription, KIP-848 timeline, `UNRELEASED_PARTITIONS` detail | lesson 5 | Niche. Two KIP-848 steps stay because `group.protocol=consumer` is a real choice now. |
| EndTxn decoder, `TransactionLogValue` tagged fields, TV2 server retry configs (`add.partitions.to.txn.retry.*`), coordinator state numbers, `COMPLETE_COMMIT` as a step | lesson 7 | Engineers do not read these bytes or tune these configs. `COMPLETE_COMMIT` is one overview line. |
| Share groups, tiered storage, quotas | whole topic | Niche or brand-new for this owner; not on the critical paths. |

## Open questions

1. **KIP pages.** This session cannot reach cwiki.apache.org. KIP-848, 890, 966, and 1030 are the short links printed in the 4.4.0 docs. KIP-996 (pre-vote) is no longer cited, because Raft internals were cut.
2. **"Path" marking.** Steps carry `critical` or `side`. The engine session should decide how `side` steps look and whether the replay skips them (this plan's Replay lines skip them).
3. **Comparison steps.** Lesson 1 S11 (reordering) and lesson 5 S7 (cooperative vs eager) show alternatives to the main timeline. Should they get a "compare" marker?

## Facts I could not verify

- None outstanding in the kept content. Every kept fact cites a 4.4.0 doc or code line read in this session. Two items from revision 2 were left out instead of being verified: follower Fetch `MinBytes`/`MaxBytes` defaults, and the `RebalanceTimeoutMs` mapping.
