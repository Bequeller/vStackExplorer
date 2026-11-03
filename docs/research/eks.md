---
last-verified: 2026-11-04
sources: [https://github.com/kubernetes/website/tree/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs, https://github.com/kubernetes/kubernetes/tree/v1.37.1, https://github.com/awslabs/amazon-eks-ami/blob/v20261031/CHANGELOG.md, https://github.com/awsdocs/amazon-eks-user-guide/tree/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug]
---

# EKS and Kubernetes lessons: content plan

This is a research plan with no code. It holds the content of the `eks` topic, to be turned into lesson data after the engine prep lands. It follows `docs/PRODUCT.md` (north star, "must-know only", scope), `docs/DESIGN.md` (principles, required screens), and decisions 0010 and 0011.

The second revision (2026-11-04) applied the research review and the new north star:
- 6 mixed lessons became 11 single-mechanism lessons of 8 to 12 steps each.
- Kubernetes is re-pinned to 1.37.
- Every node uses one fixed topic layout.
- Each lesson states its critical path and ends with a replay.
- Facts that fail the must-know test are listed in "Cut by must-know rule" at the end.

## Version pins

Checked on 2026-11-04.

| Product | Pinned | Why |
|---|---|---|
| Kubernetes | **1.37**: docs at kubernetes/website `main` @ `8f6d976` (its `hugo.toml` says `latest = "v1.37"`); source at tag **`v1.37.1`** | The EKS-optimized AMI changelog lists Kubernetes 1.37 node AMIs from release `v20260923` on ([L1388](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/CHANGELOG.md#L1388), [L1443](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/CHANGELOG.md#L1443)); the release before it, `v20260917`, has none. The current AMIs, `v20261023`, ship kubelet **`1.37.1`**, containerd `2.3.5` and runc `1.4.3` ([CHANGELOG.md](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/CHANGELOG.md#L57-L142)). The source pin matches the kubelet EKS runs. |
| Amazon EKS User Guide | awsdocs/amazon-eks-user-guide @ `8d43223` (2026-09-16) | The guide's source repository. Its latest commit is still 2026-09-16, so it predates EKS 1.37. It is used for EKS mechanisms that do not depend on the version. |
| EKS-optimized AMI | awslabs/amazon-eks-ami `v20261031` | The official source for EKS 1.37 node components. |
| Amazon VPC CNI | `v1.23.1` | Add-on `v1.23.1-eksbuild.1` is the latest version for every Kubernetes version (1.31 to 1.36) in the pinned guide. Its 1.37 row is unverified (see below). |
| AWS Load Balancer Controller | `v3.6.2` | The latest tag. The pinned EKS install page still names v2.14.1. |
| ELBv2 API model | aws-sdk-go-v2 `service/elasticloadbalancingv2` `v1.63.6` | Generated from the ELB API model. Gives the deregistration delay default (300 s), target health states and the cross-zone default. |
| Karpenter (AWS provider) | `v1.15.1` | The latest tag. |
| metrics-server | `v0.9.1` | The latest tag. |
| amazon-eks-pod-identity-webhook | `master` @ `52496af` | Has no recent release tags. |
| eks-pod-identity-agent | `v0.2.7` | The latest tag. |
| AWS IAM Authenticator | `v0.7.24` | Token format for lesson 2. |
| STS, EKS Auth and EC2 API models | aws-sdk-go-v2 `service/sts v1.51.6`, `service/eksauth v1.23.1`, `service/ec2 v1.321.0` | Field names for the API responses in lessons 5, 9 and 10. |

**What could not be sourced for EKS 1.37.** The reviewing session read the live AWS versions page. It reports 1.37, 1.36, 1.35 and 1.34 in standard support and an EKS 1.37 release on 2026-10-01. This session could not reach docs.aws.amazon.com (proxy 403 for curl, DNS failure for WebFetch). kubernetes.io was unreachable too. That leaves these values unverified here:
- the EKS 1.37 release date and support window;
- the 1.37 platform version and control-plane patch;
- the 1.37 admission-controller list;
- the 1.37 add-on versions (VPC CNI, kube-proxy, CoreDNS).

The lessons avoid relying on them. Where an EKS fact comes from the 2026-09-16 guide, it is a mechanism that holds across versions, not a 1.37-specific value.

**Source rule.** Every link goes to a release tag or a commit SHA, with a line anchor checked in a local clone (decision 0004). The `version` string names the product and pin. The ELBv2, STS, EKS Auth and EC2 facts come from the generated AWS SDK models, because the API reference pages were unreachable.

## Lessons and order

Ordered by interview value; each builds on the same map. The critical path is the line to redraw from memory.

| # | id | steps | critical path |
|---|---|---|---|
| 1 | `control-plane-node-join` | 11 | AWS control plane ⇄ EKS ENI ⇄ `kubelet`: IAM 인증 → Node 등록 → Lease heartbeat → 끊기면 `Ready=Unknown` → taint → eviction |
| 2 | `apply-request-path` | 11 | `kubectl` → `kube-apiserver`(authn → authz → admission) → `etcd` → Deployment controller → ReplicaSet → `Pending` Pod |
| 3 | `schedule-to-running` | 11 | `Pending` Pod → `kube-scheduler`(Filter → Score → Binding) → `kubelet` → `containerd` sandbox → CNI IP → container 시작 → `Ready` |
| 4 | `scheduling-constraints` | 10 | requests → scheduler 배치(allocatable · taint · affinity · spread) → limits → cgroup → CPU throttling / `OOMKilled` → node pressure eviction |
| 5 | `vpc-cni` | 11 | `kubelet` → `containerd` → `aws-cni` → `ipamd` warm pool의 secondary IP → veth + route → pool 부족 시 ENI 추가 → 한도 초과 시 IP 고갈 |
| 6 | `service-kube-proxy` | 11 | Pod → CoreDNS(ClusterIP) → 자기 node의 iptables DNAT(`KUBE-SVC` → `KUBE-SEP`) → endpoint Pod; 대상은 EndpointSlice가 정한다 |
| 7 | `alb-ingress` | 10 | Ingress → LBC → ALB + target group(Pod IP) → health check `healthy` → readiness gate → 사용자 요청이 ALB에서 Pod IP로 직행 |
| 8 | `pod-lifecycle` | 11 | 새 Pod `Ready` + ALB `healthy` → 옛 Pod 삭제 → (ALB `draining` ‖ `preStop`) → SIGTERM → 종료; 순서가 어긋나면 5xx |
| 9 | `irsa` | 10 | SA token(aud `sts.amazonaws.com`) → SDK → STS `AssumeRoleWithWebIdentity` → OIDC 키로 서명 검증 → trust policy `sub`/`aud` → 임시 자격 증명 |
| 10 | `pod-identity` | 10 | SA token(aud `pods.eks.amazonaws.com`) → node의 agent → EKS Auth `AssumeRoleForPodIdentity` → association의 role → 임시 자격 증명 |
| 11 | `autoscaling` | 11 | 부하 → `metrics-server` → HPA(replicas 계산) → 새 Pod `Pending` → Karpenter NodeClaim → EC2 → node 등록 → scheduler bind |

## Topic layout

The node positions below are fixed for the topic, and every lesson uses them. A lesson reveals only the nodes it needs, but never moves one. Positions follow `docs/DESIGN.md`: outside → inside, caller → callee, and the critical path reads left → right and top → bottom.

The scene is 1000 × 640, with these regions drawn as faint outlines:
- **outside** (x < 120);
- **AWS-managed control plane** (x 200–820, y 30–220);
- **customer VPC** (x 120–880, y 230–630), which holds **node A** (x 280–640, y 320–620) and **node B** (x 660–880, y 320–620);
- **AWS regional APIs** (x > 900).

| id | label | kind | icon | x, y | region | used in lessons |
|---|---|---|---|---|---|---|
| dev | 개발자 / `kubectl` | client | `laptop` | 60, 90 | outside | 1, 2, 6–10 |
| user | 인터넷 사용자 | client | `globe` | 60, 520 | outside | 7, 8, 11 |
| apiserver | `kube-apiserver` | framework | `api-server` | 330, 90 | control plane | 1–4, 6–11 |
| etcd | `etcd` | storage | `etcd` | 520, 90 | control plane | 1, 2, 6, 9, 11 |
| oidc | OIDC issuer | cloud | `iam` | 720, 90 | control plane edge | 9 |
| kcm | `kube-controller-manager` | framework | `scheduler` | 260, 180 | control plane | 1, 2, 6–8, 11 |
| scheduler | `kube-scheduler` | framework | `scheduler` | 420, 180 | control plane | 1–5, 8, 11 |
| webhook | `pod-identity-webhook` | framework | `filter-stack` | 600, 180 | control plane | 9, 10 |
| xeni | EKS cross-account ENI | cloud | `eni` | 330, 260 | VPC edge | 1 |
| alb | ALB | cloud | `load-balancer` | 180, 520 | VPC public subnet | 7, 8 |
| kubelet | `kubelet` (node A) | container | `kubelet` | 330, 360 | node A | 1, 3–5, 8–11 |
| containerd | `containerd` | container | `server` | 450, 360 | node A | 3–5, 8 |
| cni | `aws-node` (CNI + `ipamd`) | container | `server` | 570, 360 | node A | 3, 5 |
| kubeproxy | `kube-proxy` + netfilter | container | `load-balancer` | 330, 470 | node A | 6, 7 |
| agent | `eks-pod-identity-agent` | container | `iam` | 570, 470 | node A | 10 |
| pod | app Pod (node A) | app | `pod` | 450, 520 | node A | 3–11 |
| eni | node A ENIs and IP pool | storage | `eni` | 600, 580 | node A | 5 |
| podb | app Pod (node B) | app | `pod` | 720, 520 | node B | 6–8 |
| coredns | CoreDNS | framework | `index` | 720, 420 | node B | 6 |
| metrics | `metrics-server` | framework | `server` | 840, 420 | node B | 11 |
| lbc | AWS Load Balancer Controller | framework | `scheduler` | 720, 340 | node B | 7, 8 |
| karpenter | Karpenter | framework | `scheduler` | 840, 340 | node B | 11 |
| newnode | 새 node (Karpenter) | container | `k8s-node` | 840, 580 | VPC | 11 |
| sts | AWS STS | cloud | `iam` | 950, 90 | AWS APIs | 2, 9, 10 |
| eksauth | EKS Auth API | cloud | `iam` | 950, 180 | AWS APIs | 10 |
| ec2api | EC2 API | cloud | `cloud` | 950, 330 | AWS APIs | 5, 11 |
| elbapi | ELB API | cloud | `cloud` | 950, 450 | AWS APIs | 7, 8 |

Authentication, authorization and admission happen inside `apiserver`. They are rows in its state panel, not separate nodes. Kinds and icons follow `docs/DESIGN.md` (Color meaning, Icons). `cloud` marks AWS-managed services and resources the team does not run (decision 0013). Positions are on a 1000 × 640 grid: scale them by about 2 for `meta.ts`, as `docs/ARCHITECTURE.md` says, keeping the relative layout. A lesson may relabel a slot, for example `pod` as `web-…` or `orders-1`, but never moves it.

## Shared conventions

- **Layer selector values:** `AWS` (VPC, EC2, IAM, ELB, STS), `Control plane`, `Node` (kubelet, containerd, CNI, kube-proxy, agent), `Workload` (Pods).
- **Event-log `layer` column:** the protocol or mechanism, such as `HTTPS REST`, `etcd v3 gRPC`, `CRI gRPC`, `CNI exec`, `EC2 API`, `netfilter` or `AWS STS`. Sizes and durations appear only when a source states them; otherwise the column shows `—`.
- **`move` and `mutate`:** `move` never changes state. `mutate` targets a node that has a state panel and gives that node's whole `after` view.
- **Decoder records:** each record belongs to one step and is marked `wire: true` (an API object, HTTP message, gRPC message or JWT) or `wire: false` (`kubectl`, `ip` or `iptables-save` output, or an assembled table). Records show only the fields engineers read. E.G. marks per-run values.
- **Text limits:** Summary ≤ 90 characters and Detail ≤ 320. Surplus goes to the lesson Overview.
- **Values EKS does not publish:** control-plane flags, timings and plugin weights are labeled "upstream 기본값, EKS 값은 비공개".
- **Conflicting sources:** both values are shown with both sources.
- **Step `path`:** every step is `critical` except these `side` steps, which are failure branches or detours: 1.9 (`logs`/`exec` over the ENI), 1.10–1.11 (node unreachable, eviction), 3.3 (no node fits), 4.5 (10th replica `Pending`), 5.10 (IP exhaustion), 6.10–6.11 (endpoint not ready), 8.7 (the 5xx race without `preStop`), 9.10 (`AccessDenied`), and 11.10–11.11 (scale-down). Each lesson's Replay line plays only its critical steps.

## Lesson 1 — `control-plane-node-join`: EKS control plane과 node가 연결되고 join하는 길

**Critical path.** AWS control plane ⇄ EKS ENI ⇄ `kubelet`: IAM 인증 → Node 등록 → Lease heartbeat → 끊기면 `Ready=Unknown` → taint → eviction

**Goal.** AWS 쪽 control plane이 고객 VPC의 ENI로 node와 이어지고, node가 IAM role로 join해 heartbeat를 보내다 끊기면 Pod가 옮겨지기까지를 한 장의 그림으로 기억합니다.

**Interview questions.**
- EKS control plane은 어디서 돌고, API server와 etcd는 몇 개이며 AZ에 어떻게 퍼져 있나? 고객과 AWS의 책임 경계는?
- private subnet의 node에 `kubectl logs`/`exec`가 어떤 경로로 닿고, 무엇이 막으면 실패하나?
- node의 `kubelet`은 무엇으로 인증하고 어떤 Kubernetes 사용자가 되나? endpoint public/private 설정은 이 경로를 어떻게 바꾸나?
- node가 갑자기 죽으면 언제 `NotReady`(Unknown)가 되고, Pod는 언제 다른 node로 옮겨지나?

**Nodes.** critical path: `apiserver`, `etcd`, `xeni`, `kubelet`, `kcm` · side: `dev`, `scheduler` (positions from Topic layout)

**State panels.**
| node | title | view | initial |
|---|---|---|---|
| apiserver | AWS 관리 control plane (클러스터 전용) | table: 구성요소 · 개수 · 배치 | 비어 있음 |
| xeni | 고객 subnet의 EKS ENI와 cluster SG | table: 항목 · 값 | 비어 있음 |
| kubelet | `nodeadm`이 만든 `kubelet` 설정 | table: 항목 · 값 | 비어 있음 |
| etcd | 저장된 Node 객체 | table: field · value | 비어 있음 |

### Steps

#### 1.1 `control-plane` — 클러스터 전용 control plane이 3개 AZ에 뜸 · `mutate` apiserver
- **Summary:** 클러스터마다 전용 control plane이 생기고, API server 2개 이상과 etcd 3개가 3개 AZ에 놓입니다.
- **Detail:** EKS는 클러스터마다 control plane을 따로 만들고 다른 클러스터·계정과 공유하지 않습니다. API server는 최소 2개, etcd는 3개가 한 Region의 3개 AZ에 걸쳐 배치되고, 인스턴스가 고장 나면 EKS가 필요하면 다른 AZ에 교체합니다. etcd는 과반이 살아 있어야 상태를 바꿀 수 있으므로 3개 중 1개 장애까지 견딥니다. 이 영역의 운영은 AWS 책임입니다.
- **Facts:**
  | key | value |
  |---|---|
  | `kube-apiserver` / `etcd` | 최소 2개 / 3개, 한 Region의 3개 AZ |
  | etcd 과반 상실 시 | 클러스터 상태 변경 불가, 새 Pod 스케줄 불가 (3개 중 2개 필요) |
  | 책임 경계 | control plane node와 `etcd` = AWS (security *of* the cloud) |
- **Event log:** `AWS → apiserver · EKS 관리 · 클러스터 전용 control plane 생성 · —`
- **After:**
  | 구성요소 | 개수 | 배치 |
  |---|---|---|
  | `kube-apiserver` | 최소 2 | 3개 AZ에 분산 |
  | `etcd` | 3 | 3개 AZ |
  | `kube-scheduler`, `kube-controller-manager` | 비공개 | leader 1개만 active (upstream 기본값, EKS 값은 비공개) |
- **Sources:**
  - [Control plane: own per cluster, ≥2 API servers and 3 etcd across 3 AZs, replaced on failure](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/what-is/eks-architecture.adoc#L18-L31) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Security of the cloud: control plane nodes and etcd are AWS's responsibility](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/security/security.adoc#L18) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [etcd: odd number of members](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/administer-cluster/configure-upgrade-etcd.md#L29) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [etcd: majority failed → no state changes, no new Pods scheduled](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/administer-cluster/configure-upgrade-etcd.md#L472-L476) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Leases: only one kube-controller-manager / kube-scheduler instance active](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/architecture/leases.md#L30-L35) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 1.2 `cross-account-eni` — 고객 subnet에 EKS ENI가 꽂힘 · `mutate` xeni
- **Summary:** EKS가 고객이 지정한 subnet에 ENI 2–4개를 만들고, control plane ↔ node 트래픽이 이 ENI를 지납니다.
- **Detail:** control plane은 AWS 계정에 있지만, 클러스터를 만들 때 지정한 subnet(서로 다른 AZ에 2개 이상)에 requester-managed ENI를 2–4개 만듭니다. description에 `Amazon EKS <cluster-name>`이 적힙니다. `kubectl logs`·`exec` 같은 kubelet API 연결과 control plane ↔ node 데이터 트래픽이 이 ENI를 지납니다. 버전 업그레이드 때 EKS는 ENI를 지우고 새로 만들며, 다른 subnet에 생길 수 있습니다.
- **Facts:**
  | key | value |
  |---|---|
  | ENI 개수 / 표시 | 2–4개, description `Amazon EKS <cluster-name>` |
  | 놓이는 곳 | 클러스터 생성 때 지정한 subnet (최소 2개, 서로 다른 AZ) |
  | 업그레이드 시 | 삭제 후 재생성, 다른 subnet일 수 있음 → subnet IP 여유 필요 |
- **Event log:** `AWS → xeni · EC2 (EKS가 생성) · requester-managed ENI 생성 · —`
- **After:**
  | 항목 | 값 |
  |---|---|
  | ENI | `eni-0a1b…` subnet-a/AZ-a, `eni-0c2d…` subnet-b/AZ-b (E.G.; 2–4개) |
  | description | `Amazon EKS my-cluster` |
  | 용도 | control plane ↔ node 트래픽, kubelet API (`logs`, `exec`, `attach`, `cp`, `port-forward`) |
- **Sources:**
  - [Subnet requirements: 2–4 ENIs, kubelet API, description, requester-managed, recreated on upgrade](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/network-reqs.adoc#L65-L69) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [At least two subnets in different AZs](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/network-reqs.adoc#L13) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 1.3 `cluster-sg` — ENI와 node를 묶는 cluster security group · `mutate` xeni
- **Summary:** EKS가 만든 cluster SG가 EKS ENI와 managed node group의 node ENI에 붙어, 서로의 트래픽을 허용합니다.
- **Detail:** EKS는 `eks-cluster-sg-<cluster>-<id>`를 만들어 EKS ENI와 managed node group node의 ENI에 붙입니다. 기본 규칙은 같은 SG(self)에서 오는 모든 inbound와 모든 outbound입니다. 포트를 좁히려면 최소 TCP 443(API), TCP 10250(kubelet), TCP·UDP 53(DNS)을 cluster SG로 열어 둬야 합니다. 이 SG는 kubelet API와 private endpoint만 제어하고 public endpoint에는 영향이 없습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 기본 규칙 | inbound All from self, outbound All → `0.0.0.0/0`, outbound All → self |
  | 좁힐 때 최소 outbound | TCP 443, TCP 10250, TCP·UDP 53 → cluster SG |
  | self 규칙을 지우면 | 클러스터 update 때 EKS가 다시 만듦 |
- **Event log:** `AWS → xeni · EC2 (EKS가 생성) · cluster SG 생성, EKS ENI·MNG node ENI에 연결 · —`
- **After:**
  | 항목 | 값 |
  |---|---|
  | ENI | `eni-0a1b…` subnet-a/AZ-a, `eni-0c2d…` subnet-b/AZ-b (E.G.; 2–4개) |
  | description | `Amazon EKS my-cluster` |
  | 용도 | control plane ↔ node 트래픽, kubelet API (`logs`, `exec`, `attach`, `cp`, `port-forward`) |
  | cluster SG | `eks-cluster-sg-my-cluster-<id>` → EKS ENI + MNG node ENI |
  | inbound | All, source = self |
  | outbound | All → `0.0.0.0/0`; All → self |
- **Sources:**
  - [Default cluster security group rules](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/sec-group-reqs.adoc#L16-L53) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Cluster SG associated with EKS ENIs and managed node group nodes](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/sec-group-reqs.adoc#L75-L82) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Restricting cluster traffic: minimum 443 / 10250 / 53](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/sec-group-reqs.adoc#L92-L123) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Cluster SG controls kubelet API and private endpoint, not public](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/cluster-endpoint.adoc#L141-L142) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 1.4 `node-bootstrap` — `nodeadm`이 `NodeConfig`로 kubelet을 설정 · `mutate` kubelet
- **Summary:** `nodeadm`이 `NodeConfig`를 읽어 API endpoint, CA, token exec, node 이름을 kubelet에 넣습니다.
- **Detail:** EC2가 뜨면 `nodeadm`이 user data의 `NodeConfig`를 읽습니다. `apiServerEndpoint`, `certificateAuthority`, service `cidr`가 필수이고, launch template 없는 managed node group과 Karpenter는 이 값을 대신 채웁니다. `nodeadm`은 kubelet kubeconfig에 `aws eks get-token` exec를 넣어, kubelet이 node의 IAM role로 token을 만들게 합니다. Node 이름은 EC2 `PrivateDnsName`입니다.
- **Facts:**
  | key | value |
  |---|---|
  | `NodeConfig` 필수 필드 | `apiServerEndpoint`, `certificateAuthority`, service `cidr` |
  | 누가 채우나 | MNG(launch template 없음)·Karpenter는 자동, self-managed·custom AMI는 직접 |
  | kubelet 자격 증명 | kubeconfig `exec`: `aws eks get-token --cluster-name <name> --region <region>` |
- **Event log:** `kubelet → kubelet · nodeadm init · NodeConfig → /var/lib/kubelet/kubeconfig, --hostname-override · —`
- **After:**
  | 항목 | 값 |
  |---|---|
  | `server` | `NodeConfig.spec.cluster.apiServerEndpoint` |
  | `certificate-authority` | `NodeConfig.spec.cluster.certificateAuthority` (파일로 저장) |
  | `user.exec` | `aws eks get-token --cluster-name my-cluster --region ap-northeast-2` (E.G.) |
  | `--hostname-override` (Node 이름) | EC2 `PrivateDnsName`, 예: `ip-10-0-1-23.ap-northeast-2.compute.internal` (E.G.) |
  | `providerID` | `aws:///<AZ>/<instance-id>` |
- **Record:** R1.1
- **Sources:**
  - [AL2023 nodeadm: NodeConfig required fields; MNG without launch template and Karpenter unaffected](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/al2023.adoc#L24-L39) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [NodeConfig in user data (drop-in under /etc/eks/nodeadm.d)](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/al2023.adoc#L83-L85) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [kubelet kubeconfig template: exec `aws eks get-token`](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/kubeconfig.template.yaml#L1-L27) — amazon-eks-ami v20261031
  - [Node name defaults to EC2 PrivateDnsName; providerID](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/config.go#L275-L289) — amazon-eks-ami v20261031
  - [providerID format `aws:///<az>/<instance-id>`](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/config.go#L401-L403) — amazon-eks-ami v20261031

#### 1.5 `endpoint-path` — node → API endpoint, public 또는 private · `move` kubelet → xeni · token `request`: `HTTPS :443 → cluster endpoint`
- **Summary:** private access를 켜면 VPC 안에서 endpoint 이름이 EKS ENI의 private IP로 풀려 요청이 VPC 안에 머뭅니다.
- **Detail:** 새 클러스터의 기본값은 public만 켜진 상태라 node → API server 요청도 VPC를 나갑니다(Amazon 네트워크 안). private access를 켜면 EKS가 관리하는 Route 53 private hosted zone이 VPC에 붙어, VPC 안에서는 endpoint가 EKS ENI IP로 풀리고 cluster SG가 접근을 제어합니다. public access CIDR로 좁히면서 private를 끄면 node 출발 주소도 CIDR에 넣어야 합니다.
- **Facts:**
  | key | value |
  |---|---|
  | 기본값 | public on, private off |
  | private on 조건 | VPC `enableDnsHostnames`·`enableDnsSupport` = `true`, DHCP에 `AmazonProvidedDNS` |
  | private only | 인터넷에서 API server 접근 불가, `kubectl`은 VPC나 연결된 네트워크에서 |
- **Event log:** `kubelet → xeni · DNS + HTTPS :443 · endpoint 이름 → EKS ENI private IP (private access on) · —`
- **Sources:**
  - [Cluster endpoint is public by default, secured by IAM + RBAC](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/cluster-endpoint.adoc#L15) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Private endpoint: Route 53 private hosted zone, VPC DNS requirements](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/cluster-endpoint.adoc#L69-L81) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Endpoint access combinations and behavior](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/cluster-endpoint.adoc#L95-L135) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [API server listens on a secure HTTPS port, typically 443](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/architecture/control-plane-node-communication.md#L24-L28) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 1.6 `node-authn` — kubelet이 node IAM role로 인증 · `move` xeni → apiserver · token `request`: `POST /api/v1/nodes`
- **Summary:** node role access entry가 kubelet을 `system:node:<PrivateDnsName>`로 만들고, 이름이 Node와 같아야 합니다.
- **Detail:** kubelet 요청에는 `aws eks get-token`으로 만든 bearer token이 실립니다(token 구조는 Lesson `apply-request-path`). node role의 access entry type이 `EC2_LINUX`면 username은 `system:node:{{EC2PrivateDNSName}}`입니다. Node authorizer는 이 이름이 kubelet이 등록하는 Node 이름과 정확히 같을 때만 허용하므로, `nodeadm`이 Node 이름을 `PrivateDnsName`으로 맞춥니다.
- **Facts:**
  | key | value |
  |---|---|
  | access entry type | `EC2_LINUX` (self-managed Linux·Bottlerocket), group·access policy 붙일 수 없음 |
  | Kubernetes username | `system:node:{{EC2PrivateDNSName}}` |
  | 자동 생성 | MNG·Fargate node role의 access entry는 EKS가 만듦 (self-managed는 직접) |
- **Event log:** `xeni → apiserver · HTTPS REST · POST /api/v1/nodes, Authorization: Bearer k8s-aws-v1.… · —`
- **Sources:**
  - [Access entry types; MNG/Fargate entries created by EKS](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/creating-access-entries.adoc#L18-L26) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Generated usernames: EC2_LINUX → system:node:{{EC2PrivateDNSName}}](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/creating-access-entries.adoc#L32-L62) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EC2_LINUX entry: no groups, no access policies](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/creating-access-entries.adoc#L107-L114) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Node authorizer: system:nodes group, username system:node:<nodeName> must match](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/node.md#L53-L61) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [kubelet registers by creating the Node](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/kubelet_node_status.go#L90-L92) — Kubernetes v1.37.1

#### 1.7 `node-register` — Node 객체가 생김 · `mutate` etcd
- **Summary:** `--register-node` 기본값이 true라 kubelet이 스스로 Node 객체를 만들고, API server가 etcd에 저장합니다.
- **Detail:** kubelet은 `--kubeconfig`의 자격 증명으로 API server에 Node를 등록합니다. Node 이름은 1.4의 `PrivateDnsName`, `spec.providerID`는 `aws:///<AZ>/<instance-id>`라 Node와 EC2 인스턴스를 바로 이어 볼 수 있습니다. 이후 kubelet은 `.status`(`Ready` 등 condition)를 보고하고, `Ready=True`인 Node가 스케줄 대상이 됩니다.
- **Facts:**
  | key | value |
  |---|---|
  | `--register-node` | 기본 `true` → kubelet이 Node를 직접 생성 |
  | 자격 증명 | `--kubeconfig` 경로의 credential (EKS: `aws eks get-token` exec) |
  | Node ↔ EC2 | `metadata.name` = `PrivateDnsName`, `spec.providerID` = `aws:///<AZ>/<instance-id>` |
- **Event log:** `apiserver → etcd · etcd write · Node ip-10-0-1-23.ap-northeast-2.compute.internal 생성 (E.G.) · —`
- **After:**
  | field | value |
  |---|---|
  | `metadata.name` | `ip-10-0-1-23.ap-northeast-2.compute.internal` (E.G.) |
  | `spec.providerID` | `aws:///ap-northeast-2a/i-0abc123def4567890` (E.G.) |
  | `status.conditions[Ready]` | `True` |
  | `spec.taints` | — |
- **Record:** R1.2
- **Sources:**
  - [Self-registration of Nodes: --register-node default true, --kubeconfig credentials](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/architecture/nodes.md#L85-L95) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Node name and providerID set by nodeadm](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/config.go#L275-L289) — amazon-eks-ami v20261031
  - [Node status Ready condition](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/node/node-status.md#L47) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 1.8 `lease-heartbeat` — Lease로 10초마다 heartbeat · `move` kubelet → apiserver · token `data`: `update Lease kube-node-lease/<node>`
- **Summary:** kubelet은 `kube-node-lease`의 Lease를 10초마다 갱신하고, `.status`는 바뀔 때나 5분마다 보냅니다.
- **Detail:** heartbeat는 두 가지입니다. Node `.status` 업데이트와, Node와 같은 이름의 Lease(`kube-node-lease` namespace) 갱신입니다. Lease는 작은 객체라 큰 클러스터에서도 부담이 적고, control plane은 `spec.renewTime`으로 node가 살아 있는지 판단합니다. Lease 갱신이 실패하면 200ms에서 시작해 최대 7초까지 지수 backoff로 재시도합니다. 경로는 1.5와 같습니다.
- **Facts:**
  | key | value |
  |---|---|
  | Lease 갱신 | 기본 10초마다, `spec.renewTime` 갱신 |
  | `.status` 보고 | 변화 시 즉시, 변화 없으면 5분 (`nodeStatusReportFrequency`) |
  | `nodeLeaseDurationSeconds` | 기본 40 |
- **Event log:** `kubelet → apiserver · HTTPS REST · update Lease kube-node-lease/ip-10-0-1-23.ap-northeast-2.compute.internal (E.G.) · —`
- **Record:** R1.3
- **Sources:**
  - [Node heartbeats: renewTime on the Lease in kube-node-lease](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/architecture/leases.md#L20-L26) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Heartbeats: .status every 5 minutes, Lease every 10 seconds, 200 ms–7 s backoff](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/node/node-status.md#L133-L157) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [KubeletConfiguration nodeStatusReportFrequency 5m, nodeLeaseDurationSeconds 40](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/kubelet/config/v1beta1/types.go#L337-L357) — Kubernetes v1.37.1

#### 1.9 `kubelet-api` — `kubectl logs`·`exec`가 node에 닿는 길 (EKS ENI 경유) · `move` apiserver → kubelet · token `request`: `kubelet API :10250`
- **Summary:** `kubectl logs`·`exec`는 API server가 EKS ENI를 통해 node kubelet의 TCP 10250으로 직접 연결합니다.
- **Detail:** `logs`·`exec`·`attach`·`port-forward`는 개발자 → API server에서 끝나지 않고, API server가 kubelet의 HTTPS endpoint로 새 연결을 엽니다. EKS에서 이 연결은 고객 subnet의 EKS ENI에서 출발하므로 node가 private subnet에 있어도 동작합니다. cluster SG나 node SG가 10250을 막으면 `kubectl get`은 되는데 `logs`·`exec`만 실패합니다.
- **Facts:**
  | key | value |
  |---|---|
  | kubelet API 포트 | TCP 10250 (used by: self, control plane) |
  | EKS 경로 | API server → EKS ENI → node, cluster SG가 제어 |
  | 쓰는 명령 | `logs`, `exec`, `attach`, `cp`, `port-forward` |
- **Event log:** `apiserver → kubelet · HTTPS (kubelet API) via xeni · kubectl logs 요청 중계 · —`
- **Sources:**
  - [API server to kubelet: logs, attach, port-forward; kubelet HTTPS endpoint](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/architecture/control-plane-node-communication.md#L59-L69) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Worker node ports: TCP 10250 Kubelet API](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/networking/ports-and-protocols.md#L25-L29) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [EKS ENIs carry kubelet API connections](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/network-reqs.adoc#L65) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Minimum rule TCP 10250 to cluster SG](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/sec-group-reqs.adoc#L109-L117) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 1.10 `node-unreachable` — heartbeat가 끊김 → `Ready=Unknown` + taint · `mutate` etcd
- **Summary:** heartbeat가 grace period 넘게 끊기면 node controller가 `Ready=Unknown`과 `unreachable` taint를 겁니다.
- **Detail:** `kube-controller-manager`의 node controller는 기본 5초마다 각 node를 확인합니다. 소식이 끊긴 채 `node-monitor-grace-period`가 지나면 `Ready`를 `Unknown`으로 바꾸고 `node.kubernetes.io/unreachable:NoExecute` taint를 붙입니다(`Ready=False`면 `not-ready`). 이 기본값은 출처끼리 엇갈립니다: 50초(문서 두 곳, v1.37.1 소스)와 40초(문서 한 곳). EKS 값은 비공개입니다.
- **Facts:**
  | key | value |
  |---|---|
  | `--node-monitor-period` | 5s (upstream 기본값, EKS 값은 비공개) |
  | `node-monitor-grace-period` | 50s: node-status.md L47·L79-L80, defaults.go L45-L46 / 40s: node-status.md L152-L153 ("40 second default timeout for unreachable nodes") |
  | taint | `Unknown` → `node.kubernetes.io/unreachable`, `False` → `not-ready`, effect `NoExecute` |
- **Event log:** `kcm → apiserver · HTTPS REST · Node Ready=Unknown + taint unreachable:NoExecute · —`
- **After:**
  | field | value |
  |---|---|
  | `metadata.name` | `ip-10-0-1-23.ap-northeast-2.compute.internal` (E.G.) |
  | `spec.providerID` | `aws:///ap-northeast-2a/i-0abc123def4567890` (E.G.) |
  | `status.conditions[Ready]` | `Unknown` |
  | `spec.taints` | `node.kubernetes.io/unreachable:NoExecute` |
- **Sources:**
  - [Node controller: sets Ready=Unknown, checks every 5 seconds](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/architecture/nodes.md#L218-L229) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Ready=Unknown after node-monitor-grace-period (default 50 seconds)](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/node/node-status.md#L47) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [NodeMonitorGracePeriod defaults to 50 seconds → unreachable / not-ready taint](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/node/node-status.md#L77-L81) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - ["40 second default timeout for unreachable nodes"](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/node/node-status.md#L150-L153) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Source: NodeMonitorGracePeriod 50s, NodeMonitorPeriod 5s](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/nodelifecycle/config/v1alpha1/defaults.go#L40-L53) — Kubernetes v1.37.1
  - [Built-in taints: not-ready = Ready False, unreachable = Ready Unknown; NoExecute by default](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/taint-and-toleration.md#L290-L311) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 1.11 `taint-eviction` — 300초 뒤 Pod 삭제 · `move` kcm → apiserver · token `request`: `DELETE pods/<pod>`
- **Summary:** 기본 toleration 300초가 지나면 kcm이 죽은 node의 Pod를 지우고, ReplicaSet controller가 대체 Pod를 만듭니다.
- **Detail:** Pod에는 `not-ready`·`unreachable` taint를 300초 견디는 toleration이 자동으로 붙습니다. 그 시간이 지나면 kcm의 taint eviction controller가 Pod에 `DisruptionTarget` condition을 남기고 DELETE합니다. 그래서 node가 죽고 대체 Pod가 생기기까지 기본 grace period + 약 5분이 걸립니다. API server가 kubelet에 닿지 못하면, 분리된 node의 Pod는 삭제 결정 뒤에도 계속 돌 수 있습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 기본 toleration | `not-ready`, `unreachable` `NoExecute`, `tolerationSeconds=300` |
  | eviction 속도 | `--node-eviction-rate` 기본 0.1/s (10초에 node 1개, upstream 기본값, EKS 값은 비공개) |
  | 분리된 node | 삭제가 kubelet에 전달될 때까지 Pod가 계속 돌 수 있음 |
- **Event log:** `kcm → apiserver · HTTPS REST · DELETE /api/v1/namespaces/default/pods/web-6b7f9c5d8-x2k9p (E.G.) · —`
- **Sources:**
  - [Kubernetes adds not-ready/unreachable tolerations with tolerationSeconds=300](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/taint-and-toleration.md#L341-L348) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Partitioned node: pods scheduled for deletion may keep running](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/taint-and-toleration.md#L313-L317) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Node controller waits 5 minutes before first eviction; eviction rate 0.1/s](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/architecture/nodes.md#L222-L235) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Taint eviction controller: DisruptionTarget condition, then Pod Delete](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/tainteviction/taint_eviction.go#L129-L147) — Kubernetes v1.37.1

**Replay.** `apiserver`·`etcd`(3 AZ) → `xeni`(ENI + cluster SG) → `kubelet`(`nodeadm` 설정) → `xeni` → `apiserver`(`system:node:…`) → `etcd`(Node `Ready=True`) → `kubelet` → `apiserver`(Lease 10초) → `apiserver` → `xeni` → `kubelet`(:10250 `logs`/`exec`) → heartbeat 끊김 → `kcm` → `etcd`(`Ready=Unknown` + `unreachable` taint) → `kcm` → `apiserver`(300초 뒤 Pod DELETE)

**Overview.**
- node 종류는 EKS Auto Mode, Fargate, Karpenter, managed node group, self-managed, Hybrid Nodes가 있고, 이 lesson은 EC2 node(MNG·self-managed) 기준입니다. ([eks-architecture.adoc L42-L60](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/what-is/eks-architecture.adoc#L42-L60))
- `kube-scheduler`·`kube-controller-manager`는 Lease leader election으로 한 인스턴스만 일합니다. 기본 `leaseDuration` 15s, `renewDeadline` 10s, `retryPeriod` 2s — upstream 기본값, EKS 값은 비공개. ([leases.md L30-L35](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/architecture/leases.md#L30-L35), [defaults.go L35-L45](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/component-base/config/v1alpha1/defaults.go#L35-L45))
- `aws-auth` ConfigMap 방식에서는 node role을 `username: system:node:{{EC2PrivateDNSName}}`, `groups: system:bootstrappers, system:nodes`로 매핑합니다. ([launch-workers.adoc L176-L184](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/launch-workers.adoc#L176-L184))

### Decoder records

#### R1.1 `NodeConfig` (nodeadm 입력) · step 1.4 · wire: false
```yaml
apiVersion: node.eks.aws/v1alpha1
kind: NodeConfig
spec:
  cluster:
    name: my-cluster
    apiServerEndpoint: https://example.com
    certificateAuthority: Y2VydGlmaWNhdGVBdXRob3JpdHk=
    cidr: 10.100.0.0/16
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `apiVersion` / `kind` | `node.eks.aws/v1alpha1` / `NodeConfig` | `nodeadm` 설정 스키마 | |
| `spec.cluster.name` | `my-cluster` | `aws eks get-token --cluster-name`에 들어갈 이름 | E.G. |
| `spec.cluster.apiServerEndpoint` | 클러스터 endpoint URL | kubelet kubeconfig `server` | E.G. |
| `spec.cluster.certificateAuthority` | base64 CA | API server 인증서 검증 | E.G. |
| `spec.cluster.cidr` | Service CIDR | 필수 값 (AL2에서는 `DescribeCluster`로 찾던 값) | E.G. |

Sources: [al2023.adoc L24-L39](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/al2023.adoc#L24-L39) — Amazon EKS User Guide @ 8d43223 (2026-09-16); [kubeconfig.go L54-L65](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/kubeconfig.go#L54-L65) — amazon-eks-ami v20261031 (name → `--cluster-name`, `apiServerEndpoint` → `server`).

#### R1.2 Node 객체 (등록 직후) · step 1.7 · wire: true
```yaml
apiVersion: v1
kind: Node
metadata:
  name: ip-10-0-1-23.ap-northeast-2.compute.internal
spec:
  providerID: aws:///ap-northeast-2a/i-0abc123def4567890
status:
  conditions:
  - type: Ready
    status: "True"
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.name` | EC2 `PrivateDnsName` | access entry username `system:node:<이 이름>`과 일치해야 함 | E.G. |
| `spec.providerID` | `aws:///<AZ>/<instance-id>` | Node → EC2 인스턴스, AZ | E.G. |
| `status.conditions[Ready].status` | `True` / `False` / `Unknown` | `Unknown` = grace period 동안 소식 없음 | |
| `spec.taints` | (1.10 뒤) `node.kubernetes.io/unreachable:NoExecute` | 300초 뒤 Pod 삭제의 출발점 | |

Sources: [config.go L275-L289, L401-L403](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/config.go#L275-L289) — amazon-eks-ami v20261031; [node.md L53-L61](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/node.md#L53-L61), [node-status.md L47](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/node/node-status.md#L47), [taint-and-toleration.md L290-L311](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/taint-and-toleration.md#L290-L311) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976).

#### R1.3 Node Lease · step 1.8 · wire: true
```yaml
apiVersion: coordination.k8s.io/v1
kind: Lease
metadata:
  name: ip-10-0-1-23.ap-northeast-2.compute.internal
  namespace: kube-node-lease
spec:
  leaseDurationSeconds: 40
  renewTime: "2026-11-03T12:00:10.000000Z"
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.namespace` | `kube-node-lease` | node heartbeat 전용 namespace | |
| `metadata.name` | Node 이름 | Node마다 같은 이름의 Lease 하나 | E.G. |
| `spec.leaseDurationSeconds` | `40` | `nodeLeaseDurationSeconds` 기본값 | |
| `spec.renewTime` | 10초마다 갱신 | control plane이 node 생존을 판단하는 시각 | E.G. |

Sources: [leases.md L20-L26](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/architecture/leases.md#L20-L26) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976); [kubelet types.go L348-L357](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/kubelet/config/v1beta1/types.go#L348-L357) — Kubernetes v1.37.1.

### Self-check
1. **Q.** EKS control plane의 API server와 etcd는 몇 개이고 어디에 있으며, etcd가 하나 죽으면? **A.** 클러스터 전용으로 API server 최소 2개, etcd 3개가 한 Region의 3개 AZ에 있습니다. etcd는 과반(3개 중 2개)이 살아 있으면 계속 쓰고, 과반을 잃으면 상태 변경과 새 스케줄이 멈춥니다.
2. **Q.** private subnet node에 `kubectl exec`가 닿는 경로와, `get`은 되는데 `exec`만 안 될 때 볼 곳은? **A.** kubectl → API server, 그다음 API server가 고객 subnet의 EKS ENI(2–4개)에서 node kubelet TCP 10250으로 연결합니다. cluster SG(또는 node SG)의 10250 허용을 봅니다.
3. **Q.** kubelet은 어떻게 인증하고 왜 Node 이름이 중요한가? **A.** `nodeadm`이 넣은 kubeconfig exec `aws eks get-token`으로 node IAM role token을 만듭니다. `EC2_LINUX` access entry가 이를 `system:node:{{EC2PrivateDNSName}}`로 바꾸고, Node authorizer는 이 이름이 Node 이름(`PrivateDnsName`)과 정확히 같아야 허용합니다.
4. **Q.** node 전원이 꺼지면 Pod가 다른 node에서 다시 뜨기까지 기본값으로 얼마나? **A.** heartbeat가 `node-monitor-grace-period`(소스와 문서 두 곳 50초, 문서 한 곳 40초) 동안 없으면 `Ready=Unknown` + `unreachable:NoExecute` taint, 그 뒤 기본 toleration 300초가 지나면 kcm이 Pod를 삭제하고 ReplicaSet이 대체 Pod를 만듭니다. 약 grace period + 5분입니다.
5. **Q.** endpoint private access를 켜면 무엇이 바뀌나? **A.** EKS 관리 Route 53 private hosted zone이 VPC에 붙어 VPC 안에서 endpoint가 EKS ENI의 private IP로 풀립니다. node ↔ API server 트래픽이 VPC 안에 머물고 cluster SG로 제어됩니다. VPC의 DNS hostnames/support가 켜져 있어야 합니다.

### Unverified
- `EC2_LINUX` access entry가 kubelet에 주는 Kubernetes group(Node authorizer가 요구하는 `system:nodes`)은 pinned guide의 access entry 페이지에 적혀 있지 않습니다. `aws-auth` 방식에서만 `system:nodes`가 명시됩니다(Overview).
- EKS의 `kube-controller-manager` 플래그(`node-monitor-grace-period`, `node-monitor-period`, `node-eviction-rate`)와 `DefaultTolerationSeconds` 값은 공개되지 않았습니다. lesson은 upstream 기본값으로 표시합니다.

## Lesson 2 — `apply-request-path`: `kubectl apply` 한 번이 Pending Pod가 되기까지

**Critical path.** `kubectl` → `kube-apiserver`(authn → authz → admission) → `etcd` → Deployment controller → ReplicaSet → `Pending` Pod

**Goal.** `kubectl apply -f web.yaml` 한 번이 EKS API server의 인증·인가·admission을 지나 etcd에 저장되고, controller 두 개를 거쳐 스케줄을 기다리는 Pod가 되기까지를 hop 순서대로 기억합니다.

**Interview questions.**
- `kubectl apply`를 치면 내부에서 무슨 일이 일어나나? 처음 apply와 두 번째 apply는 어떤 요청이 다른가?
- EKS는 IAM 자격 증명으로 Kubernetes 사용자를 어떻게 인증하나? 401과 403은 각각 어느 단계에서 나오나?
- mutating과 validating admission의 순서와 차이는? 읽기 요청도 admission을 거치나?
- Deployment는 Pod를 직접 만드나? `pod-template-hash`는 왜 있나? 방금 만든 Pod는 어떤 상태인가?

**Nodes.** critical path: `dev`, `apiserver`, `sts`, `etcd`, `kcm` · side: `scheduler` (positions from Topic layout)

**State panels.**
| node | title | view | initial |
|---|---|---|---|
| dev | `kubectl` 자격 증명 | table: 항목 · 값 | `user.exec` = `aws eks get-token --cluster-name demo`; token = — |
| apiserver | 요청 처리 단계 | table: 단계 · 결과 | Authentication —; Authorization —; Mutating admission —; Schema validation —; Validating admission — |
| etcd | 저장된 객체 (upstream key 형식) | table: key · 요약 | `/registry/deployments/default/web` 없음 |

### Steps

#### 2.1 `get-token` — IAM 자격 증명을 bearer token으로 · `mutate` dev
- **Summary:** kubeconfig의 exec plugin이 `aws eks get-token`을 실행해, STS 요청을 presign한 token을 받습니다.
- **Detail:** EKS kubeconfig는 `aws eks get-token`을 exec plugin으로 부릅니다. 이 명령은 STS `GetCallerIdentity` GET 요청을 SigV4로 presign하고(`x-k8s-aws-id: <cluster>` header도 서명), 그 URL을 base64url로 인코딩해 `k8s-aws-v1.`을 붙입니다. kubectl은 이 token을 만료 시각까지, 또는 401을 받을 때까지 캐시해 재사용합니다.
- **Facts:**
  | key | value |
  |---|---|
  | token 형식 | `k8s-aws-v1.` + base64url(presigned STS URL), padding `=` 제거 |
  | 유효 기간 | `X-Amz-Date`부터 15분, 그 안에서 재사용 |
  | 클러스터 고정 | `x-k8s-aws-id`가 서명에 들어가므로 다른 클러스터에서 못 씀 |
- **Event log:** `dev → dev · exec credential plugin · aws eks get-token --cluster-name demo · —`
- **After:**
  | 항목 | 값 |
  |---|---|
  | `user.exec` | `aws eks get-token --cluster-name demo` |
  | token | `k8s-aws-v1.aHR0cHM6Ly9zdHMu…` (E.G.) |
  | 유효 | `X-Amz-Date` + 15분 |
- **Record:** R2.1
- **Sources:**
  - [EKS uses `aws eks get-token` with kubectl for cluster authentication](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/create-kubeconfig.adoc#L22-L27) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Token: `k8s-aws-v1.` + base64 presigned GetCallerIdentity, `x-k8s-aws-id` header, no padding](https://github.com/kubernetes-sigs/aws-iam-authenticator/blob/v0.7.24/README.md#L333-L386) — AWS IAM Authenticator v0.7.24
  - [Token valid 15 minutes, reusable](https://github.com/kubernetes-sigs/aws-iam-authenticator/blob/v0.7.24/README.md#L235-L237) — AWS IAM Authenticator v0.7.24
  - [exec plugin credentials cached until expiry or 401](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/authentication.md#L1752-L1759) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 2.2 `read-live` — client-side apply는 먼저 live 객체를 읽음 · `move` dev → apiserver · token `request`: `GET deployments/web`
- **Summary:** 기본 apply(client-side)는 먼저 객체를 GET합니다. 없으면 생성하고, 있으면 three-way merge PATCH를 보냅니다.
- **Detail:** `kubectl apply`의 `--server-side` 기본값은 false라 merge 계산은 kubectl 안에서 합니다. kubectl은 manifest의 객체를 먼저 GET합니다. `NotFound`면 annotation을 붙여 POST로 만들고(2.3), 있으면 live 객체·manifest·`last-applied-configuration` annotation 셋으로 three-way merge patch를 계산해 PATCH를 보냅니다. 이 GET도 authn·authz를 거치지만 admission은 거치지 않습니다.
- **Facts:**
  | key | value |
  |---|---|
  | apply 모드 | client-side (`--server-side` 기본값 `false`) |
  | 객체 없음 (`NotFound`) | annotation 추가 → POST create, three-way merge 생략 |
  | 객체 있음 | three-way merge → PATCH; built-in = `application/strategic-merge-patch+json`, CRD = `application/merge-patch+json` |
- **Event log:** `dev → apiserver · HTTPS REST · GET /apis/apps/v1/namespaces/default/deployments/web → NotFound (첫 apply) · —`
- **Sources:**
  - [`--server-side` flag default false](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/kubectl/pkg/cmd/util/helpers.go#L511-L514) — Kubernetes v1.37.1
  - [applyOneObject: Get → NotFound → CreateApplyAnnotation → Create, skip three-way merge](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/kubectl/pkg/cmd/apply/apply.go#L672-L704) — Kubernetes v1.37.1
  - [Existing object: patcher.Patch](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/kubectl/pkg/cmd/apply/apply.go#L734-L746) — Kubernetes v1.37.1
  - [patchSimple: current + original (annotation) + modified → strategic merge or JSON merge patch → PATCH](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/kubectl/pkg/cmd/apply/patcher.go#L118-L225) — Kubernetes v1.37.1
  - [PatchType constants (media types)](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/apimachinery/pkg/types/patch.go#L24-L31) — Kubernetes v1.37.1
  - [How apply calculates differences: patch from config file, live config, annotation](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/manage-kubernetes-objects/declarative-config.md#L486-L510) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Strategic merge patch: built-in APIs only, not CRDs](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/using-api/api-concepts.md#L1421-L1434) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Reads bypass admission](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/admission-controllers.md#L34-L38) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 2.3 `create-post` — `last-applied-configuration`을 담아 POST · `move` dev → apiserver · token `request`: `POST deployments`
- **Summary:** 새 객체는 manifest 내용을 `last-applied-configuration` annotation에 담아 POST로 생성합니다.
- **Detail:** annotation에는 이번 manifest 내용이 들어가고, 다음 apply 때 manifest에서 빠진 필드를 찾아 live에서 지우는 기준이 됩니다. 그래서 manifest에 없는 필드(예: `kubectl scale`로 바꾼 `replicas`)는 유지되고, manifest에서 지운 필드는 지워집니다. `kubectl create`·`replace`는 이 annotation을 남기지 않으므로 apply와 섞으면 안 됩니다. header에는 2.1의 token이 실립니다.
- **Facts:**
  | key | value |
  |---|---|
  | annotation | `kubectl.kubernetes.io/last-applied-configuration` = manifest 내용 |
  | 크기 한계 | 객체의 annotation 합계 256 KiB → 큰 manifest는 client-side apply로 실패 |
  | field manager | `?fieldManager=kubectl-client-side-apply` |
- **Event log:** `dev → apiserver · HTTPS REST · POST /apis/apps/v1/namespaces/default/deployments?fieldManager=kubectl-client-side-apply · —`
- **Record:** R2.2
- **Sources:**
  - [apply sets last-applied-configuration with the config file contents](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/manage-kubernetes-objects/declarative-config.md#L55-L66) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Field set by `kubectl scale` retained, removed field cleared](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/manage-kubernetes-objects/declarative-config.md#L297-L306) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Mixing apply with create/replace is not supported](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/manage-kubernetes-objects/declarative-config.md#L348-L354) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Total size of all annotations ≤ 256 KiB](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/overview/working-with-objects/annotations.md#L78-L81) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Field manager default `kubectl-client-side-apply`, passed to the request helper](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/kubectl/pkg/cmd/apply/apply.go#L1089-L1098) — Kubernetes v1.37.1
  - [Helper built WithFieldManager](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/kubectl/pkg/cmd/apply/apply.go#L570-L573) — Kubernetes v1.37.1

#### 2.4 `authn-sts` — 인증: presigned URL을 STS로 · `move` apiserver → sts · token `call`: `GetCallerIdentity`
- **Summary:** control plane의 aws-iam-authenticator가 presigned URL을 STS에 보내고, 돌아온 ARN으로 사용자를 정합니다.
- **Detail:** EKS control plane에는 AWS IAM Authenticator가 설치돼 있고, API server는 webhook으로 token을 넘깁니다. authenticator는 URL의 host·path, `Action=GetCallerIdentity`, 서명된 `x-k8s-aws-id`, `X-Amz-Date`+15분을 검사한 뒤 STS에 GET합니다. STS가 서명을 검증하고 ARN을 돌려줍니다. 실패하면 401입니다. 검사 로직은 upstream v0.7.24 기준이고, EKS가 쓰는 버전은 비공개입니다.
- **Facts:**
  | key | value |
  |---|---|
  | 검증 API | `sts:GetCallerIdentity`, 서명 검증은 STS가 함 |
  | 사전 검사 | `k8s-aws-v1.` prefix, `Action`, 서명된 `x-k8s-aws-id`, `X-Amz-Date` + 15분 |
  | 실패 | HTTP 401 (IAM 인증 방식은 끌 수 없음) |
- **Event log:** `apiserver → sts · HTTPS GET · ?Action=GetCallerIdentity&Version=2011-06-15 (presigned, x-k8s-aws-id: demo) · —`
- **Sources:**
  - [AWS IAM Authenticator is installed on the control plane; IAM method cannot be disabled](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/grant-k8s-access.adoc#L29-L34) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [How it works: webhook, parameter checks, submit to STS](https://github.com/kubernetes-sigs/aws-iam-authenticator/blob/v0.7.24/README.md#L247-L259) — AWS IAM Authenticator v0.7.24
  - [Verify: prefix, host, Action, signed x-k8s-aws-id, X-Amz-Date + 15 min, GET to STS](https://github.com/kubernetes-sigs/aws-iam-authenticator/blob/v0.7.24/pkg/token/token.go#L595-L692) — AWS IAM Authenticator v0.7.24
  - [Authentication failure → HTTP 401](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/security/controlling-access.md#L56-L63) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 2.5 `authorize` — 인가: access entry와 RBAC · `mutate` apiserver
- **Summary:** IAM role은 access entry로 username이 되고, access policy와 RBAC 권한의 합으로 `create`를 검사합니다.
- **Detail:** IAM role의 `STANDARD` access entry는 username을 `arn:aws:sts::<account>:assumed-role/<role>/{{SessionName}}`로 만듭니다. 권한은 entry에 연결한 access policy와, entry의 group에 묶인 RBAC의 합입니다. HTTP `POST`는 verb `create`, `PATCH`는 `patch`입니다. 모든 authorizer가 허용하지 않으면 403입니다. authorizer 순서는 upstream 기본값, EKS 값은 비공개입니다.
- **Facts:**
  | key | value |
  |---|---|
  | username (IAM role) | `arn:aws:sts::<account>:assumed-role/<role>/{{SessionName}}` (role path 제거) |
  | 권한 | access policy ∪ RBAC; `kubectl auth can-i --list`에는 access policy 권한이 안 보임 |
  | 거부 | 모든 authorizer가 no opinion → deny, HTTP 403 |
- **Event log:** `apiserver → apiserver · authorization · create deployments.apps in default → allow · —`
- **After:**
  | 단계 | 결과 |
  |---|---|
  | Authentication | ✓ `arn:aws:sts::111122223333:assumed-role/dev-role/alice` (E.G.) |
  | Authorization | ✓ `create` `deployments.apps` in `default` (access policy 또는 RBAC) |
  | Mutating admission | — |
  | Schema validation | — |
  | Validating admission | — |
- **Sources:**
  - [Username Amazon EKS sets for IAM roles (STANDARD), path removed](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/creating-access-entries.adoc#L32-L49) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Access policies + RBAC: union; `kubectl auth can-i --list` doesn't show access policies](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/access-policies.adoc#L24-L28) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Authorizers checked in sequence; all no opinion → 403](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/authorization.md#L47-L53) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [HTTP verb → request verb (POST → create, PATCH → patch)](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/authorization.md#L81-L91) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 2.6 `admission` — mutating → schema validation → validating · `mutate` apiserver
- **Summary:** 쓰기 요청은 mutating → schema validation → validating admission 순서로 지나고, 하나라도 거부하면 끝납니다.
- **Detail:** admission은 create·update·delete·connect에만 동작하고 2.2의 GET은 거치지 않습니다. mutating 단계는 객체를 바꿀 수 있고(webhook은 직렬 호출), 그다음 API server가 객체 schema를 검증하며, 마지막 validating 단계는 검사만 합니다(webhook은 병렬 호출). Deployment에는 바뀌는 것이 거의 없지만 Pod 생성(2.10)에서는 admission이 필드를 넣습니다. EKS 1.37의 plugin 목록은 이 pin에서 확인하지 못했습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 순서 | mutating → schema validation → validating, 하나라도 reject → 요청 전체 거부 |
  | webhook 호출 | mutating = 직렬, validating = 병렬 |
  | 읽기 요청 | get·list·watch는 admission을 거치지 않음 |
- **Event log:** `apiserver → apiserver · admission · mutating → schema validation → validating: allowed · —`
- **After:**
  | 단계 | 결과 |
  |---|---|
  | Authentication | ✓ `arn:aws:sts::111122223333:assumed-role/dev-role/alice` (E.G.) |
  | Authorization | ✓ `create` `deployments.apps` in `default` (access policy 또는 RBAC) |
  | Mutating admission | ✓ (Deployment는 변경 없음, E.G.) |
  | Schema validation | ✓ |
  | Validating admission | ✓ |
- **Sources:**
  - [Admission phases: mutating, then validating; any reject → whole request rejected](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/admission-controllers.md#L65-L73) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Mutating webhooks first; object validated by the API server; then validating webhooks](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/extensible-admission-controllers.md#L27-L29) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [MutatingAdmissionWebhook: called in serial](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/admission-controllers.md#L528-L533) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [ValidatingAdmissionWebhook: called in parallel](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/admission-controllers.md#L905-L912) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Reads bypass admission](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/admission-controllers.md#L34-L38) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 2.7 `etcd-write` — `/registry/deployments/default/web`에 저장 · `mutate` etcd
- **Summary:** 객체가 `/registry/<resource>/<namespace>/<name>` key로 etcd에 쓰이고, 새 `resourceVersion`을 받습니다.
- **Detail:** 검증을 통과한 객체는 object store에 쓰입니다. upstream key는 `--etcd-prefix`(기본 `/registry`) + resource 이름 + namespace + name입니다(EKS 값은 비공개). 저장 계층의 버전인 `resourceVersion`이 객체에 붙고, watch와 낙관적 동시성의 기준이 됩니다. 오래된 `resourceVersion`으로 PUT하면 409 Conflict입니다. 응답을 받은 kubectl은 `deployment.apps/web created`를 출력하고 끝납니다.
- **Facts:**
  | key | value |
  |---|---|
  | key | `/registry/deployments/default/web` (upstream 기본값, EKS 값은 비공개) |
  | `resourceVersion` | 저장 계층의 객체 버전, watch 시작점 |
  | 오래된 `resourceVersion`으로 PUT | `409 Conflict` |
- **Event log:** `apiserver → etcd · etcd write · /registry/deployments/default/web · —`
- **After:**
  | key | 요약 |
  |---|---|
  | `/registry/deployments/default/web` | `replicas: 3`, `resourceVersion: "812345"` (E.G.) |
- **Sources:**
  - [Validated, then written to the object store](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/security/controlling-access.md#L150-L151) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [DefaultEtcdPathPrefix = "/registry"](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubeapiserver/options/options.go#L32-L33) — Kubernetes v1.37.1
  - [ResourcePrefix: lower-case resource name unless overridden](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/apiserver/pkg/server/storage/storage_factory.go#L355-L372) — Kubernetes v1.37.1
  - [NamespaceKeyFunc: prefix + "/" + ns + "/" + name](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/apiserver/pkg/registry/generic/registry/store.go#L267-L295) — Kubernetes v1.37.1
  - [resourceVersion: version in the persistence layer, used to start a watch](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/using-api/api-concepts.md#L398-L402) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Stale resourceVersion on PUT → 409 Conflict](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/using-api/api-concepts.md#L1384-L1390) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [kubectl prints "created" after Create](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/kubectl/pkg/cmd/apply/apply.go#L714-L720) — Kubernetes v1.37.1

#### 2.8 `watch-deployment` — Deployment controller가 변경을 받음 · `move` apiserver → kcm · token `data`: `ADDED Deployment web`
- **Summary:** controller는 polling하지 않습니다. kcm의 Deployment controller가 watch stream으로 `ADDED`를 받습니다.
- **Detail:** client는 list로 현재 상태와 `resourceVersion`을 받고, 그 버전부터 watch를 엽니다. API server는 그 뒤의 create·update·delete를 `ADDED`·`MODIFIED`·`DELETED` 이벤트로 흘려보냅니다. 연결이 끊기면 마지막 `resourceVersion`부터 다시 watch하거나 새로 list합니다. 이 시점에 `kubectl apply`는 이미 끝났고, 이후는 controller들이 비동기로 이어 갑니다.
- **Facts:**
  | key | value |
  |---|---|
  | watch 요청 | `GET …?watch=1&resourceVersion=<rv>` |
  | 이벤트 type | `ADDED`, `MODIFIED`, `DELETED` |
  | 끊김 | 마지막 `resourceVersion`부터 재watch, 또는 새 list |
- **Event log:** `apiserver → kcm · HTTPS watch stream · ADDED apps/v1 Deployment default/web · —`
- **Sources:**
  - [Efficient detection of changes: list then watch from resourceVersion; reconnect](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/using-api/api-concepts.md#L394-L413) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Watch example with ADDED / MODIFIED events](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/using-api/api-concepts.md#L434-L455) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 2.9 `create-replicaset` — Deployment → ReplicaSet `web-<hash>` · `move` kcm → apiserver · token `request`: `POST replicasets`
- **Summary:** Deployment controller가 Pod template 해시로 이름 붙인 `web-<hash>` ReplicaSet을 POST합니다.
- **Detail:** 해시는 ReplicaSet 이름(`<deployment>-<hash>`), selector, Pod template label에 `pod-template-hash`로 들어가 같은 Deployment의 ReplicaSet끼리 Pod가 겹치지 않게 합니다. `ownerReferences`는 Deployment를 controller로 가리킵니다. 새 ReplicaSet(새 rollout)은 `.spec.template`이 바뀔 때만 생기고, `replicas`만 바꾸면 생기지 않습니다. 이 POST도 2.4~2.7과 같은 경로를 지납니다.
- **Facts:**
  | key | value |
  |---|---|
  | 이름 | `<deployment>-<pod-template-hash>` (이름이 길면 Deployment 이름을 자름) |
  | `pod-template-hash` | RS label, selector, Pod template label에 추가 → RS 간 겹침 방지 |
  | 새 RS가 생길 때 | `.spec.template`이 바뀔 때만 (scale은 rollout 아님) |
- **Event log:** `kcm → apiserver · HTTPS REST · POST /apis/apps/v1/namespaces/default/replicasets · —`
- **Record:** R2.3
- **Sources:**
  - [Deployment controller: ComputeHash, hash label on template and selector, controller ref, Create](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/deployment/sync.go#L196-L232) — Kubernetes v1.37.1
  - [generateReplicaSetName: name + "-" + hash, truncated if long](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/deployment/sync.go#L557-L567) — Kubernetes v1.37.1
  - [ReplicaSet name `[DEPLOYMENT-NAME]-[HASH]`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L130-L134) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [pod-template-hash label: why and where](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L153-L162) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Rollout triggered only if .spec.template changes](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L165-L168) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 2.10 `create-pods` — ReplicaSet controller가 Pod 3개를 만듦 · `move` kcm → apiserver · token `request`: `POST pods ×3`
- **Summary:** ReplicaSet controller가 모자란 수만큼 Pod를 `generateName`으로 POST하고, admission이 Pod에 기본 필드를 넣습니다.
- **Detail:** ReplicaSet controller도 kcm 안에서 watch로 새 ReplicaSet을 받고, `replicas`보다 모자란 만큼 Pod를 만듭니다. 이름은 `web-<hash>-`에 API server가 5글자를 붙입니다. 생성 요청은 1개부터 성공할 때마다 두 배로 늘리므로 quota 초과처럼 모두 실패할 요청은 몇 개만 시도됩니다. 이 Pod 생성에서 admission이 ServiceAccount token volume과 300초 toleration을 넣습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 이름 | `generateName: web-<hash>-` + 5글자 random |
  | 소유 | `ownerReferences` → ReplicaSet (`controller: true`) |
  | 생성 batch | 1, 2, 4…로 증가 (slow start), 실패하면 이번 sync는 중단 |
- **Event log:** `kcm → apiserver · HTTPS REST · POST /api/v1/namespaces/default/pods (×3) · —`
- **Record:** R2.4
- **Sources:**
  - [manageReplicas: create diff pods in slow-start batches with controller ref](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/replicaset/replica_set.go#L649-L694) — Kubernetes v1.37.1
  - [Pod name prefix from controller name + "-"](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/controller_utils.go#L512-L519) — Kubernetes v1.37.1
  - [Generated name suffix length 5](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/apiserver/pkg/storage/names/generate.go#L42-L47) — Kubernetes v1.37.1
  - [ReplicaSet linked to Pods via ownerReferences; example](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/replicaset.md#L39-L42) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [ServiceAccount admission adds kube-api-access projected volume](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/service-accounts-admin.md#L236-L252) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [DefaultTolerationSeconds: not-ready/unreachable 5 minutes](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/admission-controllers.md#L233-L242) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 2.11 `pod-pending` — Pod가 `nodeName` 없이 저장됨 (`Pending`) · `mutate` etcd
- **Summary:** Pod 3개가 `nodeName` 없이 `Pending`으로 저장됩니다. 이제 scheduler가 이 Pod들을 watch로 받습니다.
- **Detail:** Pod 생성 요청도 authn·authz·admission을 지나 `/registry/pods/default/<name>`에 쓰입니다(upstream 기본값, EKS 값은 비공개). `spec.nodeName`이 비어 있으므로 scheduler 대상이고, `Pending`은 스케줄 대기와 image 다운로드 시간을 포함합니다. `nodeName`이 이미 채워져 있으면 scheduler는 무시하고 그 node의 kubelet이 받습니다. 스케줄은 다음 lesson입니다.
- **Facts:**
  | key | value |
  |---|---|
  | `spec.nodeName` | 비어 있음 → scheduler가 watch로 받아 처리 |
  | `status.phase` | `Pending` (스케줄 대기 + image 다운로드 포함) |
  | `nodeName`이 채워진 Pod | scheduler가 무시, 그 node의 kubelet이 실행 |
- **Event log:** `apiserver → etcd · etcd write · /registry/pods/default/web-6b7f9c5d8-x2k9p 외 2개 (E.G.) · —`
- **After:**
  | key | 요약 |
  |---|---|
  | `/registry/deployments/default/web` | `replicas: 3` |
  | `/registry/replicasets/default/web-6b7f9c5d8` | `replicas: 3`, owner Deployment `web` (hash E.G.) |
  | `/registry/pods/default/web-6b7f9c5d8-x2k9p` | `nodeName` 없음, `Pending` (E.G.) |
  | `/registry/pods/default/web-6b7f9c5d8-7ci7o` | `nodeName` 없음, `Pending` (E.G.) |
  | `/registry/pods/default/web-6b7f9c5d8-qqcnn` | `nodeName` 없음, `Pending` (E.G.) |
- **Sources:**
  - [Scheduler watches for newly created Pods with no Node assigned](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/kube-scheduler.md#L17-L21) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Pending phase includes waiting to be scheduled and image download](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L114) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [nodeName set → scheduler ignores the Pod, kubelet on that node runs it](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/assign-pod-node.md#L605-L611) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [etcd key: prefix + resource + ns + name](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/apiserver/pkg/registry/generic/registry/store.go#L267-L295) — Kubernetes v1.37.1

**Replay.** `dev`(token) → `apiserver`(GET → NotFound) → `apiserver`(POST + `last-applied-configuration`) → `sts`(`GetCallerIdentity`, 401 지점) → `apiserver`(authz, 403 지점 → mutating → schema → validating) → `etcd`(`/registry/deployments/default/web`, `resourceVersion`) → `kcm`(watch `ADDED`) → `apiserver`(POST ReplicaSet `web-<hash>`) → `kcm` → `apiserver`(POST Pod ×3) → `etcd`(Pod `nodeName` 없음, `Pending`) → `scheduler`가 이어받음

**Overview.**
- Server-side apply(`kubectl apply --server-side`)는 kubectl의 GET·merge 없이 manifest 전체를 `PATCH`(`Content-Type: application/apply-patch+yaml`)로 보내고, API server가 기존 객체와 합치고 필드 소유를 `managedFields`에 기록합니다. ([server-side-apply.md L28-L31](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/using-api/server-side-apply.md#L28-L31), [L72-L73](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/using-api/server-side-apply.md#L72-L73), [L189-L196](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/using-api/server-side-apply.md#L189-L196), [helpers.go L511-L514](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/kubectl/pkg/cmd/util/helpers.go#L511-L514))
- 두 번째 apply부터는 2.3 대신 PATCH가 가고 verb는 `patch`입니다. 권한이 `create`만 있으면 두 번째 apply가 403입니다. ([authorization.md L81-L91](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/authorization.md#L81-L91))
- EKS API server는 클러스터 endpoint의 443에서 TLS로 받습니다(upstream 기본 포트는 6443). ([controlling-access.md L23-L28](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/security/controlling-access.md#L23-L28), [sec-group-reqs.adoc L109-L112](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/sec-group-reqs.adoc#L109-L112))

### Decoder records

#### R2.1 EKS bearer token, 해독 · step 2.1 · wire: true
```text
Authorization: Bearer k8s-aws-v1.aHR0cHM6Ly9zdHMuYXAtbm9ydGhlYXN0LTIuYW1hem9uYXdzLmNvbS8_QWN0aW9uPUdldENhbGxlcklkZW50aXR5…
  └─ base64url 해독 (padding 없음) →
https://sts.ap-northeast-2.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15
  &X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=ASIA…/20261103/ap-northeast-2/sts/aws4_request
  &X-Amz-Date=20261103T120000Z
  &X-Amz-Expires=60
  &X-Amz-SignedHeaders=host;x-k8s-aws-id
  &X-Amz-Security-Token=…
  &X-Amz-Signature=…
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| prefix | `k8s-aws-v1.` | 없으면 authenticator가 거부 | |
| host / path | `sts.<region>.amazonaws.com` / `/` | 허용된 STS host인지 검사 | E.G. region |
| `Action` | `GetCallerIdentity` | 다른 action이면 거부 | |
| `X-Amz-SignedHeaders` | `host;x-k8s-aws-id` | cluster ID header가 서명돼야 함 → 클러스터 고정 | |
| `X-Amz-Date` | `20261103T120000Z` | 이 시각 + 15분이 만료 | E.G. |
| `X-Amz-Expires` | `60` | 0–900만 허용, 실제 만료는 `X-Amz-Date` + 15분 | |
| `X-Amz-Credential` | access key ID/…/`sts`/`aws4_request` | 서명한 자격 증명 | E.G. |
| `X-Amz-Signature` | hex | STS가 검증 | E.G. |

Sources: [token.go L95-L103, L166-L176, L595-L692](https://github.com/kubernetes-sigs/aws-iam-authenticator/blob/v0.7.24/pkg/token/token.go#L95-L176) and [Verify](https://github.com/kubernetes-sigs/aws-iam-authenticator/blob/v0.7.24/pkg/token/token.go#L595-L692) — AWS IAM Authenticator v0.7.24 (parameter allowlist, `requestPresignParam = 60`, 15-minute expiry, signed `x-k8s-aws-id`); [README L333-L386](https://github.com/kubernetes-sigs/aws-iam-authenticator/blob/v0.7.24/README.md#L333-L386) — AWS IAM Authenticator v0.7.24. The `X-Amz-Expires=60` value is what the authenticator's own token generator sets; that `aws eks get-token` (AWS CLI, not pinned) sets the same value is unverified, so read it as E.G. The base64 text is shortened.

#### R2.2 첫 apply의 create 요청 · step 2.3 · wire: true
```text
POST /apis/apps/v1/namespaces/default/deployments?fieldManager=kubectl-client-side-apply HTTP/1.1
Host: <cluster endpoint host>
Authorization: Bearer k8s-aws-v1.aHR0cHM6Ly9zdHMu…

{"apiVersion":"apps/v1","kind":"Deployment",
 "metadata":{"name":"web","namespace":"default",
  "annotations":{"kubectl.kubernetes.io/last-applied-configuration":
   "{\"apiVersion\":\"apps/v1\",\"kind\":\"Deployment\",\"metadata\":{\"annotations\":{},\"name\":\"web\",\"namespace\":\"default\"},\"spec\":{…}}\n"}},
 "spec":{"replicas":3,
  "selector":{"matchLabels":{"app":"web"}},
  "template":{"metadata":{"labels":{"app":"web"}},
   "spec":{"containers":[{"name":"web","image":"registry.example.com/web:1.0.0"}]}}}}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| request line | `POST …/namespaces/default/deployments` | 없던 객체 생성 → verb `create` | |
| `fieldManager` | `kubectl-client-side-apply` | client-side apply의 field manager | |
| `Authorization` | `Bearer k8s-aws-v1.…` | 2.1 token (R2.1) | E.G. |
| `metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]` | manifest JSON | 다음 apply의 "지울 필드" 기준, 합계 256 KiB 한계 | E.G. |
| `spec.replicas` | `3` | 원하는 Pod 수 | E.G. |
| `spec.template` | Pod template | 해시 대상 → `pod-template-hash` | E.G. |

Sources: [apply.go L570-L573, L672-L704](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/kubectl/pkg/cmd/apply/apply.go#L672-L704), [apply.go L1089-L1098](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/kubectl/pkg/cmd/apply/apply.go#L1089-L1098) — Kubernetes v1.37.1; [declarative-config.md L55-L66, annotation example L105-L120](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/manage-kubernetes-objects/declarative-config.md#L105-L120), [annotations.md L81](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/overview/working-with-objects/annotations.md#L81) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976). Body is shortened (`…`); the body encoding kubectl uses on the wire was not checked, so the JSON form is E.G.

#### R2.3 ReplicaSet (Deployment controller가 생성) · step 2.9 · wire: true
```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: web-6b7f9c5d8
  namespace: default
  labels: {app: web, pod-template-hash: 6b7f9c5d8}
  ownerReferences:
  - apiVersion: apps/v1
    kind: Deployment
    name: web
    uid: 3f0c2a8e-6d1b-4f7a-9c55-2b9e1d4a7c10
    controller: true
    blockOwnerDeletion: true
spec:
  replicas: 3
  selector:
    matchLabels: {app: web, pod-template-hash: 6b7f9c5d8}
  template:
    metadata:
      labels: {app: web, pod-template-hash: 6b7f9c5d8}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.name` | `web-6b7f9c5d8` | `<deployment>-<pod-template-hash>` | E.G. hash |
| `metadata.labels.pod-template-hash` | `6b7f9c5d8` | Pod template 해시 | E.G. |
| `spec.selector.matchLabels.pod-template-hash` | `6b7f9c5d8` | 이 RS의 Pod만 잡도록 selector에도 추가 | E.G. |
| `spec.template.metadata.labels.pod-template-hash` | `6b7f9c5d8` | 이 RS가 만드는 Pod에 붙음 | E.G. |
| `ownerReferences[].kind` / `controller` | `Deployment` / `true` | 관리하는 controller | |
| `ownerReferences[].uid` | UUID | 소유자 객체 UID | E.G. |

Sources: [sync.go L196-L232](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/deployment/sync.go#L196-L232) — Kubernetes v1.37.1; [deployment.md L130-L162](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L130-L162), [replicaset.md L138-L158](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/replicaset.md#L138-L158) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976). `blockOwnerDeletion: true` is shown as in the replicaset.md example.

#### R2.4 방금 만들어진 Pod (admission 뒤) · step 2.10 · wire: true
```yaml
apiVersion: v1
kind: Pod
metadata:
  generateName: web-6b7f9c5d8-
  name: web-6b7f9c5d8-x2k9p
  namespace: default
  labels: {app: web, pod-template-hash: 6b7f9c5d8}
  ownerReferences:
  - {apiVersion: apps/v1, kind: ReplicaSet, name: web-6b7f9c5d8, controller: true, blockOwnerDeletion: true}
spec:
  # nodeName 없음 → scheduler 대상
  containers:
  - name: web
    image: registry.example.com/web:1.0.0
  tolerations:
  - {key: node.kubernetes.io/not-ready, operator: Exists, effect: NoExecute, tolerationSeconds: 300}
  - {key: node.kubernetes.io/unreachable, operator: Exists, effect: NoExecute, tolerationSeconds: 300}
  volumes:
  - name: kube-api-access-8xk2q
    projected: {sources: [{serviceAccountToken: {path: token}}, …]}
status:
  phase: Pending
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.generateName` / `name` | `web-6b7f9c5d8-` / `+5글자` | API server가 suffix 생성 | E.G. suffix |
| `ownerReferences[].kind` | `ReplicaSet` | Pod의 주인은 Deployment가 아니라 RS | |
| `spec.nodeName` | (없음) | scheduler가 채울 칸 | |
| `spec.tolerations[].tolerationSeconds` | `300` | `DefaultTolerationSeconds` admission (Lesson 1의 300초) | |
| `spec.volumes[].name` | `kube-api-access-<suffix>` | ServiceAccount admission이 넣은 token volume | E.G. suffix |
| `status.phase` | `Pending` | 아직 스케줄·실행 전 | |

Sources: [controller_utils.go L512-L519](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/controller_utils.go#L512-L519), [names/generate.go L42-L47](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/apiserver/pkg/storage/names/generate.go#L42-L47) — Kubernetes v1.37.1; [admission-controllers.md L233-L242](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/admission-controllers.md#L233-L242), [service-accounts-admin.md L236-L252](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/service-accounts-admin.md#L236-L252), [taint-and-toleration.md L341-L345](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/taint-and-toleration.md#L341-L345), [pod-lifecycle.md L114](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L114) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976). The projected volume's other sources are elided (`…`).

### Self-check
1. **Q.** 처음 `kubectl apply`와 두 번째 apply는 어떤 HTTP 요청이 다른가? **A.** 둘 다 먼저 GET합니다. 처음에는 `NotFound`라 `last-applied-configuration` annotation을 붙여 POST(verb `create`), 두 번째는 live·manifest·annotation으로 three-way merge patch를 계산해 PATCH(built-in은 strategic merge patch, verb `patch`)를 보냅니다.
2. **Q.** EKS의 bearer token은 무엇이고 어디서 검증되나? **A.** `aws eks get-token`이 STS `GetCallerIdentity` 요청(`x-k8s-aws-id` 서명 포함)을 presign한 URL을 base64url로 인코딩하고 `k8s-aws-v1.`을 붙인 값입니다. control plane의 AWS IAM Authenticator가 파라미터를 검사하고 STS에 보내 ARN을 받습니다. 15분 유효합니다.
3. **Q.** 401과 403은 각각 어느 단계에서 나오고, EKS에서 403이면 무엇을 보나? **A.** 401은 authentication(token/STS) 실패, 403은 모든 authorizer가 허용하지 않을 때입니다. access entry에 연결한 access policy와 group의 RBAC를 봅니다. `kubectl auth can-i --list`에는 access policy 권한이 보이지 않습니다.
4. **Q.** admission 순서와, 읽기 요청이 admission을 거치는지는? **A.** mutating admission(webhook 직렬) → schema validation → validating admission(webhook 병렬)이고 하나라도 거부하면 요청 전체가 실패합니다. get·list·watch는 거치지 않습니다.
5. **Q.** Deployment를 만든 직후 Pod는 누가 만들고 어떤 상태인가? **A.** Deployment controller가 `web-<pod-template-hash>` ReplicaSet을 만들고, ReplicaSet controller가 `generateName`으로 Pod를 만듭니다. Pod는 `ownerReferences`가 ReplicaSet이고 `nodeName`이 비어 있는 `Pending` 상태로 scheduler를 기다립니다.

### Unverified
- EKS 1.37에서 켜져 있는 admission plugin 목록 — live AWS 페이지에만 있고 이 session에서 닿지 않습니다.
- EKS control plane의 authenticator 버전, access entry 인가가 어떤 authorizer로 구현되는지와 RBAC·Node와의 순서, etcd key prefix — 공개되지 않았습니다. lesson은 upstream 기본값으로 표시합니다.

## Lesson 3 — `schedule-to-running`: `nodeName` 없는 Pod가 `Ready`가 되기까지

**Critical path.** `Pending` Pod → `kube-scheduler`(Filter → Score → Binding) → `kubelet` → `containerd` sandbox → CNI IP → container 시작 → `Ready`

**Goal.** Pending Pod 하나가 scheduler의 Filter·Score·Binding을 거쳐 node A의 kubelet, containerd, CNI를 지나 `Ready`가 되는 사슬과, 맞는 노드가 없을 때 `FailedScheduling`이 나오는 지점을 그릴 수 있다.

**Interview questions.**
- scheduler는 어떤 Pod를 자기 일로 보고, Filter와 Score는 각각 무엇을 하나?
- Pod가 `Pending`에 머물고 `0/3 nodes are available: ...`가 보인다. 이 메시지는 어떻게 만들어지고 어디서 보나?
- scheduler는 결정을 어떻게 기록하나? `PodScheduled=True`는 누가 켜나?
- kubelet이 Pod를 받은 뒤 CRI와 CNI는 어떤 순서로 불리고, `Ready`는 언제 켜지나?

**Nodes.** critical path: `apiserver`, `scheduler`, `kubelet`, `containerd`, `cni`, `pod` (positions from Topic layout)

**State panels.**
| node | title | view | initial |
|---|---|---|---|
| scheduler | 후보 노드 (scheduling cycle 1회) | table: `node`, `zone`, `Filter`, `Score` | `ip-10-0-1-23` (node A) 2a — — · `ip-10-0-2-45` 2b — — · `ip-10-0-3-67` 2c (taint `dedicated=batch:NoSchedule`) — — (E.G.) |
| pod | Pod `web-6b7f9c5d8-x2k9p` | table: `field`, `value` | `phase` Pending · `spec.nodeName` "" · `PodScheduled` — · `PodReadyToStartContainers` — · `Initialized` — · `ContainersReady` — · `Ready` — · `podIP` — |

### Steps

#### 3.1 `enqueue` — `nodeName`이 빈 Pod가 scheduling queue에 들어간다 · `move` apiserver → scheduler · token `data`: `ADDED Pod web-6b7f9c5d8-x2k9p nodeName=""`
- **Summary:** scheduler는 Pod를 watch하다가 `spec.nodeName`이 빈 Pod만 scheduling queue에 넣는다.
- **Detail:** ReplicaSet controller가 만든 Pod는 `spec.nodeName`이 비어 있다. scheduler의 Pod 이벤트 handler는 자기 담당(`schedulerName`)이고 아직 배정되지 않은 Pod를 queue에 넣는다. scheduling cycle은 한 번에 한 Pod씩 직렬로 돌고, binding cycle은 병렬로 돌 수 있다. 실패한 Pod는 queue로 돌아가 다시 시도된다.
- **Facts:**
  | key | value |
  |---|---|
  | "배정됨" 판정 | `len(pod.Spec.NodeName) != 0` |
  | cycle | scheduling cycle 직렬, binding cycle 병렬 가능 |
  | 실패 시 | Pod는 queue로 돌아가 재시도 |
- **Event log:** `apiserver → scheduler · HTTPS watch · ADDED Pod default/web-6b7f9c5d8-x2k9p nodeName="" · —`
- **Sources:**
  - [eventhandlers.go: unassigned Pod → scheduling queue](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/eventhandlers.go#L138-L140), [assignedPod](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/eventhandlers.go#L459-L461) — Kubernetes v1.37.1
  - [Scheduling framework: cycles serial/concurrent, returned to the queue and retried](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L39-L43) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 3.2 `filter` — Filter plugin이 못 가는 노드를 지운다 · `mutate` scheduler
- **Summary:** Filter는 노드마다 plugin을 차례로 부르고, 하나라도 거부하면 그 노드는 탈락한다. C는 taint에서 걸린다.
- **Detail:** 기본 Filter 순서에서 `TaintToleration`이 `NodeAffinity`, `NodeResourcesFit`보다 앞이다. C는 Pod가 견디지 못하는 `NoSchedule` taint가 있어 거부되고, 나머지 plugin은 C에 대해 호출되지 않는다. `NodeResourcesFit`은 실제 사용량이 아니라 노드에 이미 배정된 Pod의 requests 합 + 이 Pod의 requests를 allocatable과 비교한다. A와 B는 통과한다.
- **Facts:**
  | key | value |
  |---|---|
  | 자주 걸리는 Filter | `TaintToleration`, `NodeAffinity`, `NodeResourcesFit`, `PodTopologySpread`, `InterPodAffinity` |
  | 탈락 규칙 | plugin 하나가 infeasible → 그 노드의 남은 plugin 생략 |
  | `NodeResourcesFit` 비교 | requested 합 + Pod requests > allocatable → `Insufficient cpu` |
- **Event log:** `scheduler · Filter · 3 nodes → 2 feasible (C: untolerated taint) · —`
- **After:**
  | node | zone | Filter | Score |
  |---|---|---|---|
  | `ip-10-0-1-23` (node A) | 2a | ✓ | — |
  | `ip-10-0-2-45` | 2b | ✓ | — |
  | `ip-10-0-3-67` | 2c | ✗ `TaintToleration`: node(s) had untolerated taint(s) | — |
- **Sources:**
  - [Scheduling framework: Filter, remaining plugins not called](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L97-L102) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [default_plugins.go: default plugin order](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/apis/config/v1/default_plugins.go#L33-L55), [TaintToleration Filter message](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/tainttoleration/taint_toleration.go#L118-L133), [fit.go: `Insufficient cpu` = requested + request > allocatable](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/noderesources/fit.go#L733-L742) — Kubernetes v1.37.1

#### 3.3 `unschedulable` — 분기: Filter를 통과한 노드가 0개면 · `mutate` scheduler
- **Summary:** 분기: A·B도 cpu가 모자라면 feasible 노드가 0개다. Pod는 `Pending`에 머물고 `FailedScheduling`이 남는다.
- **Detail:** 모든 노드가 거부되면 scheduler는 노드별 거부 이유를 세어 `0/3 nodes are available: 1 node(s) had untolerated taint(s), 2 Insufficient cpu.` 같은 메시지를 만든다. 이 메시지로 Warning Event `FailedScheduling`을 남기고, Pod에 `PodScheduled=False`, reason `Unschedulable`을 쓴 뒤 Pod를 unschedulable 목록에 넣는다. 노드 추가나 Pod 삭제 같은 cluster 변화가 생기면 다시 시도한다.
- **Facts:**
  | key | value |
  |---|---|
  | 메시지 형식 | `0/X nodes are available: <PreFilter>. <Filter 이유별 개수>. <PostFilter>` |
  | Pod condition | `PodScheduled=False`, reason `Unschedulable`, message = 위 메시지 |
  | 확인 | `kubectl describe pod` Events: `Warning FailedScheduling … default-scheduler` |
- **Event log:** `scheduler → apiserver · HTTPS REST · Event FailedScheduling + PATCH pods/web-6b7f9c5d8-x2k9p/status (PodScheduled=False) · —`
- **After:**
  | node | zone | Filter | Score |
  |---|---|---|---|
  | `ip-10-0-1-23` (node A) | 2a | ✗ `NodeResourcesFit`: Insufficient cpu | — |
  | `ip-10-0-2-45` | 2b | ✗ `NodeResourcesFit`: Insufficient cpu | — |
  | `ip-10-0-3-67` | 2c | ✗ `TaintToleration`: node(s) had untolerated taint(s) | — |
- **Record:** R3.1
- **Sources:**
  - [framework/types.go: FitError message builder](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/types.go#L1468-L1520), [schedule_one.go: reason `Unschedulable`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/schedule_one.go#L1164-L1168), [unschedulable 목록에 추가](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/schedule_one.go#L1225), [FailedScheduling event, `PodScheduled=False`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/schedule_one.go#L1252-L1262) — Kubernetes v1.37.1
  - [Scheduling framework: QueueingHint requeues on cluster events](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L75-L83) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Troubleshooting: Pods pending with `FailedScheduling`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/configuration/manage-resources-containers.md#L576-L606) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 3.4 `score` — 정상 경우로 돌아가, 남은 A·B에 점수를 매긴다 · `mutate` scheduler
- **Summary:** 3.2의 정상 경우로 돌아간다. Score plugin 점수를 weight로 합쳐 가장 높은 노드를 고른다.
- **Detail:** Score plugin은 feasible 노드마다 점수를 주고, 정규화 뒤 plugin weight를 곱해 합친다. `NodeResourcesFit`의 기본 전략 `LeastAllocated`는 requests가 덜 찬 노드를 높게 본다. EKS UG도 이 전략을 EKS 기본값으로 적는다. 동점이면 무작위로 하나를 고른다. 여기서는 A가 덜 차 있어 선택된다(E.G.).
- **Facts:**
  | key | value |
  |---|---|
  | 합산 | NormalizeScore 뒤 plugin weight를 곱해 합침 |
  | `NodeResourcesFit` 전략 | `LeastAllocated`, cpu:1, memory:1 (upstream 기본값 = EKS 문서의 기본값) |
  | 동점 | 무작위 선택 |
- **Event log:** `scheduler · Score · A > B → ip-10-0-1-23 · —`
- **After:**
  | node | zone | Filter | Score |
  |---|---|---|---|
  | `ip-10-0-1-23` (node A) | 2a | ✓ | 높음 ← 선택 (E.G.) |
  | `ip-10-0-2-45` | 2b | ✓ | 낮음 (E.G.) |
  | `ip-10-0-3-67` | 2c | ✗ `TaintToleration` | — |
- **Sources:**
  - [Scheduling framework: Score, weights](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L118-L124), [kube-scheduler: filtering, scoring, ties at random](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/kube-scheduler.md#L58-L76) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [defaults.go: cpu/memory weight 1](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/apis/config/v1/defaults.go#L33-L36), [`LeastAllocated` default](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/apis/config/v1/defaults.go#L234) — Kubernetes v1.37.1
  - [EKS control plane parameters: `nodeResourcesFit.scoringStrategy` default `LeastAllocated`, cpu 1, memory 1](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/control-plane-configuration.adoc#L28-L36) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 3.5 `bind` — `Binding`을 POST해 결정을 기록한다 · `move` scheduler → apiserver · token `request`: `POST pods/web-6b7f9c5d8-x2k9p/binding`
- **Summary:** scheduler는 Pod를 직접 고치지 않는다. `Binding`을 POST하면 API server가 `nodeName`을 쓴다.
- **Detail:** `DefaultBinder`는 Pod 이름·UID와 `target: {kind: Node, name}`을 담은 `Binding`을 보낸다. API server는 etcd의 Pod를 다시 읽어, 이미 `nodeName`이 있거나 삭제 중이거나 `schedulingGates`가 남아 있으면 거부한다. 통과하면 같은 쓰기에서 `spec.nodeName`을 넣고 `PodScheduled=True`를 켠다. 그 뒤 scheduler가 `Scheduled` Event를 남긴다.
- **Facts:**
  | key | value |
  |---|---|
  | 요청 | `POST /api/v1/namespaces/default/pods/web-6b7f9c5d8-x2k9p/binding` |
  | 같은 쓰기 | `spec.nodeName` 설정 + `PodScheduled=True` (kubelet이 아니라 API server) |
  | Event | `Normal Scheduled`: `Successfully assigned default/web-… to ip-10-0-1-23…` |
- **Event log:** `scheduler → apiserver · HTTPS REST · POST pods/web-6b7f9c5d8-x2k9p/binding target=Node/ip-10-0-1-23 · —`
- **Record:** R3.2
- **Sources:**
  - [default_binder.go: builds `v1.Binding`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/defaultbinder/default_binder.go#L51-L57), [pod storage: checks, `nodeName`, `PodScheduled=True`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/registry/core/pod/storage/storage.go#L230-L267), [schedule_one.go: `Scheduled` event](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/schedule_one.go#L1138) — Kubernetes v1.37.1
  - [kube-scheduler: binding](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/kube-scheduler.md#L46-L49) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 3.6 `kubelet-watch` — node A kubelet만 이 Pod를 받는다 · `move` apiserver → kubelet · token `data`: `MODIFIED Pod nodeName=ip-10-0-1-23…`
- **Summary:** kubelet은 `spec.nodeName=<자기 노드>` field selector로 Pod를 watch한다. node A kubelet만 이 변경을 받는다.
- **Detail:** kubelet의 API server source는 모든 namespace의 Pod를 `spec.nodeName` field selector로 list/watch한다. binding이 기록되면 node A kubelet이 Pod를 받아 `SyncPod`를 시작한다: sandbox 생성 → init container → 일반 container 순서다. EKS 1.37 AMI의 kubelet은 `1.37.1`이고 containerd는 `2.3.5`다.
- **Facts:**
  | key | value |
  |---|---|
  | watch 조건 | `fields.OneTermEqualSelector("spec.nodeName", nodeName)` |
  | `SyncPod` 순서 | sandbox (필요 시) → init containers → normal containers |
  | EKS 1.37 AMI | kubelet `1.37.1`, containerd `2.3.5-1.amzn2023.0.1` |
- **Event log:** `apiserver → kubelet · HTTPS watch · MODIFIED Pod default/web-6b7f9c5d8-x2k9p · —`
- **Sources:**
  - [kubelet config/apiserver.go: field selector `spec.nodeName`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/config/apiserver.go#L36-L37), [kuberuntime_manager.go: `SyncPod` steps](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/kuberuntime/kuberuntime_manager.go#L1572-L1582) — Kubernetes v1.37.1
  - [CHANGELOG.md: Kubernetes 1.37 AMIs, release `1.37.1-20261023`, containerd `2.3.5-1.amzn2023.0.1`](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/CHANGELOG.md#L58-L104) — amazon-eks-ami v20261031

#### 3.7 `run-sandbox` — CRI `RunPodSandbox` · `move` kubelet → containerd · token `call`: `RunPodSandbox`
- **Summary:** kubelet은 CRI gRPC로 containerd에 Pod 단위 sandbox(네트워크 namespace를 가진 pause 컨테이너)를 요청한다.
- **Detail:** CRI는 kubelet과 container runtime 사이의 gRPC API다. EKS AMI의 kubelet은 `unix:///run/containerd/containerd.sock`으로 containerd를 부른다. `RunPodSandbox`는 Pod 수준 sandbox를 만들고 시작하며, 성공하면 sandbox는 ready여야 한다. Kubernetes 1.24부터 CNI는 kubelet이 아니라 container runtime이 부른다.
- **Facts:**
  | key | value |
  |---|---|
  | socket (EKS AMI) | `unix:///run/containerd/containerd.sock` |
  | RPC | `RunPodSandbox(RunPodSandboxRequest) returns (RunPodSandboxResponse)` |
  | CNI 호출 주체 | container runtime (kubelet의 CNI flag는 1.24에서 제거) |
- **Event log:** `kubelet → containerd · CRI gRPC · RunPodSandbox web-6b7f9c5d8-x2k9p attempt=0 · —`
- **Sources:**
  - [kuberuntime_sandbox.go: `runtimeService.RunPodSandbox`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/kuberuntime/kuberuntime_sandbox.go#L71), [CRI api.proto: `RunPodSandbox`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L28-L30) — Kubernetes v1.37.1
  - [nodeadm containerd config: `ContainerRuntimeEndpoint`](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/containerd/config.go#L20) — amazon-eks-ami v20261031
  - [Network plugins: runtime loads CNI; kubelet CNI flags removed in 1.24](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins.md#L33-L41) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 3.8 `cni-add` — containerd가 CNI ADD로 VPC IP를 붙인다 · `move` containerd → cni · token `call`: `CNI ADD` → `ipamd AddNetwork`
- **Summary:** containerd가 `aws-cni`를 CNI ADD로 실행하고, plugin은 `ipamd`에게서 warm pool의 VPC IP를 받아 Pod에 붙인다.
- **Detail:** Amazon VPC CNI는 host와 Pod 네트워크를 잇는 CNI plugin과, warm pool을 유지하고 IP를 배정하는 node-local daemon `ipamd`로 나뉜다. plugin은 Unix socket으로 `ipamd`에 `AddNetwork`(Pod 이름·namespace·netns)를 보낸다. sandbox와 네트워크가 준비되면 kubelet이 `PodReadyToStartContainers=True`를 켠다. ENI와 IP 고갈은 Lesson 5다.
- **Facts:**
  | key | value |
  |---|---|
  | `ipamd` 연결 | Unix socket `/var/run/aws-node/ipamd.sock` |
  | 결과 | Pod는 VPC subnet의 IP를 받는다 (Lesson 5) |
  | condition | 네트워크 준비 후 `PodReadyToStartContainers=True`; image pull은 그 뒤 |
- **Event log:** `containerd → cni · CNI exec · ADD (aws-cni) → ipamd AddNetwork · IP 10.0.1.57 (E.G.) · —`
- **Sources:**
  - [VPC CNI README: CNI plugin and `ipamd`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L45-L52), [cni.go: `ipamdSocketPath`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L49), [cni.go: `AddNetwork` request](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L189-L211) — Amazon VPC CNI v1.23.1
  - [Pod lifecycle: `PodReadyToStartContainers` after sandbox and network; image pull after](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L717-L719) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 3.9 `start-container` — image pull → `CreateContainer` → `StartContainer` · `move` kubelet → containerd · token `call`: `PullImage` / `CreateContainer` / `StartContainer`
- **Summary:** 컨테이너마다 image pull, 생성, 시작, postStart hook 순서다. pull이 계속 실패하면 `ImagePullBackOff`다.
- **Detail:** `startContainer`는 image pull → create → start → postStart hook 순서다. `CreateContainer`는 3.7에서 받은 sandbox ID에 컨테이너를 만들고, `StartContainer`가 그것을 실행한다. 컨테이너가 하나 이상 실행되면 phase는 `Running`이다. image를 받지 못하면 컨테이너는 Waiting `ImagePullBackOff`에 머물고, 재시도 간격은 300초까지 늘어난다.
- **Facts:**
  | key | value |
  |---|---|
  | 순서 | pull → `CreateContainer(pod_sandbox_id, …)` → `StartContainer(container_id)` → postStart |
  | `Running` phase | node에 bound, 모든 container 생성, 하나 이상 실행 중 |
  | pull 실패 | Waiting `ImagePullBackOff`, back-off 최대 300 s |
- **Event log:** `kubelet → containerd · CRI gRPC · PullImage / CreateContainer web / StartContainer · —`
- **Sources:**
  - [kuberuntime_container.go: startContainer steps](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/kuberuntime/kuberuntime_container.go#L194-L199), [`CreateContainer`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/kuberuntime/kuberuntime_container.go#L277), [`StartContainer`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/kuberuntime/kuberuntime_container.go#L291-L292) — Kubernetes v1.37.1
  - [Pod lifecycle: phase `Pending` / `Running`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L114-L115), [Images: `ImagePullBackOff`, 300 s](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/containers/images.md#L176-L188) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 3.10 `probe` — kubelet이 readiness probe를 보낸다 · `move` kubelet → pod · token `request`: `GET /ready :8080`
- **Summary:** kubelet이 Pod IP로 readiness probe를 보낸다. 성공해야 container가 ready가 된다.
- **Detail:** `httpGet` probe는 kubelet이 Pod IP의 지정 port·path로 보내는 HTTP GET이고, 200 이상 400 미만이면 성공이다. readiness probe가 없으면 결과는 항상 Success다. 실패가 `failureThreshold`(기본 3)번 이어지면 kubelet은 컨테이너를 죽이지 않고 not ready로 표시해 Service에서 뺀다. 죽이고 재시작하는 것은 liveness probe다.
- **Facts:**
  | key | value |
  |---|---|
  | `httpGet` 성공 | 200 ≤ status < 400 |
  | 기본값 | `periodSeconds` 10, `failureThreshold` 3; probe 없음 = Success |
  | readiness 실패 vs liveness 실패 | not ready (Service에서 제외) vs 컨테이너 재시작 |
- **Event log:** `kubelet → pod · HTTP · GET http://10.0.1.57:8080/ready → 200 (E.G.) · —`
- **Sources:**
  - [Probes: readiness probe](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/probes.md#L68-L80), [httpGet check](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/probes.md#L164-L168), [no probe = Success](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/probes.md#L205-L207), [`periodSeconds`, `failureThreshold`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/probes.md#L250-L260) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 3.11 `ready` — kubelet이 status를 PATCH하고 Pod가 `Ready`가 된다 · `mutate` pod
- **Summary:** kubelet이 status를 PATCH해 `podIP`와 condition을 보고한다. `Ready=True`면 Service endpoint에 들어간다.
- **Detail:** kubelet status manager는 Pod 전체가 아니라 `status` subresource만 strategic merge patch로 쓴다. lifecycle condition은 대략 `PodScheduled` → `PodReadyToStartContainers` → `Initialized` → `ContainersReady` → `Ready` 순서로 켜진다. `PodScheduled`만 API server가 binding에서 켜고 나머지는 kubelet이 켠다. `Ready`가 아닌 Pod는 Service endpoint에서 빠진다.
- **Facts:**
  | key | value |
  |---|---|
  | 요청 | `PATCH /api/v1/namespaces/default/pods/web-6b7f9c5d8-x2k9p/status` (strategic merge) |
  | condition 순서 | `PodScheduled` → `PodReadyToStartContainers` → `Initialized` → `ContainersReady` → `Ready` |
  | `Ready` 추가 조건 | `readinessGates`가 있으면 그 condition도 `True` |
- **Event log:** `kubelet → apiserver · HTTPS REST · PATCH pods/web-6b7f9c5d8-x2k9p/status Ready=True podIP=10.0.1.57 (E.G.) · —`
- **After:**
  | field | value |
  |---|---|
  | `phase` | Running |
  | `spec.nodeName` | `ip-10-0-1-23.ap-northeast-2.compute.internal` (E.G.) |
  | `PodScheduled` | True (API server, 3.5) |
  | `PodReadyToStartContainers` | True |
  | `Initialized` | True |
  | `ContainersReady` | True |
  | `Ready` | True |
  | `podIP` | `10.0.1.57` (E.G.) |
- **Record:** R3.3
- **Sources:**
  - [pod.go: `PatchPodStatus` with `StrategicMergePatchType` on `status`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/util/pod/pod.go#L33-L43), [status_manager.go: `PatchPodStatus` call](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/status/status_manager.go#L1276) — Kubernetes v1.37.1
  - [Pod conditions: order, kubelet sets them, Ready and Service endpoints](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-condition.md#L53-L65) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

**Replay.** apiserver → scheduler (queue) → scheduler (Filter: C 탈락) → scheduler (Score: A) → apiserver (`Binding`, `nodeName`, `PodScheduled=True`) → kubelet (watch) → containerd (`RunPodSandbox`) → cni (CNI ADD, `10.0.1.57`) → containerd (`CreateContainer`/`StartContainer`) → pod (readiness `GET /ready`) → apiserver (status PATCH) → pod `Ready`

**Overview.** 기본 plugin weight는 `TaintToleration` 3, `NodeAffinity`·`PodTopologySpread`·`InterPodAffinity` 2, `NodeResourcesFit`·`NodeResourcesBalancedAllocation`·`ImageLocality` 1이다 — upstream 기본값이고, EKS UG는 EKS가 upstream 기본 설정으로 돈다고만 적는다([default_plugins.go](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/apis/config/v1/default_plugins.go#L33-L55), [EKS control plane parameters](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/control-plane-configuration.adoc#L15)).
모든 노드가 거부되면 PostFilter(기본은 preemption)가 낮은 priority Pod를 밀어낼 수 있는지 본다. 그 결과가 메시지 끝의 `preemption: …`이다([Scheduling framework: PostFilter](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L104-L110), [default_preemption.go](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/defaultpreemption/default_preemption.go#L157-L160)).
init container가 없으면 `Initialized=True`는 sandbox 생성 전에 켜진다([pod-condition.md](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-condition.md#L59)).
어떤 컴포넌트도 서로를 직접 부르지 않는다: scheduler와 kubelet은 API server를 watch하고 API server에 쓴다. 노드 위에서만 kubelet → containerd → CNI가 직접 호출이다.

### Decoder records

#### R3.1 `kubectl describe pod` (Pending) · step 3.3 · wire: false
```text
$ kubectl describe pod web-6b7f9c5d8-x2k9p
Name:             web-6b7f9c5d8-x2k9p
Namespace:        default
Node:             <none>
Status:           Pending
Conditions:
  Type           Status
  PodScheduled   False
Events:
  Type     Reason            Age   From               Message
  ----     ------            ----  ----               -------
  Warning  FailedScheduling  12s   default-scheduler  0/3 nodes are available: 1 node(s) had untolerated taint(s), 2 Insufficient cpu. preemption: …
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `Node` | `<none>` | `spec.nodeName`이 아직 비어 있음 | |
| `Status` | `Pending` | 스케줄 대기 포함 phase | |
| `Conditions: PodScheduled` | `False` | scheduler가 reason `Unschedulable`로 씀 | |
| `Reason` | `FailedScheduling` | scheduler의 Warning Event | |
| `From` | `default-scheduler` | 기본 scheduler 이름 | |
| `Message` 앞부분 | `0/3 nodes are available:` | `0/<전체 노드 수>` | E.G. |
| `Message` 이유 | `1 node(s) had untolerated taint(s), 2 Insufficient cpu` | 거부 이유별 노드 수, 문자열 정렬 | E.G. |
| `Age` | `12s` | 마지막 Event 이후 시간 | E.G. |

Sources: [schedule_one.go L1252-L1262](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/schedule_one.go#L1252-L1262), [framework/types.go L1468-L1520](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/types.go#L1468-L1520), [taint_toleration.go L133](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/tainttoleration/taint_toleration.go#L133), [fit.go L733-L742](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/noderesources/fit.go#L733-L742), [core/v1 `PodReasonUnschedulable`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L3776) — Kubernetes v1.37.1; [describe output with `FailedScheduling` from `default-scheduler`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/configuration/manage-resources-containers.md#L584-L592) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976). The docs sample shortens the message to `0/42 nodes available: insufficient cpu`; the v1.37.1 source builds `0/X nodes are available: <count> <reason>.` and the record follows the source. The `preemption: …` tail is shown as `…` (not traced).

#### R3.2 `Binding` · step 3.5 · wire: true
```text
POST /api/v1/namespaces/default/pods/web-6b7f9c5d8-x2k9p/binding

{"kind":"Binding","apiVersion":"v1",
 "metadata":{"name":"web-6b7f9c5d8-x2k9p","namespace":"default","uid":"c7e2b1f0-4a9d-4d3e-b6a8-1f2e3d4c5b6a"},
 "target":{"kind":"Node","name":"ip-10-0-1-23.ap-northeast-2.compute.internal"}}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| request path | `…/pods/<name>/binding` | Pod의 `binding` subresource | E.G. |
| `kind` | `Binding` | 한 객체를 다른 객체에 묶는 타입 | |
| `metadata.name` / `namespace` | Pod 이름 / ns | 묶을 Pod | E.G. |
| `metadata.uid` | Pod UID | precondition: 같은 이름의 다른 Pod에 쓰지 않게 함 | E.G. |
| `target.kind` | `Node` | 대상 종류 | |
| `target.name` | `ip-10-0-1-23.…compute.internal` | 고른 노드 → `spec.nodeName` | E.G. |

Sources: [default_binder.go L51-L57](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/defaultbinder/default_binder.go#L51-L57), [core/v1 `Binding`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L7549-L7560), [pod storage: UID precondition and checks](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/registry/core/pod/storage/storage.go#L219-L244) — Kubernetes v1.37.1. The body is shown as JSON for reading; the scheduler client's wire encoding is not checked. The EC2 node name format is E.G.

#### R3.3 Pod status after the kubelet PATCH · step 3.11 · wire: true
```yaml
spec:
  nodeName: ip-10-0-1-23.ap-northeast-2.compute.internal
status:
  phase: Running
  podIP: 10.0.1.57
  conditions:
  - {type: PodScheduled,              status: "True"}
  - {type: PodReadyToStartContainers, status: "True"}
  - {type: Initialized,               status: "True"}
  - {type: ContainersReady,           status: "True"}
  - {type: Ready,                     status: "True"}
  containerStatuses:
  - name: web
    containerID: containerd://8c2d…a1
    ready: true
    restartCount: 0
    state:
      running: {startedAt: "2026-11-03T12:00:04Z"}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `spec.nodeName` | 노드 이름 | Binding 결과 | E.G. |
| `status.phase` | `Running` | bound + 모든 container 생성 + 하나 이상 실행 | |
| `status.podIP` | `10.0.1.57` | VPC CNI가 준 VPC 주소 | E.G. |
| `status.conditions[].type` | 5개 lifecycle condition | 대략 이 순서로 켜짐 | |
| `containerStatuses[].containerID` | `containerd://…` | runtime 이름 + container ID | E.G. |
| `containerStatuses[].ready` | `true` | readiness probe 결과 | |
| `containerStatuses[].restartCount` | `0` | 재시작 횟수 (Lesson 4의 OOMKilled에서 늘어남) | |
| `containerStatuses[].state` | `running` | 현재 상태 (`waiting`/`running`/`terminated`) | |

Sources: [core/v1 `PodStatus`: `phase`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L5609), [`conditions`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L5617), [`podIP`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L5654), [`containerStatuses`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L5694), [`restartCount`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L3560) — Kubernetes v1.37.1; [pod-condition.md: lifecycle conditions](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-condition.md#L40-L61), [pod-lifecycle.md: phases](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L114-L115) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976). The full PATCH also carries `lastTransitionTime` and other fields; only the fields engineers read are shown.

### Self-check
1. **Q.** scheduler가 자기 일로 보는 Pod는? 결정은 어떻게 기록되나? **A.** `spec.nodeName`이 빈 Pod. `pods/<name>/binding`에 `Binding{target: Node/<name>}`을 POST하고, API server가 같은 쓰기에서 `spec.nodeName`과 `PodScheduled=True`를 넣는다.
2. **Q.** `0/3 nodes are available: 1 node(s) had untolerated taint(s), 2 Insufficient cpu.`를 해석하라. **A.** 노드 3개가 모두 Filter에서 거부됐다. 1개는 Pod가 견디지 못하는 `NoSchedule` taint 때문이고, 2개는 이미 배정된 requests 합 + Pod requests가 allocatable을 넘어서다. 사용량이 아니라 requests 기준이다. Pod는 `PodScheduled=False`(`Unschedulable`)로 Pending에 남는다.
3. **Q.** Filter와 Score의 차이는? **A.** Filter는 노드를 통과/탈락으로 거른다(plugin 하나라도 거부하면 탈락). Score는 남은 노드에 점수를 매겨 가장 높은 노드를 고르고, 동점이면 무작위다. EKS 기본 `NodeResourcesFit` 전략은 `LeastAllocated`다.
4. **Q.** kubelet이 Pod를 받은 뒤 Pod IP가 붙고 컨테이너가 뜨기까지의 호출 순서는? **A.** `spec.nodeName` field selector watch → CRI `RunPodSandbox`(containerd) → containerd가 CNI ADD로 `aws-cni` 실행 → `ipamd` `AddNetwork`로 VPC IP → `PodReadyToStartContainers=True` → image pull → `CreateContainer` → `StartContainer`.
5. **Q.** readiness probe가 실패하면 컨테이너가 재시작되나? **A.** 아니다. readiness 실패는 container를 not ready로 만들어 `Ready=False`, Service endpoint에서 뺀다. 재시작은 liveness(또는 startup) probe 실패일 때다.

### Unverified
- FailedScheduling 메시지의 PostFilter 부분(`preemption: …`) 정확한 문구는 노드 상태에 따라 달라 추적하지 않았다. `…`로 둔다.
- scheduler가 `Binding`을 보내는 wire encoding(protobuf/JSON)은 확인하지 않았다. R3.2는 JSON으로 보여 준다.
- EKS 노드 이름 형식 `ip-<a-b-c-d>.<region>.compute.internal`은 pinned 줄로 확인하지 않았다 → E.G.

## Lesson 4 — `scheduling-constraints`: requests·limits와 배치 규칙이 Pod의 자리와 죽는 방식을 정한다

**Critical path.** requests → scheduler 배치(allocatable · taint · affinity · spread) → limits → cgroup → CPU throttling / `OOMKilled` → node pressure eviction

**Goal.** Deployment `web` 하나가 3개 zone, 두 종류 node에 놓이는 과정에서 requests·taint·affinity·spread가 자리를 정하고, limits와 node 압박이 Pod를 어떻게 멈추거나 죽이는지 한 그림으로 그릴 수 있다.

**Interview questions.**
- requests와 limits는 각각 누가 쓰나? 사용량이 낮은데 왜 `Insufficient cpu`로 Pending이 되나?
- QoS class 세 가지는 어떻게 정해지고, 무엇에 영향을 주나?
- CPU limit을 넘으면 어떻게 되고, memory limit을 넘으면 어떻게 되나? `OOMKilled`, exit code 137은 무엇인가?
- 노드 메모리가 모자라면 kubelet은 어떤 Pod부터 내보내나?

**Nodes.** critical path: `apiserver`, `scheduler`, `kubelet`, `containerd`, `pod` (positions from Topic layout)

**Scenario (E.G.).** Deployment `web`: container 하나, `requests` cpu 500m / memory 512Mi, `limits` cpu 1 / memory 512Mi, required node affinity `eks.amazonaws.com/capacityType In [ON_DEMAND]`, zone spread `maxSkew: 1`. Managed node group 두 개: general (ON_DEMAND, `m7i.large`, 2a·2b·2c 각 1대)과 batch (SPOT, 2a 1대, taint `dedicated=batch:NoSchedule`).

**State panels.**
| node | title | view | initial |
|---|---|---|---|
| pod | Pod `web-…-a` (node A) | table: `field`, `value` | `requests` cpu 500m / mem 512Mi · `limits` cpu 1 / mem 512Mi · `qosClass` — · `CPU` — · `state` — · `lastState` — · `restartCount` — |
| scheduler | 후보 노드 | table: `node`, `zone`, `group`, `cpu requested / allocatable`, `결과` | `ip-10-0-1-23` (node A) 2a general 330m / 1930m — · `ip-10-0-2-45` 2b general 330m / 1930m — · `ip-10-0-3-67` 2c general 330m / 1930m — · `ip-10-0-1-88` 2a batch 330m / 1930m — (E.G.) |
| kubelet | node A 메모리 압박 | table: `item`, `value` | `memory.available` 1.1Gi (E.G.) · `MemoryPressure` False · node taint 없음 · 축출 순위 — |

### Steps

#### 4.1 `qos-class` — API server가 Pod를 만들 때 QoS class를 정한다 · `mutate` pod
- **Summary:** QoS class는 requests와 limits로 정해진다. `web`은 cpu request ≠ limit이라 `Burstable`이다.
- **Detail:** API server는 Pod 생성 때 `status.qosClass`를 계산해 쓴다. 모든 container가 cpu·memory 둘 다 request = limit이면 `Guaranteed`, 아무것도 없으면 `BestEffort`, 그 밖은 `Burstable`이다. limit만 쓰면 request가 limit 값으로 채워진다. `web`은 memory는 같지만 cpu가 500m ≠ 1이라 `Burstable`이다.
- **Facts:**
  | key | value |
  |---|---|
  | `Guaranteed` | 모든 container: cpu와 memory 모두 request = limit |
  | `BestEffort` | 어느 container에도 cpu·memory request/limit 없음 |
  | limit만 지정 | request = limit으로 채워짐 |
- **Event log:** `apiserver · admission/defaulting · Pod web-…-a status.qosClass=Burstable · —`
- **After:**
  | field | value |
  |---|---|
  | `requests` | cpu 500m / mem 512Mi |
  | `limits` | cpu 1 / mem 512Mi |
  | `qosClass` | Burstable |
  | `CPU` | — |
  | `state` | — (Pending) |
  | `lastState` | — |
  | `restartCount` | — |
- **Record:** R4.1
- **Sources:**
  - [Pod QoS: classes and criteria](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-qos.md#L44-L92), [QoS task: limit only → request copied](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/configure-pod-container/quality-service-pod.md#L100-L105) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [pod strategy.go: `PrepareForCreate` sets `QOSClass`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/registry/core/pod/strategy.go#L87-L103) — Kubernetes v1.37.1

#### 4.2 `fit-requests` — scheduler는 사용량이 아니라 requests를 allocatable과 비교한다 · `mutate` scheduler
- **Summary:** `NodeResourcesFit`은 노드의 requests 합 + 새 Pod requests를 allocatable과 비교한다. 실제 사용량은 보지 않는다.
- **Detail:** allocatable은 capacity에서 kube-reserved, system-reserved, hard eviction threshold를 뺀 값이다. EKS AL2023 AMI는 kube-reserved cpu를 코어 수로, memory를 `11 × maxPods + 255`Mi로 잡는다. `m7i.large`(2 vCPU, maxPods 29)면 cpu 70m, memory 574Mi다. 사용량이 낮아도 requests가 차면 scheduler는 그 노드를 거부한다.
- **Facts:**
  | key | value |
  |---|---|
  | allocatable | capacity − kubeReserved − systemReserved − evictionHard |
  | EKS AMI kubeReserved (`m7i.large`) | cpu 70m (1930m 남음), memory 574Mi; evictionHard `memory.available` 100Mi |
  | 판정 기준 | requests 합 (사용량 아님) |
- **Event log:** `scheduler · Filter NodeResourcesFit · 330m + 500m ≤ 1930m → 4 nodes fit · —`
- **After:**
  | node | zone | group | cpu requested / allocatable | 결과 |
  |---|---|---|---|---|
  | `ip-10-0-1-23` (node A) | 2a | general | 330m / 1930m | ✓ Fit |
  | `ip-10-0-2-45` | 2b | general | 330m / 1930m | ✓ Fit |
  | `ip-10-0-3-67` | 2c | general | 330m / 1930m | ✓ Fit |
  | `ip-10-0-1-88` | 2a | batch | 330m / 1930m | ✓ Fit |
- **Sources:**
  - [Manage resources: scheduler sums requests, refuses even if usage is low](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/configuration/manage-resources-containers.md#L248-L259), [Reserve compute resources: allocatable example](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/administer-cluster/reserve-compute-resources.md#L225-L240) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [fit.go: `Insufficient cpu` check](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/noderesources/fit.go#L733-L742) — Kubernetes v1.37.1
  - [nodeadm kubelet config: `evictionHard`](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/config.go#L116-L120), [kubeReserved](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/config.go#L302-L306), [cpu and memory reserve formulas](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/config.go#L430-L463), [maxPods formula](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/eni_max_pods.go#L77-L78), [`m7i.large` ENI/IP limits](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/instance-info.jsonl#L711) — amazon-eks-ami v20261031

#### 4.3 `dedicated-nodes` — taint는 밀어내고, node affinity는 끌어당긴다 · `mutate` scheduler
- **Summary:** batch node의 `NoSchedule` taint가 `web`을 밀어내고, required affinity는 ON_DEMAND node로 끌어당긴다.
- **Detail:** taint는 toleration 없는 Pod를 노드에서 밀어낼 뿐, toleration 있는 Pod를 그 노드로 보내지 않는다. 그래서 전용 노드는 taint와 label + required node affinity를 함께 쓴다. `NoSchedule`은 새 Pod만 막고, `NoExecute`는 이미 도는 Pod도 내보낸다. required affinity는 Filter, preferred는 Score에만 쓰이고, 둘 다 실행 중인 Pod에는 영향이 없다.
- **Facts:**
  | key | value |
  |---|---|
  | `NoSchedule` / `NoExecute` | 새 Pod 차단 / 실행 중 Pod도 축출 (`tolerationSeconds`만큼 유예) |
  | `required…IgnoredDuringExecution` | 안 맞으면 schedule 안 함; 실행 후 label 변경은 무시 |
  | `preferred…` | `weight` 1–100을 Score에 더함; 안 맞아도 schedule |
- **Event log:** `scheduler · Filter TaintToleration · ip-10-0-1-88: node(s) had untolerated taint(s) · —`
- **After:**
  | node | zone | group | cpu requested / allocatable | 결과 |
  |---|---|---|---|---|
  | `ip-10-0-1-23` (node A) | 2a | general | 330m / 1930m | ✓ |
  | `ip-10-0-2-45` | 2b | general | 330m / 1930m | ✓ |
  | `ip-10-0-3-67` | 2c | general | 330m / 1930m | ✓ |
  | `ip-10-0-1-88` | 2a | batch | 330m / 1930m | ✗ `TaintToleration` (affinity도 불일치) |
- **Sources:**
  - [Taints: effects](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/taint-and-toleration.md#L98-L117), [Dedicated nodes: taint + label + required node affinity](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/taint-and-toleration.md#L250-L260) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Node affinity: required / preferred, IgnoredDuringExecution](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/assign-pod-node.md#L105-L121), [preferred weight](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/assign-pod-node.md#L164-L174) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Managed node groups: `eks.amazonaws.com/capacityType: ON_DEMAND` label](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/managed-node-groups.adoc#L88) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 4.4 `zone-spread` — `topologySpreadConstraints`로 6개를 zone마다 2개씩 · `mutate` scheduler
- **Summary:** zone 기준 `maxSkew: 1`, `DoNotSchedule`이면 replica 6개가 2a·2b·2c에 2개씩 놓인다.
- **Detail:** `maxSkew`는 어떤 zone의 매칭 Pod 수와 전체 최솟값의 차이 상한이다. `DoNotSchedule`(기본)이면 넘치는 배치를 Filter에서 막고, `ScheduleAnyway`면 Score로 줄이려고만 한다. node affinity에 안 맞는 batch node는 skew 계산에서 빠진다. EKS의 AWS 노드에는 AZ를 담은 zone label이 자동으로 붙는다.
- **Facts:**
  | key | value |
  |---|---|
  | `whenUnsatisfiable` | `DoNotSchedule`(기본, Filter) / `ScheduleAnyway`(Score) |
  | required `podAntiAffinity` (`kubernetes.io/hostname`) | 노드당 1개; 노드보다 replica가 많으면 나머지는 Pending |
  | 한계 | scale-down 뒤 균형은 보장 안 됨; 노드가 0개인 zone은 모름 |
- **Event log:** `scheduler · Filter PodTopologySpread · web ×6 → 2a:2 2b:2 2c:2 · —`
- **After:**
  | node | zone | group | cpu requested / allocatable | 결과 |
  |---|---|---|---|---|
  | `ip-10-0-1-23` (node A) | 2a | general | 1330m / 1930m | `web` 2개 |
  | `ip-10-0-2-45` | 2b | general | 1330m / 1930m | `web` 2개 |
  | `ip-10-0-3-67` | 2c | general | 1330m / 1930m | `web` 2개 |
  | `ip-10-0-1-88` | 2a | batch | 330m / 1930m | ✗ `TaintToleration` |
- **Sources:**
  - [Topology spread: `maxSkew`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/topology-spread-constraints.md#L86-L97), [`whenUnsatisfiable`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/topology-spread-constraints.md#L128-L130), [node affinity skips nodes from skew](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/topology-spread-constraints.md#L445-L448), [required anti-affinity: one Pod per domain](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/topology-spread-constraints.md#L608-L612), [Known limitations](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/topology-spread-constraints.md#L623-L637) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Hybrid nodes webhooks: nodes in AWS get a zone label automatically](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/hybrid-nodes-webhooks.adoc#L71) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 4.5 `insufficient-cpu` — replica 10개로 늘리면 10번째가 Pending · `mutate` scheduler
- **Summary:** general node마다 `web` 3개(1830m)가 차면 10번째는 갈 곳이 없어 `FailedScheduling`으로 Pending이다.
- **Detail:** general node는 330m + 3 × 500m = 1830m이라 500m이 더 들어가지 않는다. batch node는 cpu가 남지만 taint로 막힌다. Pod는 `PodScheduled=False`(`Unschedulable`)로 Pending에 남는다. 해결은 노드 추가(Lesson 11), requests 재조정, 또는 다른 Pod 정리다. requests를 실제보다 크게 잡으면 노드가 비어 보여도 이 메시지가 난다.
- **Facts:**
  | key | value |
  |---|---|
  | 남은 cpu (general) | 1930m − 1830m = 100m < 500m |
  | 메시지 | `0/4 nodes are available: 1 node(s) had untolerated taint(s), 3 Insufficient cpu.` + `preemption: …` |
  | priority/preemption | 높은 priority Pod는 낮은 Pod를 밀어낼 수 있음; 같은 priority면 없음 |
- **Event log:** `scheduler → apiserver · HTTPS REST · Event FailedScheduling web-…-j · —`
- **After:**
  | node | zone | group | cpu requested / allocatable | 결과 |
  |---|---|---|---|---|
  | `ip-10-0-1-23` (node A) | 2a | general | 1830m / 1930m | ✗ Insufficient cpu (`web` 3개) |
  | `ip-10-0-2-45` | 2b | general | 1830m / 1930m | ✗ Insufficient cpu (`web` 3개) |
  | `ip-10-0-3-67` | 2c | general | 1830m / 1930m | ✗ Insufficient cpu (`web` 3개) |
  | `ip-10-0-1-88` | 2a | batch | 330m / 1930m | ✗ `TaintToleration` |
- **Record:** R4.2
- **Sources:**
  - [fit.go: `Insufficient cpu`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/noderesources/fit.go#L733-L742), [framework/types.go: message builder](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/types.go#L1468-L1520), [schedule_one.go: FailedScheduling, `PodScheduled=False`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/schedule_one.go#L1252-L1262) — Kubernetes v1.37.1
  - [Troubleshooting `FailedScheduling`: add nodes, terminate Pods, check taints](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/configuration/manage-resources-containers.md#L576-L606), [Scheduling framework: PostFilter = preemption](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L104-L110) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 4.6 `cri-resources` — kubelet이 requests·limits를 cgroup 값으로 바꿔 보낸다 · `move` kubelet → containerd · token `call`: `CreateContainer` (`linux.resources`)
- **Summary:** kubelet은 cpu request → `cpu_shares`, cpu limit → CFS quota, memory limit → 바이트로 바꿔 넘긴다.
- **Detail:** 노드에 놓인 Pod의 `CreateContainer`에는 `LinuxContainerResources`가 실린다. cpu request 500m → `cpu_shares` 512, cpu limit 1 → `cpu_quota` 100000µs / `cpu_period` 100000µs, memory limit 512Mi → 536870912 바이트다. `oom_score_adj`도 QoS로 정한다. memory request는 cgroup 상한이 아니라 scheduling과 eviction 순위에 쓰인다.
- **Facts:**
  | key | value |
  |---|---|
  | cpu request | 경쟁 시 가중치 (`cpu_shares` = milliCPU × 1024 / 1000) |
  | cpu limit | `cpu_quota` = limit × period; period 기본 100ms |
  | memory limit | `memory_limit_in_bytes`; 넘으면 kernel OOM |
- **Event log:** `kubelet → containerd · CRI gRPC · CreateContainer web cpu_shares=512 cpu_quota=100000 memory_limit_in_bytes=536870912 · —`
- **Record:** R4.3
- **Sources:**
  - [kuberuntime_container_linux.go: `calculateLinuxResources`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/kuberuntime/kuberuntime_container_linux.go#L355-L391), [`OomScoreAdj` from QoS](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/kuberuntime/kuberuntime_container_linux.go#L192-L194), [helpers_linux.go: shares, `QuotaPeriod` 100000](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/cm/helpers_linux.go#L100-L104), [`MilliCPUToQuota`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/cm/helpers_linux.go#L117-L139), [`MilliCPUToShares`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/cm/helpers_linux.go#L144-L160), [CRI `LinuxContainerResources`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L982-L1005) — Kubernetes v1.37.1
  - [Manage resources: how requests and limits are applied](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/configuration/manage-resources-containers.md#L263-L283) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 4.7 `cpu-throttle` — CPU limit을 넘으려 하면 throttling, 죽지 않는다 · `mutate` pod
- **Summary:** 부하가 1 core를 넘으려 하면 kernel이 CFS quota로 멈춰 세운다. 컨테이너는 죽지 않고 느려진다.
- **Detail:** CPU limit은 hard limit이다. 100ms period마다 quota(여기선 100ms)를 다 쓰면 cgroup은 다음 period까지 기다린다. 그래서 응답 지연이 늘지만 restart는 없다. runtime은 CPU 과사용으로 컨테이너를 죽이지 않는다. CPU request는 노드가 붐빌 때 나눠 갖는 비율일 뿐 상한이 아니다.
- **Facts:**
  | key | value |
  |---|---|
  | CPU limit 초과 | throttling (CFS quota), kill 없음 |
  | 증상 | 지연 증가; `restartCount` 그대로 |
  | CPU request | contended 노드에서의 가중치 |
- **Event log:** `pod · cgroup cpu · quota 소진 → throttled (E.G.) · —`
- **After:**
  | field | value |
  |---|---|
  | `requests` | cpu 500m / mem 512Mi |
  | `limits` | cpu 1 / mem 512Mi |
  | `qosClass` | Burstable |
  | `CPU` | 1 core에서 throttled (E.G.) |
  | `state` | running |
  | `lastState` | — |
  | `restartCount` | 0 |
- **Sources:**
  - [Manage resources: cpu limits enforced by throttling](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/configuration/manage-resources-containers.md#L43-L46), [runtimes don't terminate for excessive CPU](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/configuration/manage-resources-containers.md#L294-L295) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Resource managers: kubelet uses CFS quota for CPU limits](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/resource-management/resource-managers.md#L42-L46), [kubelet config: `cpuCFSQuota` true, `cpuCFSQuotaPeriod` 100ms](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/config-api/kubelet-config.v1beta1.md#L1148-L1164) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 4.8 `oom-killed` — memory limit을 넘으면 `OOMKilled` (137) 후 재시작 · `mutate` pod
- **Summary:** memory가 512Mi limit을 넘으면 kernel이 컨테이너를 죽인다. `OOMKilled`, exit code 137, 그리고 재시작이다.
- **Detail:** memory limit은 kernel의 OOM kill로 강제된다. 죽은 기록은 `lastState.terminated`(reason `OOMKilled`, exit code 137)에 남고 `restartCount`가 오른다. Deployment Pod의 `restartPolicy`는 `Always`라 kubelet이 같은 노드에서 다시 띄운다. 반복되면 10s, 20s, 40s…최대 300s back-off로 `CrashLoopBackOff`가 보인다. 이것은 eviction이 아니다.
- **Facts:**
  | key | value |
  |---|---|
  | 확인 | `kubectl describe pod`: `Last State: Terminated`, `Reason: OOMKilled`, `Exit Code: 137` |
  | 재시작 | `restartPolicy: Always`; back-off 10s → … → 300s 상한, 10분 정상 실행 시 초기화 |
  | 대응 | 누수 확인, 그다음 memory limit(과 request) 상향 |
- **Event log:** `pod · kernel OOM · container web killed (OOMKilled, 137) → kubelet restart · —`
- **After:**
  | field | value |
  |---|---|
  | `requests` | cpu 500m / mem 512Mi |
  | `limits` | cpu 1 / mem 512Mi |
  | `qosClass` | Burstable |
  | `CPU` | — |
  | `state` | running (재시작됨) |
  | `lastState` | terminated: `OOMKilled`, exitCode 137 |
  | `restartCount` | 1 |
- **Record:** R4.4
- **Sources:**
  - [Manage resources: memory limits enforced by OOM kills](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/configuration/manage-resources-containers.md#L48-L53), [My container is terminated: `OOMKilled`, exit code 137](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/configuration/manage-resources-containers.md#L670-L725) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Pod lifecycle: restart back-off 10s…300s, reset after 10 min](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L384-L389), [CrashLoopBackOff](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L197-L211), [Deployment: only `restartPolicy: Always`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L1135-L1136) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 4.9 `memory-pressure` — 노드 전체 메모리가 바닥나면 `MemoryPressure` · `mutate` kubelet
- **Summary:** node A의 `memory.available`이 hard threshold 100Mi 아래면 kubelet이 `MemoryPressure=True`를 보고한다.
- **Detail:** 각 Pod가 limit 안에 있어도 limit 합이 노드 메모리를 넘으면 노드가 모자랄 수 있다. kubelet은 `memory.available`(capacity − working set)을 threshold와 비교한다. EKS AMI의 hard threshold는 100Mi다. 넘으면 `MemoryPressure=True`가 되고 control plane이 `node.kubernetes.io/memory-pressure:NoSchedule` taint를 붙여 새 `BestEffort` Pod를 막는다.
- **Facts:**
  | key | value |
  |---|---|
  | 신호 | `memory.available` := capacity − workingSet |
  | EKS AMI `evictionHard` | `memory.available` 100Mi, `nodefs.available` 10%, `nodefs.inodesFree` 5% |
  | taint | `node.kubernetes.io/memory-pressure:NoSchedule`; `Guaranteed`·`Burstable`은 자동 toleration |
- **Event log:** `kubelet → apiserver · HTTPS REST · Node ip-10-0-1-23 MemoryPressure=True · —`
- **After:**
  | item | value |
  |---|---|
  | `memory.available` | 80Mi (E.G.) < 100Mi |
  | `MemoryPressure` | True |
  | node taint | `node.kubernetes.io/memory-pressure:NoSchedule` |
  | 축출 순위 | 계산 중 |
- **Sources:**
  - [Node-pressure eviction: signals](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/node-pressure-eviction.md#L62-L73), [hard thresholds and defaults](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/node-pressure-eviction.md#L225-L241), [node conditions](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/node-pressure-eviction.md#L270-L285) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Taint nodes by condition: memory-pressure taint, toleration for non-BestEffort](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/taint-and-toleration.md#L366-L385) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [nodeadm kubelet config: `evictionHard`](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/config.go#L116-L120) — amazon-eks-ami v20261031

#### 4.10 `evict` — requests를 넘겨 쓰는 Pod부터 내보낸다 · `mutate` kubelet
- **Summary:** kubelet은 사용량이 requests를 넘은 Pod부터, priority와 초과량 순으로 내보낸다. `web`은 request 이하라 마지막이다.
- **Detail:** 순서는 ① usage > requests인지 ② priority ③ requests 대비 초과량이다. requests가 없는 `BestEffort`가 먼저, request보다 많이 쓰는 `Burstable`이 다음, `Guaranteed`와 request 이하 `Burstable`이 마지막이다. hard threshold면 grace 0s로 죽이고 PDB도 보지 않는다. Pod는 `Failed`/`Evicted`가 되고 Deployment가 다른 노드에 새 Pod를 만든다.
- **Facts:**
  | key | value |
  |---|---|
  | 순위 | usage > requests → priority → 초과량 |
  | hard eviction | grace period 0s, `PodDisruptionBudget` 무시 |
  | 결과 | `status.phase: Failed`, `reason: Evicted`; ReplicaSet이 대체 Pod 생성 |
- **Event log:** `kubelet → apiserver · HTTPS REST · Event Evicted + Pod report-…-x phase=Failed reason=Evicted · —`
- **After:**
  | item | value |
  |---|---|
  | `memory.available` | 회복 (E.G. 3.4Gi) |
  | `MemoryPressure` | True (전이 대기 기본 5m) |
  | node taint | `node.kubernetes.io/memory-pressure:NoSchedule` |
  | 축출 순위 | 1 `report-…-x` BestEffort, 사용 3.3Gi > req 0 → **Evicted** · 2 `api-…-y` Burstable, 사용 1.5Gi > req 256Mi · 마지막 `web-…` ×3 Burstable, 사용 ≤ req 512Mi (E.G.) |
- **Record:** R4.5
- **Sources:**
  - [Node-pressure eviction: Pod selection order](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/node-pressure-eviction.md#L338-L363), [phase `Failed`, no PDB, hard = 0s](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/node-pressure-eviction.md#L16-L26), [Deployment replaces evicted Pods](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/node-pressure-eviction.md#L34-L38), [condition transition period 5m](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/node-pressure-eviction.md#L296-L298) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [eviction helpers.go: reason `Evicted`, message formats](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/eviction/helpers.go#L41-L52), [eviction_manager.go: event, `Failed`, reason](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/eviction/eviction_manager.go#L641-L649) — Kubernetes v1.37.1

**Replay.** apiserver (`qosClass: Burstable`) → scheduler (requests 500m vs allocatable 1930m) → scheduler (batch: taint ✗) → scheduler (zone 2·2·2) → scheduler (10번째: `3 Insufficient cpu` → Pending) → kubelet → containerd (`cpu_shares` 512, `cpu_quota` 100000, `memory_limit_in_bytes` 512Mi) → pod (1 core 초과: throttled) → pod (512Mi 초과: `OOMKilled` 137, restart) → kubelet (`MemoryPressure`) → kubelet (BestEffort부터 `Evicted`)

**Overview.** 한 문장으로: requests는 자리(scheduling)와 순위(eviction)를, limits는 상한(throttling, OOM kill)을 정한다.
Container limit을 넘은 OOM kill(4.8)은 kubelet이 같은 Pod 안에서 재시작하고, node-pressure eviction(4.10)은 Pod 자체를 `Failed`로 끝낸다([node-pressure-eviction.md](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/node-pressure-eviction.md#L478-L479)).
kubelet보다 먼저 노드가 OOM에 빠지면 kernel이 `oom_score_adj`(Guaranteed −997, BestEffort 1000, Burstable은 memory request 비율로 2–999)가 높은 컨테이너부터 죽인다([node-pressure-eviction.md](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/node-pressure-eviction.md#L451-L476), [qos/policy.go](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/qos/policy.go#L35-L36)).
Priority와 preemption은 한 줄만: 높은 `priorityClassName`의 Pending Pod는 PostFilter에서 낮은 priority Pod를 밀어낼 수 있다([scheduling-framework.md](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L104-L110)).
`topologySpreadConstraints`를 쓰지 않아도 scheduler는 hostname `maxSkew: 3`, zone `maxSkew: 5`의 `ScheduleAnyway` 기본 제약을 쓴다([topology-spread-constraints.md](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/topology-spread-constraints.md#L550-L565)).

### Decoder records

#### R4.1 Pod `resources`와 `status.qosClass` · step 4.1 · wire: true
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-6b7f9c5d8-a1b2c
  labels: {app: web}
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - {key: eks.amazonaws.com/capacityType, operator: In, values: [ON_DEMAND]}
  topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector: {matchLabels: {app: web}}
  containers:
  - name: web
    resources:
      requests: {cpu: 500m, memory: 512Mi}
      limits:   {cpu: "1", memory: 512Mi}
status:
  phase: Pending
  qosClass: Burstable
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `resources.requests` | cpu 500m, memory 512Mi | scheduling(Filter)과 eviction 순위의 기준 | E.G. |
| `resources.limits` | cpu 1, memory 512Mi | throttling 상한, OOM kill 상한 | E.G. |
| `status.qosClass` | `Burstable` | cpu request ≠ limit → Guaranteed 아님 | |
| `nodeAffinity.required…` | capacityType In ON_DEMAND | Filter에서 SPOT node 제외 | E.G. |
| `topologySpreadConstraints[0].maxSkew` | 1 | zone 간 매칭 Pod 수 차이 상한 | E.G. |
| `topologySpreadConstraints[0].whenUnsatisfiable` | `DoNotSchedule` | 못 맞추면 schedule 안 함 (기본) | |
| `topologySpreadConstraints[0].labelSelector` | `app: web` | 셀 Pod; 자기 label과 맞아야 함 | E.G. |

Sources: [quality-service-pod.md: resources and `qosClass` output](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/configure-pod-container/quality-service-pod.md#L84-L98), [topology-spread-constraints.md: field layout](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/topology-spread-constraints.md#L48-L74), [selector must match own labels](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/topology-spread-constraints.md#L642-L649) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976); [core/v1 `qosClass`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L5700) — Kubernetes v1.37.1; [EKS `eks.amazonaws.com/capacityType`](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/managed-node-groups.adoc#L88) — Amazon EKS User Guide @ 8d43223 (2026-09-16).

#### R4.2 `kubectl describe pod` (10번째 replica) · step 4.5 · wire: false
```text
$ kubectl describe pod web-6b7f9c5d8-j9k8l
Status:           Pending
QoS Class:        Burstable
Conditions:
  Type           Status
  PodScheduled   False
Events:
  Type     Reason            Age   From               Message
  ----     ------            ----  ----               -------
  Warning  FailedScheduling  8s    default-scheduler  0/4 nodes are available: 1 node(s) had untolerated taint(s), 3 Insufficient cpu. preemption: …
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `Status` | `Pending` | 아직 노드 없음 | |
| `QoS Class` | `Burstable` | `status.qosClass` | |
| `PodScheduled` | `False` | reason `Unschedulable` | |
| `0/4 nodes are available` | 노드 4대 모두 거부 | `0/<전체 노드 수>` | E.G. |
| `3 Insufficient cpu` | general 3대 | requests 합 + 500m > allocatable | E.G. |
| `1 node(s) had untolerated taint(s)` | batch 1대 | `NoSchedule` taint, toleration 없음 | E.G. |

Sources: [framework/types.go L1468-L1520](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/types.go#L1468-L1520), [fit.go L733-L742](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/noderesources/fit.go#L733-L742), [taint_toleration.go L133](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/tainttoleration/taint_toleration.go#L133) — Kubernetes v1.37.1; [manage-resources-containers.md: describe Events](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/configuration/manage-resources-containers.md#L584-L592) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976). The docs sample shortens the message (`0/42 nodes available: insufficient cpu`); the record follows the v1.37.1 source format. The `QoS Class` line position in `kubectl describe` output is not checked; the `preemption: …` tail is not traced.

#### R4.3 CRI `CreateContainerRequest` (`linux.resources`) · step 4.6 · wire: true
```text
runtime.v1.RuntimeService/CreateContainer
CreateContainerRequest {
  pod_sandbox_id: "3b1f…e9"
  config: ContainerConfig {
    metadata { name: "web" attempt: 0 }
    linux: LinuxContainerConfig {
      resources: LinuxContainerResources {
        cpu_period: 100000
        cpu_quota: 100000
        cpu_shares: 512
        memory_limit_in_bytes: 536870912
        oom_score_adj: 934
      }
    }
  }
}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `cpu_period` | 100000 (µs) | CFS period 100ms | |
| `cpu_quota` | 100000 (µs) | limit 1 cpu × period; 다 쓰면 throttling | |
| `cpu_shares` | 512 | request 500m × 1024 / 1000; 경쟁 시 비율 | |
| `memory_limit_in_bytes` | 536870912 | 512Mi; 넘으면 kernel OOM kill | |
| `oom_score_adj` | 934 | Burstable: 1000 − 1000 × memReq / 노드 memory capacity | E.G. |
| `pod_sandbox_id` | 64-hex ID | `RunPodSandbox`가 돌려준 sandbox (Lesson 3) | E.G. |

Sources: [api.proto `CreateContainerRequest`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L1390-L1395), [`LinuxContainerConfig`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L1122-L1124), [`LinuxContainerResources`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L982-L1005), [calculateLinuxResources](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/kuberuntime/kuberuntime_container_linux.go#L355-L391), [helpers_linux.go](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/cm/helpers_linux.go#L100-L160), [qos/policy.go: Burstable formula](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/qos/policy.go#L86) — Kubernetes v1.37.1. `oom_score_adj` 934 assumes a node memory capacity of about 7.6Gi (E.G.). On cgroup v2 nodes (AL2023) the runtime maps these values to cgroup v2 files; that mapping is in containerd/runc, not checked here.

#### R4.4 Pod `containerStatuses` after `OOMKilled` · step 4.8 · wire: true
```yaml
status:
  phase: Running
  qosClass: Burstable
  containerStatuses:
  - name: web
    ready: true
    restartCount: 1
    state:
      running: {startedAt: "2026-11-03T12:10:21Z"}
    lastState:
      terminated:
        reason: OOMKilled
        exitCode: 137
        startedAt: "2026-11-03T12:00:04Z"
        finishedAt: "2026-11-03T12:10:11Z"
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `lastState.terminated.reason` | `OOMKilled` | memory limit 초과로 kernel이 죽임 | |
| `lastState.terminated.exitCode` | 137 | 문서 예시와 같은 종료 코드 | |
| `restartCount` | 1 | 같은 Pod 안의 컨테이너 재시작 횟수 | E.G. |
| `state.running.startedAt` | 시각 | 재시작된 컨테이너 시작 시각 | E.G. |
| `status.phase` | `Running` | Pod는 끝나지 않음 (eviction과 다름) | |

Sources: [core/v1 `ContainerStateTerminated`: `exitCode`, `reason`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L3496-L3504), [`lastState`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L3547), [`restartCount`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L3560) — Kubernetes v1.37.1; [manage-resources-containers.md: `OOMKilled`, Exit Code 137, Restart Count](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/configuration/manage-resources-containers.md#L697-L721) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976).

#### R4.5 Evicted Pod status · step 4.10 · wire: true
```yaml
metadata:
  name: report-5d4c3b2a1-x7y8z
status:
  phase: Failed
  reason: Evicted
  message: 'The node was low on resource: memory. Container report was using 3.3Gi, request is 0, has larger consumption of memory. '
  qosClass: BestEffort
  conditions:
  - type: DisruptionTarget
    status: "True"
    reason: TerminationByKubelet
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `status.phase` | `Failed` | node-pressure eviction은 Pod를 끝냄 | |
| `status.reason` | `Evicted` | kubelet eviction manager | |
| `status.message` | `The node was low on resource: memory. …` | 부족한 자원 + request 초과 container | E.G. |
| `conditions[DisruptionTarget].reason` | `TerminationByKubelet` | kubelet이 시작한 종료 | |
| `status.qosClass` | `BestEffort` | requests 없음 → 1순위 후보 | |

Sources: [eviction helpers.go: `Evicted`, message formats](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/eviction/helpers.go#L41-L52), [eviction_manager.go: `DisruptionTarget` / `TerminationByKubelet`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/eviction/eviction_manager.go#L438-L446), [evictPod: `Failed`, reason, message](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/eviction/eviction_manager.go#L641-L649), [core/v1 `PodStatus` `phase`/`message`/`reason`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L5609-L5624) — Kubernetes v1.37.1. The exact quantity format inside the message (`3.3Gi`, `0`) is E.G.

### Self-check
1. **Q.** 노드 CPU 사용률이 20%인데 새 Pod가 `Insufficient cpu`로 Pending이다. 왜인가? **A.** scheduler는 사용량이 아니라 이미 배정된 Pod requests 합 + 새 Pod requests를 allocatable과 비교한다. requests가 실제보다 크면 노드가 한가해 보여도 자리가 없다.
2. **Q.** `requests: {cpu: 500m, memory: 512Mi}`, `limits: {cpu: 1, memory: 512Mi}`인 Pod의 QoS는? `Guaranteed`로 만들려면? **A.** `Burstable`. 모든 container에서 cpu와 memory 둘 다 request = limit이어야 `Guaranteed`이므로 cpu request를 1로 올리거나 cpu limit을 500m으로 맞춘다.
3. **Q.** CPU limit 초과와 memory limit 초과의 결과 차이는? **A.** CPU는 CFS quota throttling으로 느려질 뿐 죽지 않는다. memory는 kernel OOM kill로 컨테이너가 죽고 `OOMKilled`, exit code 137이 `lastState`에 남으며 `restartPolicy: Always`로 재시작된다.
4. **Q.** dedicated batch node에 batch Pod만, 그리고 batch Pod는 batch node에만 가게 하려면? **A.** batch node에 `NoSchedule` taint와 label을 붙이고, batch Pod에 toleration과 그 label에 대한 required node affinity를 함께 준다. taint는 밀어내기만, affinity는 끌어당기기만 한다.
5. **Q.** 노드 메모리 압박 때 kubelet의 eviction 순서는? `OOMKilled`와 무엇이 다른가? **A.** usage > requests인 Pod부터(BestEffort, 초과 Burstable), priority, 초과량 순이고, `Guaranteed`와 request 이하 Pod는 마지막이다. eviction은 Pod를 `Failed`/`Evicted`로 끝내고 Deployment가 새 Pod를 만든다. `OOMKilled`는 container limit 초과로 같은 Pod 안에서 재시작된다.

### Unverified
- 노드마다 이미 배정된 requests 330m(`aws-node`, `kube-proxy` 등 DaemonSet)은 EKS add-on manifest에서 확인하지 않았다 → E.G.
- `m7i.large`의 kubelet memory capacity(물리 8192MiB보다 작은 값)와 그에 따른 allocatable memory, `oom_score_adj` 934는 계산 예시일 뿐이다 → E.G.
- `kubectl describe pod` 출력에서 `QoS Class` 줄의 위치와 FailedScheduling 메시지의 `preemption: …` 문구는 추적하지 않았다.
- `OOMKilled` reason은 container runtime(containerd)이 보고하는 값이다. containerd 2.3.5 소스 줄은 pin하지 않았고, Kubernetes 문서 예시만 근거다.

## Lesson 5 — `vpc-cni`: Pod 하나가 VPC IP를 받기까지 (Amazon VPC CNI)

**Critical path.** `kubelet` → `containerd` → `aws-cni` → `ipamd` warm pool의 secondary IP → veth + route → pool 부족 시 ENI 추가 → 한도 초과 시 IP 고갈

**Goal.** m5.large 노드 하나에서 Pod IP가 `ipamd`가 미리 채운 warm pool(VPC subnet의 실제 주소)에서 나오고, pool과 ENI 한도가 max Pods 29와 IP 고갈 장애를 정한다는 흐름을 그릴 수 있게 합니다.

**Interview questions.**
- EKS의 Pod IP는 어디서 오나요? CNI binary는 왜 EC2 API를 직접 부르지 않나요?
- 기본값 `WARM_ENI_TARGET=1`에서 Pod 1개만 떠도 ENI가 2개가 되는 이유는?
- m5.large의 max Pods는 왜 29이고, `+2`는 무엇인가요?
- Pod가 `ContainerCreating`에서 "failed to assign an IP address to container"로 멈추면 무엇을 의심하나요? prefix delegation은 무엇을 해결하고 무엇은 해결하지 못하나요?

**Nodes.** critical path: `cni`, `ec2api`, `eni`, `kubelet`, `containerd`, `pod` · side: `scheduler` (positions from Topic layout)

**State panels.**
| node | title | view | initial |
|---|---|---|---|
| `eni` | node A ENI / IP pool (`ipamd` datastore) | table: ENI (device) · 주소 · 종류 · 상태 | `eni-…0001` (device 0) primary IP `10.0.64.10` 한 줄. Pod용 IP 0개 |
| `pod` | Pod `default/web-0` 네트워크 (Pod netns + host) | table: 위치 · 항목 · 값 | (없음: sandbox 전) |

Scenario (all E.G.): AL2023 managed node group, `m5.large`, VPC CNI `v1.23.1` 기본 설정(prefix delegation off). Node subnet `10.0.64.0/19`, instance `i-0abc1234def567890`. EC2는 subnet 아무 곳에서나 IP를 고르므로 아래 IP들은 예시입니다.

### Steps

#### 5.1 `fill-pool` — `ipamd`가 primary ENI를 secondary IP로 채움 · `move` cni → ec2api · token `call`: `AssignPrivateIpAddresses`
- **Summary:** 노드는 ENI 하나로 시작합니다. `ipamd`가 EC2 API로 그 ENI에 secondary IP 9개를 붙입니다.
- **Detail:** `aws-node`는 CNI binary와 노드별 IPAM daemon `ipamd` 두 부분입니다. pool이 목표보다 적으면 `ipamd`는 먼저 기존 ENI에 IP를 더 붙이고, 자리가 없을 때만 새 ENI를 만듭니다. `m5.large`는 ENI 3개, ENI당 IPv4 10개이고 각 ENI의 primary IP는 Pod에 주지 않으므로 9개를 요청합니다. 이 호출이 VPC subnet의 실제 주소를 가져옵니다.
- **Facts:**
  | key | value |
  |---|---|
  | `m5.large` 한도 | ENI `3`, ENI당 IPv4 `10` |
  | Pod용 IP per ENI | `10 − 1 = 9` (ENI primary IP 제외) |
  | IAM (IPv4 cluster) | `AmazonEKS_CNI_Policy` 권한 필요 |
- **Event log:** `cni → ec2api · EC2 API (HTTPS) · AssignPrivateIpAddresses eni-…0001 SecondaryPrivateIpAddressCount=9 · —`
- **Sources:**
  - [README: Components (CNI plugin + `ipamd`)](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L45-L52) — Amazon VPC CNI v1.23.1
  - [README: ENI Allocation — node joins with 1 ENI](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L81-L84) — Amazon VPC CNI v1.23.1
  - [vpc_ip_resource_limit.go: `"m5.large"` ENILimit 3, IPv4Limit 10](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/vpc/vpc_ip_resource_limit.go#L7369-L7381) — Amazon VPC CNI v1.23.1
  - [awsutils.go `GetENIIPv4Limit()`: primary IP 제외 (−1)](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L1970-L1977) — Amazon VPC CNI v1.23.1
  - [ipamd.go `increaseDatastorePool()`: 기존 ENI 먼저, 그다음 새 ENI](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L968-L1010) — Amazon VPC CNI v1.23.1
  - [ipamd.go `tryAssignIPs()`: ENI를 `maxIPsPerENI`까지 채움](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L1115-L1135) — Amazon VPC CNI v1.23.1
  - [awsutils.go `AllocIPAddresses()`: `SecondaryPrivateIpAddressCount`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L2044-L2077) — Amazon VPC CNI v1.23.1
  - [cni-iam-role.adoc: IPv4는 `AmazonEKS_CNI_Policy`](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/cni-iam-role.adoc#L22) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 5.2 `warm-pool` — free IP 9개짜리 warm pool · `mutate` eni
- **Summary:** Pod가 하나도 없어도 IP 9개가 노드에 붙어 있습니다. 이것이 `WARM_ENI_TARGET=1`의 뜻입니다.
- **Detail:** 기본값 `WARM_ENI_TARGET=1`은 "ENI 하나 분량의 free IP"를 늘 남겨 두라는 뜻입니다. `ipamd`는 주기적으로 pool을 검사해 free가 `ENI당 IP × WARM_ENI_TARGET`보다 적으면 부족으로 판정하고 EC2를 부릅니다. 지금은 free 9, 목표 9라 충족입니다. EC2 호출을 Pod 생성 경로 밖으로 빼려고 미리 채워 두는 것입니다.
- **Facts:**
  | key | value |
  |---|---|
  | `WARM_ENI_TARGET` | default `1` |
  | 부족 판정 | `available < maxIPsPerENI × WARM_ENI_TARGET` |
  | `WARM_IP_TARGET` 설정 시 | `WARM_ENI_TARGET`은 무시됨 |
- **Event log:** `ec2api → cni · EC2 API (HTTPS) · AssignPrivateIpAddresses OK, 9 IPs → datastore +9 free · —`
- **After:**
  | ENI (device) | 주소 | 종류 | 상태 |
  |---|---|---|---|
  | `eni-…0001` (0) | `10.0.64.10` | ENI primary IP | 노드용, Pod에 안 줌 |
  | `eni-…0001` (0) | `10.0.64.21`, `10.0.64.37` 외 7개 | secondary `/32` × 9 | free |
  | 합계 | Pod용 9 · assigned 0 · free 9 | 목표 free ≥ 9 × 1 | 충족 |
- **Sources:**
  - [README: `WARM_ENI_TARGET` default 1, `WARM_IP_TARGET`이면 무시](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L277-L293) — Amazon VPC CNI v1.23.1
  - [eni-and-ip-target.md: gRPC to `ipamd`, "a full ENI" of IPs, periodic check](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/eni-and-ip-target.md#L1-L11) — Amazon VPC CNI v1.23.1
  - [ipamd.go `isDatastorePoolTooLow()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L2623-L2656) — Amazon VPC CNI v1.23.1

#### 5.3 `sandbox` — kubelet이 Pod sandbox를 요청 · `move` kubelet → containerd · token `call`: `RunPodSandbox`
- **Summary:** scheduler가 `web-0`을 이 노드에 배정하면 kubelet이 CRI로 sandbox 생성을 요청합니다.
- **Detail:** Pod 네트워크를 붙이는 주체는 kubelet이 아니라 container runtime입니다. Kubernetes 1.24에서 kubelet의 CNI flag가 제거되었고, 이제 `containerd`가 CNI 설정을 읽어 plugin을 부릅니다. `RunPodSandbox`는 성공하면 sandbox가 ready여야 하므로, Pod가 IP를 못 받으면 이 호출이 실패하고 kubelet이 다시 시도합니다.
- **Facts:**
  | key | value |
  |---|---|
  | CRI RPC | `RuntimeService.RunPodSandbox` |
  | CNI를 부르는 쪽 | container runtime (`containerd`) |
- **Event log:** `kubelet → containerd · CRI (gRPC) · RunPodSandbox default/web-0 · —`
- **Sources:**
  - [api.proto: `RunPodSandbox` — sandbox must be ready on success](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L28-L30) — Kubernetes v1.37.1
  - [network-plugins.md: runtime loads CNI; kubelet flags removed in 1.24](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins.md#L33-L41) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [ml-cluster-setup-cli.adoc: `FailedCreatePodSandBox` while VPC CNI is not ready; kubelet retries](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/ml/ml-cluster-setup-cli.adoc#L856) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 5.4 `cni-add` — `aws-cni ADD`, 그리고 gRPC `AddNetwork` · `move` containerd → cni · token `request`: `CNI ADD → AddNetwork`
- **Summary:** containerd가 `aws-cni`를 ADD로 실행합니다. binary는 IP를 고르지 않고 `ipamd`에 gRPC로 묻습니다.
- **Detail:** containerd는 Pod netns를 만들고 `/opt/cni/bin/aws-cni`를 `ADD` 명령으로 실행합니다. 짧게 사는 이 binary는 Unix socket `/var/run/aws-node/ipamd.sock`으로 `ipamd`에 `AddNetwork`(Pod 이름, namespace, container ID, netns, ifname)를 보냅니다. pool에 free IP가 없으면 `ipamd`는 EC2를 기다리지 않고 바로 오류를 돌려줍니다.
- **Facts:**
  | key | value |
  |---|---|
  | binary | `/opt/cni/bin/aws-cni` |
  | transport | gRPC over `unix:///var/run/aws-node/ipamd.sock` |
  | pool이 비었을 때 | 즉시 오류 반환 |
- **Event log:** `containerd → cni · CNI exec → gRPC (unix socket) · ADD default/web-0 → AddNetwork · —`
- **Sources:**
  - [eni-and-ip-target.md: CNI binary calls `ipamd` over gRPC; error if no IP in cache](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/eni-and-ip-target.md#L3-L8) — Amazon VPC CNI v1.23.1
  - [cni.go: `ipamdSocketPath`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L48-L50) — Amazon VPC CNI v1.23.1
  - [cni.go `dialIPAMD()` and `AddNetwork` call](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L139-L222) — Amazon VPC CNI v1.23.1
  - [rpc_handler.go: `ipamdGRPCSocketPath`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/rpc_handler.go#L46-L47) — Amazon VPC CNI v1.23.1

#### 5.5 `assign-ip` — IP 하나 배정, free 8 < 목표 9 · `mutate` eni
- **Summary:** `10.0.64.21`이 `web-0`의 것이 됩니다. free가 8이 되면서 pool은 "부족"으로 바뀝니다.
- **Detail:** `ipamd`는 free IP 하나를 골라 Pod에 기록하고, IP와 그 IP가 속한 ENI의 device number, host route table 번호를 돌려줍니다. device 0 ENI의 IP는 table `main`을 씁니다. 이제 free 8 < 9 × 1이므로 다음 pool 검사에서 증설이 시작되고, primary ENI에는 남은 자리가 없으니 새 ENI가 필요합니다.
- **Facts:**
  | key | value |
  |---|---|
  | reply field | `Success`, `IPv4Addr`, `DeviceNumber`, `RouteTableId` |
  | route table | device 0 → `main`, device N (card 0) → `N + 1` |
  | 판정 | `available 8 < 9 × 1` → low |
- **Event log:** `cni (ipamd) → cni (aws-cni) · gRPC reply · AddNetworkReply Success 10.0.64.21 device=0 table=main · —`
- **After:**
  | ENI (device) | 주소 | 종류 | 상태 |
  |---|---|---|---|
  | `eni-…0001` (0) | `10.0.64.10` | ENI primary IP | 노드용, Pod에 안 줌 |
  | `eni-…0001` (0) | `10.0.64.21` | secondary `/32` | `default/web-0` |
  | `eni-…0001` (0) | `10.0.64.37` 외 7개 | secondary `/32` × 8 | free |
  | 합계 | Pod용 9 · assigned 1 · free 8 | 목표 free ≥ 9 × 1 | **부족 (low)** |
- **Record:** R5.1
- **Sources:**
  - [rpc.proto: `AddNetworkRequest`, `IPAllocationMetadata`, `AddNetworkReply`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/rpc/rpc.proto#L14-L50) — Amazon VPC CNI v1.23.1
  - [rpc_handler.go: `AssignPodIPAddress` → `IPAllocationMetadata`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/rpc_handler.go#L230-L250) — Amazon VPC CNI v1.23.1
  - [helper.go `CalculateRouteTableId()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/helper.go#L18-L26) — Amazon VPC CNI v1.23.1
  - [ipamd.go `isDatastorePoolTooLow()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L2623-L2656) — Amazon VPC CNI v1.23.1
  - [ipamd.go `increaseDatastorePool()`: 기존 ENI에 자리가 없으면 새 ENI](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L993-L1007) — Amazon VPC CNI v1.23.1

#### 5.6 `wire-veth` — veth, host `/32` route, `ip rule` · `mutate` pod
- **Summary:** bridge도 overlay도 없습니다. `/32` 주소, host route, policy rule로 Pod를 노드에 잇습니다.
- **Detail:** `aws-cni`는 veth pair를 만들어 한쪽을 Pod netns의 `eth0`(`10.0.64.21/32`)로, 다른 쪽을 host의 `eni…`로 둡니다. Pod의 default route는 가짜 next hop `169.254.1.1`입니다. host에는 Pod IP로 가는 `/32` route와 priority `512` rule이 생기고, IP가 secondary ENI 소속이면 priority `1536` `from` rule도 생깁니다. 끝나면 CNI result를 containerd에 돌려줍니다.
- **Facts:**
  | key | value |
  |---|---|
  | host veth 이름 | `eni` + `sha1("<ns>.<pod>")` 앞 11자 |
  | to-Pod rule | priority `512` → table `main` |
  | from-Pod rule | priority `1536`, table ≠ `main`일 때만 |
- **Event log:** `cni → pod · netlink · veth eni0d7763386da↔eth0, 10.0.64.21/32, route + rule 512 · —`
- **After:**
  | 위치 | 항목 | 값 |
  |---|---|---|
  | Pod netns | `eth0` | `10.0.64.21/32` |
  | Pod netns | route | `default via 169.254.1.1 dev eth0` |
  | host | veth | `eni0d7763386da` ↔ Pod `eth0` |
  | host main table | route | `10.0.64.21 dev eni0d7763386da scope link` |
  | host ip rule | `512` | `from all to 10.0.64.21 lookup main` |
  | host ip rule | `1536` | (없음: device 0 IP라 table `main`) |
- **Record:** R5.2
- **Sources:**
  - [names.go `GeneratePodHostVethName()` (sha1, 11 hex)](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/names.go#L12-L26) — Amazon VPC CNI v1.23.1
  - [README: `AWS_VPC_K8S_CNI_VETHPREFIX` default `eni`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L436-L442) — Amazon VPC CNI v1.23.1
  - [driver.go: Pod default route via dummy next hop `169.254.1.1`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/driver/driver.go#L188-L191) and [L241-L251](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/driver/driver.go#L241-L251) — Amazon VPC CNI v1.23.1
  - [driver.go `setupIPBasedContainerRouteRules()`: host route, rule 512, rule 1536](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/driver/driver.go#L526-L565) — Amazon VPC CNI v1.23.1
  - [network.go: rule priority constants](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L53-L80) — Amazon VPC CNI v1.23.1

#### 5.7 `attach-eni` — 새 ENI를 만들어 붙임 · `move` cni → ec2api · token `call`: `CreateNetworkInterface` + `AttachNetworkInterface`
- **Summary:** pool이 부족하면 `ipamd`가 IP 9개를 가진 ENI를 새로 만들어 노드의 device 1에 붙입니다.
- **Detail:** `CreateNetworkInterface`는 노드 security group, subnet, description `aws-K8S-<instance-id>`와 함께 secondary IP 9개를 한 번에 요청합니다. 이어 `AttachNetworkInterface`로 빈 device number에 붙이고 `ModifyNetworkInterfaceAttribute`로 `DeleteOnTermination=true`를 켭니다. 생성과 attach에 최대 10초쯤 걸릴 수 있어, 이 시간을 Pod 생성 경로 밖에서 씁니다.
- **Facts:**
  | key | value |
  |---|---|
  | EC2 호출 | `CreateNetworkInterface` → `AttachNetworkInterface` → `ModifyNetworkInterfaceAttribute` |
  | Description | `aws-K8S-` + instance ID |
  | subnet 선택 | `ENABLE_SUBNET_DISCOVERY=true`(default): 노드 subnet과 `kubernetes.io/role/cni` tag subnet 중 free IP 최다 |
- **Event log:** `cni → ec2api · EC2 API (HTTPS) · CreateNetworkInterface count=9 → AttachNetworkInterface DeviceIndex=1 → ModifyNetworkInterfaceAttribute · —`
- **Record:** R5.3
- **Sources:**
  - [awsutils.go: `eniDescriptionPrefix`, tag keys](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L62-L75) — Amazon VPC CNI v1.23.1
  - [awsutils.go `AllocENI()`: create → attach → DeleteOnTermination](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L978-L1020) — Amazon VPC CNI v1.23.1
  - [awsutils.go `createENIInput()`: `SecondaryPrivateIpAddressCount` / `Ipv4PrefixCount`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L1069-L1095) — Amazon VPC CNI v1.23.1
  - [README: `ENABLE_SUBNET_DISCOVERY`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L547-L554) — Amazon VPC CNI v1.23.1
  - [eni-and-ip-target.md: attaching a new ENI can take up to 10 seconds](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/eni-and-ip-target.md#L52-L54) — Amazon VPC CNI v1.23.1

#### 5.8 `eni1-ready` — device 1 ENI와 route table `2` · `mutate` eni
- **Summary:** pool이 Pod용 18칸(free 17)이 됩니다. 새 ENI의 IP를 받은 Pod는 그 ENI로 나갑니다.
- **Detail:** 새 ENI와 IP가 보이면 `ipamd`는 datastore에 9칸을 더합니다. host에는 device 1용 route table `2`가 생기고, 그 default route는 subnet gateway(subnet 주소 + 1)로 향합니다. 이 ENI의 IP를 받은 Pod에는 `from <podIP> lookup 2`(priority `1536`) rule이 붙어 나가는 트래픽이 같은 ENI를 탑니다. free 17 ≥ 9라 pool은 다시 충족입니다.
- **Facts:**
  | key | value |
  |---|---|
  | route table | device 1 → table `2` |
  | ENI gateway | subnet base + 1 → `10.0.64.1` |
  | pool | Pod용 18 · assigned 1 · free 17 |
- **Event log:** `ec2api → cni · EC2 API (HTTPS) · eni-…0002 attached, 9 IPs → datastore +9 free · —`
- **After:**
  | ENI (device) | 주소 | 종류 | 상태 |
  |---|---|---|---|
  | `eni-…0001` (0) | `10.0.64.10` | ENI primary IP | 노드용, Pod에 안 줌 |
  | `eni-…0001` (0) | `10.0.64.21` | secondary `/32` | `default/web-0` |
  | `eni-…0001` (0) | `10.0.64.37` 외 7개 | secondary `/32` × 8 | free |
  | `eni-…0002` (1) | `10.0.70.15` | ENI primary IP | 노드용, rule `32765` → table `2` |
  | `eni-…0002` (1) | `10.0.70.88` 외 8개 | secondary `/32` × 9 | free |
  | 합계 | Pod용 18 · assigned 1 · free 17 | 목표 free ≥ 9 × 1 | 충족 |
- **Sources:**
  - [helper.go `CalculateRouteTableId()`: device N → N + 1](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/helper.go#L18-L26) — Amazon VPC CNI v1.23.1
  - [network.go `GetIPv4Gateway()`: subnet base + 1](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L935-L939) — Amazon VPC CNI v1.23.1
  - [network.go `setupENINetwork()`: per-ENI table routes, rule 32765](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L1015-L1090) — Amazon VPC CNI v1.23.1
  - [cni-proposal.md: per-ENI route table for Pod outgoing traffic, `ip rule list`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/cni-proposal.md#L105-L121) — Amazon VPC CNI v1.23.1
  - [driver.go: from-Pod rule only when table ≠ main](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/driver/driver.go#L553-L562) — Amazon VPC CNI v1.23.1

#### 5.9 `pool-full` — ENI 3개를 다 쓰면 max Pods 29 · `mutate` eni
- **Summary:** Pod IP 27개(3 × 9)에 `hostNetwork` Pod 2개를 더하면 29. 30번째 Pod는 scheduler가 막습니다.
- **Detail:** Pod가 더 늘면 같은 방식으로 device 2 ENI까지 붙고, 그 뒤에는 ENI 한도라 pool을 더 늘릴 수 없습니다. EKS AMI는 `ENI 수 × (ENI당 IPv4 − 1) + 2`로 kubelet `maxPods`를 정하고, `misc/eni-max-pods.txt`에도 `m5.large 29`가 있습니다. `+2`는 Pod IP를 쓰지 않는 `aws-node`, `kube-proxy` 몫입니다. 30번째 Pod는 `Too many pods`로 `Pending`에 남습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 공식 | `3 × (10 − 1) + 2 = 29` |
  | `+2` | `hostNetwork` Pod (`aws-node`, `kube-proxy`) |
  | MNG (custom AMI 없음) 상한 | vCPU 30 미만 `110`, 그 이상 `250` |
- **Event log:** `scheduler → kubelet · scheduling · Pod #30 → NodeResourcesFit "Too many pods" (node A 제외) · —`
- **After:**
  | ENI (device) | 주소 | 종류 | 상태 |
  |---|---|---|---|
  | `eni-…0001` (0) | `10.0.64.10` | ENI primary IP | 노드용 |
  | `eni-…0001` (0) | `10.0.64.21` 외 8개 | secondary `/32` × 9 | assigned |
  | `eni-…0002` (1) | `10.0.70.15` | ENI primary IP | 노드용 |
  | `eni-…0002` (1) | `10.0.70.88` 외 8개 | secondary `/32` × 9 | assigned |
  | `eni-…0003` (2) | `10.0.75.40` | ENI primary IP | 노드용 |
  | `eni-…0003` (2) | `10.0.75.41` 외 8개 | secondary `/32` × 9 | assigned |
  | 합계 | Pod용 27 · assigned 27 · free 0 | ENI 3 / 3 | 더 늘릴 수 없음 |
- **Record:** R5.4
- **Sources:**
  - [misc/eni-max-pods.txt: formula header](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/misc/eni-max-pods.txt#L33-L37) and [`m5.large 29`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/misc/eni-max-pods.txt#L597) — Amazon VPC CNI v1.23.1
  - [choosing-instance-type.adoc: How maxPods is determined (MNG cap 110/250, `+ 2`)](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/choosing-instance-type.adoc#L60-L70) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [eni_max_pods.go `calculateStandardMaxPods()`](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/eni_max_pods.go#L56-L79) — amazon-eks-ami v20261031
  - [ipamd.go: skip ENI allocation when the max ENI limit is reached](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L997-L1006) — Amazon VPC CNI v1.23.1
  - [noderesources/fit.go: `Too many pods`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/noderesources/fit.go#L713-L722) — Kubernetes v1.37.1
  - [pod-lifecycle.md: `Pending` includes time waiting to be scheduled](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L114) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 5.10 `ip-exhausted` — subnet IP 고갈: Pod가 `ContainerCreating`에 멈춤 · `move` cni → containerd · token `response`: `error: failed to assign an IP address to container`
- **Summary:** pool이 비었는데 EC2도 IP를 못 주면 `AddNetwork`가 실패하고 Pod는 `ContainerCreating`에 머뭅니다.
- **Detail:** 노드가 쓸 수 있는 Pod IP는 `min(N × (M − 1), subnet의 free IP)`입니다. subnet에 free IP가 없으면 EC2가 `InsufficientFreeAddressesInSubnet`을 돌려주고 `ipamd`는 pool을 못 늘립니다. 그 노드의 새 Pod는 `aws-cni`가 `add cmd: failed to assign an IP address to container`로 실패해 sandbox를 못 만듭니다. EC2 API throttling으로 ENI 증설이 backoff 중일 때도 같은 증상입니다.
- **Facts:**
  | key | value |
  |---|---|
  | CNI 오류 | `add cmd: failed to assign an IP address to container` |
  | EC2 오류 코드 | `InsufficientFreeAddressesInSubnet` (prefix 모드: `InsufficientCidrBlocks`) |
  | 증상 | Pod `ContainerCreating`, sandbox 생성 실패 event |
- **Event log:** `cni → containerd · CNI exit (error) · add cmd: failed to assign an IP address to container · —`
- **Record:** R5.5
- **Sources:**
  - [troubleshooting.md: max Pod IPs = `min(N * (M - 1), free IPs in the subnet)`; subnet out of IPs → `ContainerCreating`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/troubleshooting.md#L8-L14) — Amazon VPC CNI v1.23.1
  - [troubleshooting.md: throttled `ipamd` backoff → `ContainerCreating`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/troubleshooting.md#L43-L47) — Amazon VPC CNI v1.23.1
  - [ipamd.go: error codes `InsufficientCidrBlocks`, `InsufficientFreeAddressesInSubnet`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L182-L184) and [`containsInsufficientCIDRsOrSubnetIPs()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L367-L378) — Amazon VPC CNI v1.23.1
  - [data_store.go: `ErrNoAvailableIPInDataStore`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/datastore/data_store.go#L82-L83) — Amazon VPC CNI v1.23.1
  - [cni.go: `add cmd: failed to assign an IP address to container`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L218-L222) — Amazon VPC CNI v1.23.1
  - [sg-pods-example-deployment.adoc: sandbox error text with `failed to assign an IP address to container`](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/sg-pods-example-deployment.adoc#L142-L148) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 5.11 `prefix-delegation` — `/28` prefix로 ENI 슬롯당 IP 16개 · `mutate` eni
- **Summary:** `ENABLE_PREFIX_DELEGATION=true`면 ENI 슬롯 하나에 IP 1개 대신 `/28` prefix(IP 16개)가 들어갑니다.
- **Detail:** Nitro 노드에서 `ipamd`는 secondary IP 대신 `/28` prefix를 요청합니다. `m5.large`는 슬롯 27개 × 16 = 432 IP까지 갖지만 managed node group은 `maxPods`를 상한(vCPU 30 미만 110)으로 묶습니다. subnet에 연속된 `/28`이 없으면 free IP가 있어도 `InsufficientCidrBlocks`로 실패합니다. PD는 노드 상한과 EC2 호출 수를 풀어 주지 subnet 주소를 늘려 주지는 않습니다.
- **Facts:**
  | key | value |
  |---|---|
  | `ENABLE_PREFIX_DELEGATION` | default `false`, Nitro instance만 |
  | `WARM_PREFIX_TARGET` | README: default `None` · `aws-node` manifest: `"1"` (env 없을 때 code: `0`) |
  | 전환 방법 | 기존 노드 rolling 대신 새 node group 권장 |
- **Event log:** `cni → ec2api · EC2 API (HTTPS) · AssignPrivateIpAddresses Ipv4PrefixCount=1 → 10.0.65.0/28 · —`
- **After:** (prefix delegation을 켠 새 node group의 노드, `WARM_PREFIX_TARGET=1`, Pod 1개)
  | ENI (device) | 주소 | 종류 | 상태 |
  |---|---|---|---|
  | `eni-…0101` (0) | `10.0.64.12` | ENI primary IP | 노드용 |
  | `eni-…0101` (0) | `10.0.65.0/28` | prefix (16 IP) | 1 assigned (`default/web-0` = `10.0.65.0`), 15 free |
  | `eni-…0101` (0) | `10.0.65.16/28` | prefix (16 IP) | 16 free (warm prefix 1개) |
  | 합계 | Pod용 32 · assigned 1 · free 31 | 슬롯 27개 중 2개 사용 | 충족 |
- **Record:** R5.6
- **Sources:**
  - [README: `ENABLE_PREFIX_DELEGATION`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L556-L564) and [`WARM_PREFIX_TARGET` — Default: None](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L572-L579) — Amazon VPC CNI v1.23.1
  - [aws-k8s-cni.yaml: `aws-node` env `WARM_PREFIX_TARGET` value `"1"`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/config/master/aws-k8s-cni.yaml#L275-L286) — Amazon VPC CNI v1.23.1
  - [ipamd.go: `defaultWarmPrefixTarget = 0`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L150-L152) and [`getWarmPrefixTarget()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L1441-L1456) — Amazon VPC CNI v1.23.1
  - [data_store.go `GetPrefixDelegationDefaults()`: 16 IPs, `/28`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/datastore/data_store.go#L1552-L1558) — Amazon VPC CNI v1.23.1
  - [ipamd.go `GetIPv4Limit()`: prefixes per ENI = IPv4Limit − 1](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L2570-L2584) — Amazon VPC CNI v1.23.1
  - [prefix-and-ip-target.md: one full prefix kept even if a single IP is used; t3.small example](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/prefix-and-ip-target.md#L5-L22) — Amazon VPC CNI v1.23.1
  - [cni-increase-ip-addresses-procedure.adoc: contiguous `/28`, Nitro, `InsufficientCidrBlocks`, MNG cap 110/250](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/cni-increase-ip-addresses-procedure.adoc#L13-L57) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [cni-increase-ip-addresses.adoc: nodes run out of IPs; fewer EC2 calls; new node groups for transition](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/cni-increase-ip-addresses.adoc#L17-L19) and [L48-L50](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/cni-increase-ip-addresses.adoc#L48-L50) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

**Replay.** cni → ec2api → eni (warm pool 9) → kubelet → containerd → cni (`ADD` → `AddNetwork`) → eni (IP 배정, low) → pod (veth, `/32`, rule 512) → cni → ec2api (새 ENI) → eni (18칸) → eni (27칸, max Pods 29) → cni ✕ containerd (IP 고갈) → eni (`/28` prefix)

**Overview.**
- VPC CNI는 overlay 없이 Pod에 VPC의 private IP를 줍니다([managing-vpc-cni.adoc L26](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/managing-vpc-cni.adoc#L26) — Amazon EKS User Guide @ 8d43223 (2026-09-16)).
- 작은 subnet이면 `WARM_IP_TARGET` + `MINIMUM_IP_TARGET` 조합이 선택지지만, EC2 호출이 늘어 throttling 위험이 커지므로 기본값이 `WARM_ENI_TARGET=1`입니다([eni-and-ip-target.md L13-L16](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/eni-and-ip-target.md#L13-L16), [L45-L54](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/eni-and-ip-target.md#L45-L54) — Amazon VPC CNI v1.23.1).
- subnet 자체가 고갈되면 PD가 아니라 subnet 공간이 답입니다: `kubernetes.io/role/cni` tag를 단 subnet은 subnet discovery로 secondary ENI 후보가 됩니다([README L547-L554](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L547-L554) — Amazon VPC CNI v1.23.1).
- `WARM_PREFIX_TARGET`은 공식 자료끼리 값이 다릅니다: README는 default `None`, 배포 manifest와 Helm 값은 `"1"`입니다. 실제 값은 `kubectl get ds aws-node -n kube-system -o yaml`로 확인합니다.
- VPC 밖으로 나가는 Pod 트래픽의 SNAT(`AWS_VPC_K8S_CNI_EXTERNALSNAT`)는 이 레슨 밖입니다.

### Decoder records

#### R5.1 `AddNetworkRequest` / `AddNetworkReply` (gRPC) · step 5.5 · wire: true
```text
# aws-cni → ipamd (unix:///var/run/aws-node/ipamd.sock), CNIBackend.AddNetwork
AddNetworkRequest {
  K8S_POD_NAME: "web-0"
  K8S_POD_NAMESPACE: "default"
  ContainerID: "5f2c8a91d4e0…"
  Netns: "/var/run/netns/cni-5f2c8a91-…"
  IfName: "eth0"
  NetworkName: "aws-cni"
}
# ipamd → aws-cni
AddNetworkReply {
  Success: true
  IPAllocationMetadata { IPv4Addr: "10.0.64.21"  DeviceNumber: 0  RouteTableId: 254 }
}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `K8S_POD_NAME` / `K8S_POD_NAMESPACE` | `web-0` / `default` | IP를 받을 Pod | E.G. |
| `ContainerID`, `IfName` | sandbox ID, `eth0` | 이 배정의 key (DEL 때 같은 key로 반납) | E.G. |
| `Netns` | netns path | veth를 넣을 Pod network namespace | E.G. |
| `Success` | `true` | `false`면 `aws-cni`가 "failed to assign an IP address" 오류 | |
| `IPv4Addr` | `10.0.64.21` | Pod IP (`/32`로 붙음) | E.G. |
| `DeviceNumber` | `0` | IP가 속한 ENI의 device | |
| `RouteTableId` | `254` (`main`) | from-Pod rule이 볼 table, device 0이면 `main` | |

Sources: [rpc.proto messages](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/rpc/rpc.proto#L14-L50), [cni.go request build and `Success` check](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L200-L222), [rpc_handler.go reply metadata](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/rpc_handler.go#L230-L250), [helper.go device 0 → `RT_TABLE_MAIN`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/helper.go#L18-L20) — Amazon VPC CNI v1.23.1. `NetworkName` comes from the conflist `name` (shown as `aws-cni`, E.G.); `RouteTableId` 254 is the Linux value of `RT_TABLE_MAIN`.

#### R5.2 `ip addr` / `ip route` / `ip rule` for `web-0` · step 5.6 · wire: false
```text
# inside Pod netns
$ ip addr show eth0
    inet 10.0.64.21/32 scope global eth0
$ ip route
default via 169.254.1.1 dev eth0
169.254.1.1 dev eth0 scope link

# host, main table
$ ip route | grep 10.0.64.21
10.0.64.21 dev eni0d7763386da scope link

# host, policy rules (kernel default and SNAT rules omitted)
$ ip rule
512:    from all to 10.0.64.21 lookup main
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| Pod `inet` | `10.0.64.21/32` | `/32`: 같은 subnet 상대에게도 gateway로 보냄 | E.G. |
| Pod default gw | `169.254.1.1` | 실제로 없는 next hop, host veth로 나감 | |
| host route | `<podIP> dev eni… scope link` | Pod 행 트래픽을 veth로 | E.G. |
| host veth | `eni0d7763386da` | `eni` + `sha1("default.web-0")[:11]` | E.G. |
| rule `512` | `to <podIP> lookup main` | Pod 행 트래픽은 main table | |
| rule `1536` (여기선 없음) | `from <podIP> lookup <N+1>` | secondary ENI IP일 때 그 ENI로 나감 | |

Sources: [cni-proposal.md Pod and host routes, `ip rule list`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/cni-proposal.md#L53-L121), [driver.go container routes](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/driver/driver.go#L188-L191), [driver.go host route and rules](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/driver/driver.go#L526-L565), [network.go priorities](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L53-L80), [names.go veth name](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/names.go#L12-L26) — Amazon VPC CNI v1.23.1. The veth name was computed with the same `sha1` rule; the exact `ip` print format on an AL2023 node is not verified.

#### R5.3 새 ENI (`aws ec2 describe-network-interfaces`) · step 5.7 · wire: false
```json
{
  "NetworkInterfaceId": "eni-0a1b2c3d4e5f60002",
  "Description": "aws-K8S-i-0abc1234def567890",
  "Status": "in-use",
  "SubnetId": "subnet-0123456789abcdef0",
  "PrivateIpAddress": "10.0.70.15",
  "PrivateIpAddresses": [
    { "PrivateIpAddress": "10.0.70.15", "Primary": true },
    { "PrivateIpAddress": "10.0.70.88", "Primary": false }
  ],
  "Ipv4Prefixes": [],
  "Attachment": { "DeviceIndex": 1, "DeleteOnTermination": true, "Status": "attached" }
}
```
(`PrivateIpAddresses` shows 2 of 10 entries: the primary plus 9 secondaries in a real run.)

| field | value | meaning | E.G.? |
|---|---|---|---|
| `Description` | `aws-K8S-i-0abc…` | VPC CNI가 만든 ENI (`aws-K8S-` + instance ID) | E.G. (prefix 고정) |
| `Status` | `in-use` | instance에 attach됨 | |
| `SubnetId` | `subnet-…` | 이 ENI의 IP가 나오는 subnet | E.G. |
| `PrivateIpAddress` | `10.0.70.15` | ENI primary IP, Pod에 주지 않음 | E.G. |
| `PrivateIpAddresses[].Primary` | `false` | Pod용 secondary IP | E.G. |
| `Ipv4Prefixes[]` | `[]` | prefix delegation이면 여기에 `/28` | |
| `Attachment.DeviceIndex` | `1` | device 1 → host route table `2` | |
| `Attachment.DeleteOnTermination` | `true` | instance 종료 시 ENI 삭제 | |

Sources: [ec2 types.go `NetworkInterface`](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/types.go#L17120-L17236), [`NetworkInterfaceAttachment`](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/types.go#L17271-L17306), [`NetworkInterfacePrivateIpAddress`](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/types.go#L17416-L17433), [enums `in-use`](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/enums.go#L9522), [`attached`](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/enums.go#L759) — aws-sdk-go-v2 service/ec2 v1.321.0; [awsutils.go description prefix](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L62-L63), [AllocENI DeleteOnTermination](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L994-L1004), [helper.go table N + 1](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/helper.go#L18-L26) — Amazon VPC CNI v1.23.1.

#### R5.4 `m5.large` max Pods 계산 · step 5.9 · wire: false
```text
instance type          m5.large
ENILimit               3
IPv4Limit (per ENI)    10
Pod IPs                3 * (10 - 1) = 27
maxPods (AMI default)  27 + 2 = 29        # eni-max-pods.txt: m5.large 29
MNG cap                110 (< 30 vCPU) / 250
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `ENILimit` | `3` | 붙일 수 있는 ENI 수 | |
| `IPv4Limit` | `10` | ENI당 IPv4 (primary 포함) | |
| Pod IPs | `27` | ENI마다 primary 1개 제외 | |
| `maxPods` | `29` | kubelet 값, scheduler가 `Too many pods`로 지킴 | |
| `+2` | `aws-node`, `kube-proxy` | Pod IP를 안 쓰는 `hostNetwork` Pod | |
| MNG cap | `110` / `250` | custom AMI 없는 managed node group이 덮어쓰는 상한 | |

Sources: [vpc_ip_resource_limit.go m5.large](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/vpc/vpc_ip_resource_limit.go#L7369-L7381), [eni-max-pods.txt header](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/misc/eni-max-pods.txt#L33-L37), [`m5.large 29`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/misc/eni-max-pods.txt#L597) — Amazon VPC CNI v1.23.1; [eni_max_pods.go](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/eni_max_pods.go#L77-L79) — amazon-eks-ami v20261031; [choosing-instance-type.adoc](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/choosing-instance-type.adoc#L67-L70) — Amazon EKS User Guide @ 8d43223 (2026-09-16).

#### R5.5 IP 고갈 시 Pod event (`kubectl describe pod`) · step 5.10 · wire: false
```text
Failed to create Pod sandbox: rpc error: code = Unknown desc = failed to set up sandbox container "e24268322e55…" network for Pod "web-30": networkPlugin
cni failed to set up Pod "web-30_default" network: add cmd: failed to assign an IP address to container
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `Failed to create Pod sandbox` | — | `RunPodSandbox` 실패, Pod는 `ContainerCreating` | |
| `failed to set up sandbox container … network` | — | runtime의 CNI 호출이 실패 | E.G. (ID) |
| `add cmd: failed to assign an IP address to container` | — | `ipamd`가 `Success: false` (pool 비었음) | |

Sources: [sg-pods-example-deployment.adoc: example message](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/sg-pods-example-deployment.adoc#L142-L148) — Amazon EKS User Guide @ 8d43223 (2026-09-16); [cni.go](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L218-L222), [troubleshooting.md](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/troubleshooting.md#L12-L14) — Amazon VPC CNI v1.23.1. Pod and sandbox names are E.G.; the EKS guide shows this text in a security-groups-for-Pods context, and the exact wording from containerd 2.3.5 on a 1.37 node is not verified.

#### R5.6 `aws-node` DaemonSet env (prefix delegation 관련) · step 5.11 · wire: true
```yaml
# kubectl get ds aws-node -n kube-system -o yaml (excerpt of spec.template.spec.containers[name=aws-node].env)
- name: ENABLE_PREFIX_DELEGATION
  value: "false"        # set "true" to turn PD on
- name: ENABLE_SUBNET_DISCOVERY
  value: "true"
- name: WARM_ENI_TARGET
  value: "1"
- name: WARM_PREFIX_TARGET
  value: "1"
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `ENABLE_PREFIX_DELEGATION` | `"false"` | `"true"`면 secondary IP 대신 `/28` prefix | |
| `ENABLE_SUBNET_DISCOVERY` | `"true"` | 새 ENI subnet을 tag된 subnet까지 넓혀 고름 | |
| `WARM_ENI_TARGET` | `"1"` | PD off일 때 warm ENI 수 | |
| `WARM_PREFIX_TARGET` | `"1"` | PD on일 때 warm `/28` 수. README는 default `None`으로 적음 | |

Sources: [aws-k8s-cni.yaml env](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/config/master/aws-k8s-cni.yaml#L275-L286), [aws-k8s-cni.yaml DaemonSet `aws-node`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/config/master/aws-k8s-cni.yaml#L161-L165), [container `aws-node`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/config/master/aws-k8s-cni.yaml#L211-L213), [README `WARM_PREFIX_TARGET`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L572-L579), [Helm values `WARM_PREFIX_TARGET: "1"`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/charts/aws-vpc-cni/values.yaml#L91) — Amazon VPC CNI v1.23.1. Whether the EKS managed add-on renders the same env values is not stated in the pinned EKS guide.

### Self-check
1. **Q.** EKS Pod IP는 어디서 오고, CNI binary는 왜 EC2 API를 직접 부르지 않나요? **A.** VPC subnet의 실제 private IP입니다. `ipamd`가 EC2 API로 노드 ENI에 secondary IP를 미리 붙여 warm pool을 만들고, `aws-cni`는 gRPC `AddNetwork`로 pool에서 하나를 받기만 합니다. ENI attach는 최대 10초쯤 걸리고 EC2 호출은 throttling될 수 있어 Pod 생성 경로에서 뺍니다.
2. **Q.** `m5.large`에서 Pod 1개를 띄우면 ENI는 몇 개가 되나요? **A.** 2개입니다. `WARM_ENI_TARGET=1`은 free IP를 `9 × 1`개 이상 유지하려 하므로 free가 8이 되면 IP 9개짜리 ENI를 하나 더 붙입니다.
3. **Q.** `m5.large`의 max Pods 29는 어떻게 나오고, 30번째 Pod는 어떻게 되나요? **A.** `3 × (10 − 1) + 2`. ENI마다 primary IP는 Pod에 안 주고, `+2`는 Pod IP를 쓰지 않는 `aws-node`, `kube-proxy` 몫입니다. 30번째 Pod는 scheduler `NodeResourcesFit`가 `Too many pods`로 거절해 `Pending`에 남습니다.
4. **Q.** Pod가 `ContainerCreating`에서 `failed to assign an IP address to container`로 멈춥니다. 무엇을 보나요? **A.** 그 노드의 warm pool이 비었고 `ipamd`가 채우지 못하는 상황입니다. subnet free IP 고갈(`InsufficientFreeAddressesInSubnet`), prefix 모드의 `/28` 단편화(`InsufficientCidrBlocks`), EC2 API throttling backoff를 `ipamd` 로그와 subnet 잔여 IP로 확인합니다.
5. **Q.** prefix delegation은 무엇을 해결하고 무엇은 해결하지 못하나요? **A.** ENI 슬롯 하나에 `/28`(16 IP)을 붙여 노드당 IP 상한과 EC2 호출 수를 크게 줄입니다(`m5.large` 432 IP, 단 MNG는 `maxPods` 110으로 묶음). subnet 주소 자체를 늘리지는 않으며, 연속된 `/28`이 없으면 오히려 `InsufficientCidrBlocks`로 실패합니다.

### Unverified
- `m5.large`의 vCPU 수(2)는 pinned 자료에 없습니다. 그래서 MNG 상한 "vCPU 30 미만 → 110"이 `m5.large`에 적용된다는 것은 EC2 instance-type 문서(접근 불가)로 확인하지 못했습니다.
- prefix delegation 시 max Pods 공식은 pinned 자료에 그대로 적힌 곳이 없습니다. 432는 `GetIPv4Limit()`(슬롯 = IPv4Limit − 1)와 prefix당 16 IP로 계산한 값입니다.
- EKS managed add-on(`vpc-cni`)이 실제로 `WARM_PREFIX_TARGET="1"`을 넣는지는 pinned EKS guide에 없습니다. 값은 배포 manifest와 Helm values 기준입니다.
- R5.2의 `ip` 출력 형식과 AL2023의 host interface 이름(`eth0`/`eth1` 대 `ens5`/`ens6`), R5.5의 containerd 2.3.5 오류 문구는 실제 노드에서 보지 못했습니다.

## Lesson 6 — `service-kube-proxy`: ClusterIP 하나가 Pod IP로 바뀌기까지 (Service, EndpointSlice, kube-proxy iptables)

**Critical path.** Pod → CoreDNS(ClusterIP) → 자기 node의 iptables DNAT(`KUBE-SVC` → `KUBE-SEP`) → endpoint Pod; 대상은 EndpointSlice가 정한다

**Goal.** ClusterIP는 어느 NIC에도 없고, 각 노드의 kube-proxy가 EndpointSlice를 보고 써 둔 iptables DNAT rule로만 존재한다는 구조와, 요청 하나가 클라이언트 노드에서 Pod IP로 바뀌는 흐름을 그릴 수 있게 합니다.

**Interview questions.**
- ClusterIP는 어느 인터페이스에도 없는데 어떻게 통신이 되나요? kube-proxy는 무엇을 하나요?
- iptables 모드에서 endpoint 여러 개 중 하나를 어떻게 고르나요? 한 번 정해진 연결은 왜 계속 같은 Pod로 가나요?
- readiness probe가 실패한 Pod는 언제, 어떻게 트래픽에서 빠지나요? 이미 맺어진 연결은 어떻게 되나요?
- 1.37 기준 kube-proxy 기본 mode는 무엇이고, IPVS는 왜 피하나요?

**Nodes.** critical path: `dev`, `apiserver`, `kcm`, `kubeproxy`, `pod`, `coredns`, `podb` · side: `etcd` (positions from Topic layout)

**State panels.**
| node | title | view | initial |
|---|---|---|---|
| `kcm` | EndpointSlice `shop/orders-7xk2p` | table: address · Pod · ready · serving | (없음: Service 생성 전) |
| `kubeproxy` | node A netfilter (nat rule + conntrack) | table: 구분 · 항목 · 값 | `KUBE-SERVICES`에 `shop/orders` rule 없음, conntrack 없음 |

Scenario (all E.G.): Service `shop/orders` (selector `app: orders`, port `80` → targetPort `8080`). Backend Pod 2개 `orders-1` `10.0.80.11`, `orders-2` `10.0.80.47`은 node B(`podb`). Client Pod `shop/web` `10.0.64.21`은 node A(`pod`). kube-proxy mode `iptables`.

### Steps

#### 6.1 `service-create` — Service 생성, ClusterIP 할당 · `move` dev → apiserver · token `request`: `POST /api/v1/namespaces/shop/services`
- **Summary:** `type`을 생략한 Service는 `ClusterIP`입니다. API server가 Service CIDR에서 가상 IP를 하나 줍니다.
- **Detail:** API server는 Service에 cluster IP를 할당해 `spec.clusterIP`에 씁니다. 이 IP는 어떤 NIC에도 붙지 않고, 각 노드의 kube-proxy가 규칙으로만 구현합니다. EKS에서 Service CIDR을 지정하지 않으면 `10.100.0.0/16` 또는 `172.20.0.0/16`에서 할당됩니다. `targetPort`를 생략하면 `port`와 같은 값입니다.
- **Facts:**
  | key | value |
  |---|---|
  | `spec.type` 기본값 | `ClusterIP` |
  | `spec.selector` | `app: orders` → 이 label의 Pod가 endpoint 후보 |
  | EKS 기본 Service CIDR | `10.100.0.0/16` 또는 `172.20.0.0/16` |
- **Event log:** `dev → apiserver · HTTPS REST · POST Service shop/orders → clusterIP 10.100.73.21 · —`
- **Record:** R6.1
- **Sources:**
  - [service.md: default ClusterIP type; cluster IP assigned; controller scans Pods matching the selector](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/service.md#L113-L133) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [SetDefaults_Service: type ClusterIP, protocol TCP, targetPort = port](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/apis/core/v1/defaults.go#L106-L134) — Kubernetes v1.37.1
  - [ServiceSpec: `selector`, `clusterIP`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L6265-L6301) — Kubernetes v1.37.1
  - [create-cluster.adoc: service IPs from `10.100.0.0/16` or `172.20.0.0/16` if not specified](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/create-cluster.adoc#L121) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 6.2 `endpointslice-fill` — EndpointSlice controller가 Ready Pod를 모음 · `mutate` kcm
- **Summary:** selector에 맞는 Pod IP가 EndpointSlice `endpoints[]`에 들어갑니다. 두 Pod 모두 `ready: true`입니다.
- **Detail:** `kube-controller-manager`의 EndpointSlice controller는 Service selector와 맞는 Pod를 계속 살피며 EndpointSlice를 고칩니다. 슬라이스에는 `kubernetes.io/service-name: orders` label이 붙습니다. 각 endpoint의 `serving`은 Pod의 `Ready` condition이고, `ready`는 "`serving`이고 terminating 아님"입니다. kube-proxy가 실제로 읽는 것은 이 EndpointSlice입니다.
- **Facts:**
  | key | value |
  |---|---|
  | owner label | `kubernetes.io/service-name: orders` |
  | `serving` | Pod `Ready` condition |
  | `ready` | `serving` && !`terminating` |
- **Event log:** `kcm → apiserver · HTTPS REST · create EndpointSlice shop/orders-7xk2p (2 endpoints) · —`
- **After:**
  | address | Pod | ready | serving |
  |---|---|---|---|
  | `10.0.80.11` | `orders-1` (node B) | `true` | `true` |
  | `10.0.80.47` | `orders-2` (node B) | `true` | `true` |
- **Record:** R6.2
- **Sources:**
  - [service.md: controller scans Pods matching the selector, updates EndpointSlices](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/service.md#L121-L123) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [endpoint-slices.md: EndpointSlice example; source of truth for kube-proxy](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/endpoint-slices.md#L27-L70) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [endpoint-slices.md: conditions `serving`, `terminating`, `ready`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/endpoint-slices.md#L83-L116) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [endpointslice utils.go `podToEndpoint()`: serving = Pod Ready, ready = serving && !terminating](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/endpointslice/utils.go#L38-L50) — Kubernetes v1.37.1

#### 6.3 `kubeproxy-watch` — 모든 노드의 kube-proxy가 변화를 받음 · `move` apiserver → kubeproxy · token `data`: `WATCH EndpointSlice ADDED`
- **Summary:** kube-proxy는 노드마다 하나씩 돌며 Service와 EndpointSlice를 watch합니다.
- **Detail:** kube-proxy는 control plane에서 Service와 EndpointSlice의 추가·삭제를 watch하고, 노드의 패킷 규칙을 그 상태에 맞추는 control loop를 돕니다. mode를 지정하지 않으면 Linux에서는 `iptables` mode입니다. EKS에서는 `kube-proxy` add-on이 EC2 노드마다 배포되고 Fargate 노드에는 배포되지 않습니다.
- **Facts:**
  | key | value |
  |---|---|
  | Linux 기본 mode | `iptables` (`mode`가 비어 있을 때) |
  | 배포 (EKS) | 각 EC2 노드에 DaemonSet, Fargate 제외 |
- **Event log:** `apiserver → kubeproxy · HTTPS watch · EndpointSlice shop/orders-7xk2p ADDED · —`
- **Sources:**
  - [virtual-ips.md: each kube-proxy watches Service and EndpointSlice; control loop](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/networking/virtual-ips.md#L17-L26) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [virtual-ips.md: default mode is `iptables` in this release](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/networking/virtual-ips.md#L80-L87) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [server_linux.go `platformApplyDefaults()`: empty mode → iptables](https://github.com/kubernetes/kubernetes/blob/v1.37.1/cmd/kube-proxy/app/server_linux.go#L49-L53) — Kubernetes v1.37.1
  - [managing-kube-proxy.adoc: on each EC2 node, not on Fargate](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/managing-kube-proxy.adoc#L25) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 6.4 `iptables-sync` — `KUBE-SERVICES` → `KUBE-SVC-…` → `KUBE-SEP-…` · `mutate` kubeproxy
- **Summary:** kube-proxy가 Service 포트마다 `KUBE-SVC-` chain, endpoint마다 `KUBE-SEP-` chain을 씁니다.
- **Detail:** `KUBE-SERVICES`의 rule이 ClusterIP:port를 잡아 `KUBE-SVC-…`로 보냅니다. `KUBE-SVC-…`는 endpoint n개 중 i번째 rule을 확률 `1/(n−i)`로 매치하고 마지막 rule은 조건 없이 매치해, 결과적으로 균등 random 분배입니다. 각 `KUBE-SEP-…`는 목적지를 Pod IP:port로 바꾸는 DNAT rule입니다. chain 이름은 Service 포트(와 endpoint)의 hash입니다.
- **Facts:**
  | key | value |
  |---|---|
  | n = 2일 때 | 첫 rule `--probability 0.5000000000`, 둘째는 조건 없음 |
  | chain hash | `sha256` → base32 → 앞 16자 |
  | 동기화 간격 | `minSyncPeriod` 1s / `syncPeriod` 30s (upstream 기본값, EKS add-on 값은 pinned 문서에 없음) |
- **Event log:** `kubeproxy → kubeproxy · iptables-restore · +KUBE-SVC-AIOWKCZMN5S45HKT, +2 KUBE-SEP · —`
- **After:**
  | 구분 | 항목 | 값 |
  |---|---|---|
  | nat `PREROUTING`, `OUTPUT` | jump | `-j KUBE-SERVICES` |
  | `KUBE-SERVICES` | `shop/orders:http cluster IP` | `-d 10.100.73.21 --dport 80 -j KUBE-SVC-AIOWKCZMN5S45HKT` |
  | `KUBE-SVC-AIOWKCZMN5S45HKT` | rule 1 | `statistic random 0.5000000000 → KUBE-SEP-WPL5ZVQDPOP4HZKA` |
  | `KUBE-SVC-AIOWKCZMN5S45HKT` | rule 2 | (조건 없음) `→ KUBE-SEP-COG2GYFMMELUX3PQ` |
  | `KUBE-SEP-WPL5ZVQDPOP4HZKA` | DNAT | `--to-destination 10.0.80.11:8080` |
  | `KUBE-SEP-COG2GYFMMELUX3PQ` | DNAT | `--to-destination 10.0.80.47:8080` |
  | conntrack | — | (없음) |
- **Record:** R6.3
- **Sources:**
  - [proxier.go: jump chains nat `OUTPUT`/`PREROUTING` → `KUBE-SERVICES`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L374-L376) — Kubernetes v1.37.1
  - [proxier.go: capture the clusterIP in `KUBE-SERVICES`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L922-L930) — Kubernetes v1.37.1
  - [proxier.go `writeServiceToEndpointRules()`: random probability, last rule unconditional](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L1453-L1473) and [`computeProbability()`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L390-L392) — Kubernetes v1.37.1
  - [proxier.go `portProtoHash()`, `KUBE-SVC-`/`KUBE-SEP-` names](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L529-L581) — Kubernetes v1.37.1
  - [proxier.go: per-endpoint chain, DNAT `--to-destination`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L1215-L1243) — Kubernetes v1.37.1
  - [v1alpha1 defaults.go: iptables `SyncPeriod` 30s, `MinSyncPeriod` 1s](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/apis/config/v1alpha1/defaults.go#L62-L67) — Kubernetes v1.37.1
  - [virtual-ips.md: per-Service rules → per-endpoint rules → DNAT](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/networking/virtual-ips.md#L94-L120) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 6.5 `dns-query` — `web`이 `orders`를 CoreDNS에 묻기 · `move` pod → coredns · token `request`: `A? orders.shop.svc.cluster.local`
- **Summary:** kubelet이 써 둔 `/etc/resolv.conf`의 `search` 목록이 짧은 이름 `orders`를 늘려 줍니다.
- **Detail:** kubelet은 Pod마다 `/etc/resolv.conf`를 만듭니다. `search <ns>.svc.cluster.local svc.cluster.local cluster.local`과 `options ndots:5`가 들어 있어, 점이 5개 미만인 `orders`는 먼저 `orders.shop.svc.cluster.local`로 질의됩니다. EKS에서 `nameserver`는 `kube-dns` Service의 ClusterIP라, 이 DNS 질의도 같은 ClusterIP DNAT 경로를 탑니다.
- **Facts:**
  | key | value |
  |---|---|
  | `search` | `shop.svc.cluster.local svc.cluster.local cluster.local` (+ 노드 도메인) |
  | `options` | `ndots:5` |
  | EKS `nameserver` (예) | `10.100.0.10` (`kube-system/kube-dns`) |
- **Event log:** `pod → coredns · DNS/UDP 53 (via kube-dns ClusterIP) · A? orders.shop.svc.cluster.local · —`
- **Record:** R6.4
- **Sources:**
  - [dns-pod-service.md: kubelet writes resolv.conf; search list and `ndots:5`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/dns-pod-service.md#L42-L52) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [sample-deployment.adoc: EKS Pod resolv.conf, `nameserver 10.100.0.10`](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/sample-deployment.adoc#L249-L254) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [restrict-service-external-ip.adoc: `kube-system/kube-dns` ClusterIP `10.100.0.10`](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/restrict-service-external-ip.adoc#L53) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [nodelocaldns.md: CoreDNS clusterIP is translated to an endpoint by kube-proxy (DNAT + conntrack)](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/administer-cluster/nodelocaldns.md#L25-L30) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 6.6 `dns-answer` — CoreDNS가 ClusterIP를 돌려줌 · `move` coredns → pod · token `response`: `A 10.100.73.21`
- **Summary:** 일반(headless 아님) Service의 A 레코드는 Pod IP가 아니라 ClusterIP입니다.
- **Detail:** headless가 아닌 Service는 `<svc>.<ns>.svc.<cluster-domain>` 이름의 A/AAAA 레코드를 받고, 그 값은 Service의 cluster IP입니다. 그래서 클라이언트는 Pod IP를 모르고, Pod가 바뀌어도 이름과 ClusterIP는 그대로입니다. 어느 Pod로 갈지는 다음 단계에서 클라이언트 노드의 netfilter가 정합니다.
- **Facts:**
  | key | value |
  |---|---|
  | 레코드 이름 | `<svc>.<ns>.svc.<cluster-domain>` |
  | 일반 Service A 값 | Service의 ClusterIP |
- **Event log:** `coredns → pod · DNS/UDP 53 · A orders.shop.svc.cluster.local = 10.100.73.21 · —`
- **Sources:**
  - [dns-pod-service.md: normal Service A/AAAA resolves to the cluster IP](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/dns-pod-service.md#L72-L77) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 6.7 `clusterip-syn` — SYN이 클라이언트 노드의 `KUBE-SERVICES`에 걸림 · `move` pod → kubeproxy · token `request`: `TCP SYN 10.0.64.21:41234 → 10.100.73.21:80`
- **Summary:** Pod에서 나온 패킷은 같은 노드의 nat `PREROUTING`에서 `KUBE-SERVICES`로 들어갑니다.
- **Detail:** ClusterIP로 가는 패킷은 다른 노드나 control plane을 거치지 않습니다. 클라이언트 Pod가 있는 node A의 netfilter가 nat `PREROUTING`에서 `KUBE-SERVICES`로 점프하고, 목적지 `10.100.73.21`·`--dport 80`·`-p tcp` rule이 `KUBE-SVC-…`로 보냅니다. Service에 endpoint가 하나도 없으면 nat chain 대신 filter table의 `REJECT` rule이 연결을 거절합니다.
- **Facts:**
  | key | value |
  |---|---|
  | 처리 위치 | 클라이언트 노드(node A)의 netfilter |
  | 진입 | nat `PREROUTING` (노드 자신의 트래픽은 `OUTPUT`) → `KUBE-SERVICES` |
  | endpoint 0개 | filter `REJECT`, comment `"<svc> has no endpoints"` |
- **Event log:** `pod → kubeproxy · netfilter nat PREROUTING · KUBE-SERVICES → KUBE-SVC-AIOWKCZMN5S45HKT · —`
- **Sources:**
  - [proxier.go: nat `OUTPUT`/`PREROUTING` → `KUBE-SERVICES`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L374-L376) — Kubernetes v1.37.1
  - [proxier.go: clusterIP capture rule, or filter rule when no endpoints](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L922-L940) — Kubernetes v1.37.1
  - [proxier.go: no endpoints → `REJECT`, `"has no endpoints"`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L886-L897) — Kubernetes v1.37.1

#### 6.8 `dnat-conntrack` — random으로 `orders-2` 선택, DNAT, conntrack 기록 · `mutate` kubeproxy
- **Summary:** `KUBE-SEP-COG2…`가 목적지를 `10.0.80.47:8080`으로 바꾸고, 이 연결이 conntrack에 남습니다.
- **Detail:** 선택은 연결의 첫 패킷에서 한 번 일어나고, 이후 패킷과 응답은 conntrack 항목을 따라 같은 endpoint로 갑니다. source IP `10.0.64.21`은 바뀌지 않습니다. SEP chain의 `-s <podIP> -j KUBE-MARK-MASQ`는 Pod가 자기 Service를 불러 자기에게 돌아오는 hairpin만 표시합니다. 표시 값 `0x4000`은 상수가 아니라 `1 << masqueradeBit`(기본 14)입니다.
- **Facts:**
  | key | value |
  |---|---|
  | DNAT | `-m tcp -p tcp -j DNAT --to-destination 10.0.80.47:8080` |
  | client IP | 보존 (ClusterIP 경로는 SNAT 안 함) |
  | `KUBE-MARK-MASQ` mark | `1 << 14 = 0x4000` (`masqueradeBit` 기본 14) |
- **Event log:** `kubeproxy → kubeproxy · netfilter nat · DNAT 10.100.73.21:80 → 10.0.80.47:8080, conntrack NEW · —`
- **After:**
  | 구분 | 항목 | 값 |
  |---|---|---|
  | nat `PREROUTING`, `OUTPUT` | jump | `-j KUBE-SERVICES` |
  | `KUBE-SERVICES` | `shop/orders:http cluster IP` | `-d 10.100.73.21 --dport 80 -j KUBE-SVC-AIOWKCZMN5S45HKT` |
  | `KUBE-SVC-AIOWKCZMN5S45HKT` | rule 1 | `statistic random 0.5000000000 → KUBE-SEP-WPL5ZVQDPOP4HZKA` |
  | `KUBE-SVC-AIOWKCZMN5S45HKT` | rule 2 | (조건 없음) `→ KUBE-SEP-COG2GYFMMELUX3PQ` ← 이번 연결 |
  | `KUBE-SEP-WPL5ZVQDPOP4HZKA` | DNAT | `--to-destination 10.0.80.11:8080` |
  | `KUBE-SEP-COG2GYFMMELUX3PQ` | DNAT | `--to-destination 10.0.80.47:8080` |
  | conntrack | tcp | orig `10.0.64.21:41234 → 10.100.73.21:80` · reply `10.0.80.47:8080 → 10.0.64.21:41234` |
- **Sources:**
  - [proxier.go: per-endpoint chain — hairpin `KUBE-MARK-MASQ`, then DNAT](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L1229-L1242) — Kubernetes v1.37.1
  - [proxier.go: `masqueradeValue := 1 << uint(*config.IPTables.MasqueradeBit)`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L251-L254) — Kubernetes v1.37.1
  - [v1alpha1 defaults.go: `MasqueradeBit` default 14](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/apis/config/v1alpha1/defaults.go#L88-L91) — Kubernetes v1.37.1
  - [proxier.go: `KUBE-MARK-MASQ -j MARK --or-mark <mark>`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L758-L764) — Kubernetes v1.37.1
  - [virtual-ips.md: backend chosen randomly, client IP not rewritten](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/networking/virtual-ips.md#L118-L120) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [nodelocaldns.md: ClusterIP DNAT uses connection tracking; TCP entries removed on close](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/administer-cluster/nodelocaldns.md#L25-L48) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 6.9 `to-endpoint` — DNAT된 SYN이 node B의 Pod에 도착 · `move` kubeproxy → podb · token `request`: `TCP SYN 10.0.64.21:41234 → 10.0.80.47:8080`
- **Summary:** Pod IP가 VPC 주소라, DNAT된 패킷은 overlay 없이 VPC 라우팅으로 node B에 갑니다.
- **Detail:** Amazon VPC CNI는 각 Pod에 VPC의 private IP를 주므로 node A에서 바뀐 목적지 `10.0.80.47`은 VPC 안에서 그대로 라우팅됩니다. `orders-2`는 source `10.0.64.21`을 그대로 봅니다. 응답은 node A의 conntrack이 source를 `10.100.73.21:80`으로 되돌려 `web`에 전달하고, `KUBE-FORWARD`의 `RELATED,ESTABLISHED` rule이 이어지는 패킷을 통과시킵니다.
- **Facts:**
  | key | value |
  |---|---|
  | Pod IP (EKS) | VPC private IP (VPC CNI) |
  | `orders-2`가 보는 source | `10.0.64.21` (보존) |
  | `KUBE-FORWARD` | `--ctstate RELATED,ESTABLISHED -j ACCEPT` |
- **Event log:** `kubeproxy → podb · TCP (VPC routing) · SYN dst 10.0.80.47:8080 · —`
- **Sources:**
  - [managing-vpc-cni.adoc: VPC CNI assigns a private IP from your VPC to each Pod](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/managing-vpc-cni.adoc#L26) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [virtual-ips.md: redirected without rewriting the client IP](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/networking/virtual-ips.md#L118-L120) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [proxier.go: `KUBE-FORWARD` conntrack rules](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L1316-L1355) — Kubernetes v1.37.1

#### 6.10 `endpoint-unready` — `orders-2`의 readiness 실패 → `ready: false` · `mutate` kcm
- **Summary:** readiness probe가 연속 실패하면 Pod `Ready`가 `False`가 되고, 슬라이스의 `ready`도 `false`가 됩니다.
- **Detail:** kubelet은 readiness probe가 `failureThreshold`(기본 3)번 연속 실패하면 Pod의 `Ready` condition을 `false`로 둡니다. 컨테이너는 재시작하지 않습니다. 문서는 "controller가 EndpointSlice에서 Pod IP를 뺀다"고 쓰지만, v1.37.1 코드는 endpoint를 남기고 `ready`/`serving`만 `false`로 바꿉니다. 이 변경이 watch로 모든 노드의 kube-proxy에 갑니다.
- **Facts:**
  | key | value |
  |---|---|
  | probe 기본값 | `periodSeconds` 10, `failureThreshold` 3 |
  | Pod | `Ready=False`, 컨테이너는 계속 실행 |
  | EndpointSlice | endpoint 유지, `ready: false`, `serving: false` |
- **Event log:** `kcm → apiserver · HTTPS REST · update EndpointSlice shop/orders-7xk2p (10.0.80.47 ready=false) · —`
- **After:**
  | address | Pod | ready | serving |
  |---|---|---|---|
  | `10.0.80.11` | `orders-1` (node B) | `true` | `true` |
  | `10.0.80.47` | `orders-2` (node B) | `false` | `false` |
- **Sources:**
  - [probes.md: `periodSeconds` default 10, `failureThreshold` default 3; failed readiness sets `Ready` false, container keeps running](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/probes.md#L250-L260) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [probes.md: failed readiness → controller removes the Pod's IP from EndpointSlices](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/probes.md#L77-L80) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [endpoint-slices.md: EndpointSlices include all Pods matching the selector](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/endpoint-slices.md#L27-L33) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [endpointslice reconciler.go: Pods filtered only by `ShouldPodBeInEndpoints`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/endpointslice/reconciler.go#L190-L193) and [controller_utils.go: terminal or no-IP Pods are excluded, not-Ready Pods are kept](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/endpointslice/util/controller_utils.go#L177-L197) — Kubernetes v1.37.1
  - [utils.go `podToEndpoint()`: `ready`/`serving` from Pod Ready](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/endpointslice/utils.go#L38-L50) — Kubernetes v1.37.1

#### 6.11 `rule-removed` — kube-proxy가 `orders-2` rule을 지움, 기존 연결은 남음 · `mutate` kubeproxy
- **Summary:** 새 연결은 `orders-1`로만 갑니다. 이미 맺어진 TCP 연결은 conntrack을 따라 `orders-2`에 남습니다.
- **Detail:** kube-proxy는 `ready`인 endpoint만 씁니다(모두 not-ready면 `serving`+`terminating` endpoint로 대체). 그래서 `KUBE-SVC-…`에는 조건 없는 rule 하나만 남고 `KUBE-SEP-COG2…`는 사라집니다. 하지만 kube-proxy가 지우는 stale conntrack 항목은 UDP Service 것뿐이라, 열려 있던 TCP 연결은 닫힐 때까지 `orders-2`로 갑니다. long-lived 연결이 많은 서비스에서 보이는 현상입니다.
- **Facts:**
  | key | value |
  |---|---|
  | 사용하는 endpoint | `ready`만 (없으면 `serving` && `terminating`) |
  | conntrack 정리 | UDP Service만 (`CleanStaleEntries`) |
  | 남은 SVC rule | `-j KUBE-SEP-WPL5ZVQDPOP4HZKA` (조건 없음) |
- **Event log:** `apiserver → kubeproxy · HTTPS watch → iptables-restore · EndpointSlice MODIFIED → −KUBE-SEP-COG2GYFMMELUX3PQ · —`
- **After:**
  | 구분 | 항목 | 값 |
  |---|---|---|
  | nat `PREROUTING`, `OUTPUT` | jump | `-j KUBE-SERVICES` |
  | `KUBE-SERVICES` | `shop/orders:http cluster IP` | `-d 10.100.73.21 --dport 80 -j KUBE-SVC-AIOWKCZMN5S45HKT` |
  | `KUBE-SVC-AIOWKCZMN5S45HKT` | rule 1 | (조건 없음) `→ KUBE-SEP-WPL5ZVQDPOP4HZKA` |
  | `KUBE-SEP-WPL5ZVQDPOP4HZKA` | DNAT | `--to-destination 10.0.80.11:8080` |
  | conntrack | tcp (기존 연결) | orig `10.0.64.21:41234 → 10.100.73.21:80` · reply `10.0.80.47:8080 → 10.0.64.21:41234` |
- **Sources:**
  - [topology.go `CategorizeEndpoints()`: Ready endpoints, fallback to serving-terminating](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/topology.go#L41-L82) — Kubernetes v1.37.1
  - [endpoint-slices.md: proxies ignore terminating endpoints unless all are terminating](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/endpoint-slices.md#L105-L109) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [proxier.go: conntrack cleanup after sync](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L1423-L1426) — Kubernetes v1.37.1
  - [conntrack/cleanup.go: only UDP Services are cleaned](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/conntrack/cleanup.go#L37-L70) — Kubernetes v1.37.1
  - [proxier.go: last load-balancing rule is a guaranteed match](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L1464-L1472) — Kubernetes v1.37.1

**Replay.** dev → apiserver → kcm (EndpointSlice 2 ready) → apiserver → kubeproxy (SVC/SEP rule) → pod → coredns → pod (ClusterIP) → kubeproxy (DNAT `10.0.80.47`, conntrack) → podb → kcm (`orders-2` ready=false) → kubeproxy (SEP 제거, 기존 TCP 연결은 유지)

**Overview.**
- Proxy mode: upstream 1.37 기본값은 `iptables`입니다. IPVS는 출처마다 일정이 다릅니다. EKS guide(1.35 notes)는 "will be removed in Kubernetes 1.36"이라 쓰고([kubernetes-versions-standard.adoc L72](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/versioning/kubernetes-versions-standard.adoc#L72) — Amazon EKS User Guide @ 8d43223 (2026-09-16)), upstream v1.37.1 코드는 deprecated, 1.40에 기본 비활성, 1.43에 제거라고 씁니다([server_linux.go L191-L194](https://github.com/kubernetes/kubernetes/blob/v1.37.1/cmd/kube-proxy/app/server_linux.go#L191-L194) — Kubernetes v1.37.1; 같은 일정이 [virtual-ips.md L206-L214](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/networking/virtual-ips.md#L206-L214) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)). upstream이 권하는 대안은 `nftables`입니다.
- headless Service(`clusterIP: None`)는 ClusterIP 없이 DNS가 Pod IP를 직접 돌려주므로 이 경로(kube-proxy DNAT)를 타지 않습니다([dns-pod-service.md L79-L84](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/dns-pod-service.md#L79-L84) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)).
- NodePort/LoadBalancer로 들어오는 트래픽은 client IP가 바뀝니다(ClusterIP 내부 호출과 다름)([virtual-ips.md L122-L123](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/networking/virtual-ips.md#L122-L123) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)). ALB 경로는 다음 레슨입니다.

### Decoder records

#### R6.1 Service `shop/orders` · step 6.1 · wire: true
```yaml
apiVersion: v1
kind: Service
metadata:
  name: orders
  namespace: shop
spec:
  selector:
    app: orders
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
  clusterIP: 10.100.73.21
  sessionAffinity: None
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `spec.selector` | `app: orders` | 이 label의 Pod가 EndpointSlice에 들어감 | |
| `spec.ports[].port` | `80` | ClusterIP에서 받는 포트 (`KUBE-SERVICES`의 `--dport`) | |
| `spec.ports[].targetPort` | `8080` | DNAT 목적지 포트 (생략 시 `port`) | |
| `spec.ports[].name` | `http` | chain hash 입력 `shop/orders:http` | |
| `spec.type` | `ClusterIP` | 기본 타입 | |
| `spec.clusterIP` | `10.100.73.21` | Service CIDR에서 할당된 가상 IP | E.G. |
| `spec.sessionAffinity` | `None` | 기본값: 연결마다 random 선택 | |

Sources: [ServiceSpec](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L6265-L6301), [ServicePort `targetPort`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L6515-L6560), [SetDefaults_Service](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/apis/core/v1/defaults.go#L106-L134), [proxier.go hash input from ServicePortName + protocol](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L325-L336) — Kubernetes v1.37.1; [virtual-ips.md random by default](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/networking/virtual-ips.md#L98-L101) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976).

#### R6.2 EndpointSlice `shop/orders-7xk2p` · step 6.2 · wire: true
```yaml
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: orders-7xk2p
  namespace: shop
  labels:
    kubernetes.io/service-name: orders
    endpointslice.kubernetes.io/managed-by: endpointslice-controller.k8s.io
addressType: IPv4
ports:
- name: http
  protocol: TCP
  port: 8080
endpoints:
- addresses: ["10.0.80.11"]
  conditions: {ready: true, serving: true, terminating: false}
  nodeName: ip-10-0-80-5.us-west-2.compute.internal
  targetRef: {kind: Pod, namespace: shop, name: orders-1}
- addresses: ["10.0.80.47"]
  conditions: {ready: true, serving: true, terminating: false}
  nodeName: ip-10-0-80-5.us-west-2.compute.internal
  targetRef: {kind: Pod, namespace: shop, name: orders-2}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `labels["kubernetes.io/service-name"]` | `orders` | 이 슬라이스의 Service | |
| `labels["endpointslice.kubernetes.io/managed-by"]` | `endpointslice-controller.k8s.io` | controller가 관리 | |
| `ports[].port` | `8080` | Pod 쪽 포트 (= targetPort) | |
| `endpoints[].addresses` | `10.0.80.47` | Pod IP, `KUBE-SEP` DNAT 목적지 | E.G. |
| `conditions.ready` | `true` | kube-proxy가 rule을 쓰는 기준 | |
| `conditions.serving` | `true` | Pod `Ready` condition | |
| `conditions.terminating` | `false` | Pod 삭제 중 여부 | |
| `targetRef.name` | `orders-2` | 이 endpoint의 Pod | E.G. |

Sources: [discovery/v1 types.go EndpointSlice](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/discovery/v1/types.go#L34-L72), [Endpoint and EndpointConditions](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/discovery/v1/types.go#L91-L167), [utils.go podToEndpoint](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/endpointslice/utils.go#L38-L60) — Kubernetes v1.37.1; [endpoint-slices.md example, labels, ownership](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/endpoint-slices.md#L40-L60), [L136-L150](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/endpoint-slices.md#L136-L150) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976).

#### R6.3 node A nat table for `shop/orders` (kube-proxy `iptables-restore` input) · step 6.4 · wire: false
```text
*nat
:KUBE-SERVICES - [0:0]
:KUBE-POSTROUTING - [0:0]
:KUBE-MARK-MASQ - [0:0]
:KUBE-SVC-AIOWKCZMN5S45HKT - [0:0]
:KUBE-SEP-WPL5ZVQDPOP4HZKA - [0:0]
:KUBE-SEP-COG2GYFMMELUX3PQ - [0:0]
-A KUBE-POSTROUTING -m mark ! --mark 0x00004000/0x00004000 -j RETURN
-A KUBE-POSTROUTING -j MARK --xor-mark 0x00004000
-A KUBE-POSTROUTING -m comment --comment "kubernetes service traffic requiring SNAT" -j MASQUERADE --random-fully
-A KUBE-MARK-MASQ -j MARK --or-mark 0x00004000
-A KUBE-SERVICES -m comment --comment "shop/orders:http cluster IP" -m tcp -p tcp -d 10.100.73.21 --dport 80 -j KUBE-SVC-AIOWKCZMN5S45HKT
-A KUBE-SVC-AIOWKCZMN5S45HKT -m comment --comment "shop/orders:http -> 10.0.80.11:8080" -m statistic --mode random --probability 0.5000000000 -j KUBE-SEP-WPL5ZVQDPOP4HZKA
-A KUBE-SVC-AIOWKCZMN5S45HKT -m comment --comment "shop/orders:http -> 10.0.80.47:8080" -j KUBE-SEP-COG2GYFMMELUX3PQ
-A KUBE-SEP-WPL5ZVQDPOP4HZKA -m comment --comment shop/orders:http -s 10.0.80.11 -j KUBE-MARK-MASQ
-A KUBE-SEP-WPL5ZVQDPOP4HZKA -m comment --comment shop/orders:http -m tcp -p tcp -j DNAT --to-destination 10.0.80.11:8080
-A KUBE-SEP-COG2GYFMMELUX3PQ -m comment --comment shop/orders:http -s 10.0.80.47 -j KUBE-MARK-MASQ
-A KUBE-SEP-COG2GYFMMELUX3PQ -m comment --comment shop/orders:http -m tcp -p tcp -j DNAT --to-destination 10.0.80.47:8080
COMMIT
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `KUBE-SERVICES` `-d` / `--dport` | `10.100.73.21` / `80` | ClusterIP:port를 잡는 진입 rule | E.G. (IP) |
| `KUBE-SVC-AIOWKCZMN5S45HKT` | hash of `shop/orders:http` + `tcp` | Service 포트당 chain 하나 | |
| `--probability` | `0.5000000000` | n = 2의 첫 rule `1/2`, 마지막 rule은 조건 없음 | |
| `KUBE-SEP-COG2GYFMMELUX3PQ` | hash + `10.0.80.47:8080` | endpoint당 chain 하나 (Pod IP가 바뀌면 이름도 바뀜) | E.G. |
| `-j DNAT --to-destination` | `10.0.80.47:8080` | 목적지를 Pod IP:targetPort로 | E.G. |
| `-s <podIP> -j KUBE-MARK-MASQ` | `10.0.80.47` | hairpin(자기 Service → 자기)만 SNAT 표시 | E.G. |
| `--or-mark 0x00004000` | `1 << 14` = `0x4000` | `masqueradeBit` 기본 14에서 나온 값, `%#08x`로 씀 | |
| `MASQUERADE --random-fully` | — | mark가 붙은 패킷만 노드 IP로 SNAT | |

Sources: [proxier.go mark value and format](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L251-L254), [defaults.go MasqueradeBit 14](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/apis/config/v1alpha1/defaults.go#L88-L91), [chain names and hash](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L529-L581), [KUBE-POSTROUTING / KUBE-MARK-MASQ rules](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L737-L764), [ClusterIP capture](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L922-L930), [SEP rules](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L1215-L1243), [SVC load-balancing rules](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier.go#L1453-L1473), [upstream test: same rule layout](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/proxy/iptables/proxier_test.go#L198-L215) — Kubernetes v1.37.1. Chain hashes were computed with the same `sha256 → base32 → [:16]` rule and checked against the upstream test vector (`ns1/svc1:p80` + `tcp` → `XPGD46QRK7WJZT7O`, SEP `SXIVWICOYRO3J4NJ`). The `KUBE-NODEPORTS` tail rule and the conditional `KUBE-SVC … -j KUBE-MARK-MASQ` rule (only with `masqueradeAll` or a local-traffic detector) are left out.

#### R6.4 `web` Pod `/etc/resolv.conf` · step 6.5 · wire: false
```text
nameserver 10.100.0.10
search shop.svc.cluster.local svc.cluster.local cluster.local us-west-2.compute.internal
options ndots:5
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `nameserver` | `10.100.0.10` | `kube-dns` Service ClusterIP (CoreDNS 앞) | E.G. |
| `search` 1–3 | `shop.svc.cluster.local svc.cluster.local cluster.local` | 짧은 이름 뒤에 차례로 붙여 봄 | E.G. (ns) |
| `search` 4 | `us-west-2.compute.internal` | 노드 쪽 도메인 (EKS 예시 출력에 있음) | E.G. |
| `options ndots:5` | `5` | 점이 5개 미만이면 search 목록부터 시도 | |

Sources: [dns-pod-service.md resolv.conf](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/dns-pod-service.md#L42-L52) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976); [EKS sample resolv.conf](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/sample-deployment.adoc#L249-L254) — Amazon EKS User Guide @ 8d43223 (2026-09-16).

### Self-check
1. **Q.** ClusterIP `10.100.73.21`은 어느 NIC에도 없습니다. `web`의 SYN이 Pod에 닿기까지 무엇이 목적지를 바꾸나요? **A.** 클라이언트가 있는 node A의 netfilter입니다. kube-proxy가 EndpointSlice를 보고 써 둔 `KUBE-SERVICES` rule이 ClusterIP:80을 잡아 `KUBE-SVC-…`로 보내고, random으로 고른 `KUBE-SEP-…`가 `DNAT --to-destination 10.0.80.47:8080`을 합니다. 이후 패킷과 응답은 conntrack을 따릅니다.
2. **Q.** endpoint가 3개면 `KUBE-SVC` chain의 세 rule 확률은? **A.** 첫 rule `1/3`(`0.3333333333`), 둘째 `1/2`(`0.5000000000`), 셋째는 조건 없음. 결과적으로 각각 1/3입니다.
3. **Q.** readiness probe가 실패한 Pod는 언제 트래픽에서 빠지고, EndpointSlice에서는 어떻게 보이나요? **A.** 기본값이면 10초 간격 3번 연속 실패 뒤 Pod `Ready=False`가 됩니다. EndpointSlice에는 endpoint가 남고 `ready: false`가 되며, 모든 노드의 kube-proxy가 그 `KUBE-SEP` rule을 지웁니다(문서는 "IP를 뺀다"고 표현).
4. **Q.** 그 순간 이미 열려 있던 TCP 연결은? **A.** conntrack 항목이 남아 연결이 닫힐 때까지 같은 Pod로 갑니다. kube-proxy가 stale conntrack을 지우는 것은 UDP Service뿐입니다. 새 연결만 남은 Ready endpoint로 갑니다.
5. **Q.** `KUBE-MARK-MASQ`의 `0x4000`은 어디서 오고, ClusterIP 호출에서 언제 SNAT가 일어나나요? **A.** `1 << masqueradeBit`(기본 14)입니다. ClusterIP 내부 호출은 client IP를 보존하고, SEP chain의 `-s <podIP>` rule로 Pod가 자기 Service를 불러 자기에게 돌아오는 hairpin일 때만 mark가 붙어 `KUBE-POSTROUTING`에서 MASQUERADE됩니다.

### Unverified
- EKS `kube-proxy` add-on의 실제 설정(mode, `syncPeriod`/`minSyncPeriod`, `clusterCIDR`/local-traffic detection)은 pinned EKS guide에 없습니다. 그래서 `KUBE-SVC-… ! -s <cidr> -j KUBE-MARK-MASQ` rule이 EKS 노드에 있는지 확인하지 못했고 R6.3에서 뺐습니다.
- EKS가 1.37에서 IPVS mode를 받아들이는지, `nftables` mode를 지원하는지는 pinned EKS guide(1.36까지)에 없습니다.
- conntrack 항목 형식(6.8, 6.11 패널)과 응답의 un-DNAT는 Linux netfilter 동작입니다. pinned 자료는 "DNAT와 connection tracking을 쓴다", "TCP 항목은 연결이 닫히면 지워진다"까지만 말합니다.
- `iptables-save`가 R6.3을 어떤 형태로 보여 주는지(예: mark를 `0x4000`으로, `--or-mark`를 `--set-xmark`로 바꿔 출력하는지)는 실제 노드에서 보지 못했습니다. R6.3은 `proxier.go`가 쓰는 입력 형태입니다.
- `KUBE-SVC-…` 안에서 endpoint 순서(어느 Pod가 `0.5` rule을 받는지)는 확인하지 않았고 주소 순서로 둔 예시입니다.

## Lesson 7 — `alb-ingress`: Ingress 하나가 ALB가 되어 Pod IP로 바로 닿기까지

**Critical path.** Ingress → LBC → ALB + target group(Pod IP) → health check `healthy` → readiness gate → 사용자 요청이 ALB에서 Pod IP로 직행

**Goal.** Ingress(class `alb`)가 AWS Load Balancer Controller를 거쳐 ALB와 Target Group이 되고, Pod IP가 target으로 등록되어 `healthy`가 된 뒤 인터넷 요청이 kube-proxy 없이 Pod에 닿는 흐름을 한 장면으로 그립니다.

**Interview questions.**
- Ingress를 만들면 누가, 어떤 AWS 리소스를 만드나요? 왜 기본값으로는 internal ALB에 `instance` 모드가 되나요?
- `target-type: ip`에서 target의 `Id`와 `Port`는 무엇이고, 요청은 어떤 hop을 지나나요?
- target 상태 `initial` → `healthy`는 무엇으로 정해지고, kubelet readiness probe와 무엇이 다른가요?
- Pod readiness gate는 무엇을 막고, 언제 주입되나요?

**Nodes.** critical path: `dev`, `apiserver`, `lbc`, `elbapi`, `alb`, `pod`, `user` · side: `podb`, `kcm`, `kubeproxy` (positions from Topic layout)

**State panels.**
| node | title | view | initial |
|---|---|---|---|
| alb | ALB `k8s-shop-orders-1a2b3c4d5e` (E.G.) | table: 항목 · 값 · 상태 | (ALB 없음) |
| pod | Pod `shop/orders-a` `status.conditions` | table: type · status | `ContainersReady True` · `target-health.elbv2.k8s.aws/k8s-shop-orders-9f8e7d6c5b False` · `Ready False` |

### Steps

#### 7.1 `ingress-create` — Ingress `orders`(class `alb`)를 만듭니다 · `move` dev → apiserver · token `request`: `POST /apis/networking.k8s.io/v1/namespaces/shop/ingresses`
- **Summary:** `ingressClassName: alb`가 이 Ingress를 AWS Load Balancer Controller(LBC)에 맡깁니다.
- **Detail:** IngressClass `alb`의 `spec.controller: ingress.k8s.aws/alb`가 LBC 담당이라는 표시입니다. annotation 기본값이 함정입니다. `scheme`은 `internal`, `target-type`은 `instance`이므로 인터넷용 `ip` 모드는 둘 다 명시해야 합니다. Ingress API는 frozen이고 upstream은 Gateway API를 권합니다.
- **Facts:**
  | key | value |
  |---|---|
  | IngressClass controller | `ingress.k8s.aws/alb` |
  | `alb.ingress.kubernetes.io/scheme` 기본값 | `internal` |
  | `alb.ingress.kubernetes.io/target-type` 기본값 | `instance` |
- **Event log:** `dev → apiserver · HTTPS REST · POST Ingress shop/orders (class alb) · —`
- **Record:** R7.1
- **Sources:**
  - [IngressClass controller ingress.k8s.aws/alb](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/ingress_class.md#L10-L19) — AWS Load Balancer Controller v3.6.2
  - [Annotation table: scheme default internal, target-type default instance](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L30-L45) — AWS Load Balancer Controller v3.6.2
  - [Gateway recommended; Ingress API frozen](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/ingress.md#L25-L27) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 7.2 `lbc-create-alb` — LBC가 ALB·Listener·Rule·Target Group을 만듭니다 · `move` lbc → elbapi · token `call`: `CreateLoadBalancer · CreateTargetGroup · CreateListener · CreateRule`
- **Summary:** LBC가 Ingress watch 이벤트를 받아 ELBv2 API를 부릅니다. 콘솔에서 고친 값은 되돌아갑니다.
- **Detail:** LBC는 API server에서 Ingress를 watch하다가 자기 class의 Ingress를 찾으면 ALB 하나, Service별 Target Group, 포트별 Listener, path별 Rule을 만듭니다. 서브넷은 AZ마다 하나씩 고르며 서로 다른 AZ 2개 이상이 필요하고, public 서브넷은 태그로 찾습니다. 콘솔에서 바꾼 설정은 다음 reconcile에서 되돌아갈 수 있습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 만드는 리소스 | ALB 1개 · Target Group(Service별) · Listener(포트별) · Rule(path별) |
  | 서브넷 조건 | 서로 다른 AZ 2개 이상, 서브넷마다 가용 IP 8개 이상 |
  | 서브넷 태그 | public `kubernetes.io/role/elb` = `1`, private `kubernetes.io/role/internal-elb` = `1` |
- **Event log:** `lbc → elbapi · AWS ELBv2 API (HTTPS) · CreateLoadBalancer k8s-shop-orders-1a2b3c4d5e + CreateTargetGroup + CreateListener HTTP:80 + CreateRule / · —`
- **Sources:**
  - [How it works: watch Ingress → ALB, Target Groups, Listeners, Rules](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/how-it-works.md#L17-L29) — AWS Load Balancer Controller v3.6.2
  - [Controller may revert out-of-band changes](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/how-it-works.md#L11) — AWS Load Balancer Controller v3.6.2
  - [≥2 subnets in different AZs, one per AZ, ≥8 free IPs](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/alb-ingress.adoc#L33) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Subnet role tags internal-elb / elb = 1](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/network-reqs.adoc#L220-L243) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 7.3 `alb-ready` — ALB, Listener, Rule, Target Group이 생깁니다 · `mutate` alb
- **Summary:** Target Group은 target type `ip`로 생기고 아직 target이 없습니다. ALB cross-zone은 항상 켜져 있습니다.
- **Detail:** Listener `HTTP:80`의 Rule `/`가 Target Group `k8s-shop-orders-9f8e7d6c5b`로 보냅니다. ALB의 load balancer 속성 `load_balancing.cross_zone.enabled`는 기본 `true`이고 바꿀 수 없습니다. 그래서 한 AZ의 ALB 노드가 다른 AZ의 Pod로도 보냅니다. Target Group 쪽 같은 속성의 기본값은 `use_load_balancer_configuration`입니다.
- **Facts:**
  | key | value |
  |---|---|
  | Target Group target type | `ip` (ELB API 기본값은 `instance`) |
  | ALB cross-zone (load balancer 속성) | 기본 `true`, 변경 불가 |
  | Target Group cross-zone 기본값 | `use_load_balancer_configuration` (`true`/`false`로 덮어쓰기 가능) |
- **Event log:** `elbapi → lbc · ELBv2 API 응답 · LoadBalancerArn, TargetGroupArn, ListenerArn 반환 · —`
- **After:**
  | 항목 | 값 | 상태 |
  |---|---|---|
  | Listener | `HTTP:80` | — |
  | Rule | path `/` → TG `k8s-shop-orders-9f8e7d6c5b` | — |
  | Target Group | target type `ip` | target 없음 |
- **Sources:**
  - [LoadBalancerAttribute: ALB cross-zone default true, can't be changed](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/types/types.go#L741-L744) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6
  - [TargetGroupAttribute: cross-zone true, false or use_load_balancer_configuration (default)](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/types/types.go#L1517-L1520) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6
  - [CreateTargetGroup TargetType: instance default, ip registers by IP](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/api_op_CreateTargetGroup.go#L141-L155) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6
  - [Target group name k8s-<ns8>-<name8>-<hash10>](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/ingress/model_build_target_group.go#L231-L252) — AWS Load Balancer Controller v3.6.2

#### 7.4 `tgb-create` — LBC가 TargetGroupBinding을 만듭니다 · `move` lbc → apiserver · token `request`: `POST /apis/elbv2.k8s.aws/v1beta1/namespaces/shop/targetgroupbindings`
- **Summary:** TargetGroupBinding(TGB)이 Target Group ARN과 Service `orders:80`을 묶습니다.
- **Detail:** LBC는 Ingress와 Service도 내부적으로 TGB로 처리합니다. TGB는 Service와 같은 namespace에 Target Group과 같은 이름으로 생기고, target 등록은 이 TGB를 reconcile하며 일어납니다. 생성된 TGB를 지우면 target이 모두 빠지고, owner가 바뀌거나 `--sync-period`(기본 `10h`)가 돌 때까지 다시 생기지 않습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 위치 · 이름 | Service namespace, 이름 = Target Group 이름 |
  | 핵심 spec | `targetGroupARN`, `targetType: ip`, `serviceRef: {name: orders, port: 80}` |
  | 수동 삭제 시 | target 전부 해제, 복구는 owner 수정 또는 `--sync-period` `10h` |
- **Event log:** `lbc → apiserver · HTTPS REST · POST TargetGroupBinding shop/k8s-shop-orders-9f8e7d6c5b · —`
- **Record:** R7.2
- **Sources:**
  - [LBC uses TargetGroupBinding internally, same namespace as the Service](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/targetgroupbinding/targetgroupbinding.md#L15-L17) — AWS Load Balancer Controller v3.6.2
  - [Deleting a generated TGB deregisters all targets; sync-period 10h](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/targetgroupbinding/targetgroupbinding.md#L21-L29) — AWS Load Balancer Controller v3.6.2
  - [TGB template: namespace = Service, name = TG name, targetGroupARN, targetType, serviceRef](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/ingress/model_build_target_group.go#L63-L95) — AWS Load Balancer Controller v3.6.2

#### 7.5 `register-targets` — Pod IP를 target으로 등록합니다 · `mutate` alb
- **Summary:** LBC가 EndpointSlice의 ready Pod IP:8080을 `RegisterTargets`로 넣고, target은 `initial`로 시작합니다.
- **Detail:** TGB reconcile은 Service `orders`의 EndpointSlice에서 ready인 Pod 주소를 읽어 `Id = Pod IP`, `Port = Pod 포트`로 등록합니다. ALB가 Pod IP에 바로 닿아야 하므로 VPC CNI처럼 ENI secondary IP를 쓰는 CNI가 필요합니다. 등록 직후 상태는 `initial`이고 reason은 `Elb.RegistrationInProgress` 또는 `Elb.InitialHealthChecking`입니다.
- **Facts:**
  | key | value |
  |---|---|
  | `ip` target | `Id` = Pod IP, `Port` = Pod 포트 (EndpointSlice에서) |
  | 필요 조건 | Pod IP가 ENI secondary IP (VPC CNI). Fargate는 `ip` 필수 |
  | 첫 상태 | `initial` (`Elb.RegistrationInProgress` / `Elb.InitialHealthChecking`) |
- **Event log:** `lbc → elbapi · AWS ELBv2 API · RegisterTargets [10.0.18.34:8080, 10.0.45.67:8080] · —`
- **After:**
  | 항목 | 값 | 상태 |
  |---|---|---|
  | Listener | `HTTP:80` | — |
  | Rule | path `/` → TG `k8s-shop-orders-9f8e7d6c5b` | — |
  | Target Group | target type `ip` | target 2개 |
  | target (`pod`, `us-west-2a`) | `10.0.18.34:8080` | `initial` |
  | target (`podb`, `us-west-2b`) | `10.0.45.67:8080` | `initial` |
- **Record:** R7.3
- **Sources:**
  - [reconcileWithIPTargetType: ResolvePodEndpoints, match, register](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/resource_manager.go#L168-L211) — AWS Load Balancer Controller v3.6.2
  - [Pod endpoints from EndpointSlices; ready endpoints kept](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/backend/endpoint_resolver.go#L113-L175) — AWS Load Balancer Controller v3.6.2
  - [TargetDescription{Id: endpoint.IP, Port: endpoint.Port}](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/resource_manager.go#L625-L633) — AWS Load Balancer Controller v3.6.2
  - [ip mode needs secondary-IP CNI; Service type does not matter](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L224-L232) — AWS Load Balancer Controller v3.6.2
  - [IP target type required on Fargate](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/alb-ingress.adoc#L88-L89) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [Reason codes for state initial](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/types/types.go#L1697-L1704) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6

#### 7.6 `health-check` — ALB가 Pod IP로 직접 health check합니다 · `move` alb → pod · token `request`: `GET / (health check → 10.0.18.34:8080)`
- **Summary:** LBC 기본값은 HTTP `traffic-port` `/`, 15초 간격, 5초 timeout, 2회 연속 성공, 응답 `200`입니다.
- **Detail:** `ip` 모드에서 health check는 Pod IP의 target port로 바로 갑니다. LBC는 ELB API 기본값(간격 30초, 성공 5회) 대신 자기 기본값 15초·2회를 넣습니다. 이 검사는 kubelet readiness probe와 별개입니다. readiness probe는 EndpointSlice를 바꾸고, ALB health check는 target 상태를 바꿉니다.
- **Facts:**
  | key | value |
  |---|---|
  | path · port · protocol | `/` · `traffic-port` · `HTTP`, success code `200` |
  | interval · timeout | `15` · `5` 초 (LBC 기본값; ELB API 기본 interval `30`) |
  | healthy · unhealthy threshold | `2` · `2` (LBC 기본값; ELB API 기본 healthy `5`) |
- **Event log:** `alb → pod · HTTP health check · GET / → 200 · —`
- **Sources:**
  - [Health check annotation defaults](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L49-L56) — AWS Load Balancer Controller v3.6.2
  - [CreateTargetGroup HealthCheckIntervalSeconds default 30 for HTTP](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/api_op_CreateTargetGroup.go#L59-L64) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6
  - [CreateTargetGroup HealthyThresholdCount default 5 for HTTP](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/api_op_CreateTargetGroup.go#L98-L102) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6
  - [Readiness probe failure removes Pod IP from EndpointSlices](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L825-L837) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 7.7 `target-healthy` — target이 `healthy`가 됩니다 · `mutate` alb
- **Summary:** 연속 성공이 threshold에 닿으면 `initial` → `healthy`입니다. 실패가 쌓이면 `unhealthy`로 갑니다.
- **Detail:** target 상태는 ELBv2 API enum의 값입니다. `healthy`에는 reason이 붙지 않습니다. `unhealthy`면 `Target.ResponseCodeMismatch`(기대한 HTTP 코드가 아님), `Target.Timeout`, `Target.FailedHealthChecks`(연결 실패) 중 하나가 붙어 원인을 알려 줍니다. 장애 때는 이 reason부터 봅니다.
- **Facts:**
  | key | value |
  |---|---|
  | 상태 enum | `initial` · `healthy` · `unhealthy` · `unhealthy.draining` · `unused` · `draining` · `unavailable` |
  | `unhealthy` reason | `Target.ResponseCodeMismatch` · `Target.Timeout` · `Target.FailedHealthChecks` |
- **Event log:** `alb → pod · HTTP health check · 2회 연속 200 → healthy · —`
- **After:**
  | 항목 | 값 | 상태 |
  |---|---|---|
  | Listener | `HTTP:80` | — |
  | Rule | path `/` → TG `k8s-shop-orders-9f8e7d6c5b` | — |
  | Target Group | target type `ip` | target 2개 |
  | target (`pod`, `us-west-2a`) | `10.0.18.34:8080` | `healthy` |
  | target (`podb`, `us-west-2b`) | `10.0.45.67:8080` | `healthy` |
- **Record:** R7.4
- **Sources:**
  - [TargetHealthStateEnum values](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/types/enums.go#L541-L547) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6
  - [TargetHealth: no reason when healthy; unhealthy reason codes](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/types/types.go#L1694-L1717) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6

#### 7.8 `readiness-gate` — LBC가 Pod readiness gate를 `True`로 씁니다 · `mutate` pod
- **Summary:** target이 `healthy`일 때만 LBC가 `target-health.elbv2.k8s.aws/<TGB>` condition을 `True`로 바꿉니다.
- **Detail:** namespace에 `elbv2.k8s.aws/pod-readiness-gate-inject: enabled` label이 있으면 LBC webhook이 Pod 생성 때 `spec.readinessGates`를 넣습니다. `ip` 모드에서만, Pod 생성 시에만 넣으므로 Ingress·Service를 Pod보다 먼저 만듭니다. Pod는 모든 container가 ready이고 모든 gate가 `True`여야 `Ready`입니다.
- **Facts:**
  | key | value |
  |---|---|
  | namespace label | `elbv2.k8s.aws/pod-readiness-gate-inject: enabled` |
  | condition type | `target-health.elbv2.k8s.aws/<TGB 이름>` |
  | 주입 조건 | `target-type: ip`, Pod 생성 시에만 (Ingress·Service를 먼저) |
- **Event log:** `lbc → apiserver · HTTPS REST · PATCH pods/orders-a/status target-health.elbv2.k8s.aws/k8s-shop-orders-9f8e7d6c5b=True · —`
- **After:**
  | type | status |
  |---|---|
  | `ContainersReady` | `True` |
  | `target-health.elbv2.k8s.aws/k8s-shop-orders-9f8e7d6c5b` | `True` |
  | `Ready` | `True` |
- **Record:** R7.5
- **Sources:**
  - [Readiness gate: namespace label, webhook injection at creation, ip only, True only when Healthy](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/deploy/pod_readiness_gate.md#L3-L16) — AWS Load Balancer Controller v3.6.2
  - [Injection conditions; prefix target-health.elbv2.k8s.aws; create Ingress or Service before Pod](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/deploy/pod_readiness_gate.md#L39-L48) — AWS Load Balancer Controller v3.6.2
  - [Condition type = prefix/TGB name](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/utils.go#L23-L34) — AWS Load Balancer Controller v3.6.2
  - [Condition True only when target state is healthy](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/resource_manager.go#L518-L531) — AWS Load Balancer Controller v3.6.2
  - [Pod Ready only when all containers ready and all readinessGates True](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L679-L686) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 7.9 `internet-request` — 인터넷 사용자가 ALB에 요청합니다 · `move` user → alb · token `request`: `GET http://k8s-shop-orders-1a2b3c4d5e-….elb.amazonaws.com/`
- **Summary:** Listener `HTTP:80`이 요청을 받고, Rule `/`가 Target Group 하나를 고릅니다.
- **Detail:** LBC는 ALB DNS 이름을 Ingress `status.loadBalancer.ingress[].hostname`에 씁니다. Listener는 path rule을 평가해 Target Group을 고릅니다. 기본으로는 Ingress 하나가 ALB 하나를 갖습니다. 여러 Ingress가 ALB 하나를 나눠 쓰려면 `alb.ingress.kubernetes.io/group.name`으로 IngressGroup을 만듭니다.
- **Facts:**
  | key | value |
  |---|---|
  | Listener 기본값 | `[{"HTTP": 80}]` (인증서가 있으면 `[{"HTTPS": 443}]`) |
  | Rule | Ingress path마다 하나 |
  | ALB 공유 | `group.name` (기본: Ingress 하나가 implicit group 하나) |
- **Event log:** `user → alb · HTTP/1.1 · GET / · —`
- **Sources:**
  - [Listeners per port, Rules per path](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/how-it-works.md#L27-L29) — AWS Load Balancer Controller v3.6.2
  - [listen-ports default](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L39) — AWS Load Balancer Controller v3.6.2
  - [Implicit IngressGroup by default; group.name](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L99-L101) — AWS Load Balancer Controller v3.6.2
  - [LBC writes ALB DNS name to Ingress status hostname](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/controllers/ingress/group_controller.go#L335-L344) — AWS Load Balancer Controller v3.6.2

#### 7.10 `alb-to-pod-ip` — ALB가 Pod IP로 바로 보냅니다 · `move` alb → pod · token `request`: `GET / (dst 10.0.18.34:8080)`
- **Summary:** NodePort도 `kube-proxy` 규칙도 거치지 않습니다. ALB에서 Pod까지 hop 하나입니다.
- **Detail:** `ip` 모드에서 ALB는 VPC 안에서 Pod IP:8080으로 바로 보냅니다. 노드의 `kube-proxy` netfilter 규칙을 지나지 않으므로 노드 사이 추가 hop이 없고, health check도 Pod 단위입니다. sticky session과 IPv6 Pod로의 부하 분산도 `ip` 모드에서만 됩니다.
- **Facts:**
  | key | value |
  |---|---|
  | 경로 | ALB → Pod IP:8080 (NodePort·`kube-proxy` 없음) |
  | sticky session | `ip` 모드 필요 |
  | IPv6 Pod | `ip` target만 가능 |
- **Event log:** `alb → pod · HTTP/1.1 (VPC) · GET / → 200 OK · —`
- **Sources:**
  - [IP mode: traffic reaches pods directly](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/how-it-works.md#L45-L48) — AWS Load Balancer Controller v3.6.2
  - [ip mode routes directly to pod IP; required for sticky sessions](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L224-L232) — AWS Load Balancer Controller v3.6.2
  - [IPv6 only to IP targets](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/alb-ingress.adoc#L76) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [IP mode routes directly to Pods](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/alb-ingress.adoc#L88-L89) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

**Replay.** dev → apiserver → lbc → elbapi → alb (Listener·Rule·TG) → apiserver (TGB) → alb (target `initial`) → pod (health check) → alb (`healthy`) → pod (`Ready`) → user → alb → pod

**Overview.**
- 기본값 `instance` 모드는 target이 EC2 instance ID + NodePort라서 ALB → NodePort → `kube-proxy` → Pod로 한 hop 더 가고, readiness gate도 쓸 수 없습니다 ([EKS](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/alb-ingress.adoc#L84-L87) — Amazon EKS User Guide @ 8d43223 (2026-09-16); [LBC](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/deploy/pod_readiness_gate.md#L6) — AWS Load Balancer Controller v3.6.2).
- 버전: 이 레슨은 LBC v3.6.2(최신 tag)로 확인했습니다. pinned EKS 설치 문서는 v2.14.1을 기준으로 설명합니다 ([lbc-helm.adoc](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/lbc-helm.adoc#L53) — Amazon EKS User Guide @ 8d43223 (2026-09-16)).
- ALB 이름은 `k8s-<namespace 8자>-<name 8자>-<sha256 hex 10자>` 꼴입니다 ([code](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/ingress/model_build_load_balancer.go#L122-L135) — AWS Load Balancer Controller v3.6.2).
- 이 레슨은 Pod `orders-a`가 TGB가 생긴 뒤 다시 만들어져 gate를 가졌다고 가정합니다(7.8 주입 조건).

### Decoder records

#### R7.1 IngressClass `alb` + Ingress `shop/orders` · step 7.1 · wire: true
```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: alb
spec:
  controller: ingress.k8s.aws/alb
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: orders
  namespace: shop
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  ingressClassName: alb
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: orders
            port:
              number: 80
status:
  loadBalancer:
    ingress:
    - hostname: k8s-shop-orders-1a2b3c4d5e-123456789.us-west-2.elb.amazonaws.com   # E.G.
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `IngressClass.spec.controller` | `ingress.k8s.aws/alb` | LBC가 맡는 class | |
| `spec.ingressClassName` | `alb` | 위 IngressClass를 고름 | |
| `alb.ingress.kubernetes.io/scheme` | `internet-facing` | 생략하면 `internal` | |
| `alb.ingress.kubernetes.io/target-type` | `ip` | 생략하면 `instance` | |
| `paths[].path` / `pathType` | `/` / `Prefix` | Rule 하나가 됨 | |
| `backend.service.name` / `port.number` | `orders` / `80` | Target Group 하나와 TGB `serviceRef` | |
| `status.loadBalancer.ingress[].hostname` | `k8s-shop-orders-…elb.amazonaws.com` | LBC가 쓰는 ALB DNS 이름 | E.G. |

Sources: [IngressClass](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/ingress_class.md#L10-L19) — AWS Load Balancer Controller v3.6.2; [annotation defaults](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L30-L45) — AWS Load Balancer Controller v3.6.2; [status hostname](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/controllers/ingress/group_controller.go#L335-L344) — AWS Load Balancer Controller v3.6.2

#### R7.2 TargetGroupBinding `shop/k8s-shop-orders-9f8e7d6c5b` · step 7.4 · wire: true
```yaml
apiVersion: elbv2.k8s.aws/v1beta1
kind: TargetGroupBinding
metadata:
  name: k8s-shop-orders-9f8e7d6c5b        # = Target Group name (E.G. hash)
  namespace: shop                          # = Service namespace
spec:
  targetGroupARN: arn:aws:elasticloadbalancing:us-west-2:111122223333:targetgroup/k8s-shop-orders-9f8e7d6c5b/0123456789abcdef
  targetType: ip
  serviceRef:
    name: orders
    port: 80
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.name` | `k8s-shop-orders-9f8e7d6c5b` | Target Group 이름과 같음; readiness gate 이름에도 쓰임 | E.G. (hash) |
| `metadata.namespace` | `shop` | Service와 같은 namespace | |
| `spec.targetGroupARN` | `arn:…:targetgroup/k8s-shop-orders-…/…` | 등록할 Target Group | E.G. |
| `spec.targetType` | `ip` | Pod IP를 target으로 | |
| `spec.serviceRef` | `orders` / `80` | 이 Service의 EndpointSlice에서 Pod를 찾음 | |

Sources: [TGB sample YAML](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/targetgroupbinding/targetgroupbinding.md#L61-L71) — AWS Load Balancer Controller v3.6.2; [TGB template built by LBC](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/ingress/model_build_target_group.go#L63-L95) — AWS Load Balancer Controller v3.6.2; [spec fields](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/targetgroupbinding/spec.md#L89-L122) — AWS Load Balancer Controller v3.6.2

#### R7.3 `RegisterTargets` request · step 7.5 · wire: true
```json
{
  "TargetGroupArn": "arn:aws:elasticloadbalancing:us-west-2:111122223333:targetgroup/k8s-shop-orders-9f8e7d6c5b/0123456789abcdef",
  "Targets": [
    { "Id": "10.0.18.34", "Port": 8080 },
    { "Id": "10.0.45.67", "Port": 8080 }
  ]
}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `TargetGroupArn` | `arn:…:targetgroup/k8s-shop-orders-…/…` | TGB `spec.targetGroupARN` | E.G. |
| `Targets[].Id` | `10.0.18.34` | EndpointSlice의 Pod IP (`ip` 모드) | E.G. |
| `Targets[].Port` | `8080` | Pod 포트 | E.G. |
| `Targets[].AvailabilityZone` | (생략) | VPC 안 IP면 AZ 자동 감지 | |

Sources: [RegisterTargetsInput](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/api_op_RegisterTargets.go#L47-L60) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6; [TargetDescription Id / AvailabilityZone / Port](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/types/types.go#L1360-L1399) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6; [LBC builds Id/Port](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/resource_manager.go#L625-L633) — AWS Load Balancer Controller v3.6.2

#### R7.4 `DescribeTargetHealth` response · step 7.7 · wire: true
```json
{
  "TargetHealthDescriptions": [
    {
      "Target": { "Id": "10.0.18.34", "Port": 8080, "AvailabilityZone": "us-west-2a" },
      "HealthCheckPort": "8080",
      "TargetHealth": { "State": "healthy" }
    },
    {
      "Target": { "Id": "10.0.45.67", "Port": 8080, "AvailabilityZone": "us-west-2b" },
      "HealthCheckPort": "8080",
      "TargetHealth": { "State": "unhealthy", "Reason": "Target.ResponseCodeMismatch", "Description": "…" }
    }
  ]
}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `Target.Id` / `Port` | `10.0.18.34` / `8080` | 등록한 Pod IP와 포트 | E.G. |
| `HealthCheckPort` | `8080` | `traffic-port`면 target 포트 | E.G. |
| `TargetHealth.State` | `healthy` | enum `initial`·`healthy`·`unhealthy`·`draining`·`unused`… | |
| `TargetHealth.Reason` | `Target.ResponseCodeMismatch` | `healthy`면 없음; 실패 원인 코드 | E.G. (두 번째 target은 실패 예시) |
| `TargetHealth.Description` | `…` | 사람이 읽는 설명; `healthy`면 없음 | E.G. |

Sources: [DescribeTargetHealthOutput](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/api_op_DescribeTargetHealth.go#L49-L58) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6; [TargetHealth fields](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/types/types.go#L1686-L1748) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6; [TargetHealthDescription](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/types/types.go#L1750-L1773) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6; [state enum](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/types/enums.go#L541-L547) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6

#### R7.5 Pod `shop/orders-a` readiness fields · step 7.8 · wire: true
```yaml
spec:
  readinessGates:
  - conditionType: target-health.elbv2.k8s.aws/k8s-shop-orders-9f8e7d6c5b   # injected by LBC webhook
  containers:
  - name: app
    readinessProbe:
      httpGet: {path: /ready, port: 8080}
status:
  podIP: 10.0.18.34
  conditions:
  - type: target-health.elbv2.k8s.aws/k8s-shop-orders-9f8e7d6c5b
    status: "True"
  - type: ContainersReady
    status: "True"
  - type: Ready
    status: "True"
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `spec.readinessGates[].conditionType` | `target-health.elbv2.k8s.aws/<TGB>` | Pod 생성 때 LBC webhook이 주입 | E.G. (이름) |
| `spec.containers[].readinessProbe` | `httpGet /ready :8080` | kubelet 검사 → `ContainersReady` | E.G. |
| `status.conditions[target-health…]` | `True` | target이 `healthy`일 때 LBC가 PATCH | |
| `status.conditions[ContainersReady]` | `True` | 모든 container ready | |
| `status.conditions[Ready]` | `True` | 위 둘이 모두 `True`일 때만 | |

Sources: [pod_readiness_gate.md](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/deploy/pod_readiness_gate.md#L3-L16) — AWS Load Balancer Controller v3.6.2; [readinessGates field](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L630-L641) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976); [Ready evaluation](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L679-L686) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

### Self-check
1. **Q.** annotation 없이 Ingress(class `alb`)를 만들면 어떤 ALB가 생기나요? **A.** `scheme` 기본값 `internal`이라 internal ALB가 생기고, `target-type` 기본값 `instance`라 노드의 NodePort가 target이 됩니다. 인터넷용 `ip` 모드는 `internet-facing`과 `ip`를 둘 다 적어야 합니다.
2. **Q.** `ip` 모드에서 target `Id`와 `Port`는 어디서 오나요? 요청은 어떤 hop을 지나나요? **A.** LBC가 TGB의 `serviceRef` Service의 EndpointSlice에서 ready Pod IP와 포트를 읽어 `RegisterTargets`로 넣습니다. 요청은 ALB → Pod IP:8080으로 바로 가고 NodePort와 `kube-proxy`를 지나지 않습니다.
3. **Q.** target 상태 `initial`에서 `healthy`로 가는 조건은? readiness probe와는 무엇이 다른가요? **A.** ALB health check가 healthy threshold(LBC 기본 2회, 15초 간격)만큼 연속 성공하면 `healthy`입니다. readiness probe는 kubelet이 하며 EndpointSlice를 바꾸고, ALB health check는 ALB가 하며 target 상태를 바꿉니다.
4. **Q.** Pod readiness gate가 붙지 않는 흔한 이유 두 가지는? **A.** namespace에 `elbv2.k8s.aws/pod-readiness-gate-inject: enabled` label이 없거나, Pod가 Ingress·Service(TGB)보다 먼저 만들어졌기 때문입니다. 주입은 Pod 생성 때만 일어나고 `ip` 모드에서만 됩니다.
5. **Q.** ALB에서 cross-zone load balancing을 끌 수 있나요? **A.** load balancer 속성으로는 끌 수 없습니다(ALB 기본 `true`, 변경 불가). Target Group 속성 `load_balancing.cross_zone.enabled`는 기본 `use_load_balancer_configuration`이고 `false`로 덮어쓸 수 있습니다.

### Unverified
- `X-Forwarded-For` 헤더: ALB가 client IP를 이 헤더로 넘긴다는 내용은 ALB 사용자 가이드(docs.aws.amazon.com)에만 있고 이 세션에서 열 수 없어 확인하지 못했습니다. `ip` 모드에서 Pod가 보는 source IP가 무엇인지도 같은 이유로 확인하지 못했습니다.
- ALB가 target을 고르는 기본 알고리즘, 모든 target이 `unhealthy`일 때의 동작: ELB 문서에서만 확인할 수 있어 적지 않았습니다.
- ALB DNS 이름의 뒷부분 형식(`-<숫자>.<region>.elb.amazonaws.com`): E.G.로만 표시했습니다.

## Lesson 8 — `pod-lifecycle`: 요청을 떨어뜨리지 않는 rolling update

**Critical path.** 새 Pod `Ready` + ALB `healthy` → 옛 Pod 삭제 → (ALB `draining` ‖ `preStop`) → SIGTERM → 종료; 순서가 어긋나면 5xx

**Goal.** Deployment rollout에서 새 Pod가 언제 traffic을 받고, 옛 Pod가 언제 traffic에서 빠지고 언제 죽는지를 한 흐름으로 그립니다. 그리고 `preStop` 없이 배포할 때 생기는 5xx가 어디서 오는지 보여 줍니다.

**Interview questions.**
- `maxSurge`와 `maxUnavailable`은 무엇이고, 기본값과 반올림 규칙은? replica 2개면 어떻게 되나요?
- readiness, liveness, startup probe는 각각 무엇을 바꾸나요?
- Pod를 지우면 무엇이 어떤 순서로 일어나나요? `preStop`, SIGTERM, `terminationGracePeriodSeconds`, SIGKILL의 관계는?
- ALB 뒤 서비스에서 배포할 때마다 5xx가 잠깐 나는 이유와 해결책은?

**Nodes.** critical path: `dev`, `apiserver`, `kcm`, `podb`, `alb`, `lbc`, `elbapi`, `kubelet`, `containerd`, `pod` · side: `scheduler`, `user` (positions from Topic layout)

**State panels.**
| node | title | view | initial |
|---|---|---|---|
| podb | 새 Pod `shop/orders-7c9b5d8f6-x2k4q` (v2) `status.conditions` | table: type · status | (Pod 없음) |
| alb | Target Group `k8s-shop-orders-9f8e7d6c5b` targets (E.G.) | table: target · Pod · state | `10.0.18.34:8080` · `pod` (v1) · `healthy` / `10.0.29.71:8080` · 다른 v1 Pod (장면 밖) · `healthy` |
| pod | 옛 Pod `shop/orders-6d8f9c7b4-a1b2c` (v1) | table: field · value | `deletionTimestamp` — · `phase` `Running` · container `app` `running` |

### Steps

#### 8.1 `template-change` — Deployment의 Pod template을 바꿉니다 · `move` dev → apiserver · token `request`: `PATCH /apis/apps/v1/namespaces/shop/deployments/orders`
- **Summary:** image를 `v2`로 바꾸면 `.spec.template`이 바뀌므로 rollout이 시작됩니다.
- **Detail:** rollout은 `.spec.template`이 바뀔 때만 일어납니다. scale처럼 다른 필드만 바꾸면 새 ReplicaSet이 생기지 않습니다. 기본 strategy는 `RollingUpdate`입니다. 이 레슨의 Deployment는 `replicas: 2`이고, Pod는 `ip` 모드 ALB 뒤에 있으며 namespace에 readiness gate 주입 label이 있습니다.
- **Facts:**
  | key | value |
  |---|---|
  | rollout trigger | `.spec.template` 변경만 (scale은 아님) |
  | `.spec.strategy.type` 기본값 | `RollingUpdate` (다른 값: `Recreate`) |
- **Event log:** `dev → apiserver · HTTPS REST · PATCH Deployment shop/orders image orders:v2 · —`
- **Record:** R8.1
- **Sources:**
  - [Rollout triggered only when .spec.template changes](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L166-L169) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Strategy: Recreate or RollingUpdate (default)](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L1176-L1180) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 8.2 `new-replicaset` — 새 ReplicaSet이 Pod 하나를 더 만듭니다 · `move` kcm → apiserver · token `call`: `POST replicasets orders-7c9b5d8f6 (replicas 1)`
- **Summary:** `maxSurge`·`maxUnavailable` 기본값은 25%입니다. `replicas: 2`면 surge 1, unavailable 0입니다.
- **Detail:** Deployment controller는 새 template의 hash를 `pod-template-hash` label로 단 새 ReplicaSet을 만들고, 이것을 늘리며 옛 ReplicaSet을 줄입니다. `maxSurge`는 올림, `maxUnavailable`은 내림이라 `replicas: 2`에서는 1과 0입니다. 그래서 새 Pod가 available이 되기 전에는 옛 Pod를 지우지 않습니다.
- **Facts:**
  | key | value |
  |---|---|
  | `maxSurge` 기본값 | `25%`, 올림 → replicas 2면 `1` |
  | `maxUnavailable` 기본값 | `25%`, 내림 → replicas 2면 `0` |
  | 둘 다 0 | 불가 (한쪽이 0이면 다른 쪽은 0이 아니어야 함) |
- **Event log:** `kcm → apiserver · HTTPS REST · POST ReplicaSet shop/orders-7c9b5d8f6 replicas=1 · —`
- **Sources:**
  - [New ReplicaSet scaled up while old one scales down](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L37) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [pod-template-hash label](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L159-L162) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [maxUnavailable / maxSurge: default 25%, rounding, cannot both be 0](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L1203-L1218) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Does not kill old Pods until enough new Pods have come up](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L271-L273) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 8.3 `new-pod-probes` — 새 Pod의 readiness probe가 통과합니다 · `mutate` podb
- **Summary:** probe 통과로 `ContainersReady`는 `True`지만, ALB gate가 `False`라 Pod는 아직 `Ready`가 아닙니다.
- **Detail:** `kube-scheduler`가 node B에 둔 새 Pod를 node B의 `kubelet`이 시작하고 probe를 돌립니다. `startupProbe`가 있으면 성공할 때까지 readiness·liveness probe는 돌지 않습니다. readiness 실패는 Pod를 traffic에서 빼기만 하고, liveness가 `failureThreshold`번 연속 실패하면 kubelet이 container를 재시작합니다.
- **Facts:**
  | key | value |
  |---|---|
  | probe 기본값 | `periodSeconds` `10` · `timeoutSeconds` `1` · `failureThreshold` `3` |
  | `startupProbe` | 성공 전까지 liveness·readiness probe 보류 |
  | 실패하면 | readiness → EndpointSlice에서 제외, liveness → container 재시작 |
- **Event log:** `kubelet(node B) → podb · HTTP probe · GET /ready → 200 · —`
- **After:**
  | type | status |
  |---|---|
  | `PodScheduled` | `True` |
  | `Initialized` | `True` |
  | `ContainersReady` | `True` |
  | `target-health.elbv2.k8s.aws/k8s-shop-orders-9f8e7d6c5b` | `False` |
  | `Ready` | `False` |
- **Sources:**
  - [Startup, liveness, readiness probe behavior](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L799-L837) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Probe defaults: periodSeconds 10, timeoutSeconds 1, failureThreshold 3](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/probes.md#L250-L260) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Containers ready but a gate False → only ContainersReady](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L679-L686) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Startup probe protects slow starts; liveness takes over after it succeeds](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes.md#L302-L338) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 8.4 `target-healthy` — ALB에서 새 target이 `healthy`가 됩니다 · `mutate` alb
- **Summary:** LBC가 새 Pod IP를 등록하면 `initial`로 시작하고, health check가 연속 성공하면 `healthy`가 됩니다.
- **Detail:** LBC는 EndpointSlice 변경을 watch합니다. readiness gate 때문에 아직 `Ready`가 아닌 Pod도 container가 ready이고 terminating이 아니면 등록 대상입니다. 등록 → `initial` → ALB health check 통과 → `healthy` 순서는 레슨 7과 같습니다(LBC 기본 15초 간격, 2회 성공).
- **Facts:**
  | key | value |
  |---|---|
  | 등록 대상 | EndpointSlice `ready`, 또는 `ContainersReady`이고 terminating이 아닌 Pod |
  | 상태 흐름 | `initial` → `healthy` |
- **Event log:** `lbc → elbapi · AWS ELBv2 API · RegisterTargets [10.0.45.67:8080] → initial → healthy · —`
- **After:**
  | target | Pod | state |
  |---|---|---|
  | `10.0.18.34:8080` | `pod` (v1) | `healthy` |
  | `10.0.29.71:8080` | 다른 v1 Pod (장면 밖) | `healthy` |
  | `10.0.45.67:8080` | `podb` (v2) | `healthy` |
- **Sources:**
  - [Endpoint resolver: ready, or containers-ready and not terminating on a Ready node](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/backend/endpoint_resolver.go#L170-L200) — AWS Load Balancer Controller v3.6.2
  - [EndpointSlice update enqueues ip-mode TargetGroupBindings](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/controllers/elbv2/eventhandlers/endpointslices.go#L46-L53) — AWS Load Balancer Controller v3.6.2
  - [Health check defaults](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L49-L56) — AWS Load Balancer Controller v3.6.2
  - [TargetHealthStateEnum](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/types/enums.go#L541-L547) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6

#### 8.5 `gate-true` — readiness gate가 `True`, 새 Pod가 `Ready`가 됩니다 · `mutate` podb
- **Summary:** LBC가 gate를 `True`로 쓰면 Pod가 `Ready`가 되고, Deployment는 그제야 옛 Pod를 줄입니다.
- **Detail:** Deployment는 Pod가 `Ready`이고 `minReadySeconds`(기본 0)가 지나야 available로 셉니다. gate가 없으면 kubelet probe만 통과해도 `Ready`가 되어, ALB target이 아직 `initial`인데 옛 Pod가 지워질 수 있습니다. replica가 적으면 Target Group에 `initial`·`draining` target만 남는 순간 장애가 납니다.
- **Facts:**
  | key | value |
  |---|---|
  | available 조건 | `Ready` + `minReadySeconds` (기본 `0`) |
  | gate 효과 | 새 target이 `healthy`가 될 때까지 옛 Pod 삭제 보류 |
  | gate가 없을 때 | TG에 `initial`/`draining` target만 남으면 장애 |
- **Event log:** `lbc → apiserver · HTTPS REST · PATCH pods/orders-7c9b5d8f6-x2k4q/status target-health.elbv2.k8s.aws/k8s-shop-orders-9f8e7d6c5b=True · —`
- **After:**
  | type | status |
  |---|---|
  | `PodScheduled` | `True` |
  | `Initialized` | `True` |
  | `ContainersReady` | `True` |
  | `target-health.elbv2.k8s.aws/k8s-shop-orders-9f8e7d6c5b` | `True` |
  | `Ready` | `True` |
- **Sources:**
  - [minReadySeconds default 0; available = ready for that long](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L1336-L1338) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Why the gate: Initial/Draining-only target group during a fast rollout; old Pods kept until Healthy](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/deploy/pod_readiness_gate.md#L8-L16) — AWS Load Balancer Controller v3.6.2
  - [Condition True only when target state is healthy](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/resource_manager.go#L518-L531) — AWS Load Balancer Controller v3.6.2

#### 8.6 `old-pod-delete` — 옛 Pod에 `deletionTimestamp`가 찍힙니다 · `mutate` pod
- **Summary:** 옛 Pod를 DELETE하면 API server가 `deletionTimestamp`(지금 + grace 30초)를 씁니다.
- **Detail:** 옛 ReplicaSet이 2 → 1로 줄며 Pod 하나가 삭제 요청됩니다. Pod는 바로 사라지지 않고 `Terminating`이 됩니다. 이 순간 두 흐름이 동시에 시작됩니다. node A의 `kubelet`은 종료 절차를 시작하고, control plane은 이 Pod를 EndpointSlice에서 빼는 쪽으로 갑니다. 이 두 흐름의 경쟁이 다음 step의 장애를 만듭니다.
- **Facts:**
  | key | value |
  |---|---|
  | `metadata.deletionTimestamp` | 서버가 설정 (요청 시각 + grace), client가 직접 쓸 수 없음 |
  | grace 기본값 | `terminationGracePeriodSeconds` `30` |
  | 동시에 시작 | kubelet 종료 절차 ‖ EndpointSlice에서 제외 |
- **Event log:** `kcm → apiserver · HTTPS REST · DELETE pods/orders-6d8f9c7b4-a1b2c · —`
- **After:**
  | field | value |
  |---|---|
  | `deletionTimestamp` | `2026-11-03T10:00:30Z` (E.G.) |
  | `deletionGracePeriodSeconds` | `30` |
  | `phase` | `Running` (`kubectl`은 `Terminating`으로 표시) |
  | container `app` | `running` |
- **Record:** R8.2
- **Sources:**
  - [DeletionTimestamp: set by server on graceful deletion, not settable by client](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/apimachinery/pkg/apis/meta/v1/types.go#L215-L228) — Kubernetes v1.37.1
  - [deletionTimestamp = now + GracePeriodSeconds](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/apiserver/pkg/registry/rest/delete.go#L163-L165) — Kubernetes v1.37.1
  - [Termination flow: Terminating, kubelet starts shutdown, default grace 30](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L903-L916) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [At the same time, control plane removes the Pod from EndpointSlices](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L935-L940) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 8.7 `race-5xx` — `preStop`이 없으면 앱이 먼저 닫히고 ALB는 아직 보냅니다 · `move` alb → pod · token `request`: `GET / (dst 10.0.18.34:8080) → 연결 실패`
- **Summary:** `preStop`이 없으면 SIGTERM이 곧바로 가서 앱이 닫히는데, ALB target은 아직 `healthy`라 요청이 실패합니다.
- **Detail:** `preStop`이 없으면 kubelet은 삭제 직후 바로 TERM을 보냅니다. 반면 ALB에서 target이 빠지려면 EndpointSlice 갱신 → LBC watch·reconcile → `DeregisterTargets`가 끝나야 합니다. 그 사이 ALB가 닫힌 Pod로 보낸 요청은 실패하고 사용자는 5xx를 봅니다. 흔히 502로 보고되지만 이 세션에서 ELB 문서로 확인하지 못했습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 경쟁 | kubelet TERM ‖ EndpointSlice → LBC → `DeregisterTargets` |
  | 증상 | 배포마다 짧은 5xx 구간 (응답 코드 502는 unverified) |
  | 해결 | `preStop` sleep으로 TERM을 늦추고, grace를 그만큼 늘림 (8.8) |
- **Event log:** `alb → pod · HTTP/1.1 (VPC) · GET / → 연결 실패 → user에게 5xx · —`
- **Sources:**
  - [kubelet shutdown and EndpointSlice removal start at the same time](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L909-L940) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [LBC reacts to EndpointSlice updates](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/controllers/elbv2/eventhandlers/endpointslices.go#L46-L53) — AWS Load Balancer Controller v3.6.2
  - [LBC deregisters unmatched targets in reconcile](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/resource_manager.go#L245-L250) — AWS Load Balancer Controller v3.6.2

#### 8.8 `prestop-sleep` — kubelet이 `preStop` sleep을 먼저 실행합니다 · `move` kubelet → pod · token `call`: `preStop sleep 15s (E.G.)`
- **Summary:** `preStop`이 끝나야 SIGTERM이 갑니다. sleep 동안 앱은 요청을 계속 처리하며 ALB가 target을 빼길 기다립니다.
- **Detail:** `preStop`은 TERM보다 먼저 실행되고, 끝나야 TERM이 갑니다. grace 카운트다운은 `preStop` 전에 시작하므로 grace는 preStop 시간과 앱 종료 시간의 합보다 커야 합니다. `sleep` action은 kubelet이 직접 실행하므로 image에 shell이나 `sleep` binary가 없어도 됩니다.
- **Facts:**
  | key | value |
  |---|---|
  | 순서 | grace 카운트 시작 → `preStop` 완료 → TERM |
  | grace 계산 | `terminationGracePeriodSeconds` > preStop + 앱 종료 시간 |
  | `sleep` action | kubelet이 실행, `PodLifecycleSleepAction` 1.34부터 stable |
- **Event log:** `kubelet → pod · container lifecycle hook · preStop sleep (E.G. 15) · —`
- **Record:** R8.3
- **Sources:**
  - [PreStop: must complete before TERM; grace countdown begins before the hook](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/containers/container-lifecycle-hooks.md#L42-L50) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [sleep handler executed by the kubelet process](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/containers/container-lifecycle-hooks.md#L66-L78) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Grace covers hook + normal stop (60 vs 55+10 example)](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/containers/container-lifecycle-hooks.md#L88-L96) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [PodLifecycleSleepAction stable since 1.34](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/command-line-tools-reference/feature-gates/PodLifecycleSleepAction.md#L8-L22) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 8.9 `deregister` — LBC가 옛 Pod IP를 `DeregisterTargets`합니다 · `move` lbc → elbapi · token `call`: `DeregisterTargets [10.0.18.34:8080]`
- **Summary:** EndpointSlice의 옛 endpoint가 `ready: false`, `terminating: true`가 되면 LBC가 target을 뺍니다.
- **Detail:** 종료 중인 Pod의 endpoint는 EndpointSlice에서 바로 지워지지 않고 `ready: false`, `terminating: true`로 남습니다. LBC는 이 변경 이벤트로 TGB를 reconcile하고, terminating endpoint를 등록 대상에서 뺀 뒤 대상에 없는 target을 `DeregisterTargets`합니다. `preStop` sleep이 이 시간을 벌어 줍니다.
- **Facts:**
  | key | value |
  |---|---|
  | 종료 중 endpoint | `ready: false` · `serving: true` · `terminating: true` |
  | LBC 판단 | terminating endpoint는 대상에서 제외 → `DeregisterTargets` |
- **Event log:** `lbc → elbapi · AWS ELBv2 API · DeregisterTargets [10.0.18.34:8080] · —`
- **Record:** R8.4
- **Sources:**
  - [EndpointSlice conditions serving / terminating / ready](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/endpoint-slices.md#L96-L116) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Terminating endpoints stay with ready false](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L947-L951) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [LBC excludes terminating endpoints](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/backend/endpoint_resolver.go#L170-L200) — AWS Load Balancer Controller v3.6.2
  - [Unmatched targets deregistered](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/resource_manager.go#L210-L250) — AWS Load Balancer Controller v3.6.2

#### 8.10 `draining` — 옛 target이 `draining`이 됩니다 · `mutate` alb
- **Summary:** ALB는 새 요청을 보내지 않고 진행 중인 요청만 마칩니다. deregistration delay(기본 300초) 뒤 `unused`입니다.
- **Detail:** `DeregisterTargets` 뒤 ALB는 그 target에 새 요청을 보내지 않고, 이미 열린 연결의 요청은 connection draining으로 마칩니다. `deregistration_delay.timeout_seconds`(기본 300, 범위 0–3600초)가 지나면 `draining` → `unused`입니다. LBC에서는 `target-group-attributes` annotation으로 이 값을 바꿉니다.
- **Facts:**
  | key | value |
  |---|---|
  | `draining` 동작 | 새 요청 중단, in-flight 요청은 마무리 |
  | delay 기본값 | `300`초 (0–3600), 끝나면 `unused` |
  | reason | `Target.DeregistrationInProgress` |
- **Event log:** `elbapi → alb · ELBv2 · target 10.0.18.34:8080 draining · —`
- **After:**
  | target | Pod | state |
  |---|---|---|
  | `10.0.18.34:8080` | `pod` (v1, 종료 중) | `draining` |
  | `10.0.29.71:8080` | 다른 v1 Pod (장면 밖) | `healthy` |
  | `10.0.45.67:8080` | `podb` (v2) | `healthy` |
- **Sources:**
  - [DeregisterTargets: stops new requests, connection draining for in-flight](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/api_op_DeregisterTargets.go#L11-L17) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6
  - [deregistration_delay.timeout_seconds: draining → unused, 0-3600, default 300](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/types/types.go#L1497-L1501) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6
  - [draining reason Target.DeregistrationInProgress](https://github.com/aws/aws-sdk-go-v2/blob/service/elasticloadbalancingv2/v1.63.6/service/elasticloadbalancingv2/types/types.go#L1732-L1735) — aws-sdk-go-v2 service/elasticloadbalancingv2 v1.63.6
  - [target-group-attributes: deregistration_delay.timeout_seconds](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L1109-L1118) — AWS Load Balancer Controller v3.6.2

#### 8.11 `sigterm-exit` — SIGTERM, 앱 종료, 남으면 SIGKILL · `move` containerd → pod · token `data`: `SIGTERM → (grace 만료 시) SIGKILL`
- **Summary:** `preStop`이 끝나면 runtime이 PID 1에 SIGTERM을 보냅니다. grace가 끝날 때 남은 프로세스는 SIGKILL을 받습니다.
- **Detail:** kubelet이 `containerd`에 container 중지를 요청하면 runtime이 PID 1에 TERM을 보냅니다. image에 `STOPSIGNAL`이 있으면 그 signal을 씁니다. 앱은 남은 요청을 마치고 끝나야 합니다. grace가 끝났는데 살아 있으면 SIGKILL입니다. `preStop`이 grace를 넘기면 2초를 한 번 더 줍니다.
- **Facts:**
  | key | value |
  |---|---|
  | 신호 | TERM → PID 1 (image `STOPSIGNAL`이 우선) |
  | grace 만료 | SIGKILL, 이어서 Pod 객체 삭제 |
  | `preStop`이 grace 초과 | 1회 2초 연장 |
- **Event log:** `containerd → pod · CRI stop → signal · SIGTERM → exit · —`
- **Sources:**
  - [kubelet asks the runtime to send TERM, then KILL after the grace period](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L854-L862) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [preStop over grace: one-off 2 s extension; TERM to process 1](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L918-L928) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Grace expiry: SIGKILL, terminal phase, API object removed](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L959-L969) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [terminationGracePeriodSeconds: TERM to KILL window, default 30](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L4410-L4419) — Kubernetes v1.37.1

**Replay.** dev → apiserver → kcm → podb (probe) → alb (`healthy`) → podb (`Ready`) → pod (`deletionTimestamp`) → kubelet → pod (`preStop`) ‖ lbc → elbapi → alb (`draining`) → containerd → pod (SIGTERM → 종료)

**Overview.**
- replica가 많으면 `maxUnavailable` 25%만큼 옛 Pod가 rollout 시작 즉시 줄 수 있습니다 ([deployment.md](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L1208-L1211) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)). 이때도 `preStop`이 같은 5xx를 막습니다.
- `kube-proxy` 등 Service proxy도 같은 `terminating` 신호로 옛 endpoint를 빼므로, 클러스터 안 호출도 같은 경쟁을 겪습니다 ([endpoint-slices.md](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/endpoint-slices.md#L105-L109) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)).
- LBC의 readiness gate webhook은 v2.11.0 이후 기본 `failurePolicy: Ignore`라 LBC가 내려가 있을 때 만든 Pod에는 gate가 없습니다 ([pod_readiness_gate.md](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/deploy/pod_readiness_gate.md#L50-L60) — AWS Load Balancer Controller v3.6.2).
- EKS managed node group의 node drain도 같은 순서(`preStop` → SIGTERM → grace)를 밟습니다 ([EKS](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/delete-managed-node-group.adoc#L15) — Amazon EKS User Guide @ 8d43223 (2026-09-16)).
- `preStop` 15초, grace 45초 같은 숫자는 E.G.입니다. 필요한 sleep 길이는 LBC reconcile과 ALB 반영 시간에 달려 있고, 그 시간은 공개 문서로 확인하지 못했습니다.

### Decoder records

#### R8.1 Deployment `shop/orders` (rollout에 관여하는 필드) · step 8.1 · wire: true
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders
  namespace: shop
spec:
  replicas: 2
  minReadySeconds: 0
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
  template:
    metadata:
      labels:
        app: orders
    spec:
      containers:
      - name: app
        image: 111122223333.dkr.ecr.us-west-2.amazonaws.com/orders:v2   # changed: v1 → v2
        readinessProbe:
          httpGet: {path: /ready, port: 8080}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `spec.replicas` | `2` | 원하는 Pod 수 | E.G. |
| `spec.strategy.type` | `RollingUpdate` | 기본값 | |
| `rollingUpdate.maxSurge` | `25%` | replicas 위로 더 만들 수 있는 수, 올림 → 1 | |
| `rollingUpdate.maxUnavailable` | `25%` | 동시에 unavailable 허용 수, 내림 → 0 | |
| `spec.minReadySeconds` | `0` | Ready 후 available로 칠 때까지 기다리는 초 | |
| `spec.template...image` | `orders:v2` | 바뀌면 새 ReplicaSet(새 `pod-template-hash`) | E.G. |

Sources: [strategy](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L1176-L1218) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976); [minReadySeconds](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L1336-L1338) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976); [rollout trigger](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/controllers/deployment.md#L166-L169) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### R8.2 옛 Pod `shop/orders-6d8f9c7b4-a1b2c` 삭제 직후 · step 8.6 · wire: true
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: orders-6d8f9c7b4-a1b2c
  namespace: shop
  labels:
    app: orders
    pod-template-hash: 6d8f9c7b4
  deletionTimestamp: "2026-11-03T10:00:30Z"
  deletionGracePeriodSeconds: 30
spec:
  terminationGracePeriodSeconds: 30
status:
  phase: Running
  podIP: 10.0.18.34
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.deletionTimestamp` | `2026-11-03T10:00:30Z` | 삭제 요청 시각 + grace; 이 값이 있으면 `Terminating` | E.G. |
| `metadata.deletionGracePeriodSeconds` | `30` | 이번 삭제에 적용된 grace | |
| `spec.terminationGracePeriodSeconds` | `30` | Pod 기본 grace (생략 시 30) | |
| `metadata.labels.pod-template-hash` | `6d8f9c7b4` | 옛 ReplicaSet 소속 | E.G. |
| `status.phase` | `Running` | 종료 중에도 container가 끝날 때까지 Running | |

Sources: [DeletionTimestamp](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/apimachinery/pkg/apis/meta/v1/types.go#L215-L245) — Kubernetes v1.37.1; [now + grace](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/apiserver/pkg/registry/rest/delete.go#L163-L165) — Kubernetes v1.37.1; [terminationGracePeriodSeconds](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L4410-L4419) — Kubernetes v1.37.1; [phase set terminal only after containers stop](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L959-L966) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### R8.3 해결 설정: `preStop` sleep + grace · step 8.8 · wire: true
```yaml
spec:
  terminationGracePeriodSeconds: 45     # > preStop 15 + app shutdown (E.G.)
  containers:
  - name: app
    lifecycle:
      preStop:
        sleep:
          seconds: 15                   # E.G.
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `lifecycle.preStop.sleep.seconds` | `15` | TERM 전에 기다릴 시간; kubelet이 실행 | E.G. |
| `spec.terminationGracePeriodSeconds` | `45` | preStop + 앱 종료를 모두 덮어야 함; 넘기면 SIGKILL | E.G. |

Sources: [SleepAction.Seconds](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L2929-L2932) — Kubernetes v1.37.1; [LifecycleHandler.Sleep](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L3361-L3363) — Kubernetes v1.37.1; [Lifecycle.PreStop](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L3448-L3458) — Kubernetes v1.37.1; [grace covers hook + stop](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/containers/container-lifecycle-hooks.md#L88-L96) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### R8.4 EndpointSlice의 종료 중 endpoint · step 8.9 · wire: true
```json
{
  "addressType": "IPv4",
  "endpoints": [
    {
      "addresses": ["10.0.18.34"],
      "conditions": { "ready": false, "serving": true, "terminating": true },
      "targetRef": { "kind": "Pod", "name": "orders-6d8f9c7b4-a1b2c", "namespace": "shop" }
    },
    {
      "addresses": ["10.0.45.67"],
      "conditions": { "ready": true, "serving": true, "terminating": false },
      "targetRef": { "kind": "Pod", "name": "orders-7c9b5d8f6-x2k4q", "namespace": "shop" }
    }
  ]
}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `endpoints[].addresses` | `10.0.18.34` | Pod IP = ALB target `Id` | E.G. |
| `conditions.ready` | `false` | terminating이면 항상 false; LB가 일반 traffic에 쓰지 않음 | |
| `conditions.serving` | `true` | 아직 응답 중 (Pod `Ready` 기준) | |
| `conditions.terminating` | `true` | `deletionTimestamp`가 찍힘 | |
| `targetRef` | `Pod orders-6d8f9c7b4-a1b2c` | LBC가 Pod를 찾는 키 | E.G. |

Sources: [conditions](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/services-networking/endpoint-slices.md#L83-L116) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976); [terminating endpoint example](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tutorials/services/pods-and-endpoint-termination-flow.md#L118-L168) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976); [LBC uses targetRef and conditions](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/backend/endpoint_resolver.go#L147-L200) — AWS Load Balancer Controller v3.6.2

### Self-check
1. **Q.** `replicas: 2`, 기본 strategy에서 rollout 첫 순간 Pod 수는? **A.** `maxSurge` 25% 올림 = 1, `maxUnavailable` 25% 내림 = 0입니다. 새 Pod 1개가 더 생겨 3개가 되고, 새 Pod가 available이 될 때까지 옛 Pod는 지워지지 않습니다.
2. **Q.** readiness, liveness, startup probe가 실패하면 각각 무슨 일이 생기나요? **A.** readiness 실패는 Pod를 EndpointSlice(traffic)에서 빼기만 합니다. liveness는 `failureThreshold`번 연속 실패하면 container를 재시작합니다. startup probe는 성공 전까지 나머지 probe를 막고, 끝내 실패하면 container를 죽입니다.
3. **Q.** Pod 삭제 뒤 `preStop`, SIGTERM, SIGKILL의 순서와 grace의 시작점은? **A.** grace 카운트가 먼저 시작하고, `preStop`이 끝나야 TERM이 PID 1에 갑니다. grace가 끝날 때 남은 프로세스는 SIGKILL을 받습니다. 그래서 grace는 preStop + 앱 종료 시간보다 커야 합니다.
4. **Q.** ALB `ip` 모드 서비스가 배포 때마다 5xx를 잠깐 내는 이유와 해결책은? **A.** kubelet의 TERM과 EndpointSlice → LBC → `DeregisterTargets` 흐름이 동시에 시작해서, ALB가 target을 빼기 전에 앱이 닫히기 때문입니다. `preStop` sleep으로 TERM을 늦추고 grace를 그만큼 늘립니다. 새 Pod 쪽은 readiness gate로 `healthy` 전 옛 Pod 삭제를 막습니다.
5. **Q.** `draining` target은 언제 `unused`가 되나요? **A.** `deregistration_delay.timeout_seconds`(기본 300초) 뒤입니다. 그동안 ALB는 새 요청을 보내지 않고 진행 중 요청만 마칩니다.

### Unverified
- 이 장애의 ALB 응답 코드가 502인지(503 등 다른 코드인지): ALB troubleshooting 문서(docs.aws.amazon.com)에서만 확인할 수 있어 미확인입니다. step에는 "5xx"로만 적었습니다.
- `DeregisterTargets` 호출 뒤 ALB 노드 전체가 새 요청을 멈추기까지 걸리는 시간, LBC reconcile 지연: 공개 출처를 찾지 못했습니다. 그래서 `preStop` sleep 값은 E.G.입니다.
- 진행 중 요청이 모두 끝나면 deregistration delay 전에 `unused`로 가는지: SDK model에는 없고 ELB 문서에만 있어 미확인입니다.

## Lesson 9 — `irsa`: IRSA — ServiceAccount token 한 장이 STS 임시 자격 증명이 되기까지

**Critical path.** SA token(aud `sts.amazonaws.com`) → SDK → STS `AssumeRoleWithWebIdentity` → OIDC 키로 서명 검증 → trust policy `sub`/`aud` → 임시 자격 증명

**Goal.** `shop/orders` Pod가 SA annotation 하나로 env와 token 파일을 받고, 그 JWT를 STS가 OIDC 공개키와 trust policy로 검증해 임시 자격 증명을 내주는 길을 그린다.

**Interview questions.**
- ServiceAccount에 annotation 하나를 달았을 뿐인데 왜 Pod spec에 env와 volume이 생기는가? 왜 기존 Pod에는 안 생기는가?
- Pod 안의 SDK는 STS에 무엇을 보내고, STS는 그 token이 진짜인지 무엇으로 확인하는가?
- projected token은 언제 갱신되는가? 앱은 무엇을 해야 하는가?
- `AssumeRoleWithWebIdentity`가 거부될 때 가장 먼저 무엇을 보는가? (trust policy의 `sub`, `aud`)

**Nodes.** critical path: `dev`, `apiserver`, `webhook`, `kubelet`, `pod`, `sts`, `oidc` · side: `etcd` (positions from Topic layout)

**State panels.**
| node | title | view | initial |
|---|---|---|---|
| pod | Pod `orders-7d9c5b8f6-x2k4q` spec (AWS 관련) | table: `field`, `값` | `serviceAccountName`=`orders` · `env`=(없음) · AWS token volume=(없음) |
| kubelet | token cache (node A) | table: `key (ns/SA · audience)`, `만료`, `갱신 시점` | (비어 있음) |
| sts | `AssumeRoleWithWebIdentity` 판정 | table: `검사`, `기준`, `결과` | 서명 / `iss` / `aud` / `sub` / 결과 — 모두 `—` |

### Steps

#### 9.1 `annotate-sa` — ServiceAccount에 role ARN을 단다 · `move` dev → apiserver · token `request`: `annotate SA eks.amazonaws.com/role-arn`
- **Summary:** SA의 `eks.amazonaws.com/role-arn` annotation이 "이 SA는 이 role을 쓴다"는 유일한 연결이다.
- **Detail:** 전제가 둘 있다. IAM에 클러스터 OIDC issuer URL로 OIDC provider(audience `sts.amazonaws.com`)가 있어야 하고, role의 trust policy가 그 provider와 `aud`·`sub` 조건을 담아야 한다(R9.3). Kubernetes는 이 annotation을 해석하지 않는다. 해석은 Pod가 만들어질 때 `pod-identity-webhook`이 한다.
- **Facts:**
  | key | value |
  |---|---|
  | annotation | `eks.amazonaws.com/role-arn: arn:aws:iam::111122223333:role/orders-s3-reader` (E.G.) |
  | 전제 1 | IAM OIDC provider = 클러스터 issuer URL, audience `sts.amazonaws.com` |
  | 전제 2 | role trust policy: `Principal.Federated` = 그 provider, `sts:AssumeRoleWithWebIdentity`, `aud`/`sub` 조건 |
- **Event log:** `dev → apiserver · HTTPS REST · kubectl annotate serviceaccount -n shop orders eks.amazonaws.com/role-arn=… · —`
- **Sources:**
  - [EKSUG: kubectl annotate serviceaccount … eks.amazonaws.com/role-arn](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/associate-service-account-role.adoc#L118-L123) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: an IAM OIDC provider must exist for the cluster's issuer URL](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/enable-iam-roles-for-service-accounts.adoc#L13-L13) / [audience sts.amazonaws.com](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/enable-iam-roles-for-service-accounts.adoc#L74-L78) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [IRSAWH README: OIDC provider, trust policy, SA annotation](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/README.md#L15-L66) — amazon-eks-pod-identity-webhook @ 52496af

#### 9.2 `admission-webhook` — Pod CREATE가 mutating webhook을 지난다 · `move` apiserver → webhook · token `call`: `AdmissionReview (Pod CREATE)`
- **Summary:** Pod 생성 요청이 mutating admission 단계에서 `pod-identity-webhook`으로 간다.
- **Detail:** admission은 mutating 다음 validating 순서로 돈다. webhook은 Pod의 namespace와 `serviceAccountName`으로 SA를 찾고, role-arn annotation이 있으면 patch를 돌려준다. 바뀌는 것은 새로 만들어지는 Pod뿐이다. annotation을 단 뒤에는 Pod를 다시 만들어야 한다. EKS에서 이 webhook이 어디서 도는지는 공개되어 있지 않다.
- **Facts:**
  | key | value |
  |---|---|
  | admission 순서 | mutating → validating |
  | EKS의 webhook 설정 | MutatingWebhookConfiguration `pod-identity-webhook` |
  | 적용 대상 | 새로 만들어지는 Pod만 (이미 떠 있는 Pod는 그대로) |
- **Event log:** `apiserver → webhook · HTTPS (AdmissionReview) · CREATE Pod shop/orders-7d9c5b8f6-x2k4q · —`
- **Sources:**
  - [K8SDOC: admission control phases — mutating, then validating](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/admission-controllers.md#L65-L70) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [EKSUG: MutatingWebhookConfiguration named pod-identity-webhook](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/addon-id-troubleshoot.adoc#L43-L44) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: the webhook watches Pods whose SA has the role-arn annotation](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-configuration.adoc#L99-L106) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: the mutating webhook doesn't apply env to Pods that are already running; re-create them](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/configure-sts-endpoint.adoc#L90-L90) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [IRSAWH README: all new pods launched using this SA are modified](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/README.md#L67-L69) / [handler.go: SA lookup by namespace and name → role ARN](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L474-L515) — amazon-eks-pod-identity-webhook @ 52496af

#### 9.3 `pod-mutated` — Pod spec에 env 2개와 token volume이 생긴다 · `mutate` pod
- **Summary:** env `AWS_ROLE_ARN`, `AWS_WEB_IDENTITY_TOKEN_FILE`과 aud `sts.amazonaws.com` volume이 생긴다.
- **Detail:** webhook은 각 container에 env 2개와 read-only volumeMount를 넣고, Pod에 `serviceAccountToken` projected volume을 더한다. 이 순간 token 파일은 아직 없다. 파일은 kubelet이 채운다. container에 같은 env가 이미 있으면 덮어쓰지 않는다.
- **Facts:**
  | key | value |
  |---|---|
  | `AWS_WEB_IDENTITY_TOKEN_FILE` | `/var/run/secrets/eks.amazonaws.com/serviceaccount/token` |
  | volume `aws-token` | projected `serviceAccountToken`, `audience: sts.amazonaws.com`, `expirationSeconds: 86400` |
  | 이미 있는 env | 덮어쓰지 않음 |
- **Event log:** `webhook → apiserver · HTTPS (AdmissionReview response) · JSONPatch: env 2개, volumeMount 1개, volume 1개 · —`
- **After:**
  | field | 값 |
  |---|---|
  | `serviceAccountName` | `orders` |
  | `env` `AWS_ROLE_ARN` | `arn:aws:iam::111122223333:role/orders-s3-reader` (E.G.) |
  | `env` `AWS_WEB_IDENTITY_TOKEN_FILE` | `/var/run/secrets/eks.amazonaws.com/serviceaccount/token` |
  | `volumeMounts` | `aws-token` → `/var/run/secrets/eks.amazonaws.com/serviceaccount/` (readOnly) |
  | `volumes` | `aws-token`: projected SA token, aud `sts.amazonaws.com`, 86400 s, path `token` (파일 아직 없음) |
- **Record:** R9.1
- **Sources:**
  - [IRSAWH README: example pod spec with fields added by the webhook](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/README.md#L67-L116) — amazon-eks-pod-identity-webhook @ 52496af
  - [IRSAWH handler.go: addEnvToContainer — no overwrite, read-only mount](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L173-L287) / [projected volume](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L352-L367) — amazon-eks-pod-identity-webhook @ 52496af
  - [IRSAWH main.go: default audience and mount path](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/main.go#L77-L81) / [constants.go: default expiration 86400](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/constants.go#L17-L21) — amazon-eks-pod-identity-webhook @ 52496af
  - [EKSUG: AWS_WEB_IDENTITY_TOKEN_FILE value](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-configuration.adoc#L83-L95) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 9.4 `token-request` — kubelet이 Pod 대신 token을 요청한다 · `move` kubelet → apiserver · token `request`: `TokenRequest (aud sts.amazonaws.com)`
- **Summary:** projected volume을 채우려고 kubelet이 `serviceaccounts/orders/token`(TokenRequest)을 호출한다.
- **Detail:** Pod가 node A에 배정되면 kubelet이 Pod 대신 token을 요청한다. 요청에는 volume에 적힌 audience와 `expirationSeconds`, 이 Pod를 가리키는 `boundObjectRef`가 들어간다. 그래서 Pod나 SA가 지워지면 token은 Kubernetes API에 대해 무효가 된다. 다른 audience(STS)는 bound object를 확인하지 않을 수 있으므로 `exp`가 사실상 수명이다.
- **Facts:**
  | key | value |
  |---|---|
  | API | `CoreV1().ServiceAccounts(ns).CreateToken` → subresource `serviceaccounts/token` |
  | `spec.audiences` / `spec.expirationSeconds` | `["sts.amazonaws.com"]` / `86400` |
  | `spec.boundObjectRef` | 이 Pod (kind, name, uid) |
- **Event log:** `kubelet → apiserver · HTTPS REST · POST /api/v1/namespaces/shop/serviceaccounts/orders/token · —`
- **Sources:**
  - [K8S token_manager.go: getToken → CreateToken](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/token/token_manager.go#L66-L76) — Kubernetes v1.37.1
  - [K8S authentication/v1 types.go: TokenRequestSpec — audiences, expirationSeconds, boundObjectRef (other audiences may not validate it)](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/authentication/v1/types.go#L197-L221) — Kubernetes v1.37.1
  - [K8SDOC: token becomes invalid against the API when the Pod or SA is deleted](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/configure-pod-container/configure-service-account.md#L418-L422) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 9.5 `token-issued` — 서명된 JWT가 파일로 쓰이고, 80% 지점에 갱신된다 · `mutate` kubelet
- **Summary:** kubelet이 apiserver가 서명한 JWT를 cache에 넣고 token 파일로 쓴다. TTL 80% 또는 24시간에 새로 받는다.
- **Detail:** token의 `sub`는 `system:serviceaccount:shop:orders`, `aud`는 요청한 audience, `iss`는 apiserver `--service-account-issuer`의 첫 값이다. kubelet은 token이 TTL의 80%를 넘거나 24시간을 넘으면 다시 요청한다. 86400초 token이면 69,120초(19.2시간)째다. 바뀐 파일을 다시 읽는 것은 앱(SDK)의 몫이다.
- **Facts:**
  | key | value |
  |---|---|
  | `sub` 형식 | `system:serviceaccount:<namespace>:<serviceaccount>` |
  | 갱신 조건 | 발급 후 경과 > 80% × TTL 또는 > 24h |
  | 앱의 몫 | 회전된 token 파일을 다시 읽기 (문서 예: 5분마다) |
- **Event log:** `apiserver → kubelet · HTTPS REST · TokenRequest 응답 (status.token, status.expirationTimestamp) · —`
- **After:**
  | key (ns/SA · audience) | 만료 | 갱신 시점 |
  |---|---|---|
  | `shop/orders` · `sts.amazonaws.com` | 발급 + 86400 s | 발급 + 69120 s (TTL 80%) |
- **Record:** R9.2
- **Sources:**
  - [K8S claims.go: Claims() — sub, aud, exp, kubernetes.io pod/serviceaccount](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/serviceaccount/claims.go#L77-L117) — Kubernetes v1.37.1
  - [K8S util.go: MakeUsername → system:serviceaccount:<ns>:<name>](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/apiserver/pkg/authentication/serviceaccount/util.go#L78-L80) — Kubernetes v1.37.1
  - [K8S token_manager.go: maxTTL 24h](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/token/token_manager.go#L39-L43) / [requiresRefresh: 80% of TTL or 24h](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/kubelet/token/token_manager.go#L172-L195) — Kubernetes v1.37.1
  - [K8SDOC: example pod-bound token payload, iss = first --service-account-issuer](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/configure-pod-container/configure-service-account.md#L428-L459) / [kubelet refresh at 80% or 24h, app reloads the token](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/configure-pod-container/configure-service-account.md#L474-L482) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [EKSUG: kubelet stores and refreshes the IRSA token (80% or 24h)](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-configuration.adoc#L97-L97) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 9.6 `assume-role-web-identity` — SDK가 token을 들고 STS로 간다 · `move` pod → sts · token `request`: `AssumeRoleWithWebIdentity (RoleArn, WebIdentityToken)`
- **Summary:** SDK가 token 파일을 읽어 `RoleArn`과 함께 STS `AssumeRoleWithWebIdentity`를 부른다. AWS 자격 증명은 필요 없다.
- **Detail:** 지원 SDK의 기본 credential chain이 `AWS_ROLE_ARN`과 `AWS_WEB_IDENTITY_TOKEN_FILE`을 보고 이 방식을 쓴다. 이 API는 AWS 자격 증명 없이 부를 수 있고, 호출자 신원은 token으로 증명한다. 인터넷 출구가 없는 VPC라면 STS interface endpoint와 regional STS endpoint가 필요하다. global `sts.amazonaws.com`은 VPC endpoint를 우회한다.
- **Facts:**
  | key | value |
  |---|---|
  | 필수 입력 | `RoleArn`, `RoleSessionName`, `WebIdentityToken` |
  | `DurationSeconds` | 기본 3600 (900부터 role 최대 세션 1–12시간까지) |
  | private VPC | `com.amazonaws.<region>.sts` interface endpoint + regional STS endpoint |
- **Event log:** `pod → sts · HTTPS (STS API) · AssumeRoleWithWebIdentity RoleArn=…/orders-s3-reader · —`
- **Sources:**
  - [GOSTS: AssumeRoleWithWebIdentity does not require AWS credentials; default 1h, 900 s to role max (1–12h)](https://github.com/aws/aws-sdk-go-v2/blob/service/sts/v1.51.6/service/sts/api_op_AssumeRoleWithWebIdentity.go#L23-L45) / [Input: RoleArn, RoleSessionName, WebIdentityToken, DurationSeconds](https://github.com/aws/aws-sdk-go-v2/blob/service/sts/v1.51.6/service/sts/api_op_AssumeRoleWithWebIdentity.go#L155-L223) — aws-sdk-go-v2 service/sts v1.51.6
  - [EKSUG: SDKs look for these env vars in the credential chain](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-configuration.adoc#L106-L106) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: STS interface endpoint; global endpoint bypasses the VPC endpoint](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/configure-sts-endpoint.adoc#L18-L21) / [private clusters need an STS VPC endpoint](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/private-clusters.adoc#L95-L95) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 9.7 `fetch-jwks` — STS가 클러스터 OIDC endpoint에서 공개키를 가져온다 · `move` sts → oidc · token `call`: `GET <issuer>/keys (JWKS)`
- **Summary:** STS는 token을 서명한 키의 공개키(JWKS)를 EKS가 호스팅하는 클러스터 OIDC endpoint에서 얻는다.
- **Detail:** EKS는 클러스터마다 공개 OIDC discovery endpoint를 두고 projected token 서명키의 공개키를 올린다. STS는 이 JWKS를 AWS 내부 경로로 가져오며 사용자 VPC를 거치지 않는다. 서명 private key는 7일마다 바뀌고 공개키는 만료까지 남는다. 그래서 발급된 token은 키 교체 뒤에도 검증된다.
- **Facts:**
  | key | value |
  |---|---|
  | JWKS URL | `https://oidc.eks.<region>.amazonaws.com/id/<ID>/keys` |
  | 응답 예 | `{"keys":[{"kty":"RSA","kid":"…","use":"sig","alg":"RS256",…}]}` |
  | 키 교체 | private key 7일마다, 공개키는 만료까지 유지 |
- **Event log:** `sts → oidc · HTTPS · GET https://oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE/keys · —`
- **Sources:**
  - [EKSUG: private key rotates every 7 days; public OIDC discovery endpoint per cluster so IAM can validate](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/iam-roles-for-service-accounts.adoc#L67-L71) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: issuer URL, /keys JWKS, RS256](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/irsa-fetch-keys.adoc#L29-L45) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: STS fetches the cluster's JWKS from within AWS, not through your VPC](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/security/vpc-interface-endpoints.adoc#L118-L118) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 9.8 `trust-policy-check` — trust policy가 `sub`와 `aud`를 맞춰 본다 · `mutate` sts
- **Summary:** 서명이 맞으면 role trust policy의 `Federated` provider, `aud`, `sub` 조건을 token claim과 비교한다.
- **Detail:** IRSA의 권한 경계는 네트워크가 아니라 trust policy다. `<issuer>:aud`는 `sts.amazonaws.com`, `<issuer>:sub`는 `system:serviceaccount:shop:orders`와 같아야 한다. `sub` 조건이 없으면 클러스터의 어떤 SA든 이 role을 쓸 수 있다. namespace 전체를 허용하려면 `StringLike`와 `*`를 쓴다.
- **Facts:**
  | key | value |
  |---|---|
  | `Principal.Federated` | `arn:aws:iam::<account>:oidc-provider/oidc.eks.<region>.amazonaws.com/id/<ID>` |
  | `Condition` `aud` | `sts.amazonaws.com` |
  | `Condition` `sub` | `system:serviceaccount:shop:orders` (없으면 모든 SA 허용) |
- **Event log:** `sts → sts · IAM 평가 · trust policy of role/orders-s3-reader: Federated ✓, aud ✓, sub ✓ · —`
- **After:**
  | 검사 | 기준 | 결과 |
  |---|---|---|
  | JWT 서명 | issuer JWKS 공개키 | ✓ |
  | `iss` | IAM OIDC provider (`Principal.Federated`) | ✓ |
  | `aud` | `sts.amazonaws.com` | ✓ |
  | `sub` | `system:serviceaccount:shop:orders` | ✓ |
  | 결과 | — | assume 허용 |
- **Record:** R9.3
- **Sources:**
  - [EKSUG: the trust policy enforces IRSA authorization; control it with aud and sub conditions](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/security/vpc-interface-endpoints.adoc#L116-L116) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: IRSA trust policy example (Federated, aud, sub)](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/storage/s3files-csi.adoc#L279-L296) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: without a sub condition any SA in the cluster can assume the role](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/cross-account-access.adoc#L62-L69) / [StringLike with * for a whole namespace](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/associate-service-account-role.adoc#L100-L100) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [GOSTS: the identity provider must be specified in the role's trust policy](https://github.com/aws/aws-sdk-go-v2/blob/service/sts/v1.51.6/service/sts/api_op_AssumeRoleWithWebIdentity.go#L100-L104) — aws-sdk-go-v2 service/sts v1.51.6

#### 9.9 `credentials` — 임시 자격 증명이 SDK로 돌아온다 · `move` sts → pod · token `response`: `Credentials (기본 1h)`
- **Summary:** STS가 `AccessKeyId`, `SecretAccessKey`, `SessionToken`, `Expiration`을 돌려준다. 기본 1시간이다.
- **Detail:** 응답에는 STS가 본 token의 `sub`(`SubjectFromWebIdentityToken`), `aud`(`Audience`), `iss`(`Provider`)도 실린다. SDK는 만료 전에 자격 증명을 갱신한다. IRSA에는 STS session tag가 없어 role을 함께 쓰는 Pod는 모두 role 권한 전부를 받는다. Pod마다 SDK가 STS를 부르므로 STS quota도 Pod 수만큼 쓴다.
- **Facts:**
  | key | value |
  |---|---|
  | 기본 유효 시간 | 1시간 (`DurationSeconds` 기본 3600) |
  | `SubjectFromWebIdentityToken` | `system:serviceaccount:shop:orders` |
  | STS session tags | 지원 안 됨 (IRSA) |
- **Event log:** `sts → pod · HTTPS · 200 AssumeRoleWithWebIdentity (Credentials, AssumedRoleUser, SubjectFromWebIdentityToken) · —`
- **Sources:**
  - [GOSTS: Output — AssumedRoleUser, Audience, Credentials, Provider, SubjectFromWebIdentityToken](https://github.com/aws/aws-sdk-go-v2/blob/service/sts/v1.51.6/service/sts/api_op_AssumeRoleWithWebIdentity.go#L302-L377) / [credentials: access key ID, secret access key, security token; 1 hour default](https://github.com/aws/aws-sdk-go-v2/blob/service/sts/v1.51.6/service/sts/api_op_AssumeRoleWithWebIdentity.go#L33-L42) — aws-sdk-go-v2 service/sts v1.51.6
  - [EKSUG: SDK and EKS renew the temporary credentials before they expire](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/iam-roles-for-service-accounts-minimum-sdk.adoc#L13-L13) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: comparison — STS quota per pod, no session tags in IRSA](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/service-accounts.adoc#L117-L123) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 9.10 `access-denied` — 실패 갈래: `sub`나 `aud`가 맞지 않으면 거부된다 · `mutate` sts
- **Summary:** trust policy의 `sub`나 `aud`가 token claim과 다르면 STS가 assume을 거부한다. 흔히 보는 `AccessDenied`다.
- **Detail:** 흔한 원인: trust policy에 다른 namespace나 SA 이름을 적었다. 새 클러스터에서 같은 role을 쓰면서 그 클러스터의 OIDC provider를 trust policy에 넣지 않았다. SA annotation으로 audience를 바꿨다. 서명이나 issuer 검증이 실패하면 `InvalidIdentityToken`이다. `aws iam get-role`의 trust policy와 token claim(R9.2)을 맞춰 본다.
- **Facts:**
  | key | value |
  |---|---|
  | `sub` 불일치 예 | token `system:serviceaccount:shop:orders` ≠ 조건 `system:serviceaccount:default:orders` (E.G.) |
  | 새 클러스터 | role trust policy에 새 클러스터의 OIDC provider를 추가해야 함 |
  | token 자체 검증 실패 | `InvalidIdentityToken` ("could not be validated by Amazon Web Services") |
- **Event log:** `sts → sts · IAM 평가 · trust policy of role/orders-s3-reader: sub ✗ → assume 거부 · —`
- **After:**
  | 검사 | 기준 | 결과 |
  |---|---|---|
  | JWT 서명 | issuer JWKS 공개키 | ✓ |
  | `iss` | IAM OIDC provider (`Principal.Federated`) | ✓ |
  | `aud` | `sts.amazonaws.com` | ✓ |
  | `sub` | 조건 `system:serviceaccount:default:orders` (E.G.) | ✗ token은 `…:shop:orders` |
  | 결과 | — | 거부 (오류 코드 `AccessDenied`, 아래 Unverified) |
- **Sources:**
  - [EKSUG: IRSA requires updating the role trust policy for each new cluster's OIDC provider](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/service-accounts.adoc#L105-L107) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: confirm the trust policy with aws iam get-role](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/associate-service-account-role.adoc#L127-L134) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [IRSAWH README: eks.amazonaws.com/audience annotation overrides the audience](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/README.md#L57-L58) — amazon-eks-pod-identity-webhook @ 52496af
  - [GOSTS types/errors.go: InvalidIdentityTokenException — token could not be validated](https://github.com/aws/aws-sdk-go-v2/blob/service/sts/v1.51.6/service/sts/types/errors.go#L154-L157) — aws-sdk-go-v2 service/sts v1.51.6

**Replay.** `dev` → `apiserver` → `webhook` → `pod` (env, volume) → `kubelet` → `apiserver` → `kubelet` (token 파일) → `pod` (SDK) → `sts` → `oidc` → `sts` (trust policy) → `pod` (자격 증명)

**Overview.**
- 지원 SDK의 기본 credential chain에 web identity 단계가 있다. chain 앞쪽 자격 증명(예: 정적 키 env)이 있으면 그것이 계속 쓰인다 ([EKSUG L11](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/iam-roles-for-service-accounts-minimum-sdk.adoc#L11-L11)).
- IMDS를 막지 않으면 Pod는 node IAM role 자격 증명에도 닿는다. `hostNetwork: true` Pod는 항상 IMDS에 닿는다 ([EKSUG L24-L30](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/iam-roles-for-service-accounts.adoc#L24-L30)).
- 계정당 IAM OIDC provider 기본 한도는 100개이고 IRSA는 클러스터마다 1개가 필요하다. trust policy 길이 기본 2048자로 trust 관계는 보통 4개다 ([EKSUG L109-L115](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/service-accounts.adoc#L109-L115)).
- 같은 일을 OIDC provider 없이 하는 방식은 Lesson 10 (`pod-identity`). AWS는 가능하면 Pod Identity를 권한다 ([EKSUG L93-L96](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/service-accounts.adoc#L93-L96)).

### Decoder records

#### R9.1 IRSA로 mutate된 Pod spec · step 9.3 · wire: true
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: orders-7d9c5b8f6-x2k4q
  namespace: shop
spec:
  serviceAccountName: orders
  containers:
  - name: orders
    env:                                   # ↓ pod-identity-webhook이 추가
    - name: AWS_ROLE_ARN
      value: arn:aws:iam::111122223333:role/orders-s3-reader
    - name: AWS_WEB_IDENTITY_TOKEN_FILE
      value: /var/run/secrets/eks.amazonaws.com/serviceaccount/token
    volumeMounts:
    - name: aws-token
      mountPath: /var/run/secrets/eks.amazonaws.com/serviceaccount/
      readOnly: true
  volumes:
  - name: aws-token
    projected:
      sources:
      - serviceAccountToken:
          audience: sts.amazonaws.com
          expirationSeconds: 86400
          path: token
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `spec.serviceAccountName` | `orders` | webhook이 SA(annotation)를 찾는 key, namespace와 함께 | E.G. |
| `env[AWS_ROLE_ARN]` | role ARN | SDK가 `RoleArn`으로 보냄. SA annotation 값 그대로 | E.G. |
| `env[AWS_WEB_IDENTITY_TOKEN_FILE]` | `/var/run/secrets/eks.amazonaws.com/serviceaccount/token` | SDK가 읽는 JWT 파일 | |
| `volumeMounts[aws-token].readOnly` | `true` | token 파일은 읽기 전용 | |
| `…serviceAccountToken.audience` | `sts.amazonaws.com` | token `aud`. trust policy `aud` 조건과 같아야 함 | |
| `…serviceAccountToken.expirationSeconds` | `86400` | 요청 TTL. kubelet은 80% 지점에 갱신 | |
| `…serviceAccountToken.path` | `token` | mount 경로 아래 파일 이름 | |

Sources: [IRSAWH README L67-L116](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/README.md#L67-L116), [handler.go L173-L287](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L173-L287) — amazon-eks-pod-identity-webhook @ 52496af. README 예시에는 `AWS_REGION`, `AWS_DEFAULT_REGION`, `AWS_STS_REGIONAL_ENDPOINTS`도 있지만 각각 webhook flag나 SA annotation이 켜졌을 때만 들어간다 ([main.go L82-L83](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/main.go#L82-L83)). EKS 문서는 `AWS_STS_REGIONAL_ENDPOINTS`가 SA annotation `eks.amazonaws.com/sts-regional-endpoints`로 바뀌고, 없으면 기본 endpoint type이 쓰이며 그 기본값이 regional이라고 적는다 ([configure-sts-endpoint.adoc L54-L61](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/configure-sts-endpoint.adoc#L54-L61), [L78](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/configure-sts-endpoint.adoc#L78-L78) — Amazon EKS User Guide @ 8d43223 (2026-09-16)). 그래서 예시에서 뺐다. `AWS_REGION` 주입 여부는 아래 Unverified.

#### R9.2 projected token의 decoded claims (audience `sts.amazonaws.com`) · step 9.5 · wire: true
```json
{
  "aud": ["sts.amazonaws.com"],
  "exp": 1793782800,
  "iss": "https://oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE",
  "kubernetes.io": {
    "pod": { "name": "orders-7d9c5b8f6-x2k4q" },
    "serviceaccount": { "name": "orders" }
  },
  "sub": "system:serviceaccount:shop:orders"
}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `iss` | 클러스터 OIDC issuer URL | `--service-account-issuer` 첫 값. IAM OIDC provider URL과 같아야 함 | E.G. |
| `sub` | `system:serviceaccount:shop:orders` | trust policy `<issuer>:sub` 조건과 비교 | E.G. |
| `aud` | `["sts.amazonaws.com"]` | trust policy `<issuer>:aud` 조건과 비교 | |
| `exp` | 발급 + 86400 s (Unix 초) | 이 시각까지 STS가 받아 줌 | E.G. |
| `kubernetes.io.pod.name` | `orders-7d9c5b8f6-x2k4q` | token이 묶인 Pod | E.G. |
| `kubernetes.io.serviceaccount.name` | `orders` | token 주인 SA | E.G. |

Sources: [K8S claims.go L77-L117](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/serviceaccount/claims.go#L77-L117) — Kubernetes v1.37.1; [K8SDOC configure-service-account.md L428-L459](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/configure-pod-container/configure-service-account.md#L428-L459) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976); issuer URL 형식 [EKSUG irsa-fetch-keys.adoc L33-L34](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/irsa-fetch-keys.adoc#L33-L34) — Amazon EKS User Guide @ 8d43223 (2026-09-16). 실제 token에는 `iat`, `nbf`, `jti`, `kubernetes.io.namespace`, 각 uid와 node 정보도 있다. 엔지니어가 읽는 필드만 남겼다.

#### R9.3 IRSA role trust policy · step 9.8 · wire: true
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::111122223333:oidc-provider/oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE:aud": "sts.amazonaws.com",
        "oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE:sub": "system:serviceaccount:shop:orders"
      }
    }
  }]
}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `Principal.Federated` | `arn:aws:iam::<account>:oidc-provider/<issuer host+path>` | 이 클러스터의 IAM OIDC provider. 클러스터마다 다름 | E.G. |
| `Action` | `sts:AssumeRoleWithWebIdentity` | JWT로 assume 허용 | |
| `Condition.StringEquals["<issuer>:aud"]` | `sts.amazonaws.com` | token `aud`와 같아야 함 | |
| `Condition.StringEquals["<issuer>:sub"]` | `system:serviceaccount:shop:orders` | 이 SA만 허용. 빼면 모든 SA 허용. `StringLike` + `*`이면 namespace 전체 | E.G. |

Sources: [EKSUG s3files-csi.adoc L279-L296](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/storage/s3files-csi.adoc#L279-L296), [cross-account-access.adoc L62-L69](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/cross-account-access.adoc#L62-L69), [associate-service-account-role.adoc L100](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/associate-service-account-role.adoc#L100-L100) — Amazon EKS User Guide @ 8d43223 (2026-09-16).

### Self-check
1. **Q.** SA에 `eks.amazonaws.com/role-arn`을 달았는데 이미 떠 있는 Pod는 왜 여전히 AWS 호출에 실패하는가? **A.** env와 projected token volume은 Pod CREATE 때 mutating admission webhook(`pod-identity-webhook`)이 넣는다. 기존 Pod는 바뀌지 않으므로 Pod를 다시 만들어야 한다.
2. **Q.** Pod 안의 SDK는 STS에 무엇을 보내고, STS는 token을 무엇으로 검증하는가? **A.** token 파일의 JWT와 `AWS_ROLE_ARN`을 `AssumeRoleWithWebIdentity`로 보낸다. AWS 서명 자격 증명은 없다. STS는 token `iss`의 클러스터 OIDC endpoint에서 가져온 JWKS로 서명을 확인하고, trust policy의 `Federated` provider와 `aud`/`sub` 조건을 claim과 맞춘다.
3. **Q.** 86400초 projected token은 언제 갱신되며, 앱은 무엇을 해야 하나? **A.** kubelet이 TTL 80%(69,120초 ≈ 19.2시간) 또는 24시간 중 먼저 오는 때 TokenRequest를 다시 호출해 파일을 바꾼다. 앱(SDK)은 파일을 다시 읽어야 한다.
4. **Q.** `AssumeRoleWithWebIdentity`가 거부되면 무엇부터 보나? **A.** `aws iam get-role`로 trust policy를 보고 `<issuer>:sub`가 `system:serviceaccount:<ns>:<sa>`와 정확히 같은지, `<issuer>:aud`가 token `aud`(`sts.amazonaws.com`)와 같은지, `Principal.Federated`가 이 클러스터의 OIDC provider인지 확인한다.
5. **Q.** trust policy에서 `sub` 조건을 빼면 어떻게 되나? **A.** 그 클러스터의 어떤 ServiceAccount든 이 role을 assume할 수 있다. 최소 권한을 위해 `StringEquals`로 SA 하나에 묶는다.

### Unverified
- trust policy 조건 불일치일 때 STS가 돌려주는 오류 코드·메시지(`AccessDenied`, "Not authorized to perform sts:AssumeRoleWithWebIdentity"로 알려짐). STS API model의 `types/errors.go`에는 없는 공통 오류이고, IAM/STS 문서(docs.aws.amazon.com)는 이 세션에서 열 수 없었다.
- EKS의 kube-apiserver `--service-account-issuer` 값이 `describe-cluster`의 OIDC issuer URL과 같다는 것. IRSA가 동작하므로 강하게 시사되지만 문장으로 확인하지 못했다.
- EKS에서 `pod-identity-webhook`이 어디서 도는지(control plane 안인지), EKS 관리형 webhook이 `AWS_REGION`/`AWS_DEFAULT_REGION`을 넣는지(`--aws-default-region` flag). pinned EKS 문서에 해당 문장이 없다.

## Lesson 10 — `pod-identity`: EKS Pod Identity — node의 agent가 EKS Auth로 자격 증명을 받아 오는 길

**Critical path.** SA token(aud `pods.eks.amazonaws.com`) → node의 agent → EKS Auth `AssumeRoleForPodIdentity` → association의 role → 임시 자격 증명

**Goal.** `shop/orders` Pod가 role ARN 없이 env 두 개와 token 파일만 받고, 같은 node의 agent가 그 token으로 EKS Auth에서 자격 증명을 받아 건네주는 길을 그린다.

**Interview questions.**
- Pod Identity에서 STS를 부르는 것은 누구이고, Pod는 무엇과만 통신하는가?
- association을 만들었는데 Pod가 여전히 자격 증명을 못 받는다. 어디부터 보는가? (Pod 재생성, agent, node role, EKS Auth 도달성)
- IRSA와 비교해 운영상 무엇이 줄어드는가? (클러스터별 OIDC provider, 클러스터별 trust policy 수정)
- session tag는 무엇이고 어디에 쓰는가?

**Nodes.** critical path: `agent`, `eksauth`, `apiserver`, `webhook`, `pod` · side: `dev`, `kubelet`, `sts` (positions from Topic layout)

**State panels.**
| node | title | view | initial |
|---|---|---|---|
| agent | `eks-pod-identity-agent` (node A) | table: `항목`, `값` | (DaemonSet Pod 없음) |
| eksauth | EKS Auth가 보는 상태 | table: `항목`, `값` | association (없음) · 최근 판정 `—` |
| pod | Pod `orders-6b8d4f7c9-p7m2z` spec (AWS 관련) | table: `field`, `값` | `serviceAccountName`=`orders` · `env`=(없음) · AWS token volume=(없음) |

### Steps

#### 10.1 `agent-daemonset` — node마다 agent가 link-local 주소를 연다 · `mutate` agent
- **Summary:** agent DaemonSet이 node마다 hostNetwork로 `169.254.170.23:80`, `[fd00:ec2::23]:80`을 연다.
- **Detail:** Pod Identity는 EKS Auth API와 node마다 뜨는 agent Pod로 동작한다. agent는 같은 node의 Pod에게만 자격 증명을 준다. agent는 node IAM role로 EKS Auth를 부르므로 node role에 `AssumeRoleForPodIdentity` 권한이 있어야 하고, private subnet이면 EKS Auth용 PrivateLink endpoint가 필요하다. EKS Auto Mode에는 agent가 내장되어 있다.
- **Facts:**
  | key | value |
  |---|---|
  | 주소 / port | `169.254.170.23`, `[fd00:ec2::23]` / `80` (credential), `2703` (health) |
  | node role 권한 | EKS Auth `AssumeRoleForPodIdentity` (`AmazonEKSWorkerNodePolicy` 또는 custom policy) |
  | 자주 겪는 실패 | node가 IPv6를 막으면 agent가 못 뜸 · proxy 쓰는 Pod는 `NO_PROXY`에 두 주소 추가 |
- **Event log:** `kubelet → agent · Pod 시작 · eks-pod-identity-agent DaemonSet Pod (hostNetwork) · —`
- **After:**
  | 항목 | 값 |
  |---|---|
  | listen (IPv4) | `169.254.170.23:80` |
  | listen (IPv6) | `[fd00:ec2::23]:80` |
  | health / readiness | `:2703` |
  | 호출 자격 | node IAM role |
  | credential cache (key: pod UID) | 0개 |
- **Sources:**
  - [EKSUG: agent is a DaemonSet, hostNetwork, ports 80 and 2703, link-local addresses](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-identities.adoc#L103-L103) / [proxy: add both addresses to no_proxy](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-identities.adoc#L105-L105) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: Auto Mode built-in; IPv4/IPv6 listen; agent can't start without IPv6](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-agent-setup.adoc#L17-L28) / [EKS Auth reachability (PrivateLink), node role needs AssumeRoleForPodIdentity](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-agent-setup.adoc#L37-L50) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [PIA server.go: port 80, probe 2703, bind hosts](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/cmd/server.go#L186-L198) / [config.go: 169.254.170.23, fd00:ec2::23](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/configuration/config.go#L3-L7) — eks-pod-identity-agent v0.2.7

#### 10.2 `association` — (cluster, namespace, SA) → role 연결을 만든다 · `mutate` eksauth
- **Summary:** EKS API에 Pod Identity association을 만든다. SA annotation은 쓰지 않고, 연결은 EKS 쪽에 저장된다.
- **Detail:** `aws eks create-pod-identity-association`이 cluster의 namespace/SA 하나를 같은 계정의 IAM role 하나에 묶는다. 이 그림에는 EKS API node가 없어 EKS Auth가 읽는 상태로 보여 준다. role trust policy는 서비스 principal `pods.eks.amazonaws.com` 하나만 믿으면 되므로 새 클러스터에서 같은 role을 써도 고칠 것이 없다(R10.2).
- **Facts:**
  | key | value |
  |---|---|
  | SA당 role | 1개, 클러스터와 같은 계정 (교차 계정은 role chaining) |
  | annotation | 쓰지 않음 (IRSA의 `eks.amazonaws.com/role-arn`과 다름) |
  | 반영 시점 | eventually consistent, 몇 초 늦을 수 있음 |
- **Event log:** `dev → EKS API (이 layout에 node 없음) · HTTPS · CreatePodIdentityAssociation cluster=prod-apne2 ns=shop sa=orders · —`
- **After:**
  | 항목 | 값 |
  |---|---|
  | association | `prod-apne2` / `shop` / `orders` → `role/orders-s3-reader` (E.G.) |
  | 최근 판정 | — |
- **Sources:**
  - [EKSUG: no SA annotation; aws eks create-pod-identity-association](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-association.adoc#L125-L130) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: one role per SA from the same account; eventual consistency](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-identities.adoc#L102-L104) / [associations are configured in Amazon EKS; single principal pods.eks.amazonaws.com](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-identities.adoc#L67-L77) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: comparison — no trust policy update per new cluster](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/service-accounts.adoc#L105-L107) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 10.3 `admission-webhook` — 새 Pod만 같은 webhook을 지나며 주입 대상이 된다 · `move` apiserver → webhook · token `call`: `AdmissionReview (Pod CREATE)`
- **Summary:** Pod 생성 요청이 IRSA와 같은 `pod-identity-webhook`으로 간다. 이 SA에는 association이 있다.
- **Detail:** admission은 mutating 다음 validating 순서다. webhook 코드는 (namespace, SA)에 container-credentials 설정이 있으면 IRSA보다 그것을 먼저 고른다("Container credentials method takes precedence"). EKS가 association을 webhook에 어떻게 전달하는지는 공개되어 있지 않다. 주입은 새로 시작하는 Pod에만 일어나므로 association 뒤에는 Pod를 다시 만들어야 한다.
- **Facts:**
  | key | value |
  |---|---|
  | 주입 시점 | 새 Pod 시작 시 (기존 Pod는 그대로) |
  | 우선순위 | association(container credentials) > `eks.amazonaws.com/role-arn`(IRSA) |
  | admission 순서 | mutating → validating |
- **Event log:** `apiserver → webhook · HTTPS (AdmissionReview) · CREATE Pod shop/orders-6b8d4f7c9-p7m2z · —`
- **Sources:**
  - [EKSUG: when EKS starts a new pod whose SA has an association, the cluster adds env and volume](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-how-it-works.adoc#L30-L32) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [IRSAWH handler.go: container credentials method takes precedence](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L450-L472) — amazon-eks-pod-identity-webhook @ 52496af
  - [K8SDOC: admission control phases — mutating, then validating](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/access-authn-authz/admission-controllers.md#L65-L70) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 10.4 `pod-mutated` — Pod spec에 agent 주소와 token 파일 경로가 들어간다 · `mutate` pod
- **Summary:** agent 주소 env, token 파일 env, audience `pods.eks.amazonaws.com` token volume이 생긴다.
- **Detail:** `AWS_ROLE_ARN`은 없다. role은 Pod spec이 아니라 EKS의 association에만 있다. `AWS_CONTAINER_CREDENTIALS_FULL_URI`는 같은 node의 agent 주소다. token 파일은 kubelet이 TokenRequest로 받아 채운다(Lesson 9와 같은 경로, audience만 `pods.eks.amazonaws.com`).
- **Facts:**
  | key | value |
  |---|---|
  | `AWS_CONTAINER_CREDENTIALS_FULL_URI` | `http://169.254.170.23/v1/credentials` |
  | `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE` | `/var/run/secrets/pods.eks.amazonaws.com/serviceaccount/eks-pod-identity-token` |
  | token `audience` | `pods.eks.amazonaws.com` |
- **Event log:** `webhook → apiserver · HTTPS (AdmissionReview response) · JSONPatch: env 2개, volumeMount 1개, volume 1개 · —`
- **After:**
  | field | 값 |
  |---|---|
  | `serviceAccountName` | `orders` |
  | `env` `AWS_CONTAINER_CREDENTIALS_FULL_URI` | `http://169.254.170.23/v1/credentials` |
  | `env` `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE` | `/var/run/secrets/pods.eks.amazonaws.com/serviceaccount/eks-pod-identity-token` |
  | `volumeMounts` | `eks-pod-identity-token` → `/var/run/secrets/pods.eks.amazonaws.com/serviceaccount/` |
  | `volumes` | `eks-pod-identity-token`: projected SA token, aud `pods.eks.amazonaws.com` |
  | `env` `AWS_ROLE_ARN` | (없음) |
- **Record:** R10.1
- **Sources:**
  - [EKSUG: content the cluster adds to the Pod manifest](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-how-it-works.adoc#L32-L53) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [IRSAWH handler.go: container credentials env instead of AWS_ROLE_ARN](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L243-L267) / [main.go: container-credentials audience, mount path, volume, full URI defaults](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/main.go#L86-L91) — amazon-eks-pod-identity-webhook @ 52496af

#### 10.5 `sdk-to-agent` — SDK는 token을 `Authorization` header에 실어 agent에 묻는다 · `move` pod → agent · token `request`: `GET /v1/credentials`
- **Summary:** SDK의 container credential provider가 token 파일 내용을 `Authorization` header에 넣어 agent에 GET한다.
- **Detail:** 지원 SDK의 기본 credential chain에는 container credential provider 단계가 있고, 이 단계가 두 env로 agent를 찾는다. token 파일을 읽어 header에 넣고 `AWS_CONTAINER_CREDENTIALS_FULL_URI`로 요청한다. Pod는 STS에도 EKS Auth에도 직접 가지 않는다. 상대는 같은 node의 link-local 주소뿐이다.
- **Facts:**
  | key | value |
  |---|---|
  | 요청 | `GET http://169.254.170.23/v1/credentials` |
  | header | `Authorization: <token 파일 내용 (JWT)>` |
  | chain 규칙 | chain 앞쪽 자격 증명(예: IRSA env)이 있으면 그것이 계속 쓰인다 |
- **Event log:** `pod → agent · HTTP (link-local) · GET /v1/credentials, Authorization: eyJ… · —`
- **Sources:**
  - [EKSUG: Pod Identity is in the container credential provider step; earlier credentials keep being used](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-how-it-works.adoc#L22-L28) / [the SDK uses the env vars to connect to the agent](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-how-it-works.adoc#L54-L59) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [PIA eks_credential_handler.go: /v1/credentials reads the Authorization header as the SA token](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/pkg/handlers/eks_credential_handler.go#L146-L160) — eks-pod-identity-agent v0.2.7

#### 10.6 `assume-role-for-pod-identity` — agent가 node role로 EKS Auth를 부른다 · `move` agent → eksauth · token `request`: `AssumeRoleForPodIdentity (ClusterName, Token)`
- **Summary:** cache에 없으면 agent가 node role로 EKS Auth `AssumeRoleForPodIdentity`(cluster 이름, token)를 부른다.
- **Detail:** agent는 token에서 pod UID를 꺼내 cache를 먼저 본다. 없으면 EKS Auth를 호출한다. 이 API는 agent만 쓰는 API다. 서명 자격은 node IAM role이므로, node role 권한이 없거나 node가 EKS Auth endpoint에 닿지 못하면 Pod의 요청은 여기서 실패한다.
- **Facts:**
  | key | value |
  |---|---|
  | 필수 입력 | `ClusterName`, `Token` |
  | cache key | pod UID (token의 `kubernetes.io.pod.uid`) |
  | 호출 주체 | agent (node IAM role) |
- **Event log:** `agent → eksauth · HTTPS (EKS Auth API, node role) · AssumeRoleForPodIdentity clusterName=prod-apne2 · —`
- **Sources:**
  - [GOEKSAUTH: only used by the agent; input ClusterName, Token (required)](https://github.com/aws/aws-sdk-go-v2/blob/service/eksauth/v1.23.1/service/eksauth/api_op_AssumeRoleForPodIdentity.go#L13-L57) — aws-sdk-go-v2 service/eksauth v1.23.1
  - [PIA eksauth/service.go: input ClusterName, Token](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/cloud/eksauth/service.go#L69-L88) / [refreshing_cache.go: pod UID from token, cache first](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/credsretriever/refreshing_cache.go#L112-L125) / [model.go: pod UID from kubernetes.io.pod.uid](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/pkg/credentials/model.go#L99-L122) — eks-pod-identity-agent v0.2.7
  - [EKSUG: node role needs AssumeRoleForPodIdentity; nodes must reach EKS Auth](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-agent-setup.adoc#L37-L50) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 10.7 `eks-auth-assume-role` — EKS Auth가 role을 assume하고 session tag를 붙인다 · `mutate` eksauth
- **Summary:** EKS Auth가 token의 SA로 association을 찾고, role을 `sts:AssumeRole`·`sts:TagSession`으로 assume한다.
- **Detail:** token이 무효이거나 만료되면 `InvalidTokenException`, `ExpiredTokenException`이다. association의 role은 서비스 principal `pods.eks.amazonaws.com`이 assume하고, STS 요청에 session tag 6개(cluster, namespace, SA, Pod 이름·UID)를 넣는다. 그래서 trust policy에 두 action이 다 있어야 한다. 정책에서는 `${aws:PrincipalTag/kubernetes-namespace}`처럼 쓴다.
- **Facts:**
  | key | value |
  |---|---|
  | trust policy | `Principal.Service: pods.eks.amazonaws.com`, `Action: [sts:AssumeRole, sts:TagSession]` |
  | session tags | `eks-cluster-arn`, `eks-cluster-name`, `kubernetes-namespace`, `kubernetes-service-account`, `kubernetes-pod-name`, `kubernetes-pod-uid` |
  | token 오류 | `InvalidTokenException`, `ExpiredTokenException` |
- **Event log:** `eksauth → sts · EKS 내부 (형식 비공개) · AssumeRole + TagSession role/orders-s3-reader · —`
- **After:**
  | 항목 | 값 |
  |---|---|
  | association | `prod-apne2` / `shop` / `orders` → `role/orders-s3-reader` (E.G.) |
  | token → Subject | `shop` / `orders` ✓ |
  | role assume | `role/orders-s3-reader` ✓ (principal `pods.eks.amazonaws.com`) |
  | session tags | `kubernetes-namespace=shop`, `kubernetes-service-account=orders`, … 6개 |
- **Record:** R10.2
- **Sources:**
  - [EKSUG: sts:AssumeRole and sts:TagSession — why each is needed](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-role.adoc#L18-L26) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: trust policy with pods.eks.amazonaws.com principal](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/hybrid-nodes-gateway-getting-started.adoc#L50-L61) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [EKSUG: predefined session tags and PrincipalTag syntax](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-abac.adoc#L27-L38) — Amazon EKS User Guide @ 8d43223 (2026-09-16)
  - [GOEKSAUTH types/errors.go: ExpiredTokenException](https://github.com/aws/aws-sdk-go-v2/blob/service/eksauth/v1.23.1/service/eksauth/types/errors.go#L63-L64) / [InvalidTokenException](https://github.com/aws/aws-sdk-go-v2/blob/service/eksauth/v1.23.1/service/eksauth/types/errors.go#L253-L254) — aws-sdk-go-v2 service/eksauth v1.23.1

#### 10.8 `eks-auth-response` — EKS Auth가 자격 증명과 신원을 돌려준다 · `move` eksauth → agent · token `response`: `Credentials + AssumedRoleUser + Subject`
- **Summary:** EKS Auth가 임시 `Credentials`와 함께 `AssumedRoleUser`, `Subject`, association 정보를 돌려준다.
- **Detail:** session name은 `eks-<cluster>-<pod>-<UUID>` 형식이라 CloudTrail에서 어느 Pod가 썼는지 보인다. `Audience`는 항상 `pods.eks.amazonaws.com`이다. role assume은 Pod마다 SDK가 아니라 EKS Auth가 하고, agent가 그 node의 Pod들에 나눠 준다. 그래서 Pod 수만큼 STS quota를 쓰지 않는다.
- **Facts:**
  | key | value |
  |---|---|
  | session name | `eks-<cluster>-<pod>-<UUID>` (`AssumedRoleUser.AssumeRoleId`의 뒷부분) |
  | `Subject` | `Namespace` / `ServiceAccount` = `shop` / `orders` |
  | STS 호출 주체 | EKS Auth (Pod는 STS를 부르지 않음) |
- **Event log:** `eksauth → agent · HTTPS · 200 AssumeRoleForPodIdentity (Credentials, AssumedRoleUser, Subject, PodIdentityAssociation) · —`
- **Sources:**
  - [GOEKSAUTH: Output — AssumedRoleUser (session name format), Audience always pods.eks.amazonaws.com, Credentials, PodIdentityAssociation, Subject](https://github.com/aws/aws-sdk-go-v2/blob/service/eksauth/v1.23.1/service/eksauth/api_op_AssumeRoleForPodIdentity.go#L83-L118) — aws-sdk-go-v2 service/eksauth v1.23.1
  - [EKSUG: EKS Auth assumes each set of credentials; load once per node](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-identities.adoc#L78-L79) / [comparison — no STS calls or STS quota from pods](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/service-accounts.adoc#L117-L119) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 10.9 `agent-cache` — agent가 pod UID로 자격 증명을 cache한다 · `mutate` agent
- **Summary:** agent가 응답을 pod UID 기준으로 cache한다. 같은 Pod의 다음 요청은 EKS Auth까지 가지 않을 수 있다.
- **Detail:** 같은 token이 다시 오면 cache에서 바로 준다. 회전된 새 token이면 agent가 로컬에서 검증하고(이때 `aud`가 정확히 `pods.eks.amazonaws.com` 하나여야 한다), 실패하면 EKS Auth로 간다. cache 항목은 기본 최대 3시간 보관 후 갱신된다.
- **Facts:**
  | key | value |
  |---|---|
  | cache key | pod UID |
  | 보관 후 갱신 | 최대 3시간 (`--max-credential-retention-before-renewal` 기본값) |
  | 새 token 로컬 검증 | `aud` 원소가 정확히 1개, `pods.eks.amazonaws.com` |
- **Event log:** `agent → agent · in-process · cache put podUID=c3a1f0d2-… role/orders-s3-reader · —`
- **After:**
  | 항목 | 값 |
  |---|---|
  | listen (IPv4) | `169.254.170.23:80` |
  | listen (IPv6) | `[fd00:ec2::23]:80` |
  | health / readiness | `:2703` |
  | 호출 자격 | node IAM role |
  | credential cache (key: pod UID) | 1개: `c3a1f0d2-…` → `role/orders-s3-reader`, `Expiration` (E.G.) |
- **Sources:**
  - [PIA refreshing_cache.go: same token → cached creds; new token → local validation, else delegate](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/credsretriever/refreshing_cache.go#L153-L195) — eks-pod-identity-agent v0.2.7
  - [PIA claims_validation.go: audience must be exactly pods.eks.amazonaws.com](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/validation/claims_validation.go#L114-L131) / [server.go: --max-credential-retention-before-renewal 3h](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/cmd/server.go#L191-L194) — eks-pod-identity-agent v0.2.7

#### 10.10 `agent-to-sdk` — agent가 SDK 형식 JSON으로 자격 증명을 건넨다 · `move` agent → pod · token `response`: `{AccessKeyId, SecretAccessKey, Token, AccountId, Expiration}`
- **Summary:** agent가 SDK container provider 형식의 JSON을 돌려준다. node role 자격 증명은 Pod로 건너가지 않는다.
- **Detail:** agent는 EKS Auth 응답의 `AccessKeyId`, `SecretAccessKey`, `SessionToken`(→ `Token`), `Expiration`을 꺼내고 role ARN에서 `AccountId`를 뽑아 JSON으로 준다. SDK는 이것으로 S3 등을 서명해 부른다. 다만 IMDS를 막지 않으면 Pod는 여전히 node role 자격 증명에 닿을 수 있다.
- **Facts:**
  | key | value |
  |---|---|
  | 응답 JSON 키 | `AccessKeyId`, `SecretAccessKey`, `Token`, `AccountId`, `Expiration` |
  | `Token` | EKS Auth `Credentials.SessionToken` |
  | IMDS | 막지 않으면 Pod도 node role 자격 증명에 닿음 (`hostNetwork: true`는 항상) |
- **Event log:** `agent → pod · HTTP (link-local) · 200 application/json {"AccessKeyId":"ASIA…","Expiration":"…"} · —`
- **Record:** R10.3
- **Sources:**
  - [PIA model.go: EksCredentialsResponse JSON fields, RFC3339 expiration](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/pkg/credentials/model.go#L83-L97) / [service.go: mapping from the EKS Auth response](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/cloud/eksauth/service.go#L100-L116) / [eks_credential_handler.go: JSON response](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/pkg/handlers/eks_credential_handler.go#L170-L183) — eks-pod-identity-agent v0.2.7
  - [EKSUG: credential isolation and IMDS; hostNetwork note](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-identities.adoc#L50-L56) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

**Replay.** `agent` (listen) → `eksauth` (association) → `apiserver` → `webhook` → `pod` (env, volume) → `pod` (SDK) → `agent` → `eksauth` (assume role + tags) → `agent` (cache) → `pod` (자격 증명)

**Overview.**
- IRSA와 비교: 클러스터마다 IAM OIDC provider를 만들 필요가 없고, 새 클러스터마다 role trust policy를 고치지 않는다. STS는 Pod의 SDK가 아니라 EKS Auth가 부른다 ([EKSUG L105-L119](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/service-accounts.adoc#L105-L119)).
- AWS는 가능하면 Pod Identity를 권한다 ([EKSUG L93-L96](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/service-accounts.adoc#L93-L96)). Linux EC2 node에서만 된다. Fargate, Windows node는 안 된다 ([EKSUG L146](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-identities.adoc#L146-L146)).
- IRSA에서 옮길 때: association을 먼저 만들고 옛 자격 증명을 나중에 지우면 안전하다. chain 앞쪽 자격 증명이 있는 동안은 그것이 쓰인다 ([EKSUG L24](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-how-it-works.adoc#L24-L24)).
- session tag는 transitive라 다른 계정 role로 `AssumeRole`해도 따라간다 ([EKSUG L54](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-abac.adoc#L54-L54)).

### Decoder records

#### R10.1 Pod Identity로 mutate된 Pod spec · step 10.4 · wire: true
```yaml
spec:
  serviceAccountName: orders
  containers:
  - name: orders
    env:                                   # ↓ pod-identity-webhook이 추가
    - name: AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE
      value: /var/run/secrets/pods.eks.amazonaws.com/serviceaccount/eks-pod-identity-token
    - name: AWS_CONTAINER_CREDENTIALS_FULL_URI
      value: http://169.254.170.23/v1/credentials
    volumeMounts:
    - mountPath: /var/run/secrets/pods.eks.amazonaws.com/serviceaccount/
      name: eks-pod-identity-token
  volumes:
  - name: eks-pod-identity-token
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          audience: pods.eks.amazonaws.com
          expirationSeconds: 86400
          path: eks-pod-identity-token
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `env[AWS_CONTAINER_CREDENTIALS_FULL_URI]` | `http://169.254.170.23/v1/credentials` | SDK container provider가 GET할 agent 주소 | |
| `env[AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE]` | `…/eks-pod-identity-token` | 이 파일 내용이 `Authorization` header가 됨 | |
| `…serviceAccountToken.audience` | `pods.eks.amazonaws.com` | IRSA token(`sts.amazonaws.com`)과 다른 audience | |
| `…serviceAccountToken.expirationSeconds` | `86400` | 문서 예시 값. kubelet이 80% 지점에 갱신 | E.G. |
| (없음) `AWS_ROLE_ARN` | — | role은 Pod spec이 아니라 EKS association에만 있음 | |

Sources: [EKSUG pod-id-how-it-works.adoc L32-L53](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-how-it-works.adoc#L32-L53) — Amazon EKS User Guide @ 8d43223 (2026-09-16); [IRSAWH handler.go L243-L267](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L243-L267), [main.go L86-L91](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/main.go#L86-L91) — amazon-eks-pod-identity-webhook @ 52496af. webhook 코드는 기본 만료(86400)일 때 79,200–86,400초 사이 값을 고른다 ([handler.go L521-L528](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L521-L528)). 그래서 실제 Pod의 값은 문서 예시와 다를 수 있다.

#### R10.2 Pod Identity role trust policy · step 10.7 · wire: true
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "pods.eks.amazonaws.com" },
      "Action": ["sts:AssumeRole", "sts:TagSession"]
    }
  ]
}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `Principal.Service` | `pods.eks.amazonaws.com` | 모든 클러스터 공통의 서비스 principal 하나. 클러스터별 provider 없음 | |
| `Action[0]` | `sts:AssumeRole` | EKS Pod Identity가 role을 assume | |
| `Action[1]` | `sts:TagSession` | session tag 6개를 STS 요청에 넣기 위해 필요 | |

Sources: [EKSUG hybrid-nodes-gateway-getting-started.adoc L50-L61](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/hybrid-nodes-gateway-getting-started.adoc#L50-L61), [pod-id-role.adoc L18-L26](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-role.adoc#L18-L26) — Amazon EKS User Guide @ 8d43223 (2026-09-16). session tag로 SA·namespace를 제한하는 `Condition` 예시는 문서가 repo 밖 snippet으로만 싣고 있어 넣지 않았다(Unverified).

#### R10.3 agent → SDK 자격 증명 JSON · step 10.10 · wire: true
```json
{
  "AccessKeyId": "ASIAEXAMPLE4KD8PQ2ZN",
  "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "Token": "IQoJb3JpZ2luX2Vj…",
  "AccountId": "111122223333",
  "Expiration": "2026-11-03T15:00:00Z"
}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `AccessKeyId` / `SecretAccessKey` | 임시 키 | SDK가 SigV4 서명에 씀 | E.G. |
| `Token` | EKS Auth `Credentials.SessionToken` | 서명 요청에 같이 실리는 session token | E.G. |
| `AccountId` | role ARN에서 파싱 | role 소유 계정 | E.G. |
| `Expiration` | RFC 3339 시각 | 이 시각 전에 SDK가 다시 요청해야 함 | E.G. |

Sources: [PIA model.go L83-L97](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/pkg/credentials/model.go#L83-L97), [service.go L100-L116](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/cloud/eksauth/service.go#L100-L116) — eks-pod-identity-agent v0.2.7. 자격 증명 유효 시간(예시 시각)은 unverified.

### Self-check
1. **Q.** Pod Identity에서 STS를 부르는 것은 누구이고, Pod는 무엇과만 통신하나? **A.** Pod의 SDK는 같은 node의 `eks-pod-identity-agent`(`169.254.170.23:80`)에만 token을 `Authorization` header로 보낸다. agent가 node role로 EKS Auth `AssumeRoleForPodIdentity`를 부르고, role assume(`sts:AssumeRole` + `sts:TagSession`)은 EKS Pod Identity가 한다.
2. **Q.** association을 만들었는데 Pod가 자격 증명을 못 받는다. 무엇을 확인하나? **A.** Pod를 association 뒤에 다시 만들었는지(env `AWS_CONTAINER_*`가 있는지), agent DaemonSet이 그 node에 떠 있는지(IPv6 비활성 node 주의), node role에 `AssumeRoleForPodIdentity` 권한이 있는지, private subnet이면 EKS Auth PrivateLink endpoint가 있는지, proxy를 쓰면 `NO_PROXY`에 두 주소가 있는지.
3. **Q.** IRSA 대비 운영상 무엇이 줄어드나? **A.** 클러스터마다 IAM OIDC provider가 필요 없고, trust policy가 `pods.eks.amazonaws.com` 하나라 새 클러스터마다 고치지 않는다. STS 호출도 Pod별이 아니라 EKS Auth가 한다.
4. **Q.** 같은 SA에 role-arn annotation과 association이 둘 다 있으면? **A.** webhook은 container credentials 방식을 먼저 골라 `AWS_CONTAINER_*` env만 넣는다. 단, container에 web identity env가 직접 들어 있으면 SDK chain 앞쪽인 그것이 계속 쓰인다.
5. **Q.** session tag는 어디에 쓰나? **A.** `eks-cluster-name`, `kubernetes-namespace`, `kubernetes-service-account` 등 6개가 세션에 붙어, `${aws:PrincipalTag/kubernetes-namespace}` 같은 조건으로 role 하나를 여러 SA에 다른 권한으로 쓰게 한다(ABAC). 태그는 transitive다.

### Unverified
- Pod Identity role trust policy에 session tag로 SA·namespace를 제한하는 `Condition` 예시. EKSUG `pod-id-role.adoc`은 이를 `iam_snippet:064584d9-…`으로만 싣고, snippet이 repo에 없으며 docs.aws.amazon.com은 이 세션에서 열 수 없었다.
- node role 정책의 IAM action 철자(`eks-auth:AssumeRoleForPodIdentity`로 알려짐). EKSUG는 정책을 `iam_snippet:485a9c6f-…`으로만 싣는다. 이 lesson은 API 이름과 `AmazonEKSWorkerNodePolicy` 언급만 썼다.
- EKS가 association을 webhook의 container-credentials 설정으로 전달하는 방식, 그리고 EKS Auth가 STS를 부르는 내부 형식.
- association이 없는 SA의 token으로 요청했을 때 EKS Auth가 돌려주는 오류(`ResourceNotFoundException`일 가능성), EKS Auth 자격 증명의 유효 시간.

## Lesson 11 — `autoscaling`: 부하가 오르면 Pod가 늘고, Pod가 Pending이면 Node가 생긴다

**Critical path.** 부하 → `metrics-server` → HPA(replicas 계산) → 새 Pod `Pending` → Karpenter NodeClaim → EC2 → node 등록 → scheduler bind

**Goal.** CPU 부하 상승부터 Pod 증가, Pending Pod 때문에 생기는 새 Node, 그리고 부하가 내려간 뒤의 축소까지 한 사슬로 그릴 수 있다.

**Interview questions.**
- HPA는 replica 수를 어떤 공식으로, 얼마나 자주 계산하나? 계산하려면 Pod spec에 무엇이 꼭 있어야 하나?
- HPA가 Pod를 늘렸는데 Node 자리가 없으면 어떻게 되나? 어떤 Pod 상태가 Karpenter를 깨우나?
- Karpenter는 Node를 어떻게 고르고 띄우나? Pod를 Node에 bind하는 것도 Karpenter인가?
- 부하가 사라지면 Pod와 Node는 각각 무엇 때문에, 얼마나 늦게 줄어드나?

**Nodes.** critical path: `user`, `pod`, `kubelet`, `metrics`, `kcm`, `apiserver`, `scheduler`, `karpenter`, `ec2api`, `newnode` · side: `etcd` (positions from Topic layout)

**State panels.**
| node | title | view | initial |
|---|---|---|---|
| kcm | HPA `web` (HPA controller) | table: `field`, `value` | currentReplicas 2 · currentMetric (cpu) 50% · target 50% · desiredReplicas 2 · AbleToScale — |
| pod | `web` Pods | table: `pod`, `phase`, `PodScheduled`, `node` | `web-…-a` Running True `ip-10-0-1-11` · `web-…-b` Running True `ip-10-0-2-22` (E.G.) |
| karpenter | Karpenter NodeClaim | table: `field`, `value` | (NodeClaim 없음) |

### Steps

#### 11.1 `load-rises` — 요청이 몰려 Pod CPU가 request의 150%가 된다 · `move` user → pod · token `request`: `GET /api/items ×N`
- **Summary:** 부하가 늘어 `web` Pod CPU가 request 대비 150%가 된다. HPA가 보는 값은 Node가 아니라 request 대비 비율이다.
- **Detail:** 요청이 몰려 `web` Pod 2개가 각각 약 750m CPU를 쓴다(E.G.). HPA의 CPU utilization은 container `resources.requests.cpu` 대비 백분율의 Pod 평균이라, 500m request에 750m 사용이면 150%다. Pod의 container 중 하나라도 해당 request가 없으면 utilization이 정의되지 않고 HPA는 그 metric으로 아무 동작도 하지 않는다.
- **Facts:**
  | key | value |
  |---|---|
  | utilization 기준 | container `requests` 대비 %, 대상 Pod 평균 |
  | request 없는 container가 있으면 | 그 metric으로 scaling 안 함 |
  | 이 예시 | 750m ÷ 500m = 150% (E.G.) |
- **Event log:** `user → pod · HTTP · GET /api/items (부하 증가) · —`
- **Sources:**
  - [HPA: utilization as a percentage of resource request; no request → no action](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L88-L101) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 11.2 `scrape` — metrics-server가 kubelet `/metrics/resource`를 긁는다 · `move` metrics → kubelet · token `request`: `GET /metrics/resource`
- **Summary:** metrics-server가 Node마다 kubelet `/metrics/resource`를 긁어 Pod별 CPU·memory를 메모리에 둔다.
- **Detail:** metrics-server는 Node informer로 Node 목록을 얻고 각 kubelet(기본 port 10250)에 `GET /metrics/resource`를 보낸다. 수집 간격 `--metric-resolution`은 공식 소스끼리 다르다: 바이너리 기본값은 60s이고, 공식 manifest와 Helm chart는 15s를 넘긴다. 결과는 in-memory cache에만 있으므로 autoscaling 전용이며 모니터링 소스로 쓰지 말라고 README가 경고한다.
- **Facts:**
  | key | value |
  |---|---|
  | `--metric-resolution` 바이너리 기본값 | `60s` (`options.go`; FAQ "Default 60 seconds") |
  | 공식 manifest / Helm chart 값 | `--metric-resolution=15s` (README "every 15 seconds") |
  | kubelet port | `.status.daemonEndpoints.kubeletEndpoint.port`, 기본 10250 |
- **Event log:** `metrics → kubelet · HTTPS · GET /metrics/resource (node ip-10-0-1-11, E.G.) · —`
- **Sources:**
  - [options.go: `MetricResolution: 60 * time.Second`](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/cmd/metrics-server/app/options/options.go#L113) and [`--metric-resolution` flag](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/cmd/metrics-server/app/options/options.go#L83-L85) — metrics-server v0.9.1
  - [FAQ: How often metrics are scraped? (default 60 s, not below 15 s)](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/FAQ.md#L105-L107) — metrics-server v0.9.1
  - [manifests/base/deployment.yaml: `--metric-resolution=15s`](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/manifests/base/deployment.yaml#L23-L28) — metrics-server v0.9.1
  - [Helm chart values.yaml `defaultArgs`: `--metric-resolution=15s`](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/charts/metrics-server/values.yaml#L95-L99) — metrics-server v0.9.1
  - [README: autoscaling only, every 15 seconds](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/README.md#L10-L16), [kubelet port 10250](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/README.md#L53), [sequence: Node informer → `GET /metrics/resource` → in-memory cache](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/README.md#L189-L198) — metrics-server v0.9.1
  - [Resource metrics pipeline: metrics-server calls kubelet `/metrics/resource`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/debug/debug-cluster/resource-metrics-pipeline.md#L215-L233) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 11.3 `hpa-query` — HPA controller가 15초마다 Metrics API를 묻는다 · `move` kcm → apiserver · token `request`: `GET /apis/metrics.k8s.io/v1beta1/namespaces/default/pods?labelSelector=app=web`
- **Summary:** `kube-controller-manager` 안의 HPA가 15초마다 Metrics API를 묻고, apiserver가 metrics-server로 넘긴다.
- **Detail:** HPA는 별도 Pod가 아니라 `kube-controller-manager` 안의 control loop다. 주기마다 `scaleTargetRef`의 `.spec.selector`로 Pod를 골라 `metrics.k8s.io` PodMetrics를 label selector로 List한다. 이 API는 aggregation layer에 `APIService`로 등록된 확장 API라 kube-apiserver가 요청을 metrics-server로 넘긴다. EKS에서는 HPA를 설치할 필요 없이 metrics source만 있으면 된다.
- **Facts:**
  | key | value |
  |---|---|
  | `--horizontal-pod-autoscaler-sync-period` | `15s` (upstream 기본값; EKS UG도 기본 `15s`로 문서화) |
  | API | `metrics.k8s.io/v1beta1`, aggregated `APIService` (metrics-server가 응답) |
  | metrics-server가 없으면 | "unable to fetch metrics from resource metrics API", `kubectl get hpa`는 `<unknown>` |
- **Event log:** `kcm → apiserver → metrics · HTTPS (aggregated API) · GET …/pods?labelSelector=app%3Dweb → PodMetricsList · —`
- **Sources:**
  - [HPA: control loop, default 15 seconds, `scaleTargetRef` and `.spec.selector`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L75-L86) and [aggregated APIs, Metrics Server add-on](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L112-L117) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [kube-controller-manager reference: `--horizontal-pod-autoscaler-sync-period` Default 15s](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/command-line-tools-reference/kube-controller-manager.md#L567-L570) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Resource metrics pipeline: register an `APIService` for `metrics.k8s.io`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/debug/debug-cluster/resource-metrics-pipeline.md#L171-L174) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [podautoscaler defaults.go: sync period 15 s](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/config/v1alpha1/defaults.go#L40-L42) and [metrics client: `PodMetricses(namespace).List` with label selector, error text](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/metrics/client.go#L67-L71) — Kubernetes v1.37.1
  - [kubectl printer: `<unknown>` when no current utilization](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/printers/internalversion/printers.go#L2595-L2604) — Kubernetes v1.37.1
  - [metrics-server README: APIServer forwards `GET /apis/metrics.k8s.io/v1beta1/pods` to metrics-server](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/README.md#L173-L186) — metrics-server v0.9.1
  - [EKS: HPA needs only a metrics source; no install](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/horizontal-pod-autoscaler.adoc#L15) and [control plane parameters: HPA sync period default `15s`](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/control-plane-configuration.adoc#L117-L129) — Amazon EKS User Guide @ 8d43223 (2026-09-16)

#### 11.4 `hpa-compute` — desiredReplicas = ceil(2 × 150/50) = 6, Deployment `scale`을 6으로 · `mutate` kcm
- **Summary:** desiredReplicas = ceil(2 × 150/50) = 6. 비율이 1.0 ± 0.1 안이면 아무것도 하지 않는다.
- **Detail:** 공식은 `ceil(currentReplicas × currentMetric / target)`이다. 150% ÷ 50% = 3.0이라 ceil(2 × 3.0) = 6이다. 비율이 0.9–1.1(기본 tolerance 0.1) 안이면 scaling을 건너뛴다. 값이 바뀌면 HPA는 Deployment 전체가 아니라 `scale` subresource만 6으로 Update하고 `SuccessfulRescale` 이벤트를 남긴다. 이후 Deployment → ReplicaSet → Pod 생성은 Lesson 2와 같다.
- **Facts:**
  | key | value |
  |---|---|
  | 공식 | `ceil(currentReplicas × current / target)` |
  | tolerance | 기본 `0.1` (`--horizontal-pod-autoscaler-tolerance`), 0.9 ≤ ratio ≤ 1.1이면 skip |
  | scale 호출 | `scale` subresource Update → Event `Normal SuccessfulRescale` |
- **Event log:** `kcm → kcm · in-process · ratio 3.00 → desiredReplicas 6; PUT …/deployments/web/scale replicas=6 · —`
- **After:**
  | field | value |
  |---|---|
  | currentReplicas | 2 |
  | currentMetric (cpu) | **150%** |
  | target | 50% |
  | desiredReplicas | **6** |
  | AbleToScale | **True / SucceededRescale** |
- **Record:** R11.1
- **Sources:**
  - [HPA: Algorithm details (formula, tolerance 0.1 by default)](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L128-L150) and [`scale` subresource](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L122-L124) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [kube-controller-manager reference: `--horizontal-pod-autoscaler-tolerance` Default 0.1](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/command-line-tools-reference/kube-controller-manager.md#L574-L577) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [replica_calculator.go: `isWithin`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/replica_calculator.go#L56-L58) and [`math.Ceil(usageRatio * readyPodCount)`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/replica_calculator.go#L110-L118) — Kubernetes v1.37.1
  - [horizontal.go: `Scales(...).Update`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/horizontal.go#L995-L998) and [`SucceededRescale` / `SuccessfulRescale`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/horizontal.go#L1028-L1030) — Kubernetes v1.37.1

#### 11.5 `pending` — 새 Pod 2개는 들어갈 Node가 없어 `Unschedulable` · `mutate` pod
- **Summary:** 새 Pod 4개 중 2개는 자리가 없어 `Pending`, `PodScheduled=False / Unschedulable`이 된다.
- **Detail:** kube-scheduler가 새 Pod 4개를 Filter한다. 2개는 기존 Node 남는 자리에 들어가지만(E.G.), 나머지 2개는 `NodeResourcesFit`이 모든 Node를 `Insufficient cpu`로 거른다. scheduler는 Pod에 `PodScheduled` condition을 `False`, reason `Unschedulable`로 쓰고 `FailedScheduling` Warning 이벤트를 남긴다. phase는 `Pending`이다. 이 상태가 Karpenter를 깨우는 신호다.
- **Facts:**
  | key | value |
  |---|---|
  | condition | `PodScheduled` `False`, reason `Unschedulable` |
  | 이벤트 | `Warning FailedScheduling`, 메시지 `0/X nodes are available: …` |
  | CPU 부족 사유 | `Insufficient cpu` (`NodeResourcesFit`) |
- **Event log:** `scheduler → apiserver · HTTPS REST · Pod status PodScheduled=False Unschedulable; Event FailedScheduling (2 Pods) · —`
- **After:**
  | pod | phase | PodScheduled | node |
  |---|---|---|---|
  | `web-…-a` | Running | True | `ip-10-0-1-11` |
  | `web-…-b` | Running | True | `ip-10-0-2-22` |
  | `web-…-c` | **Running** | **True** | **`ip-10-0-1-11`** |
  | `web-…-d` | **Running** | **True** | **`ip-10-0-2-22`** |
  | `web-…-e` | **Pending** | **False (Unschedulable)** | **—** |
  | `web-…-f` | **Pending** | **False (Unschedulable)** | **—** |
- **Record:** R11.2
- **Sources:**
  - [schedule_one.go: reason `Unschedulable` when rejected](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/schedule_one.go#L1164-L1168) and [`FailedScheduling` event + `PodScheduled=False`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/schedule_one.go#L1252-L1262) — Kubernetes v1.37.1
  - [noderesources/fit.go: `Insufficient cpu`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/noderesources/fit.go#L733-L736) and [framework/types.go: `0/X nodes are available: …` format](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/types.go#L1468-L1471) — Kubernetes v1.37.1
  - [Pod lifecycle: `Pending` includes time waiting to be scheduled](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L114) and [`PodScheduled`](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L608) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [kube-scheduler: no feasible node → Pod stays unscheduled](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/kube-scheduler.md#L42-L44) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 11.6 `nodeclaim` — Karpenter가 NodePool이 허용하는 instance type으로 NodeClaim을 만든다 · `mutate` karpenter
- **Summary:** Karpenter가 Unschedulable Pod를 보고, NodePool이 허용하는 instance type 후보로 NodeClaim을 만든다.
- **Detail:** Karpenter는 kube-scheduler가 Unschedulable로 표시한 Pod만 대상으로 한다. Pod의 request·nodeSelector·affinity를 NodePool `requirements`와 겹쳐 후보 instance type을 고르고, DaemonSet과 node overhead까지 더해 bin-packing한다. 결과는 cluster-scoped NodeClaim이며 instance 하나, Node 하나와 1:1이다. NodePool `limits`를 넘으면 Node를 더 만들지 않는다.
- **Facts:**
  | key | value |
  |---|---|
  | 대상 | Unschedulable로 표시된 Pod만 |
  | 후보 instance type | NodePool `requirements` ∩ Pod 제약 (nodeSelector, affinity, topology spread) |
  | NodePool `limits` 초과 | 새 Node 안 만듦 → Pod는 계속 Pending |
- **Event log:** `karpenter → apiserver · HTTPS REST · create NodeClaim default-x9wxq (log "created nodeclaim") · —`
- **After:**
  | field | value |
  |---|---|
  | NodeClaim | **`default-x9wxq`** (E.G.) |
  | NodePool | **`default`** |
  | pods | **`web-…-e`, `web-…-f`** |
  | instance-types 후보 | **`c5.2xlarge`, `m5.2xlarge`, …** (E.G.) |
  | Launched / Registered / Initialized / Ready | **— / — / — / —** |
- **Sources:**
  - [Karpenter concepts: only pods the kube-scheduler marked unschedulable](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/_index.md#L32-L36) — Karpenter (AWS provider) v1.15.1
  - [NodeClaims: definition, cluster-scoped, 1:1 with instance and Node](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L9-L21) and [steps 1–3 (watch pods, compute shape, create)](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L57-L110) — Karpenter (AWS provider) v1.15.1
  - [NodePools: requirements combined with pod constraints](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodepools.md#L86-L88) and [`spec.limits`: provisioning prevented when exceeded](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodepools.md#L415-L419) — Karpenter (AWS provider) v1.15.1
  - [FAQ: binpacks on CPU, memory, GPU, overhead, VPC CNI, daemonsets](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/faq.md#L96-L98) — Karpenter (AWS provider) v1.15.1

#### 11.7 `launch` — NodeClaim 하나를 EC2 `CreateFleet` 한 번으로 띄운다 · `move` karpenter → ec2api · token `request`: `CreateFleet Type=instant TotalTargetCapacity=1`
- **Summary:** Karpenter는 Auto Scaling group 없이 EC2 `CreateFleet`을 직접 불러 NodeClaim 하나당 instance 하나를 띄운다.
- **Detail:** NodeClaim은 EC2 `CreateFleet` 호출 하나가 된다. `Type`은 `instant`, `TotalTargetCapacity`는 1이고, 후보 instance type 여러 개를 함께 넘겨 EC2가 전략에 따라 고르게 한다(spot은 `price-capacity-optimized`). Insufficient Capacity 같은 복구 불가 오류면 NodeClaim을 지우고 그 instance type을 잠시 unavailable로 표시한 뒤 필요하면 새 NodeClaim을 만든다.
- **Facts:**
  | key | value |
  |---|---|
  | 호출 | EC2 `CreateFleet`, `Type: instant`, `TotalTargetCapacity: 1` |
  | 선택 전략 | spot `price-capacity-optimized`, on-demand `lowest-price` |
  | Insufficient Capacity 오류 | NodeClaim 삭제, 그 type 일시 unavailable, 필요하면 새 NodeClaim |
- **Event log:** `karpenter → ec2api · AWS EC2 API (HTTPS) · CreateFleet → instance i-01234567adb205c7e (E.G.; log "launched nodeclaim") · —`
- **Sources:**
  - [instance/types.go: `CreateFleetInputBuilder.Build` (instant, capacity 1, allocation strategies)](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/pkg/providers/instance/types.go#L221-L247) and [instance.go: `CreateFleet` call](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/pkg/providers/instance/instance.go#L419-L421) — Karpenter (AWS provider) v1.15.1
  - [NodeClaims: step 4 (launch, Insufficient Capacity Error handling, log)](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L112-L138) — Karpenter (AWS provider) v1.15.1

#### 11.8 `register` — 새 instance가 Node로 등록되고 NodeClaim이 Ready가 된다 · `mutate` karpenter
- **Summary:** 새 kubelet이 Node로 등록되고 NodeClaim이 Launched → Registered → Initialized → Ready가 된다.
- **Detail:** instance가 부팅하면 kubelet이 스스로 Node를 등록한다. Karpenter는 Node의 label·taint·owner ref를 NodePool/NodeClaim에 맞추고 `karpenter.sh/unregistered` taint를 지운다(Registered). Node가 Ready이고 startup taint가 빠지고 요청 resource가 보이면 Initialized, 셋이 모두 True면 Ready다. 15분 안에 등록되지 않으면 NodeClaim과 instance를 지운다.
- **Facts:**
  | key | value |
  |---|---|
  | 등록 신호 | `karpenter.sh/unregistered` taint 제거 |
  | 등록 timeout | 15분 → NodeClaim·instance 삭제, 필요하면 새 NodeClaim |
  | `Ready` | `Launched` ∧ `Registered` ∧ `Initialized` |
- **Event log:** `newnode → apiserver · HTTPS REST · Node ip-10-0-3-33 등록 (E.G.) → NodeClaim Registered, Initialized, Ready · —`
- **After:**
  | field | value |
  |---|---|
  | NodeClaim | `default-x9wxq` (E.G.) |
  | NodePool | `default` |
  | pods | `web-…-e`, `web-…-f` |
  | instance-type | **`c5.2xlarge`** (E.G.) |
  | node | **`ip-10-0-3-33`** (E.G.) |
  | Launched / Registered / Initialized / Ready | **True / True / True / True** |
- **Record:** R11.3
- **Sources:**
  - [NodeClaims: steps 5–6 (self-registration, `karpenter.sh/unregistered`, 15 minutes, initialization)](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L140-L165) — Karpenter (AWS provider) v1.15.1
  - [NodeClaims: `status.conditions` table](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L572-L582) — Karpenter (AWS provider) v1.15.1

#### 11.9 `bind` — Pending Pod를 새 Node에 붙이는 건 kube-scheduler다 · `mutate` pod
- **Summary:** Pending Pod를 새 Node에 bind하는 건 Karpenter가 아니라 kube-scheduler다.
- **Detail:** Karpenter는 bin-packing을 시뮬레이션해 capacity만 만들고 Pod를 bind하지 않는다. 새 Node가 생기면 scheduler는 거부됐던 Pod를 다시 큐에 넣어 재시도하고, feasible Node를 골라 binding을 API server에 알린다. 기본 scoring `LeastAllocated`는 Pod를 퍼뜨려 Karpenter의 packing과 어긋날 수 있어 Karpenter 문서는 `MostAllocated`를 권한다.
- **Facts:**
  | key | value |
  |---|---|
  | bind 주체 | kube-scheduler (Karpenter 아님) |
  | 재시도 계기 | 새 Node 같은 cluster event → QueueingHint로 다시 큐에 |
  | 기본 scoring | `NodeResourcesFit` `LeastAllocated` (Karpenter 권장 `MostAllocated`) |
- **Event log:** `scheduler → apiserver · HTTPS REST · POST pods/web-…-e/binding, pods/web-…-f/binding → ip-10-0-3-33 (E.G.) · —`
- **After:**
  | pod | phase | PodScheduled | node |
  |---|---|---|---|
  | `web-…-a` | Running | True | `ip-10-0-1-11` |
  | `web-…-b` | Running | True | `ip-10-0-2-22` |
  | `web-…-c` | Running | True | `ip-10-0-1-11` |
  | `web-…-d` | Running | True | `ip-10-0-2-22` |
  | `web-…-e` | **Running** | **True** | **`ip-10-0-3-33`** |
  | `web-…-f` | **Running** | **True** | **`ip-10-0-3-33`** |
- **Sources:**
  - [Karpenter scheduling: Karpenter does not place pods; `LeastAllocated` default; `MostAllocated` recommended](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/scheduling.md#L705-L707) — Karpenter (AWS provider) v1.15.1
  - [kube-scheduler: score feasible nodes, then binding](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/kube-scheduler.md#L46-L49) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [Scheduling framework: unschedulable Pod returned to queue](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L41-L43) and [QueueingHint](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L75-L83) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)

#### 11.10 `hpa-scale-down` — 부하가 내려가도 HPA는 300초 window의 최댓값을 따른다 · `mutate` kcm
- **Summary:** 부하가 내려가도 HPA는 최근 300초 추천값 중 최댓값을 써서 바로 줄이지 않는다.
- **Detail:** utilization이 20%로 떨어지면 계산값은 ceil(6 × 20/50) = 3이다(E.G.). HPA는 매번 추천값을 기록하고 최근 window(기본 300초) 안의 가장 큰 값을 적용해 flapping을 막는다. 그동안 `AbleToScale`의 reason은 `ScaleDownStabilized`다. window가 지나면 기본 정책(15초마다 최대 100%)과 `minReplicas` 범위 안에서 3으로 줄어든다.
- **Facts:**
  | key | value |
  |---|---|
  | downscale stabilization | 기본 `5m` (`behavior.scaleDown.stabilizationWindowSeconds: 300`) |
  | 대기 중 condition | `AbleToScale True ScaleDownStabilized` |
  | scale-up window | 기본 `0`s (즉시) |
- **Event log:** `kcm → kcm · in-process · recommendation 3, stabilized 6 (ScaleDownStabilized) · —`
- **After:**
  | field | value |
  |---|---|
  | currentReplicas | **6** |
  | currentMetric (cpu) | **20%** |
  | target | 50% |
  | 계산값 (window 전) | **3** |
  | desiredReplicas | **6** (window 최댓값, 300초 뒤 3) |
  | AbleToScale | **True / ScaleDownStabilized** |
- **Record:** R11.4
- **Sources:**
  - [HPA: recommendations window, default 5 minutes](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L215-L220), [Stabilization window](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L476-L496) and [Default behavior (300 s down, 0 s up)](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L524-L555) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [kube-controller-manager reference: `--horizontal-pod-autoscaler-downscale-stabilization` Default 5m0s](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/reference/command-line-tools-reference/kube-controller-manager.md#L553-L556) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976)
  - [defaults.go: downscale stabilization 5 min](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/config/v1alpha1/defaults.go#L43-L45) and [horizontal.go: `ScaleDownStabilized` condition](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/horizontal.go#L1109-L1112), [with behavior](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/horizontal.go#L1303-L1312) — Kubernetes v1.37.1

#### 11.11 `consolidate` — 비거나 덜 쓰는 Node를 Karpenter가 지우거나 더 싼 Node로 바꾼다 · `mutate` karpenter
- **Summary:** Pod가 빠져 비거나 덜 쓰는 Node는 Karpenter consolidation이 지우거나 더 싼 Node로 바꾼다.
- **Detail:** 기본값은 `consolidationPolicy: WhenEmptyOrUnderutilized`, `consolidateAfter: 0s`다. Node의 Pod가 다른 Node 남는 자리로 모두 옮겨질 수 있으면 Deletion, 더 싼 Node 하나가 필요하면 Replace한다. `karpenter.sh/disrupted:NoSchedule` taint를 걸고 필요하면 교체 Node를 먼저 띄운 뒤 Eviction API로 drain(PDB 존중)하고 지운다. 동시 disruption은 budget(기본 `nodes: 10%`)이 막는다.
- **Facts:**
  | key | value |
  |---|---|
  | 기본값 | `WhenEmptyOrUnderutilized`, `consolidateAfter: 0s` |
  | 방식 | Deletion 또는 Replace (더 싼 Node 1개 + 남는 자리) |
  | 제한 | budget 기본 `nodes: 10%`, PDB는 Eviction API로 존중 |
- **Event log:** `karpenter → apiserver · HTTPS REST · taint karpenter.sh/disrupted, evict Pods, delete NodeClaim default-x9wxq (E.G.) · —`
- **After:**
  | field | value |
  |---|---|
  | NodeClaim | `default-x9wxq` (E.G.) |
  | NodePool | `default` |
  | pods | **— (다른 Node로 이동)** (E.G.) |
  | instance-type | `c5.2xlarge` (E.G.) |
  | node | `ip-10-0-3-33` (E.G.) |
  | Consolidatable | **True** |
  | 상태 | **drain 후 삭제** (E.G.) |
- **Sources:**
  - [Disruption: Defaults](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/disruption.md#L75-L83), [Deletion / Replace](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/disruption.md#L98-L100), [disruption flow (taint, pre-spin, delete)](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/disruption.md#L16-L26), [drain via Eviction API respects PDBs](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/disruption.md#L33), [budget default `nodes: 10%`](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/disruption.md#L317) — Karpenter (AWS provider) v1.15.1
  - [NodeClaims: `Consolidatable` condition](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L582) — Karpenter (AWS provider) v1.15.1

**Replay.** user → pod (CPU 150%) → metrics ⇄ kubelet (`/metrics/resource`) → kcm(HPA) → apiserver → metrics (`metrics.k8s.io`) → kcm (ceil 2×3 = 6) → apiserver (`scale` 6) → scheduler → pod (2개 `Unschedulable`) → karpenter (NodeClaim) → ec2api (`CreateFleet`) → newnode → apiserver (NodeClaim Ready) → scheduler → pod (bind) → kcm (300 s window) → karpenter (consolidation)

**Overview.** HPA 기본 scale-up 정책은 window 0 s에 15초마다 100% 또는 4 Pods 중 큰 쪽이라 이 예시의 2 → 6은 한 번에 허용된다([Default behavior](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L530-L555)).
Cluster Autoscaler는 같은 Pending 신호로 node group(Auto Scaling group)의 크기를 올리는 방식이다([EKS autoscaling](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/autoscaling.adoc#L39-L40)).
EKS Auto Mode는 Karpenter 위에 만든 AWS 운영 autoscaling이다. 직접 설치한 Karpenter는 고객이 운영하고 AWS SLA가 없다([EKS autoscaling](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/autoscaling.adoc#L15-L17), [L36](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/autoscaling.adoc#L36)).
정리: Pod 수는 HPA가(11.4, 11.10), Node 수는 Pending Pod와 consolidation을 보는 Karpenter가(11.6, 11.11) 정한다.

### Decoder records

#### R11.1 HorizontalPodAutoscaler `web` · step 11.4 · wire: true
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
status:
  currentReplicas: 2
  desiredReplicas: 6
  currentMetrics:
  - type: Resource
    resource:
      name: cpu
      current:
        averageUtilization: 150
        averageValue: 750m
  conditions:
  - type: AbleToScale
    status: "True"
    reason: SucceededRescale
    message: the HPA controller was able to update the target scale to 6
  - type: ScalingActive
    status: "True"
    reason: ValidMetricFound
    message: the HPA was able to successfully calculate a replica count from cpu resource utilization (percentage of request)
  - type: ScalingLimited
    status: "False"
    reason: DesiredWithinRange
    message: the desired count is within the acceptable range
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `spec.scaleTargetRef` | `apps/v1 Deployment web` | `scale` subresource를 가진 대상 | E.G. |
| `spec.minReplicas` / `maxReplicas` | 2 / 10 | replica 하한·상한 | E.G. |
| `spec.metrics[0].resource.target.averageUtilization` | 50 | request 대비 목표 % | E.G. |
| `status.currentReplicas` / `desiredReplicas` | 2 / 6 | 현재 vs 계산된 목표 | E.G. |
| `status.currentMetrics[0].resource.current.averageUtilization` | 150 | Pod 평균 utilization % | E.G. |
| `status.conditions[AbleToScale]` | True / `SucceededRescale` | scale 조회·갱신 가능 여부 | |
| `status.conditions[ScalingActive]` | True / `ValidMetricFound` | metric으로 계산 가능 여부 (False면 대개 metric 조회 문제) | |
| `status.conditions[ScalingLimited]` | False / `DesiredWithinRange` | min/max에 걸렸는지 | |

Sources: [walkthrough: autoscaling/v2 HPA YAML](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough.md#L230-L261) and [conditions explained](https://github.com/kubernetes/website/blob/8f6d9762bfd9e130d63f678c2e0f9b048bc3373e/content/en/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough.md#L490-L498) — Kubernetes 1.37 docs (kubernetes/website main @ 8f6d976); condition reasons and messages: [horizontal.go L423](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/horizontal.go#L423), [L688](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/horizontal.go#L688), [L1029](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/horizontal.go#L1029), [L1367](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/controller/podautoscaler/horizontal.go#L1367) — Kubernetes v1.37.1.

#### R11.2 Pending Pod + `FailedScheduling` Event · step 11.5 · wire: true
```yaml
# Pod (excerpt)
apiVersion: v1
kind: Pod
metadata:
  name: web-7c9d8f6b5d-x7k2p
  namespace: default
spec:
  containers:
  - name: app
    resources:
      requests:
        cpu: 500m
status:
  phase: Pending
  conditions:
  - type: PodScheduled
    status: "False"
    reason: Unschedulable
    message: "0/2 nodes are available: 2 Insufficient cpu. preemption: …"
---
# Event (events.k8s.io/v1, excerpt)
type: Warning
reason: FailedScheduling
action: Scheduling
regarding: { kind: Pod, namespace: default, name: web-7c9d8f6b5d-x7k2p }
note: "0/2 nodes are available: 2 Insufficient cpu. preemption: …"
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `spec.containers[].resources.requests.cpu` | `500m` | scheduler Filter와 HPA utilization의 기준 | E.G. |
| `status.phase` | `Pending` | 스케줄 대기 포함 | |
| `status.conditions[].type` / `status` | `PodScheduled` / `"False"` | 아직 Node 배정 안 됨 | |
| `status.conditions[].reason` | `Unschedulable` | Filter가 모든 Node를 거부 (Karpenter가 보는 신호) | |
| `status.conditions[].message` | `0/2 nodes are available: 2 Insufficient cpu. …` | `0/X nodes are available: <PreFilter>. <Filter>. <PostFilter>` | E.G. |
| Event `reason` / `action` | `FailedScheduling` / `Scheduling` | scheduler Warning 이벤트 | |

Sources: [schedule_one.go L1164-L1168](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/schedule_one.go#L1164-L1168), [L1252-L1262](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/schedule_one.go#L1252-L1262), [framework/types.go: message builder](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/types.go#L1468-L1520), [fit.go: `Insufficient cpu`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/scheduler/framework/plugins/noderesources/fit.go#L733-L736), [core/v1 `PodReasonUnschedulable`](https://github.com/kubernetes/kubernetes/blob/v1.37.1/staging/src/k8s.io/api/core/v1/types.go#L3776) — Kubernetes v1.37.1. The PostFilter (`preemption: …`) text is not traced and shown as `…`.

#### R11.3 NodeClaim `default-x9wxq` · step 11.8 · wire: true
```yaml
apiVersion: karpenter.sh/v1
kind: NodeClaim
metadata:
  name: default-x9wxq
  labels:
    karpenter.sh/nodepool: default
    karpenter.sh/capacity-type: spot
    node.kubernetes.io/instance-type: c5.2xlarge
    topology.kubernetes.io/zone: us-west-2b
  ownerReferences:
  - apiVersion: karpenter.sh/v1
    kind: NodePool
    name: default
    blockOwnerDeletion: true
  finalizers:
  - karpenter.sh/termination
spec:
  nodeClassRef:
    group: karpenter.k8s.aws
    kind: EC2NodeClass
    name: default
  requirements:
  - key: node.kubernetes.io/instance-type
    operator: In
    values: ["c5.2xlarge", "m5.2xlarge"]
  resources:
    requests:
      cpu: 1150m
      pods: "5"
status:
  providerID: aws:///us-west-2b/i-01234567adb205c7e
  nodeName: ip-10-0-3-33.us-west-2.compute.internal
  allocatable: { cpu: 7910m, memory: 14162Mi, pods: "58" }
  conditions:
  - { type: Launched,    status: "True", reason: Launched }
  - { type: Registered,  status: "True", reason: Registered }
  - { type: Initialized, status: "True", reason: Initialized }
  - { type: Ready,       status: "True", reason: Ready }
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.labels[karpenter.sh/nodepool]` | `default` | 소유 NodePool (Node에도 sync) | |
| `metadata.labels[node.kubernetes.io/instance-type]` | `c5.2xlarge` | 실제 launch된 type | E.G. |
| `metadata.finalizers` | `karpenter.sh/termination` | 정상 drain 후에만 삭제 | |
| `spec.requirements` | NodePool ∩ Pod 제약의 최종 결과 | launch에 쓴 후보 목록 | E.G. |
| `spec.resources.requests` | cpu 1150m, pods 5 | 이 NodeClaim을 만든 Pod(+DaemonSet) 합 | E.G. |
| `status.providerID` | `aws:///us-west-2b/i-…` | EC2 instance 식별자 | E.G. |
| `status.nodeName` | `ip-10-0-3-33…` | 연결된 Node | E.G. |
| `status.conditions` | Launched, Registered, Initialized, Ready | lifecycle 단계 (Ready는 셋 모두 True) | |

Sources: [NodeClaims: annotated NodeClaim YAML](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L364-L486), [metadata.labels](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L488-L490), [conditions table](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L572-L582) — Karpenter (AWS provider) v1.15.1. Names, IDs and sizes are E.G., adapted from the doc example.

#### R11.4 `kubectl get hpa web` (scale-down window 중) · step 11.10 · wire: false
```text
$ kubectl get hpa web
NAME   REFERENCE        TARGETS        MINPODS   MAXPODS   REPLICAS   AGE
web    Deployment/web   cpu: 20%/50%   2         10        6          12m
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `REFERENCE` | `Deployment/web` | `scaleTargetRef` kind/name | E.G. |
| `TARGETS` | `cpu: 20%/50%` | `<resource>: <현재>/<목표>`; metric이 없으면 `<unknown>` | E.G. |
| `MINPODS` / `MAXPODS` | 2 / 10 | `spec.minReplicas` / `maxReplicas` | E.G. |
| `REPLICAS` | 6 | `status.currentReplicas` — window 동안은 20%여도 6 유지 | E.G. |

Sources: [kubectl printer: HPA columns](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/printers/internalversion/printers.go#L364-L372), [`TARGETS` format](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/printers/internalversion/printers.go#L2595-L2604), [row cells](https://github.com/kubernetes/kubernetes/blob/v1.37.1/pkg/printers/internalversion/printers.go#L2644-L2661) — Kubernetes v1.37.1.

### Self-check
1. **Q.** 현재 4 replicas, 평균 CPU utilization 90%, target 60%이면 HPA 계산값은? scaling이 일어나나? **A.** ratio 1.5 → ceil(4 × 1.5) = 6. 1.5는 0.9–1.1 밖이므로 scale-up한다.
2. **Q.** `kubectl get hpa`의 `TARGETS`가 `<unknown>`이다. 대표 원인 두 가지는? **A.** `metrics.k8s.io`를 제공하는 metrics-server가 없거나 응답하지 않는다. 또는 대상 Pod의 container 중 하나라도 `requests.cpu`가 없어 utilization이 정의되지 않는다.
3. **Q.** metrics-server의 수집 주기 기본값은? **A.** 공식 소스끼리 다르다. 바이너리 `--metric-resolution` 기본값은 60s이고, 공식 manifest와 Helm chart는 15s를 넘긴다.
4. **Q.** Karpenter를 깨우는 Pod 상태와, 그 뒤 Pod를 새 Node에 배치하는 주체는? **A.** `PodScheduled=False`, reason `Unschedulable`. Karpenter는 NodeClaim을 만들고 `CreateFleet`으로 instance를 띄울 뿐이고, bind는 kube-scheduler가 한다.
5. **Q.** 부하가 사라졌는데 Pod 수가 5분 가까이 그대로다. 왜이며, Node는 언제 줄어드나? **A.** HPA scale-down stabilization window(기본 300초) 동안 최근 추천값 중 최댓값을 쓰기 때문이다(`ScaleDownStabilized`). Pod가 줄어 Node가 비거나 저활용되면 Karpenter consolidation(기본 `WhenEmptyOrUnderutilized`, `consolidateAfter: 0s`, budget `nodes: 10%`, PDB 존중)이 지우거나 교체한다.

### Unverified
- FailedScheduling 메시지의 PostFilter 부분(`preemption: …`) 문구는 소스에서 추적하지 않았다. R11.2에 `…`로 둔다.
- Karpenter 문서는 대상 Pod를 "status condition `Unschedulable=True`"라고 쓰지만, Kubernetes 소스가 쓰는 것은 `PodScheduled=False`, reason `Unschedulable`이다. 레슨은 Kubernetes 표기를 쓴다.
- NodeClaim 생성 직후 conditions가 `Unknown`인지 아직 없는지는 확인하지 않았다. 11.6 After에는 `—`로 둔다.

## Cut by must-know rule

Facts from the first plan that were removed because they fail the test "Would the owner be blamed in an incident or a design review for not knowing this?". Some are kept as one Overview line, as noted.

### Lesson 1 `control-plane-node-join`

- etcd KMS v2 envelope encryption, Standard 8 GB / Provisioned 16 GB etcd 크기 — 암호화·용량 계층 trivia, 이 흐름과 무관.
- compute 옵션 비교 표 (MNG drain 15분, Fargate +256 MB, Auto Mode 21일 등) — 다른 메커니즘, Overview 한 줄로.
- control plane egress 모드 `AWS_MANAGED`/`CUSTOMER_ROUTED` — 새 기능, 흔히 마주치지 않음.
- Provisioned control plane tier, Standard mode — 용량 계층 trivia.
- leader election step(1.4)과 `holderIdentity` — Overview 한 줄, EKS에서 관측 불가.
- kubelet API 경로 `/containerLogs/...` — 운영에서 직접 쓰지 않음, 미확인.
- MNG label `eks.amazonaws.com/nodegroup`, `eks.amazonaws.com/capacityType` — label trivia, 미확인 포함.
- `CreateCluster`/`DescribeCluster` step과 record, subnet당 IP 6/16개 — 클러스터 생성 API는 join 흐름이 아님.
- etcd key `/registry/minions/<node>` — compiled-in 상수, 동작에 영향 없음.
- Fargate username `system:node:{{SessionName}}`, `STANDARD` 기본 type — 이 lesson의 node 종류 밖.
- Route 53 hosted zone을 별도 node로 두기 — Topic layout에 없음, 1.5 사실로만.
- 생성·부팅 소요 시간 — 출처 없음.

### Lesson 2 `apply-request-path`

- etcd envelope / KMS v2 step(옛 2.6)과 저장 값 형식(`k8s:enc:kms:v2:`, protobuf magic `k8s\x00`, `runtime.Unknown`) — 암호화·저장 layout trivia.
- Server-Side Apply를 주 경로로 쓰던 PATCH step과 `managedFields` record — 기본값이 아니므로 Overview 한 줄로.
- `ComputeHash` FNV-32a, `SafeEncodeString` 문자표, `collisionCount` — 동작을 바꾸지 않는 내부 구현.
- `BurstReplicas = 500`, `expirationSeconds: 3607`, `imagePullPolicy` 기본값 — 내부 상수, 이 흐름에서 판단에 쓰이지 않음.
- `maxSurge`/`maxUnavailable` 25% — rolling update는 다른 lesson.
- EKS 1.36 admission plugin 전체 목록 — 버전이 다르고 목록 암기는 trivia.
- AWS CLI 최소 버전 `2.12.3`/`1.27.160` — 설치 trivia.
- scheduler filter/score, Binding, kubelet, CRI, CNI, Pod condition 순서(옛 2.10–2.18) — 스케줄·실행은 다른 lesson.
- event log의 크기·시간 값 — 출처 없음.

### Lesson 3 `schedule-to-running`

- `percentageOfNodesToScore` 자동 계산(100노드 50% ~ 5000노드 10%, 최소 100노드) — 큰 클러스터 튜닝 상수, 동작 이해에 불필요.
- Score plugin weight 표 — Overview 한 줄로 이동.
- PreEnqueue, Reserve, Permit, PreBind, PostBind extension point — 기본 경로에서 엔지니어가 만지지 않음.
- `BindingREST`의 `GuaranteedUpdate`, `ClearingNominatedNodeNameAfterBinding`, label 복사 — 내부 구현.
- R6 `RunPodSandboxRequest` 전체 필드(hostname, log_directory, dns_config, cgroup_parent) — 엔지니어가 읽는 record가 아님; 값도 미확인.
- `AddNetworkRequest` 필드 목록, ipamd warm pool 상태 패널 — Lesson 5로.
- `imagePullPolicy` 기본값 규칙 — 이 흐름의 must-know 아님(pull 실패 `ImagePullBackOff`만 남김).
- sandbox(pause) image 이름 — 값 미확인, 장애와 무관.
- `PodSandboxNetworkStatus`에서 `podIP`를 얻는 내부 경로 — 구현 세부.
- event log의 크기·시간 E.G. 값 — 출처 없음, `—`로 대체.
- Deployment `progressDeadlineSeconds` 600 — rollout lesson 범위.

### Lesson 4 `scheduling-constraints`

- Extended resources, device plugin, DRA — 이 흐름의 실무 must-know 아님.
- Pod-level resources(`spec.resources`), in-place resize — 새 기능.
- Memory QoS(`memory.min`/`memory.high`, `memoryThrottlingFactor`) — 기본 꺼짐, exotic config.
- CPU Manager `static` policy와 exclusive CPU — 특수 workload.
- `cpuCFSQuotaPeriod` 변경, `memory.oom.group`/`singleProcessOOMKill` — exotic config.
- soft eviction threshold, `evictionMaxPodGracePeriod`, minimum eviction reclaim, imagefs/containerfs 분리 — 노드 튜닝 세부; hard threshold만 남김.
- 디스크·inode·PID pressure의 eviction 순위 — memory 흐름만 남김.
- `minDomains`, `nodeAffinityPolicy`/`nodeTaintsPolicy`, `matchLabelKeys` — spread 세부 옵션.
- `PreferNoSchedule`, taint numeric comparison operators — 드문 사용.
- `namespaceSelector`, `mismatchLabelKeys`, inter-pod affinity 성능 경고 — 세부 옵션.
- Priority/preemption 상세(victim 선택, `nominatedNodeName`) — Overview 한 줄.
- `kubeReserved` cpu 계산 구간(6%/1%/0.5%/0.25%) — 예시 숫자 하나로 대체.
- Event log의 시간·크기 값 — 출처 없음, `—`.

### Lesson 5 `vpc-cni`

- IMDS에서 ENI 목록을 읽는 단계 (3.2): 내부 초기화 순서, 장애 대응과 무관.
- `10-aws.conflist` 생성과 plugin chain(`aws-cni`, `egress-cni`, `portmap`), `cniVersion 0.4.0` (3.5): 설정 파일 trivia.
- CNI ADD 환경변수 전체와 CNI result JSON(`interfaces[]`, `dummy…`, `mac`에 route table) (R3): 엔지니어가 거의 읽지 않는 필드.
- `ipamd` introspection `/v1/enis` JSON (R2): 출력 형식이 미검증이고 pool 패널과 중복.
- SNAT/CONNMARK 단계와 iptables rule (3.16, R5): brief 지시로 제외, 다른 메커니즘.
- `IP_COOLDOWN_PERIOD` 30초, `ipPoolMonitorInterval` 5초, `ipam.json` checkpoint 경로: 동작을 바꾸지 않는 내부 상수.
- kube-reserved memory `11 × maxPods + 255`: max Pods 흐름과 별개 trivia.
- `aws-node` image 이름, host mount 목록, network-policy agent version: 버전·배포 trivia.
- ENI tag key 3개와 `NetworkCardIndex`, `RequesterManaged`, `MacAddress`: 고아 ENI 정리 외에는 읽지 않는 필드.
- Pod gateway `169.254.1.(index+1)` multi-NIC 계산, static ARP: 일반 Pod에는 영향 없음.
- `ENABLE_SUBNET_DISCOVERY` 버전(v1.18.0+), PD 버전(v1.9.0+): 버전 이력.

### Lesson 6 `service-kube-proxy`

- 4.1의 `ServiceCIDR`/`IPAddress` 객체와 `MultiCIDRServiceAllocator` stable 버전: 버전 이력, 신규 기능.
- 슬라이스당 endpoint 100개 상한(`--max-endpoints-per-slice`, 최대 1000): 대규모 클러스터 외에는 동작에 영향 없음.
- EKS kube-proxy add-on 버전(`v1.36.0-eksbuild.21`), CoreDNS add-on 버전: 버전 trivia, 1.37 값은 pinned 자료에 없음.
- `configSyncPeriod` 15m: 동작을 바꾸지 않는 내부 상수.
- conntrack `maxPerCore`/`min`/`tcpEstablishedTimeout` 기본값: exotic tuning.
- `timeoutSeconds`, `successThreshold` probe 기본값: 흐름에 필요 없음 (`periodSeconds`, `failureThreshold`만 유지).
- large cluster mode에서 comment 생략(threshold 1000), `KUBE-NODEPORTS` tail rule: 이 경로와 무관.
- `KUBE-FORWARD`의 `INVALID` DROP과 `conntrackTCPLiberal`: niche.
- nftables mode의 kernel 5.13 요구, `NFTablesProxyMode` GA 버전: Overview 한 줄의 "대안은 nftables"로 축소.
- Service `metadata.uid`/`resourceVersion`, `ipFamilies`, `ipFamilyPolicy`, `internalTrafficPolicy`, EndpointSlice `zone`/`ownerReferences`: 이 흐름에서 읽지 않는 필드.
- Ingress, LBC, Target Group, readiness gate, `instance`/`ip` mode (4.11–4.18): 다른 레슨.

### Lesson 7 `alb-ingress`

- 옛 4.18 `instance` 모드 비교 step (`KUBE-NODEPORTS`, `KUBE-EXT`, SNAT, NodePort 범위): Overview 한 줄로 줄임. iptables 경로는 service-traffic 레슨 몫.
- `externalTrafficPolicy: Local`과 source IP 보존: 이 메커니즘(ALB `ip` 모드)의 경로 밖.
- legacy readiness gate prefix `target-health.alb.ingress.k8s.aws`: 옛 controller 이전 이력.
- gRPC health check 기본값(`/AWS.ALB/healthcheck`, `12`): 니치 설정.
- `RegisterTargets`의 `AvailabilityZone` override 조건: 내부 동작, 보통 생략.
- EKS Hybrid Nodes의 `ip` 요구: 니치 배포 형태.
- readiness gate webhook `failurePolicy` 기본값 이력(v2.11.0 전후): 버전 이력.
- 이벤트 로그의 크기·시간 값(`~0.8 KB`, `~2–3 s`, `3 ms`): 출처 없음.
- Ingress API frozen 외의 Gateway API 상세: 다른 메커니즘.

### Lesson 8 `pod-lifecycle`

- `Recreate` strategy 상세와 orphan/adopt 규칙: 이 메커니즘 밖.
- proportional scaling, `progressDeadlineSeconds`, rollback 명령: 다른 주제.
- Pod-level/container-level restart policy 규칙, restart backoff 수치: liveness 재시작 한 줄로 충분.
- custom `stopSignal`(`ContainerStopSignals` feature gate): 니치 기능. `STOPSIGNAL` 한 마디만 남김.
- sidecar container 종료 순서: 이 레슨의 Pod에는 sidecar 없음.
- probe-level `terminationGracePeriodSeconds`, gRPC/h2c probe: 니치 설정.
- `kubectl delete --grace-period=0 --force`: rolling update 경로 밖.
- `deregistration_delay.connection_termination.enabled`(NLB용): ALB 경로 밖.

### Lesson 9 `irsa`

- Java SDK `DefaultCredentialsProvider` chain 6단계 순서와 `sts` 모듈 의존성 — SDK 내부. Overview 한 줄로 줄임.
- `RoleSessionName` 형식, SDK 자격 증명 선갱신(prefetch/stale) 시간 — SDK 내부 trivia.
- `AssumeRoleWithWebIdentity` Query/XML wire 형식(R4) — 엔지니어가 읽지 않음. 응답 필드는 step 9.9 facts로.
- `eks.amazonaws.com/token-expiration`, `skip-containers`, `sts-regional-endpoints` annotation — 드문 설정.
- webhook token 만료 허용 범위(600–86400초) — 내부 상수.
- `admissionReviewVersions`가 `v1beta1`이어야 한다는 점 — 관리형 webhook에서 사용자가 건드리지 않음.
- admission webhook `failurePolicy` 기본값 `Fail` — 이 메커니즘의 critical path 밖.
- kubelet refresh jitter 10초, 만료 token GC 1분 — 동작을 바꾸지 않는 내부 상수.
- `jti`, `nbf`, node claim, `ServiceAccountTokenJTI`/`PodNodeInfo` feature gate 이력 — 버전 이력 trivia.
- `warnafter` claim — kube API audience에만 해당, IRSA와 무관.
- JWKS 응답 throttling·`cache-control` 안내 — 외부 검증기를 직접 만들 때만 필요.
- Kubernetes 표준 discovery 경로 `/.well-known/openid-configuration` — STS 내부 동작, 엔지니어가 다루지 않음.
- Pod Identity 비교 부분(old 5.12–5.18) — Lesson 10으로 분리.

### Lesson 10 `pod-identity`

- 클러스터당 association 5,000개 한도 — 대부분 도달하지 않는 한도.
- agent metrics port `2705`, `--max-cache-size 2000`, `--max-service-qps 3` — 내부 flag 기본값.
- webhook token 만료 jitter(79,200–86,400초) — 동작을 바꾸지 않는 내부 상수. R10.1 Sources에 한 줄.
- `defaultMode: 420` 해설 — 파일 권한 trivia (yaml에는 문서 그대로 둠).
- EKS Auth 입력 `Zone`, `InstanceId`, `EksNodeName` — 선택 필드, agent 내부.
- `PodIdentityAssociation.AssociationArn/Id` 형식, `PackedPolicyTooLarge` 시 session tag 끄기 — 드문 경우.
- Java SDK `ContainerCredentialsProvider` 허용 host 목록과 chain 5번 위치 — SDK 내부.
- agent의 IMDS chained retriever(`EnableIMDS`) — 특수 설정.
- Security Groups for Pods 사용 시 `POD_SECURITY_GROUP_ENFORCING_MODE=standard` — 이 메커니즘 밖의 조합 설정.
- webhook이 붙이는 label `eks.amazonaws.com/pod-identity: enabled` — 디버깅 trivia.
- EKS Auth 응답 decoder(old R8 전체) — 응답 필드는 step 10.8 facts로 줄임.

### Lesson 11 `autoscaling`

- Cluster Autoscaler 대비 step(옛 6.14)과 CA 상태 패널, CA scan-interval·expander·scale-down 값 — 다른 구현의 config, Overview 한 줄로 대체.
- EKS Auto Mode step(옛 6.17), built-in NodePool, NodeClass group — 다른 운영 모델, Overview 한 줄로 대체.
- `CreateFleet` request struct record(옛 R7), launch template·Overrides·tag 목록 — SDK 필드 trivia.
- NodePool YAML record(옛 R5)와 `weight` — requirements와 limits만 step에 남김.
- metrics-server cache 전용 step(옛 6.3)과 PodMetrics record(옛 R2), `container_cpu_usage_seconds_total` — 내부 표현, scrape step 한 문장으로 대체.
- `/stats/summary`(v0.6.0 이전) — version history.
- `--metric-resolution` 최소 10s validation — exotic config.
- HPA behavior 계산 step(옛 6.6), `periodSeconds` 최대 1800 — 기본값 한 줄로 Overview에.
- missing/not-ready Pod 보수적 재계산, 여러 metric 중 최대값 — 드문 경우.
- `HPAConfigurableTolerance`와 HPA별 `tolerance` — 새 기능.
- EKS Provisioned Control Plane에서 HPA sync period 10s–15s 변경, EKS `nodeResourcesFit.scoringStrategy` 파라미터 — exotic config.
- Karpenter batch window(1s idle / 10s max)와 log 문자열 — 내부 상수.
- `CreateFleet` IAM 조건 tag — 이 흐름의 must-know 아님.
- Consolidation 순서 Empty → Multi → Single — 내부 heuristic.
- Event-log 시간 값(CreateFleet ~3 s, 등록 40–70 s) — 문서 예시일 뿐 보장값이 아님.
- EKS community add-on 이름 `metrics-server` — 설치 trivia.

## Open questions

Each lesson's own "Unverified" list stays with the lesson. This section collects what needs a decision or a check before implementation.

### For the owner or the engine session

1. **Lesson count.** The review asked for "about 9 lessons", 6 split lessons plus 2 new ones. Doing every requested split gives 9 (1, 2a, 2b, 3, 4a, 4b, 5a, 5b, 6), and the two new lessons make 11. All 11 have 10 or 11 steps. If 9 is a hard limit, the closest merge is lessons 9 and 10 (IRSA and Pod Identity), since they share the webhook and token steps.
2. **Layout gaps** found while writing:
   - There is no `kubelet` on node B, so lesson 8 shows the new Pod's probe as a `mutate` of `podb`, not a `move`.
   - There is no EKS API node, so lesson 10 shows `CreatePodIdentityAssociation` as a `mutate` of `eksauth`.
   - Lesson 8's ALB panel has a second v1 Pod with no node of its own.
   Adding `kubeletb` (node B) and `eksapi` (AWS APIs column) would fix all three without moving any existing node.
3. **One panel with two tables.** Lesson 6 keeps the nat rules and the conntrack entries in one `kubeproxy` table. If the engine allows only one view per node, that stays. If it allows two, split them.

### Values where two official sources disagree (both are shown in the lessons)

| Lesson | Value | Source A | Source B |
|---|---|---|---|
| 1 | node unreachable timeout | `node-status.md` "40 second default timeout" | `node-status.md` and `nodelifecycle` defaults: `node-monitor-grace-period` 50 s |
| 5 | `WARM_PREFIX_TARGET` default | VPC CNI README: none | `aws-node` manifest and Helm values: `"1"` |
| 6 | a not-Ready Pod and the EndpointSlice | `probes.md`: the controller removes the Pod's IP | v1.37.1 code: the endpoint stays, with `ready`/`serving` false |
| 6 | IPVS mode | EKS guide (1.35 notes): removed in 1.36 | upstream v1.37.1: deprecated, off by default in 1.40, removed in 1.43 |
| 11 | metrics-server resolution | built-in `--metric-resolution` default 60 s | official manifest and Helm chart: 15 s |
| 11 | Karpenter trigger condition | Karpenter docs: `Unschedulable=True` | Kubernetes source: `PodScheduled=False`, reason `Unschedulable` |

### Review items this session could not close

docs.aws.amazon.com and kubernetes.io were unreachable from this session for both curl (proxy 403) and WebFetch (DNS failure), so the review's "re-fetch the AWS docs" step could not be done here. What could be closed from other official sources:

| Review item | Status |
|---|---|
| Re-pin to EKS 1.37 | **Done** for Kubernetes (docs main @ `8f6d976`, source `v1.37.1`), using the EKS AMI changelog's 1.37 kubelet version. EKS 1.37 release date, platform version, admission list and add-on versions are **unverified here**. |
| ALB deregistration delay 300 s | **Sourced** from the ELBv2 API model (`draining` → `unused`, range 0–3600 s). |
| ALB cross-zone default | **Sourced** from the ELBv2 API model: on for ALBs at the load balancer level; the target group default is `use_load_balancer_configuration`. |
| Target `initial` state | **Sourced** from the ELBv2 API model enums and reason codes. |
| LBC pin | **Kept** at v3.6.2 (latest tag). The pinned EKS install guide names v2.14.1. |
| `X-Forwarded-For` | **Unverified**: only on the ALB user guide pages. |
| Pod Identity trust-policy `Condition` | **Unverified**: the EKS guide includes it from a snippet that is not in the source repo. |
| Karpenter details | **Sourced** from Karpenter v1.15.1 docs and code (NodePool `requirements`/`limits`, NodeClaim conditions, consolidation and budgets). |
| Deploy-time error code (502 vs 503) | **Unverified**: lesson 8 says "5xx". |

### Next steps

1. From a session that can reach docs.aws.amazon.com, check the items marked unverified above and in each lesson. Start with the EKS 1.37 admission list and add-on versions, then `X-Forwarded-For` and the Pod Identity `Condition`.
2. When the engine prep lands, map this plan to the new schema: topic layout → node positions; state panels; steps; records with `wire`; replay.
3. Before writing lesson data, re-run the link check (635 `blob` URLs resolved on 2026-11-04) and re-read each range against its fact.

