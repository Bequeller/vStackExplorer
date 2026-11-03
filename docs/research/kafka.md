---
last-verified: 2026-11-03
sources: [https://github.com/apache/kafka/tree/4.4.0]
---

# Kafka lesson plan (research)

The content plan for the Kafka topic. It is research only: plain Markdown, no TypeScript, because the engine and lesson schema are being redesigned in parallel. Every fact below names a source pinned to the Apache Kafka `4.4.0` release tag. A fact without a source is marked **unverified**.

## Version and source policy

- **Pinned version: Apache Kafka 4.4.0.** It is the highest non-RC `x.y.z` tag in `github.com/apache/kafka` on 2026-11-03 (`git ls-remote --tags`: `… 4.3.2, 4.4.0`). Tag commit `1156b2752aaa28eafc0b4c4d387e63356793268d`, dated 2026-10-06. `gradle.properties` at the tag says `version=4.4.0`.
- **kafka.apache.org and cwiki.apache.org (where the KIPs live) were blocked** for this session by the network policy (proxy 403 and DNS failure). So I could not check the downloads page that names the "current release", and I could not read any KIP page. What I used instead:
  - The official documentation **source**, which lives in the Kafka repository under `docs/` (Markdown since 4.x). It is the same text kafka.apache.org renders. Decision 0004 prefers these tag-pinned URLs anyway.
  - The source code at the same tag.
  - Facts that only a KIP page states are marked **unverified (KIP not readable)**. Where the 4.4.0 docs quote a KIP's status (for example "KIP-848 is GA since 4.0"), the docs are the source.
- URL form: `https://github.com/apache/kafka/blob/4.4.0/<path>#L<from>-L<to>`. Below, `K/` stands for `https://github.com/apache/kafka/blob/4.4.0/`. Expand it when the plan becomes lesson data.
- `versions` for every Kafka lesson: `{ "Apache Kafka": "4.4.0" }`.

## Topic shape

| Order | Lesson id | Mechanism | Why this order |
|---|---|---|---|
| 1 | `producer-send` | Producer send path: serializer → partitioner → `RecordAccumulator` → `Sender` → `acks` → idempotent sequence | Most-asked "how does Kafka not lose or duplicate data" question; it introduces the record batch, which every other lesson reuses |
| 2 | `broker-log` | Partition log on disk: segments, sparse index, page cache, `sendfile` | "Why is Kafka fast?" Depends on the batch from lesson 1 |
| 3 | `replication` | Leader/follower fetch, ISR, high watermark, `min.insync.replicas`, unclean election and ELR | "`acks=all` is still lossy when…?" Depends on lessons 1 and 2 |
| 4 | `consumer-group` | Group coordinator, classic eager vs cooperative rebalance, KIP-848 `consumer` protocol, offset commit to `__consumer_offsets` | Ordering, scaling, and duplicate-processing questions |
| 5 | `transactions` | Exactly-once: `transactional.id`, transaction coordinator, markers, LSO, `read_committed` | Senior-level follow-up to lessons 1 and 4 |
| 6 | `kraft-metadata` | KRaft controller quorum, `__cluster_metadata`, broker heartbeats and fencing, ISR change as a metadata record | "What replaced ZooKeeper?" Ties the ISR and producer-id stories together |

Layer-selector values used across the topic, the same in every lesson: **Client** (producer/consumer library), **Network** (Kafka wire protocol), **Broker** (request handling, partitions, coordinators), **Storage** (log files, page cache), **Controller** (KRaft quorum). Each step names its layer, and the event log's layer column uses these values.

Node kinds map onto the existing color kinds in `docs/DESIGN.md`: application code → `app`; Kafka client library internals (`RecordAccumulator`, `Sender`, `ConsumerCoordinator`) → `framework`; broker / OS → `container`; logs, segments, internal topics → `storage`; external caller → `client`. The redesign may add a `controller` kind; until then the KRaft controller is `framework`.

---

## Lesson 1 · `producer-send`: 한 레코드가 브로커 로그에 닿기까지

### Goal

`producer.send()` 한 번이 직렬화, 파티션 선택, 배치, 네트워크 전송, `acks` 대기, 중복 제거를 거쳐 정확히 한 번 기록되는 경로를 따라간다.

Interview questions it answers:
- `linger.ms`와 `batch.size`는 각각 무엇을 언제 보내게 하나? 4.0에서 기본값이 어떻게 바뀌었나?
- 키가 있는 레코드와 없는 레코드는 어떻게 파티션을 고르나?
- `acks=0/1/all`의 차이와, `acks=all`이어도 데이터가 사라질 수 있는 경우는?
- 재시도해도 중복이 안 생기는 이유는? `max.in.flight.requests.per.connection`이 5 이하여야 하는 이유는?

### Nodes

| id | Label | Kind | Illustration idea | Appears at |
|---|---|---|---|---|
| `app` | OrderService | `app` | Isometric laptop/service box with a small code-bracket glyph | S1 |
| `serializer` | Serializer | `framework` | Funnel turning a curly-brace object into a byte strip | S2 |
| `partitioner` | Partitioner | `framework` | Three-way rail switch with a hash `#` sign | S3 |
| `accumulator` | RecordAccumulator | `framework` | Rack of per-partition trays (deques), each holding a filling batch crate | S4 |
| `sender` | Sender thread | `framework` | Forklift / conveyor leaving the rack toward the network | S7 |
| `broker1` | Broker 1 (leader p0) | `container` | Isometric server tower with a "leader" crown tag on partition p0 | S9 |
| `log-p0` | orders-0 log | `storage` | Stacked segment cylinders inside the broker | S10 |
| `pstate` | Producer state | `storage` | Small ledger card: `producerId`, epoch, last 5 sequence ranges | S12 |

Node-state panels: `accumulator` (table: partition, open batch, bytes, records, age ms), `pstate` (table: producerId, epoch, cached batch seq ranges).

### Steps

**S1 · move · `app → serializer` · Client**
- Title: `send()` 호출
- Subtitle: 애플리케이션 스레드가 `ProducerRecord`를 넘긴다.
- Prose: `KafkaProducer.send()`는 먼저 interceptor의 `onSend`를 거친 뒤 `doSend`에 들어간다. `doSend`는 토픽 metadata를 기다리는데, 이 대기는 `max.block.ms` 안에서만 허용된다. 반환값은 `Future<RecordMetadata>`이고, 이 시점에는 아직 아무것도 전송되지 않았다.
- Facts: `max.block.ms` = 60000; return type = `Future<RecordMetadata>`; `delivery.timeout.ms` = 120000 (send 후 성공/실패 보고 상한).
- Event log: `OrderService → KafkaProducer · Client · send(orders, key=order-42) · 9 B value (E.G.)`
- Sources: [P1], [P2]

**S2 · mutate · `serializer` · Client**
- Title: key/value 직렬화
- Subtitle: 객체가 `byte[]`가 된다.
- Prose: `key.serializer`와 `value.serializer`가 topic과 headers를 받아 `byte[]`를 만든다. 타입이 맞지 않으면 `ClassCastException`이 `SerializationException`으로 바뀌어 던져진다. 파티셔너는 직렬화된 키 바이트를 쓰므로 직렬화가 파티션 선택보다 먼저다.
- Facts: order = metadata wait → serialize key → serialize value → partition; error = `SerializationException`; example key bytes = `6f 72 64 65 72 2d 34 32` (`order-42`, E.G.).
- Event log: `KafkaProducer → Serializer · Client · serialize key+value · 8 B + 9 B (E.G.)`
- State before → after: `key: "order-42" (String)` → `key: 8 bytes`; `value: Order{id=42}` → `value: 9 bytes {"id":42}`
- Sources: [P2]

**S3 · mutate · `partitioner` · Client**
- Title: 파티션 선택
- Subtitle: 키가 있으면 murmur2 해시, 없으면 sticky.
- Prose: 레코드에 partition이 지정돼 있으면 그대로 쓰고, 커스텀 `partitioner.class`가 있으면 그것을 부른다. 아니면 키가 있을 때 `toPositive(murmur2(keyBytes)) % numPartitions`로 고른다. 키가 없으면 `UNKNOWN_PARTITION`을 넘기고, accumulator가 sticky 파티션을 고른다. sticky 파티션은 최소 `batch.size` 바이트를 보낸 뒤에 바뀐다.
- Facts: key hash = `Utils.toPositive(Utils.murmur2(serializedKey)) % numPartitions`; no-key = sticky, switch after ≥ `batch.size` bytes (and always by 2×); `partitioner.adaptive.partitioning.enable` = true; `partitioner.ignore.keys` = false.
- Event log: `KafkaProducer → Partitioner · Client · murmur2(order-42) % 3 → p0 (E.G.) · —`
- State: `partition: ?` → `partition: 0 (E.G.)`
- Sources: [P2], [P3], [P4]

**S4 · move · `partitioner → accumulator` · Client**
- Title: accumulator에 append
- Subtitle: 파티션별 deque의 마지막 batch에 붙인다.
- Prose: `RecordAccumulator.append`는 토픽-파티션마다 `ArrayDeque<ProducerBatch>`를 두고, 마지막 batch에 `tryAppend`를 시도한다. 자리가 없으면 `max(batch.size, 레코드 크기 상한)` 만큼 버퍼를 `BufferPool`에서 할당해 새 batch를 만든다. 전체 버퍼는 `buffer.memory`로 제한되고, 모자라면 `max.block.ms`까지 막힌다.
- Facts: `batch.size` = 16384; `buffer.memory` = 33554432 (32 MiB); new batch size = `max(batch.size, estimateSizeInBytesUpperBound(...))`.
- Event log: `Partitioner → RecordAccumulator · Client · append orders-0 · 24 B record (E.G.)`
- Sources: [P1], [P5]

**S5 · mutate · `accumulator` · Client**
- Title: batch가 차오른다
- Subtitle: 같은 파티션 레코드가 한 batch에 모인다.
- Prose: 새 batch가 생기거나 batch가 가득 차면 `send()`가 `sender.wakeup()`을 호출한다. 그 외에는 레코드가 조용히 쌓인다. batch 하나가 나중에 record batch v2 하나가 된다.
- Facts: wakeup condition = `batchIsFull || newBatchCreated`; one `ProducerBatch` = one record batch on the wire; records larger than `batch.size` = own batch ("No attempt will be made to batch records larger than this size").
- Event log: `RecordAccumulator · Client · orders-0 batch 3 records, 1.2 KiB (E.G.) · —`
- State: `orders-0 | open batch: 1 rec, 85 B, age 0 ms` → `orders-0 | open batch: 3 rec, 1.2 KiB, age 4 ms (E.G.)`
- Sources: [P2], [P6]

**S6 · mutate · `accumulator` · Client**
- Title: `linger.ms` 만료 또는 batch full
- Subtitle: 둘 중 먼저 오는 조건이 batch를 sendable로 만든다.
- Prose: `ready()`는 파티션 leader 노드별로 보낼 batch가 있는지 본다. batch가 full이거나, `linger.ms`만큼 기다렸거나, 버퍼 풀이 고갈됐거나, flush/close 중이면 sendable이다. 4.0부터 `linger.ms` 기본값은 0이 아니라 5다. 문서는 큰 batch의 효율 덕에 지연이 비슷하거나 더 낮다고 설명한다.
- Facts: `linger.ms` = 5 (changed from 0 in 4.0); sendable = `full || expired || exhausted || closed || flushInProgress || transactionCompleting`; broker backpressure can make the effective linger longer.
- Event log: `RecordAccumulator · Client · orders-0 ready (linger 5 ms expired) · 5 ms`
- State: `orders-0 | age 4 ms | ready=no` → `orders-0 | age 5 ms | ready=yes`
- Sources: [P6], [P7]

**S7 · move · `accumulator → sender` · Client**
- Title: Sender가 drain한다
- Subtitle: leader 노드별로 batch를 모아 요청 하나로 만든다.
- Prose: 별도 I/O 스레드인 `Sender`가 `accumulator.ready()`로 준비된 노드를 구하고, `drain()`으로 노드별 batch 목록을 꺼낸다. 요청 하나에는 파티션마다 batch 하나씩 들어가고, 크기는 `max.request.size`까지다. 순서 보장이 필요하면 drain한 파티션을 mute한다.
- Facts: `max.request.size` = 1048576; one request = one batch per partition for that leader; partition mute when `guaranteeMessageOrder`.
- Event log: `RecordAccumulator → Sender · Client · drain node 1: [orders-0, orders-2] (E.G.) · 2 batches`
- Sources: [P8], [P6]

**S8 · mutate · `sender` · Client**
- Title: producerId와 sequence 부여
- Subtitle: sequence는 append 때가 아니라 drain 때 batch에 찍힌다.
- Prose: idempotence가 켜져 있으면 producer는 처음에 `InitProducerId`로 `producerId`와 epoch를 받는다. transactional이 아니면 이 요청은 least-loaded broker로 간다. drain 시점에 아직 sequence가 없는 batch에 `(producerId, epoch, baseSequence)`를 찍고, 파티션의 다음 sequence를 레코드 수만큼 올린다. 재시도 batch는 이미 받은 sequence를 그대로 유지한다.
- Facts: `enable.idempotence` = true (default, if no conflicting configs); `InitProducerId` API key = 22; sequence assigned in `drain()` via `setProducerState`; retried batch keeps its sequence ("may introduce duplicates" otherwise).
- Event log: `Sender · Client · batch orders-0 pid=4000 epoch=0 baseSeq=0 (E.G.) · —`
- State: `batch: pid=-1 epoch=-1 baseSeq=-1` → `batch: pid=4000 epoch=0 baseSeq=0 (E.G.)`
- Sources: [P9], [P10], [P11]

**S9 · move · `sender → broker1` · Network**
- Title: Produce 요청 전송
- Subtitle: `ProduceRequest` v13: `Acks`, `TimeoutMs`, TopicId별 record batch.
- Prose: Sender는 batch들을 `ProduceRequest`(API key 0)로 묶어 각 파티션의 leader에게 직접 보낸다. 중간 라우팅 계층은 없다. `TimeoutMs`에는 `request.timeout.ms`가 들어간다. 4.4.0의 Produce 버전 범위는 3–13이고, v13부터 토픽 이름 대신 TopicId(UUID)를 쓴다.
- Facts: API key = 0; valid versions = 3–13 (flexible 9+); `Acks` int16: 0, 1, -1; `request.timeout.ms` = 30000.
- Event log: `Sender → Broker 1 · Network · Produce v13 acks=-1 orders-0 · 143 B (E.G., 1 record)`
- Decoder: **ProduceRequest v13 with RequestHeader v2** (see Decoder records)
- Sources: [P12], [P13], [P14], [P8]

**S10 · mutate · `log-p0` · Storage**
- Title: leader가 로그에 append
- Subtitle: 브로커가 offset을 매기고 활성 segment 끝에 쓴다.
- Prose: leader는 batch의 CRC와 레코드 수를 검증하고, 압축된 batch도 검증을 위해 풀어 본다. 그런 다음 `baseOffset`과 `partitionLeaderEpoch`를 채워 활성 segment 끝에 쓴다. `partitionLeaderEpoch`는 CRC 범위 밖이라 브로커가 바꿔도 CRC를 다시 계산하지 않는다.
- Facts: CRC = CRC-32C, covers `attributes`…end; `partitionLeaderEpoch` excluded from CRC; client sends `baseOffset=0`, `partitionLeaderEpoch=-1`.
- Event log: `Broker 1 → orders-0 log · Storage · append offset 1200 (E.G.) · 85 B`
- State: `LEO 1200` → `LEO 1201 (E.G.)`
- Sources: [P15], [P16], [P17]

**S11 · mutate · `pstate` · Broker**
- Title: sequence 검사와 중복 제거
- Subtitle: 브로커는 producer마다 마지막 5개 batch의 sequence 범위를 기억한다.
- Prose: append 전에 브로커는 같은 epoch의 캐시된 batch 중 `baseSequence`/`lastSequence`가 정확히 같은 것이 있는지 찾는다. 있으면 다시 쓰지 않고 그 batch의 metadata를 돌려준다. 없으면 `firstSeq == lastSeq + 1`인지 확인하고, 아니면 `OutOfOrderSequenceException`이다. 캐시가 5개뿐이라 `max.in.flight.requests.per.connection`은 5 이하여야 한다.
- Facts: `NUM_BATCHES_TO_RETAIN` = 5; `max.in.flight.requests.per.connection` = 5 (≤ 5 required with idempotence); in-sequence = `next == last + 1` (or wrap `Integer.MAX_VALUE → 0`); duplicate → return cached metadata, no append.
- Event log: `Broker 1 · Broker · pid 4000 seq 0..2 accepted (E.G.) · —`
- State: `pid 4000 epoch 0 | cached: []` → `pid 4000 epoch 0 | cached: [0..2] (E.G.)`
- Sources: [P18], [P19], [P20], [P10]

**S12 · move · `broker1 → sender` · Network**
- Title: `acks`에 따른 응답
- Subtitle: `acks=all`이면 ISR 전체가 받을 때까지 응답을 미룬다.
- Prose: `acks=0`이면 응답을 기다리지 않고, offset은 항상 -1이다. `acks=1`이면 leader의 로컬 쓰기 후 바로 응답한다. leader가 복제 전에 죽으면 그 레코드는 사라진다. `acks=all`(-1)이면 현재 ISR 전체가 받은 뒤 응답하고, 이것이 기본값이다. 복제 세부 사항은 lesson 3에서 다룬다.
- Facts: `acks` = `all` (default); `acks=0` → `retries` has no effect, offset = -1; `acks=all` ≡ `acks=-1`; idempotence requires `acks=all`.
- Event log: `Broker 1 → Sender · Network · ProduceResponse orders-0 baseOffset=1200 (E.G.) · 3 ms (E.G.)`
- Sources: [P21], [P22]

**S13 · move · `sender → app` · Client**
- Title: 콜백 완료
- Subtitle: `RecordMetadata`(topic, partition, offset)가 Future를 완성한다.
- Prose: 응답이 오면 batch의 Future와 사용자 Callback이 완료되고, interceptor의 `onAcknowledgement`가 불린다. 재시도할 수 있는 오류는 `delivery.timeout.ms` 안에서 `retry.backoff.ms`(지수 증가, 최대 `retry.backoff.max.ms`)로 다시 보낸다. 이때 sequence는 바뀌지 않는다.
- Facts: `retries` = 2147483647; `retry.backoff.ms` = 100; `retry.backoff.max.ms` = 1000; `delivery.timeout.ms` ≥ `linger.ms + request.timeout.ms` is enforced.
- Event log: `Sender → OrderService · Client · callback orders-0@1200 (E.G.) · 9 ms end-to-end (E.G.)`
- Sources: [P1], [P23], [P24]

### Decoder records

1. **Record batch v2 (on disk / in Produce)**: see "Decoder: record batch v2" below. Used at S9 and S10.
2. **Record (inside the batch)**: see "Decoder: record". Used at S2 and S10.
3. **ProduceRequest v13 + RequestHeader v2**: see "Decoder: ProduceRequest". Used at S9.

### Sources

| id | What | URL |
|---|---|---|
| P1 | Producer config defaults (`buffer.memory`, `retries`, `acks`, `batch.size`, `linger.ms`, `delivery.timeout.ms`, `max.block.ms`, `request.timeout.ms`) | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L420-L491` |
| P2 | `KafkaProducer.doSend` (metadata, serialize, partition, append, wakeup) | `K/clients/src/main/java/org/apache/kafka/clients/producer/KafkaProducer.java#L1042-L1126` |
| P3 | `KafkaProducer.partition` | `K/clients/src/main/java/org/apache/kafka/clients/producer/KafkaProducer.java#L1556-L1575` |
| P4 | `BuiltInPartitioner` key hash and sticky switch | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/BuiltInPartitioner.java#L221-L256` and `#L411-L413`; `partitioner.class` doc `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L343-L360`; partitioner defaults `#L441-L444` |
| P5 | `RecordAccumulator.append` | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/RecordAccumulator.java#L282-L340` |
| P6 | `batch.size` doc | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L85-L103` |
| P7 | `batchReady` / `ready()` conditions | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/RecordAccumulator.java#L653-L676` and `#L800-L816` |
| P8 | `Sender.sendProducerData`, `sendProduceRequest` | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/Sender.java#L380-L425` and `#L890-L946` |
| P9 | `enable.idempotence` doc and default | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L370-L378` and `#L574-L577` |
| P10 | Sequence assigned in `drain()` | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/RecordAccumulator.java#L946-L975` |
| P11 | Non-transactional `InitProducerId` goes to least-loaded node | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/TransactionManager.java#L1537-L1544`, `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/Sender.java#L477-L483`; API key `K/clients/src/main/resources/common/message/InitProducerIdRequest.json#L17` |
| P12 | `ProduceRequest` schema | `K/clients/src/main/resources/common/message/ProduceRequest.json#L16-L73` |
| P13 | `RequestHeader` schema | `K/clients/src/main/resources/common/message/RequestHeader.json#L16-L44` |
| P14 | Producer sends to leader directly | `K/docs/design/design.md#L123-L127` |
| P15 | Record batch format, CRC rules | `K/docs/implementation/message-format.md#L31-L67` |
| P16 | Broker decompresses to validate | `K/docs/design/design.md#L113-L119` |
| P17 | Producer builds batches with base offset 0 and `NO_PARTITION_LEADER_EPOCH` (-1) | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/RecordAccumulator.java#L350`, `K/clients/src/main/java/org/apache/kafka/common/record/internal/MemoryRecords.java#L490-L494`, `K/clients/src/main/java/org/apache/kafka/common/record/internal/RecordBatch.java#L65` |
| P18 | `ProducerStateEntry.NUM_BATCHES_TO_RETAIN`, `findDuplicateBatch` | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/ProducerStateEntry.java#L31-L35` and `#L128-L137` |
| P19 | Duplicate check on append | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/UnifiedLog.java#L1411-L1421` |
| P20 | `checkSequence`, `inSequence` | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/ProducerAppendInfo.java#L156-L198` |
| P21 | `acks` doc | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L133-L150` |
| P22 | `max.in.flight.requests.per.connection` doc and default | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L296-L305` and `#L520-L523` |
| P23 | Retry backoff defaults | `K/clients/src/main/java/org/apache/kafka/clients/CommonClientConfigs.java#L110-L117` |
| P24 | `delivery.timeout.ms` ≥ `linger.ms + request.timeout.ms` check | `K/clients/src/main/java/org/apache/kafka/clients/producer/KafkaProducer.java#L631-L641` |

### Self-check

1. `linger.ms`의 4.4.0 기본값과, 기본값이 바뀐 버전은? → 5 ms, 4.0 (이전 0).
2. `batch.size=16384`인데 20 KB 레코드 하나를 보내면? → 그 레코드만 담는 batch가 따로 만들어진다. 버퍼 크기는 `max(batch.size, 레코드 크기 상한)`이다.
3. 키 없는 레코드는 어떤 파티션으로 가나? → sticky 파티션이다. 그 파티션에 최소 `batch.size` 바이트를 보낸 뒤에 바뀐다.
4. sequence number는 언제 batch에 붙나? → `send()`가 아니라 Sender가 drain할 때다. 재시도 batch는 같은 sequence를 유지한다.
5. 브로커가 같은 batch를 두 번 받으면? → 같은 epoch에 같은 sequence 범위가 캐시(최근 5개)에 있으면, 다시 쓰지 않고 기존 metadata를 응답한다.
6. idempotence와 `max.in.flight.requests.per.connection=10`을 함께 명시하면? → `ConfigException`이 난다. idempotence를 명시하지 않았다면 idempotence가 꺼진다.
7. `acks=1`에서 유실이 나는 시나리오는? → leader가 로컬에 쓰고 응답한 직후, follower가 복제하기 전에 죽는 경우다.

---

## Lesson 2 · `broker-log`: 파티션은 디렉터리, 로그는 segment 파일

### Goal

파티션 하나가 디스크에서 segment 파일과 sparse index로 어떻게 저장되고, consumer fetch가 page cache와 `sendfile`로 복사 없이 나가는지 본다.

Interview questions it answers:
- Kafka는 디스크를 쓰는데 왜 빠른가? (순차 I/O, page cache, batching, zero-copy)
- offset으로 레코드를 어떻게 찾나? index는 왜 sparse인가?
- segment는 언제 roll되고, retention은 무엇 단위로 지우나?
- TLS를 켜면 zero-copy는 어떻게 되나?
- Kafka는 매 쓰기마다 fsync하나?

### Nodes

| id | Label | Kind | Illustration idea | Appears at |
|---|---|---|---|---|
| `producer` | Producer | `client` | Small laptop with an outgoing crate | S1 |
| `broker` | Broker 1 | `container` | Isometric server tower, open side panel | S1 |
| `pagecache` | OS page cache | `container` | Translucent RAM-stick layer drawn over the disk | S3 |
| `segdir` | `orders-0/` | `storage` | Isometric folder with files fanned out: `.log`, `.index`, `.timeindex`, `.snapshot`, `leader-epoch-checkpoint` | S2 |
| `active` | active segment | `storage` | Open cylinder still filling | S2 |
| `oldseg` | closed segments | `storage` | Sealed cylinders | S6 |
| `offidx` | `.index` | `storage` | Index card strip with sparse ticks | S4 |
| `nic` | NIC / socket | `container` | Network card with a cable to the consumer | S9 |
| `consumer` | Consumer | `client` | Laptop with an inbound crate | S8 |

Node-state panels: `segdir` (list of files), `offidx` (table: relative offset, position), `pagecache` (list: cached pages / dirty pages).

### Steps

**S1 · move · `producer → broker` · Network**
- Title: batch가 브로커에 도착
- Subtitle: producer, broker, consumer가 같은 바이너리 형식을 쓴다.
- Prose: Kafka는 producer, broker, consumer가 공유하는 표준 바이너리 형식을 쓴다. 그래서 브로커는 받은 batch를 변환하지 않고 그대로 파일에 붙이고, 나중에 그대로 내보낼 수 있다. 이것이 byte copy를 피하는 첫 번째 전제다.
- Facts: shared format = record batch v2 (magic 2); batching amortizes network round trips; protocol is built around a "message set" (batch) abstraction.
- Event log: `Producer → Broker 1 · Network · Produce orders-0 · 16 KiB (E.G.)`
- Sources: [L1]

**S2 · mutate · `segdir` · Storage**
- Title: 파티션 = 디렉터리
- Subtitle: `<topic>-<partition>/` 안에 segment 파일 묶음이 있다.
- Prose: 토픽 `orders`의 파티션 0은 `orders-0` 디렉터리다. segment 파일 이름은 그 segment의 첫 offset을 20자리로 0을 채운 값이다. `.log`는 데이터, `.index`는 offset index, `.timeindex`는 time index, `.txnindex`는 aborted transaction index, `.snapshot`은 producer state snapshot이다.
- Facts: file name = 20-digit zero-padded base offset (`00000000000000000000.log`); suffixes = `.log`, `.index`, `.timeindex`, `.txnindex`, `.snapshot`; `log.dir` default `/tmp/kafka-logs`.
- Event log: `Broker 1 · Storage · open orders-0/00000000000000001024.log (E.G.) · —`
- State: list `[]` → `[00000000000000000000.log/.index/.timeindex, 00000000000000001024.log/.index/.timeindex (E.G.)]`
- Sources: [L2], [L3], [L4]

**S3 · mutate · `pagecache` · Storage**
- Title: page cache에 쓰기 (fsync 없음)
- Subtitle: 로그에 쓰는 것은 곧 커널 page cache에 넘기는 것이다.
- Prose: 모든 데이터는 곧바로 파일시스템의 로그에 쓰이지만, 디스크로 flush되지는 않는다. 즉 커널 page cache로 넘어갈 뿐이다. JVM 힙에 캐시를 두면 객체 오버헤드와 GC 비용이 들고 OS 캐시와 이중 저장이 된다. 그래서 Kafka는 page cache에 기댄다. 내구성은 fsync가 아니라 복제로 얻는다(lesson 3).
- Facts: `log.flush.interval.messages` = 9223372036854775807 (Long.MAX); `log.flush.scheduler.interval.ms` = Long.MAX; design doc: "32GB machine → 28-30GB cache without GC penalties".
- Event log: `Broker 1 → page cache · Storage · write() 16 KiB (dirty) · <1 ms (E.G.)`
- State: `dirty pages: 0` → `dirty pages: 4 (16 KiB, E.G.)`
- Sources: [L5], [L6]

**S4 · mutate · `offidx` · Storage**
- Title: sparse offset index
- Subtitle: 4096바이트마다 한 entry(relative offset → file position).
- Prose: 마지막 index entry 이후 쓴 바이트가 `log.index.interval.bytes`를 넘으면, batch의 마지막 offset과 그 batch의 파일 위치를 `.index`에 추가한다. 같은 때 `.timeindex`에도 지금까지의 최대 timestamp를 남긴다. entry는 base offset 기준 상대 offset 4바이트와 위치 4바이트, 합쳐 8바이트다. 파일은 mmap되고 미리 할당된다.
- Facts: `log.index.interval.bytes` = 4096; offset index entry = 8 B (int32 relativeOffset + int32 position); time index entry = 12 B (int64 timestamp + int32 relativeOffset); `log.index.size.max.bytes` = 10485760.
- Event log: `Broker 1 → .index · Storage · append (rel 37 → pos 4182) (E.G.) · 8 B`
- State: table `[(0,0)]` → `[(0,0), (37,4182) (E.G.)]`
- Decoder: **offset index entry** (see Decoder records)
- Sources: [L7], [L8], [L9], [L4]

**S5 · mutate · `active` · Storage**
- Title: segment roll
- Subtitle: 1 GiB, 7일, index 가득, 상대 offset 초과 중 하나면 새 segment.
- Prose: 활성 segment에만 append한다. 다음 append로 `segment.bytes`를 넘거나, segment가 `segment.ms`(지터 적용)만큼 오래됐거나, offset/time index가 가득 찼거나, offset을 4바이트 상대값으로 못 담으면 roll한다. 닫힌 segment의 index는 read-only로 바뀌고 남는 공간은 잘려 나간다.
- Facts: `log.segment.bytes` = 1073741824 (1 GiB); `log.roll.hours` = 168; roll triggers = size, time, index full, relative-offset overflow.
- Event log: `Broker 1 · Storage · roll → 00000000000000052113.log (E.G.) · —`
- State: `active: …01024.log 1.0 GiB` → `active: …52113.log 0 B; closed: …01024.log (E.G.)`
- Sources: [L10], [L11]

**S6 · mutate · `oldseg` · Storage**
- Title: retention은 segment 단위로 지운다
- Subtitle: 시간 또는 크기 기준을 넘은 가장 오래된 segment 파일을 통째로 삭제한다.
- Prose: 삭제는 한 번에 segment 하나씩이다. 시간 기준은 segment 안의 가장 큰 timestamp로 판단한다. 크기 기준은 기본으로 꺼져 있다. 지우는 동안에도 읽기를 막지 않도록 segment 목록은 copy-on-write로 관리한다.
- Facts: `log.retention.hours` = 168; `log.retention.bytes` = -1 (off); `log.retention.check.interval.ms` = 300000; `log.segment.delete.delay.ms` = 60000.
- Event log: `Broker 1 · Storage · delete …00000.log (.deleted) (E.G.) · —`
- State: `[…00000, …01024, …52113]` → `[…01024, …52113]`
- Sources: [L12], [L13]

**S7 · move · `consumer → broker` · Network**
- Title: Fetch 요청 (long poll)
- Subtitle: consumer는 offset을 주고 그 위치부터 chunk를 받아 간다(pull).
- Prose: consumer는 자기 offset을 담아 Fetch를 보내고, 그 위치부터 로그 chunk를 받는다. 데이터가 없으면 `fetch.min.bytes`가 찰 때까지 최대 `fetch.max.wait.ms` 동안 브로커에서 기다린다(long poll). pull 방식이라 느린 consumer는 뒤처질 뿐 넘치지 않는다.
- Facts: Fetch API key = 1, versions 4–18; `fetch.min.bytes` = 1; `fetch.max.wait.ms` = 500; `max.partition.fetch.bytes` = 1048576; `fetch.max.bytes` = 52428800.
- Event log: `Consumer → Broker 1 · Network · Fetch orders-0 offset=1237 (E.G.) · ~90 B (E.G.)`
- Decoder: **FetchRequest v18** (see Decoder records)
- Sources: [L14], [L15], [L16]

**S8 · mutate · `offidx` · Storage**
- Title: offset → 파일 위치 찾기
- Subtitle: segment는 base offset으로, 위치는 index binary search로 찾는다.
- Prose: 먼저 base offset으로 target offset이 들어 있는 segment를 고른다. 그 segment의 mmap된 `.index`에서 target 이하인 가장 큰 entry를 binary search로 찾는다. 그 위치부터 `.log`를 앞으로 훑어 target을 포함한 batch를 찾는다. index가 sparse라서 최대 약 4 KiB만 훑으면 된다.
- Facts: lookup = "greatest offset ≤ target"; empty index → `(baseOffset, 0)`; scan distance ≤ ~`log.index.interval.bytes`.
- Event log: `Broker 1 · Storage · lookup 1237 → seg …01024, pos 4182 (E.G.) · <1 ms (E.G.)`
- State: highlight row `(37, 4182)` in index table (E.G.)
- Sources: [L8], [L17], [L18]

**S9 · move · `pagecache → nic` · Storage**
- Title: `sendfile` zero-copy
- Subtitle: page cache에서 소켓으로, user space를 거치지 않고 바로.
- Prose: 일반 경로는 디스크→page cache→user buffer→socket buffer→NIC로, 복사 네 번과 시스템 콜 두 번이다. Kafka는 `FileRecords.writeTo`에서 `FileChannel.transferTo`, 즉 Linux `sendfile`로 page cache에서 소켓으로 바로 보낸다. consumer가 거의 따라잡은 클러스터에서는 데이터가 page cache에서 나가므로 디스크 읽기가 거의 없다.
- Facts: normal path = 4 copies + 2 system calls; zero-copy = `fileChannel.transferTo(position, count, socketChannel)`; data copied into page cache once, reused per consumer.
- Event log: `page cache → NIC · Storage · sendfile 1 MiB (E.G.) · —`
- Sources: [L19], [L20], [L21]

**S10 · mutate · `nic` · Network**
- Title: TLS면 zero-copy 없음
- Subtitle: SSL은 user space에서 암호화하므로 `sendfile`을 쓰지 않는다.
- Prose: TLS 라이브러리는 user space에서 동작하고, Kafka는 커널 `SSL_sendfile`을 지원하지 않는다. 그래서 SSL이 켜지면 `sendfile`을 쓰지 않는다. `SslTransportLayer.transferFrom`은 파일을 32 KiB direct buffer로 읽어 `SSLEngine`으로 암호화한 뒤 쓴다.
- Facts: `sendfile` disabled with SSL; in-kernel `SSL_sendfile` not supported; SSL read buffer = 32768 B direct buffer; relevant configs = `security.protocol`, `security.inter.broker.protocol`.
- Event log: `Broker 1 · Network · TLS listener: read+encrypt+write path · —`
- State: `path: sendfile` → `path: read → encrypt → write`
- Sources: [L20], [L26]

**S11 · move · `nic → consumer` · Network**
- Title: Fetch 응답
- Subtitle: 압축된 batch는 압축된 채로 consumer에게 간다.
- Prose: 응답에는 파티션마다 `HighWatermark`, `LastStableOffset`, `LogStartOffset`과 record batch 바이트가 들어 있다. 압축은 batch 단위라서 batch가 로그에도 압축된 채 있고, 그대로 전송되며, consumer가 푼다. `read_uncommitted` consumer는 high watermark까지만 읽는다(lesson 3).
- Facts: compression codecs = gzip(1), snappy(2), lz4(3), zstd(4) in attributes bits 0–2; consumer decompresses; consumer fetch isolation = `HIGH_WATERMARK` (read_uncommitted) or `TXN_COMMITTED` (read_committed).
- Event log: `Broker 1 → Consumer · Network · FetchResponse orders-0 HW=1300 (E.G.) · 1 MiB (E.G.)`
- Sources: [L22], [L23], [L1], [L24]

**S12 · mutate · `segdir` · Storage**
- Title: crash 후 복구
- Subtitle: 마지막 segment를 훑고 CRC로 검증해 잘라 낸다.
- Prose: 시작할 때 log recovery가 가장 새 segment의 모든 엔트리를 훑어 크기와 CRC를 확인한다. 손상이 있으면 마지막 유효 offset까지 잘라 낸다. index에는 checksum이 없으므로 crash가 나면 index를 다시 만든다.
- Facts: recovery checks size+offset < file length AND CRC; index files carry no checksum, rebuilt on crash; `num.recovery.threads.per.data.dir` = 2.
- Event log: `Broker 1 · Storage · recover …52113.log truncate to 52190 (E.G.) · 120 ms (E.G.)`
- State: `…52113.log 3.1 MiB (torn tail)` → `…52113.log 3.0 MiB (E.G.)`
- Sources: [L25], [L8], [L13]

### Decoder records

1. **Record batch v2** (S1, S11): shared with lesson 1.
2. **Offset index entry** (S4, S8): 8 bytes. See "Decoder: offset index entry".
3. **FetchRequest v18 + RequestHeader v2** (S7). See "Decoder: FetchRequest".

### Sources

| id | What | URL |
|---|---|---|
| L1 | Efficiency: message set batching, shared binary format | `K/docs/design/design.md#L76-L92` |
| L2 | Partition directory, file naming by first offset | `K/docs/implementation/log.md#L29` |
| L3 | File suffixes | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogFileUtils.java#L27-L67`; 20-digit name `#L102-L108` |
| L4 | `log.dir` default, index defaults | `K/server-common/src/main/java/org/apache/kafka/server/config/ServerLogConfigs.java#L50` and `#L93-L97` |
| L5 | Page-cache-centric design | `K/docs/design/design.md#L53-L64` |
| L6 | Flush defaults | `K/server-common/src/main/java/org/apache/kafka/server/config/ServerLogConfigs.java#L101-L113` |
| L7 | Index append every `indexIntervalBytes` | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogSegment.java#L255-L279` |
| L8 | `OffsetIndex` format and lookup | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/OffsetIndex.java#L30-L56` and `#L90-L106` |
| L9 | `TimeIndex` format | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/TimeIndex.java#L30-L56` |
| L10 | `shouldRoll` | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogSegment.java#L167-L173` |
| L11 | Segment/retention defaults | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogConfig.java#L130-L138` and `#L160-L177` |
| L12 | Deletes: one segment at a time, largest timestamp, copy-on-write | `K/docs/implementation/log.md#L70-L72` |
| L13 | Retention, cleanup, delete-delay, recovery-thread defaults | `K/server-common/src/main/java/org/apache/kafka/server/config/ServerLogConfigs.java#L81-L105` and `#L147` |
| L14 | Pull and long poll | `K/docs/design/design.md#L135-L145` |
| L15 | `FetchRequest` schema | `K/clients/src/main/resources/common/message/FetchRequest.json#L16-L125` |
| L16 | Consumer fetch defaults | `K/clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerConfig.java#L212`, `#L225`, `#L235`, `#L250` |
| L17 | Reads: locate segment, binary search | `K/docs/implementation/log.md#L41-L47` |
| L18 | `translateOffset` | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogSegment.java#L375-L395` |
| L19 | `FileRecords.writeTo` → `transferFrom` | `K/clients/src/main/java/org/apache/kafka/common/record/internal/FileRecords.java#L280-L291` |
| L20 | sendfile path, 4 copies, SSL exception | `K/docs/design/design.md#L92-L111` |
| L21 | `PlaintextTransportLayer.transferFrom` → `transferTo` | `K/clients/src/main/java/org/apache/kafka/common/network/PlaintextTransportLayer.java#L212-L215` |
| L22 | `FetchResponse` partition fields | `K/clients/src/main/resources/common/message/FetchResponse.json#L73-L111` |
| L23 | Compression attribute bits | `K/docs/implementation/message-format.md#L40-L47` |
| L24 | `FetchIsolation` | `K/server-common/src/main/java/org/apache/kafka/server/storage/log/FetchIsolation.java#L22-L39` |
| L25 | Log recovery guarantees | `K/docs/implementation/log.md#L74-L78` |
| L26 | `SslTransportLayer.transferFrom` | `K/clients/src/main/java/org/apache/kafka/common/network/SslTransportLayer.java#L1003-L1040` |

### Self-check

1. offset 1237을 찾는 과정을 단계별로 설명하라. → base offset으로 segment를 고르고, `.index`에서 1237 이하 최대 entry를 binary search로 찾은 뒤, 그 위치부터 `.log`를 앞으로 훑는다.
2. offset index entry 크기와 구성은? → 8바이트: 4바이트 상대 offset + 4바이트 파일 위치.
3. 기본 설정에서 Kafka는 언제 fsync하나? → 주기적 강제 flush가 기본으로 꺼져 있다(`Long.MAX_VALUE`). 내구성은 복제로 얻는다.
4. retention 7일인데 8일 된 레코드가 남아 있을 수 있는 이유는? → 삭제가 segment 단위이고, segment 안 가장 큰 timestamp를 기준으로 하기 때문이다. 활성 segment도 roll되기 전에는 지워지지 않는다.
5. zero-copy가 꺼지는 대표적인 경우는? → SSL/TLS 리스너.
6. segment roll 조건 네 가지는? → `segment.bytes`, `segment.ms`, index full, 상대 offset 범위 초과.

---

## Lesson 3 · `replication`: ISR과 high watermark

### Goal

follower가 leader를 fetch하며 복제하는 동안 ISR과 high watermark(HW)가 어떻게 움직이는지, `acks=all`과 `min.insync.replicas`가 무엇을 보장하고 언제 쓰기를 거절하는지 본다.

Interview questions it answers:
- ISR은 무엇이고, 누가 언제 replica를 빼고 넣나?
- high watermark는 어떻게 계산되나? consumer는 왜 HW까지만 읽나?
- `replication.factor=3, min.insync.replicas=2, acks=all`에서 broker 두 대가 죽으면?
- unclean leader election은 무엇이고 기본값은? ELR은 무엇을 바꿨나?

### Nodes

| id | Label | Kind | Illustration idea | Appears at |
|---|---|---|---|---|
| `producer` | Producer | `client` | Laptop with crate | S1 |
| `leader` | Broker 1 · leader | `container` | Server tower with crown tag, log strip showing LEO marker | S1 |
| `f2` | Broker 2 · follower | `container` | Server tower, log strip | S2 |
| `f3` | Broker 3 · follower | `container` | Server tower, log strip | S2 |
| `controller` | KRaft controller | `framework` | Control-tower building with a small Raft-log scroll | S8 |
| `consumer` | Consumer | `client` | Laptop | S6 |

Node-state panels: `leader` (table: replica, LEO, in ISR, lastCaughtUp ms; plus HW row), `controller` (table: partition, leader, leaderEpoch, ISR, ELR).

### Steps

**S1 · mutate · `leader` · Broker**
- Title: leader에 쓰기
- Subtitle: 모든 쓰기는 leader로, leader의 LEO가 먼저 올라간다.
- Prose: 복제 단위는 토픽 파티션이고, 파티션마다 leader 하나와 follower 0개 이상이 있다. replication factor는 leader를 포함한 replica 수다. 쓰기는 모두 leader로 가고, leader는 로컬 로그에 append해 LEO(log end offset)를 올린다. follower 로그는 leader와 같은 offset과 순서를 가진다.
- Facts: unit = topic partition; RF includes leader; `default.replication.factor` = 1; un-replicated topic = RF 1.
- Event log: `Producer → Broker 1 · Network · Produce acks=-1 orders-0 · 16 KiB (E.G.)`
- State: `B1 LEO 100, B2 LEO 100, B3 LEO 100, HW 100` → `B1 LEO 110 … HW 100 (E.G.)`
- Sources: [R1]

**S2 · move · `f2 → leader` · Network**
- Title: follower가 fetch한다
- Subtitle: follower는 consumer처럼 leader에서 pull한다.
- Prose: follower는 일반 consumer처럼 leader에 Fetch를 보내 로그를 받아 자기 로그에 붙인다. pull 방식이라 follower가 로그 entry를 자연스럽게 batch로 묶을 수 있다. Fetch v15부터 follower는 `ReplicaState`(ReplicaId, ReplicaEpoch)로 자신을 밝힌다.
- Facts: `num.replica.fetchers` = 1; `replica.fetch.max.bytes` = 1048576; `replica.fetch.wait.max.ms` = 500; follower identity = `ReplicaState.ReplicaId` (v15+), consumer = -1.
- Event log: `Broker 2 → Broker 1 · Network · Fetch orders-0 fetchOffset=100 replicaId=2 · ~100 B (E.G.)`
- Sources: [R2], [R3], [R4]

**S3 · mutate · `leader` · Broker**
- Title: follower LEO 기록
- Subtitle: follower의 fetch offset이 곧 follower의 LEO다.
- Prose: leader는 follower가 요청한 fetch offset으로 follower의 LEO를 안다. 다음 fetch에서 offset 110을 요청하면 follower가 100–109를 받아 썼다는 뜻이다. leader는 replica마다 마지막으로 완전히 따라잡은 시각(`lastCaughtUpTime`)을 갱신한다.
- Facts: follower LEO learned from next `FetchOffset`; caught-up tracking per replica; lag limit = `replica.lag.time.max.ms` = 30000.
- Event log: `Broker 2 → Broker 1 · Network · Fetch fetchOffset=110 · —`
- State: `B2 LEO 100` → `B2 LEO 110`
- Sources: [R5], [R4]

**S4 · mutate · `leader` · Broker**
- Title: high watermark 전진
- Subtitle: HW = ISR(및 합류 가능한 caught-up replica) LEO의 최솟값.
- Prose: leader는 ISR replica의 LEO가 바뀌거나 ISR이 바뀔 때 HW를 다시 계산한다. 새 HW는 leader LEO에서 시작해, 그보다 작은 LEO를 가진 ISR 멤버(또는 ISR에 들어올 자격이 있는 caught-up replica)의 LEO로 낮춘다. ISR 크기가 `min.insync.replicas`보다 작으면 HW를 올리지 않는다(strict min ISR).
- Facts: HW = min LEO over (maximal ISR ∪ caught-up eligible); HW does not advance when ISR < `min.insync.replicas`; `replica.high.watermark.checkpoint.interval.ms` = 5000.
- Event log: `Broker 1 · Broker · HW 100 → 105 (B3 LEO 105) (E.G.) · —`
- State: `HW 100` → `HW 105 (E.G.)`
- Sources: [R6], [R4]

**S5 · move · `leader → producer` · Network**
- Title: `acks=all` 응답
- Subtitle: 요청 offset까지 HW가 오면 응답한다.
- Prose: `acks=-1` 요청은 purgatory에서 기다리다가, HW가 요청의 offset 이상이 되면 완료된다. 그때 ISR 크기가 min ISR보다 작아졌으면 `NOT_ENOUGH_REPLICAS_AFTER_APPEND`를 돌려준다. 이미 로컬에 쓴 뒤 ISR이 줄어든 경우다.
- Facts: completion = `leaderLog.highWatermark >= requiredOffset`; error if ISR shrank after append = `NOT_ENOUGH_REPLICAS_AFTER_APPEND`; `acks=all` = "all current in-sync replicas", not all assigned replicas.
- Event log: `Broker 1 → Producer · Network · ProduceResponse orders-0 baseOffset=100 · 6 ms (E.G.)`
- Sources: [R7], [R8]

**S6 · move · `consumer → leader` · Network**
- Title: consumer는 HW까지만 본다
- Subtitle: committed 메시지만 consumer에게 준다.
- Prose: committed, 즉 ISR 전체가 받은 메시지만 consumer에게 준다. 그래서 consumer는 leader가 죽으면 사라질 수 있는 메시지를 보지 않는다. `read_uncommitted` consumer의 fetch 상한은 HW이고, `read_committed`는 LSO(lesson 5)다. leader가 아닌 replica에서 읽는 경우도 있지만 이 lesson에서는 다루지 않는다.
- Facts: consumer fetch isolation = `HIGH_WATERMARK`; follower fetch isolation = `LOG_END`; `FetchResponse.HighWatermark` returned per partition.
- Event log: `Consumer → Broker 1 · Network · Fetch offset=100 → records 100..104 (HW 105) (E.G.) · 8 KiB (E.G.)`
- Sources: [R9], [R10], [R11]

**S7 · mutate · `leader` · Broker**
- Title: 느린 follower는 ISR에서 빠진다
- Subtitle: `replica.lag.time.max.ms` 동안 따라잡지 못하면 out-of-sync.
- Prose: follower가 멈췄거나(LEO가 안 오름) 느려서, 최근 `replica.lag.time.max.ms` 안에 leader LEO까지 따라잡은 적이 없으면 out-of-sync다. leader는 이를 감지해 ISR 축소를 제안한다. 브로커가 아예 죽으면 controller가 세션 만료로 알아채고 ISR에서 뺀다(lesson 6).
- Facts: `replica.lag.time.max.ms` = 30000; stuck and slow followers both use `lastCaughtUpTimeMs`; liveness = active controller session + not too far behind.
- Event log: `Broker 1 · Broker · B3 out of sync (lag 31 s) (E.G.) · —`
- State: `B3 in ISR = yes` → `B3 in ISR = pending removal`
- Sources: [R12], [R13]

**S8 · move · `leader → controller` · Controller**
- Title: AlterPartition으로 ISR 변경 요청
- Subtitle: ISR 변경은 controller가 metadata에 커밋해야 확정된다.
- Prose: leader는 새 ISR을 `AlterPartition`(API key 56)으로 controller에 보낸다. controller는 broker epoch를 검사한 뒤 `PartitionChangeRecord`를 metadata log에 쓴다. 커밋 전까지 leader는 HW 계산에 "maximal ISR"(현재 ISR ∪ 추가 중 replica)을 쓴다. 이 집합은 더 보수적이라 안전하다.
- Facts: `AlterPartition` API key = 56, versions 2–3; ISR persisted in cluster metadata whenever it changes; maximal ISR used while in flight.
- Event log: `Broker 1 → Controller · Controller · AlterPartition orders-0 ISR [1,2] · ~60 B (E.G.)`
- Sources: [R14], [R15], [R6]

**S9 · mutate · `controller` · Controller**
- Title: ISR 축소 커밋
- Subtitle: 이제 ISR = [1,2], HW 계산에서 B3는 빠진다.
- Prose: controller가 `PartitionChangeRecord(Isr=[1,2])`를 커밋하면 broker들이 metadata를 받아 반영한다. ISR 모델에서는 replica가 f+1개면 committed 메시지를 잃지 않고 f개의 장애를 견딘다. 다수결 quorum처럼 2f+1개가 필요하지 않다.
- Facts: f+1 replicas tolerate f failures (ISR model); majority quorum needs 2f+1; any ISR member is eligible for leader.
- Event log: `Controller · Controller · PartitionChangeRecord orders-0 isr=[1,2] (E.G.) · —`
- State: `ISR [1,2,3]` → `ISR [1,2]`
- Sources: [R16], [R17]

**S10 · mutate · `leader` · Broker**
- Title: `min.insync.replicas`로 쓰기 거절
- Subtitle: ISR이 min ISR보다 작으면 `acks=all` 쓰기를 거절한다.
- Prose: B2도 빠져 ISR=[1]이 되면, `min.insync.replicas=2`인 토픽은 `acks=-1` 쓰기를 append 전에 `NotEnoughReplicasException`으로 거절한다. 이 설정은 `acks=all`일 때만 효과가 있다. 일관성은 높아지지만 가용성은 낮아진다.
- Facts: check = `inSyncSize < minIsr && requiredAcks == -1` → `NotEnoughReplicasException`; `min.insync.replicas` = 1 (default); effect only with `acks=all`.
- Event log: `Producer → Broker 1 · Network · Produce acks=-1 → NOT_ENOUGH_REPLICAS · 1 ms (E.G.)`
- State: `ISR [1,2] · writes OK` → `ISR [1] · acks=all rejected`
- Sources: [R18], [R19], [R13]

**S11 · mutate · `controller` · Controller**
- Title: leader 장애와 새 leader 선출
- Subtitle: controller가 ISR에서 새 leader를 고르고 leader epoch를 올린다.
- Prose: leader 브로커가 죽으면 controller가 남은 ISR 멤버 중 하나를 새 leader로 고른다. 여러 파티션의 leader 변경은 묶어서 알린다. 새 leader epoch는 record batch의 `partitionLeaderEpoch`에 찍힌다. follower는 Fetch의 `LastFetchedEpoch`/`DivergingEpoch`로 갈라진 로그 끝을 잘라 낸다.
- Facts: controller elects from ISR; leadership notifications batched; Fetch v12+ carries `LastFetchedEpoch`, response `DivergingEpoch` (truncation detection).
- Event log: `Controller · Controller · PartitionChangeRecord orders-0 leader=2 (E.G.) · —`
- State: `leader 1, epoch 7` → `leader 2, epoch 8 (E.G.)`
- Sources: [R20], [R3], [R21]

**S12 · mutate · `controller` · Controller**
- Title: 모두 죽으면: unclean election
- Subtitle: 기본은 ISR replica가 돌아올 때까지 기다린다(일관성 우선).
- Prose: ISR 전원이 죽으면 두 가지 선택이 있다. ISR replica가 돌아오기를 기다리거나, 처음 살아난 replica를 ISR이 아니어도 leader로 삼는 것이다. 0.11.0.0부터 기본은 기다리는 쪽이다. `unclean.leader.election.enable=true`면 가용성을 위해 committed 메시지를 잃을 수 있다.
- Facts: `unclean.leader.election.enable` = false; trade-off = availability vs consistency; unclean leader → `LeaderRecoveryState` = 1 while recovering.
- Event log: `Controller · Controller · orders-0 offline (no ISR alive) · —`
- State: `leader 2, ISR [2]` → `leader -1 (offline), ISR [2]`
- Sources: [R22], [R23], [R24]

**S13 · mutate · `controller` · Controller**
- Title: ELR (Eligible Leader Replicas)
- Subtitle: strict min ISR 덕에, ISR 밖이어도 안전한 replica를 leader 후보로 기록한다.
- Prose: HW가 min ISR 미만에서 오르지 않으므로(S4), ISR에서 빠진 일부 replica는 committed 데이터를 모두 가지고 있다. KRaft controller는 이들을 `PartitionRecord`의 `EligibleLeaderReplicas`에 저장한다. 선출 순서는 ISR → fenced가 아닌 ELR → unfenced인 마지막 leader다. ELR은 4.0에서 도입됐고, 4.1부터 새 클러스터에서 기본으로 켜진다.
- Facts: feature flag = `eligible.leader.replicas.version=1`; order = ISR → unfenced ELR → last known leader; default-on for new clusters since 4.1.
- Event log: `Controller · Controller · orders-0 ELR=[3] (E.G.) · —`
- State: `ISR [2], ELR []` → `ISR [2], ELR [3] (E.G.)`
- Sources: [R25], [R26]

### Decoder records

1. **FetchRequest v18 from a follower** (S2): same layout as lesson 2, with `ReplicaState` tagged field set (`ReplicaId=2`, `ReplicaEpoch` = broker epoch, E.G.).
2. **PartitionChangeRecord v2** (S9, S11, S13): see "Decoder: PartitionChangeRecord" (shared with lesson 6).

### Sources

| id | What | URL |
|---|---|---|
| R1 | Replication basics; `default.replication.factor` default | `K/docs/design/design.md#L279-L285`, `K/server/src/main/java/org/apache/kafka/server/config/ReplicationConfigs.java#L41-L42` |
| R2 | Followers pull like consumers | `K/docs/design/design.md#L287` |
| R3 | Fetch schema: `ReplicaState`, `LastFetchedEpoch` | `K/clients/src/main/resources/common/message/FetchRequest.json#L16-L125` |
| R4 | Replica fetcher and lag defaults | `K/server/src/main/java/org/apache/kafka/server/config/ReplicationConfigs.java#L55-L103` |
| R5 | `isFollowerInSync` (LEO ≥ HW) | `K/core/src/main/scala/kafka/cluster/Partition.scala#L907-L911` |
| R6 | `maybeIncrementLeaderHW` (incl. min-ISR guard, maximal ISR) | `K/core/src/main/scala/kafka/cluster/Partition.scala#L985-L1035` |
| R7 | `checkEnoughReplicasReachOffset` | `K/core/src/main/scala/kafka/cluster/Partition.scala#L947-L981` |
| R8 | "acks=all" = current ISR | `K/docs/design/design.md#L353-L356` |
| R9 | Only committed messages reach consumers | `K/docs/design/design.md#L302-L309` |
| R10 | `FetchIsolation` | `K/server-common/src/main/java/org/apache/kafka/server/storage/log/FetchIsolation.java#L22-L39` |
| R11 | `FetchResponse.HighWatermark` | `K/clients/src/main/resources/common/message/FetchResponse.json#L73` |
| R12 | Out-of-sync detection | `K/core/src/main/scala/kafka/cluster/Partition.scala#L1133-L1161` |
| R13 | Liveness conditions, ISR removal | `K/docs/design/design.md#L289-L298` |
| R14 | `AlterPartition` request | `K/clients/src/main/resources/common/message/AlterPartitionRequest.json#L17` |
| R15 | Controller `alterPartition` checks broker epoch | `K/metadata/src/main/java/org/apache/kafka/controller/ReplicationControlManager.java#L1078-L1083` |
| R16 | ISR vs majority vote, f+1 | `K/docs/design/design.md#L321-L333` |
| R17 | `PartitionChangeRecord` | `K/metadata/src/main/resources/common/metadata/PartitionChangeRecord.json#L16-L56` |
| R18 | `NotEnoughReplicasException` on append | `K/core/src/main/scala/kafka/cluster/Partition.scala#L1230-L1240` |
| R19 | `min.insync.replicas` default | `K/server-common/src/main/java/org/apache/kafka/server/config/ServerLogConfigs.java#L155` |
| R20 | Controller elects from ISR, batches notifications | `K/docs/design/design.md#L360-L364` |
| R21 | Record batch `partitionLeaderEpoch` field | `K/docs/implementation/message-format.md#L36-L38` |
| R22 | Unclean leader election | `K/docs/design/design.md#L337-L349` |
| R23 | `unclean.leader.election.enable` default | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/LogConfig.java#L138` |
| R24 | `LeaderRecoveryState` meaning | `K/metadata/src/main/resources/common/metadata/PartitionChangeRecord.json#L44-L45` |
| R25 | Eligible Leader Replicas | `K/docs/operations/eligible-leader-replicas.md#L29-L56` |
| R26 | `PartitionRecord.EligibleLeaderReplicas` | `K/metadata/src/main/resources/common/metadata/PartitionRecord.json#L47-L52` |

### Self-check

1. HW 계산 규칙은? → ISR(maximal ISR과 합류 가능한 caught-up replica 포함) LEO의 최솟값이다. ISR이 min ISR 미만이면 오르지 않는다.
2. RF=3, `min.insync.replicas=2`, `acks=all`에서 broker 2대가 죽으면? → ISR=[1]이 되고, `acks=all` 쓰기는 `NOT_ENOUGH_REPLICAS`로 거절된다. 읽기는 기존 HW까지 된다.
3. RF=2, min ISR 1, `acks=all`에서 한 대가 죽은 뒤 들어온 쓰기의 위험은? → ISR=[leader]만으로 성공 응답이 나간다. 그 leader까지 죽으면 유실된다.
4. follower가 ISR에서 빠지는 두 경우는? → controller 세션 만료(브로커 사망), 또는 `replica.lag.time.max.ms` 동안 따라잡지 못함.
5. unclean election 기본값과 그 의미는? → `false`. ISR replica가 돌아올 때까지 파티션은 unavailable이다.
6. ELR 후보 replica가 ISR 밖인데도 안전한 이유는? → HW가 min ISR 미만에서 오르지 않으므로, committed 데이터를 모두 가진 replica만 ELR에 남기 때문이다.

---

## Lesson 4 · `consumer-group`: 파티션을 나누고 위치를 저장한다

### Goal

group coordinator가 정해지는 방식, classic(eager/cooperative) rebalance와 KIP-848 `consumer` 프로토콜이 파티션을 다시 나누는 방식, 위치(offset)가 `__consumer_offsets`에 레코드로 저장되는 방식을 본다.

Interview questions it answers:
- 같은 group의 consumer 수가 파티션 수보다 많으면?
- eager와 cooperative rebalance의 차이는? stop-the-world는 어디서 생기나?
- KIP-848 프로토콜은 무엇이 다르고, 4.4.0에서 기본값인가?
- offset commit은 어디에 어떤 형식으로 저장되나? 자동 커밋이 중복이나 유실을 일으키는 경우는?
- `max.poll.interval.ms`와 `session.timeout.ms`의 차이는?

### Nodes

| id | Label | Kind | Illustration idea | Appears at |
|---|---|---|---|---|
| `c1` | Consumer A | `app` | Laptop with a worker figure | S1 |
| `c2` | Consumer B | `app` | Laptop with a worker figure | S6 |
| `coord` | Group coordinator (Broker 2) | `framework` | Server tower with a clipboard/roster badge | S2 |
| `offsets` | `__consumer_offsets-17` | `storage` | Cylinder labeled with a bookmark ribbon | S2 |
| `topic` | `orders` p0–p3 | `storage` | Four stacked log strips | S1 |

Node-state panels: `coord` (table: member, epoch/generation, assigned partitions, state), `offsets` (table: key (group, topic, partition), offset, commitTimestamp).

### Steps

**S1 · mutate · `topic` · Client**
- Title: group = 파티션을 나눠 갖는 consumer 집합
- Subtitle: 한 파티션은 group 안의 consumer 하나만 읽는다.
- Prose: 토픽은 전순서가 보장되는 파티션들로 나뉘고, 각 파티션은 subscribe한 group마다 consumer 하나가 읽는다. 그래서 consumer 위치는 파티션마다 정수 하나(다음에 읽을 offset)로 충분하다. consumer가 파티션보다 많으면 남는 consumer는 놀게 된다.
- Facts: one partition → one consumer per group; position = "offset of the next message to consume"; consumers beyond partition count get no partition (follows from the rule above).
- Event log: `Consumer A · Client · subscribe(orders) group.id=order-svc (E.G.) · —`
- State: `p0..p3 owner: —` → `p0..p3 owner: (pending)`
- Sources: [G1]

**S2 · move · `c1 → coord` · Network**
- Title: coordinator 찾기
- Subtitle: `abs(groupId.hashCode) % 50` 번 `__consumer_offsets` 파티션의 leader.
- Prose: consumer는 `FindCoordinator`(API key 10)로 group coordinator를 찾는다. coordinator는 `Utils.abs(groupId.hashCode()) % offsets.topic.num.partitions` 번 `__consumer_offsets` 파티션을 맡은 브로커(그 파티션의 leader)다. 그래서 group의 membership과 offset이 한 브로커, 한 파티션에 모인다.
- Facts: partition = `abs(groupId.hashCode()) % offsets.topic.num.partitions`; `offsets.topic.num.partitions` = 50; `offsets.topic.replication.factor` = 3; `FindCoordinator` API key = 10.
- Event log: `Consumer A → Broker 2 · Network · FindCoordinator(order-svc) → node 2, p17 (E.G.) · —`
- Sources: [G2], [G3]

**S3 · move · `c1 → coord` · Network**
- Title: classic: JoinGroup
- Subtitle: 모든 멤버가 JoinGroup으로 모이는 global barrier.
- Prose: classic 프로토콜에서는 각 멤버가 `JoinGroup`(API key 11)을 보내고, coordinator는 멤버를 모은 뒤 한 명을 leader로 정해 응답한다. 빈 group의 첫 rebalance는 `group.initial.rebalance.delay.ms`만큼 기다려 멤버를 더 모은다. `session.timeout.ms` 동안 heartbeat가 없으면 그 멤버는 group에서 빠진다.
- Facts: `JoinGroup` API key = 11; `session.timeout.ms` = 45000; `heartbeat.interval.ms` = 3000; `group.initial.rebalance.delay.ms` = 3000.
- Event log: `Consumer A → Broker 2 · Network · JoinGroup(order-svc, protocols=[range,cooperative-sticky]) · —`
- Sources: [G4], [G5], [G6]

**S4 · move · `coord → c1` · Network**
- Title: classic: leader가 할당을 계산하고 SyncGroup
- Subtitle: classic에서는 할당이 클라이언트 쪽(group leader)에서 계산된다.
- Prose: JoinGroup 응답의 `Leader`가 자기 `MemberId`와 같으면 그 consumer가 leader다. leader는 `partition.assignment.strategy`의 assignor로 전체 할당을 계산해 `SyncGroup`(API key 14)으로 보낸다. 나머지 멤버는 빈 SyncGroup을 보내고 자기 몫을 응답으로 받는다.
- Facts: `partition.assignment.strategy` = `[RangeAssignor, CooperativeStickyAssignor]`; `SyncGroup` API key = 14; leader = member whose id equals `JoinGroupResponse.Leader`.
- Event log: `Broker 2 → Consumer A · Network · SyncGroup assignment p0..p3 · —`
- State: `A: —` → `A: p0,p1,p2,p3 (generation 1)`
- Sources: [G5], [G7], [G8]

**S5 · mutate · `c1` · Client**
- Title: eager rebalance = 전부 내려놓기
- Subtitle: rebalance 전에 소유한 모든 파티션을 revoke한다.
- Prose: B가 합류해 rebalance가 시작되면, EAGER 프로토콜의 consumer는 JoinGroup을 다시 보내기 전에 소유 파티션을 모두 revoke하고(`onPartitionsRevoked`) 할당을 비운다. 새 할당을 받을 때까지 group 전체가 아무것도 처리하지 않는다. 이것이 stop-the-world rebalance다.
- Facts: EAGER: revoke all in `onJoinPrepare`; callback = `onPartitionsRevoked(all)`; processing pause = until SyncGroup completes.
- Event log: `Consumer A · Client · EAGER revoke [p0,p1,p2,p3] · —`
- State: `A: p0..p3` → `A: —`
- Sources: [G9]

**S6 · mutate · `c1` · Client**
- Title: cooperative rebalance = 필요한 것만 내려놓기
- Subtitle: 계속 가질 파티션은 쥔 채, 옮길 파티션만 revoke하고 한 번 더 rebalance.
- Prose: COOPERATIVE에서는 구독에서 빠진 파티션만 먼저 revoke한다. 새 할당을 받으면 "가진 것 − 할당된 것"만 revoke하고 다시 join을 요청한다. 두 번째 rebalance에서 풀려난 파티션이 B에게 간다. A는 p0, p1을 계속 처리한다.
- Facts: COOPERATIVE: revoked = owned − assigned; then `requestRejoin("need to revoke partitions and re-join")`; default list includes `CooperativeStickyAssignor`.
- Event log: `Consumer A · Client · COOPERATIVE revoke [p2,p3], keep [p0,p1] (E.G.) · —`
- State: `A: p0..p3` → `A: p0,p1 · B: (next round) p2,p3`
- Sources: [G10], [G9]

**S7 · move · `c2 → coord` · Network**
- Title: KIP-848: ConsumerGroupHeartbeat
- Subtitle: join, heartbeat, 할당 수신이 API 하나로 합쳐지고 할당은 브로커가 계산한다.
- Prose: `group.protocol=consumer`면 consumer는 `ConsumerGroupHeartbeat`(API key 68)만 보낸다. 처음에는 `MemberEpoch=0`으로 합류하고, 나갈 때는 -1을 보낸다. heartbeat 간격, session timeout, assignor는 브로커 설정이 정한다. 4.0부터 GA지만 4.4.0 `KafkaConsumer`의 기본값은 여전히 `classic`이다.
- Facts: API key = 68; `group.protocol` default = `classic` (5.0 plans to default to `consumer`); `group.consumer.heartbeat.interval.ms` = 5000; `group.consumer.session.timeout.ms` = 45000.
- Event log: `Consumer B → Broker 2 · Network · ConsumerGroupHeartbeat epoch=0 topics=[orders] · ~80 B (E.G.)`
- Sources: [G11], [G12], [G13], [G14]

**S8 · mutate · `coord` · Broker**
- Title: KIP-848: group epoch와 target assignment
- Subtitle: 구독이 바뀌면 group epoch가 오르고, 서버 assignor가 target을 계산한다.
- Prose: 멤버 구독이 바뀌면 coordinator가 group epoch를 올리고, 서버 쪽 assignor(기본 `uniform`, 그 외 `range`)로 새 target assignment를 계산한다. 이 과정에 global barrier는 없다. 각 멤버는 자기 heartbeat 응답으로 자기 몫만 받는다. 클라이언트 쪽 assignor는 지원하지 않는다.
- Facts: `group.consumer.assignors` default = `[uniform, range]` (first = default); client `group.remote.assignor` overrides; client assignors not supported; `partition.assignment.strategy`/`session.timeout.ms`/`heartbeat.interval.ms` unusable with `consumer` protocol.
- Event log: `Broker 2 · Broker · group epoch 5 → 6, target A=[p0,p1] B=[p2,p3] (E.G.) · —`
- State: `group epoch 5, target A=[p0..p3]` → `group epoch 6, target A=[p0,p1], B=[p2,p3]`
- Sources: [G12], [G15], [G16]

**S9 · mutate · `coord` · Broker**
- Title: KIP-848: 멤버별 reconciliation
- Subtitle: STABLE → UNREVOKED_PARTITIONS → (UNRELEASED_PARTITIONS) → STABLE.
- Prose: A는 먼저 p2, p3을 revoke하라는 응답을 받고 `UNREVOKED_PARTITIONS` 상태가 된다. A가 heartbeat의 owned 목록에서 p2, p3을 빼면 다음 epoch로 넘어간다. B는 p2, p3이 풀릴 때까지 `UNRELEASED_PARTITIONS`에서 기다렸다가 받는다. 멤버마다 따로 진행하므로 A는 p0, p1 처리를 멈추지 않는다.
- Facts: member states = `STABLE(0)`, `UNREVOKED_PARTITIONS(1)`, `UNRELEASED_PARTITIONS(2)`; revoked = no longer listed in `TopicPartitions` of heartbeat; fully incremental (no global barrier).
- Event log: `Broker 2 → Consumer A · Network · HeartbeatResponse revoke [p2,p3] · —`
- State: `A STABLE e5 [p0..p3]; B — ` → `A STABLE e6 [p0,p1]; B STABLE e6 [p2,p3]`
- Sources: [G17], [G18], [G11]

**S10 · move · `c1 → coord` · Network**
- Title: offset commit
- Subtitle: `OffsetCommit`(API key 8): 다음에 읽을 offset을 커밋한다.
- Prose: consumer는 처리한 위치를 `OffsetCommit`으로 coordinator에 보낸다. `GenerationIdOrMemberEpoch`는 classic이면 generation, consumer 프로토콜이면 member epoch다. 오래된 멤버의 커밋은 이 값으로 걸러진다. 기본은 `enable.auto.commit=true`, 5초 간격이다.
- Facts: `OffsetCommit` API key = 8, versions 2–10 (v10 uses TopicId); `enable.auto.commit` = true; `auto.commit.interval.ms` = 5000; `offset.metadata.max.bytes` = 4096.
- Event log: `Consumer A → Broker 2 · Network · OffsetCommit orders-0=1237 (E.G.) · ~70 B (E.G.)`
- Sources: [G19], [G6], [G3]

**S11 · mutate · `offsets` · Storage**
- Title: `__consumer_offsets`에 레코드로 기록
- Subtitle: key = (group, topic, partition), value = offset·leaderEpoch·metadata·commitTimestamp.
- Prose: coordinator는 커밋을 `__consumer_offsets-17`에 레코드 하나로 쓴다. key는 타입 접두어 1(OffsetCommit) + group/topic/partition이고, value는 버전 4로 직렬화된다. 이 토픽은 `cleanup.policy=compact`라서 key마다 마지막 커밋만 남는다. 커밋 응답은 offsets 토픽의 모든 replica가 받거나 `offsets.commit.timeout.ms`가 지날 때까지 미뤄진다.
- Facts: key type prefix = 1 (`OffsetCommitKey` apiKey); value version written = 4 (1 only if expireTimestamp is set); `__consumer_offsets` `cleanup.policy` = `compact`; `offsets.commit.timeout.ms` = 5000; `offsets.retention.minutes` = 10080.
- Event log: `Broker 2 → __consumer_offsets-17 · Storage · OffsetCommit record · ~60 B (E.G.)`
- State: `(order-svc, orders, 0) → 1100` → `→ 1237 (E.G.)`
- Decoder: **OffsetCommitKey / OffsetCommitValue v4** (see Decoder records)
- Sources: [G20], [G21], [G22], [G3], [G26]

**S12 · mutate · `c1` · Client**
- Title: 커밋 시점이 전달 의미를 정한다
- Subtitle: 처리 후 커밋 = at-least-once, 커밋 후 처리 = at-most-once.
- Prose: 읽고 커밋한 뒤 처리하다 죽으면, 새 consumer는 커밋 위치부터 읽으므로 일부 메시지가 처리되지 않는다(at-most-once). 읽고 처리한 뒤 커밋 전에 죽으면 같은 메시지를 다시 처리한다(at-least-once). Kafka의 기본은 at-least-once다. 외부 시스템에 대한 exactly-once는 offset을 출력과 같은 곳에 저장해야 한다.
- Facts: commit-then-process = at-most-once; process-then-commit = at-least-once; default guarantee = at-least-once.
- Event log: `Consumer A · Client · crash after process, before commit → reprocess 1237..1240 (E.G.) · —`
- Sources: [G23]

**S13 · mutate · `coord` · Broker**
- Title: `max.poll.interval.ms` 초과
- Subtitle: heartbeat는 살아 있어도, poll이 멈추면 group에서 빠진다.
- Prose: `poll()` 사이 간격이 `max.poll.interval.ms`를 넘으면, consumer는 처리가 멈춘 것으로 보고 group을 떠난다. 그러면 rebalance가 일어난다. heartbeat는 따로 돌기 때문에, `session.timeout.ms`는 프로세스 장애를 잡고 `max.poll.interval.ms`는 처리 정지를 잡는다. `max.poll.records`를 줄이면 poll 간격이 짧아진다.
- Facts: `max.poll.interval.ms` = 300000; `max.poll.records` = 500; poll timeout → "consumer is considered failed and the group will rebalance"; static member (`group.instance.id`) hitting it → partitions move only after the session timeout.
- Event log: `Broker 2 · Broker · member A left (poll timeout) → rebalance (E.G.) · —`
- State: `A STABLE [p0,p1]` → `A removed; B target [p0..p3]`
- Sources: [G6], [G25]

**S14 · mutate · `c1` · Client**
- Title: static membership
- Subtitle: `group.instance.id`로 재시작해도 rebalance가 일어나지 않게 한다.
- Prose: 보통 멤버 id는 재시작하면 바뀌어 배포 때마다 rebalance가 난다. `group.instance.id`를 인스턴스마다 고유하게 주면 멤버십이 유지되어 rebalance가 일어나지 않는다. 같은 id가 중복되면 브로커가 `FencedInstanceIdException`으로 한쪽을 종료시킨다.
- Facts: config = `group.instance.id`; duplicate → `FencedInstanceIdException`; consumer protocol heartbeat: `MemberEpoch=-2` = static member will rejoin.
- Event log: `Consumer A · Client · restart with group.instance.id=a-1 (E.G.) · no rebalance`
- Sources: [G24], [G11]

### Decoder records

1. **OffsetCommitKey + OffsetCommitValue v4** (S11). See "Decoder: offset commit record".
2. **ConsumerGroupHeartbeatRequest v1** (S7): field list from the schema, all fields flexible (`0+`). Byte layout not computed; show the field table only (each `string` is COMPACT_STRING, arrays COMPACT_ARRAY, trailing tagged-field count).

### Sources

| id | What | URL |
|---|---|---|
| G1 | Consumer position, one consumer per partition per group | `K/docs/design/design.md#L149-L159` |
| G2 | Coordinator partition hash | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorService.java#L463` |
| G3 | Group coordinator defaults | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorConfig.java#L114-L228` |
| G4 | `JoinGroup`/`SyncGroup`/`FindCoordinator` API keys | `K/clients/src/main/resources/common/message/JoinGroupRequest.json#L17`, `.../SyncGroupRequest.json#L17`, `.../FindCoordinatorRequest.json#L17` |
| G5 | JoinGroup response leader → `onLeaderElected` | `K/clients/src/main/java/org/apache/kafka/clients/consumer/internals/AbstractCoordinator.java#L678-L681` and `#L772`; `K/clients/src/main/resources/common/message/JoinGroupResponse.json#L52-L57` |
| G6 | Consumer defaults | `K/clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerConfig.java#L467-L497` and `#L652-L692`, `#L100`, `#L121` |
| G7 | Assignment computed by leader | `K/clients/src/main/java/org/apache/kafka/clients/consumer/internals/ConsumerCoordinator.java#L655` |
| G8 | `partition.assignment.strategy` default | `K/clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerConfig.java#L477-L480` |
| G9 | EAGER vs COOPERATIVE in `onJoinPrepare` | `K/clients/src/main/java/org/apache/kafka/clients/consumer/internals/ConsumerCoordinator.java#L826-L850` |
| G10 | COOPERATIVE revoke owned − assigned, rejoin | `K/clients/src/main/java/org/apache/kafka/clients/consumer/internals/ConsumerCoordinator.java#L418-L452` |
| G11 | `ConsumerGroupHeartbeatRequest` | `K/clients/src/main/resources/common/message/ConsumerGroupHeartbeatRequest.json#L16-L51` |
| G12 | Consumer rebalance protocol doc (GA 4.0, server configs, assignors, limits, timeline) | `K/docs/operations/consumer-rebalance-protocol.md#L29-L105` |
| G13 | `group.protocol` default `classic` | `K/clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerConfig.java#L121` |
| G14 | Server heartbeat/session defaults | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorConfig.java#L189-L205` |
| G15 | Built-in assignors `uniform`, `range` | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorConfig.java#L219-L230` |
| G16 | Group epoch bump on subscription change | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupMetadataManager.java#L2821-L2823` |
| G17 | `CurrentAssignmentBuilder.build` state machine | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/modern/consumer/CurrentAssignmentBuilder.java#L186-L240` |
| G18 | Member states | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/modern/MemberState.java#L32-L45` |
| G19 | `OffsetCommitRequest` | `K/clients/src/main/resources/common/message/OffsetCommitRequest.json#L16-L74` |
| G20 | `OffsetCommitKey`, `OffsetCommitValue` | `K/group-coordinator/src/main/resources/common/message/OffsetCommitKey.json#L16-L30`, `K/group-coordinator/src/main/resources/common/message/OffsetCommitValue.json#L16-L39` |
| G21 | Value version 4 (or 1) chosen | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorRecordHelpers.java#L470-L503` |
| G22 | Key type-prefix and value version-prefix serialization | `K/coordinator-common/src/main/java/org/apache/kafka/coordinator/common/runtime/CoordinatorRecordSerde.java#L44-L62`, `K/clients/src/main/java/org/apache/kafka/common/protocol/MessageUtil.java#L232-L267` |
| G23 | Delivery semantics on the consumer side | `K/docs/design/design.md#L197-L207` |
| G24 | Static membership | `K/docs/design/design.md#L167-L177` |
| G26 | Offsets topic configs (`compact`); `offsets.commit.timeout.ms` doc | `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorService.java#L2957-L2962`, `K/group-coordinator/src/main/java/org/apache/kafka/coordinator/group/GroupCoordinatorConfig.java#L115-L116` |
| G25 | `max.poll.interval.ms` and `session.timeout.ms` docs | `K/clients/src/main/java/org/apache/kafka/clients/CommonClientConfigs.java#L203-L209` and `#L225-L229` |

### Self-check

1. group coordinator는 어떻게 정해지나? → `abs(groupId.hashCode()) % 50` 번 `__consumer_offsets` 파티션의 leader 브로커.
2. eager와 cooperative의 차이는? → eager는 rebalance 전에 전부 revoke한다. cooperative는 옮길 파티션만 revoke하고 한 번 더 rebalance한다.
3. KIP-848 프로토콜에서 할당은 누가 계산하나? 4.4.0 기본 프로토콜은? → 브로커(서버 assignor, 기본 `uniform`). `KafkaConsumer`의 기본은 아직 `classic`이고, `group.protocol=consumer`로 켠다.
4. KIP-848 reconciliation의 멤버 상태 세 가지는? → `STABLE`, `UNREVOKED_PARTITIONS`, `UNRELEASED_PARTITIONS`.
5. 커밋된 offset은 어떤 레코드인가? → key (type 1, group, topic, partition), value v4 (offset, leaderEpoch, metadata, commitTimestamp, tagged topicId). compacted 토픽 `__consumer_offsets`에 저장된다.
6. at-least-once가 되는 커밋 순서는? → 처리한 뒤 커밋.
7. `max.poll.interval.ms` 기본값과 초과 시 동작은? → 300000 ms. 멤버가 group을 떠나 rebalance가 일어난다.

---

## Lesson 5 · `transactions`: consume-process-produce를 정확히 한 번

### Goal

`transactional.id`를 가진 producer가 여러 파티션 쓰기와 consumer offset 커밋을 원자적으로 묶고, `read_committed` consumer가 abort된 레코드를 건너뛰는 과정을 본다.

Interview questions it answers:
- Kafka의 exactly-once는 정확히 어디서 어디까지인가?
- transaction coordinator는 무엇을 저장하고, commit은 어떤 단계로 진행되나?
- zombie producer는 어떻게 fencing되나? KIP-890(transaction v2)은 무엇을 바꿨나?
- `read_committed` consumer는 무엇을 기준으로 읽기를 멈추나?

### Nodes

| id | Label | Kind | Illustration idea | Appears at |
|---|---|---|---|---|
| `app` | Copier app | `app` | Laptop with consume→produce arrows | S1 |
| `txcoord` | Transaction coordinator (Broker 3) | `framework` | Server tower with a ledger and a gavel | S2 |
| `txlog` | `__transaction_state-k` | `storage` | Cylinder with a ledger icon | S3 |
| `out0` | `payments-0` leader | `storage` | Log strip | S5 |
| `out1` | `payments-1` leader | `storage` | Log strip | S5 |
| `gcoord` | Group coordinator | `framework` | Server tower with roster badge (same art as lesson 4) | S7 |
| `rc` | read_committed consumer | `client` | Laptop with a filter icon | S11 |

Node-state panels: `txcoord` (table: transactionalId, producerId, epoch, state, partitions), `out0` (list of batches with txn flag and markers), `rc` (table: LSO, aborted list).

### Steps

**S1 · mutate · `app` · Client**
- Title: 세 가지 조건
- Subtitle: 단독 소유 파티션, 원자적 쓰기+offset, consumer 하나당 producer 하나.
- Prose: Kafka에서 transactional한 것은 producer뿐이다. 다만 producer가 consumer 위치(committed offset)도 transaction 안에서 갱신할 수 있다. exactly-once 처리에는 세 가지가 필요하다. 파티션 할당으로 group 안에서 혼자 처리하기, 출력과 offset을 transaction으로 원자적으로 쓰기, consumer 인스턴스마다 producer 하나 두기다.
- Facts: consumer config = `isolation.level=read_committed`, `enable.auto.commit=false`; producer config = `transactional.id`; `transaction.timeout.ms` = 60000.
- Event log: `Copier · Client · new KafkaProducer(transactional.id=copier-0) (E.G.) · —`
- Sources: [T1], [T2]

**S2 · move · `app → txcoord` · Network**
- Title: FindCoordinator(TRANSACTION)
- Subtitle: `abs(transactionalId.hashCode) % 50` 번 `__transaction_state` 파티션의 leader.
- Prose: transactional producer는 `FindCoordinator`를 TRANSACTION 타입으로 보낸다. coordinator는 `Utils.abs(transactionalId.hashCode) % transaction.state.log.num.partitions` 번 `__transaction_state` 파티션의 leader다. group coordinator와 같은 방식으로 정해진다.
- Facts: partition = `abs(transactionalId.hashCode) % 50`; `transaction.state.log.num.partitions` = 50; `transaction.state.log.replication.factor` = 3; `transaction.state.log.min.isr` = 2.
- Event log: `Copier → Broker 3 · Network · FindCoordinator(TRANSACTION, copier-0) → node 3 (E.G.) · —`
- Sources: [T3], [T4], [T5]

**S3 · mutate · `txcoord` · Broker**
- Title: InitProducerId와 epoch fencing
- Subtitle: 같은 `transactional.id`의 이전 인스턴스는 epoch가 올라가며 막힌다.
- Prose: `initTransactions()`는 `InitProducerId`(API key 22)를 보낸다. coordinator는 이 `transactional.id`의 producerId를 돌려주고 epoch를 올린다. 이전 인스턴스가 열어 둔 transaction이 있으면 abort한다. 옛 epoch로 오는 요청은 거절되므로 zombie producer가 막힌다.
- Facts: `InitProducerId` API key = 22; restarted app → in-flight txn of previous instance aborted; `transaction.max.timeout.ms` = 900000; `transactional.id.expiration.ms` = 604800000.
- Event log: `Copier → Broker 3 · Network · InitProducerId(copier-0) → pid 7001 epoch 4 (E.G.) · —`
- State: `copier-0 | pid 7001 | epoch 3 | COMPLETE_COMMIT` → `epoch 4 | EMPTY (E.G.)`
- Sources: [T2], [T6], [T7]

**S4 · mutate · `txcoord` · Broker**
- Title: beginTransaction은 로컬 상태 변경
- Subtitle: 클라이언트 상태만 `READY → IN_TRANSACTION`, 요청은 없다.
- Prose: `beginTransaction()`은 클라이언트의 `TransactionManager` 상태만 `IN_TRANSACTION`으로 바꾼다. coordinator가 transaction을 알게 되는 것은 첫 파티션이 추가될 때다. 클라이언트 상태는 `UNINITIALIZED`, `INITIALIZING`, `READY`, `IN_TRANSACTION`, `COMMITTING_TRANSACTION`, `ABORTING_TRANSACTION`, `ABORTABLE_ERROR`, `FATAL_ERROR` 등이다.
- Facts: client transition = `READY → IN_TRANSACTION`; `beginTransaction()` only checks state and calls `transitionTo` (enqueues no request); coordinator states = `EMPTY(0) ONGOING(1) PREPARE_COMMIT(2) PREPARE_ABORT(3) COMPLETE_COMMIT(4) COMPLETE_ABORT(5) DEAD(6) PREPARE_EPOCH_FENCE(7)`.
- Event log: `Copier · Client · beginTransaction() · —`
- State: `client: READY` → `client: IN_TRANSACTION`
- Sources: [T8], [T9]

**S5 · move · `app → out0` · Network**
- Title: transactional produce (TV2: 파티션 추가 포함)
- Subtitle: transaction v2에서는 Produce 요청이 AddPartitionsToTxn 역할을 겸한다.
- Prose: 레코드는 `isTransactional` 비트가 켜진 batch로 각 파티션 leader에 간다. transaction v1에서는 클라이언트가 먼저 `AddPartitionsToTxn`을 보낸다. 4.0부터 서버 기본인 transaction v2에서는 Produce 요청이 그 역할을 함께 한다. 서버는 첫 append 때 coordinator에 검증을 요청해, coordinator가 모르는 transactional 레코드가 쓰이지 않게 막는다.
- Facts: batch attribute bit 4 = `isTransactional`; `transaction.version=2` enabled by default on server since 4.0; ProduceRequest v12 = includes AddPartitionsToTxn function under TV2; `transaction.partition.verification.enable` = true.
- Event log: `Copier → Broker 1 · Network · Produce txn pid=7001 e=4 payments-0 · 4 KiB (E.G.)`
- State (`out0`): `[… committed batches]` → `[…, txn batch pid 7001 (open)]`
- Sources: [T10], [T11], [T12], [T13]

**S6 · mutate · `txlog` · Storage**
- Title: coordinator가 ONGOING을 기록
- Subtitle: 파티션 목록과 상태가 `__transaction_state`에 레코드로 남는다.
- Prose: coordinator는 transaction에 들어온 파티션들과 상태 `ONGOING`을 `TransactionLogValue`로 `__transaction_state`에 쓴다. 이 레코드가 coordinator의 단일 진실 원천이다. coordinator가 바뀌면 새 coordinator가 이 로그를 읽어 상태를 복원한다.
- Facts: record = `TransactionLogValue` v1 (ProducerId, ProducerEpoch, TransactionTimeoutMs, TransactionStatus, TransactionPartitions, timestamps, tagged ClientTransactionVersion); `transaction.state.log.segment.bytes` = 104857600.
- Event log: `Broker 3 → __transaction_state · Storage · copier-0 ONGOING [payments-0, payments-1] · ~100 B (E.G.)`
- State: `copier-0 EMPTY []` → `copier-0 ONGOING [payments-0, payments-1]`
- Sources: [T14], [T4]

**S7 · move · `app → gcoord` · Network**
- Title: sendOffsetsToTransaction
- Subtitle: consumer offset도 같은 transaction에 넣는다.
- Prose: producer는 consumer group의 offset을 `TxnOffsetCommit`(API key 28)으로 group coordinator에 보낸다. transaction v1에서는 그 전에 transaction coordinator에 `AddOffsetsToTxn`(API key 25)을 보낸다. v2에서는 이 단계를 건너뛴다. 이 offset은 transaction이 commit될 때까지 확정되지 않는다.
- Facts: `TxnOffsetCommit` API key = 28; `AddOffsetsToTxn` API key = 25 (skipped in TV2); offsets become visible only on commit (**unverified** at code level; stated in design doc as atomic with output).
- Event log: `Copier → Broker 2 · Network · TxnOffsetCommit(order-svc, orders-0=1240) (E.G.) · ~90 B (E.G.)`
- Sources: [T15], [T16], [T1]

**S8 · move · `app → txcoord` · Network**
- Title: commitTransaction → EndTxn
- Subtitle: coordinator가 PREPARE_COMMIT을 먼저 로그에 쓴다.
- Prose: `commitTransaction()`은 accumulator를 flush하고 `EndTxn`(API key 26, committed=true)을 보낸다. coordinator는 상태를 `PREPARE_COMMIT`으로 `__transaction_state`에 쓴다. 이 쓰기가 끝나면 결과가 정해진 것이다. 이후 과정은 coordinator가 비동기로 마무리한다.
- Facts: `EndTxn` API key = 26; ONGOING → PREPARE_COMMIT → COMPLETE_COMMIT; TV2: producer epoch bumped on every transaction.
- Event log: `Copier → Broker 3 · Network · EndTxn(copier-0, commit) · —`
- State: `ONGOING` → `PREPARE_COMMIT`
- Sources: [T17], [T11], [T9]

**S9 · move · `txcoord → out0` · Network**
- Title: WriteTxnMarkers: COMMIT 마커
- Subtitle: 각 파티션 leader에 control batch(COMMIT)를 쓴다.
- Prose: coordinator는 transaction에 든 모든 파티션의 leader에 `WriteTxnMarkers`(API key 27)를 보낸다. 각 leader는 control record(type 1 = COMMIT, 0 = ABORT) 하나가 든 control batch를 로그에 쓴다. control record는 애플리케이션에 전달되지 않는다. consumer는 이것으로 transaction의 결과를 안다.
- Facts: `WriteTxnMarkers` API key = 27; control record key = `version:int16=0, type:int16`; type 0 = ABORT, 1 = COMMIT; batch attribute bit 5 = `isControlBatch`.
- Event log: `Broker 3 → Broker 1 · Network · WriteTxnMarkers COMMIT pid=7001 payments-0 · —`
- State (`out0`): `[…, txn batch pid 7001 (open)]` → `[…, txn batch pid 7001, COMMIT marker]`
- Decoder: **control record** (see Decoder records)
- Sources: [T18], [T19], [T10]

**S10 · mutate · `txlog` · Storage**
- Title: COMPLETE_COMMIT
- Subtitle: 마커가 모두 쓰이면 coordinator가 완료를 기록한다.
- Prose: 모든 마커가 쓰이면 coordinator는 `COMPLETE_COMMIT`을 기록하고, `transactional.id`는 다음 transaction을 받을 수 있다. TV2에서는 `CONCURRENT_TRANSACTIONS`를 서버 쪽에서 몇 번 재시도한다. 그래서 그 시간이 클라이언트 backoff가 아니라 produce 지연으로 보인다.
- Facts: final state = `COMPLETE_COMMIT(4)`; TV2 server-side retry configs = `add.partitions.to.txn.retry.backoff.ms`, `add.partitions.to.txn.retry.backoff.max.ms`; old client retry backoff for this case = 20 ms.
- Event log: `Broker 3 → __transaction_state · Storage · copier-0 COMPLETE_COMMIT · ~80 B (E.G.)`
- State: `PREPARE_COMMIT` → `COMPLETE_COMMIT`
- Sources: [T9], [T11]

**S11 · mutate · `rc` · Client**
- Title: LSO와 read_committed
- Subtitle: `read_committed`는 LSO까지만, abort된 레코드는 건너뛴다.
- Prose: LSO(last stable offset)는 그 아래 offset이 모두 "결정된" 첫 offset이다. 진행 중인 transaction의 첫 offset이 HW보다 작으면 그 offset이 LSO고, 아니면 HW다. `read_committed` fetch는 LSO까지만 읽는다. 응답의 `AbortedTransactions`(producerId, firstOffset)와 `.txnindex`로 abort된 batch를 걸러 낸다.
- Facts: LSO = min(first unstable offset, HW); `isolation.level` default = `read_uncommitted`; FetchResponse fields = `LastStableOffset`, `AbortedTransactions[ProducerId, FirstOffset]`; aborted ranges stored per segment in `.txnindex`.
- Event log: `Broker 1 → RC consumer · Network · FetchResponse LSO=5100 aborted=[pid 6900@5020] (E.G.) · 64 KiB (E.G.)`
- State: `LSO 5040 (txn open)` → `LSO 5100 (committed) (E.G.)`
- Sources: [T20], [T21], [T22], [T23]

**S12 · mutate · `app` · Client**
- Title: abort와 재처리
- Subtitle: abort되면 offset을 직접 되감아야 한다.
- Prose: abort되면 ABORT 마커가 쓰이고 출력은 `read_committed` consumer에게 보이지 않는다. 저장된 consumer offset도 이전 값으로 남는다. 하지만 consumer의 메모리 위치는 자동으로 되감기지 않는다. 그래서 committed offset을 다시 읽어 `seek()`하거나, producer와 consumer를 다시 만들어야 한다.
- Facts: abortable errors → app must abort and reset position; simple policy = recreate producer and consumer; advanced = `committed()` + `seek()`.
- Event log: `Copier · Client · abortTransaction(); seek(orders-0, 1237) (E.G.) · —`
- State: `position 1240` → `position 1237 (E.G.)`
- Sources: [T1], [T24]

### Decoder records

1. **Record batch v2 with transactional bit** (S5): attributes `0x0010` (bit 4), `producerId`/`producerEpoch` set. Reuse lesson 1 layout.
2. **Control batch (COMMIT marker)** (S9): attributes `0x0030` (bits 4 and 5); one record whose key is `00 00 00 01` (version 0, type 1) and whose value is the version-prefixed `EndTxnMarker` (`CoordinatorEpoch`).
3. **TransactionLogValue v1** (S6, S8, S10): field table only.

### Sources

| id | What | URL |
|---|---|---|
| T1 | Using transactions: three aspects, configs, abort handling | `K/docs/design/design.md#L209-L244` |
| T2 | Producer `transaction.timeout.ms` | `K/clients/src/main/java/org/apache/kafka/clients/producer/ProducerConfig.java#L579-L582` |
| T3 | Transaction coordinator partition | `K/core/src/main/scala/kafka/coordinator/transaction/TransactionStateManager.scala#L439` |
| T4 | `__transaction_state` defaults | `K/transaction-coordinator/src/main/java/org/apache/kafka/coordinator/transaction/TransactionLogConfig.java#L32-L62` |
| T5 | Transactional `FindCoordinator` type | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/TransactionManager.java#L1537-L1544` |
| T6 | Transaction timeouts and expiration | `K/transaction-coordinator/src/main/java/org/apache/kafka/coordinator/transaction/TransactionStateManagerConfig.java#L33-L39` |
| T7 | `InitProducerId` handling, epoch fence | `K/core/src/main/scala/kafka/coordinator/transaction/TransactionCoordinator.scala#L118-L290` |
| T8 | Client `TransactionManager` states | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/TransactionManager.java#L157-L166` and `#L356-L361` |
| T9 | Coordinator `TransactionState` | `K/transaction-coordinator/src/main/java/org/apache/kafka/coordinator/transaction/TransactionState.java#L39-L82` |
| T10 | Batch attributes, control batches | `K/docs/implementation/message-format.md#L41-L52` and `#L73-L131` |
| T11 | Transaction protocol v2 (KIP-890) doc | `K/docs/operations/transaction-protocol.md#L29-L53` |
| T12 | ProduceRequest v12 note on TV2 | `K/clients/src/main/resources/common/message/ProduceRequest.json#L45-L48` |
| T13 | Verification guard comment, `transaction.partition.verification.enable` | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/UnifiedLog.java#L1423-L1433`; `K/transaction-coordinator/src/main/java/org/apache/kafka/coordinator/transaction/TransactionLogConfig.java#L53` |
| T14 | `TransactionLogValue` | `K/transaction-coordinator/src/main/resources/common/message/TransactionLogValue.json#L16-L53` |
| T15 | TV2 skips `AddOffsetsToTxn` | `K/clients/src/main/java/org/apache/kafka/clients/producer/internals/TransactionManager.java#L441-L460` |
| T16 | API keys 25, 28 | `K/clients/src/main/resources/common/message/AddOffsetsToTxnRequest.json#L17`, `K/clients/src/main/resources/common/message/TxnOffsetCommitRequest.json#L17` |
| T17 | `handleEndTransaction` | `K/core/src/main/scala/kafka/coordinator/transaction/TransactionCoordinator.scala#L516-L708` |
| T18 | `WriteTxnMarkers` API key | `K/clients/src/main/resources/common/message/WriteTxnMarkersRequest.json#L17` |
| T19 | `EndTxn` API key | `K/clients/src/main/resources/common/message/EndTxnRequest.json#L17` |
| T20 | LSO definition | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/UnifiedLog.java#L672-L686` |
| T21 | `FetchResponse` `LastStableOffset`, `AbortedTransactions` | `K/clients/src/main/resources/common/message/FetchResponse.json#L75` and `#L102-L108` |
| T22 | `TransactionIndex` | `K/storage/src/main/java/org/apache/kafka/storage/internals/log/TransactionIndex.java#L38-L55` |
| T23 | `isolation.level` default | `K/clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerConfig.java#L382` |
| T24 | Exception categories | `K/docs/design/design.md#L231-L238` |

### Self-check

1. exactly-once에 필요한 클라이언트 설정 세 가지는? → producer `transactional.id`, consumer `isolation.level=read_committed`, `enable.auto.commit=false`.
2. transaction coordinator는 어떻게 정해지나? → `abs(transactionalId.hashCode) % 50` 번 `__transaction_state` 파티션의 leader.
3. commit의 서버 쪽 단계는? → PREPARE_COMMIT 기록 → 각 파티션에 COMMIT 마커(WriteTxnMarkers) → COMPLETE_COMMIT 기록.
4. zombie producer fencing 원리는? → `InitProducerId`가 epoch를 올리고, 옛 epoch 요청은 거절된다. TV2에서는 transaction마다 epoch가 오른다.
5. LSO는? → 진행 중인 transaction의 첫 offset과 HW 중 작은 값. `read_committed`의 읽기 상한이다.
6. abort 후 consumer가 해야 할 일은? → 위치를 committed offset으로 되감는다(`seek`), 또는 consumer/producer를 다시 만든다.

---

## Lesson 6 · `kraft-metadata`: 클러스터 metadata는 Raft 로그다

### Goal

ZooKeeper 없이 controller quorum이 `__cluster_metadata` 로그 하나에 클러스터 상태를 기록하고, broker가 그 로그를 따라 읽어 상태를 맞추는 방식을 본다. 예로 broker heartbeat로 fencing하는 과정과 ISR 변경을 쓴다.

Interview questions it answers:
- KRaft에서 controller는 몇 대가 필요하고, 몇 대 장애를 견디나?
- metadata는 어디에 어떤 형식으로 저장되나? broker는 metadata를 어떻게 받나?
- broker가 죽은 것을 controller는 어떻게 알고, 그 파티션은 어떻게 되나?
- KRaft의 Raft는 일반 Raft와 무엇이 다른가?

### Nodes

| id | Label | Kind | Illustration idea | Appears at |
|---|---|---|---|---|
| `c1` | Controller 1 (active) | `framework` | Control tower with a lit beacon | S1 |
| `c2` | Controller 2 | `framework` | Control tower, beacon off | S1 |
| `c3` | Controller 3 | `framework` | Control tower, beacon off | S1 |
| `mlog` | `__cluster_metadata-0` | `storage` | Long scroll with numbered records and a snapshot bookmark | S3 |
| `b1` | Broker 1 | `container` | Server tower | S5 |
| `b2` | Broker 2 | `container` | Server tower | S5 |

Node-state panels: `c1` (table: voter, role, epoch, LEO), `mlog` (list of records with offset), `b1` (table: brokerId, fenced, brokerEpoch).

### Steps

**S1 · mutate · `c1` · Controller**
- Title: controller quorum
- Subtitle: `process.roles=controller` 노드 3대, 과반수가 살아 있어야 한다.
- Prose: KRaft에서는 `process.roles`로 각 서버를 `broker`, `controller` 또는 둘 다로 지정한다. controller들이 metadata quorum을 이루고, 그중 하나가 active이고 나머지는 hot standby다. N대의 장애를 견디려면 2N+1대가 필요하다. 운영 환경에서는 combined mode를 피한다.
- Facts: 3 controllers tolerate 1 failure, 5 tolerate 2; `process.roles` ∈ {`broker`, `controller`, `broker,controller`}; discovery = `controller.quorum.bootstrap.servers` (`controller.quorum.voters` deprecated with KRaft version 1); sizing guide = 5 GB RAM + 5 GB disk for metadata.
- Event log: `Controller 1 · Controller · start, voters [1,2,3] (E.G.) · —`
- State: `all voters: Unattached` → `all voters: Follower (no leader yet)`
- Sources: [K1], [K2]

**S2 · move · `c2 → c1` · Controller**
- Title: Vote: active controller 선출
- Subtitle: election timeout이 지나면 candidate가 Vote를 보낸다.
- Prose: leader 선출은 거의 순수한 Raft다. election timeout이 만료된 voter가 candidate가 되어, 자기 로그의 마지막 offset을 담은 `Vote`를 보낸다. v2부터는 `PreVote` 플래그가 있다. 과반을 얻으면 leader가 되고, `BeginQuorumEpoch`로 새 epoch를 알린다. 이 leader가 active controller다.
- Facts: `controller.quorum.election.timeout.ms` = 1000; `controller.quorum.election.backoff.max.ms` = 1000; `Vote` API key = 52 (v2 adds `PreVote`); `BeginQuorumEpoch` asserts leadership because replication is fetch-driven.
- Event log: `Controller 1 → Controller 2,3 · Controller · Vote epoch=5 lastOffset=7228 (E.G.) · —`
- State: `C1 Follower e4` → `C1 Leader e5 (E.G.)`
- Sources: [K3], [K4], [K5]

**S3 · mutate · `mlog` · Storage**
- Title: metadata는 `__cluster_metadata` 로그
- Subtitle: 토픽, 파티션, broker 등록, 설정, ACL이 모두 레코드다.
- Prose: active controller는 상태 변경을 `__cluster_metadata` 파티션 0에 metadata 레코드로 append한다. 예로 `TopicRecord`, `PartitionRecord`, `PartitionChangeRecord`, `RegisterBrokerRecord`, `FenceBrokerRecord`, `ConfigRecord`, `ProducerIdsRecord`가 있다. 레코드는 frame version, apiKey, version을 unsigned varint로 앞에 붙여 직렬화된다. 다른 voter는 Fetch로 이 로그를 복제한다.
- Facts: topic = `__cluster_metadata-0`; record frame = `uvarint frameVersion(1) + uvarint apiKey + uvarint version + message`; `PartitionChangeRecord` apiKey = 5; `controller.quorum.append.linger.ms` = 25.
- Event log: `Controller 1 → __cluster_metadata · Storage · append TopicRecord(orders) (E.G.) · ~40 B (E.G.)`
- State: `[…7228]` → `[…7228, 7229 TopicRecord, 7230 PartitionRecord×3] (E.G.)`
- Decoder: **PartitionChangeRecord v2** (see Decoder records)
- Sources: [K6], [K7], [K8], [K4]

**S4 · move · `c2 → c1` · Controller**
- Title: voter fetch와 commit
- Subtitle: 복제는 push가 아니라 follower fetch로 진행된다.
- Prose: KRaft의 복제는 Kafka의 일반 Fetch API로 follower가 당겨 가는 방식이다. 응답에는 현재 leader와 epoch가 함께 실리고, 로그가 갈라진 지점도 이 응답으로 알린다. follower의 LEO가 leader의 log start offset보다 작으면 `FetchSnapshot`으로 snapshot을 받는다. 과반이 복제한 offset까지가 committed다.
- Facts: replication = fetch-driven; `controller.quorum.fetch.timeout.ms` = 2000; snapshot transfer = `FetchSnapshot` (API key 59); voters vs observers: only voters vote.
- Event log: `Controller 2 → Controller 1 · Controller · Fetch __cluster_metadata offset=7229 (E.G.) · —`
- Sources: [K5], [K4]

**S5 · move · `b1 → c1` · Controller**
- Title: broker 등록과 heartbeat
- Subtitle: broker는 controller와 세션을 유지해야 살아 있는 것이다.
- Prose: broker는 시작할 때 `BrokerRegistration`(API key 62)으로 등록하고 broker epoch를 받는다. 이후 `broker.heartbeat.interval.ms`마다 `BrokerHeartbeat`(API key 63)를 보낸다. broker는 observer로서 `__cluster_metadata`를 fetch해 metadata를 따라간다. 따라잡으면 unfence되어 leader를 맡을 수 있다.
- Facts: `broker.heartbeat.interval.ms` = 2000; `broker.session.timeout.ms` = 9000; `initial.broker.registration.timeout.ms` = 60000; brokers = observers (do not vote).
- Event log: `Broker 1 → Controller 1 · Controller · BrokerHeartbeat id=1 epoch=210 (E.G.) · —`
- State: `B1 fenced=true` → `B1 fenced=false (UnfenceBrokerRecord) (E.G.)`
- Sources: [K9], [K10], [K11], [K5]

**S6 · mutate · `c1` · Controller**
- Title: heartbeat 끊김 → fence
- Subtitle: `broker.session.timeout.ms` 동안 heartbeat가 없으면 offline이다.
- Prose: controller가 `broker.session.timeout.ms` 안에 B2의 heartbeat를 받지 못하면 B2를 offline으로 본다. 그러면 `FenceBrokerRecord`를 쓰고, B2가 leader이던 파티션마다 새 leader를 ISR에서 골라 `PartitionChangeRecord`를 쓴다. 여러 파티션의 변경을 한 번에 처리한다.
- Facts: session timeout = 9000 ms; controller handles fencing via `handleBrokerFenced`; per-partition change = `PartitionChangeRecord(Leader=…, Isr=…)`.
- Event log: `Controller 1 → __cluster_metadata · Controller · FenceBrokerRecord id=2; PartitionChangeRecord×N (E.G.) · —`
- State: `B2 fenced=false` → `B2 fenced=true`
- Sources: [K12], [K13], [R13]

**S7 · move · `c1 → b1` · Controller**
- Title: broker가 변경을 적용
- Subtitle: broker는 metadata 로그를 읽어 자기 파티션 역할을 바꾼다.
- Prose: B1은 fetch로 `PartitionChangeRecord`를 받아, 자기가 새 leader가 된 파티션의 leader 역할을 시작한다. metadata 변경이 없을 때도 controller는 `metadata.max.idle.interval.ms`마다 `NoOpRecord`를 써서 로그를 진행시킨다.
- Facts: `metadata.max.idle.interval.ms` = 500; `PartitionChangeRecord.Leader`: -1 = no leader, -2 = unchanged; `Isr` null = unchanged.
- Event log: `Controller 1 → Broker 1 · Controller · Fetch response: PartitionChangeRecord orders-0 leader=1 (E.G.) · —`
- State: `B1 orders-0: follower` → `B1 orders-0: leader (E.G.)`
- Sources: [K8], [K14]

**S8 · mutate · `mlog` · Storage**
- Title: snapshot
- Subtitle: 로그가 커지면 상태를 snapshot으로 접는다.
- Prose: 새 레코드가 `metadata.log.max.record.bytes.between.snapshots`만큼 쌓이거나, `metadata.log.max.snapshot.interval.ms`가 지나면 snapshot을 만든다. snapshot 파일 이름은 `<offset>-<epoch>.checkpoint`다. `kafka-metadata-shell.sh`로 snapshot 안의 `/topics/<name>/<p>/data`를 볼 수 있다.
- Facts: `metadata.log.max.snapshot.interval.ms` = 3600000; snapshot file = `00000000000000007228-0000000001.checkpoint`-style; metadata log segment = 1 GiB, retention 100 MiB / 7 days.
- Event log: `Controller 1 · Storage · snapshot @7228 epoch 1 (E.G.) · —`
- State: `[0..7228 records]` → `[snapshot 7228-1] + [7229..]`
- Sources: [K15], [K16]

**S9 · mutate · `c1` · Controller**
- Title: producerId 블록 할당
- Subtitle: idempotent producer의 producerId도 controller가 1000개씩 나눠 준다.
- Prose: lesson 1의 `InitProducerId`에 답하는 broker는 controller에게서 producerId 블록을 받아 쓴다. controller는 블록 할당을 `ProducerIdsRecord`로 metadata 로그에 남긴다. 그래서 failover 뒤에도 같은 ID를 다시 나눠 주지 않는다.
- Facts: block size = 1000 (`PRODUCER_ID_BLOCK_SIZE`); record = `ProducerIdsRecord`; allocation via `ProducerIdControlManager`.
- Event log: `Broker 1 → Controller 1 · Controller · AllocateProducerIds → [7000..7999] (E.G.) · —`
- State: `next block start 7000` → `8000 (E.G.)`
- Sources: [K17]

### Decoder records

1. **PartitionChangeRecord v2** (S3, S6, S7): see "Decoder: PartitionChangeRecord".
2. **PartitionRecord** (S3): field table (`PartitionId`, `TopicId`, `Replicas`, `Isr`, `RemovingReplicas`, `AddingReplicas`, `Leader`, `LeaderRecoveryState`, `LeaderEpoch`, `PartitionEpoch`, `Directories`, `EligibleLeaderReplicas`, `LastKnownElr`), with the metadata-shell JSON from the docs as the example view.

### Sources

| id | What | URL |
|---|---|---|
| K1 | `process.roles`, quorum size | `K/docs/operations/kraft.md#L33-L49` |
| K2 | Deploying considerations (2N+1, combined mode, sizing) | `K/docs/operations/kraft.md#L318-L322` |
| K3 | `controller.quorum.*` defaults | `K/raft/src/main/java/org/apache/kafka/raft/QuorumConfig.java#L74-L118` |
| K4 | Vote `PreVote`; API keys | `K/clients/src/main/resources/common/message/VoteRequest.json#L17-L52`, `K/clients/src/main/resources/common/message/FetchSnapshotRequest.json#L17` |
| K5 | KafkaRaftClient protocol overview | `K/raft/src/main/java/org/apache/kafka/raft/KafkaRaftClient.java#L130-L169` |
| K6 | `__cluster_metadata` file paths, dump tool | `K/docs/operations/kraft.md#L279-L316` |
| K7 | Metadata record frame | `K/server-common/src/main/java/org/apache/kafka/server/common/serialization/AbstractApiMessageSerde.java#L44-L76` |
| K8 | `PartitionChangeRecord` | `K/metadata/src/main/resources/common/metadata/PartitionChangeRecord.json#L16-L56` |
| K9 | Broker heartbeat/session/registration defaults | `K/raft/src/main/java/org/apache/kafka/raft/KRaftConfigs.java#L35-L44` |
| K10 | `BrokerRegistration` / `BrokerHeartbeat` API keys | `K/clients/src/main/resources/common/message/BrokerRegistrationRequest.json#L21`, `K/clients/src/main/resources/common/message/BrokerHeartbeatRequest.json#L19` |
| K11 | Active session via heartbeats | `K/docs/design/design.md#L296` |
| K12 | `BrokerHeartbeatManager` fencing | `K/metadata/src/main/java/org/apache/kafka/controller/BrokerHeartbeatManager.java#L199-L246` |
| K13 | `handleBrokerFenced` | `K/metadata/src/main/java/org/apache/kafka/controller/ReplicationControlManager.java#L1428` |
| K14 | `metadata.max.idle.interval.ms`; controller registers the periodic `NoOpRecord` write | `K/raft/src/main/java/org/apache/kafka/raft/MetadataLogConfig.java#L75-L79`, `K/metadata/src/main/java/org/apache/kafka/controller/QuorumController.java#L1638-L1640` |
| K15 | Snapshot and metadata-log defaults | `K/raft/src/main/java/org/apache/kafka/raft/MetadataLogConfig.java#L38-L95` |
| K16 | Snapshot file names, metadata shell | `K/docs/operations/kraft.md#L119-L143` and `#L291-L316` |
| K17 | Producer ID blocks | `K/server-common/src/main/java/org/apache/kafka/server/common/ProducerIdsBlock.java#L30`, `K/metadata/src/main/java/org/apache/kafka/controller/ProducerIdControlManager.java#L88-L118` |

### Self-check

1. controller 3대와 5대는 각각 몇 대 장애를 견디나? → 1대, 2대(2N+1).
2. broker는 metadata를 어떻게 받나? → observer로 `__cluster_metadata`를 Fetch해 따라간다. 투표는 하지 않는다.
3. broker가 죽은 것을 controller가 아는 조건은? → `broker.session.timeout.ms`(9000 ms) 안에 `BrokerHeartbeat`가 오지 않을 때.
4. KRaft Raft가 일반 Raft와 다른 점 하나는? → 복제가 leader push가 아니라 follower Fetch로 진행된다. 그래서 `BeginQuorumEpoch`로 새 leader를 알린다.
5. ISR 변경은 어떤 레코드로 남나? → `PartitionChangeRecord`(바뀐 필드만 tagged로).

---

## Decoder records

Byte values below were computed for this plan (script logic: Kafka zig-zag varints for record fields, CRC-32C over `attributes`..end). Fields marked **E.G.** vary per run. The proportional-bar layers are named for each record.

### Decoder: record batch v2

One record (`key="order-42"`, `value={"id":42}`, no headers), uncompressed, idempotent, as written to disk. Total 85 bytes = `batchLength` 73 + 12. Header is 61 bytes (`RECORD_BATCH_OVERHEAD`).

Layers: **Log overhead** (0–11) · **Batch header** (12–60) · **Records** (61–84).

| Offset | Field | Type | Value | Hex | Meaning |
|---|---|---|---|---|---|
| 0 | `baseOffset` | int64 | 1200 **E.G.** | `00 00 00 00 00 00 04 b0` | First offset in batch; producer sends 0, broker assigns |
| 8 | `batchLength` | int32 | 73 | `00 00 00 49` | Bytes after this field to end of batch |
| 12 | `partitionLeaderEpoch` | int32 | 3 **E.G.** | `00 00 00 03` | Set by leader; producer sends -1; not in CRC |
| 16 | `magic` | int8 | 2 | `02` | Record batch format v2 |
| 17 | `crc` | uint32 | `0xd00eeae0` (for these example bytes) | `d0 0e ea e0` | CRC-32C over `attributes`..end |
| 21 | `attributes` | int16 | 0 | `00 00` | bits 0–2 codec=none, bit 3 CreateTime, bit 4 not txn, bit 5 not control, bit 6 no delete horizon |
| 23 | `lastOffsetDelta` | int32 | 0 | `00 00 00 00` | Last record's offset − baseOffset |
| 27 | `baseTimestamp` | int64 | 1793696400000 **E.G.** (2026-11-03T09:00:00Z) | `00 00 01 a1 a0 a3 02 80` | First record timestamp |
| 35 | `maxTimestamp` | int64 | 1793696400000 **E.G.** | `00 00 01 a1 a0 a3 02 80` | Max record timestamp |
| 43 | `producerId` | int64 | 4000 **E.G.** | `00 00 00 00 00 00 0f a0` | From `InitProducerId`; -1 if not idempotent |
| 51 | `producerEpoch` | int16 | 0 **E.G.** | `00 00` | Producer epoch |
| 53 | `baseSequence` | int32 | 0 **E.G.** | `00 00 00 00` | First sequence of this batch for the partition |
| 57 | `recordsCount` | int32 | 1 | `00 00 00 01` | Number of records |
| 61 | `records` | [Record] | 1 record, 24 B | see below | Compressed data starts here if compressed |

Raw (85 B):
```
00 00 00 00 00 00 04 b0 00 00 00 49 00 00 00 03 02 d0 0e ea e0 00 00 00 00 00 00
00 00 01 a1 a0 a3 02 80 00 00 01 a1 a0 a3 02 80 00 00 00 00 00 00 0f a0 00 00 00
00 00 00 00 00 00 01 2e 00 00 00 10 6f 72 64 65 72 2d 34 32 12 7b 22 69 64 22 3a
34 32 7d 00
```
Teaching point for the decoder: the same batch as sent by the producer differs only in bytes 0–7 (`00…00`) and 12–15 (`ff ff ff ff`), and the CRC stays `d0 0e ea e0`, because neither field is covered by the CRC.

Sources: [P15], `K/clients/src/main/java/org/apache/kafka/common/record/internal/DefaultRecordBatch.java#L104-L131`, [P17].

### Decoder: record

Layers: **Length** · **Record header** · **Key** · **Value** · **Headers**.

| Offset (in record) | Field | Type | Value | Hex |
|---|---|---|---|---|
| 0 | `length` | varint (zig-zag) | 23 | `2e` |
| 1 | `attributes` | int8 | 0 (unused) | `00` |
| 2 | `timestampDelta` | varlong | 0 | `00` |
| 3 | `offsetDelta` | varint | 0 | `00` |
| 4 | `keyLength` | varint | 8 | `10` |
| 5 | `key` | byte[] | `order-42` **E.G.** | `6f 72 64 65 72 2d 34 32` |
| 13 | `valueLength` | varint | 9 | `12` |
| 14 | `value` | byte[] | `{"id":42}` **E.G.** | `7b 22 69 64 22 3a 34 32 7d` |
| 23 | `headersCount` | varint | 0 | `00` |

Header entries, when present: `headerKeyLength: varint`, `headerKey: String`, `headerValueLength: varint`, `Value: byte[]`. A null key or value is length -1 (zig-zag `01`).

Sources: `K/docs/implementation/message-format.md#L133-L162`, `K/clients/src/main/java/org/apache/kafka/common/record/internal/DefaultRecord.java#L175-L215`, `K/clients/src/main/java/org/apache/kafka/common/utils/internals/ByteUtils.java#L467`.

### Decoder: ProduceRequest

`ProduceRequest` v13 with `RequestHeader` v2, carrying the 85-byte batch above. Total on the wire 143 bytes (4-byte size + 139). Flexible encoding: COMPACT_* lengths are `N+1` as unsigned varint, and every structure ends with a tagged-field count (`00` = none).

Layers: **Size** · **Request header** · **Produce body** · **Record batch**.

| Field | Type | Value | Hex |
|---|---|---|---|
| `message_size` | int32 | 139 | `00 00 00 8b` |
| `RequestApiKey` | int16 | 0 (Produce) | `00 00` |
| `RequestApiVersion` | int16 | 13 | `00 0d` |
| `CorrelationId` | int32 | 7 **E.G.** | `00 00 00 07` |
| `ClientId` | nullable string, **int16 length** (not compact, by schema rule) | `producer-1` **E.G.** | `00 0a 70 72 6f 64 75 63 65 72 2d 31` |
| header tagged fields | uvarint | 0 | `00` |
| `TransactionalId` | COMPACT_NULLABLE_STRING | null | `00` |
| `Acks` | int16 | -1 | `ff ff` |
| `TimeoutMs` | int32 | 30000 | `00 00 75 30` |
| `TopicData` | COMPACT_ARRAY | 1 entry | `02` |
| └ `TopicId` | uuid | 16 bytes **E.G.** | `…` |
| └ `PartitionData` | COMPACT_ARRAY | 1 entry | `02` |
| &nbsp;&nbsp;└ `Index` | int32 | 0 | `00 00 00 00` |
| &nbsp;&nbsp;└ `Records` | COMPACT_RECORDS | 85 bytes | `56` + batch |
| &nbsp;&nbsp;└ tagged fields | uvarint | 0 | `00` |
| └ tagged fields | uvarint | 0 | `00` |
| body tagged fields | uvarint | 0 | `00` |

Size check: header 2+2+4+12+1 = 21; body 1+2+4+1+16+1+4+(1+85)+1+1+1 = 118; 21+118 = 139.

Sources: [P12], [P13], `K/docs/design/protocol.md#L141-L172`, `K/clients/src/main/java/org/apache/kafka/common/protocol/types/Type.java#L565` and `#L769` (COMPACT length N+1).

### Decoder: FetchRequest

`FetchRequest` v18 from a consumer, first fetch of a new session, one partition. Field list only plus sizes, because the TopicId and RackId vary.

| Field | Type | Value |
|---|---|---|
| Header | RequestHeader v2 | `RequestApiKey=1`, `RequestApiVersion=18`, `CorrelationId` **E.G.**, `ClientId` **E.G.** |
| `ClusterId` | tagged 0 | absent |
| `ReplicaState` | tagged 1 | absent (consumer); a follower sets `ReplicaId`, `ReplicaEpoch` |
| `MaxWaitMs` | int32 | 500 (`fetch.max.wait.ms`) |
| `MinBytes` | int32 | 1 (`fetch.min.bytes`) |
| `MaxBytes` | int32 | 52428800 (`fetch.max.bytes`) |
| `IsolationLevel` | int8 | 0 = READ_UNCOMMITTED, 1 = READ_COMMITTED |
| `SessionId` | int32 | 0 (no session yet) |
| `SessionEpoch` | int32 | 0 (`INITIAL_EPOCH`: create a session); -1 = `FINAL_EPOCH` |
| `Topics[].TopicId` | uuid | **E.G.** |
| `Partitions[].Partition` | int32 | 0 |
| `Partitions[].CurrentLeaderEpoch` | int32 | 3 **E.G.** |
| `Partitions[].FetchOffset` | int64 | 1237 **E.G.** |
| `Partitions[].LastFetchedEpoch` | int32 | -1 |
| `Partitions[].LogStartOffset` | int64 | -1 (only followers send it) |
| `Partitions[].PartitionMaxBytes` | int32 | 1048576 (`max.partition.fetch.bytes`) |
| `Partitions[].HighWatermark` | tagged 1 (v18) | absent → default `9223372036854775807` |
| `ForgottenTopicsData` | COMPACT_ARRAY | empty |
| `RackId` | COMPACT_STRING | `""` (`client.rack` unset) |

Sources: [L15], [L16], `K/clients/src/main/java/org/apache/kafka/common/requests/FetchMetadata.java#L31-L43`.

### Decoder: offset index entry

| Offset | Field | Type | Value | Hex |
|---|---|---|---|---|
| 0 | relative offset | int32 | 37 **E.G.** (absolute 1061 if base 1024) | `00 00 00 25` |
| 4 | position | int32 | 4182 **E.G.** | `00 00 10 56` |

Time index entry (12 B): `timestamp: int64` + `relative offset: int32`.

Sources: [L8], [L9].

### Decoder: offset commit record

The record that `OffsetCommit` writes to `__consumer_offsets`. Key and value are each the `key`/`value` bytes of a normal record (see "Decoder: record").

Key (`OffsetCommitKey` v0, non-flexible, type-prefixed):

| Field | Type | Value | Hex |
|---|---|---|---|
| type prefix | int16 | 1 (OffsetCommit) | `00 01` |
| `group` | string (int16 len) | `order-svc` **E.G.** | `00 09 6f 72 64 65 72 2d 73 76 63` |
| `topic` | string (int16 len) | `orders` **E.G.** | `00 06 6f 72 64 65 72 73` |
| `partition` | int32 | 0 | `00 00 00 00` |

Value (`OffsetCommitValue` v4, flexible, version-prefixed):

| Field | Type | Value | Hex |
|---|---|---|---|
| version prefix | int16 | 4 | `00 04` |
| `offset` | int64 | 1237 **E.G.** | `00 00 00 00 00 00 04 d5` |
| `leaderEpoch` | int32 | 3 **E.G.** (-1 if unknown) | `00 00 00 03` |
| `metadata` | COMPACT_STRING | `""` | `01` |
| `commitTimestamp` | int64 | 1793696405000 **E.G.** | `00 00 01 a1 a0 a3 16 08` |
| tagged fields | uvarint count + (tag 0 `topicId` uuid if set) | 1 field **E.G.** | `01 00 10` + 16 B |

`expireTimestamp` exists only in value v1. A tombstone (offset delete) is a null value.

Sources: [G20], [G21], [G22].

Tagged-field framing (`count`, then per field `tag`, `size`, data; a uuid has fixed size 16, so `01 00 10` + 16 B) follows the message generator: `K/generator/src/main/java/org/apache/kafka/message/MessageDataGenerator.java#L827-L896`. A tagged field equal to its default is not written.

### Decoder: PartitionChangeRecord

`PartitionChangeRecord` v2 (apiKey 5) for "ISR shrinks to [1,2]", framed as a metadata record.

| Field | Type | Value |
|---|---|---|
| frame version | uvarint | 1 |
| apiKey | uvarint | 5 |
| version | uvarint | 2 |
| `PartitionId` | int32 | 0 |
| `TopicId` | uuid | **E.G.** `5zoAlv-xEh9xRANKXt1Lbg` (base64 form from the docs example) |
| tagged 0 `Isr` | []int32 | [1, 2] |
| tagged 1 `Leader` | int32 | absent → -2 (unchanged) |
| tagged 5 `LeaderRecoveryState` | int8 | absent → -1 (unchanged) |
| tagged 6 `EligibleLeaderReplicas` | []int32 | absent → null (unchanged), or [3] with ELR |

Sources: [K8], [K7], [K16].

### Decoder: control record (transaction marker)

| Part | Field | Type | Value |
|---|---|---|---|
| batch | `attributes` | int16 | `0x0030` (bit 4 transactional, bit 5 control) |
| batch | `producerId`, `producerEpoch` | int64, int16 | of the transaction, **E.G.** |
| record key | `version` | int16 | 0 |
| record key | `type` | int16 | 1 = COMMIT (0 = ABORT) |
| record value | version prefix | int16 | 0 |
| record value | `CoordinatorEpoch` | int32 | **E.G.** 12 (coordinator epoch when the marker was appended) |

Key bytes for COMMIT: `00 00 00 01`. Value bytes: `00 00` + 4-byte coordinator epoch. Clients treat the value as opaque.

Sources: [T10], `K/clients/src/main/resources/common/message/EndTxnMarker.json#L16-L26`, `K/clients/src/main/java/org/apache/kafka/common/record/internal/EndTransactionMarker.java#L45-L46`.

---

## Open questions

1. **Release check.** kafka.apache.org was not reachable, so "4.4.0 is the current release" rests on the git tags and the tag's `gradle.properties`, not on the downloads page. Re-check from a session that can reach kafka.apache.org, and record the rendered doc URL form (for example `https://kafka.apache.org/44/...`) if the owner prefers rendered pages.
2. **KIP pages unread.** KIP-98 (transactions), KIP-848, KIP-890, KIP-966, KIP-482 (tagged fields), KIP-320 (leader epoch fencing), KIP-345 (static membership), KIP-996 (pre-vote) and KIP-853 (dynamic quorum) were not readable. Every fact attributed to them here comes from the 4.4.0 docs or code instead. Add KIP links as secondary sources once cwiki is reachable.
3. **Lesson 4 size.** Lesson 4 has 14 steps and covers classic and KIP-848 rebalance plus offset commit. DESIGN says "one mechanism per lesson". If the scene feels crowded, split it into `consumer-rebalance` (S1–S9, S13–S14) and `offset-commit` (S10–S12).
4. **Network/sequence view.** Timestamps on the sequence axis are all **E.G.**; real latencies depend on hardware. Should the event log show relative ms (`+5 ms`) instead of wall-clock?
5. **Share groups (KIP-932)** appear in the 4.4.0 design doc ("The Share Consumer"). They are out of scope here. Do we want a later lesson?
6. **Tiered storage** (`local.retention.*`, `OffsetMovedToTieredStorageException` in Fetch v14) is out of scope for lesson 2. Is it a later lesson?

## Facts I could not verify

- That `TxnOffsetCommit` offsets stay invisible to `OffsetFetch` until commit at the code level (lesson 5, S7): stated by the design doc in prose, not traced in `GroupMetadataManager`/`OffsetMetadataManager`.
- KIP-848 "no global synchronization barrier" and "fully incremental" are quoted from the 4.4.0 doc; I did not check the latency claims behind them.
