---
last-verified: 2026-11-03
sources: [https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/versioning/kubernetes-versions.adoc, https://github.com/kubernetes/website/tree/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs]
---

# EKS and Kubernetes lessons: content plan

Research only. This is the content plan for the `eks` topic, to be turned into lesson data after the owner reviews the engine and schema redesign. It follows the lesson format in `docs/ARCHITECTURE.md` (nodes, `move`/`mutate` steps, facts, records, sources, self-check) and the required screens in `docs/DESIGN.md` (layer selector, event log, decoder). It is written as Markdown so the redesign can change field names freely.

## Version pins

Checked on 2026-11-03.

| Product | Pinned | How it was checked |
|---|---|---|
| Kubernetes | **1.36** (source at tag `v1.36.2`) | In the pinned EKS guide, 1.36 is the newest of the three standard-support versions (1.36, 1.35, 1.34). Its latest platform version is `1.36.2` / `eks.10` (2026-08-17). Upstream already has `v1.37.2`, and kubernetes/website `main` documents v1.37. EKS 1.37 is not in the pinned guide snapshot (see Open questions). |
| Kubernetes docs | kubernetes/website branch `release-1.36` @ `1de955e` | `hugo.toml` on `main` lists `v1.37` as latest. `release-1.36` is the 1.36 docs. |
| Amazon EKS User Guide | awsdocs/amazon-eks-user-guide @ `8d43223` (last commit 2026-09-16) | The guide's own source repository. Rendered docs.aws.amazon.com pages carry no version, so the commit SHA is the pin. |
| Amazon VPC CNI | `v1.23.1` | EKS add-on version `v1.23.1-eksbuild.1` for Kubernetes 1.36 in `managing-vpc-cni.adoc`. |
| kube-proxy add-on | `v1.36.0-eksbuild.21` | `managing-kube-proxy.adoc` |
| CoreDNS add-on | `v1.14.3-eksbuild.16` | `managing-coredns.adoc` |
| AWS Load Balancer Controller | `v3.6.2` (latest tag, 2026-10-24) | The pinned EKS install page still names v2.14.1 (see Open questions). |
| Karpenter (AWS provider) | `v1.15.1` | Latest tag. Docs are `website/content/en/docs` at that tag. |
| Cluster Autoscaler | `cluster-autoscaler-1.36.1` | Latest 1.36 patch tag (minor matches Kubernetes). |
| metrics-server | `v0.9.1` | Latest tag. |
| amazon-eks-pod-identity-webhook | `master` @ `52496af` | No recent release tags, so the commit SHA is the pin. |
| eks-pod-identity-agent | [`v0.2.7`](https://github.com/aws/eks-pod-identity-agent/tree/v0.2.7) (commit `8d2046f`) | Latest tag. Which agent version the EKS 1.36 add-on ships is unverified. |
| AWS IAM Authenticator | [`v0.7.24`](https://github.com/kubernetes-sigs/aws-iam-authenticator/tree/v0.7.24) | Token format reference for lesson 2. Which version EKS runs is unverified. |
| amazon-eks-ami (`nodeadm`) | [`v20261031`](https://github.com/awslabs/amazon-eks-ami/tree/v20261031) | Latest AMI release tag; max-Pods code for lesson 3. |
| CNI spec | [`spec-v0.4.0`](https://github.com/containernetworking/cni/tree/spec-v0.4.0) | The `cniVersion` in the VPC CNI `10-aws.conflist`. |
| aws-sdk-go-v2 `service/ec2` | [`v1.321.0`](https://github.com/aws/aws-sdk-go-v2/tree/service/ec2/v1.321.0) | Version in VPC CNI v1.23.1 `go.mod`. Its generated types stand in for the EC2 API reference. |
| aws-sdk-go-v2 `service/sts`, `service/eksauth` | [`sts v1.51.6`](https://github.com/aws/aws-sdk-go-v2/tree/service/sts/v1.51.6), [`eksauth v1.23.1`](https://github.com/aws/aws-sdk-go-v2/tree/service/eksauth/v1.23.1) | Generated API models for `AssumeRoleWithWebIdentity` and `AssumeRoleForPodIdentity` fields. |
| AWS SDK for Java v2 | [`2.57.8`](https://github.com/aws/aws-sdk-java-v2/tree/2.57.8) | Default credential provider chain order (lesson 5). Java was chosen as the owner's likely backend stack. |

Every source below links to one of these pins with a line anchor checked in a local clone. Following decision 0004, the `version` string names the product and pin.

**Source access in this session.** kubernetes.io and docs.aws.amazon.com were blocked by the session's network policy (proxy 403). Every fact was checked in the official source repositories instead: the kubernetes/website markdown, the awsdocs EKS guide AsciiDoc, and code at release tags. The AWS service API references (EC2, STS, EKS Auth) have no such repository, so field names that only appear there are marked unverified.

## Lessons and order

Ordered by value for senior backend interviews. Each lesson covers one mechanism.

| # | id | Mechanism | Why this position |
|---|---|---|---|
| 1 | `cluster-architecture` | Managed control plane ↔ cross-account ENI ↔ node join and heartbeat; compute options | The base every other lesson assumes; "where does EKS run and what does AWS manage" is the opening interview question. |
| 2 | `apply-to-pod` | `kubectl apply` → authn/authz/admission → etcd → controllers → scheduler → kubelet → CRI → CNI | The most-asked Kubernetes internals question. |
| 3 | `vpc-cni` | ENI, secondary IP and prefix assignment by ipamd; max Pods | EKS-specific and tied to real outages (IP exhaustion). |
| 4 | `service-traffic` | ClusterIP via kube-proxy iptables; ALB target type `ip` vs `instance` | Every backend engineer ships behind a Service and an ALB. |
| 5 | `pod-iam` | IRSA vs EKS Pod Identity credential flow | Security question that separates EKS users from operators. |
| 6 | `autoscaling` | HPA → Pending Pods → Karpenter (vs Cluster Autoscaler) | Capacity and cost question; builds on lessons 2 and 3. |

## Shared conventions

- **Node ids** are reused across lessons so a learner recognizes the same actor: `dev`, `apiserver`, `etcd`, `scheduler`, `kcm`, `xeni`, `node`, `kubelet`, `containerd`, `cni`, `pod`, `kubeproxy`, `coredns`, `alb`, `lbc`, `iam`, `sts`, `ec2api`, `metrics`, `hpa`, `karpenter`, `ca`.
- **Node kinds** use the current five (`client`, `container`, `framework`, `app`, `storage`). AWS services (EKS API, EC2 API, IAM, STS, ELB, Route 53) fit none of them well, so they are marked "proposed kind: cloud" (see Open questions).
- **Layer selector values** (one per node): `AWS` (VPC, EC2, IAM, ELB), `Control plane`, `Node` (kubelet, containerd, CNI, kube-proxy), `Workload` (Pods, app code).
- **Event-log `layer` column** is the protocol or mechanism: `HTTPS REST`, `etcd v3 gRPC`, `CRI gRPC`, `CNI exec`, `EC2 API`, `netfilter`, `AWS STS`, and so on.
- **Sizes and durations** in event-log rows are illustrative and tagged E.G. unless a source states them. No timing is presented as fact without a source.
- **E.G.** marks per-run values (names, IDs, IPs, hashes, timestamps) in records.

## Lesson 1 — `cluster-architecture`: EKS control plane과 worker node가 연결되는 방식

**Goal.** AWS가 운영하는 control plane(API server, etcd, scheduler, controller manager)이 고객 VPC 안의 node와 cross-account ENI로 연결되고, node가 join해서 heartbeat를 보내기까지를 따라갑니다.

**Interview questions it answers.**
- EKS control plane은 어디서 돌고, 고객이 관리하는 부분과 AWS가 관리하는 부분의 경계는 어디인가?
- API server와 etcd는 몇 개이고 AZ에 어떻게 퍼져 있나? etcd가 홀수 개인 이유는?
- private subnet에 있는 node에 `kubectl logs`/`exec`가 어떤 경로로 닿나?
- endpoint public/private 설정에 따라 node → API server 트래픽 경로가 어떻게 바뀌나?
- node가 죽으면 언제 `NotReady`가 되고, Pod는 언제 다른 node로 옮겨지나?
- managed node group, Fargate, Karpenter, EKS Auto Mode는 무엇이 다르고 언제 쓰나?

### Nodes
| id | label / sublabel | kind | layer | appears at step | isometric illustration idea |
|---|---|---|---|---|---|
| dev | Developer / `aws eks create-cluster` | client | AWS | 1.1 | 노트북 + 터미널 창 |
| eksapi | EKS API / `eks.<region>.amazonaws.com` | framework (proposed kind: cloud) | AWS | 1.1 | 구름 위의 AWS 콘솔 패널 |
| apiserver | kube-apiserver ×2+ | framework | Control plane | 1.2 | AWS 소유 영역(점선 울타리) 안의 서버 랙 두 대, AZ 라벨 a/b |
| etcd | etcd ×3 | storage | Control plane | 1.2 | 세 AZ에 하나씩 놓인 원통 세 개, 리더 하나에 왕관 |
| scheduler | kube-scheduler | framework | Control plane | 1.4 | 서류를 분류하는 책상, 깃발(leader) |
| kcm | kube-controller-manager | framework | Control plane | 1.4 | 여러 개의 다이얼이 달린 제어반, 깃발(leader) |
| xeni | Cross-account ENI ×2–4 / `Amazon EKS my-cluster` | container (proposed kind: cloud) | AWS | 1.5 | 고객 VPC 벽에 꽂힌 랜카드, 케이블이 AWS 영역으로 이어짐 |
| clustersg | Cluster security group / `eks-cluster-sg-…` | container (proposed kind: cloud) | AWS | 1.6 | ENI와 node를 둘러싼 방패 |
| r53 | Route 53 private hosted zone | framework (proposed kind: cloud) | AWS | 1.7 | 이정표 표지판 |
| asg | Managed node group / EC2 Auto Scaling group | container (proposed kind: cloud) | AWS | 1.8 | 같은 모양 서버 여러 대가 겹친 스택 |
| node | EC2 worker node / AL2023 `nodeadm` | container | Node | 1.8 | 아이소메트릭 EC2 박스, 측면에 AZ 라벨 |
| kubelet | kubelet | container | Node | 1.9 | node 박스 위의 작은 선장 아이콘 |
| compute | Compute options | framework | AWS | 1.14 | 네 칸 선반: MNG / Fargate / Karpenter / Auto Mode |

### State panels
| node | title | view | initial content |
|---|---|---|---|
| apiserver | control plane 인스턴스 (AZ별) | table: 구성요소 · AZ-a · AZ-b · AZ-c | 비어 있음 |
| etcd | etcd members | table: member · AZ · role | 비어 있음 |
| xeni | 고객 subnet의 EKS ENI | table: ENI · subnet/AZ · description · 용도 | 비어 있음 |
| node | Node 객체 (`kubectl get node`) | table: field · value | 비어 있음 |
| compute | compute 옵션 비교 | table: 옵션 · 누가 node를 관리 · 단위 · 제약 | 비어 있음 |

### Steps

#### 1.1 `create-cluster` — 클러스터 생성 요청 · `move` dev → eksapi, token `request`: `CreateCluster`
- **Subtitle:** subnet 두 개 이상(서로 다른 AZ)과 endpoint 설정을 담아 EKS API를 호출합니다.
- **Prose:**
  > `aws eks create-cluster`는 Kubernetes API가 아니라 AWS의 EKS API를 부릅니다.
  > 요청에는 VPC의 subnet과 security group, endpoint 공개 여부가 들어갑니다.
  > subnet은 최소 두 개이고 서로 다른 Availability Zone에 있어야 합니다.
  > 이 subnet들이 나중에 control plane의 ENI가 놓일 자리입니다.
- **Facts:**
  | key | value |
  |---|---|
  | subnet 최소 개수 | 2개, 서로 다른 AZ |
  | subnet당 EKS용 IP | 최소 6개, 권장 16개 |
  | endpoint 기본값 | public 접근 허용 (`endpointPublicAccess: true`) |
- **Event log:** `dev → eksapi · HTTPS (AWS API) · CreateCluster name=my-cluster · E.G. ~1 KB`
- **Record:** R1
- **Sources:**
  - [Network requirements: at least two subnets in different AZs](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/network-reqs.adoc#L13) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [Subnet requirements: six IPs, 16 recommended, two AZs](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/network-reqs.adoc#L78-L79) — Amazon EKS User Guide @ 8d43223
  - [Cluster endpoint: public by default](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/cluster-endpoint.adoc#L15) — Amazon EKS User Guide @ 8d43223

#### 1.2 `control-plane-up` — AWS 영역에 control plane이 뜸 · `mutate` apiserver
- **Subtitle:** 클러스터마다 전용 control plane이 세 AZ에 걸쳐 만들어집니다.
- **Prose:**
  > EKS는 클러스터마다 별도의 control plane을 만들고, 다른 클러스터나 계정과 공유하지 않습니다.
  > API server는 최소 두 개, etcd는 세 개가 한 Region의 세 AZ에 나뉘어 배치됩니다.
  > 인스턴스가 고장 나면 EKS가 교체하며, 필요하면 다른 AZ에 다시 띄웁니다.
  > 이 영역은 AWS 책임입니다. 고객은 control plane node에 접속할 수 없습니다.
- **Facts:**
  | key | value |
  |---|---|
  | API server 인스턴스 | 최소 2개 |
  | etcd 인스턴스 | 3개, 3개 AZ |
  | 책임 경계 | control plane node와 `etcd` = AWS 책임 (shared responsibility) |
  | 기본 운영 모드 | Standard mode (부하에 따라 자동 확장) |
- **Event log:** `eksapi → apiserver · internal · provision control plane · duration unverified`
- **State:** before: 빈 표 → after: `kube-apiserver | ● | ● | (최소 2개, 배치 AZ unverified)`; etcd 행은 1.3에서.
- **Sources:**
  - [Control plane: at least two API server instances and three etcd instances across three AZs](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/what-is/eks-architecture.adoc#L18-L37) — Amazon EKS User Guide @ 8d43223
  - [Security of the cloud: control plane nodes and etcd are AWS's responsibility](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/security/security.adoc#L18) — Amazon EKS User Guide @ 8d43223
  - [Standard mode is the default control plane mode](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/eks-provisioned-control-plane-introduction.adoc#L20) — Amazon EKS User Guide @ 8d43223

#### 1.3 `etcd-quorum` — etcd 3개와 quorum · `mutate` etcd
- **Subtitle:** etcd는 홀수 개로 돌고, 과반이 살아 있어야 쓰기가 됩니다.
- **Prose:**
  > etcd는 클러스터의 모든 객체를 저장하는 key-value store입니다.
  > 홀수 개 member로 구성하고, 과반(3개 중 2개)이 동의해야 쓰기가 확정됩니다.
  > 그래서 3개 AZ 중 하나가 통째로 죽어도 나머지 둘로 계속 씁니다.
  > EKS 1.28 이상은 Kubernetes 객체를 KMS v2 envelope encryption으로 기본 암호화합니다(AWS owned key).
- **Facts:**
  | key | value |
  |---|---|
  | member 수 권장 | 홀수 |
  | 3-member quorum | 2 (1개 장애 허용) |
  | 기본 암호화 | KMS provider v2 + AWS owned key, Kubernetes 1.28 이상 모든 클러스터 |
  | Standard mode DB 크기 | 최대 8 GB (Provisioned 모든 tier 16 GB) |
- **Event log:** `apiserver → etcd · etcd v3 gRPC · member health · E.G.`
- **State:** before: 빈 표 → after: `etcd-a | AZ-a | leader (E.G.)`, `etcd-b | AZ-b | follower`, `etcd-c | AZ-c | follower`
- **Sources:**
  - [Operating etcd: run an odd number of members](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/administer-cluster/configure-upgrade-etcd.md#L29) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Envelope encryption: KMS v2, AWS owned key, default for 1.28+](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/security/envelope-encryption.adoc#L19-L122) — Amazon EKS User Guide @ 8d43223
  - [Standard mode supports up to 8 GB of etcd](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/eks-provisioned-control-plane-introduction.adoc#L261) — Amazon EKS User Guide @ 8d43223
  - [Provisioned tiers for EKS 1.34+: 16 GB database](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/eks-provisioned-control-plane-introduction.adoc#L143-L176) — Amazon EKS User Guide @ 8d43223

#### 1.4 `leader-election` — scheduler와 controller manager는 한 개만 active · `mutate` kcm
- **Subtitle:** 여러 인스턴스 중 Lease를 잡은 하나만 일하고 나머지는 대기합니다.
- **Prose:**
  > API server는 여러 개가 동시에 요청을 받지만, `kube-scheduler`와 `kube-controller-manager`는 다릅니다.
  > 둘은 `Lease` 객체로 leader election을 해서 한 인스턴스만 active로 동작합니다.
  > leader가 Lease를 갱신하지 못하면 대기 중이던 인스턴스가 Lease를 가져갑니다.
  > EKS에서 이 컴포넌트가 몇 개 떠 있는지는 공개 문서에 없습니다.
- **Facts:**
  | key | value |
  |---|---|
  | lock 종류 (scheduler) | `leases`, `kube-system` 네임스페이스 |
  | `leaseDuration` 기본값 | 15s |
  | `renewDeadline` 기본값 | 10s |
  | `retryPeriod` 기본값 | 2s |
- **Event log:** `kcm → apiserver · HTTPS REST · PUT leases/kube-controller-manager (renew) · E.G. every 2s`
- **State:** before: `scheduler | standby`, `kcm | standby` → after: `scheduler | leader (holderIdentity E.G.)`, `kcm | leader`
- **Sources:**
  - [Leases: leader election for kube-controller-manager and kube-scheduler](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/architecture/leases.md#L29-L34) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Leader election defaults 15s/10s/2s](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/component-base/config/v1alpha1/defaults.go#L35-L45) — Kubernetes v1.36.2
  - [Scheduler defaults ResourceLock to leases](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/apis/config/v1/defaults.go#L133-L158) — Kubernetes v1.36.2

#### 1.5 `cross-account-eni` — 고객 subnet에 EKS ENI가 꽂힘 · `mutate` xeni
- **Subtitle:** control plane은 고객 VPC에 2–4개의 ENI를 만들어 node와 통신합니다.
- **Prose:**
  > control plane은 AWS 쪽에 있지만, 고객이 지정한 subnet에 ENI를 2–4개 만듭니다.
  > 이 ENI는 requester-managed이고 description에 `Amazon EKS my-cluster`가 적힙니다.
  > `kubectl logs`, `exec`, `port-forward`처럼 kubelet API를 쓰는 기능과 control plane ↔ node 트래픽이 이 ENI를 지납니다.
  > 버전 업그레이드 때 EKS는 기존 ENI를 지우고 새로 만들며, 다른 subnet에 생길 수도 있습니다.
- **Facts:**
  | key | value |
  |---|---|
  | ENI 개수 | 2–4 |
  | description | `Amazon EKS <cluster-name>` |
  | 이 ENI를 쓰는 명령 | `attach`, `cp`, `exec`, `logs`, `port-forward` |
  | 업그레이드 시 | 삭제 후 재생성 (subnet이 바뀔 수 있음) |
- **Event log:** `eksapi → xeni · EC2 API · CreateNetworkInterface ×2 (E.G.) · duration unverified`
- **State:** before: 빈 표 → after: `eni-0a1b… (E.G.) | subnet-a / AZ-a | Amazon EKS my-cluster | kubelet API, node↔CP`, `eni-0c2d… (E.G.) | subnet-b / AZ-b | Amazon EKS my-cluster | 〃`
- **Record:** R2
- **Sources:**
  - [Subnet requirements: 2–4 ENIs, kubelet API, description](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/network-reqs.adoc#L65-L69) — Amazon EKS User Guide @ 8d43223

#### 1.6 `cluster-sg` — cluster security group · `mutate` clustersg
- **Subtitle:** EKS ENI와 node가 같은 security group 안에서 서로를 허용합니다.
- **Prose:**
  > EKS는 `eks-cluster-sg-my-cluster-<id>` security group을 만들어 ENI에 붙입니다.
  > 기본 규칙은 같은 그룹(self)에서 오는 모든 inbound와 모든 outbound를 허용합니다.
  > 포트를 좁히려면 최소한 443(API), 10250(kubelet), 53(DNS)을 열어 두어야 합니다.
  > 이 그룹은 kubelet API와 private endpoint 접근을 제어하고, public endpoint에는 영향이 없습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 이름 | `eks-cluster-sg-<cluster>-<uniqueID>` |
  | 기본 inbound | All / source = self |
  | 최소 outbound | TCP 443, TCP 10250, TCP·UDP 53 → cluster SG |
  | self 규칙 삭제 시 | 클러스터 업데이트 때 EKS가 다시 만듦 |
- **Event log:** `eksapi → clustersg · EC2 API · CreateSecurityGroup + AuthorizeSecurityGroupIngress · E.G.`
- **State:** before: — → after: `inbound All from self`, `outbound All to 0.0.0.0/0`, `outbound All to self (EFA)`
- **Sources:**
  - [Default cluster security group rules](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/sec-group-reqs.adoc#L16-L53) — Amazon EKS User Guide @ 8d43223
  - [Restricting cluster traffic: minimum rules 443/10250/53](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/sec-group-reqs.adoc#L95-L122) — Amazon EKS User Guide @ 8d43223
  - [Cluster security group controls kubelet API and private endpoint](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/cluster-endpoint.adoc#L142) — Amazon EKS User Guide @ 8d43223

#### 1.7 `endpoint-access` — public / private endpoint · `mutate` r53
- **Subtitle:** private access를 켜면 VPC 안의 요청은 EKS ENI로 갑니다.
- **Prose:**
  > 기본은 public endpoint만 켜진 상태이고, IAM과 RBAC로 접근을 막습니다.
  > private access를 켜면 EKS가 관리하는 Route 53 private hosted zone이 VPC에 붙습니다.
  > 그러면 VPC 안에서는 endpoint 이름이 EKS ENI의 private IP로 풀리고, node ↔ API server 트래픽이 VPC 밖으로 나가지 않습니다.
  > private만 켜면 인터넷에서는 API server에 닿을 수 없습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 기본값 | public on, private off |
  | private on 요구사항 | VPC `enableDnsHostnames`, `enableDnsSupport` = true, DHCP에 `AmazonProvidedDNS` |
  | public + private | VPC 내부 요청은 private endpoint 사용, cluster SG로 제어 |
  | public access CIDRs | public endpoint에만 적용 |
- **Event log:** `node → r53 · DNS · A? <id>.<x>.<region>.eks.amazonaws.com → xeni private IP · E.G.`
- **State:** before: `endpointPublicAccess=true, endpointPrivateAccess=false` → after: `endpointPublicAccess=true, endpointPrivateAccess=true, VPC 내부 = ENI IP`
- **Record:** R1 (resourcesVpcConfig 필드)
- **Sources:**
  - [Cluster private endpoint: Route 53 private hosted zone, DNS requirements](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/cluster-endpoint.adoc#L69-L81) — Amazon EKS User Guide @ 8d43223
  - [Endpoint access combinations](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/cluster-endpoint.adoc#L95-L132) — Amazon EKS User Guide @ 8d43223

#### 1.8 `node-launch` — managed node group이 EC2를 띄움 · `move` asg → node, token `data`: `user data (NodeConfig)`
- **Subtitle:** node는 고객 계정의 Auto Scaling group 안에서 뜨고, `nodeadm`이 클러스터 정보를 받습니다.
- **Prose:**
  > managed node group의 node는 EKS가 관리해 주는 EC2 Auto Scaling group 안에 생깁니다. 인스턴스와 ASG는 모두 고객 계정에 있습니다.
  > capacity type을 지정하지 않으면 On-Demand이고, node에 `eks.amazonaws.com/capacityType: ON_DEMAND` label이 붙습니다.
  > AL2023 AMI에서는 `nodeadm`이 `NodeConfig`를 읽어 kubelet을 설정합니다.
  > `apiServerEndpoint`, `certificateAuthority`, service `cidr`가 필수입니다.
- **Facts:**
  | key | value |
  |---|---|
  | 소속 | EKS가 관리하는 EC2 Auto Scaling group (고객 계정) |
  | 기본 capacity type | On-Demand (`allocation strategy: prioritized`) |
  | EKS label prefix | `eks.amazonaws.com/` |
  | `NodeConfig` 필수 필드 | `apiServerEndpoint`, `certificateAuthority`, `cidr` |
- **Event log:** `asg → node · EC2 API · RunInstances (launch template) · duration unverified`
- **Record:** R3
- **Sources:**
  - [Managed node groups: ASG in your account](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/managed-node-groups.adoc#L27) — Amazon EKS User Guide @ 8d43223
  - [Capacity types: On-Demand default, capacityType label](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/managed-node-groups.adoc#L85-L88) — Amazon EKS User Guide @ 8d43223
  - [AL2023 nodeadm NodeConfig required fields](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/al2023.adoc#L24-L37) — Amazon EKS User Guide @ 8d43223

#### 1.9 `node-authn` — kubelet이 node IAM role로 인증 · `move` kubelet → apiserver, token `request`: `POST /api/v1/nodes`
- **Subtitle:** node IAM role의 access entry가 kubelet을 `system:node:<private DNS>` 사용자로 만듭니다.
- **Prose:**
  > kubelet은 node의 IAM role 자격 증명으로 API server에 인증합니다.
  > access entry type이 `EC2_LINUX`이면 EKS는 이 role을 Kubernetes 사용자 `system:node:{{EC2PrivateDNSName}}`로 바꿉니다.
  > 이 type에는 Kubernetes group이나 access policy를 붙일 수 없습니다.
  > 인증 방식은 클러스터의 `authenticationMode`(`API`, `API_AND_CONFIG_MAP`, `CONFIG_MAP`)가 정합니다.
- **Facts:**
  | key | value |
  |---|---|
  | access entry type (self-managed Linux node) | `EC2_LINUX` |
  | Kubernetes username | `system:node:{{EC2PrivateDNSName}}` |
  | Fargate type / username | `FARGATE_LINUX` / `system:node:{{SessionName}}` |
  | type 미지정 시 | `STANDARD` |
- **Event log:** `kubelet → apiserver · HTTPS REST · POST /api/v1/nodes (Authorization: Bearer k8s-aws-v1.… E.G.) · E.G. ~3 KB`
- **Record:** R4
- **Sources:**
  - [Access entry types and generated usernames](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/creating-access-entries.adoc#L18-L62) — Amazon EKS User Guide @ 8d43223
  - [EC2_LINUX entries take no groups or access policies](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/creating-access-entries.adoc#L107-L114) — Amazon EKS User Guide @ 8d43223
  - [Authentication modes API / API_AND_CONFIG_MAP](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/setting-up-access-entries.adoc#L8-L32) — Amazon EKS User Guide @ 8d43223

#### 1.10 `node-register` — Node 객체 등록 · `mutate` node
- **Subtitle:** kubelet은 기본적으로 스스로 Node 객체를 만듭니다.
- **Prose:**
  > kubelet 플래그 `--register-node`의 기본값은 true라서, kubelet이 직접 Node 객체를 만듭니다.
  > Node 이름은 EC2 private DNS 이름이고, label에 AZ와 instance type이 들어갑니다.
  > 처음에는 CNI가 준비되기 전이라 `Ready=False`일 수 있습니다.
  > 이 객체는 API server를 거쳐 etcd의 `/registry/minions/<name>`에 저장됩니다.
- **Facts:**
  | key | value |
  |---|---|
  | `--register-node` 기본값 | true |
  | 인증 정보 | `--kubeconfig` 경로의 credential |
  | etcd key | `/registry/minions/<node-name>` (nodes만 compiled-in prefix `minions`) |
- **Event log:** `apiserver → etcd · etcd v3 gRPC · Txn PUT /registry/minions/ip-10-0-1-23.ec2.internal (E.G.) · E.G. ~4 KB`
- **State:** before: 빈 표 → after: `name | ip-10-0-1-23.ec2.internal (E.G.)`, `topology.kubernetes.io/zone | us-east-2a (E.G.)`, `eks.amazonaws.com/capacityType | ON_DEMAND`, `Ready | False → True`
- **Record:** R5
- **Sources:**
  - [Self-registration of Nodes: --register-node default true](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/architecture/nodes.md#L87-L99) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [SpecialDefaultResourcePrefixes: nodes → `minions`](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubeapiserver/default_storage_factory_builder.go#L45-L53) — Kubernetes v1.36.2 (EKS keeping the upstream `/registry` prefix is unverified; see Lesson 2)

#### 1.11 `heartbeat` — Lease로 10초마다 heartbeat · `move` kubelet → apiserver, token `data`: `PUT lease`
- **Subtitle:** kubelet은 `kube-node-lease`의 Lease를 10초마다 갱신하고, status는 바뀔 때 또는 5분마다 보냅니다.
- **Prose:**
  > heartbeat는 두 가지입니다. Node `.status` 업데이트와 `kube-node-lease` 네임스페이스의 Lease 갱신입니다.
  > Lease는 작은 객체라서 큰 클러스터에서도 부담이 적습니다. kubelet은 10초마다 `spec.renewTime`을 갱신합니다.
  > `.status`는 변화가 있을 때 바로, 변화가 없으면 기본 5분마다 보냅니다.
  > Lease 갱신이 실패하면 200ms에서 시작해 최대 7초까지 지수 backoff로 재시도합니다.
- **Facts:**
  | key | value |
  |---|---|
  | Lease 갱신 주기 | 10s |
  | `nodeLeaseDurationSeconds` 기본값 | 40 |
  | `nodeStatusReportFrequency` 기본값 | 5m |
  | 재시도 backoff | 200ms 시작, 최대 7s |
- **Event log:** `kubelet → apiserver · HTTPS REST · PUT /apis/coordination.k8s.io/v1/namespaces/kube-node-lease/leases/<node> · E.G. ~0.5 KB, every 10s`
- **Record:** R6
- **Sources:**
  - [Node heartbeats: status and Lease](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/architecture/nodes.md#L188-L199) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Heartbeats: 5 minutes, 10 seconds, backoff](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/node/node-status.md#L144-L157) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [KubeletConfiguration nodeStatusReportFrequency 5m, nodeLeaseDurationSeconds 40](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/kubelet/config/v1beta1/types.go#L338-L357) — Kubernetes v1.36.2

#### 1.12 `kubelet-api` — `kubectl logs`가 node에 닿는 길 · `move` apiserver → kubelet (via xeni), token `request`: `GET /containerLogs/...`
- **Subtitle:** API server가 EKS ENI를 통해 node의 kubelet 10250 포트로 들어갑니다.
- **Prose:**
  > `kubectl logs`는 개발자 → API server까지만 가고, 그다음은 API server가 kubelet에 직접 요청합니다.
  > control plane은 AWS 쪽에 있으므로 이 요청은 고객 subnet의 EKS ENI에서 node로 나갑니다.
  > 그래서 node가 private subnet에 있어도 `logs`, `exec`가 동작합니다.
  > cluster security group이 10250을 막으면 이 기능이 깨집니다.
- **Facts:**
  | key | value |
  |---|---|
  | kubelet API 포트 | TCP 10250 |
  | 경로 | API server → EKS ENI → node |
  | 제어 | cluster security group |
- **Event log:** `apiserver → kubelet · HTTPS (kubelet API) · GET /containerLogs/default/web-0/app (E.G.) · E.G. streamed`
- **Sources:**
  - [EKS ENIs carry kubelet API connections for exec/logs](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/network-reqs.adoc#L65) — Amazon EKS User Guide @ 8d43223
  - [Minimum rule TCP 10250](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/sec-group-reqs.adoc#L95-L122) — Amazon EKS User Guide @ 8d43223
  - kubelet API path `/containerLogs/...` — **unverified** (needs pkg/kubelet/server at v1.36.2)

#### 1.13 `node-failure` — node가 응답하지 않을 때 · `mutate` node
- **Subtitle:** 50초 동안 소식이 없으면 `Ready=Unknown`, 그 뒤 5분이 지나면 Pod eviction이 시작됩니다.
- **Prose:**
  > node controller는 5초마다 각 node 상태를 확인합니다.
  > `node-monitor-grace-period`(기본 50초) 동안 heartbeat가 없으면 `Ready` 조건을 `Unknown`으로 바꾸고 `node.kubernetes.io/unreachable` taint를 붙입니다.
  > Pod에는 기본으로 이 taint에 대한 `tolerationSeconds=300` toleration이 붙어 있어서, 5분 뒤에 eviction됩니다.
  > eviction 속도는 기본 초당 0.1 node(10초에 node 하나)로 제한됩니다.
- **Facts:**
  | key | value |
  |---|---|
  | `--node-monitor-period` | 5s |
  | `node-monitor-grace-period` | 50s (v1.36.2 기본값) |
  | 기본 toleration | `not-ready`, `unreachable`, `tolerationSeconds=300` |
  | `--node-eviction-rate` | 0.1 /s |
- **Event log:** `kcm → apiserver · HTTPS REST · PATCH node status Ready=Unknown + taint unreachable · E.G.`
- **State:** before: `Ready | True` → after: `Ready | Unknown`, `taints | node.kubernetes.io/unreachable:NoExecute`
- **Sources:**
  - [Node controller: 5 minutes before eviction, checks every 5 seconds, eviction rate](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/architecture/nodes.md#L201-L236) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Node status Ready: node-monitor-grace-period default 50 seconds](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/node/node-status.md#L47) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [NodeMonitorGracePeriod default 50s in source](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/nodelifecycle/config/v1alpha1/defaults.go#L40-L49) — Kubernetes v1.36.2
  - [Taint based evictions: tolerationSeconds=300](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/scheduling-eviction/taint-and-toleration.md#L340-L348) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 1.14 `compute-options` — node를 누가 관리하나 · `mutate` compute
- **Subtitle:** managed node group, Fargate, Karpenter, Auto Mode는 data plane 책임을 나누는 방식이 다릅니다.
- **Prose:**
  > managed node group: EKS가 ASG와 업데이트, drain을 대신하지만 인스턴스는 고객 계정에 있습니다.
  > Fargate: Pod 하나가 VM 하나에서 돌고 kernel, CPU, 메모리, ENI를 다른 Pod와 공유하지 않습니다. DaemonSet과 privileged container는 쓸 수 없습니다.
  > Karpenter: 고객이 설치·운영하는 오픈소스 autoscaler이고, AWS SLA가 없습니다.
  > Auto Mode: Karpenter 기반으로 AWS가 node까지 관리합니다. Bottlerocket 기반 EC2 managed instance, 최대 수명 21일, SSH/SSM 불가입니다.
- **Facts:**
  | key | value |
  |---|---|
  | MNG drain 제한 | scale-in/`AZRebalance` 때 PDB 미준수, 15분 후 강제 종료 |
  | Fargate 메모리 | Pod 요청 + 256 MB (kubelet, kube-proxy, containerd), 기본 0.25 vCPU / 0.5 GB |
  | Karpenter | 고객 관리, AWS SLA 없음 |
  | Auto Mode node 최대 수명 | 21일 (줄일 수 있음) |
- **Event log:** `— · comparison · (no message)`
- **State:** before: 빈 표 → after: 4행 (`MNG | EKS(ASG) | EC2 | PDB 15분` / `Fargate | AWS | Pod당 VM | DaemonSet·privileged·GPU·EBS 불가` / `Karpenter | 고객 | NodeClaim→EC2 | SLA 없음` / `Auto Mode | AWS | EC2 managed instance | 21일, SSH/SSM 불가`)
- **Sources:**
  - [Compute options overview](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/what-is/eks-architecture.adoc#L39-L64) — Amazon EKS User Guide @ 8d43223
  - [MNG: drains, PDB not respected on scale-in after 15 minutes](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/managed-node-groups.adoc#L63-L67) — Amazon EKS User Guide @ 8d43223
  - [Fargate considerations: own compute boundary, no DaemonSets, no privileged](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/fargate.adoc#L15-L36) — Amazon EKS User Guide @ 8d43223
  - [Fargate Pod CPU and memory: +256 MB, smallest 0.25 vCPU / 0.5 GB](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/fargate-pod-configuration.adoc#L23-L38) — Amazon EKS User Guide @ 8d43223
  - [Karpenter is customer-managed, no AWS SLA](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/autoscaling.adoc#L36) — Amazon EKS User Guide @ 8d43223
  - [Auto Mode: 21-day lifetime, no SSH/SSM, Karpenter-based, EC2 managed instances](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/automode/automode.adoc#L37-L102) — Amazon EKS User Guide @ 8d43223

#### 1.15 `control-plane-egress` — API server가 webhook을 부를 때 · `move` apiserver → xeni, token `call`: `AdmissionReview`
- **Subtitle:** 기본은 AWS가 egress 경로를 관리하고, `CUSTOMER_ROUTED`이면 고객 VPC의 EKS ENI로 나갑니다.
- **Prose:**
  > API server는 admission webhook이나 외부 OIDC provider를 호출해야 할 때가 있습니다.
  > 기본 모드 `AWS_MANAGED`에서는 EKS가 이 egress 경로를 관리합니다.
  > `CUSTOMER_ROUTED`에서는 기존 EKS ENI를 통해 고객 VPC로 나가고, NAT gateway 같은 경로와 security group은 고객 책임입니다.
  > 경로가 잘못되면 webhook 호출과 OIDC 인증이 실패합니다.
- **Facts:**
  | key | value |
  |---|---|
  | 기본 모드 | `AWS_MANAGED` |
  | 대안 | `CUSTOMER_ROUTED` (별도 ENI를 만들지 않고 기존 ENI 사용) |
  | 필요 outbound | 예: 443 (webhook, OIDC) |
- **Event log:** `apiserver → xeni · HTTPS · POST AdmissionReview to webhook (E.G.) · E.G. ~2 KB`
- **Sources:**
  - [Egress routing modes AWS_MANAGED / CUSTOMER_ROUTED](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/control-plane-egress.adoc#L17-L48) — Amazon EKS User Guide @ 8d43223

### Decoder records

#### R1. `DescribeCluster` 응답 (step 1.1, 1.7) — layer bar: identity · resourcesVpcConfig · kubernetesNetworkConfig · auth/oidc · status
```json
{
  "cluster": {
    "name": "my-eks-cluster",
    "version": "1.36",
    "endpoint": "https://JSA79429HJDASKJDJ8223829MNDNASW.yl4.us-east-2.eks.amazonaws.com",
    "resourcesVpcConfig": {
      "subnetIds": ["subnet-0fb75d2d8401716e7", "subnet-02184492f67a3d0f9"],
      "securityGroupIds": ["sg-0c1327f6270afbb36"],
      "clusterSecurityGroupId": "sg-01c84d09d70f39a7f",
      "vpcId": "vpc-0012b8e1cc0abb17d",
      "endpointPublicAccess": true,
      "endpointPrivateAccess": true,
      "publicAccessCidrs": ["22.19.18.2/32"]
    },
    "kubernetesNetworkConfig": { "serviceIpv4Cidr": "10.100.0.0/16", "ipFamily": "ipv4" },
    "identity": { "oidc": { "issuer": "https://oidc.eks.us-east-2.amazonaws.com/id/JSA79429HJDASKJDJ8223829MNDNASW" } },
    "status": "ACTIVE",
    "certificateAuthority": { "data": "CA_DATA_STRING..." },
    "platformVersion": "eks.10",
    "accessConfig": { "authenticationMode": "API_AND_CONFIG_MAP" }
  }
}
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `version` | `1.36` | Kubernetes minor version | |
| `endpoint` | `https://<id>.yl4.us-east-2.eks.amazonaws.com` | API server endpoint (public/private 공용 이름) | E.G. |
| `resourcesVpcConfig.subnetIds` | 2개 이상 | EKS ENI가 놓일 수 있는 subnet | E.G. |
| `resourcesVpcConfig.clusterSecurityGroupId` | `sg-01c8…` | EKS가 만든 cluster SG | E.G. |
| `resourcesVpcConfig.endpointPublicAccess` / `endpointPrivateAccess` | `true` / `true` | endpoint 접근 모드 | |
| `resourcesVpcConfig.publicAccessCidrs` | `22.19.18.2/32` | public endpoint 허용 CIDR | E.G. |
| `kubernetesNetworkConfig.serviceIpv4Cidr` | `10.100.0.0/16` | Service ClusterIP 대역 | E.G. |
| `identity.oidc.issuer` | `https://oidc.eks.<region>.amazonaws.com/id/<id>` | IRSA용 OIDC issuer (Lesson 5) | E.G. |
| `certificateAuthority.data` | base64 | kubeconfig와 `NodeConfig`의 CA | E.G. |
| `platformVersion` | `eks.10` | EKS 1.36.2 최신 platform version (pinned guide 기준) | |
| `accessConfig.authenticationMode` | `API_AND_CONFIG_MAP` | access entry + `aws-auth` 둘 다 사용 | E.G. |

Sources: [DescribeCluster example response](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/eks-provisioned-control-plane-getting-started.adoc#L129-L215) — Amazon EKS User Guide @ 8d43223 (the example shows `version: 1.26` and `platformVersion: eks.14`; the record above swaps in 1.36 / `eks.10` from the [platform versions table](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/versioning/platform-versions.adoc#L41-L56)). The `controlPlaneScalingConfig` field appears only for Provisioned mode in that example.

#### R2. EKS가 만든 ENI (step 1.5) — layer bar: identity · placement · ownership
```text
NetworkInterfaceId : eni-0a1b2c3d4e5f60718
Description        : Amazon EKS my-cluster
SubnetId           : subnet-0fb75d2d8401716e7   (us-east-2a)
RequesterManaged   : true
Groups             : sg-01c84d09d70f39a7f (eks-cluster-sg-my-cluster-…)
PrivateIpAddress   : 10.0.1.15
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `Description` | `Amazon EKS my-cluster` | EKS가 만든 ENI 표시 | (cluster 이름만 E.G.) |
| `RequesterManaged` | `true` | 다른 서비스(EKS)가 고객 계정에 만든 ENI | |
| `SubnetId` | 클러스터 subnet 중 하나 | 업그레이드 때 바뀔 수 있음 | E.G. |
| `Groups` | cluster SG | kubelet API / private endpoint 제어 | E.G. |
| `NetworkInterfaceId`, `PrivateIpAddress` | — | per-run 값 | E.G. |

Sources: [network-reqs.adoc L65-L69](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/network-reqs.adoc#L65-L69) — Amazon EKS User Guide @ 8d43223. Field names: [aws-sdk-go-v2 ec2 `NetworkInterface` type](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/types.go#L17120-L17236) — aws-sdk-go-v2 service/ec2 v1.321.0 (generated from the EC2 API model). That EKS's ENIs show `RequesterManaged: true` follows from the guide calling them requester-managed; it was not observed on a live ENI.

#### R3. `NodeConfig` (step 1.8) — layer bar: apiVersion/kind · cluster · kubelet
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
| `apiVersion` | `node.eks.aws/v1alpha1` | nodeadm 설정 스키마 | |
| `spec.cluster.name` | `my-cluster` | 클러스터 이름 | E.G. |
| `spec.cluster.apiServerEndpoint` | DescribeCluster `endpoint` | kubelet이 붙을 API server | E.G. |
| `spec.cluster.certificateAuthority` | base64 CA | API server 인증서 검증 | E.G. |
| `spec.cluster.cidr` | Service CIDR | cluster DNS IP 계산 등에 사용 (용도 **unverified**) | E.G. |

Sources: [al2023.adoc L24-L37](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/al2023.adoc#L24-L37) — Amazon EKS User Guide @ 8d43223

#### R4. node role access entry (step 1.9) — layer bar: principal · type · Kubernetes identity
```text
aws eks create-access-entry --cluster-name my-cluster \
  --principal-arn arn:aws:iam::111122223333:role/EKS-my-cluster-self-managed-ng-1 \
  --type EC2_LINUX
→ Kubernetes username: system:node:ip-10-0-1-23.us-east-2.compute.internal
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `principalArn` | node IAM role ARN | 인증할 IAM principal | E.G. |
| `type` | `EC2_LINUX` | Linux/Bottlerocket self-managed node용 | |
| username | `system:node:{{EC2PrivateDNSName}}` | Node authorizer가 인식하는 이름 | (DNS 이름 E.G.) |

Sources: [creating-access-entries.adoc L18-L62, L107-L114](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/creating-access-entries.adoc#L18-L114) — Amazon EKS User Guide @ 8d43223. Whether managed node groups create this entry automatically: **unverified** in this session.

#### R5. Node 객체 (step 1.10) — layer bar: metadata · spec · status
```yaml
apiVersion: v1
kind: Node
metadata:
  name: ip-10-0-1-23.us-east-2.compute.internal
  labels:
    topology.kubernetes.io/zone: us-east-2a
    node.kubernetes.io/instance-type: m5.large
    eks.amazonaws.com/capacityType: ON_DEMAND
    eks.amazonaws.com/nodegroup: ng-1
status:
  conditions:
  - type: Ready
    status: "True"
    reason: KubeletReady
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.name` | EC2 private DNS | access entry username과 일치 | E.G. |
| `labels[eks.amazonaws.com/capacityType]` | `ON_DEMAND` | MNG capacity type label | |
| `labels[eks.amazonaws.com/nodegroup]` | `ng-1` | MNG 이름 label — label key **unverified** (pinned guide에서 찾지 못함) | E.G. |
| `labels[topology.kubernetes.io/zone]` | `us-east-2a` | AZ | E.G. |
| `status.conditions[Ready]` | `True` | `node-monitor-grace-period` 동안 소식 없으면 `Unknown` | |

Sources: [managed-node-groups.adoc L63, L88](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/managed-node-groups.adoc#L63-L88) — Amazon EKS User Guide @ 8d43223; [node-status.md L47](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/node/node-status.md#L47) — Kubernetes 1.36 docs. `reason: KubeletReady` — **unverified**.

#### R6. Node Lease (step 1.11) — layer bar: metadata · spec
```yaml
apiVersion: coordination.k8s.io/v1
kind: Lease
metadata:
  name: ip-10-0-1-23.us-east-2.compute.internal
  namespace: kube-node-lease
spec:
  holderIdentity: ip-10-0-1-23.us-east-2.compute.internal
  leaseDurationSeconds: 40
  renewTime: "2026-11-03T12:00:10.000000Z"
```
| field | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.namespace` | `kube-node-lease` | node heartbeat 전용 네임스페이스 | |
| `metadata.name` | node 이름 | Node와 같은 이름 | E.G. |
| `spec.leaseDurationSeconds` | `40` | `nodeLeaseDurationSeconds` 기본값 | |
| `spec.renewTime` | 10초마다 갱신 | heartbeat 시각 | E.G. |
| `spec.holderIdentity` | node 이름 | **unverified** | E.G. |

Sources: [leases.md L22-L28](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/architecture/leases.md#L22-L28) — Kubernetes 1.36 docs; [kubelet types.go L348-L357](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/kubelet/config/v1beta1/types.go#L348-L357) — Kubernetes v1.36.2

### Self-check
1. **Q.** EKS control plane에서 API server와 etcd는 각각 최소 몇 개이고 어떻게 배치되나? **A.** API server 최소 2개, etcd 3개가 한 Region의 3개 AZ에 걸쳐 배치됩니다. etcd는 3개 중 2개(quorum)가 살아 있으면 계속 씁니다.
2. **Q.** private subnet의 node에 `kubectl exec`가 닿는 경로는? **A.** kubectl → API server, 그다음 API server가 고객 subnet에 있는 EKS cross-account ENI(2–4개, requester-managed)를 거쳐 node의 kubelet TCP 10250으로 갑니다. cluster security group이 이 경로를 제어합니다.
3. **Q.** endpoint private access를 켜면 무엇이 바뀌나? **A.** EKS가 관리하는 Route 53 private hosted zone이 VPC에 붙어, VPC 안에서는 endpoint 이름이 EKS ENI의 private IP로 풀립니다. node ↔ API server 트래픽이 VPC 안에 머물고 cluster SG로 제어됩니다. VPC DNS 설정 두 개가 true여야 합니다.
4. **Q.** node가 갑자기 꺼지면 Pod가 다른 node로 옮겨지기까지 기본값으로 얼마나 걸리나? **A.** heartbeat가 50초(`node-monitor-grace-period`) 동안 없으면 `Ready=Unknown`과 `unreachable` taint가 붙고, 기본 toleration `tolerationSeconds=300`이 지나면 eviction됩니다. 약 50초 + 5분이고, 그 뒤 Deployment가 새 Pod를 만듭니다.
5. **Q.** kubelet은 무엇으로 인증하고 어떤 Kubernetes 사용자가 되나? **A.** node IAM role로 인증합니다. access entry type `EC2_LINUX`이면 `system:node:{{EC2PrivateDNSName}}` 사용자가 됩니다.
6. **Q.** Fargate에서 안 되는 것 세 가지와 Auto Mode node의 최대 수명은? **A.** DaemonSet, privileged container, GPU(EBS 볼륨 마운트도 불가). Auto Mode node 최대 수명은 21일입니다.

### Unverified / open (this lesson)
- How many `kube-scheduler` and `kube-controller-manager` instances EKS runs, and their leader-election settings. The pinned guide does not say; only upstream defaults (15s/10s/2s) are sourced.
- Whether a load balancer fronts the public API endpoint, and which one. Not in the pinned guide.
- Node label key `eks.amazonaws.com/nodegroup`, Node condition reason `KubeletReady`, Lease `holderIdentity`. Not checked against a pinned source.
- Whether EKS keeps the upstream etcd prefix `/registry` (and so `/registry/minions/<node>` for Nodes).
- Whether managed node groups and Fargate profiles create their node-role access entries automatically.
- Durations for cluster creation, ENI creation, and node launch. Left out because they are unsourced.

## Lesson 2 — `apply-to-pod`: `kubectl apply` 한 번이 실행 중인 Pod가 되기까지

**Goal.** `kubectl apply --server-side -f web.yaml` 한 번이 EKS API server 인증·인가·admission → etcd → Deployment/ReplicaSet controller → scheduler → kubelet → containerd → CNI를 거쳐 `Ready` Pod가 되는 과정을 요청 하나하나 따라간다.

**Interview questions it answers.**
- `kubectl apply`를 치면 내부에서 무슨 일이 일어나나요? (컴포넌트 순서대로 설명)
- EKS는 IAM 자격 증명으로 어떻게 Kubernetes 사용자를 인증하나요? 401과 403은 각각 어느 단계에서 나오나요?
- Mutating admission과 validating admission의 순서와 차이는? 읽기 요청도 admission을 거치나요?
- etcd에는 어떤 key로, 어떤 형식으로 저장되나요? EKS에서는 무엇이 다른가요?
- Deployment는 Pod를 직접 만드나요? `pod-template-hash`는 왜 필요한가요?
- scheduler의 filter와 score는 무엇이고, 결정은 API에 어떻게 기록되나요?
- kubelet은 자기 노드의 Pod를 어떻게 알고, CRI와 CNI는 어떤 순서로 호출되나요?
- Pod condition 5개가 켜지는 순서는?

**Pins.** See "Version pins" at the top of this plan.

### Nodes
| id | label / sublabel | kind | layer | appears at step | isometric illustration idea |
|---|---|---|---|---|---|
| dev | Developer / `kubectl` + `aws eks get-token` | client | Workload | 2.1 | 노트북 위에 터미널 창, 화면에 `$ kubectl apply` |
| apiserver | kube-apiserver / EKS control plane | framework | Control plane | 2.2 | AWS 관리 영역(점선 박스) 안의 서버 랙, 앞면에 authn → authz → admission 세 개의 게이트 |
| authn | aws-iam-authenticator / token webhook | framework | Control plane | 2.3 | apiserver 옆 작은 검문소 부스, 신분증 스캐너 |
| sts | AWS STS / `GetCallerIdentity` | client (proposed kind: cloud) | AWS | 2.3 | 구름 위의 여권 심사대 |
| etcd | etcd / `/registry` | storage | Control plane | 2.6 | 세 개의 원통이 삼각형으로 묶인 클러스터(3 AZ), 자물쇠 아이콘(KMS v2) |
| kcm | kube-controller-manager / deployment · replicaset controller | framework | Control plane | 2.7 | 톱니바퀴 두 개가 맞물린 제어반 |
| scheduler | kube-scheduler / filter → score → bind | framework | Control plane | 2.10 | 깔때기(filter) 아래 저울(score) |
| node | EC2 worker node / `ip-10-0-1-23` | container | AWS | 2.13 | 아이소메트릭 EC2 인스턴스 박스, 위에 kubelet·containerd·CNI 층이 쌓임 |
| kubelet | kubelet / node agent | container | Node | 2.13 | node 박스 맨 위층의 감시탑 |
| containerd | containerd / CRI `/run/containerd/containerd.sock` | container | Node | 2.14 | 컨테이너 선적 크레인 |
| cni | aws-node / `aws-cni` + ipamd | container | Node | 2.15 | ENI 카드에 꽂힌 랜선 묶음 |
| pod | Pod `web-6b7f9c5d8-x2k9p` | app | Workload | 2.15 | pause 컨테이너 위에 앱 컨테이너가 얹힌 작은 상자 |

### State panels
| node | title | view | initial content |
|---|---|---|---|
| dev | kubeconfig 자격 증명 | table: 항목, 값 | `user.exec` = `aws eks get-token --cluster-name demo`; `token` = (없음) |
| apiserver | 요청 처리 파이프라인 | table: 단계, 결과 | `TLS` = 대기; `Authentication` = 대기; `Authorization` = 대기; `Mutating admission` = 대기; `Validating admission` = 대기; `Persist (etcd)` = 대기 |
| scheduler | 후보 노드 (E.G. 3대) | table: node, Filter, Score | `ip-10-0-1-23` / 대기 / –; `ip-10-0-2-45` / 대기 / –; `ip-10-0-3-67` / 대기 / – |
| cni | ipamd warm pool (E.G.) | table: IP, 상태 | `10.0.1.57` / free; `10.0.1.91` / free; `10.0.1.140` / free |
| pod | Pod status | table: 필드, 값 | `phase` = Pending; `PodScheduled` = –; `PodReadyToStartContainers` = –; `Initialized` = –; `ContainersReady` = –; `Ready` = –; `podIP` = – |

### Steps

#### 2.1 `get-token` — IAM 자격 증명을 bearer token으로  ·  `mutate` dev
- **Subtitle:** `kubectl`이 `aws eks get-token`을 실행해 STS 요청을 미리 서명한 token을 만든다.
- **Prose:**
  > EKS의 kubeconfig는 `exec` plugin으로 `aws eks get-token`을 부른다. 이 명령은 네트워크 호출 없이 STS `GetCallerIdentity` 요청을 SigV4로 **presign**하고, 그 URL을 base64url로 인코딩해 `k8s-aws-v1.` 접두어를 붙인다.
  > 요청에는 `x-k8s-aws-id: <cluster name>` header가 서명에 포함되어, 다른 클러스터에서 재사용할 수 없다.
  > token은 15분 동안 유효하고 그 안에서는 여러 번 재사용된다.
- **Facts:**
  | key | value |
  |---|---|
  | token 형식 | `k8s-aws-v1.` + base64url(presigned STS URL), padding `=` 제거 |
  | 서명 대상 | `GET https://sts.<region>.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15` + header `x-k8s-aws-id` |
  | 유효 기간 | 15분 ("the shortest value AWS permits") |
  | 필요 CLI | AWS CLI `2.12.3`+ 또는 `1.27.160`+ |
- **Event log:** `dev → dev · exec credential plugin · aws eks get-token --cluster-name demo · token ≈ 1 KB (E.G.)`
- **State:**
  | 항목 | before | after |
  |---|---|---|
  | `token` | (없음) | `k8s-aws-v1.aHR0cHM6Ly9zdHMuYXAtbm9ydGhlYXN0LTIu…` (E.G.) |
  | `expiresIn` | – | 15m |
- **Sources:**
  - [EKS: create-kubeconfig — `aws eks get-token`, CLI versions](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/create-kubeconfig.adoc#L22-L31) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [aws-iam-authenticator README: token valid 15 minutes](https://github.com/kubernetes-sigs/aws-iam-authenticator/blob/v0.7.24/README.md#L235-L237) — AWS IAM Authenticator for Kubernetes v0.7.24
  - [aws-iam-authenticator README: token format `k8s-aws-v1.` and presigned request](https://github.com/kubernetes-sigs/aws-iam-authenticator/blob/v0.7.24/README.md#L334-L386) — AWS IAM Authenticator for Kubernetes v0.7.24

#### 2.2 `apply-request` — Server-Side Apply PATCH  ·  `move` dev → apiserver, token `request`: `PATCH deployments/web`
- **Subtitle:** `kubectl apply --server-side`는 manifest 전체를 `application/apply-patch+yaml` PATCH로 보낸다.
- **Prose:**
  > Server-Side Apply는 HTTP `PATCH`이고 Content-Type은 항상 `application/apply-patch+yaml`이다. `kubectl`은 field manager 이름으로 `kubectl`을 쓴다(client-side apply는 `kubectl-client-side-apply`).
  > 요청은 EKS cluster endpoint의 443 포트로 TLS 위에서 간다. upstream 기본 포트는 6443이지만 운영 클러스터는 보통 443을 쓴다.
  > `Authorization: Bearer k8s-aws-v1.…` header에 2.1의 token이 실린다.
- **Facts:**
  | key | value |
  |---|---|
  | method / path | `PATCH /apis/apps/v1/namespaces/default/deployments/web?fieldManager=kubectl` |
  | Content-Type | `application/apply-patch+yaml` |
  | field manager | SSA: `kubectl`, client-side: `kubectl-client-side-apply` |
  | 포트 | upstream 기본 6443, 운영 클러스터는 보통 443 |
- **Event log:** `dev → apiserver · HTTPS REST · PATCH /apis/apps/v1/namespaces/default/deployments/web · ≈ 900 B body (E.G.)`
- **Record:** R1
- **Sources:**
  - [Server-Side Apply: serialization, media type](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/using-api/server-side-apply.md#L186-L196) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [kubectl apply field manager constants](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/kubectl/pkg/cmd/apply/apply.go#L1089-L1100) — Kubernetes v1.36.2
  - [Controlling access: transport security, port 6443/443](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/security/controlling-access.md#L23-L28) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.3 `token-review` — 인증: TokenReview webhook → STS  ·  `move` apiserver → authn → sts, token `call`: `TokenReview` / `GetCallerIdentity`
- **Subtitle:** API server는 bearer token을 이해하지 못하므로 webhook으로 넘기고, authenticator가 STS에 그대로 제출한다.
- **Prose:**
  > EKS control plane에는 AWS IAM Authenticator가 설치되어 있고, API server는 webhook token authentication으로 `TokenReview`를 보낸다.
  > authenticator는 presigned URL의 파라미터를 검사한 뒤 실제 STS에 제출한다. STS가 SigV4 서명을 검증하고 호출자 ARN을 돌려준다.
  > 인증에 실패하면 여기서 HTTP 401로 끝난다. IAM 인증 방식은 끌 수 없고, OIDC는 선택이다.
- **Facts:**
  | key | value |
  |---|---|
  | webhook 객체 | `TokenReview` (`authentication.k8s.io`) |
  | 검증 API | `sts:GetCallerIdentity` |
  | 인증 실패 | HTTP 401 |
  | 인증 모드 | IAM 인증은 비활성화 불가, OIDC는 선택 |
- **Event log:** `apiserver → authn · HTTPS webhook · POST TokenReview · E.G. 2 KB` / `authn → sts · AWS STS · GET ?Action=GetCallerIdentity · E.G. 1 KB`
- **Sources:**
  - [EKS: AWS IAM Authenticator runs on the control plane; IAM method cannot be disabled](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/grant-k8s-access.adoc#L29-L34) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [aws-iam-authenticator README: How does it work](https://github.com/kubernetes-sigs/aws-iam-authenticator/blob/v0.7.24/README.md#L247-L259) — AWS IAM Authenticator for Kubernetes v0.7.24
  - [Webhook token authentication, TokenReview](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/access-authn-authz/authentication.md#L961-L1010) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Controlling access: authentication fails with 401](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/security/controlling-access.md#L41-L59) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.4 `authorize` — 인가: access entry와 RBAC  ·  `mutate` apiserver
- **Subtitle:** STS ARN이 Kubernetes username이 되고, `patch`(+신규 생성이면 `create`) 권한을 검사한다.
- **Prose:**
  > IAM role로 인증하면 access entry가 username을 `arn:aws:sts::<account>:assumed-role/<role>/{{SessionName}}`로 만든다.
  > 권한은 access entry에 연결한 access policy(예: `AmazonEKSClusterAdminPolicy`)나 Kubernetes group에 묶인 RBAC에서 온다.
  > 여러 authorizer는 순서대로 검사되고, 하나라도 허용/거부하면 즉시 결정된다. 모두 의견이 없으면 거부, HTTP 403.
  > SSA는 `PATCH`라서 `patch` 권한이 필요하고, 새 객체를 만들 때는 `create`도 필요하다.
- **Facts:**
  | key | value |
  |---|---|
  | username (IAM role, STANDARD) | `arn:aws:sts::<account>:assumed-role/<role>/{{SessionName}}` (role path 제거) |
  | 인증 모드 | `CONFIG_MAP`, `API_AND_CONFIG_MAP`, `API` |
  | HTTP → verb | `PATCH` → `patch`, `POST` → `create` |
  | 거부 | 모든 authorizer가 no opinion이면 deny, HTTP 403 |
- **Event log:** `apiserver → apiserver · authorization · patch deployments.apps default/web → allow · E.G. < 1 ms`
- **State:**
  | 단계 | before | after |
  |---|---|---|
  | `TLS` | 대기 | ✓ |
  | `Authentication` | 대기 | ✓ `arn:aws:sts::111122223333:assumed-role/dev-role/alice` (E.G.) |
  | `Authorization` | 대기 | ✓ allow: `patch`,`create` `deployments.apps` (access policy `AmazonEKSClusterAdminPolicy`, E.G.) |
- **Sources:**
  - [EKS: username that access entries set automatically](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/creating-access-entries.adoc#L27-L49) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [EKS: authentication modes](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/grant-k8s-access.adoc#L51-L77) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [EKS: AmazonEKSClusterAdminPolicy](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/k8s-access/access-policy-reference.adoc#L157-L175) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [Authorization: modules checked in sequence, 403](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/access-authn-authz/authorization.md#L47-L54) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Authorization: HTTP verb → request verb](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/access-authn-authz/authorization.md#L84-L91) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Server-Side Apply: patch + create permissions](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/using-api/server-side-apply.md#L578-L583) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.5 `admission` — mutating 다음 validating  ·  `mutate` apiserver
- **Subtitle:** 쓰기 요청만 admission을 거친다: 먼저 mutating, 그다음 validating. 하나라도 거부하면 즉시 실패.
- **Prose:**
  > admission controller는 API server 바이너리에 컴파일된 코드이고, create/update/delete/connect 요청에만 동작한다. get/list/watch는 거치지 않는다.
  > 1단계에서 mutating controller(및 `MutatingAdmissionWebhook`, webhook은 직렬 호출)가 객체를 바꾸고, 2단계에서 validating controller가 검사만 한다.
  > EKS 1.36은 아래 목록이 항상 켜져 있다. 통과하면 객체 schema 검증 후 저장소에 쓴다.
- **Facts:**
  | key | value |
  |---|---|
  | 순서 | mutating → validating; 어느 하나라도 reject하면 전체 요청 거부 |
  | EKS 1.36 활성 목록 | `NodeRestriction`, `ExtendedResourceToleration`, `NamespaceLifecycle`, `LimitRanger`, `ServiceAccount`, `TaintNodesByCondition`, `PodSecurity`, `Priority`, `DefaultTolerationSeconds`, `DefaultStorageClass`, `StorageObjectInUseProtection`, `PersistentVolumeClaimResize`, `RuntimeClass`, `CertificateApproval`, `CertificateSigning`, `CertificateSubjectRestriction`, `DefaultIngressClass`, `MutatingAdmissionWebhook`, `ValidatingAdmissionWebhook`, `ResourceQuota` |
  | 읽기 요청 | admission을 거치지 않음 |
  | mutating webhook | 매칭되는 webhook을 직렬로 호출 |
- **Event log:** `apiserver → apiserver · admission · mutating → validating: allowed · E.G. 2 ms`
- **State:**
  | 단계 | before | after |
  |---|---|---|
  | `Mutating admission` | 대기 | ✓ (Deployment에 변경 없음, E.G.) |
  | `Validating admission` | 대기 | ✓ |
- **Sources:**
  - [EKS platform versions: admission controllers enabled for all 1.36 platform versions](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/versioning/platform-versions.adoc#L41-L55) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [Admission controllers: what they are, reads bypass admission](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/access-authn-authz/admission-controllers.md#L28-L45) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Admission control phases](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/access-authn-authz/admission-controllers.md#L64-L72) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [MutatingAdmissionWebhook: webhooks called in serial](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/access-authn-authz/admission-controllers.md#L519-L525) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Controlling access: validation then write to the object store](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/security/controlling-access.md#L130-L151) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.6 `etcd-put` — `/registry/deployments/default/web`  ·  `move` apiserver → etcd, token `data`: `PUT /registry/deployments/default/web`
- **Subtitle:** 객체는 protobuf envelope로 직렬화되고, EKS에서는 KMS v2로 한 번 더 감싸져 etcd에 들어간다.
- **Prose:**
  > etcd key는 `--etcd-prefix`(기본 `/registry`) + resource 이름 소문자 + namespace + name이다.
  > kube-apiserver의 기본 저장 형식은 `application/vnd.kubernetes.protobuf`로, 값은 magic `k8s\x00` 4바이트 뒤에 `runtime.Unknown` 메시지가 온다.
  > EKS 1.28 이상은 모든 API 데이터를 KMS v2 envelope encryption으로 암호화해 저장한다. 그래서 EKS etcd의 값은 `k8s:enc:kms:v2:` 접두어로 시작하는 암호문이다.
  > 쓰기가 끝나면 객체는 새 `resourceVersion`을 받는다.
- **Facts:**
  | key | value |
  |---|---|
  | key | `/registry/deployments/default/web` |
  | 기본 prefix | `/registry` (`DefaultEtcdPathPrefix`) |
  | 저장 media type | `application/vnd.kubernetes.protobuf`, magic `0x6b 0x38 0x73 0x00` |
  | EKS 암호화 | KMS v2 기본 envelope encryption (1.28+), 저장 값 접두어 `k8s:enc:kms:v2:` |
- **Event log:** `apiserver → etcd · etcd v3 gRPC · Txn PUT /registry/deployments/default/web · E.G. 1.6 KB`
- **Record:** R2
- **Sources:**
  - [DefaultEtcdPathPrefix = "/registry"](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubeapiserver/options/options.go#L33-L34) — Kubernetes v1.36.2
  - [ResourcePrefix falls back to lower-case resource name](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/apiserver/pkg/server/storage/storage_factory.go#L355-L371) — Kubernetes v1.36.2
  - [NamespaceKeyFunc: prefix + "/" + ns + "/" + name](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/apiserver/pkg/registry/generic/registry/store.go#L267-L295) — Kubernetes v1.36.2
  - [kube-apiserver default storage media type protobuf](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controlplane/apiserver/options/options.go#L138) — Kubernetes v1.36.2
  - [API concepts: Protobuf envelope and `Unknown` IDL](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/using-api/api-concepts.md#L252-L332) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [EKS: default envelope encryption with KMS v2 for all API data](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/security/envelope-encryption.adoc#L26-L31) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [KMS provider: stored data prefixed `k8s:enc:kms:v2:`](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/administer-cluster/kms-provider.md#L360) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.7 `watch-deployment` — controller가 변경을 받는다  ·  `move` apiserver → kcm, token `data`: `ADDED Deployment web`
- **Subtitle:** Deployment controller는 polling하지 않는다. watch stream으로 `ADDED` 이벤트를 받는다.
- **Prose:**
  > 모든 객체에는 저장 계층의 버전인 `resourceVersion`이 있고, client는 list 후 그 버전부터 watch를 연다.
  > API server는 그 이후의 create/update/delete를 `ADDED`/`MODIFIED`/`DELETED` 이벤트 stream으로 보낸다.
  > 응답 `kubectl apply`는 이미 끝났다. 이후는 모두 controller들이 비동기로 이어 간다.
- **Facts:**
  | key | value |
  |---|---|
  | watch 요청 예 | `GET /apis/apps/v1/deployments?watch=1&resourceVersion=<rv>` (E.G.) |
  | 이벤트 type | `ADDED`, `MODIFIED`, `DELETED` |
  | 재연결 | 마지막 `resourceVersion`부터 다시 watch, 또는 새로 list |
- **Event log:** `apiserver → kcm · HTTPS watch stream · ADDED apps/v1 Deployment default/web rv=E.G. 812345 · E.G. 1.5 KB`
- **Sources:**
  - [API concepts: efficient detection of changes (watch, resourceVersion)](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/using-api/api-concepts.md#L396-L412) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [API concepts: watch example with ADDED/MODIFIED](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/using-api/api-concepts.md#L439-L452) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.8 `create-replicaset` — Deployment → ReplicaSet `web-6b7f9c5d8`  ·  `move` kcm → apiserver, token `request`: `POST replicasets`
- **Subtitle:** Deployment controller는 Pod template을 해시해 `pod-template-hash`를 만들고, 그 이름의 ReplicaSet을 만든다.
- **Prose:**
  > `ComputeHash`는 Pod template을 FNV-32a로 해시하고(충돌 시 `collisionCount`를 섞음), 그 값을 안전한 문자로 인코딩한다.
  > 해시는 ReplicaSet 이름(`<deployment>-<hash>`), selector, Pod template label에 `pod-template-hash`로 들어가 ReplicaSet끼리 Pod가 겹치지 않게 한다.
  > ReplicaSet의 `ownerReferences`는 Deployment를 controller로 가리킨다. 이 POST도 2.3~2.6과 같은 authn/authz/admission/etcd 경로를 지난다.
- **Facts:**
  | key | value |
  |---|---|
  | RS 이름 | `<deployment-name>-<pod-template-hash>` (이름이 길면 Deployment 이름을 자름) |
  | 해시 | FNV-32a(PodTemplateSpec [+ collisionCount]) → `SafeEncodeString` (문자 `bcdfghjklmnpqrstvwxz2456789`) |
  | rolling update 기본값 | `maxSurge` 25%, `maxUnavailable` 25% |
  | etcd key | `/registry/replicasets/default/web-6b7f9c5d8` (E.G. hash) |
- **Event log:** `kcm → apiserver · HTTPS REST · POST /apis/apps/v1/namespaces/default/replicasets · E.G. 1.4 KB`
- **Record:** R3
- **Sources:**
  - [Deployment controller creates new ReplicaSet with hash label and controller ref](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/deployment/sync.go#L196-L218) — Kubernetes v1.36.2
  - [generateReplicaSetName](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/deployment/sync.go#L560-L568) — Kubernetes v1.36.2
  - [ComputeHash (FNV-32a + collisionCount)](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/controller_utils.go#L1403-L1415) — Kubernetes v1.36.2
  - [SafeEncodeString alphabet](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/apimachinery/pkg/util/rand/rand.go#L83) — Kubernetes v1.36.2
  - [Deployment docs: RS name format, pod-template-hash label](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/controllers/deployment.md#L130-L162) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Deployment docs: maxUnavailable / maxSurge default 25%](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/controllers/deployment.md#L1201-L1216) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.9 `create-pods` — ReplicaSet → Pod 3개 (slow start)  ·  `move` kcm → apiserver, token `request`: `POST pods ×3`
- **Subtitle:** ReplicaSet controller는 부족한 replica 수만큼 Pod를 `generateName`으로 만든다. 배치 크기는 1, 2, 4…로 늘어난다.
- **Prose:**
  > ReplicaSet controller는 한 번의 sync에서 최대 500개(`BurstReplicas`)까지 만들고, 생성 요청을 1개부터 두 배씩 늘리는 slow start로 보낸다. quota 부족처럼 모두 실패할 요청이 API server를 두드리지 않게 하기 위함이다.
  > Pod 이름은 `generateName: web-6b7f9c5d8-`에 API server가 5글자 random suffix를 붙여 만든다.
  > 이 Pod 생성에서 admission이 실제로 일한다: `ServiceAccount`가 `kube-api-access-*` projected volume을, `DefaultTolerationSeconds`가 300초 toleration을 넣는다.
- **Facts:**
  | key | value |
  |---|---|
  | `BurstReplicas` | 500 |
  | slow start | `SlowStartInitialBatchSize` = 1, 성공할 때마다 두 배 |
  | 이름 suffix | 5글자 (`randomLength = 5`) |
  | admission이 추가 | `kube-api-access-<suffix>` (token `expirationSeconds: 3607`), toleration `not-ready`/`unreachable` `NoExecute` 300s |
- **Event log:** `kcm → apiserver · HTTPS REST · POST /api/v1/namespaces/default/pods (×3, batch 1→2) · E.G. 1.2 KB each`
- **Record:** R4
- **Sources:**
  - [ReplicaSet controller: burst limit and slow start batch](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/replicaset/replica_set.go#L655-L680) — Kubernetes v1.36.2
  - [BurstReplicas = 500](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/replicaset/replica_set.go#L74) — Kubernetes v1.36.2
  - [SlowStartInitialBatchSize = 1](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/controller_utils.go#L73-L87) — Kubernetes v1.36.2
  - [Pod generateName prefix from controller name](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/controller_utils.go#L512-L518) — Kubernetes v1.36.2
  - [Name generator randomLength = 5](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/apiserver/pkg/storage/names/generate.go#L45) — Kubernetes v1.36.2
  - [ServiceAccount admission: projected volume, ExpirationSeconds](https://github.com/kubernetes/kubernetes/blob/v1.36.2/plugin/pkg/admission/serviceaccount/admission.go#L486-L494) — Kubernetes v1.36.2
  - [WarnOnlyBoundTokenExpirationSeconds = 60*60 + 7](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/serviceaccount/claims.go#L39) — Kubernetes v1.36.2
  - [DefaultTolerationSeconds: 5 minutes](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/access-authn-authz/admission-controllers.md#L232-L241) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.10 `filter` — scheduler: 불가능한 노드 걸러내기  ·  `mutate` scheduler
- **Subtitle:** `spec.nodeName`이 빈 Pod가 scheduling queue에 들어오고, Filter plugin이 노드마다 가능 여부를 판단한다.
- **Prose:**
  > scheduler는 `spec.nodeName`이 비어 있는 Pod만 자기 일로 본다. 한 번에 한 Pod씩 scheduling cycle을 돈다(binding cycle은 병렬 가능).
  > PreFilter가 Pod 정보를 미리 계산하고, Filter는 노드마다 plugin을 순서대로 호출한다. 하나가 infeasible이라 하면 그 노드의 나머지 plugin은 부르지 않는다.
  > 큰 클러스터에서는 feasible 노드를 충분히 찾으면 멈춘다(기본: 100노드 50% ~ 5000노드 10%, 하한 5%, 최소 100노드).
- **Facts:**
  | key | value |
  |---|---|
  | 담당 Pod | `len(pod.Spec.NodeName) == 0` |
  | 기본 Filter 계열 예 | `NodeUnschedulable`, `NodeName`, `TaintToleration`, `NodeAffinity`, `NodePorts`, `NodeResourcesFit`, `VolumeBinding`, `PodTopologySpread`, `InterPodAffinity` |
  | `percentageOfNodesToScore` 기본 | 0 → 자동 (100노드 50%, 5000노드 10%, 하한 5%) |
  | 최소 탐색 | feasible 노드 100개 |
- **Event log:** `apiserver → scheduler · HTTPS watch stream · ADDED Pod default/web-6b7f9c5d8-x2k9p nodeName="" · E.G. 2 KB` 후 `scheduler · Filter · 3 nodes → 2 feasible · E.G. 0.4 ms`
- **State:**
  | node | Filter before | Filter after |
  |---|---|---|
  | `ip-10-0-1-23` | 대기 | ✓ feasible |
  | `ip-10-0-2-45` | 대기 | ✓ feasible |
  | `ip-10-0-3-67` | 대기 | ✗ `NodeResourcesFit`: Insufficient cpu (E.G.) |
- **Sources:**
  - [Scheduler eventhandlers: assignedPod](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/eventhandlers.go#L452-L454) — Kubernetes v1.36.2
  - [Default plugins (MultiPoint) and weights](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/apis/config/v1/default_plugins.go#L29-L51) — Kubernetes v1.36.2
  - [Scheduling framework: scheduling cycle serial, binding concurrent](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L33-L39) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Scheduling framework: PreFilter, Filter](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L91-L103) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Scheduler perf tuning: default threshold](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/scheduling-eviction/scheduler-perf-tuning.md#L61-L80) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Scheduler perf tuning: minimum 100 nodes](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/scheduling-eviction/scheduler-perf-tuning.md#L104-L110) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [DefaultPercentageOfNodesToScore = 0](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/apis/config/types.go#L221-L223) — Kubernetes v1.36.2

#### 2.11 `score` — 남은 노드에 점수 매기기  ·  `mutate` scheduler
- **Subtitle:** Score plugin 점수를 정규화하고 plugin weight를 곱해 합산한 뒤, 가장 높은 노드를 고른다.
- **Prose:**
  > Score plugin은 feasible 노드마다 정해진 범위의 정수 점수를 주고, NormalizeScore 뒤에 weight를 곱해 합친다.
  > 기본 weight: `TaintToleration` 3, `NodeAffinity`·`PodTopologySpread`·`InterPodAffinity` 2, `NodeResourcesFit`·`NodeResourcesBalancedAllocation`·`ImageLocality` 1.
  > `NodeResourcesFit` 기본 전략은 `LeastAllocated`(cpu·memory weight 1). 동점이면 무작위로 하나를 고른다.
- **Facts:**
  | key | value |
  |---|---|
  | 최고 weight | `TaintToleration` 3 |
  | `NodeResourcesFit` 전략 | `LeastAllocated`, resources cpu:1, memory:1 |
  | 동점 | 무작위 선택 |
- **Event log:** `scheduler · Score · ip-10-0-1-23=E.G. 412, ip-10-0-2-45=E.G. 377 → ip-10-0-1-23 · E.G. 0.3 ms`
- **State:**
  | node | Score before | Score after |
  |---|---|---|
  | `ip-10-0-1-23` | – | E.G. 412 ← 선택 |
  | `ip-10-0-2-45` | – | E.G. 377 |
  | `ip-10-0-3-67` | – | – (filtered) |
- **Sources:**
  - [Default plugins and weights](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/apis/config/v1/default_plugins.go#L29-L51) — Kubernetes v1.36.2
  - [NodeResourcesFit default: LeastAllocated, cpu/memory weight 1](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/apis/config/v1/defaults.go#L33-L36) — Kubernetes v1.36.2
  - [Scheduling framework: Score, NormalizeScore](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L118-L143) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [kube-scheduler: filtering, scoring, ties at random](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/scheduling-eviction/kube-scheduler.md#L58-L76) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.12 `bind` — Binding 객체로 결정을 기록  ·  `move` scheduler → apiserver, token `request`: `POST pods/web-…/binding`
- **Subtitle:** scheduler는 Pod를 직접 수정하지 않는다. `binding` subresource에 `Binding`을 POST하면 API server가 `spec.nodeName`을 쓴다.
- **Prose:**
  > `DefaultBinder`는 `Binding{metadata: Pod 이름·UID, target: {kind: Node, name}}`을 만들어 `pods/<name>/binding`에 보낸다.
  > API server의 `BindingREST`는 etcd의 Pod를 `GuaranteedUpdate`로 읽어, 이미 `nodeName`이 있거나 삭제 중이거나 `schedulingGates`가 남아 있으면 거부한다.
  > 통과하면 `spec.nodeName`을 쓰고 `PodScheduled=True` condition을 같은 쓰기에서 추가한다.
- **Facts:**
  | key | value |
  |---|---|
  | path | `POST /api/v1/namespaces/default/pods/web-6b7f9c5d8-x2k9p/binding` |
  | 거부 조건 | `deletionTimestamp` 있음, `spec.nodeName` 이미 설정, `spec.schedulingGates` 비어 있지 않음 |
  | 같은 쓰기에서 | `spec.nodeName` 설정 + `PodScheduled` = `True` |
- **Event log:** `scheduler → apiserver · HTTPS REST · POST pods/web-6b7f9c5d8-x2k9p/binding target=Node/ip-10-0-1-23 · E.G. 300 B`
- **State:** (pod panel 미리보기) `PodScheduled`: – → `True`
- **Record:** R5
- **Sources:**
  - [DefaultBinder.Bind builds v1.Binding](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/framework/plugins/defaultbinder/default_binder.go#L51-L70) — Kubernetes v1.36.2
  - [BindingREST.setPodNodeAndMetadata: checks, nodeName, PodScheduled](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/registry/core/pod/storage/storage.go#L213-L266) — Kubernetes v1.36.2
  - [core/v1 Binding type](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/core/v1/types.go#L7197-L7207) — Kubernetes v1.36.2
  - [Scheduling framework: Bind](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L240-L246) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.13 `kubelet-watch` — kubelet이 자기 노드의 Pod를 받는다  ·  `move` apiserver → kubelet, token `data`: `MODIFIED Pod nodeName=ip-10-0-1-23`
- **Subtitle:** kubelet은 `spec.nodeName=<자기 노드>` field selector로 Pod를 watch한다.
- **Prose:**
  > kubelet의 API server source는 모든 namespace의 Pod를 `spec.nodeName` field selector로 list/watch한다. 그래서 binding이 기록되는 순간 해당 노드의 kubelet만 이벤트를 받는다.
  > kubelet은 `SyncPod`를 시작한다: sandbox 변경 계산 → 필요하면 sandbox 생성 → init container → 일반 container 순서다.
  > EKS 최적화 AMI에는 `kubelet`, AWS IAM Authenticator, `containerd`가 미리 들어 있다.
- **Facts:**
  | key | value |
  |---|---|
  | field selector | `spec.nodeName=ip-10-0-1-23.ap-northeast-2.compute.internal` (E.G. 노드 이름) |
  | `SyncPod` 순서 | compute changes → kill → create sandbox → ephemeral → init → (resize) → normal containers |
  | EKS AMI 구성 | `kubelet`, AWS IAM Authenticator, `containerd`; 1.30+ 신규 managed node group 기본 OS는 AL2023 |
- **Event log:** `apiserver → kubelet · HTTPS watch stream · MODIFIED Pod default/web-6b7f9c5d8-x2k9p · E.G. 2.3 KB`
- **Sources:**
  - [kubelet API server source: field selector spec.nodeName](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubelet/config/apiserver.go#L37) — Kubernetes v1.36.2
  - [kuberuntime SyncPod steps](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubelet/kuberuntime/kuberuntime_manager.go#L1441-L1450) — Kubernetes v1.36.2
  - [EKS optimized AMI components; AL2023 default for 1.30+](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/eks-optimized-ami.adoc#L13-L20) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 2.14 `run-sandbox` — CRI `RunPodSandbox`  ·  `move` kubelet → containerd, token `call`: `RunPodSandbox`
- **Subtitle:** kubelet은 CRI gRPC로 containerd에 Pod 단위 sandbox(네트워크 namespace를 가진 pause 컨테이너)를 요청한다.
- **Prose:**
  > CRI는 kubelet과 container runtime 사이의 gRPC API다. containerd의 Linux 기본 CRI socket은 `/run/containerd/containerd.sock`이다.
  > `RunPodSandbox`는 Pod 수준 sandbox를 만들고 시작하며, 성공하면 sandbox가 ready 상태여야 한다.
  > Kubernetes 1.24부터 kubelet은 CNI를 직접 관리하지 않는다. CNI plugin을 불러 네트워크를 붙이는 것은 container runtime의 일이다.
  > Pod에 init container가 없으면 `Initialized=True`는 sandbox 생성 전에 이미 켜진다.
- **Facts:**
  | key | value |
  |---|---|
  | socket | `unix:///run/containerd/containerd.sock` |
  | RPC | `RunPodSandbox(RunPodSandboxRequest) returns (RunPodSandboxResponse)` |
  | 응답 | `pod_sandbox_id` |
  | sandbox image 예 | `registry.k8s.io/pause:3.10` (upstream 문서 예; EKS AMI 값은 unverified) |
- **Event log:** `kubelet → containerd · CRI gRPC · RunPodSandbox web-6b7f9c5d8-x2k9p attempt=0 · E.G. 600 B`
- **State:** (pod panel 미리보기) `Initialized`: – → `True` (init container 없음)
- **Record:** R6
- **Sources:**
  - [kuberuntime_sandbox: runtimeService.RunPodSandbox](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubelet/kuberuntime/kuberuntime_sandbox.go#L67) — Kubernetes v1.36.2
  - [CRI api.proto: RunPodSandbox rpc](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L28-L30) — Kubernetes v1.36.2
  - [Container runtimes: containerd default CRI socket](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/setup/production-environment/container-runtimes.md#L209) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Container runtimes: sandbox (pause) image example](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/setup/production-environment/container-runtimes.md#L266-L273) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Network plugins: runtime loads CNI; kubelet CNI flags removed in 1.24](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins.md#L31-L42) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Pod conditions: Initialized before sandbox when no init containers](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-condition.md#L53-L61) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.15 `cni-add` — VPC CNI가 Pod IP를 붙인다  ·  `mutate` cni
- **Subtitle:** containerd가 `aws-cni`를 CNI ADD로 실행하고, plugin은 ipamd에 gRPC `AddNetwork`로 warm pool의 IP를 받아 온다.
- **Prose:**
  > Amazon VPC CNI는 두 부분이다: host와 Pod의 네트워크를 잇는 CNI plugin, 그리고 warm pool을 유지하고 IP를 배정하는 node-local daemon `ipamd`.
  > v1.23.1의 plugin은 Unix socket `/var/run/aws-node/ipamd.sock`으로 ipamd에 `AddNetwork`(Pod 이름·namespace·sandbox ID·netns)를 보낸다.
  > IP가 붙고 sandbox가 준비되면 kubelet은 `PodReadyToStartContainers=True`를 켠다. 자세한 ENI/warm pool 동작은 VPC CNI lesson에서 다룬다.
- **Facts:**
  | key | value |
  |---|---|
  | ipamd 연결 | Unix socket `/var/run/aws-node/ipamd.sock` (v1.23.1) |
  | `AddNetworkRequest` 필드 | `K8S_POD_NAME`, `K8S_POD_NAMESPACE`, `K8S_POD_INFRA_CONTAINER_ID`, `Netns`, `ContainerID`, `NetworkName`, `IfName` |
  | condition | sandbox + 네트워크 + volume 준비 후 `PodReadyToStartContainers=True`; image pull은 그 뒤 |
- **Event log:** `containerd → cni · CNI exec · ADD (aws-cni) → ipamd AddNetwork · IP 10.0.1.57 (E.G.) · E.G. 30 ms`
- **State:**
  | IP | before | after |
  |---|---|---|
  | `10.0.1.57` (E.G.) | free | assigned → `default/web-6b7f9c5d8-x2k9p` |
  | `10.0.1.91` | free | free |
  | `10.0.1.140` | free | free |
- **Sources:**
  - [VPC CNI README: components (CNI plugin, ipamd)](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L45-L52) — Amazon VPC CNI v1.23.1 (EKS 1.36 add-on v1.23.1-eksbuild.1)
  - [routed-eni-cni-plugin: ipamdSocketPath](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L49) — Amazon VPC CNI v1.23.1 (EKS 1.36 add-on v1.23.1-eksbuild.1)
  - [routed-eni-cni-plugin: AddNetwork request](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L189-L211) — Amazon VPC CNI v1.23.1 (EKS 1.36 add-on v1.23.1-eksbuild.1)
  - [Pod lifecycle: PodReadyToStartContainers](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L700-L723) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.16 `start-container` — PullImage → CreateContainer → StartContainer  ·  `move` kubelet → containerd, token `call`: `CreateContainer` / `StartContainer`
- **Subtitle:** 컨테이너마다 image pull, 생성, 시작, postStart hook 순서로 진행한다.
- **Prose:**
  > `startContainer`는 image pull → create → start → postStart hook 순서다. `CreateContainer`는 앞에서 받은 `pod_sandbox_id`와 `ContainerConfig`를 함께 보낸다.
  > `imagePullPolicy`를 생략하면 API server가 기본값을 넣는다: 태그가 `:latest`이거나 없으면 `Always`, 그 밖의 태그나 digest면 `IfNotPresent`.
  > 시작되면 `containerStatuses[].state`가 `running`이 되고, phase는 `Running`이 된다.
- **Facts:**
  | key | value |
  |---|---|
  | 순서 | `PullImage` → `CreateContainer(pod_sandbox_id, config, sandbox_config)` → `StartContainer(container_id)` → postStart |
  | `imagePullPolicy` 기본 | `:latest`/태그 없음 → `Always`; 다른 태그·digest → `IfNotPresent` |
  | `Running` phase | node에 bound, 모든 container 생성, 하나 이상 실행 중 |
- **Event log:** `kubelet → containerd · CRI gRPC · PullImage / CreateContainer web / StartContainer · E.G. 2.1 s (pull 포함)`
- **State:** (pod panel 미리보기) `phase`: Pending → Running
- **Sources:**
  - [startContainer: pull, create, start, post start](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubelet/kuberuntime/kuberuntime_container.go#L194-L200) — Kubernetes v1.36.2
  - [startContainer: CreateContainer / StartContainer calls](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubelet/kuberuntime/kuberuntime_container.go#L277-L292) — Kubernetes v1.36.2
  - [CRI api.proto: CreateContainerRequest, StartContainerRequest](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L1367-L1389) — Kubernetes v1.36.2
  - [Images: imagePullPolicy defaulting](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/containers/images.md#L140-L152) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Pod lifecycle: phase Pending/Running](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L114-L115) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.17 `status-patch` — kubelet이 Pod status를 보고  ·  `move` kubelet → apiserver, token `response`: `PATCH pods/web-…/status`
- **Subtitle:** kubelet status manager는 `status` subresource에 strategic merge patch로 condition, `podIP`, `containerStatuses`를 쓴다.
- **Prose:**
  > kubelet은 Pod 객체 전체가 아니라 `pods/<name>/status` subresource만 PATCH한다(`StrategicMergePatchType`).
  > `podIP`는 CRI sandbox status의 네트워크 정보(`PodSandboxNetworkStatus.ip`)에서 온다.
  > readiness probe가 없으면 container가 시작되는 대로 ready이고, 그러면 `ContainersReady`와 `Ready`가 `True`가 된다. `Ready`가 아닌 Pod는 Service endpoint에서 빠진다.
- **Facts:**
  | key | value |
  |---|---|
  | 요청 | `PATCH /api/v1/namespaces/default/pods/web-6b7f9c5d8-x2k9p/status` (strategic merge patch) |
  | lifecycle condition 순서 | `PodScheduled` → `PodReadyToStartContainers` → `Initialized` → `ContainersReady` → `Ready` |
  | `Ready` 추가 조건 | `readinessGates`가 있으면 그 condition도 모두 `True`여야 함 |
- **Event log:** `kubelet → apiserver · HTTPS REST · PATCH pods/web-6b7f9c5d8-x2k9p/status · E.G. 1.1 KB`
- **Record:** R7
- **Sources:**
  - [status manager syncPod → PatchPodStatus](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubelet/status/status_manager.go#L1183) — Kubernetes v1.36.2
  - [PatchPodStatus: StrategicMergePatchType on "status"](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/util/pod/pod.go#L34-L43) — Kubernetes v1.36.2
  - [CRI api.proto: PodSandboxNetworkStatus](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L648-L653) — Kubernetes v1.36.2
  - [Pod conditions: built-in lifecycle conditions and order](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-condition.md#L40-L64) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 2.18 `ready` — Pod `Ready`, 나머지 2개도 같은 경로  ·  `mutate` pod
- **Subtitle:** 5개 condition이 모두 `True`인 Pod 하나가 완성됐다. 나머지 두 replica도 2.10~2.17을 각자 반복한다.
- **Prose:**
  > 정리: 사람의 요청은 2.2~2.6에서 끝났고, 나머지는 controller, scheduler, kubelet이 watch와 API 쓰기로 이어 붙인 결과다. 어떤 컴포넌트도 서로를 직접 부르지 않고 API server를 거친다.
  > `PodScheduled`는 kubelet이 아니라 API server의 binding 처리에서 켜진다는 점이 흔한 오해다.
  > Deployment `status.availableReplicas`가 3이 되면 rollout이 끝난다.
- **Facts:**
  | key | value |
  |---|---|
  | `PodScheduled` 설정 주체 | API server `BindingREST` (binding과 같은 쓰기) |
  | 나머지 condition 설정 주체 | kubelet |
  | rollout 정체 판정 기본값 | `progressDeadlineSeconds` 600 |
- **Event log:** `pod · status · Ready=True podIP=10.0.1.57 (E.G.) · 첫 요청부터 E.G. 4 s`
- **State:**
  | 필드 | before | after |
  |---|---|---|
  | `phase` | Pending | Running |
  | `PodScheduled` | – | True |
  | `PodReadyToStartContainers` | – | True |
  | `Initialized` | – | True |
  | `ContainersReady` | – | True |
  | `Ready` | – | True |
  | `podIP` | – | `10.0.1.57` (E.G.) |
- **Sources:**
  - [BindingREST sets PodScheduled](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/registry/core/pod/storage/storage.go#L261-L264) — Kubernetes v1.36.2
  - [Pod conditions: kubelet sets lifecycle conditions](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-condition.md#L53-L61) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Deployment: progressDeadlineSeconds defaults to 600](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/controllers/deployment.md#L1326-L1328) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

### Decoder records

#### R1. Server-Side Apply request (step 2.2) — layer bar: request line | headers | body (Deployment)
```text
PATCH /apis/apps/v1/namespaces/default/deployments/web?fieldManager=kubectl HTTP/1.1
Host: 0123456789ABCDEF0123456789ABCDEF.gr7.ap-northeast-2.eks.amazonaws.com
Authorization: Bearer k8s-aws-v1.aHR0cHM6Ly9zdHMuYXAtbm9ydGhlYXN0LTIuYW1hem9uYXdzLmNvbS8_QWN0aW9uPUdldENhbGxlcklkZW50aXR5…
Content-Type: application/apply-patch+yaml
Accept: application/json

apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels: {app: web}
  template:
    metadata:
      labels: {app: web}
    spec:
      containers:
      - name: web
        image: registry.example.com/web:1.0.0
        resources:
          requests: {cpu: 250m, memory: 256Mi}
```
After the write, `kubectl get deploy web -o yaml --show-managed-fields` shows:
```yaml
metadata:
  managedFields:
  - manager: kubectl
    operation: Apply
    apiVersion: apps/v1
    time: "2026-11-03T12:00:00Z"
    fieldsType: FieldsV1
    fieldsV1:
      f:spec:
        f:replicas: {}
        f:selector: {}
        f:template:
          f:metadata: {f:labels: {f:app: {}}}
          f:spec:
            f:containers:
              k:{"name":"web"}: {.: {}, f:image: {}, f:name: {}, f:resources: {f:requests: {f:cpu: {}, f:memory: {}}}}
  resourceVersion: "812345"
  generation: 1
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| request line | `PATCH …/deployments/web?fieldManager=kubectl` | SSA는 PATCH, field manager 이름은 query로 | |
| `Host` | `<id>.gr7.<region>.eks.amazonaws.com` | EKS cluster endpoint | E.G. |
| `Authorization` | `Bearer k8s-aws-v1.…` | presigned STS URL token | E.G. |
| `Content-Type` | `application/apply-patch+yaml` | SSA 전용 media type (JSON 본문도 이 값) | |
| `spec.replicas` | `3` | 원하는 Pod 수 | E.G. |
| `spec.template` | Pod template | ReplicaSet/Pod가 복사할 원본, 해시 대상 | E.G. |
| `metadata.managedFields[].manager` | `kubectl` | 이 필드들의 소유자 | |
| `metadata.managedFields[].operation` | `Apply` | SSA로 마지막 변경 (`Update`는 그 외) | |
| `metadata.managedFields[].fieldsType` | `FieldsV1` | 소유 필드 집합 인코딩 | |
| `metadata.resourceVersion` | `812345` | 저장 계층 버전 | E.G. |

Sources: [SSA managedFields example](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/using-api/server-side-apply.md#L91-L127) — Kubernetes 1.36 docs; [SSA media type](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/using-api/server-side-apply.md#L186-L196) — Kubernetes 1.36 docs; [token format](https://github.com/kubernetes-sigs/aws-iam-authenticator/blob/v0.7.24/README.md#L334-L340) — AWS IAM Authenticator v0.7.24. The EKS endpoint host format (`gr7`) is **unverified** in this pass; show it as E.G. only. `fieldsV1` for list items uses `k:{"name":"web"}` keys — **unverified** against a pinned doc line; take from a real `--show-managed-fields` output before shipping.

#### R2. etcd key and value envelope (step 2.6) — layer bar: key | KMS v2 prefix | ciphertext (→ decrypted: magic | Unknown.typeMeta | Unknown.raw)
```text
key:   /registry/deployments/default/web
value (EKS, as stored):
  6b 38 73 3a 65 6e 63 3a 6b 6d 73 3a 76 32 3a …   "k8s:enc:kms:v2:<provider-name>:" + encrypted payload
value (after API server decrypts = upstream unencrypted format):
  6b 38 73 00                                       "k8s\x00" magic
  0a 12 0a 07 61 70 70 73 2f 76 31 12 0a 44 65 70 …  Unknown{ typeMeta{apiVersion:"apps/v1", kind:"Deployment"},
  12 …                                                      raw: <protobuf apps.v1.Deployment>,
                                                            contentEncoding:"", contentType:"" }
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| key prefix | `/registry` | `DefaultEtcdPathPrefix` (`--etcd-prefix`) | |
| resource segment | `deployments` | resource 이름 소문자 (override 없을 때) | |
| namespace / name | `default` / `web` | `NamespaceKeyFunc` | E.G. |
| encryption prefix | `k8s:enc:kms:v2:` | KMS v2 provider가 암호화한 값 표시 | |
| provider name | `<provider-name>` | EncryptionConfiguration의 kms provider 이름; EKS 값은 비공개 | E.G. / unverified |
| magic | `6b 38 73 00` | Kubernetes protobuf envelope 시작 4바이트 | |
| `Unknown.typeMeta.apiVersion` | `apps/v1` | 객체 group/version | |
| `Unknown.typeMeta.kind` | `Deployment` | 객체 kind | |
| `Unknown.raw` | bytes | protobuf로 직렬화한 객체 본문 | E.G. |
| `Unknown.contentType` | (생략) | 생략 = `application/vnd.kubernetes.protobuf` | |

Sources: [options.go DefaultEtcdPathPrefix](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubeapiserver/options/options.go#L33-L34), [store.go NamespaceKeyFunc](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/apiserver/pkg/registry/generic/registry/store.go#L267-L295), [protobuf.go protoEncodingPrefix](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/apimachinery/pkg/runtime/serializer/protobuf/protobuf.go#L34-L43) — Kubernetes v1.36.2; [api-concepts Unknown IDL](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/using-api/api-concepts.md#L302-L332), [kms-provider prefix](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/administer-cluster/kms-provider.md#L360) — Kubernetes 1.36 docs; [EKS KMS v2 default](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/security/envelope-encryption.adoc#L26-L31) — EKS User Guide @ 8d43223. The hex bytes after the magic are illustrative protobuf (tag 1 = typeMeta, length, …); mark them E.G. Exact bytes after `k8s:enc:kms:v2:` are **unverified** (opaque ciphertext on EKS; etcd is not reachable on EKS).

#### R3. ReplicaSet and Pod ownership (steps 2.8–2.9) — layer bar: metadata.name | labels | ownerReferences | spec.selector
```yaml
# ReplicaSet (created by deployment controller)
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
---
# Pod (created by replicaset controller)
apiVersion: v1
kind: Pod
metadata:
  generateName: web-6b7f9c5d8-
  name: web-6b7f9c5d8-x2k9p
  labels: {app: web, pod-template-hash: 6b7f9c5d8}
  ownerReferences:
  - apiVersion: apps/v1
    kind: ReplicaSet
    name: web-6b7f9c5d8
    uid: a1d9e0b4-7c3f-4e22-8b16-5f0a9c2d3e47
    controller: true
    blockOwnerDeletion: true
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.name` (RS) | `web-6b7f9c5d8` | `<deployment>-<pod-template-hash>` | E.G. hash |
| `metadata.labels.pod-template-hash` | `6b7f9c5d8` | Pod template 해시; RS 간 Pod 겹침 방지 | E.G. |
| `spec.selector.matchLabels.pod-template-hash` | `6b7f9c5d8` | selector에도 해시 추가 | E.G. |
| `ownerReferences[].kind` | `Deployment` / `ReplicaSet` | 소유자 종류 | |
| `ownerReferences[].controller` | `true` | 관리 controller 표시 (`NewControllerRef`) | |
| `ownerReferences[].blockOwnerDeletion` | `true` | foreground 삭제 시 소유자 삭제를 막음 | |
| `ownerReferences[].uid` | UUID | 소유자 객체 UID | E.G. |
| `metadata.generateName` (Pod) | `web-6b7f9c5d8-` | API server가 5글자 suffix를 붙임 | |
| `metadata.name` (Pod) | `web-6b7f9c5d8-x2k9p` | 생성된 이름 | E.G. |

Sources: [sync.go new ReplicaSet](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/deployment/sync.go#L196-L218), [controller_utils.go getPodsPrefix](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/controller_utils.go#L512-L518), [names/generate.go randomLength](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/apiserver/pkg/storage/names/generate.go#L45) — Kubernetes v1.36.2; [replicaset.md ownerReferences example](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/controllers/replicaset.md#L39-L158), [deployment.md pod-template-hash](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/controllers/deployment.md#L156-L162) — Kubernetes 1.36 docs.

#### R4. Pod as created, after admission (step 2.9) — layer bar: metadata | spec (user) | spec (added by admission/defaulting) | status
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-6b7f9c5d8-x2k9p
  namespace: default
spec:
  nodeName: ""                      # empty → scheduler's job
  schedulerName: default-scheduler
  serviceAccountName: default
  containers:
  - name: web
    image: registry.example.com/web:1.0.0
    imagePullPolicy: IfNotPresent   # defaulted (tag is not :latest)
    volumeMounts:
    - name: kube-api-access-8xk2q
      mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      readOnly: true
  tolerations:
  - {key: node.kubernetes.io/not-ready, operator: Exists, effect: NoExecute, tolerationSeconds: 300}
  - {key: node.kubernetes.io/unreachable, operator: Exists, effect: NoExecute, tolerationSeconds: 300}
  volumes:
  - name: kube-api-access-8xk2q
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken: {expirationSeconds: 3607, path: token}
      - configMap: {name: kube-root-ca.crt, items: [{key: ca.crt, path: ca.crt}]}
      - downwardAPI: {items: [{path: namespace, fieldRef: {apiVersion: v1, fieldPath: metadata.namespace}}]}
status:
  phase: Pending
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `spec.nodeName` | `""` | 비어 있으면 scheduler 대상 | |
| `spec.containers[].imagePullPolicy` | `IfNotPresent` | 생략 시 태그 기준 기본값 | |
| `spec.volumes[].name` | `kube-api-access-<suffix>` | ServiceAccount admission이 추가한 projected volume | E.G. suffix |
| `…serviceAccountToken.expirationSeconds` | `3607` | `WarnOnlyBoundTokenExpirationSeconds` (1h + 7s) | |
| `…serviceAccountToken.path` | `token` | 컨테이너에서 보이는 파일 이름 | |
| `spec.tolerations[].tolerationSeconds` | `300` | `DefaultTolerationSeconds` 기본 5분 | |
| `status.phase` | `Pending` | 아직 스케줄/생성 전 | |

Sources: [admission.go projected volume](https://github.com/kubernetes/kubernetes/blob/v1.36.2/plugin/pkg/admission/serviceaccount/admission.go#L486-L494), [admission.go volume name prefix](https://github.com/kubernetes/kubernetes/blob/v1.36.2/plugin/pkg/admission/serviceaccount/admission.go#L53), [claims.go 3607](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/serviceaccount/claims.go#L39) — Kubernetes v1.36.2; [service-accounts-admin projected volume](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/access-authn-authz/service-accounts-admin.md#L230-L265), [DefaultTolerationSeconds](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/access-authn-authz/admission-controllers.md#L232-L241), [imagePullPolicy defaulting](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/containers/images.md#L140-L152) — Kubernetes 1.36 docs. `schedulerName: default-scheduler`, `defaultMode: 420` and the mountPath are standard values but their defaulting lines were **not checked** in this pass — check before shipping.

#### R5. Binding (step 2.12) — layer bar: request line | Binding.metadata | Binding.target
```text
POST /api/v1/namespaces/default/pods/web-6b7f9c5d8-x2k9p/binding
Content-Type: application/vnd.kubernetes.protobuf

{"kind":"Binding","apiVersion":"v1",
 "metadata":{"name":"web-6b7f9c5d8-x2k9p","namespace":"default","uid":"c7e2b1f0-4a9d-4d3e-b6a8-1f2e3d4c5b6a"},
 "target":{"kind":"Node","name":"ip-10-0-1-23.ap-northeast-2.compute.internal"}}
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `kind` | `Binding` | 객체를 다른 객체에 묶는 API 타입 | |
| `metadata.name` / `namespace` | Pod 이름 / ns | 바인딩할 Pod | E.G. |
| `metadata.uid` | Pod UID | UID precondition으로 다른 Pod에 잘못 쓰는 것을 막음 | E.G. |
| `target.kind` | `Node` | 대상 종류 | |
| `target.name` | `ip-10-0-1-23.…compute.internal` | 선택된 노드 | E.G. |
| (결과) `spec.nodeName` | 노드 이름 | API server가 Pod에 기록 | E.G. |
| (결과) `status.conditions[PodScheduled]` | `True` | 같은 `GuaranteedUpdate`에서 설정 | |

Sources: [default_binder.go](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/framework/plugins/defaultbinder/default_binder.go#L51-L70), [types.go Binding](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/core/v1/types.go#L7197-L7207), [pod storage BindingREST](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/registry/core/pod/storage/storage.go#L213-L266) — Kubernetes v1.36.2. The scheduler's client Content-Type is shown as protobuf; that is **unverified** for this pass (JSON body shown for readability). The EKS node name format `ip-<a-b-c-d>.<region>.compute.internal` is **unverified** here; mark E.G.

#### R6. CRI `RunPodSandboxRequest` (step 2.14) — layer bar: config.metadata | config (hostname, log, dns, ports, labels, annotations) | config.linux | runtime_handler
```text
runtime.v1.RuntimeService/RunPodSandbox
RunPodSandboxRequest {
  config: PodSandboxConfig {
    metadata { name: "web-6b7f9c5d8-x2k9p"  uid: "c7e2b1f0-…"  namespace: "default"  attempt: 0 }
    hostname: "web-6b7f9c5d8-x2k9p"
    log_directory: "/var/log/pods/default_web-6b7f9c5d8-x2k9p_c7e2b1f0-…/"
    dns_config { servers: ["172.20.0.10"]  searches: ["default.svc.cluster.local", "svc.cluster.local", "cluster.local", "ap-northeast-2.compute.internal"]  options: ["ndots:5"] }
    port_mappings: []
    labels { "io.kubernetes.pod.name": "web-6b7f9c5d8-x2k9p", "io.kubernetes.pod.namespace": "default", "io.kubernetes.pod.uid": "c7e2b1f0-…", "app": "web", "pod-template-hash": "6b7f9c5d8" }
    annotations { "kubernetes.io/config.source": "api", … }
    linux { cgroup_parent: "/kubepods/burstable/podc7e2b1f0-…"  security_context { … }  sysctls {}  overhead {}  resources { … } }
  }
  runtime_handler: ""
}
→ RunPodSandboxResponse { pod_sandbox_id: "3b1f…e9" }
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `config.metadata.name` / `uid` / `namespace` | Pod 값 그대로 | sandbox 식별 | E.G. |
| `config.metadata.attempt` | `0` | sandbox 생성 시도 번호 | |
| `config.hostname` | Pod 이름 | sandbox hostname | E.G. |
| `config.log_directory` | `/var/log/pods/<NAMESPACE>_<NAME>_<UID>/` | 컨테이너 로그 디렉터리 (proto 주석의 형식) | E.G. |
| `config.dns_config.servers` | `172.20.0.10` | cluster DNS Service IP | E.G. / unverified |
| `config.port_mappings` | `[]` | hostPort 없음 | |
| `config.labels` | `io.kubernetes.pod.*` + Pod labels | 런타임에서 sandbox 선택용 | E.G. / unverified keys |
| `config.linux.cgroup_parent` | `/kubepods/burstable/pod<uid>` | QoS별 부모 cgroup | E.G. / unverified |
| `runtime_handler` | `""` | 빈 값 = 기본 handler (RuntimeClass 없음) | |
| `pod_sandbox_id` (response) | 64-hex ID | 이후 `CreateContainer`에 쓰는 ID | E.G. |

Sources: [api.proto PodSandboxMetadata … RunPodSandboxResponse](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L542-L618), [api.proto DNSConfig/PortMapping](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L268-L300), [api.proto LinuxPodSandboxConfig](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L523-L536) — Kubernetes v1.36.2. Field names are verified; the values for DNS server, search list, `ndots:5`, label keys, annotation keys, and cgroup path are **unverified** in this pass (they come from kubelet code not checked here) — mark E.G.

#### R7. Pod spec/status fields that change (steps 2.12–2.17) — layer bar: spec.nodeName | status.conditions | status.podIP(s) | status.containerStatuses
```yaml
spec:
  nodeName: ip-10-0-1-23.ap-northeast-2.compute.internal   # written by Binding (2.12)
status:
  phase: Running
  hostIP: 10.0.1.23
  podIP: 10.0.1.57
  podIPs: [{ip: 10.0.1.57}]
  startTime: "2026-11-03T12:00:02Z"
  conditions:
  - {type: PodScheduled,              status: "True", lastTransitionTime: "2026-11-03T12:00:01Z"}
  - {type: PodReadyToStartContainers, status: "True", lastTransitionTime: "2026-11-03T12:00:02Z"}
  - {type: Initialized,               status: "True", lastTransitionTime: "2026-11-03T12:00:02Z"}
  - {type: ContainersReady,           status: "True", lastTransitionTime: "2026-11-03T12:00:04Z"}
  - {type: Ready,                     status: "True", lastTransitionTime: "2026-11-03T12:00:04Z"}
  containerStatuses:
  - name: web
    image: registry.example.com/web:1.0.0
    imageID: registry.example.com/web@sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
    containerID: containerd://8c2d…a1
    ready: true
    started: true
    restartCount: 0
    state:
      running: {startedAt: "2026-11-03T12:00:04Z"}
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `spec.nodeName` | 노드 이름 | binding 결과 | E.G. |
| `status.phase` | `Running` | bound + 모든 container 생성 + 하나 이상 실행 | |
| `status.conditions[].type` | 5개 lifecycle condition | 대략 이 순서로 켜짐 | |
| `status.conditions[].lastTransitionTime` | 시각 | 마지막 상태 전이 시각 | E.G. |
| `status.podIP` / `podIPs` | `10.0.1.57` | VPC CNI가 준 VPC 주소 (sandbox network status) | E.G. |
| `status.hostIP` | `10.0.1.23` | 노드 IP | E.G. |
| `status.containerStatuses[].containerID` | `containerd://…` | 런타임 이름 + container ID | E.G. |
| `status.containerStatuses[].state.running.startedAt` | 시각 | 컨테이너 시작 시각 | E.G. |
| `status.containerStatuses[].ready` | `true` | readiness (probe 없으면 시작 즉시) | |
| `status.containerStatuses[].restartCount` | `0` | 재시작 횟수 | |

Sources: [pod-condition.md lifecycle conditions](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-condition.md#L40-L64), [pod-lifecycle.md phases](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L114-L115), [pod-lifecycle.md condition fields](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L620-L630) — Kubernetes 1.36 docs; [BindingREST](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/registry/core/pod/storage/storage.go#L213-L266), [CRI PodSandboxNetworkStatus](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/cri-api/pkg/apis/runtime/v1/api.proto#L648-L653) — Kubernetes v1.36.2. Field names `hostIP`, `podIPs`, `startTime`, `imageID`, `containerID`, `started` are standard core/v1 `PodStatus`/`ContainerStatus` fields; their lines in `types.go` were **not anchored** in this pass — anchor before shipping.

### Self-check
1. **Q.** EKS에서 `kubectl`이 보내는 bearer token의 정체는? 어디서 검증되나요? **A.** `aws eks get-token`이 STS `GetCallerIdentity` 요청(`x-k8s-aws-id: <cluster>` 포함)을 presign한 URL을 base64url로 인코딩하고 `k8s-aws-v1.`을 붙인 값이다. API server가 `TokenReview` webhook으로 control plane의 AWS IAM Authenticator에 넘기고, authenticator가 STS에 제출해 ARN을 얻은 뒤 access entry(또는 `aws-auth`)로 username/group을 매핑한다. 유효 기간은 15분.
2. **Q.** 401과 403은 각각 어느 단계에서 나오고, admission은 읽기 요청에도 동작하나요? **A.** 401은 authentication 실패, 403은 모든 authorizer가 허용하지 않을 때(authorization). admission은 create/update/delete/connect에만 동작하고 get/list/watch는 거치지 않는다. 순서는 mutating → validating이며 하나라도 거부하면 즉시 실패한다.
3. **Q.** Deployment `web`(namespace `default`)의 etcd key는? EKS에서 그 값은 어떻게 생겼나요? **A.** `/registry/deployments/default/web`. 기본 저장 형식은 `k8s\x00` magic + `runtime.Unknown`(typeMeta, raw) protobuf이고, EKS는 KMS v2 기본 envelope encryption이라 저장된 값은 `k8s:enc:kms:v2:`로 시작하는 암호문이다.
4. **Q.** `pod-template-hash`는 누가, 어떻게, 왜 붙이나요? **A.** Deployment controller가 Pod template을 FNV-32a로 해시(+`collisionCount`)해 안전 문자로 인코딩한 값을 ReplicaSet 이름, selector, template label에 넣는다. 같은 Deployment의 여러 ReplicaSet이 서로의 Pod를 잡지 않게 하려는 것이다.
5. **Q.** scheduler는 노드 선택 결과를 어떻게 기록하고, 이때 무엇이 바뀌나요? **A.** `pods/<name>/binding`에 `Binding{target: Node/<name>}`을 POST한다. API server `BindingREST`가 `GuaranteedUpdate`로 `spec.nodeName`을 쓰고 같은 쓰기에서 `PodScheduled=True`를 넣는다. 이미 `nodeName`이 있거나 삭제 중이거나 `schedulingGates`가 있으면 거부한다.
6. **Q.** kubelet이 Pod를 받은 뒤 IP가 붙기까지의 호출 순서는? **A.** kubelet이 `spec.nodeName` field selector watch로 Pod를 받음 → CRI `RunPodSandbox`(containerd, `/run/containerd/containerd.sock`) → containerd가 CNI ADD로 `aws-cni` 실행 → plugin이 `/var/run/aws-node/ipamd.sock`으로 ipamd `AddNetwork` → warm pool IP 배정 → `PodReadyToStartContainers=True` → `PullImage`/`CreateContainer`/`StartContainer` → status PATCH로 `podIP`, `Ready`.

### Unverified / open (this lesson)
- EKS 내부 구성은 볼 수 없다: EKS의 kube-apiserver가 upstream 기본값(`--etcd-prefix=/registry`, protobuf storage, default scheduler plugin set/weights)을 그대로 쓰는지는 **unverified**. lesson에서는 "upstream 기본값"이라고 표시해야 한다.
- EKS가 control plane에서 실행하는 AWS IAM Authenticator의 버전과 access entry 인가가 어떤 authorizer(webhook인지 등)로 구현되는지, 그리고 Node/RBAC와의 순서는 **unverified**.
- EKS cluster endpoint host 형식(`<id>.gr7.<region>.eks.amazonaws.com`)과 EC2 노드 이름 형식(`ip-…​.<region>.compute.internal`)은 이번 pass에서 pinned line으로 확인하지 못함 → E.G.로만 사용.
- EKS AL2023 AMI의 containerd 버전과 sandbox(pause) image 값은 **unverified**. containerd가 CNI를 호출하는 코드 위치(containerd 저장소)도 pin하지 않았다; 현재는 Kubernetes network-plugins 문서의 "runtime이 CNI를 load한다"만 근거.
- R6의 DNS server(`172.20.0.10`), search domain, `ndots:5`, sandbox label/annotation key, cgroup_parent 형식은 kubelet 코드에서 확인하지 않음 → E.G.
- R4의 `schedulerName`/`defaultMode: 420`/mountPath 기본값, R7의 `PodStatus` 필드 line anchor는 확인 전.
- R1 `fieldsV1`의 list key 표기(`k:{"name":"web"}`)는 실제 출력으로 확인 필요.
- scheduler client가 Binding을 protobuf로 보내는지 JSON으로 보내는지 **unverified**.
- event log의 크기와 시간은 모두 E.G.; 실측값 없음.
- `kubectl` 기본(client-side) apply를 쓸 때는 `kubectl.kubernetes.io/last-applied-configuration` annotation이 붙고 신규 객체는 POST로 생성된다는 흐름은 이번 lesson에서 다루지 않음(Server-Side Apply로 통일). 대안 lesson 분기로 쓸지 owner 결정 필요.

## Lesson 3 — `vpc-cni`: Pod 하나가 VPC IP를 받기까지 (Amazon VPC CNI)

**Goal.** m5.large 노드 하나에서 `aws-node`(CNI binary + `ipamd`)가 ENI와 secondary IP로 warm pool을 만들고, Pod 하나에 VPC IP를 붙이고, pool이 줄면 새 ENI를 붙이고, 그 결과 max Pods가 29가 되는 과정을 따라갑니다.

**Interview questions it answers.**
- EKS에서 Pod IP는 어디서 오나요? overlay network와 무엇이 다른가요?
- `ipamd`의 warm pool은 무엇이고, `WARM_ENI_TARGET`, `WARM_IP_TARGET`, `MINIMUM_IP_TARGET`은 언제 무엇을 바꾸나요?
- m5.large의 max Pods는 왜 29인가요? `+2`는 무엇인가요? prefix delegation을 켜면 몇이 되나요?
- Pod가 `ContainerCreating`에서 IP를 못 받는다면 어디를 보나요? (subnet IP 고갈, `/28` 단편화, EC2 API throttling)
- Pod가 인터넷으로 나갈 때 source IP는 무엇이고, `AWS_VPC_K8S_CNI_EXTERNALSNAT=true`는 무엇을 바꾸나요?

**Scenario (all E.G.).** EKS 1.36 managed node group, AL2023, `m5.large`, VPC CNI add-on `v1.23.1-eksbuild.1` with default settings (`WARM_ENI_TARGET=1`, prefix delegation off). VPC `10.0.0.0/16`, node subnet `10.0.64.0/19` (gateway `10.0.64.1`), instance `i-0abc1234def567890`, node primary IP `10.0.64.10`. EC2 picks secondary IPs anywhere in the subnet, so the IPs below are illustrative and not contiguous in real runs.

**Pins.** See "Version pins" at the top of this plan.

### Nodes
| id | label / sublabel | kind | layer | appears at step | isometric illustration idea |
|---|---|---|---|---|---|
| node | EC2 worker node / `m5.large` | container | AWS | 3.1 | Server box on a rack plate, three network-card slots on its side (slot 0 lit, 1–2 dark) |
| eni0 | ENI `eth0` / DeviceIndex 0 (primary) | storage (proposed kind: cloud) | AWS | 3.1 | Flat NIC card plugged in slot 0, 10 small address pins on its edge; the first pin (primary IP) is painted solid |
| imds | IMDS / `169.254.169.254` | framework (proposed kind: cloud) | AWS | 3.2 | Small kiosk next to the node with a card-reader slot |
| ec2api | EC2 API / `ec2.<region>.amazonaws.com` | framework (proposed kind: cloud) | AWS | 3.3 | AWS-region building with a service window labelled "EC2" |
| ipamd | `ipamd` / `aws-node` DaemonSet (`aws-k8s-agent`) | framework | Node | 3.2 | Pegboard with tagged IP chips hanging on hooks, one row per ENI |
| containerd | containerd / CRI runtime | container | Node | 3.6 | Shipping-container stack with a small CNI plug socket on its side |
| cni | `aws-cni` / `/opt/cni/bin/aws-cni` | framework | Node | 3.6 | A plug-shaped binary with a short cable going to the Pod |
| pod | Pod `default/web-0` | app | Workload | 3.6 | Translucent pod capsule with one `eth0` port |
| kubelet | kubelet / `maxPods` | container | Node | 3.14 | Ship's wheel with a capacity gauge "pods 29" |
| eni1 | ENI `eth1` / DeviceIndex 1 | storage (proposed kind: cloud) | AWS | 3.12 | Second NIC card sliding into slot 1 |
| internet | 외부 endpoint / `203.0.113.10` | client | AWS | 3.16 | Globe on a pedestal at the edge of the VPC floor |

### State panels
| node | title | view | initial content |
|---|---|---|---|
| ipamd | warm pool (datastore) | table: `ENI`, `device`, `IP`, `Pod` | empty |
| node | ENI / routing on the host | list | `eth0 eni-0a1b2c3d4e5f60001 10.0.64.10 (primary IP, device 0)` |
| kubelet | node capacity | table: `field`, `value` | `status.capacity.pods` = (not set yet) |

### Steps

#### 3.1 `boot-primary-eni` — 노드가 primary ENI 하나로 부팅  ·  `mutate` node
- **Subtitle:** 시작 시점에는 ENI 하나, IP 하나뿐입니다.
- **Prose:**
  > EC2 instance는 primary ENI(`eth0`, DeviceIndex 0) 하나와 그 ENI의 primary IP로 시작합니다.
  > `m5.large`는 ENI를 최대 3개, ENI마다 IPv4를 최대 10개까지 가질 수 있습니다.
  > 각 ENI의 첫 번째(primary) IP는 Pod에 주지 않습니다. 노드 자신의 주소이기 때문입니다.
  > 그래서 Pod에 줄 수 있는 IP는 ENI마다 `10 − 1 = 9`개입니다.
- **Facts:**
  | key | value |
  |---|---|
  | `m5.large` ENILimit | `3` |
  | `m5.large` IPv4Limit (per ENI) | `10` |
  | Pod용 IP per ENI | `IPv4Limit − 1` = `9` |
  | HypervisorType | `nitro` |
- **Event log:** `node → eni0 · EC2 · RunInstances: primary ENI eth0 attached, 10.0.64.10 · —`
- **State:** node list: (empty) → `eth0 eni-0a1b2c3d4e5f60001 10.0.64.10 (primary, device 0)` (E.G.)
- **Sources:**
  - [vpc_ip_resource_limit.go: `"m5.large"` limits](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/vpc/vpc_ip_resource_limit.go#L7369-L7381) — Amazon VPC CNI v1.23.1
  - [awsutils.go `GetENIIPv4Limit()`: primary IP 제외](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L1970-L1977) — Amazon VPC CNI v1.23.1
  - [cni-proposal.md: one primary address per ENI is not used by Pods](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/cni-proposal.md#L40-L44) — Amazon VPC CNI v1.23.1
  - [README: ENI Allocation — node joins with 1 ENI](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L81-L84) — Amazon VPC CNI v1.23.1

#### 3.2 `ipamd-start` — `aws-node`가 뜨고 `ipamd`가 ENI를 읽음  ·  `move` ipamd → imds, token `call`: `GET /latest/meta-data/network/interfaces/macs/`
- **Subtitle:** `aws-node` DaemonSet Pod가 hostNetwork로 뜨고, `ipamd`가 붙은 ENI를 IMDS에서 확인합니다.
- **Prose:**
  > VPC CNI는 두 부분입니다. kubelet 쪽 runtime이 부르는 CNI binary(`/opt/cni/bin/aws-cni`)와, 노드마다 하나씩 도는 IPAM daemon `ipamd`입니다.
  > `ipamd`는 `aws-node` DaemonSet의 `aws-node` container 안에서 `aws-k8s-agent`로 실행됩니다.
  > init container `aws-vpc-cni-init`이 CNI binary를 host의 `/opt/cni/bin`에 복사합니다.
  > `ipamd`는 instance metadata(IMDS)에서 붙어 있는 ENI와 IP 목록을 읽고, 이미 떠 있는 Pod 정보와 합쳐 warm pool을 만듭니다.
- **Facts:**
  | key | value |
  |---|---|
  | DaemonSet | `kube-system/aws-node`, `hostNetwork: true`, `priorityClassName: system-node-critical` |
  | images | `amazon-k8s-cni-init:v1.23.1`, `amazon-k8s-cni:v1.23.1`, `aws-network-policy-agent:v1.4.2` |
  | host mounts | `/opt/cni/bin`, `/etc/cni/net.d`, `/var/run/aws-node`, `/var/log/aws-routed-eni` |
  | IAM | IPv4 cluster: `AmazonEKS_CNI_Policy` (node role 또는 별도 role) |
- **Event log:** `ipamd → imds · HTTP (IMDS) · GET /latest/meta-data/network/interfaces/macs/ → 1 MAC · —`
- **Sources:**
  - [README: Components (CNI plugin + ipamd)](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L45-L52) — Amazon VPC CNI v1.23.1
  - [eni-and-ip-target.md: `/opt/cni/bin/aws-cni` and `ipamd` in daemonset `aws-node`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/eni-and-ip-target.md#L3-L5) — Amazon VPC CNI v1.23.1
  - [aws-k8s-cni.yaml: DaemonSet `aws-node`, hostNetwork, init container](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/config/master/aws-k8s-cni.yaml#L161-L191) — Amazon VPC CNI v1.23.1
  - [aws-k8s-cni.yaml: containers and images](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/config/master/aws-k8s-cni.yaml#L212-L213) and [L316-L317](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/config/master/aws-k8s-cni.yaml#L316-L317) — Amazon VPC CNI v1.23.1
  - [aws-k8s-cni.yaml: hostPath volumes](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/config/master/aws-k8s-cni.yaml#L359-L376) — Amazon VPC CNI v1.23.1
  - [main.go: starts `./aws-k8s-agent`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/aws-vpc-cni/main.go#L432-L445) — Amazon VPC CNI v1.23.1
  - [cni-proposal.md: L-IPAM learns ENIs/IPs from IMDS and running Pods](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/cni-proposal.md#L188-L204) — Amazon VPC CNI v1.23.1
  - [cni-iam-role.adoc: `AmazonEKS_CNI_Policy`, service account `aws-node`](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/cni-iam-role.adoc#L22-L23) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 3.3 `assign-secondary` — primary ENI에 secondary IP 9개 요청  ·  `move` ipamd → ec2api, token `call`: `AssignPrivateIpAddresses`
- **Subtitle:** `ipamd`가 EC2 API로 primary ENI를 secondary IP로 채웁니다.
- **Prose:**
  > pool이 비어 있으므로 `ipamd`는 먼저 기존 ENI에 IP를 더 붙여 봅니다.
  > prefix delegation이 꺼져 있으면 `AssignPrivateIpAddresses`에 `SecondaryPrivateIpAddressCount`를 넣어 부릅니다.
  > 요청 개수는 ENI에 남은 자리(`9 − 현재 개수`)만큼입니다. `WARM_IP_TARGET`이 없으면 ENI를 끝까지 채웁니다.
  > 이 EC2 호출은 VPC subnet에서 실제 주소를 떼어 옵니다. subnet이 작으면 여기서 IP가 고갈됩니다.
- **Facts:**
  | key | value |
  |---|---|
  | API | `ec2:AssignPrivateIpAddresses` |
  | 요청 field | `NetworkInterfaceId`, `SecondaryPrivateIpAddressCount=9` |
  | PD 모드일 때 | `Ipv4PrefixCount` 를 대신 사용 |
  | 순서 | 기존 ENI에 IP 추가 시도 → 실패/여유 없음이면 새 ENI |
- **Event log:** `ipamd → ec2api · EC2 API (HTTPS) · AssignPrivateIpAddresses eni-0a1b2c3d4e5f60001 count=9 · —`
- **Sources:**
  - [awsutils.go `AllocIPAddresses()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L2044-L2077) — Amazon VPC CNI v1.23.1
  - [ipamd.go `tryAssignIPs()`: fill the ENI up to `maxIPsPerENI`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L1115-L1135) — Amazon VPC CNI v1.23.1
  - [ipamd.go `increaseDatastorePool()`: try existing ENIs first, then a new ENI](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L968-L1010) — Amazon VPC CNI v1.23.1

#### 3.4 `pool-ready` — warm pool 9칸 준비  ·  `mutate` ipamd
- **Subtitle:** Pod가 없어도 IP 9개가 미리 노드에 붙어 있습니다.
- **Prose:**
  > EC2가 IP를 붙이면 `ipamd`는 datastore에 `/32` 항목 9개를 만들고 모두 "free"로 둡니다.
  > 기본값 `WARM_ENI_TARGET=1`은 "ENI 하나 분량의 free IP"를 늘 유지하라는 뜻입니다.
  > 지금 free는 9이고 목표는 `9 × 1 = 9`이므로 pool이 부족하지 않습니다. 새 ENI는 아직 붙이지 않습니다.
  > `ipamd`는 약 5초마다 pool을 다시 계산합니다.
- **Facts:**
  | key | value |
  |---|---|
  | `WARM_ENI_TARGET` | default `1` |
  | too-low 조건 | `available < maxIPsPerENI × WARM_ENI_TARGET` |
  | pool check 주기 | `ipPoolMonitorInterval = 5s` |
  | datastore checkpoint | `/var/run/aws-node/ipam.json` |
- **Event log:** `ec2api → ipamd · EC2 API · AssignedPrivateIpAddresses ×9 → datastore +9 free · —`
- **State:** ipamd pool: (empty) →
  | ENI | device | IP | Pod |
  |---|---|---|---|
  | eni-…0001 | 0 | 10.0.64.21 | — |
  | eni-…0001 | 0 | 10.0.64.37 | — |
  | … (7 more) | 0 | … | — |
- **Record:** R2
- **Sources:**
  - [README: `WARM_ENI_TARGET` default 1](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L277-L293) — Amazon VPC CNI v1.23.1
  - [ipamd.go `isDatastorePoolTooLow()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L2623-L2656) — Amazon VPC CNI v1.23.1
  - [ipamd.go: `ipPoolMonitorInterval`, `decreaseIPPoolInterval`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L60-L64) — Amazon VPC CNI v1.23.1
  - [ipamd.go: `defaultBackingStorePath`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L139) — Amazon VPC CNI v1.23.1
  - [eni-and-ip-target.md: t3.small 0 Pods → 1 ENI, 3 secondary IPs](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/eni-and-ip-target.md#L20-L24) — Amazon VPC CNI v1.23.1

#### 3.5 `conflist` — CNI 설정 파일이 host에 놓임  ·  `mutate` node
- **Subtitle:** `ipamd`가 gRPC health check를 통과한 뒤에야 `10-aws.conflist`가 생깁니다.
- **Prose:**
  > `aws-node` entrypoint는 `ipamd`를 띄우고 `grpc-health-probe`로 `unix:///var/run/aws-node/ipamd.sock`을 확인합니다.
  > 응답이 오면 `10-aws.conflist`를 만들어 host의 `/etc/cni/net.d/`에 복사합니다.
  > Kubernetes 1.24부터 CNI 설정을 읽고 plugin을 부르는 주체는 kubelet이 아니라 container runtime(containerd)입니다.
  > conflist는 `aws-cni` → `egress-cni` → `portmap` 세 plugin을 chain으로 묶습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 파일 | `/etc/cni/net.d/10-aws.conflist` |
  | `cniVersion` | `0.4.0` |
  | plugin chain | `aws-cni`, `egress-cni`, `portmap` |
  | 기본 veth prefix | `eni` (`AWS_VPC_K8S_CNI_VETHPREFIX`) |
- **Event log:** `ipamd → node · file write · /etc/cni/net.d/10-aws.conflist (cniVersion 0.4.0) · —`
- **State:** node list: + `/etc/cni/net.d/10-aws.conflist`
- **Sources:**
  - [main.go `waitForIPAM()` (grpc-health-probe on ipamd.sock)](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/aws-vpc-cni/main.go#L182-L185) — Amazon VPC CNI v1.23.1
  - [main.go: wait for IPAM, then copy conflist](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/aws-vpc-cni/main.go#L447-L466) — Amazon VPC CNI v1.23.1
  - [misc/10-aws.conflist](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/misc/10-aws.conflist#L1-L38) — Amazon VPC CNI v1.23.1
  - [README: `AWS_VPC_K8S_CNI_VETHPREFIX` default `eni`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L436-L442) — Amazon VPC CNI v1.23.1
  - [network-plugins.md: runtime loads CNI; kubelet flags removed in 1.24](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins.md#L33-L41) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 3.6 `cni-add` — containerd가 `aws-cni ADD`를 실행  ·  `move` containerd → cni, token `call`: `CNI_COMMAND=ADD`
- **Subtitle:** Pod sandbox를 만들 때 runtime이 CNI binary를 환경변수와 stdin으로 부릅니다.
- **Prose:**
  > scheduler가 `default/web-0`를 이 노드에 배정하면 kubelet이 CRI로 Pod sandbox 생성을 요청합니다.
  > containerd는 network namespace를 만들고 conflist의 첫 plugin `aws-cni`를 exec합니다.
  > 어떤 Pod인지는 `CNI_CONTAINERID`, `CNI_NETNS`, `CNI_IFNAME`과 `CNI_ARGS`의 `K8S_POD_NAME`, `K8S_POD_NAMESPACE`로 전달됩니다.
- **Facts:**
  | key | value |
  |---|---|
  | `CNI_COMMAND` | `ADD` (그 외 `DEL`, `CHECK`, `VERSION`) |
  | `CNI_IFNAME` | `eth0` (E.G.) |
  | `CNI_NETNS` | `/var/run/netns/cni-…` (E.G.) |
  | 상태 키 | `(network name, CNI_CONTAINERID, CNI_IFNAME)` |
- **Event log:** `containerd → cni · CNI exec · ADD default/web-0 netns=/var/run/netns/cni-5f2c… ifname=eth0 · —`
- **Record:** R3 (input half)
- **Sources:**
  - [CNI SPEC.md v0.4.0: parameters `CNI_COMMAND`…`CNI_PATH`](https://github.com/containernetworking/cni/blob/spec-v0.4.0/SPEC.md#L136-L141) — CNI spec v0.4.0
  - [CNI SPEC.md v0.4.0: state keyed by network name, container ID, ifname](https://github.com/containernetworking/cni/blob/spec-v0.4.0/SPEC.md#L48) — CNI spec v0.4.0
  - [cni.go `add()`: reads `K8S_POD_NAME`, `K8S_POD_NAMESPACE`, `Netns`, `IfName`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L200-L211) — Amazon VPC CNI v1.23.1
  - [network-plugins.md: runtime loads CNI plugins](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins.md#L33-L41) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 3.7 `add-network` — CNI binary가 `ipamd`에 IP를 요청  ·  `move` cni → ipamd, token `request`: `AddNetwork`
- **Subtitle:** 짧게 사는 CNI binary는 IP를 직접 고르지 않고 `ipamd`에 gRPC로 묻습니다.
- **Prose:**
  > `aws-cni`는 Unix domain socket `/var/run/aws-node/ipamd.sock`으로 `ipamd`에 연결합니다.
  > `AddNetworkRequest`에는 Pod 이름, namespace, container ID, netns, ifname이 들어갑니다.
  > warm pool에 free IP가 없으면 `ipamd`는 바로 오류를 돌려주고 Pod는 sandbox 생성에 실패합니다.
  > 그래서 EC2 API 호출을 Pod 생성 경로에서 빼고 미리 pool을 채워 두는 것입니다.
- **Facts:**
  | key | value |
  |---|---|
  | transport | gRPC over `unix:///var/run/aws-node/ipamd.sock` |
  | RPC | `CNIBackend.AddNetwork` |
  | pool 비었을 때 | 오류 반환 (`failed to assign an IP address to container`) |
- **Event log:** `cni → ipamd · gRPC (unix socket) · AddNetwork default/web-0 · —`
- **Sources:**
  - [cni.go: `ipamdSocketPath`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L47-L50) — Amazon VPC CNI v1.23.1
  - [cni.go `dialIPAMD()` and `AddNetwork` call](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L139-L222) — Amazon VPC CNI v1.23.1
  - [eni-and-ip-target.md: gRPC to ipamd; error if no IP in cache](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/eni-and-ip-target.md#L7-L11) — Amazon VPC CNI v1.23.1
  - [rpc_handler.go: `ipamdGRPCSocketPath`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/rpc_handler.go#L47) — Amazon VPC CNI v1.23.1

#### 3.8 `assign-ip` — pool에서 IP 하나를 Pod에 배정  ·  `mutate` ipamd
- **Subtitle:** `10.0.64.21`이 `default/web-0`의 것이 됩니다.
- **Prose:**
  > `ipamd`는 free IP 하나를 골라 `IPAMKey`(network name, container ID, ifname)와 Pod 이름·namespace를 기록합니다.
  > 응답에는 IP와 함께 그 IP가 속한 ENI의 device number와 host route table 번호가 들어갑니다.
  > primary ENI(device 0)의 IP는 route table `main`을 씁니다.
  > 나중에 Pod가 지워지면 이 IP는 바로 재사용되지 않고 30초 cooldown을 거칩니다.
- **Facts:**
  | key | value |
  |---|---|
  | 응답 field | `IPv4Addr`, `DeviceNumber`, `RouteTableId` |
  | route table | device 0 → `main`, device N (card 0) → `N + 1` |
  | `IP_COOLDOWN_PERIOD` | default `30` (초) |
  | free 남은 수 | 9 → 8 |
- **Event log:** `ipamd → cni · gRPC · AddNetworkReply 10.0.64.21 device=0 table=main · —`
- **State:** ipamd pool: row `eni-…0001 | 0 | 10.0.64.21 | —` → `eni-…0001 | 0 | 10.0.64.21 | default/web-0`
- **Record:** R2
- **Sources:**
  - [data_store.go: `IPAMKey`, `IPAMMetadata`, `AddressInfo`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/datastore/data_store.go#L89-L147) — Amazon VPC CNI v1.23.1
  - [rpc_handler.go: `IPAllocationMetadata{IPv4Addr, DeviceNumber, RouteTableId}`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/rpc_handler.go#L230-L250) — Amazon VPC CNI v1.23.1
  - [helper.go `CalculateRouteTableId()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/helper.go#L18-L26) — Amazon VPC CNI v1.23.1
  - [README: `IP_COOLDOWN_PERIOD` default 30](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L715-L723) — Amazon VPC CNI v1.23.1

#### 3.9 `wire-veth` — veth와 route, `ip rule`을 깖  ·  `mutate` node
- **Subtitle:** bridge도 overlay도 없이, `/32` 주소와 host route로 Pod를 연결합니다.
- **Prose:**
  > `aws-cni`는 veth pair를 만들어 한쪽(`eth0`)을 Pod netns에, 다른 쪽(`eni0d7763386da`)을 host에 둡니다.
  > Pod 안에는 `10.0.64.21/32`와 `default via 169.254.1.1 dev eth0`이 들어갑니다. `169.254.1.1`은 실제로 없는 가짜 next hop입니다.
  > host에는 `10.0.64.21 dev eni0d7763386da scope link` route와 priority `512` rule(`to 10.0.64.21 lookup main`)이 생깁니다.
  > IP가 secondary ENI 소속이면 priority `1536` rule(`from <podIP> lookup <table>`)도 추가됩니다. 지금은 primary ENI라 없습니다.
- **Facts:**
  | key | value |
  |---|---|
  | host veth 이름 | `eni` + `sha1("<ns>.<pod>")[:11]` → `eni0d7763386da` |
  | Pod gateway | `169.254.1.1` (index 0일 때 `169.254.1.(index+1)`) |
  | to-Pod rule | priority `512`, table `main` |
  | from-Pod rule | priority `1536`, table ≠ main일 때만 |
- **Event log:** `cni → pod · netlink · veth eni0d7763386da↔eth0, 10.0.64.21/32, rule 512 · —`
- **State:** node list: + `route 10.0.64.21 dev eni0d7763386da scope link` + `rule 512: from all to 10.0.64.21 lookup main`
- **Record:** R4
- **Sources:**
  - [names.go `GeneratePodHostVethName()` (sha1, 11 hex)](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/names.go#L12-L26) — Amazon VPC CNI v1.23.1
  - [driver.go: Pod default route via dummy next hop](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/driver/driver.go#L188-L191) and [L241-L250](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/driver/driver.go#L241-L250) — Amazon VPC CNI v1.23.1
  - [helper.go `CalculatePodIPv4GatewayIP()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/helper.go#L28-L30) — Amazon VPC CNI v1.23.1
  - [driver.go `setupIPBasedContainerRouteRules()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/driver/driver.go#L526-L563) — Amazon VPC CNI v1.23.1
  - [network.go: rule priority constants](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L53-L80) — Amazon VPC CNI v1.23.1

#### 3.10 `cni-result` — CNI result가 runtime으로 돌아감  ·  `move` cni → containerd, token `response`: `Result{ips: 10.0.64.21/32}`
- **Subtitle:** stdout JSON 한 덩어리로 "어느 interface에 어떤 IP를 줬는지" 알립니다.
- **Prose:**
  > CNI plugin은 성공하면 exit code 0과 함께 result JSON을 stdout에 씁니다.
  > `interfaces`에는 host veth, Pod 안의 `eth0`, 정리용 `dummy…` interface가 들어가고, `ips[].interface`가 그중 Pod 쪽 index를 가리킵니다.
  > containerd가 이 결과를 kubelet에 돌려주고, kubelet은 Pod `status.podIP` / `status.podIPs`를 API server에 보고합니다.
- **Facts:**
  | key | value |
  |---|---|
  | result `cniVersion` | `0.4.0` |
  | `ips[0].address` | `10.0.64.21/32` |
  | `ips[0].interface` | `1` (Pod `eth0`의 index) |
  | Pod status field | `status.podIP`, `status.podIPs[]` |
- **Event log:** `cni → containerd · CNI stdout · Result ips=[10.0.64.21/32] interfaces=3 · ~0.5 KB (E.G.)`
- **Record:** R3
- **Sources:**
  - [CNI SPEC.md v0.4.0: ADD result JSON](https://github.com/containernetworking/cni/blob/spec-v0.4.0/SPEC.md#L150-L186) — CNI spec v0.4.0
  - [cni.go: build `current.Result` (interfaces, ips, dummy)](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L229-L329) — Amazon VPC CNI v1.23.1
  - [core/v1 types.go: `PodIP`, `PodIPs`](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/core/v1/types.go#L5375-L5385) — Kubernetes v1.36.2

#### 3.11 `pool-low` — free 8 < 목표 9, pool 부족 판정  ·  `mutate` ipamd
- **Subtitle:** Pod 하나만 떠도 `WARM_ENI_TARGET=1`은 새 ENI를 원합니다.
- **Prose:**
  > free IP가 8이 되어 `8 < 9 × 1` 조건이 참이 됩니다. primary ENI에는 더 붙일 자리가 없으므로 다음 단계는 새 ENI입니다.
  > `WARM_IP_TARGET`을 설정하면 이 ENI 단위 계산 대신 "free IP N개"를 맞추고, `WARM_ENI_TARGET`은 무시됩니다.
  > `MINIMUM_IP_TARGET`은 노드에 붙일 IP 총량의 바닥값입니다. 둘을 함께 쓰는 것이 권장 조합입니다.
  > 다만 IP 단위로 붙였다 뗐다 하면 EC2 API 호출이 늘어 throttling 위험이 커집니다. 그래서 기본값이 ENI 단위입니다.
- **Facts:**
  | key | value |
  |---|---|
  | 판정 | `available 8 < 9 × WARM_ENI_TARGET 1` → low |
  | `WARM_IP_TARGET` 설정 시 | `short = max(WARM_IP_TARGET − available, MINIMUM_IP_TARGET − total, 0)` |
  | 우선순위 | `WARM_IP_TARGET`/`MINIMUM_IP_TARGET` 설정 시 `WARM_ENI_TARGET` 무시 |
  | max Pods 도달 시 | `TotalIPs >= maxPods`면 더 늘리지 않음 |
- **Event log:** `ipamd → ipamd · pool reconcile · available=8 total=9 → IsLow=true · ≤5 s`
- **State:** ipamd decision: `IsLow=false` → `IsLow=true`
- **Sources:**
  - [ipamd.go `isDatastorePoolTooLow()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L2623-L2656) — Amazon VPC CNI v1.23.1
  - [ipamd.go `datastoreTargetState()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L2177-L2207) — Amazon VPC CNI v1.23.1
  - [README: `WARM_IP_TARGET`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L295-L321) and [`MINIMUM_IP_TARGET`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L323-L346) — Amazon VPC CNI v1.23.1
  - [eni-and-ip-target.md: throttling risk, why `WARM_ENI_TARGET=1` is default](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/eni-and-ip-target.md#L45-L54) — Amazon VPC CNI v1.23.1

#### 3.12 `alloc-eni` — 새 ENI를 만들고 붙임  ·  `move` ipamd → ec2api, token `call`: `CreateNetworkInterface` + `AttachNetworkInterface`
- **Subtitle:** ENI 생성, attach, DeleteOnTermination 설정까지 EC2 API 세 번입니다.
- **Prose:**
  > `CreateNetworkInterface`는 노드의 security group, subnet, description `aws-K8S-<instance-id>`, tag와 함께 secondary IP 9개를 한 번에 요청합니다.
  > 이어서 빈 device number를 골라 `AttachNetworkInterface`(DeviceIndex 1)를 부르고, `ModifyNetworkInterfaceAttribute`로 `DeleteOnTermination=true`를 켭니다.
  > subnet discovery가 기본으로 켜져 있어, 노드 subnet과 `kubernetes.io/role/cni` tag가 붙은 subnet 중 free IP가 가장 많은 곳에 ENI를 만듭니다.
  > ENI를 만들고 붙이는 데 최대 10초쯤 걸릴 수 있습니다.
- **Facts:**
  | key | value |
  |---|---|
  | Description | `aws-K8S-i-0abc1234def567890` (prefix `aws-K8S-`) |
  | tags | `node.k8s.amazonaws.com/instance_id`, `node.k8s.amazonaws.com/createdAt`, `cluster.k8s.amazonaws.com/name` |
  | `ENABLE_SUBNET_DISCOVERY` | default `true` (v1.18.0+) |
  | 소요 | "up to 10 seconds" (문서 표현) |
- **Event log:** `ipamd → ec2api · EC2 API (HTTPS) · CreateNetworkInterface count=9 → AttachNetworkInterface DeviceIndex=1 → ModifyNetworkInterfaceAttribute DeleteOnTermination=true · up to 10 s`
- **Record:** R1
- **Sources:**
  - [awsutils.go: `eniDescriptionPrefix`, tag keys](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L62-L75) — Amazon VPC CNI v1.23.1
  - [awsutils.go `AllocENI()` (create → attach → DeleteOnTermination)](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L978-L1020) — Amazon VPC CNI v1.23.1
  - [awsutils.go `attachENI()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L1023-L1050) — Amazon VPC CNI v1.23.1
  - [awsutils.go `createENIInput()` (`SecondaryPrivateIpAddressCount` / `Ipv4PrefixCount`)](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L1069-L1095) — Amazon VPC CNI v1.23.1
  - [README: `ENABLE_SUBNET_DISCOVERY`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L547-L553) — Amazon VPC CNI v1.23.1
  - [eni-and-ip-target.md: attaching a new ENI can take up to 10 seconds](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/eni-and-ip-target.md#L52-L54) — Amazon VPC CNI v1.23.1

#### 3.13 `eni1-ready` — `eth1`과 route table 2가 생김  ·  `mutate` ipamd
- **Subtitle:** pool이 18칸(free 17)이 되고, 새 ENI용 policy routing이 깔립니다.
- **Prose:**
  > `ipamd`는 IMDS에서 새 ENI와 IP가 보일 때까지 기다린 뒤 datastore에 9칸을 더합니다.
  > host에는 route table `2`가 생깁니다: subnet gateway(`10.0.64.1`)로 가는 link route와 `default via 10.0.64.1 dev eth1`.
  > ENI 자신의 primary IP에는 priority `32765` rule이 붙습니다.
  > 이제 이 ENI의 IP를 받은 Pod는 `from <podIP> lookup 2`(priority 1536)로 `eth1`을 통해 나갑니다.
- **Facts:**
  | key | value |
  |---|---|
  | route table | device 1 → table `2` |
  | ENI gateway | subnet base + 1 → `10.0.64.1` |
  | ENI primary IP rule | priority `32765` |
  | pool | total 18, assigned 1, free 17 |
- **Event log:** `imds → ipamd · HTTP (IMDS) · eth1 MAC + 10 IPv4 visible → datastore +9 · —`
- **State:** ipamd pool: + 9 rows `eni-…0002 | 1 | 10.0.70.x | —` (E.G.); node list: + `eth1 eni-0a1b2c3d4e5f60002 (device 1, table 2)`
- **Record:** R2, R4
- **Sources:**
  - [awsutils.go `waitForENIAndIPsAttached()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L2120-L2125) — Amazon VPC CNI v1.23.1
  - [network.go `GetIPv4Gateway()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L935-L939) — Amazon VPC CNI v1.23.1
  - [network.go `setupENINetwork()`: table routes](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L1018-L1034) — Amazon VPC CNI v1.23.1
  - [network.go: rule for ENI primary IP (32765)](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L1082-L1088) — Amazon VPC CNI v1.23.1
  - [cni-proposal.md: per-ENI route table and `ip rule list`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/cni-proposal.md#L105-L121) — Amazon VPC CNI v1.23.1

#### 3.14 `max-pods` — 이 노드의 Pod 상한은 29  ·  `mutate` kubelet
- **Subtitle:** `3 × (10 − 1) + 2 = 29`. IP가 바닥나기 전에 scheduler가 먼저 막습니다.
- **Prose:**
  > AL2023의 `nodeadm`은 `ENI 수 × (ENI당 IPv4 − 1) + 2`로 kubelet `maxPods`를 정합니다. `m5.large`는 29입니다.
  > `+2`는 `aws-node`와 `kube-proxy`처럼 `hostNetwork`로 돌아 Pod IP를 쓰지 않는 Pod 몫입니다.
  > kubelet은 이 값을 `status.capacity.pods`로 보고하고, scheduler의 `NodeResourcesFit`는 30번째 Pod를 `Too many pods`로 거절합니다.
  > managed node group(custom AMI 없음)은 이 값에 상한을 씌웁니다: vCPU 30 미만은 110, 그 이상은 250.
- **Facts:**
  | key | value |
  |---|---|
  | formula | `ENIs × (IPv4 per ENI − 1) + 2` |
  | `m5.large` | `3 × 9 + 2 = 29` (eni-max-pods.txt: `m5.large 29`) |
  | kubelet default `maxPods` | `110` |
  | kube-reserved memory (nodeadm) | `11 × maxPods + 255` Mi → `574Mi` |
- **Event log:** `kubelet → apiserver · HTTPS REST · Node status capacity.pods=29 · —`
- **State:** kubelet table: `status.capacity.pods` = (not set) → `29`
- **Record:** R6
- **Sources:**
  - [misc/eni-max-pods.txt: formula header](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/misc/eni-max-pods.txt#L33-L37) and [`m5.large 29`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/misc/eni-max-pods.txt#L597) — Amazon VPC CNI v1.23.1
  - [choosing-instance-type.adoc: How maxPods is determined (precedence, 110/250 cap, `+2`)](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/choosing-instance-type.adoc#L60-L85) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [eni_max_pods.go `calculateStandardMaxPods()`](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/eni_max_pods.go#L56-L79) — amazon-eks-ami v20261031 (nodeadm)
  - [config.go: kube-reserved memory `11*maxPods + 255`](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/config.go#L462-L463) — amazon-eks-ami v20261031 (nodeadm)
  - [kubelet-config.v1beta1.md: `maxPods` default 110](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/config-api/kubelet-config.v1beta1.md#L1103-L1110) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [noderesources/fit.go: `Too many pods`](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/framework/plugins/noderesources/fit.go#L681-L690) — Kubernetes v1.36.2
  - [ipamd.go: ipamd reads `node.Status.Capacity.Pods()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L605-L628) — Amazon VPC CNI v1.23.1

#### 3.15 `prefix-mode` — prefix delegation이면 IP 대신 `/28`을 붙임  ·  `mutate` ipamd
- **Subtitle:** ENI 슬롯 하나에 IP 1개 대신 IP 16개(`/28`)가 들어갑니다.
- **Prose:**
  > `ENABLE_PREFIX_DELEGATION=true`(Nitro만)면 `ipamd`는 secondary IP 대신 `/28` prefix를 `Ipv4PrefixCount`로 요청합니다.
  > `m5.large`는 ENI당 9 슬롯 × 16 = 144 IP, 노드 전체 432 IP를 가질 수 있습니다. pool 단위는 `WARM_PREFIX_TARGET`(prefix 개수)입니다.
  > 하지만 managed node group은 vCPU 30 미만에서 `maxPods`를 110으로 묶으므로 실제 Pod 수는 110입니다.
  > subnet에 연속된 `/28`이 없으면 free IP가 있어도 `InsufficientCidrBlocks`로 실패합니다.
- **Facts:**
  | key | value |
  |---|---|
  | `ENABLE_PREFIX_DELEGATION` | default `false`, v1.9.0+ |
  | prefix 크기 | IPv4 `/28` = 16 IP (IPv6 `/80`) |
  | `WARM_PREFIX_TARGET` | README default None, 배포 manifest 값 `"1"` |
  | `m5.large` 용량 | 3 × 9 × 16 = 432 IP, MNG `maxPods` cap 110 |
- **Event log:** `ipamd → ec2api · EC2 API · AssignPrivateIpAddresses Ipv4PrefixCount=1 → 10.0.65.0/28 (E.G.) · —`
- **State:** ipamd pool (PD variant): `eni-…0001 | 0 | 10.0.64.21/32 …` → `eni-…0001 | 0 | 10.0.65.0/28 (16 IPs) | —`
- **Sources:**
  - [README: `ENABLE_PREFIX_DELEGATION`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L556-L564) and [`WARM_PREFIX_TARGET`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L572-L579) — Amazon VPC CNI v1.23.1
  - [aws-k8s-cni.yaml: env `ENABLE_PREFIX_DELEGATION`, `WARM_ENI_TARGET`, `WARM_PREFIX_TARGET`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/config/master/aws-k8s-cni.yaml#L275-L286) — Amazon VPC CNI v1.23.1
  - [data_store.go `GetPrefixDelegationDefaults()` (16 IPs, /28)](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/datastore/data_store.go#L1552-L1558) — Amazon VPC CNI v1.23.1
  - [ipamd.go `GetIPv4Limit()`: prefixes per ENI = IPv4Limit − 1](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L2570-L2584) — Amazon VPC CNI v1.23.1
  - [prefix-and-ip-target.md: prefix allocation rules and t3.small example](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/prefix-and-ip-target.md#L3-L25) — Amazon VPC CNI v1.23.1
  - [cni-increase-ip-addresses-procedure.adoc: contiguous /28, Nitro, MNG cap 110/250, `InsufficientCidrBlocks`](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/cni-increase-ip-addresses-procedure.adoc#L13-L57) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [cni-increase-ip-addresses.adoc: considerations (default 110)](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/cni-increase-ip-addresses.adoc#L44-L56) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 3.16 `snat` — Pod가 VPC 밖으로 나갈 때 SNAT  ·  `move` pod → internet, token `request`: `TCP SYN 10.0.64.21 → 203.0.113.10:443`
- **Subtitle:** VPC 밖으로 가는 패킷은 노드 primary IP로 바뀌어 primary ENI로 나갑니다.
- **Prose:**
  > VPC CIDR 밖이 목적지면 VPC CNI는 Pod IP를 노드 primary ENI의 primary IP(`10.0.64.10`)로 SNAT합니다.
  > `nat/PREROUTING`이 `eni+`에서 들어온 새 연결에 mark `0x80`을 찍고, priority `1024` rule(`fwmark 0x80 lookup main`)이 그 패킷을 primary ENI로 보냅니다.
  > `nat/POSTROUTING`의 `AWS-SNAT-CHAIN-0`이 VPC CIDR은 `RETURN`하고 나머지를 `SNAT --to-source 10.0.64.10 --random-fully`합니다.
  > `AWS_VPC_K8S_CNI_EXTERNALSNAT=true`면 이 rule들이 빠지고, Pod IP 그대로 나가 NAT gateway가 SNAT합니다(private subnet 필요).
- **Facts:**
  | key | value |
  |---|---|
  | `AWS_VPC_K8S_CNI_EXTERNALSNAT` | default `false` |
  | `AWS_VPC_K8S_CNI_RANDOMIZESNAT` | default `prng` → `--random-fully` |
  | connmark | default `0x80` (`AWS_VPC_K8S_CNI_CONNMARK`) |
  | 예외 | `hostNetwork: true` Pod는 SNAT 없음 (원래 노드 IP) |
- **Event log:** `pod → internet · netfilter (nat) · SNAT 10.0.64.21:51234 → 10.0.64.10:3xxxx (E.G.) via eth0 · —`
- **Record:** R5
- **Sources:**
  - [external-snat.adoc: default SNAT to primary IP of primary ENI; hostNetwork exception](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/external-snat.adoc#L17) and [L31-L39](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/external-snat.adoc#L31-L39), [L52](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/external-snat.adoc#L52) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [README: `AWS_VPC_K8S_CNI_EXTERNALSNAT`, `AWS_VPC_K8S_CNI_RANDOMIZESNAT`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L231-L251) — Amazon VPC CNI v1.23.1
  - [network.go: SNAT chain rules](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L504-L576) — Amazon VPC CNI v1.23.1
  - [network.go: main ENI fwmark rule at priority 1024](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L336-L354) — Amazon VPC CNI v1.23.1
  - [network.go: connmark env and default `0x80`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L112-L124) — Amazon VPC CNI v1.23.1
  - [iptables_connmark.go: CONNMARK chain layout](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/iptables_connmark.go#L50-L61) — Amazon VPC CNI v1.23.1

### Decoder records

#### R1. `DescribeNetworkInterfaces` — 새로 붙은 ENI (step 3.12) — layer bar: identity / placement / addresses / attachment / tags
```json
{
  "NetworkInterfaceId": "eni-0a1b2c3d4e5f60002",
  "Description": "aws-K8S-i-0abc1234def567890",
  "InterfaceType": "interface",
  "Status": "in-use",
  "SubnetId": "subnet-0123456789abcdef0",
  "VpcId": "vpc-0fedcba9876543210",
  "AvailabilityZone": "ap-northeast-2a",
  "MacAddress": "02:4f:1c:aa:bb:cc",
  "Groups": [{ "GroupId": "sg-0aaaabbbbccccdddd", "GroupName": "eks-cluster-sg-demo-1234" }],
  "PrivateIpAddress": "10.0.70.15",
  "PrivateIpAddresses": [
    { "PrivateIpAddress": "10.0.70.15", "Primary": true },
    { "PrivateIpAddress": "10.0.70.88", "Primary": false },
    { "PrivateIpAddress": "10.0.71.4",  "Primary": false }
  ],
  "Ipv4Prefixes": [],
  "Attachment": {
    "AttachmentId": "eni-attach-0123abcd4567ef890",
    "DeviceIndex": 1,
    "NetworkCardIndex": 0,
    "InstanceId": "i-0abc1234def567890",
    "DeleteOnTermination": true,
    "Status": "attached"
  },
  "RequesterManaged": false,
  "SourceDestCheck": true,
  "TagSet": [
    { "Key": "node.k8s.amazonaws.com/instance_id", "Value": "i-0abc1234def567890" },
    { "Key": "node.k8s.amazonaws.com/createdAt", "Value": "2026-11-03T21:40:12Z" },
    { "Key": "cluster.k8s.amazonaws.com/name", "Value": "demo" }
  ]
}
```
(`PrivateIpAddresses` shows 3 of 10 entries; the real list has the primary plus 9 secondaries.)

| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `NetworkInterfaceId` | `eni-0a1b2c3d4e5f60002` | ENI ID | E.G. |
| `Description` | `aws-K8S-i-0abc…` | VPC CNI가 만든 ENI 표시 (`aws-K8S-` + instance ID) | E.G. (prefix 고정) |
| `InterfaceType` | `interface` | 일반 ENI (trunk/EFA 아님) | |
| `Status` | `in-use` | instance에 attach됨 | |
| `SubnetId` | `subnet-…` | subnet discovery가 고른 subnet | E.G. |
| `Groups[]` | `sg-…` | ENI의 security group (기본은 노드 primary ENI와 같음) | E.G. |
| `PrivateIpAddress` | `10.0.70.15` | ENI primary IP — Pod에 주지 않음 | E.G. |
| `PrivateIpAddresses[].PrivateIpAddress` | `10.0.70.88` … | Pod용 secondary IP | E.G. |
| `PrivateIpAddresses[].Primary` | `true` / `false` | primary 여부 | |
| `Ipv4Prefixes[].Ipv4Prefix` | `[]` (PD면 `10.0.65.0/28`) | prefix delegation으로 붙인 `/28` | E.G. |
| `Attachment.DeviceIndex` | `1` | device number → host route table `2` | |
| `Attachment.NetworkCardIndex` | `0` | network card 0 | |
| `Attachment.DeleteOnTermination` | `true` | instance 종료 시 ENI 삭제 (`ModifyNetworkInterfaceAttribute`로 설정) | |
| `Attachment.Status` | `attached` | attach 완료 | |
| `RequesterManaged` | `false` | 내 계정이 만든 ENI (EKS control plane ENI와 대비) | |
| `TagSet[]` | 3 tags | 노드/클러스터 소유 표시, 고아 ENI 정리에 사용 | E.G. values |

Sources: [ec2 types.go `NetworkInterface`](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/types.go#L17120-L17236), [`NetworkInterfaceAttachment`](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/types.go#L17271-L17306), [`NetworkInterfacePrivateIpAddress`](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/types.go#L17416-L17433), [`Ipv4PrefixSpecification`](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/types.go#L13712-L13720), [enums `in-use`/`attached`/`interface`](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/enums.go#L9522) — aws-sdk-go-v2 service/ec2 v1.321.0; [awsutils.go description and tag keys](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L62-L75), [AllocENI DeleteOnTermination](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/awsutils/awsutils.go#L994-L1004) — Amazon VPC CNI v1.23.1. (Enum line anchors: `AttachmentStatusAttached` [L759](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/enums.go#L759), `NetworkInterfaceTypeInterface` [L9544](https://github.com/aws/aws-sdk-go-v2/blob/service/ec2/v1.321.0/service/ec2/types/enums.go#L9544).)

#### R2. `ipamd` introspection `GET http://127.0.0.1:61679/v1/enis` (steps 3.4, 3.8, 3.13) — layer bar: network card / ENI / CIDR / address
```json
{
  "0": {
    "TotalIPs": 18,
    "AssignedIPs": 1,
    "ENIs": {
      "eni-0a1b2c3d4e5f60001": {
        "ID": "eni-0a1b2c3d4e5f60001",
        "IsPrimary": true,
        "IsTrunk": false,
        "IsEFA": false,
        "DeviceNumber": 0,
        "AvailableIPv4Cidrs": {
          "10.0.64.21/32": {
            "Cidr": { "IP": "10.0.64.21", "Mask": "/////w==" },
            "IPAddresses": {
              "10.0.64.21": {
                "Address": "10.0.64.21",
                "IPAMKey": { "networkName": "aws-cni", "containerID": "", "ifName": "" },
                "IPAMMetadata": { "k8sPodNamespace": "default", "k8sPodName": "web-0" },
                "AssignedTime": "2026-11-03T21:40:05Z",
                "UnassignedTime": "0001-01-01T00:00:00Z"
              }
            },
            "IsPrefix": false,
            "AddressFamily": "4"
          }
        },
        "IPv6Cidrs": {},
        "IsExcludedForPodIPs": false,
        "RouteTableID": 254,
        "SubnetID": "subnet-0123456789abcdef0"
      }
    }
  }
}
```
(One ENI and one CIDR shown; the second ENI and the 17 free `/32` entries are omitted.)

| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| top-level key | `"0"` | network card index | |
| `TotalIPs` / `AssignedIPs` | `18` / `1` | pool 전체 / 배정됨 | E.G. |
| `ENIs.<id>.IsPrimary` | `true` | primary ENI 여부 | |
| `DeviceNumber` | `0` | ENI device number | |
| `AvailableIPv4Cidrs` key | `10.0.64.21/32` | secondary IP는 `/32`, PD면 `/28` | E.G. |
| `IsPrefix` | `false` | PD prefix 여부 | |
| `IPAddresses.<ip>.IPAMKey` | `networkName` only | introspection은 `containerID`, `ifName`을 지움 | |
| `IPAMMetadata.k8sPodName` | `web-0` | 이 IP를 쓰는 Pod | E.G. |
| `AssignedTime` / `UnassignedTime` | timestamp | 배정 시각 / 해제 시각 (cooldown 계산) | E.G. |
| `RouteTableID` | `254` | host route table (`main` = 254) | |
| `SubnetID` | `subnet-…` | ENI의 subnet | E.G. |

Sources: [README `INTROSPECTION_BIND_ADDRESS` 127.0.0.1:61679](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L408-L414), [introspect.go endpoints](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/introspect.go#L79-L82), [introspect.go `/v1/enis` scrubs ContainerID/IfName](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/introspect.go#L125-L145), [data_store.go types](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/datastore/data_store.go#L89-L159), [`ENIInfos`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/datastore/data_store.go#L303-L310), [`AddressFamily: "4"`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/datastore/data_store.go#L548-L553), [helper.go device 0 → `RT_TABLE_MAIN`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/helper.go#L18-L20) — Amazon VPC CNI v1.23.1. The JSON shape (`Cidr` as `{IP, Mask}` with base64 mask, zero `UnassignedTime`) follows Go's default `encoding/json` of these structs and is **unverified** against a live dump.

#### R3. CNI ADD — input and result (steps 3.6, 3.10) — layer bar: env / stdin config / result.interfaces / result.ips
```text
# environment set by containerd (E.G.)
CNI_COMMAND=ADD
CNI_CONTAINERID=5f2c8a91d4e0…
CNI_NETNS=/var/run/netns/cni-5f2c8a91-…
CNI_IFNAME=eth0
CNI_ARGS=K8S_POD_NAMESPACE=default;K8S_POD_NAME=web-0;K8S_POD_INFRA_CONTAINER_ID=5f2c8a91d4e0…
CNI_PATH=/opt/cni/bin
```
```json
{
  "cniVersion": "0.4.0",
  "interfaces": [
    { "name": "eni0d7763386da" },
    { "name": "eth0", "sandbox": "/var/run/netns/cni-5f2c8a91-…", "mac": "254" },
    { "name": "dummy0d7763386da", "mac": "0", "sandbox": "0" }
  ],
  "ips": [
    { "version": "4", "address": "10.0.64.21/32", "interface": 1 }
  ]
}
```

| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `CNI_COMMAND` | `ADD` | 수행할 동작 | |
| `CNI_NETNS` | netns path | Pod network namespace | E.G. |
| `CNI_ARGS` `K8S_POD_NAME` | `web-0` | Pod 식별 (ipamd에 전달) | E.G. |
| `cniVersion` | `0.4.0` | conflist의 spec version | |
| `interfaces[0].name` | `eni0d7763386da` | host 쪽 veth | E.G. (Pod 이름의 sha1) |
| `interfaces[1].sandbox` | netns path | Pod 쪽 `eth0`이 있는 netns | E.G. |
| `interfaces[1].mac` | `254` | VPC CNI는 MAC 대신 route table ID를 저장 (DEL 정리용) | |
| `interfaces[2]` | `dummy…` | 정리용 가상 항목: `mac`=VLAN ID 0, `sandbox`=device number | |
| `ips[0].address` | `10.0.64.21/32` | Pod IP | E.G. |
| `ips[0].interface` | `1` | `interfaces[1]`(Pod eth0) index | |
| `ips[0].gateway` | (생략) | 일반 Pod는 ipamd가 `PodENISubnetGW`를 비워 둠 | |

Sources: [CNI SPEC.md v0.4.0 parameters](https://github.com/containernetworking/cni/blob/spec-v0.4.0/SPEC.md#L136-L141) and [result](https://github.com/containernetworking/cni/blob/spec-v0.4.0/SPEC.md#L150-L186) — CNI spec v0.4.0; [cni.go result build](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/cni.go#L229-L329), [rpc_handler.go `podENISubnetGW` set only for branch ENI](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/rpc_handler.go#L170-L176), [misc/10-aws.conflist](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/misc/10-aws.conflist#L1-L38) — Amazon VPC CNI v1.23.1. The final JSON is converted from the Go `types/100` result to the conflist's `0.4.0`, so the exact key order and the `version` key are **unverified** against a live run.

#### R4. Node routing for the Pod (steps 3.9, 3.13) — layer bar: Pod netns / host main table / ip rule / ENI table
```text
# inside Pod netns
$ ip addr show eth0      → inet 10.0.64.21/32 scope global eth0
$ ip route
default via 169.254.1.1 dev eth0
169.254.1.1 dev eth0 scope link

# host, main table
10.0.64.21 dev eni0d7763386da scope link

# host, ip rule (after eth1 is attached; second Pod web-9 got 10.0.70.88 on eth1)
0:      from all lookup local
512:    from all to 10.0.64.21 lookup main
512:    from all to 10.0.70.88 lookup main
1024:   from all fwmark 0x80/0x80 lookup main
1536:   from 10.0.70.88 lookup 2
32765:  from 10.0.70.15 lookup 2
32766:  from all lookup main
32767:  from all lookup default

# host, table 2 (eth1)
default via 10.0.64.1 dev eth1
10.0.64.1 dev eth1 scope link
```

| field | value | meaning | E.G.? |
|---|---|---|---|
| Pod `inet` | `10.0.64.21/32` | `/32`: 같은 subnet이라도 모든 트래픽이 gateway로 감 | E.G. |
| Pod default gw | `169.254.1.1` | 가짜 next hop, static ARP로 host veth MAC에 연결 | |
| host route | `<podIP> dev eni… scope link` | Pod로 가는 트래픽을 veth로 | E.G. |
| rule `512` | `to <podIP> lookup main` | Pod 행 트래픽은 main table | |
| rule `1024` | `fwmark 0x80/0x80 lookup main` | SNAT 대상 연결은 primary ENI로 | |
| rule `1536` | `from <podIP> lookup 2` | secondary ENI IP를 쓴 Pod는 그 ENI로 나감 | E.G. |
| rule `32765` | `from <ENI primary IP> lookup 2` | ENI 자신의 primary IP | E.G. |
| table `2` | `default via 10.0.64.1 dev eth1` | device 1 ENI 전용 table, gateway = subnet base+1 | E.G. |

Sources: [cni-proposal.md: Pod and host routes, ip rule list](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/docs/cni-proposal.md#L53-L121), [driver.go container routes](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/driver/driver.go#L188-L191), [driver.go host route and rules](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/cmd/routed-eni-cni-plugin/driver/driver.go#L526-L563), [network.go priorities](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L53-L80), [network.go fwmark rule](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L336-L354), [network.go ENI table and 32765 rule](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L1018-L1088) — Amazon VPC CNI v1.23.1. Host interface names (`eth1` vs. `ens6` on AL2023) and the exact `ip rule` print format are **unverified**; rules 0/32766/32767 are Linux defaults, not set by VPC CNI.

#### R5. SNAT and CONNMARK rules (step 3.16) — layer bar: nat/PREROUTING / AWS-CONNMARK-CHAIN-0 / mangle / nat/POSTROUTING / AWS-SNAT-CHAIN-0
```text
*nat
-A PREROUTING -i eni+ -m comment --comment "AWS, outbound connections" -j AWS-CONNMARK-CHAIN-0
-A PREROUTING -m comment --comment "AWS, CONNMARK" -j CONNMARK --restore-mark --mask 0x80
-A AWS-CONNMARK-CHAIN-0 -d 10.0.0.0/16 -m comment --comment "AWS CONNMARK CHAIN" -j RETURN
-A AWS-CONNMARK-CHAIN-0 -m comment --comment "AWS, CONNMARK" -j CONNMARK --set-xmark 0x80/0x80
-A POSTROUTING -m comment --comment "AWS SNAT CHAIN" -j AWS-SNAT-CHAIN-0
-A AWS-SNAT-CHAIN-0 -d 10.0.0.0/16 -m comment --comment "AWS SNAT CHAIN" -j RETURN
-A AWS-SNAT-CHAIN-0 ! -o vlan+ -m comment --comment "AWS, SNAT" -m addrtype ! --dst-type LOCAL -j SNAT --to-source 10.0.64.10 --random-fully
*mangle
-A PREROUTING -i eni+ -m comment --comment "AWS, primary ENI" -j CONNMARK --restore-mark --mask 0x80
```

| field | value | meaning | E.G.? |
|---|---|---|---|
| `AWS-CONNMARK-CHAIN-0` RETURN | `-d 10.0.0.0/16` | VPC 안 목적지는 mark 안 함 | E.G. (VPC CIDR) |
| `--set-xmark 0x80/0x80` | `0x80` | VPC 밖 연결 표시 → rule 1024로 main table | |
| `AWS-SNAT-CHAIN-0` RETURN | `-d 10.0.0.0/16` | VPC 안은 SNAT 안 함 (Pod IP 유지) | E.G. |
| `! -o vlan+` | — | branch ENI(security group for Pods) 트래픽 제외 | |
| `--to-source` | `10.0.64.10` | 노드 primary ENI의 primary IP | E.G. |
| `--random-fully` | — | `RANDOMIZESNAT=prng`(default) | |

Sources: [iptables_connmark.go layout](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/iptables_connmark.go#L50-L61), [network.go SNAT rules](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L504-L576), [network.go mangle restore-mark](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L590-L600), [README SNAT variables](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/README.md#L231-L266) — Amazon VPC CNI v1.23.1. Rule order as printed by `iptables-save` on a live node is **unverified** (RETURN rules are inserted at position 1, per [network.go L629-L634](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/networkutils/network.go#L629-L634)).

#### R6. max Pods calculation for `m5.large` (step 3.14) — layer bar: instance limits / formula / kubelet config
```text
instance type         m5.large
ENILimit              3
IPv4Limit (per ENI)   10
maxPods (nodeadm)     3 * (10 - 1) + 2 = 29
kubeReserved.memory   11 * 29 + 255 = 574Mi
MNG cap               110   (< 30 vCPU)
PD capacity           3 * (10 - 1) * 16 = 432 IPs  → effective 110 under MNG
```

| field | value | meaning | E.G.? |
|---|---|---|---|
| `ENILimit` | `3` | 붙일 수 있는 ENI 수 (network card 0) | |
| `IPv4Limit` | `10` | ENI당 IPv4 (primary 포함) | |
| `maxPods` | `29` | kubelet config, `status.capacity.pods` | |
| `kubeReserved.memory` | `574Mi` | nodeadm이 maxPods로 계산하는 예약 메모리 | |
| MNG cap | `110` | custom AMI 없는 managed node group 상한 | |
| PD capacity | `432` | prefix 슬롯 27개 × 16 (계산값) | |

Sources: [vpc_ip_resource_limit.go m5.large](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/vpc/vpc_ip_resource_limit.go#L7369-L7381), [eni-max-pods.txt](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/misc/eni-max-pods.txt#L597), [ipamd.go `GetIPv4Limit()`](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.23.1/pkg/ipamd/ipamd.go#L2570-L2584) — Amazon VPC CNI v1.23.1; [eni_max_pods.go](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/eni_max_pods.go#L77-L79), [config.go](https://github.com/awslabs/amazon-eks-ami/blob/v20261031/nodeadm/internal/kubelet/config.go#L293-L306) — amazon-eks-ami v20261031 (nodeadm); [choosing-instance-type.adoc](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/choosing-instance-type.adoc#L65-L70) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10).

### Self-check
1. **Q.** EKS Pod IP는 어디서 오며, overlay CNI와 무엇이 다른가? **A.** VPC subnet의 실제 private IP다. `ipamd`가 EC2 API로 노드 ENI에 secondary IP(또는 `/28` prefix)를 붙여 두고, Pod마다 하나를 `/32`로 준다. 캡슐화가 없어 VPC의 다른 리소스가 Pod IP로 바로 통신한다.
2. **Q.** CNI binary가 EC2 API를 직접 부르지 않는 이유는? **A.** Pod 생성 경로에서 EC2 호출(ENI attach는 최대 ~10초)과 throttling을 빼려고. `ipamd`가 warm pool을 미리 채우고, CNI binary는 gRPC(`ipamd.sock`)로 pool에서 하나를 받기만 한다. pool이 비면 바로 실패한다.
3. **Q.** `m5.large`에서 Pod 1개를 띄우면 ENI는 몇 개가 되나? 이유는? **A.** 2개. 기본 `WARM_ENI_TARGET=1`은 free IP를 `9 × 1`개 이상 유지하려 하므로, free가 8이 되는 순간 새 ENI(9 IP)를 붙인다.
4. **Q.** `m5.large`의 max Pods 29는 어떻게 나오고, `+2`는 무엇인가? **A.** `3 ENI × (10 − 1) + 2`. ENI마다 primary IP는 Pod에 안 주고, `+2`는 Pod IP를 쓰지 않는 `hostNetwork` Pod(`aws-node`, `kube-proxy`) 몫이다. 30번째 Pod는 scheduler가 `Too many pods`로 거절한다.
5. **Q.** prefix delegation을 켜면 `m5.large`에 Pod를 몇 개 띄울 수 있나? 실패할 수 있는 경우는? **A.** IP 용량은 `3 × 9 × 16 = 432`이지만 managed node group은 vCPU 30 미만이면 `maxPods`를 110으로 묶어 110이다. subnet에 연속된 `/28`이 없으면 free IP가 있어도 `InsufficientCidrBlocks`로 실패하고, Nitro instance만 지원한다.
6. **Q.** Pod가 VPC 밖 서버에 접속할 때 source IP는? `AWS_VPC_K8S_CNI_EXTERNALSNAT=true`는? **A.** 기본은 노드 primary ENI의 primary IP로 SNAT된다(`AWS-SNAT-CHAIN-0`, connmark `0x80` + rule 1024로 primary ENI 경유). `true`면 SNAT rule이 빠지고 Pod IP 그대로 나가므로, private subnet의 NAT gateway 같은 외부 NAT가 필요하다.

### Unverified / open (this lesson)
- `m5.large` vCPU count (2) is not in any pinned source; the plan only relies on "under 30 vCPU", which is also not stated per instance type in pinned sources. EC2 instance-type docs (docs.aws.amazon.com) were blocked.
- EKS UG says the MNG cap is 110 for "less than 30 vCPUs" and 250 for "greater than 30 vCPUs"; behavior at exactly 30 vCPUs is not stated.
- No pinned AWS source states the prefix-delegation max-pods formula verbatim (`ENIs × (IPs − 1) × 16 + 2`); 432 is computed from `GetIPv4Limit()` and the 16-IP prefix. The AL2 `max-pods-calculator.sh` was not checked.
- Exact live output formats for R2 (Go JSON of `net.IPNet`), R3 (converted 0.4.0 result, key order, `version` key), R4 (`ip rule` text, AL2023 interface names `ens5`/`ens6` vs `eth0`/`eth1`), and R5 (`iptables-save` order) were not observed on a running node.
- The Pod-side static ARP entry for `169.254.1.1` comes from `docs/cni-proposal.md`, an early design doc kept in the repo; the current driver code was checked for the routes but not for the ARP call.
- The time between Pod sandbox request and IP assignment (event-log durations) is not sourced; only "ENI attach up to 10 seconds" and `ipPoolMonitorInterval = 5s` are.
- The kubelet/containerd sandbox error text when `ipamd` has no free IP (for example `FailedCreatePodSandBox`) was not verified; only the plugin error string `add cmd: failed to assign an IP address to container` is sourced.
- Whether ipamd fills the primary ENI from `nodeInit` or the first pool-manager tick was not traced; step 3.3 says "pool manager" in effect only.
- Custom networking (`ENIConfig`), security groups for Pods (branch ENI), IPv6 mode, and multi-network-card instances are out of scope here.
- New node kinds proposed: `cloud` for `eni0`, `eni1`, `imds`, `ec2api`.

## Lesson 4 — `service-traffic`: Service와 ALB를 지나 Pod에 닿는 요청

**Goal.** 클러스터 안의 Pod가 `http://orders`를 호출할 때(ClusterIP → kube-proxy iptables → DNAT)와, 인터넷 사용자가 ALB를 거쳐 들어올 때(AWS Load Balancer Controller → Target Group → Pod IP 또는 NodePort) 패킷이 어디서 어떻게 바뀌는지 한 흐름으로 보여 줍니다.

**Interview questions it answers.**
- ClusterIP는 실제로 어느 인터페이스에도 없는데 어떻게 통신이 되나요? kube-proxy는 무엇을 하나요?
- iptables 모드에서 endpoint 3개 중 하나를 어떻게 고르나요? (`statistic --mode random --probability`)
- ClusterIP 호출에서 source IP가 보존되나요? NodePort/LoadBalancer는 어떤가요?
- iptables, IPVS, nftables 모드 차이와 1.36 기준 기본값은? EKS에서는?
- `alb.ingress.kubernetes.io/target-type: instance`와 `ip`의 차이, 그리고 Fargate에서 어느 쪽이 필요한가요?
- Rolling update 중 ALB에 503이 나는 이유와 Pod readiness gate가 그걸 어떻게 막나요?
- `orders`라는 짧은 이름이 어떻게 `orders.shop.svc.cluster.local`로 풀리나요? (`search`, `ndots:5`)

**Pins.** See "Version pins" at the top of this plan.

### Nodes
| id | label / sublabel | kind | layer | appears at step | isometric illustration idea |
|---|---|---|---|---|---|
| dev | 개발자 laptop / `kubectl apply` | client | Control plane | 4.1 | 노트북 위에 터미널 창, YAML 종이가 한 장 튀어나옴 |
| apiserver | kube-apiserver / REST + watch | framework | Control plane | 4.1 | 여러 포트가 달린 관문(게이트) 블록, 위에 `watch` 안테나 |
| kcm | kube-controller-manager / EndpointSlice controller | framework | Control plane | 4.2 | 톱니바퀴 랙; 그중 한 톱니에 `EndpointSlice` 라벨 |
| kubelet | kubelet (node B) / readiness probe | container | Node | 4.3 | 서버 블레이드 옆 청진기 아이콘(probe) |
| orders-a | Pod `orders-a` / `10.0.18.34:8080` | app | Workload | 4.2 | 작은 컨테이너 상자 두 개가 겹친 Pod 캡슐, node A 받침 위 |
| orders-b | Pod `orders-b` / `10.0.45.67:8080` | app | Workload | 4.2 | 같은 Pod 캡슐, node B 받침 위 |
| kubeproxy | kube-proxy (node A) / mode `iptables` | container | Node | 4.4 | DaemonSet 표시가 붙은 작은 로봇 팔이 규칙 카드를 꽂는 모습 |
| netfilter | Linux netfilter (node A) / nat table + conntrack | container | Node | 4.5 | 커널 층판 안의 깔때기·분기 파이프(체인), 옆에 conntrack 장부 |
| web | Pod `web` / `10.0.19.5` | app | Workload | 4.6 | 클라이언트 역할 Pod 캡슐, 말풍선 `GET http://orders/` |
| coredns | CoreDNS / Service `kube-dns` `10.100.0.10` | framework | Workload | 4.6 | 전화번호부 책 + 안테나 |
| lbc | AWS Load Balancer Controller / Deployment in `kube-system` | framework | Control plane | 4.11 | AWS 주황 테두리를 두른 톱니 로봇, 손에 Target Group 카드 |
| alb | Application Load Balancer / `internet-facing`, 2 AZ | framework (proposed kind: cloud) | AWS | 4.12 | 두 AZ 바닥판에 걸친 넓은 아치형 분배기, 위에 리스너 `:80` 깃발 |
| user | 인터넷 사용자 / 브라우저 | client | AWS | 4.16 | 지구본 앞 스마트폰/브라우저 |

### State panels
| node | title | view | initial content |
|---|---|---|---|
| kcm | EndpointSlice `orders-7xk2p` (E.G.) | table: address · nodeName · zone · ready | (빈 표) |
| netfilter | node A nat table (`shop/orders` 관련) | table: chain · rule (요약) | `KUBE-SERVICES` · (orders 규칙 없음) |
| netfilter2 → same node `netfilter` | conntrack (node A) | table: orig (src → dst) · reply (src → dst) · state | (빈 표) |
| alb | Target Group `k8s-shop-orders-<hash10>` (E.G.) | table: target Id · Port · AZ · health | (빈 표) |
| orders-b | Pod `orders-b` `status.conditions` | table: type · status | `PodScheduled True`, `Initialized True`, `ContainersReady False`, `Ready False` |

(netfilter는 nat table과 conntrack 두 패널을 가집니다. 새 스키마가 노드당 패널 하나만 허용하면 conntrack을 `netfilter-ct` 노드로 분리합니다 — open question.)

### Steps

#### 4.1 `service-create` — Service `orders` 생성과 ClusterIP 할당  ·  `move` dev → apiserver, token `request`: `POST /api/v1/namespaces/shop/services`
- **Subtitle:** API server가 Service CIDR에서 가상 IP 하나를 떼어 `spec.clusterIP`에 적습니다.
- **Prose:**
  > `type`을 생략하면 Service는 `ClusterIP`가 됩니다. API server는 클러스터에 예약된 Service IP 풀에서 주소를 하나 할당해 `spec.clusterIP`/`spec.clusterIPs`에 기록합니다.
  > 1.33부터 이 할당은 `ServiceCIDR`·`IPAddress` 객체로 추적됩니다(`MultiCIDRServiceAllocator` stable).
  > EKS에서는 Service CIDR을 지정하지 않으면 `10.100.0.0/16` 또는 `172.20.0.0/16`에서 할당됩니다.
  > 이 IP는 어떤 NIC에도 붙지 않습니다. 각 노드의 kube-proxy가 규칙으로만 구현합니다.
- **Facts:**
  | key | value |
  |---|---|
  | `spec.type` 기본값 | `ClusterIP` |
  | `ports[].targetPort` 기본값 | `port`와 같은 값 |
  | `spec.sessionAffinity` 기본값 | `None` |
  | EKS 기본 Service CIDR | `10.100.0.0/16` 또는 `172.20.0.0/16` |
- **Event log:** `dev → apiserver · HTTPS REST · POST Service shop/orders → clusterIP 10.100.73.21 · ~0.6 KB (E.G.)`
- **Record:** R1
- **Sources:**
  - [Service type defaults to ClusterIP (core/v1 types.go)](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/core/v1/types.go#L6045-L6046) — Kubernetes v1.36.2
  - [SetDefaults_Service: sessionAffinity None, type ClusterIP, protocol TCP, targetPort = port](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/apis/core/v1/defaults.go#L106-L146) — Kubernetes v1.36.2
  - [Service: cluster IP assigned; targetPort defaults to port](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/service.md#L115-L131) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [type: ClusterIP is the default type](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/service.md#L444-L447) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [IP address allocation tracking with IPAddress/ServiceCIDR](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/networking/virtual-ips.md#L453-L459) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [MultiCIDRServiceAllocator stable since 1.33](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/command-line-tools-reference/feature-gates/MultiCIDRServiceAllocator.md#L17-L20) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [EKS: default service CIDR 10.100.0.0/16 or 172.20.0.0/16](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/create-cluster-auto.adoc#L95) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 4.2 `endpointslice-build` — EndpointSlice controller가 Pod를 모읍니다  ·  `mutate` kcm
- **Subtitle:** selector `app: orders`에 맞는 Pod IP가 EndpointSlice의 `endpoints[]`에 들어갑니다.
- **Prose:**
  > kube-controller-manager의 EndpointSlice controller는 Service selector와 맞는 Pod를 계속 살피며 EndpointSlice를 고칩니다.
  > 슬라이스에는 `kubernetes.io/service-name: orders` label과 `endpointslice.kubernetes.io/managed-by: endpointslice-controller.k8s.io` label이 붙습니다.
  > 기본적으로 슬라이스 하나에 endpoint는 최대 100개이고, 넘으면 슬라이스가 늘어납니다.
  > 지금 `orders-b`는 아직 readiness probe를 통과하지 못해 `ready: false`입니다.
- **Facts:**
  | key | value |
  |---|---|
  | 슬라이스당 endpoint 기본 상한 | 100 (`--max-endpoints-per-slice`, 최대 1000) |
  | owner label | `kubernetes.io/service-name: orders` |
  | managed-by label 값 | `endpointslice-controller.k8s.io` |
  | conditions | `ready`, `serving`, `terminating` |
- **Event log:** `kcm → apiserver · HTTPS REST · create EndpointSlice shop/orders-7xk2p (2 endpoints) · ~0.9 KB (E.G.)`
- **State:** before → after
  | address | nodeName | zone | ready |
  |---|---|---|---|
  | ~~(없음)~~ → `10.0.18.34` | `ip-10-0-20-11…` | `us-west-2a` | `true` |
  | ~~(없음)~~ → `10.0.45.67` | `ip-10-0-40-12…` | `us-west-2b` | `false` |
- **Record:** R2
- **Sources:**
  - [Controller scans Pods matching the selector and updates EndpointSlices](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/service.md#L119-L121) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [EndpointSlice example and 100-endpoint default (max 1000)](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/endpoint-slices.md#L39-L65) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [managed-by label and ownership label](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/endpoint-slices.md#L136-L150) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [EndpointSlice Go types (addressType, endpoints, ports, conditions)](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/discovery/v1/types.go#L54-L166) — Kubernetes v1.36.2

#### 4.3 `readiness-flip` — readiness probe 통과, `orders-b`가 `Ready`로  ·  `mutate` orders-b
- **Subtitle:** kubelet이 probe 성공을 Pod status에 쓰고, 슬라이스의 `ready`가 `true`가 됩니다.
- **Prose:**
  > kubelet은 `readinessProbe`를 `periodSeconds`(기본 10초)마다 실행하고, 실패가 `failureThreshold`(기본 3)번 이어지면 `Ready`를 `False`로 둡니다.
  > Pod의 `Ready` condition이 EndpointSlice의 `serving`/`ready`로 그대로 옮겨집니다.
  > kube-proxy는 보통 `ready`인 endpoint만 씁니다. 모두 terminating일 때만 `serving`+`terminating` endpoint로 보냅니다.
- **Facts:**
  | key | value |
  |---|---|
  | `periodSeconds` 기본값 | 10 |
  | `timeoutSeconds` 기본값 | 1 |
  | `failureThreshold` 기본값 | 3 |
  | `successThreshold` 기본값 | 1 |
- **Event log:** `kubelet → apiserver · HTTPS REST · PATCH pods/orders-b/status Ready=True · ~0.3 KB (E.G.)`
- **State:** before → after
  | type | status |
  |---|---|
  | `ContainersReady` | ~~False~~ → `True` |
  | `Ready` | ~~False~~ → `True` |
- **Sources:**
  - [Probe fields and defaults (periodSeconds 10, timeoutSeconds 1, successThreshold 1, failureThreshold 3)](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/probes.md#L250-L262) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [serving maps to the Pod's Ready condition](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/endpoint-slices.md#L86-L96) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Proxies ignore terminating endpoints unless all are terminating](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/endpoint-slices.md#L105-L108) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 4.4 `kubeproxy-watch` — 모든 노드의 kube-proxy가 변화를 받습니다  ·  `move` apiserver → kubeproxy, token `data`: `WATCH EndpointSlice MODIFIED`
- **Subtitle:** kube-proxy는 Service와 EndpointSlice를 watch하는 노드별 DaemonSet입니다.
- **Prose:**
  > kube-proxy 인스턴스는 각 노드에서 Service와 EndpointSlice의 추가·삭제를 watch하고, 그 상태에 맞게 노드의 패킷 규칙을 맞추는 control loop를 돕니다.
  > 모드를 지정하지 않으면 Linux에서는 `iptables` 모드로 뜹니다.
  > EKS에서는 `kube-proxy` add-on이 EC2 노드마다 배포되고, Fargate 노드에는 배포되지 않습니다.
- **Facts:**
  | key | value |
  |---|---|
  | Linux 기본 mode | `iptables` (`mode`가 비어 있으면) |
  | 선택 가능한 Linux mode | `iptables`, `ipvs`, `nftables` |
  | EKS 1.36 kube-proxy add-on | `v1.36.0-eksbuild.21` |
  | `configSyncPeriod` 기본값 | 15m |
- **Event log:** `apiserver → kubeproxy · HTTPS watch · EndpointSlice orders-7xk2p MODIFIED (resourceVersion E.G.) · ~0.9 KB (E.G.)`
- **Sources:**
  - [Each kube-proxy watches Service and EndpointSlice objects; control loop](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/networking/virtual-ips.md#L12-L26) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Empty mode defaults to iptables on Linux (platformApplyDefaults)](https://github.com/kubernetes/kubernetes/blob/v1.36.2/cmd/kube-proxy/app/server_linux.go#L46-L51) — Kubernetes v1.36.2
  - [ProxyMode values iptables/ipvs/nftables/kernelspace](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/apis/config/types.go#L240-L257) — Kubernetes v1.36.2
  - [ConfigSyncPeriod default 15m](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/apis/config/v1alpha1/defaults.go#L122-L124) — Kubernetes v1.36.2
  - [EKS kube-proxy add-on: on each EC2 node, not on Fargate](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/managing-kube-proxy.adoc#L26) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [EKS kube-proxy version table: 1.36 → v1.36.0-eksbuild.21](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/managing-kube-proxy.adoc#L35-L38) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 4.5 `iptables-sync` — kube-proxy가 nat table을 다시 씁니다  ·  `mutate` netfilter
- **Subtitle:** `KUBE-SERVICES` → `KUBE-SVC-<hash>` → `KUBE-SEP-<hash>` 체인이 생깁니다.
- **Prose:**
  > kube-proxy는 `iptables-restore` 입력을 만들어 한 번에 적용합니다. Service 포트마다 `KUBE-SVC-` 체인 하나, endpoint마다 `KUBE-SEP-` 체인 하나입니다.
  > 체인 이름의 16글자는 `"<ns>/<svc>:<port-name>" + protocol`(endpoint는 `+ "IP:port"`)의 SHA-256을 base32로 바꿔 자른 값입니다. 체인 이름 28자 제한 때문입니다.
  > 동기화 간격은 `minSyncPeriod` 1초, `syncPeriod` 30초가 기본입니다.
  > IPVS 모드는 1.35부터 deprecated이고, upstream은 대안으로 `nftables`(kernel 5.13+, 1.33 GA)를 권합니다.
- **Facts:**
  | key | value |
  |---|---|
  | 체인 hash | `sha256` → base32 → 앞 16자 (`KUBE-SVC-AIOWKCZMN5S45HKT` for `shop/orders:http`+`tcp`) |
  | `iptables.minSyncPeriod` / `syncPeriod` | 1s / 30s |
  | masquerade mark | `0x4000` (`masqueradeBit` 14) |
  | IPVS 상태 | upstream deprecated v1.35, 1.36 코드에 아직 존재 |
- **Event log:** `kubeproxy → netfilter · netfilter (iptables-restore) · +1 SVC chain, +2 SEP chains, 7 rules · ~1 ms (E.G.)`
- **State:** before → after
  | chain | rule (요약) |
  |---|---|
  | `KUBE-SERVICES` | ~~(orders 규칙 없음)~~ → `-d 10.100.73.21 --dport 80 -j KUBE-SVC-AIOWKCZMN5S45HKT` |
  | `KUBE-SVC-AIOWKCZMN5S45HKT` | (new) → `statistic random 0.5 → SEP-XLXL…`, 나머지 → `SEP-E2DM…` |
  | `KUBE-SEP-XLXLDHVODIJ3H7US` | (new) → `DNAT --to-destination 10.0.18.34:8080` |
  | `KUBE-SEP-E2DMA6D4FLSL2M5D` | (new) → `DNAT --to-destination 10.0.45.67:8080` |
- **Record:** R3
- **Sources:**
  - [portProtoHash and chain-name prefixes KUBE-SVC/SVL/FW/EXT/SEP](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L542-L594) — Kubernetes v1.36.2
  - [Hash inputs: ServicePortName.String() + lowercase protocol](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L338-L349) — Kubernetes v1.36.2
  - [ServicePortName.String() = "ns/name:port"](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/types.go#L50-L59) — Kubernetes v1.36.2
  - [Defaults: SyncPeriod 30s, MinSyncPeriod 1s, MasqueradeBit 14](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/apis/config/v1alpha1/defaults.go#L62-L95) — Kubernetes v1.36.2
  - [masqueradeMark = 1 << masqueradeBit](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L262-L263) — Kubernetes v1.36.2
  - [minSyncPeriod / syncPeriod explained](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/networking/virtual-ips.md#L116-L194) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [IPVS deprecated v1.35; nftables recommended](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/networking/virtual-ips.md#L197-L226) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [kube-proxy 1.36 still builds the ipvs proxier, with a deprecation warning](https://github.com/kubernetes/kubernetes/blob/v1.36.2/cmd/kube-proxy/app/server_linux.go#L195-L197) — Kubernetes v1.36.2
  - [nftables mode: Linux only, kernel 5.13+](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/networking/virtual-ips.md#L291-L312) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [NFTablesProxyMode feature gate stable from 1.33](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/command-line-tools-reference/feature-gates/NFTablesProxyMode.md#L8-L20) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [EKS 1.35 notes: "IPVS mode … will be removed in Kubernetes 1.36"](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/versioning/kubernetes-versions-standard.adoc#L72) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 4.6 `dns-query` — `web` Pod가 `orders`를 묻습니다  ·  `move` web → coredns, token `request`: `A? orders.shop.svc.cluster.local`
- **Subtitle:** kubelet이 써 둔 `/etc/resolv.conf`의 `search` 목록이 짧은 이름을 늘립니다.
- **Prose:**
  > kubelet은 Pod마다 `/etc/resolv.conf`를 만듭니다. `search <ns>.svc.cluster.local svc.cluster.local cluster.local`과 `options ndots:5`가 들어갑니다.
  > 점이 5개보다 적은 `orders`는 search 목록이 먼저 붙어 `orders.shop.svc.cluster.local`로 질의됩니다.
  > EKS에서 `nameserver`는 `kube-dns` Service의 ClusterIP(예: `10.100.0.10`)입니다. 이 질의 자체도 4.7–4.8과 같은 ClusterIP 경로를 탑니다.
- **Facts:**
  | key | value |
  |---|---|
  | `search` | `shop.svc.cluster.local svc.cluster.local cluster.local` |
  | `options` | `ndots:5` |
  | EKS `nameserver` (예) | `10.100.0.10` (`kube-system/kube-dns`) |
  | EKS 1.36 CoreDNS add-on | `v1.14.3-eksbuild.16` |
- **Event log:** `web → coredns · DNS/UDP 53 · A? orders.shop.svc.cluster.local · ~80 B (E.G.)`
- **Record:** R4
- **Sources:**
  - [resolv.conf written by kubelet: search list and ndots:5](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/dns-pod-service.md#L42-L55) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [EKS sample: nameserver 10.100.0.10 for all Pods](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/sample-deployment.adoc#L249-L254) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [EKS: kube-system kube-dns ClusterIP 10.100.0.10 53/UDP,53/TCP](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/restrict-service-external-ip.adoc#L53) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [EKS CoreDNS version table: 1.36 → v1.14.3-eksbuild.16](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/managing-coredns.adoc#L28-L30) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 4.7 `dns-answer` — CoreDNS가 ClusterIP를 돌려줍니다  ·  `move` coredns → web, token `response`: `A 10.100.73.21`
- **Subtitle:** 일반(headless 아님) Service의 A 레코드는 ClusterIP를 가리킵니다.
- **Prose:**
  > headless가 아닌 Service는 `my-svc.my-namespace.svc.cluster-domain.example` 형태의 A/AAAA 레코드를 받고, 그 값은 Service의 cluster IP입니다.
  > 그래서 클라이언트는 Pod IP를 모릅니다. Pod가 바뀌어도 이름과 ClusterIP는 그대로입니다.
  > `clusterIP: None`(headless)이면 A 레코드가 Pod IP들을 직접 돌려줍니다 — 이 레슨에서는 다루지 않습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 레코드 이름 형식 | `<svc>.<ns>.svc.<cluster-domain>` |
  | 일반 Service A 값 | Service의 ClusterIP |
  | headless | `spec.clusterIP: "None"` → ClusterIP 할당 없음 |
- **Event log:** `coredns → web · DNS/UDP 53 · A orders.shop.svc.cluster.local = 10.100.73.21 · ~100 B (E.G.)`
- **Sources:**
  - [A/AAAA records for normal Services resolve to the cluster IP](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/dns-pod-service.md#L72-L77) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [clusterIP "None" → headless, no IP assigned](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/service.md#L452-L454) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 4.8 `clusterip-match` — SYN이 `KUBE-SERVICES`에 걸립니다  ·  `move` web → netfilter, token `request`: `TCP SYN 10.0.19.5:41234 → 10.100.73.21:80`
- **Subtitle:** Pod에서 나간 패킷이 nat `PREROUTING`에서 `KUBE-SERVICES` → `KUBE-SVC-AIOWKCZMN5S45HKT`로 점프합니다.
- **Prose:**
  > kube-proxy는 nat table의 `PREROUTING`·`OUTPUT`에 `KUBE-SERVICES` 점프를 걸어 둡니다.
  > `KUBE-SERVICES`의 규칙이 목적지 `10.100.73.21`, `--dport 80`, `-p tcp`를 보고 `KUBE-SVC-…`로 보냅니다.
  > `KUBE-SVC-…`에서 endpoint n개 중 i번째 규칙은 확률 `1/(n-i)`로 매치하고, 마지막 규칙은 무조건 매치합니다. 2개면 첫 규칙 `0.5000000000`, 둘째는 조건 없음 — 결과적으로 균등 분배입니다.
- **Facts:**
  | key | value |
  |---|---|
  | 점프 위치 | nat `PREROUTING`, nat `OUTPUT` → `KUBE-SERVICES` |
  | 첫 규칙 확률 (n=2) | `--probability 0.5000000000` (`%0.10f` of `1/n`) |
  | 마지막 규칙 | `statistic` 없음 (항상 매치) |
  | 선택 기준 | session affinity가 없으면 random |
- **Event log:** `web → netfilter · netfilter nat PREROUTING · KUBE-SERVICES → KUBE-SVC-AIOWKCZMN5S45HKT → (random) KUBE-SEP-E2DMA6D4FLSL2M5D · 60 B SYN (E.G.)`
- **Sources:**
  - [Jump chains: nat PREROUTING/OUTPUT → KUBE-SERVICES](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L380-L389) — Kubernetes v1.36.2
  - [Capture the clusterIP rule in KUBE-SERVICES](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L938-L946) — Kubernetes v1.36.2
  - [writeServiceToEndpointRules: statistic random probability, last rule unconditional](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L1469-L1489) — Kubernetes v1.36.2
  - [computeProbability = %0.10f of 1/n](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L402-L404) — Kubernetes v1.36.2
  - [iptables mode selects a backend at random by default](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/networking/virtual-ips.md#L85-L92) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 4.9 `dnat` — `KUBE-SEP`가 목적지를 Pod IP로 바꿉니다  ·  `mutate` netfilter (conntrack)
- **Subtitle:** `DNAT --to-destination 10.0.45.67:8080`, 그리고 연결 하나가 conntrack에 기록됩니다.
- **Prose:**
  > 선택된 `KUBE-SEP-E2DMA6D4FLSL2M5D`가 목적지를 `10.0.45.67:8080`으로 바꿉니다(DNAT). source IP `10.0.19.5`는 그대로입니다.
  > 같은 SEP 체인의 첫 규칙 `-s 10.0.45.67 -j KUBE-MARK-MASQ`는 Pod가 자기 Service를 불러 자기에게 돌아오는 hairpin만 SNAT합니다.
  > DNAT 결정은 연결의 첫 패킷에서 한 번 내려지고, 이후 패킷과 응답은 conntrack 항목을 따라갑니다.
- **Facts:**
  | key | value |
  |---|---|
  | DNAT 규칙 | `-m tcp -p tcp -j DNAT --to-destination 10.0.45.67:8080` |
  | ClusterIP 호출 SNAT | iptables 모드에서 클러스터 내부 → ClusterIP는 SNAT 안 함 |
  | conntrack `tcpEstablishedTimeout` 기본값 | 24h |
  | conntrack `maxPerCore` / `min` 기본값 | 32768 / 131072 |
- **Event log:** `netfilter → netfilter · netfilter nat · DNAT 10.100.73.21:80 → 10.0.45.67:8080, conntrack NEW · — `
- **State:** before → after (conntrack)
  | orig (src → dst) | reply (src → dst) | state |
  |---|---|---|
  | ~~(없음)~~ → `10.0.19.5:41234 → 10.100.73.21:80` | `10.0.45.67:8080 → 10.0.19.5:41234` | `SYN_SENT` (E.G.) |
- **Sources:**
  - [Per-endpoint chain: hairpin KUBE-MARK-MASQ, then DNAT --to-destination](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L1231-L1259) — Kubernetes v1.36.2
  - [Packets redirected to the backend without rewriting the client IP](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/networking/virtual-ips.md#L109-L114) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [ClusterIP traffic from inside the cluster is never source NAT'd in iptables mode](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tutorials/services/source-ip.md#L76-L82) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Conntrack defaults: MaxPerCore 32*1024, Min 128*1024, TCPEstablishedTimeout 24h](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/apis/config/v1alpha1/defaults.go#L81-L98) — Kubernetes v1.36.2

#### 4.10 `pod-receives` — `orders-b`가 요청을 받고 응답합니다  ·  `move` netfilter → orders-b, token `request`: `GET / (dst 10.0.45.67:8080)`
- **Subtitle:** VPC CNI 덕분에 Pod IP가 VPC 주소라 node A → node B는 VPC 라우팅으로 바로 갑니다.
- **Prose:**
  > Amazon VPC CNI는 각 Pod에 VPC의 private IP를 줍니다. 그래서 DNAT된 패킷은 overlay 없이 VPC 안에서 node B로 갑니다.
  > `orders-b`는 source `10.0.19.5`를 그대로 봅니다. 응답은 node A의 conntrack이 source를 `10.100.73.21:80`으로 되돌려 `web`에 전달합니다.
  > `KUBE-FORWARD`에는 `RELATED,ESTABLISHED` 허용 규칙과, liberal 모드가 아니면 `INVALID` DROP 규칙이 있습니다.
- **Facts:**
  | key | value |
  |---|---|
  | Pod IP 출처 (EKS) | VPC의 private IPv4/IPv6 (VPC CNI) |
  | `orders-b`가 보는 source | `10.0.19.5` (보존) |
  | `KUBE-FORWARD` | `--ctstate INVALID -j DROP` (`conntrackTCPLiberal`이 false일 때) |
- **Event log:** `netfilter → orders-b · TCP (VPC routing) · GET / → 200 OK · 1.2 ms (E.G.)`
- **Sources:**
  - [VPC CNI assigns a private IPv4/IPv6 address from your VPC to each Pod](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/managing-vpc-cni.adoc#L26) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [KUBE-FORWARD: INVALID drop unless conntrack TCP liberal; RELATED,ESTABLISHED accept](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L1332-L1371) — Kubernetes v1.36.2
  - [Upstream test expectation: KUBE-FORWARD conntrack rules](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier_test.go#L194-L196) — Kubernetes v1.36.2

#### 4.11 `ingress-create` — Ingress `orders`(class `alb`)를 만듭니다  ·  `move` dev → apiserver, token `request`: `POST /apis/networking.k8s.io/v1/namespaces/shop/ingresses`
- **Subtitle:** `ingressClassName: alb`가 이 Ingress를 AWS Load Balancer Controller에 맡깁니다.
- **Prose:**
  > IngressClass `alb`의 `spec.controller`는 `ingress.k8s.aws/alb`입니다. 이 값이 이 Ingress를 LBC가 처리한다는 표시입니다.
  > `alb.ingress.kubernetes.io/scheme` 기본값은 `internal`이므로 인터넷용이면 `internet-facing`을 명시해야 합니다.
  > `target-type` 기본값은 `instance`입니다. 이 레슨은 `ip`를 명시합니다.
  > Ingress API는 frozen 상태이고, 새 기능은 Gateway API로 갑니다(LBC는 둘 다 지원).
- **Facts:**
  | key | value |
  |---|---|
  | IngressClass controller | `ingress.k8s.aws/alb` |
  | `scheme` 기본값 | `internal` |
  | `target-type` 기본값 | `instance` |
  | `listen-ports` 기본값 | `[{"HTTP": 80}]` (인증서 있으면 `[{"HTTPS": 443}]`) |
- **Event log:** `dev → apiserver · HTTPS REST · POST Ingress shop/orders (class alb) · ~0.8 KB (E.G.)`
- **Record:** R5
- **Sources:**
  - [IngressClass controller ingress.k8s.aws/alb](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/ingress_class.md#L8-L32) — AWS Load Balancer Controller v3.6.2
  - [Annotation table: scheme default internal; listen-ports default; target-type default instance](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L30-L45) — AWS Load Balancer Controller v3.6.2
  - [listen-ports defaults depend on certificate-arn](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L146-L155) — AWS Load Balancer Controller v3.6.2
  - [Ingress API is frozen](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/ingress.md#L27) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [ingressClassName omitted → default IngressClass](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/ingress.md#L111) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 4.12 `lbc-reconcile` — LBC가 ALB·Target Group·Listener·Rule을 만듭니다  ·  `move` lbc → alb, token `call`: `elbv2:CreateLoadBalancer / CreateTargetGroup / CreateListener / CreateRule`
- **Subtitle:** Ingress watch 이벤트 하나가 ELBv2 API 호출 묶음이 됩니다.
- **Prose:**
  > LBC는 API server에서 Ingress 이벤트를 watch하고, 조건이 맞으면 ALB, Service별 Target Group, 포트별 Listener, path별 Rule을 만듭니다.
  > 이름은 `k8s-<ns 8자>-<name 8자>-<sha256 hex 10자>` 꼴입니다(예: `k8s-shop-orders-1a2b3c4d5e`).
  > 서브넷은 AZ마다 하나씩, 최소 두 AZ가 필요하고, public이면 `kubernetes.io/role/elb=1` 태그로 찾습니다.
  > LBC는 콘솔에서 고친 설정을 다음 reconcile에서 되돌릴 수 있습니다.
- **Facts:**
  | key | value |
  |---|---|
  | 만드는 리소스 | ALB, Target Group(Service별), Listener(포트별), Rule(path별) |
  | 이름 형식 | `k8s-%.8s-%.8s-%.10s` (ns, name, sha256 hex) |
  | 서브넷 조건 | 서로 다른 AZ 2개 이상, 서브넷당 가용 IP 8개 이상 |
  | public 서브넷 태그 | `kubernetes.io/role/elb` = `1` (internal은 `kubernetes.io/role/internal-elb`) |
- **Event log:** `lbc → alb · AWS ELBv2 API (HTTPS) · CreateLoadBalancer k8s-shop-orders-1a2b3c4d5e + TG + Listener :80 + Rule / · ~2–3 s (E.G.)`
- **Sources:**
  - [How it works: watch Ingress → ALB, Target Groups, Listeners, Rules](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/how-it-works.md#L13-L35) — AWS Load Balancer Controller v3.6.2
  - [Load balancer name format](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/ingress/model_build_load_balancer.go#L122-L135) — AWS Load Balancer Controller v3.6.2
  - [Target group name format](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/ingress/model_build_target_group.go#L231-L252) — AWS Load Balancer Controller v3.6.2
  - [EKS: ≥2 subnets in different AZs, ≥8 free IPs; one subnet per AZ](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/alb-ingress.adoc#L33) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [Subnet role tags kubernetes.io/role/internal-elb and kubernetes.io/role/elb = 1](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/network-reqs.adoc#L222-L243) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [EKS: LBC creates ALB for Ingress, NLB for Service type LoadBalancer](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/networking/aws-load-balancer-controller.adoc#L22-L31) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 4.13 `tgb-register-ip` — TargetGroupBinding이 Pod IP를 등록합니다  ·  `mutate` alb
- **Subtitle:** `target-type: ip`이면 target은 `Id = Pod IP`, `Port = container port`입니다.
- **Prose:**
  > LBC는 내부적으로 Service가 있는 namespace에 `TargetGroupBinding`(TGB)을 만들고, 그 TGB를 reconcile해 target을 등록합니다.
  > `ip` 모드는 Service의 EndpointSlice에서 Pod IP와 포트를 읽어 `RegisterTargets`에 `Id: "10.0.45.67"`, `Port: 8080`을 넣습니다.
  > 이 모드는 Pod IP가 VPC에서 직접 닿아야 하므로 VPC CNI처럼 ENI secondary IP를 쓰는 CNI가 필요합니다. Service type은 상관없습니다.
- **Facts:**
  | key | value |
  |---|---|
  | `ip` target | `Id` = Pod IP, `Port` = Pod 포트 (EndpointSlice에서) |
  | 필요 조건 | Pod IP가 ENI secondary IP (예: amazon-vpc-cni-k8s) |
  | Fargate / Hybrid Nodes | `ip` target type 필수 |
  | TGB 재동기화 | `--sync-period` 기본 `10h` |
- **Event log:** `lbc → alb · AWS ELBv2 API · RegisterTargets [{Id:10.0.18.34,Port:8080},{Id:10.0.45.67,Port:8080}] · ~0.3 KB (E.G.)`
- **State:** before → after
  | target Id | Port | AZ | health |
  |---|---|---|---|
  | ~~(없음)~~ → `10.0.18.34` | `8080` | `us-west-2a` | `initial` (E.G.) |
  | ~~(없음)~~ → `10.0.45.67` | `8080` | `us-west-2b` | `initial` (E.G.) |
- **Record:** R6
- **Sources:**
  - [LBC internally uses TargetGroupBinding for Ingress/Service; sync-period 10h](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/targetgroupbinding/targetgroupbinding.md#L16-L27) — AWS Load Balancer Controller v3.6.2
  - [reconcileWithIPTargetType → ResolvePodEndpoints](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/resource_manager.go#L168-L179) — AWS Load Balancer Controller v3.6.2
  - [ResolvePodEndpoints reads EndpointSlices](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/backend/endpoint_resolver.go#L60-L70) — AWS Load Balancer Controller v3.6.2
  - [IP target: TargetDescription{Id: endpoint.IP, Port: endpoint.Port}](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/resource_manager.go#L625-L633) — AWS Load Balancer Controller v3.6.2
  - [target-type ip requires secondary-IP CNI; service type does not matter](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L217-L232) — AWS Load Balancer Controller v3.6.2
  - [EKS: IP target type required for Fargate and Hybrid Nodes](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/alb-ingress.adoc#L84-L89) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 4.14 `alb-healthcheck` — ALB가 Pod를 직접 health check합니다  ·  `move` alb → orders-b, token `request`: `GET / (health check)`
- **Subtitle:** 기본값은 HTTP `traffic-port`, path `/`, 15초 간격, 5초 timeout, 성공 2회 / 실패 2회, `200`.
- **Prose:**
  > `ip` 모드에서 health check는 Pod IP의 target port로 갑니다. `instance` 모드라면 NodePort로 갑니다.
  > 연속 2회 성공해야 healthy, 연속 2회 실패하면 unhealthy입니다.
  > kubelet의 readiness probe와 ALB health check는 서로 다른 두 검사입니다. 앞은 EndpointSlice를, 뒤는 Target Group을 바꿉니다.
- **Facts:**
  | key | value |
  |---|---|
  | `healthcheck-port` / `-protocol` / `-path` | `traffic-port` / `HTTP` / `/` (gRPC면 `/AWS.ALB/healthcheck`) |
  | `healthcheck-interval-seconds` / `-timeout-seconds` | `15` / `5` |
  | `healthy-threshold-count` / `unhealthy-threshold-count` | `2` / `2` |
  | `success-codes` | `200` (gRPC `12`) |
- **Event log:** `alb → orders-b · HTTP health check · GET / → 200 (2/2 healthy) · 15 s interval`
- **Sources:**
  - [Health check annotation defaults](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L49-L56) — AWS Load Balancer Controller v3.6.2
  - [healthcheck-port: NodePort for instance, TargetPort for ip](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L888-L898) — AWS Load Balancer Controller v3.6.2

#### 4.15 `readiness-gate` — ALB에서 healthy가 되어야 Pod가 `Ready`  ·  `mutate` orders-b
- **Subtitle:** `target-health.elbv2.k8s.aws/<tgb>` condition이 `True`가 되면 rolling update가 다음 Pod로 넘어갑니다.
- **Prose:**
  > namespace에 `elbv2.k8s.aws/pod-readiness-gate-inject: enabled` label을 달면, LBC의 mutating webhook이 Pod 생성 시 `spec.readinessGates`를 넣습니다(`ip` 모드에서만).
  > Pod는 모든 container가 ready이고 모든 readiness gate condition이 `True`여야 `Ready`입니다.
  > 그래서 새 Pod가 Target Group에서 healthy가 되기 전에는 Deployment가 옛 Pod를 지우지 않습니다. 이것이 배포 중 503을 막는 장치입니다.
- **Facts:**
  | key | value |
  |---|---|
  | namespace label | `elbv2.k8s.aws/pod-readiness-gate-inject: enabled` |
  | condition type prefix | `target-health.elbv2.k8s.aws` (legacy `target-health.alb.ingress.k8s.aws`) |
  | 주입 시점 | Pod 생성 시에만 (Ingress/Service를 먼저 만들어야 함) |
  | 적용 범위 | `target-type: ip`만 |
- **Event log:** `lbc → apiserver · HTTPS REST · PATCH pods/orders-b/status target-health.elbv2.k8s.aws/k8s-shop-orders-1a2b3c4d5e=True · ~0.3 KB (E.G.)`
- **State:** before → after (이 step 앞에서 readinessGate가 있는 Pod라고 가정: 4.3의 `Ready True`는 gate가 없을 때의 흐름)
  | type | status |
  |---|---|
  | `target-health.elbv2.k8s.aws/k8s-shop-orders-1a2b3c4d5e` (E.G.) | ~~False~~ → `True` |
  | `ContainersReady` | `True` |
  | `Ready` | ~~False~~ → `True` |
- **Record:** R7
- **Sources:**
  - [Pod readiness gate: label, webhook injection, ip-only, condition set when target is Healthy](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/deploy/pod_readiness_gate.md#L1-L45) — AWS Load Balancer Controller v3.6.2
  - [Legacy prefix and example condition type](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/deploy/pod_readiness_gate.md#L94-L124) — AWS Load Balancer Controller v3.6.2
  - [Pod readiness gates: Ready only when all containers ready and all gates True](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L680-L687) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [readinessGates spec field](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L636-L651) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 4.16 `internet-request` — 인터넷 사용자가 ALB에 요청합니다  ·  `move` user → alb, token `request`: `GET http://k8s-shop-orders-….elb.amazonaws.com/`
- **Subtitle:** Listener `:80`의 Rule `/`가 Target Group `k8s-shop-orders-…`로 보냅니다.
- **Prose:**
  > `internet-facing` ALB는 public 서브넷에 있고, DNS 이름이 Ingress `status.loadBalancer.ingress[].hostname`에 적힙니다.
  > Listener가 요청을 받고 path rule을 평가해 Target Group 하나를 고릅니다.
  > 같은 ALB를 여러 Ingress가 나눠 쓰려면 `alb.ingress.kubernetes.io/group.name`으로 IngressGroup을 만듭니다.
- **Facts:**
  | key | value |
  |---|---|
  | Listener | `HTTP:80` (기본) |
  | Rule | path별 1개 (`pathType: Prefix` `/`) |
  | 공유 ALB | `alb.ingress.kubernetes.io/group.name` (기본: Ingress 하나가 그룹 하나) |
- **Event log:** `user → alb · HTTP/1.1 · GET / · ~0.5 KB (E.G.)`
- **Sources:**
  - [Listeners per port, Rules per path](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/how-it-works.md#L26-L28) — AWS Load Balancer Controller v3.6.2
  - [IngressGroup: implicit group by default; group.name](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L99-L101) — AWS Load Balancer Controller v3.6.2
  - [EKS: IngressGroups share an ALB](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/alb-ingress.adoc#L96-L102) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 4.17 `alb-to-pod-ip` — `ip` 모드: ALB가 Pod IP로 바로 보냅니다  ·  `move` alb → orders-b, token `request`: `GET / (dst 10.0.45.67:8080)`
- **Subtitle:** 노드의 kube-proxy 규칙을 거치지 않습니다. hop 하나, Pod 단위 health check.
- **Prose:**
  > `ip` 모드에서 트래픽은 ALB에서 Pod로 바로 갑니다. NodePort도, `KUBE-SERVICES`도 거치지 않습니다.
  > 그래서 노드 간 추가 hop이 없고, Pod 하나가 unhealthy면 ALB가 그 Pod만 뺍니다.
  > sticky session이 필요하면 `ip` 모드여야 합니다.
- **Facts:**
  | key | value |
  |---|---|
  | 경로 | ALB → Pod IP:8080 (kube-proxy 규칙 없음) |
  | sticky session | `ip` 모드 필요 |
  | IPv6 Pod로 LB | `ip` target만 가능 |
- **Event log:** `alb → orders-b · HTTP/1.1 (VPC) · GET / → 200 OK · 3 ms (E.G.)`
- **Sources:**
  - [IP mode: traffic reaches pods directly](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/how-it-works.md#L39-L48) — AWS Load Balancer Controller v3.6.2
  - [ip mode required for sticky sessions](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L231-L232) — AWS Load Balancer Controller v3.6.2
  - [EKS: IPv6 only to IP targets](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/alb-ingress.adoc#L76) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 4.18 `instance-mode-contrast` — 비교: `instance` 모드라면 NodePort와 kube-proxy를 한 번 더 지납니다  ·  `move` alb → netfilter, token `request`: `GET / (dst 10.0.20.11:31234)`
- **Subtitle:** target은 EC2 instance ID + NodePort, 노드에서 SNAT 후 다른 노드의 Pod로 갈 수 있습니다.
- **Prose:**
  > `instance` 모드는 Service가 `NodePort` 또는 `LoadBalancer`여야 하고, LBC는 Ready인 노드마다 `Id: i-…`, `Port: <nodePort>`를 등록합니다.
  > 패킷은 `KUBE-NODEPORTS` → `KUBE-EXT-AIOWKCZMN5S45HKT` → `KUBE-MARK-MASQ`(SNAT 표시) → `KUBE-SVC-…` → 무작위 `KUBE-SEP`로 갑니다.
  > 그래서 node A로 들어온 요청이 node B의 Pod로 한 번 더 넘어갈 수 있고, Pod는 노드 IP를 source로 봅니다.
  > `externalTrafficPolicy: Local`이면 로컬 Pod로만 보내 source IP를 지키지만, 로컬 Pod가 없는 노드는 패킷을 버립니다.
- **Facts:**
  | key | value |
  |---|---|
  | `instance` target | `Id` = EC2 instance ID, `Port` = Service NodePort |
  | NodePort 범위 기본값 | `30000-32767` |
  | Cluster policy 외부 트래픽 | `KUBE-EXT-…`에서 `KUBE-MARK-MASQ` → `POSTROUTING` `MASQUERADE` |
  | 기본 target-type | `instance` (그래서 `ip`를 명시해야 함) |
- **Event log:** `alb → netfilter · HTTP/1.1 → netfilter nat · dst 10.0.20.11:31234 → KUBE-NODEPORTS → KUBE-EXT → SNAT → 10.0.45.67:8080 · +1 hop (E.G.)`
- **State:** (alb Target Group, instance 모드였다면)
  | target Id | Port | AZ | health |
  |---|---|---|---|
  | ~~`10.0.18.34`~~ → `i-0a1b2c3d4e5f60718` (E.G.) | ~~`8080`~~ → `31234` (E.G.) | `us-west-2a` | `healthy` |
  | ~~`10.0.45.67`~~ → `i-0f9e8d7c6b5a40321` (E.G.) | ~~`8080`~~ → `31234` (E.G.) | `us-west-2b` | `healthy` |
- **Record:** R6 (instance variant)
- **Sources:**
  - [instance mode: NodePort on all instances; service must be NodePort or LoadBalancer](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L217-L222) — AWS Load Balancer Controller v3.6.2
  - [ResolveNodePortEndpoints: NodePort/LoadBalancer only, Ready nodes, instance ID + NodePort](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/backend/endpoint_resolver.go#L72-L110) — AWS Load Balancer Controller v3.6.2
  - [Instance target: TargetDescription{Id: InstanceID, Port: NodePort}](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/resource_manager.go#L675-L684) — AWS Load Balancer Controller v3.6.2
  - [EKS: instance mode routes to NodePort then proxied to Pods; default mode](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/alb-ingress.adoc#L84-L85) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [KUBE-NODEPORTS → external chain](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L1025-L1046) — Kubernetes v1.36.2
  - [EXT chain masquerades unless externalPolicy Local; falls through to policy chain](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L1117-L1167) — Kubernetes v1.36.2
  - [KUBE-POSTROUTING MASQUERADE for marked packets; KUBE-MARK-MASQ sets mark](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L750-L781) — Kubernetes v1.36.2
  - [NodePort range default 30000-32767](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/service.md#L473-L476) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [NodePort: node SNATs to its own IP and DNATs to the Pod IP](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tutorials/services/source-ip.md#L200-L210) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [externalTrafficPolicy Local preserves source IP; drops without local endpoints](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tutorials/services/source-ip.md#L216-L224) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

### Decoder records

#### R1. Service `shop/orders` (step 4.1) — layer bar: metadata / spec.selector / spec.ports / spec (IP) / status
```yaml
apiVersion: v1
kind: Service
metadata:
  name: orders
  namespace: shop
  uid: 6f1c2a9e-3b7d-4c1e-9a52-0d8e4f7b1c33        # E.G.
  resourceVersion: "184223"                         # E.G.
spec:
  selector:
    app: orders
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
  clusterIP: 10.100.73.21                           # E.G.
  clusterIPs: [10.100.73.21]                        # E.G.
  ipFamilies: [IPv4]
  ipFamilyPolicy: SingleStack
  sessionAffinity: None
  internalTrafficPolicy: Cluster
status:
  loadBalancer: {}
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `spec.selector` | `app: orders` | 이 label을 가진 Pod가 EndpointSlice에 들어감 | |
| `spec.ports[].port` | `80` | ClusterIP에서 받는 포트 | |
| `spec.ports[].targetPort` | `8080` | DNAT 목적지 포트(생략 시 `port`와 같음) | |
| `spec.ports[].protocol` | `TCP` | 기본값 TCP, iptables 규칙의 `-p tcp` | |
| `spec.type` | `ClusterIP` | 기본 타입 | |
| `spec.clusterIP` / `clusterIPs` | `10.100.73.21` | Service CIDR에서 할당된 가상 IP | E.G. |
| `spec.sessionAffinity` | `None` | `ClientIP`면 `recent` 모듈로 고정, timeout 기본 10800초 | |
| `spec.internalTrafficPolicy` | `Cluster` | 모든 노드의 endpoint로 분배(`Local`이면 같은 노드만) | |
| `metadata.uid`, `resourceVersion` | — | 객체 식별자·버전 | E.G. |

Sources: [ServiceSpec fields](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/core/v1/types.go#L5988-L6217) — Kubernetes v1.36.2; [ServicePort fields](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/core/v1/types.go#L6243-L6287) — Kubernetes v1.36.2; [SetDefaults_Service](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/apis/core/v1/defaults.go#L106-L146) — Kubernetes v1.36.2; [sessionAffinity timeout default 10800](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/networking/virtual-ips.md#L402-L409) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### R2. EndpointSlice `shop/orders-7xk2p` (step 4.2, after 4.3) — layer bar: metadata.labels / addressType / ports / endpoints[0] / endpoints[1]
```yaml
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: orders-7xk2p                                  # E.G. (generateName)
  namespace: shop
  labels:
    kubernetes.io/service-name: orders
    endpointslice.kubernetes.io/managed-by: endpointslice-controller.k8s.io
  ownerReferences:
  - apiVersion: v1
    kind: Service
    name: orders
addressType: IPv4
ports:
- name: http
  protocol: TCP
  port: 8080
endpoints:
- addresses: ["10.0.18.34"]                           # E.G.
  conditions: {ready: true, serving: true, terminating: false}
  nodeName: ip-10-0-20-11.us-west-2.compute.internal  # E.G.
  zone: us-west-2a                                    # E.G.
  targetRef: {kind: Pod, namespace: shop, name: orders-a}
- addresses: ["10.0.45.67"]                           # E.G.
  conditions: {ready: true, serving: true, terminating: false}
  nodeName: ip-10-0-40-12.us-west-2.compute.internal  # E.G.
  zone: us-west-2b                                    # E.G.
  targetRef: {kind: Pod, namespace: shop, name: orders-b}
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.labels["kubernetes.io/service-name"]` | `orders` | 이 슬라이스가 속한 Service | |
| `metadata.labels["endpointslice.kubernetes.io/managed-by"]` | `endpointslice-controller.k8s.io` | 관리 주체 | |
| `addressType` | `IPv4` | 주소 패밀리(슬라이스는 패밀리별로 나뉨) | |
| `ports[].port` | `8080` | Pod 쪽 포트(= targetPort) | |
| `endpoints[].addresses` | `10.0.18.34` | Pod IP — `KUBE-SEP`의 DNAT 목적지 | E.G. |
| `endpoints[].conditions.ready` | `true` | `serving` 이고 not `terminating` | |
| `endpoints[].conditions.serving` | `true` | Pod `Ready` condition을 반영 | |
| `endpoints[].conditions.terminating` | `false` | 종료 중 여부 | |
| `endpoints[].nodeName` / `zone` | node / AZ | topology·`Local` policy 판단에 사용 | E.G. |
| `endpoints[].targetRef` | `Pod orders-a` | 이 endpoint를 만든 Pod | E.G. |

Sources: [EndpointSlice Go types](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/discovery/v1/types.go#L54-L166) — Kubernetes v1.36.2; [EndpointSlice example](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/endpoint-slices.md#L39-L60) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e); [labels and ownership](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/endpoint-slices.md#L136-L150) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### R3. node A nat table for `shop/orders` (step 4.5) — layer bar: chain declarations / KUBE-SERVICES / KUBE-SVC / KUBE-SEP ×2 / KUBE-POSTROUTING + KUBE-MARK-MASQ
The text is the `iptables-restore` input kube-proxy writes (rule order and spelling from `proxier.go` and its upstream test). Chain hashes are deterministic: computed with the same `sha256 → base32 → [:16]` from `shop/orders:http`+`tcp` (and `+ "IP:port"` for SEP), and the method was checked against upstream test vectors (`ns1/svc1:p80`+`tcp` → `XPGD46QRK7WJZT7O`, SEP `SXIVWICOYRO3J4NJ`). They change if the namespace, name, port name or Pod IP changes.
```text
*nat
:KUBE-SERVICES - [0:0]
:KUBE-NODEPORTS - [0:0]
:KUBE-POSTROUTING - [0:0]
:KUBE-MARK-MASQ - [0:0]
:KUBE-SVC-AIOWKCZMN5S45HKT - [0:0]
:KUBE-SEP-XLXLDHVODIJ3H7US - [0:0]
:KUBE-SEP-E2DMA6D4FLSL2M5D - [0:0]
-A KUBE-POSTROUTING -m mark ! --mark 0x4000/0x4000 -j RETURN
-A KUBE-POSTROUTING -j MARK --xor-mark 0x4000
-A KUBE-POSTROUTING -m comment --comment "kubernetes service traffic requiring SNAT" -j MASQUERADE --random-fully
-A KUBE-MARK-MASQ -j MARK --or-mark 0x4000
-A KUBE-SERVICES -m comment --comment "shop/orders:http cluster IP" -m tcp -p tcp -d 10.100.73.21 --dport 80 -j KUBE-SVC-AIOWKCZMN5S45HKT
-A KUBE-SVC-AIOWKCZMN5S45HKT -m comment --comment "shop/orders:http -> 10.0.18.34:8080" -m statistic --mode random --probability 0.5000000000 -j KUBE-SEP-XLXLDHVODIJ3H7US
-A KUBE-SVC-AIOWKCZMN5S45HKT -m comment --comment "shop/orders:http -> 10.0.45.67:8080" -j KUBE-SEP-E2DMA6D4FLSL2M5D
-A KUBE-SEP-XLXLDHVODIJ3H7US -m comment --comment shop/orders:http -s 10.0.18.34 -j KUBE-MARK-MASQ
-A KUBE-SEP-XLXLDHVODIJ3H7US -m comment --comment shop/orders:http -m tcp -p tcp -j DNAT --to-destination 10.0.18.34:8080
-A KUBE-SEP-E2DMA6D4FLSL2M5D -m comment --comment shop/orders:http -s 10.0.45.67 -j KUBE-MARK-MASQ
-A KUBE-SEP-E2DMA6D4FLSL2M5D -m comment --comment shop/orders:http -m tcp -p tcp -j DNAT --to-destination 10.0.45.67:8080
-A KUBE-SERVICES -m comment --comment "kubernetes service nodeports; NOTE: this must be the last rule in this chain" -m addrtype --dst-type LOCAL -j KUBE-NODEPORTS
COMMIT
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `KUBE-SERVICES` rule `-d` / `--dport` | `10.100.73.21` / `80` | ClusterIP:port를 잡는 진입 규칙 | E.G. (IP) |
| `KUBE-SVC-AIOWKCZMN5S45HKT` | hash of `shop/orders:http`+`tcp` | Service 포트 하나당 체인 하나(Cluster policy) | deterministic |
| `-m statistic --mode random --probability` | `0.5000000000` | n=2 중 첫 endpoint 확률 `1/2`; 마지막 규칙은 조건 없음 | |
| `KUBE-SEP-XLXLDHVODIJ3H7US` | hash of name+proto+`10.0.18.34:8080` | endpoint 하나당 체인 하나 | E.G. (IP 따라 바뀜) |
| `-s <podIP> -j KUBE-MARK-MASQ` | `10.0.18.34` | hairpin(자기 Service로 자기 자신)일 때만 SNAT 표시 | E.G. |
| `-j DNAT --to-destination` | `10.0.45.67:8080` | 실제 목적지로 바꿈 | E.G. |
| `--or-mark 0x4000` / `--xor-mark 0x4000` | mark bit 14 | SNAT 대상 표시와 해제 | |
| `MASQUERADE --random-fully` | — | 표시된 패킷만 노드 IP로 SNAT (`--random-fully`는 iptables가 지원할 때만) | |
| `-m comment --comment` | `shop/orders:http …` | endpoint chain이 1000개를 넘는 large cluster mode에서는 생략됨 | |
| last `KUBE-SERVICES` rule | `--dst-type LOCAL -j KUBE-NODEPORTS` | NodePort 처리는 항상 마지막 | |

Not shown (conditional, see open items): the `KUBE-SVC-… ! -s <clusterCIDR> -j KUBE-MARK-MASQ` rule that kube-proxy adds only when `masqueradeAll` is set or a local-traffic detector is configured.

Sources: [chain names and hash](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L542-L594) — Kubernetes v1.36.2; [KUBE-POSTROUTING / KUBE-MARK-MASQ rules](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L750-L781) — Kubernetes v1.36.2; [ClusterIP capture](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L938-L946) — Kubernetes v1.36.2; [conditional KUBE-SVC masquerade rule](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L1085-L1109) — Kubernetes v1.36.2; [SEP rules](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L1231-L1259) — Kubernetes v1.36.2; [nodeports tail rule](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L1290-L1307) — Kubernetes v1.36.2; [SVC load-balancing rules](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L1469-L1489) — Kubernetes v1.36.2; [comment dropped in large cluster mode (threshold 1000)](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L614-L622) — Kubernetes v1.36.2; [largeClusterEndpointsThreshold = 1000](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier.go#L86) — Kubernetes v1.36.2; [upstream expected output for a 2-endpoint Service](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/proxy/iptables/proxier_test.go#L1467-L1470) — Kubernetes v1.36.2

#### R4. `web` Pod `/etc/resolv.conf` (step 4.6) — layer bar: nameserver / search / options
```text
nameserver 10.100.0.10
search shop.svc.cluster.local svc.cluster.local cluster.local us-west-2.compute.internal
options ndots:5
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `nameserver` | `10.100.0.10` | `kube-dns` Service ClusterIP | E.G. |
| `search` (1–3) | `shop.svc.cluster.local svc.cluster.local cluster.local` | 짧은 이름 뒤에 차례로 붙여 봄 | |
| `search` (4) | `us-west-2.compute.internal` | 노드의 resolv.conf에서 이어받은 도메인 | E.G. — **unverified** |
| `options ndots:5` | `5` | 점이 5개 미만이면 search 목록부터 시도 | |

Sources: [resolv.conf example](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/dns-pod-service.md#L42-L51) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e); [EKS nameserver 10.100.0.10](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/sample-deployment.adoc#L249-L254) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### R5. IngressClass `alb` + Ingress `shop/orders` (step 4.11) — layer bar: IngressClass / metadata.annotations / spec.rules / status
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
    alb.ingress.kubernetes.io/healthcheck-path: /
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
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `IngressClass.spec.controller` | `ingress.k8s.aws/alb` | LBC가 맡는 Ingress 표시 | |
| `spec.ingressClassName` | `alb` | 생략하면 default IngressClass | |
| `alb.ingress.kubernetes.io/scheme` | `internet-facing` | 기본 `internal` | |
| `alb.ingress.kubernetes.io/target-type` | `ip` | 기본 `instance` | |
| `alb.ingress.kubernetes.io/healthcheck-path` | `/` | HTTP 기본 `/` | |
| `spec.rules[].http.paths[].pathType` | `Prefix` | `/` 단위 prefix 매치; `pathType` 필수 | |
| `backend.service.name` / `port.number` | `orders` / `80` | Target Group 하나가 이 Service 포트에 대응 | |
| `status.loadBalancer.ingress[].hostname` | `k8s-shop-orders-…elb.amazonaws.com` | ALB DNS 이름 | E.G. — hostname 뒤쪽 형식 **unverified** |

Sources: [ingress_class.md](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/ingress_class.md#L8-L32) — AWS Load Balancer Controller v3.6.2; [annotation table](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/ingress/annotations.md#L26-L56) — AWS Load Balancer Controller v3.6.2; [pathType required, Prefix semantics](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/services-networking/ingress.md#L186-L198) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### R6. `RegisterTargets` payload (step 4.13; instance variant at 4.18) — layer bar: TargetGroupArn / Targets[0] / Targets[1]
`ip` target type:
```json
{
  "TargetGroupArn": "arn:aws:elasticloadbalancing:us-west-2:111122223333:targetgroup/k8s-shop-orders-9f8e7d6c5b/0123456789abcdef",
  "Targets": [
    { "Id": "10.0.18.34", "Port": 8080, "AvailabilityZone": null },
    { "Id": "10.0.45.67", "Port": 8080, "AvailabilityZone": null }
  ]
}
```
`instance` target type (if the Service were `NodePort` with `nodePort: 31234`):
```json
{
  "TargetGroupArn": "arn:aws:elasticloadbalancing:us-west-2:111122223333:targetgroup/k8s-shop-orders-9f8e7d6c5b/0123456789abcdef",
  "Targets": [
    { "Id": "i-0a1b2c3d4e5f60718", "Port": 31234 },
    { "Id": "i-0f9e8d7c6b5a40321", "Port": 31234 }
  ]
}
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `TargetGroupArn` | `arn:…:targetgroup/k8s-shop-orders-<hash10>/…` | TGB `spec.targetGroupARN` | E.G. |
| `Targets[].Id` (ip) | `10.0.45.67` | EndpointSlice의 Pod IP | E.G. |
| `Targets[].Port` (ip) | `8080` | Pod 포트 | |
| `Targets[].Id` (instance) | `i-0a1b2c3d4e5f60718` | Ready 노드의 EC2 instance ID (Node `spec.providerID`에서) | E.G. |
| `Targets[].Port` (instance) | `31234` | Service NodePort (30000–32767) | E.G. |
| `Targets[].AvailabilityZone` | 보통 생략 | VPC 밖 IP 등 특수한 경우에만 LBC가 채움 | **unverified** (when exactly) |

Sources: [IP target TargetDescription](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/resource_manager.go#L625-L645) — AWS Load Balancer Controller v3.6.2; [instance target TargetDescription](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/targetgroupbinding/resource_manager.go#L675-L684) — AWS Load Balancer Controller v3.6.2; [NodePortEndpoint / PodEndpoint types](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/pkg/backend/endpoint_types.go#L17-L53) — AWS Load Balancer Controller v3.6.2; [TGB spec fields targetGroupARN, targetType, serviceRef](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/guide/targetgroupbinding/spec.md#L89-L122) — AWS Load Balancer Controller v3.6.2

#### R7. Pod `shop/orders-b` readiness fields (step 4.15) — layer bar: spec.readinessGates / status.conditions
```yaml
spec:
  readinessGates:
  - conditionType: target-health.elbv2.k8s.aws/k8s-shop-orders-1a2b3c4d5e    # E.G.
  containers:
  - name: app
    ports: [{name: http, containerPort: 8080}]
    readinessProbe:
      httpGet: {path: /ready, port: 8080}
status:
  podIP: 10.0.45.67                                                         # E.G.
  conditions:
  - type: target-health.elbv2.k8s.aws/k8s-shop-orders-1a2b3c4d5e            # E.G.
    status: "True"
  - type: ContainersReady
    status: "True"
  - type: Ready
    status: "True"
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `spec.readinessGates[].conditionType` | `target-health.elbv2.k8s.aws/<tgb-name>` | LBC webhook이 Pod 생성 시 주입 | E.G. (이름) |
| `spec.containers[].readinessProbe` | `httpGet /ready :8080` | kubelet 검사 → `ContainersReady` | E.G. |
| `status.conditions[type=target-health…]` | `True` | Target Group에서 `Healthy`일 때 LBC가 True로 | |
| `status.conditions[type=ContainersReady]` | `True` | 모든 container ready | |
| `status.conditions[type=Ready]` | `True` | 위 두 가지가 모두 True일 때만 | |

Sources: [pod_readiness_gate.md](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/deploy/pod_readiness_gate.md#L1-L45) — AWS Load Balancer Controller v3.6.2; [example condition](https://github.com/kubernetes-sigs/aws-load-balancer-controller/blob/v3.6.2/docs/deploy/pod_readiness_gate.md#L116-L124) — AWS Load Balancer Controller v3.6.2; [readinessGates and Ready evaluation](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L636-L687) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

### Self-check
1. **Q.** ClusterIP `10.100.73.21`은 어느 NIC에도 없습니다. `web`이 보낸 SYN이 Pod에 닿기까지 무엇이 목적지를 바꾸나요? **A.** 노드 A의 netfilter nat table입니다. kube-proxy가 써 둔 `KUBE-SERVICES` 규칙이 ClusterIP:80을 잡아 `KUBE-SVC-…`로 보내고, 거기서 무작위로 고른 `KUBE-SEP-…`가 `DNAT --to-destination 10.0.45.67:8080`을 합니다. 이후 패킷과 응답은 conntrack 항목을 따릅니다.
2. **Q.** endpoint가 3개일 때 `KUBE-SVC` 체인의 세 규칙 확률은? **A.** 첫 규칙 `1/3`(`0.3333333333`), 둘째 `1/2`(`0.5000000000`), 셋째는 조건 없음. 결과적으로 각각 1/3입니다.
3. **Q.** 클러스터 안 Pod가 ClusterIP를 부를 때와 `instance` 모드 ALB로 들어올 때, 백엔드 Pod가 보는 source IP는? **A.** ClusterIP(iptables 모드)는 SNAT하지 않아 호출한 Pod IP가 보입니다. `instance` 모드는 NodePort → `KUBE-EXT`에서 `KUBE-MARK-MASQ`가 붙어 노드 IP로 SNAT됩니다(`externalTrafficPolicy: Cluster`일 때). `ip` 모드는 ALB가 Pod로 직접 보냅니다.
4. **Q.** `target-type: ip`와 `instance`의 target `Id`/`Port`는 각각 무엇이고, Fargate에는 왜 `ip`만 되나요? **A.** `ip`: Pod IP / Pod 포트. `instance`: EC2 instance ID / Service NodePort. Fargate에는 ALB가 등록할 EC2 instance도, kube-proxy도 없으므로 `ip`가 필수입니다(EKS 문서).
5. **Q.** Rolling update 중 ALB 503을 막으려면 무엇을 켜고, 어떤 조건이 필요하나요? **A.** namespace에 `elbv2.k8s.aws/pod-readiness-gate-inject: enabled` label을 달면 LBC webhook이 `target-health.elbv2.k8s.aws/<tgb>` readiness gate를 Pod 생성 시 주입합니다. `ip` 모드여야 하고 Ingress/Service가 Pod보다 먼저 있어야 합니다. 새 Pod는 Target Group에서 healthy가 되어야 `Ready`가 되므로 Deployment가 옛 Pod를 너무 일찍 지우지 않습니다.
6. **Q.** 1.36에서 kube-proxy 기본 모드는? IPVS는 왜 피하나요? **A.** Linux 기본은 `iptables`입니다. IPVS는 upstream에서 v1.35부터 deprecated이고, upstream 문서는 `nftables`(kernel 5.13+, 1.33 GA)를 대안으로 권합니다. EKS 문서는 1.36에서 IPVS가 제거된다고 적었지만 upstream v1.36.2 코드에는 아직 남아 있습니다(아래 open 항목).

### Unverified / open (this lesson)
- **IPVS in 1.36 — sources disagree.** The pinned EKS guide (1.35 notes, `kubernetes-versions-standard.adoc#L72`) says IPVS "will be removed in Kubernetes 1.36", but upstream v1.36.2 still builds the ipvs proxier with a deprecation warning (`cmd/kube-proxy/app/server_linux.go#L195-L197`) and the 1.36 docs list IPVS as deprecated since v1.35. Whether the EKS `kube-proxy` add-on for 1.36 still accepts `mode: ipvs` is **unverified**.
- **EKS kube-proxy add-on default mode and local-traffic detection** (the `clusterCIDR`/`detectLocalMode` that controls the conditional `! -s <cidr> -j KUBE-MARK-MASQ` rule in `KUBE-SVC-…`): **unverified**. The add-on's default ConfigMap was not found in the pinned EKS guide. R3 leaves that rule out.
- **Whether EKS supports or documents `nftables` mode for kube-proxy:** **unverified**. The pinned EKS guide has no mention of nftables.
- **Conntrack reverse NAT on replies** (step 4.10, R3 conntrack panel): this is Linux netfilter behavior. No pinned official Kubernetes or EKS line states the un-DNAT mechanics, so the conntrack table format and `SYN_SENT` state are illustrative (E.G.) and the mechanism is **unverified against a pinned source**.
- **`iptables-save` output formatting:** R3 shows the `iptables-restore` input kube-proxy writes, matching the upstream test. Whether `iptables-save` on an AL2023 node prints the probability with the same digits is **unverified**.
- **Order of endpoints inside `KUBE-SVC-…`** (which Pod gets the `0.5` rule): **unverified**. Shown in address order as E.G.
- **ALB behavior that only the ELB docs describe** (docs.aws.amazon.com blocked): `X-Forwarded-For` header contents, the default deregistration delay, the `initial` health state name, cross-zone default, and the exact ALB DNS hostname suffix are all **unverified** and are not stated as facts in the steps.
- **When LBC fills `AvailabilityZone` in `RegisterTargets`** (R6): the code shows an AZ override path for some IPs. The exact condition is **unverified**.
- **Search list 4th entry** (`us-west-2.compute.internal` inherited from the node): **unverified** for EKS AMIs.
- **Panel shape:** `netfilter` carries two state panels (nat table, conntrack). If the new schema allows one panel per node, split conntrack into a node `netfilter-ct` (open question for the engine redesign). `alb` uses kind `framework` as the closest fit (proposed kind: cloud).
- **EKS Auto Mode** has its own built-in load balancing that differs from the open-source LBC (LBC doc points to the EKS Auto Mode page). Not covered here.
- **LBC version pin:** this lesson pins LBC v3.6.2 (latest tag on 2026-11-03), but the pinned EKS install guide (`lbc-helm.adoc#L53`) still walks through v2.14.1. The annotation defaults used here were checked only at v3.6.2.

## Lesson 5 — `pod-iam`: Pod는 AWS 자격 증명을 어떻게 얻는가 (IRSA vs EKS Pod Identity)

**Goal.** 같은 `orders` Pod가 S3를 읽기 위한 임시 자격 증명을 IRSA(`AssumeRoleWithWebIdentity`)로 한 번, EKS Pod Identity(`AssumeRoleForPodIdentity`)로 한 번 받아 오는 길을 token 한 장 단위로 따라간다.

**Interview questions it answers.**
- IRSA에서 Pod 안의 SDK는 무엇을 들고 STS에 가며, STS는 그 token을 무엇으로 검증하는가?
- `eks.amazonaws.com/role-arn` annotation 하나로 왜 Pod spec에 env와 volume이 생기는가? (mutating admission webhook)
- projected ServiceAccount token은 언제 갱신되고, 기본 만료는 얼마인가? 앱은 무엇을 해야 하는가?
- EKS Pod Identity는 IRSA와 무엇이 다른가? (OIDC provider 불필요, trust principal `pods.eks.amazonaws.com`, session tags, node 단위 agent, STS 호출 주체)
- 둘 다 설정되어 있으면 어느 쪽이 쓰이는가? SDK 기본 credential provider chain의 순서는?
- 노드 IAM role(IMDS) 자격 증명이 Pod에 새는 것을 어떻게 막는가?

**Split or not.** 한 lesson으로 둔다. 1–11단계(IRSA)와 12–18단계(Pod Identity)는 같은 ServiceAccount, 같은 webhook, 같은 kubelet token 발급 경로를 공유하고, 차이는 "token을 누구에게 내고 누가 STS를 부르는가" 하나뿐이다. 나란히 보여야 그 차이가 보인다. Part B는 "IRSA → Pod Identity 마이그레이션" 이야기로 이어 붙인다(association을 만들고 Pod를 다시 만들면 webhook이 container credentials 방식을 우선한다). engine이 한 lesson 안의 두 갈래를 감당하지 못하면 12단계에서 `pod-iam-irsa` / `pod-iam-pod-identity`로 나누고 1, 3, 5, 6단계를 둘 다에 복사한다.

**Pins.** See "Version pins" at the top of this plan.

### Nodes
| id | label / sublabel | kind | layer | appears at step | isometric illustration idea |
|---|---|---|---|---|---|
| dev | Developer / `kubectl`, `aws` CLI | client | (always shown) | 1 | 노트북 위에 터미널 창 두 개 (`kubectl`, `aws`) |
| iam | IAM / OIDC provider + role | storage (proposed kind: cloud) | AWS | 1 | 열쇠 고리가 걸린 금고, 앞면에 `trust policy` 문서가 붙어 있음 |
| apiserver | kube-apiserver / admission | framework | Control plane | 2 | 관문(gate)이 두 칸으로 나뉜 서버: mutating → validating |
| pidwh | pod-identity-webhook / MutatingWebhookConfiguration | framework | Control plane | 3 | 도장(stamp)을 든 작은 서버, Pod 문서에 env를 찍어 줌 |
| kubelet | kubelet / token manager | container | Node | 5 | EC2 노드 상자 위의 선장 키, 옆에 시계가 달린 token 서랍 |
| pod | `orders` Pod / AWS SDK for Java 2.x | app | Workload | 4 | 컨테이너 상자 안의 커피잔(Java), 위에 `/var/run/secrets/...` 폴더 |
| oidc | EKS OIDC issuer / `oidc.eks.<region>.amazonaws.com/id/<ID>` | storage (proposed kind: cloud) | AWS | 9 | 공개 게시판에 걸린 공개키(JWKS) 열쇠 그림 |
| sts | AWS STS / regional endpoint | client (proposed kind: cloud) | AWS | 8 | 임시 출입증을 찍어 내는 발급기 |
| pidagent | eks-pod-identity-agent / DaemonSet, hostNetwork | container | Node | 12 | 노드 상자 옆면에 붙은 작은 창구, 간판 `169.254.170.23:80` |
| eksapi | Amazon EKS API / `CreatePodIdentityAssociation` | framework (proposed kind: cloud) | AWS | 13 | EKS 로고 없는 관리 콘솔 모니터, 표 한 줄(namespace/SA → role) |
| eksauth | EKS Auth API / `AssumeRoleForPodIdentity` | client (proposed kind: cloud) | AWS | 16 | STS 발급기 앞에 선 대리인(창구 직원), 손에 session tag 꼬리표 |

### State panels
| node | title | view | initial content |
|---|---|---|---|
| iam | IAM (account 111122223333) | table: `resource`, `값` | (비어 있음) |
| pod | `orders-7d9c5b8f6-x2k4q` 주입 상태 | table: `field`, `값` | `serviceAccountName`=`orders`, `env`=(없음), `volumes`=(kube-api-access-*만) |
| kubelet | token cache (`token_manager.go`) | table: `key (sa/aud)`, `exp`, `refresh after` | (비어 있음) |
| pod | SDK credential chain (Java `DefaultCredentialsProvider`) | list | 6개 provider, 모두 "미확인" |
| pidagent | credential cache (key = pod UID) | table: `pod UID`, `role`, `Expiration` | (비어 있음) |

(`pod`는 panel이 두 개다. engine이 node당 panel 하나만 허용하면 SDK chain panel을 `pod-sdk` 가상 node로 분리한다.)

### Steps

#### 5.1 `oidc-provider-and-trust` — IAM에 OIDC provider와 role trust policy 만들기  ·  `mutate` iam
- **Subtitle:** 클러스터의 OIDC issuer를 IAM이 믿게 하고, 그 issuer의 token만 받는 role을 만든다.
- **Prose:**
  > EKS 클러스터마다 OIDC issuer URL이 하나 있다. IRSA를 쓰려면 IAM에 이 URL로 OIDC provider를 만들고, audience를 `sts.amazonaws.com`으로 둔다.
  > 그다음 role의 trust policy에 `Principal.Federated`로 이 provider를, `Action`으로 `sts:AssumeRoleWithWebIdentity`를 넣는다.
  > `Condition`에서 `<issuer>:aud`와 `<issuer>:sub`(`system:serviceaccount:<ns>:<sa>`)를 묶어야 이 SA만 role을 쓴다. `sub` 조건이 없으면 클러스터의 모든 SA가 이 role을 쓸 수 있다.
- **Facts:**
  | key | value |
  |---|---|
  | OIDC provider audience | `sts.amazonaws.com` |
  | `sub` 형식 | `system:serviceaccount:<namespace>:<serviceaccount>` |
  | 계정당 OIDC provider 기본 한도 | 100 (클러스터마다 provider 1개 필요) |
  | trust policy 기본 길이 한도 | 2048자 → 보통 trust relationship 4개, 증설해도 최대 약 8개 |
- **Event log:** `dev → iam · AWS IAM API · CreateOpenIDConnectProvider + CreateRole (trust policy) · ~1 KB E.G.`
- **State:** before: (비어 있음) → after: `oidc-provider/oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE` (aud `sts.amazonaws.com`) · `role/orders-s3-reader` (trust: Federated, `sts:AssumeRoleWithWebIdentity`, aud/sub 조건)
- **Record:** R3
- **Sources:**
  - [EKSUG: Create an IAM OIDC provider — issuer URL, audience](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/enable-iam-roles-for-service-accounts.adoc#L13-L13) / [L76](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/enable-iam-roles-for-service-accounts.adoc#L76-L76) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [EKSUG: IRSA trust policy example (Federated, aud, sub)](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/storage/s3files-csi.adoc#L279-L293) — Amazon EKS User Guide @ 8d43223
  - [EKSUG: without a `sub` condition any service account can assume the role](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/cross-account-access.adoc#L62-L69) — Amazon EKS User Guide @ 8d43223
  - [EKSUG: comparison table — 100 OIDC providers, 2048 trust policy length](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/service-accounts.adoc#L109-L115) — Amazon EKS User Guide @ 8d43223

#### 5.2 `annotate-sa` — ServiceAccount에 role ARN 달기  ·  `move` dev → apiserver, token `request`: `PATCH serviceaccounts/orders`
- **Subtitle:** `eks.amazonaws.com/role-arn` annotation이 "이 SA는 이 role을 쓴다"는 유일한 표시다.
- **Prose:**
  > IRSA에서 SA와 role을 잇는 것은 SA의 annotation 하나다. Kubernetes 자체는 이 값을 해석하지 않는다.
  > 해석하는 쪽은 `pod-identity-webhook`이다. 선택 annotation으로 audience, regional STS endpoint, token 만료 시간을 바꿀 수 있다.
  > 이미 떠 있는 Pod에는 아무 변화가 없다. webhook은 Pod가 만들어질 때만 개입한다.
- **Facts:**
  | key | value |
  |---|---|
  | 필수 annotation | `eks.amazonaws.com/role-arn: arn:aws:iam::111122223333:role/orders-s3-reader` |
  | `eks.amazonaws.com/audience` 기본값 | `sts.amazonaws.com` |
  | `eks.amazonaws.com/token-expiration` 기본값 | `86400` (초) |
  | `eks.amazonaws.com/sts-regional-endpoints: "true"` | `AWS_STS_REGIONAL_ENDPOINTS=regional` 주입 |
- **Event log:** `dev → apiserver · HTTPS REST · PATCH /api/v1/namespaces/shop/serviceaccounts/orders · ~300 B E.G.`
- **Record:** R1 (위쪽 ServiceAccount 부분)
- **Sources:**
  - [EKSUG: kubectl annotate serviceaccount ... eks.amazonaws.com/role-arn](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/associate-service-account-role.adoc#L118-L123) — Amazon EKS User Guide @ 8d43223
  - [IRSAWH README: ServiceAccount annotations and defaults](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/README.md#L48-L66) — amazon-eks-pod-identity-webhook @ 52496af

#### 5.3 `admission-webhook` — Pod CREATE가 mutating webhook을 지나간다  ·  `move` apiserver → pidwh, token `call`: `AdmissionReview (Pod CREATE)`
- **Subtitle:** ReplicaSet controller가 만든 Pod 생성 요청이 mutating admission 단계에서 webhook으로 간다.
- **Prose:**
  > admission은 두 단계다. 먼저 mutating, 그다음 validating이 돈다. 그래서 webhook이 넣은 env와 volume도 이후 검증을 받는다.
  > webhook은 Pod의 `serviceAccountName`으로 SA를 찾아 role ARN annotation을 확인하고, 있으면 JSONPatch를 돌려준다.
  > EKS가 만드는 `MutatingWebhookConfiguration` 이름은 `pod-identity-webhook`이다.
- **Facts:**
  | key | value |
  |---|---|
  | admission 순서 | mutating → validating |
  | MutatingWebhookConfiguration 이름 | `pod-identity-webhook` |
  | 이 webhook의 `admissionReviewVersions` | `v1beta1` (`v1`로 바꾸면 동작하지 않음) |
  | admission webhook `failurePolicy` 기본값 | `Fail` |
- **Event log:** `apiserver → pidwh · HTTPS (AdmissionReview) · CREATE Pod shop/orders-7d9c5b8f6-x2k4q · ~4 KB E.G.`
- **Sources:**
  - [K8SDOC: admission control phases](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/access-authn-authz/admission-controllers.md#L64-L69) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [K8SDOC: default failurePolicy is Fail](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/access-authn-authz/extensible-admission-controllers.md#L1010-L1010) — Kubernetes 1.36 docs
  - [EKSUG: MutatingWebhookConfiguration `pod-identity-webhook`, v1beta1](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/addon-id-troubleshoot.adoc#L43-L44) — Amazon EKS User Guide @ 8d43223
  - [EKSUG: the webhook watches Pods whose SA has the role-arn annotation](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-configuration.adoc#L99-L106) — Amazon EKS User Guide @ 8d43223

#### 5.4 `irsa-pod-mutated` — Pod spec에 env 2개와 projected volume이 생긴다  ·  `mutate` pod
- **Subtitle:** `AWS_ROLE_ARN`, `AWS_WEB_IDENTITY_TOKEN_FILE`, 그리고 audience가 `sts.amazonaws.com`인 token volume.
- **Prose:**
  > webhook은 모든 container(`eks.amazonaws.com/skip-containers`에 적힌 것 제외)에 env 두 개와 read-only volumeMount를 넣는다.
  > volume은 `projected.sources[].serviceAccountToken`이다. Pod 안에는 아직 token 파일이 없다. 파일은 kubelet이 채운다.
  > container에 이미 `AWS_ROLE_ARN`이나 `AWS_WEB_IDENTITY_TOKEN_FILE`이 있으면 그 값을 덮어쓰지 않는다.
- **Facts:**
  | key | value |
  |---|---|
  | `AWS_WEB_IDENTITY_TOKEN_FILE` | `/var/run/secrets/eks.amazonaws.com/serviceaccount/token` |
  | volume 이름 / `path` | `aws-token` / `token` |
  | `audience` / `expirationSeconds` | `sts.amazonaws.com` / `86400` |
  | webhook token 만료 허용 범위 | 최소 600초, 최대 86400초 |
- **Event log:** `pidwh → apiserver · HTTPS (AdmissionReview response) · JSONPatch: +2 env, +1 volumeMount, +1 volume · ~1 KB E.G.`
- **State:** before: `env`=(없음), `volumes`=`kube-api-access-*` → after: `env`=`AWS_ROLE_ARN`, `AWS_WEB_IDENTITY_TOKEN_FILE` · `volumeMounts`=`aws-token` → `/var/run/secrets/eks.amazonaws.com/serviceaccount/` (readOnly) · `volumes`=`aws-token` (projected, aud `sts.amazonaws.com`, 86400s)
- **Record:** R1
- **Sources:**
  - [IRSAWH README: mutated Pod example](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/README.md#L67-L116) — amazon-eks-pod-identity-webhook @ 52496af
  - [IRSAWH handler.go: addEnvToContainer (no overwrite, read-only mount)](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L173-L288) — amazon-eks-pod-identity-webhook @ 52496af
  - [IRSAWH main.go: default audience, mount path](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/main.go#L77-L80) — amazon-eks-pod-identity-webhook @ 52496af
  - [IRSAWH constants.go: max 86400, min 600](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/constants.go#L17-L25) — amazon-eks-pod-identity-webhook @ 52496af
  - [EKSUG: AWS_WEB_IDENTITY_TOKEN_FILE value](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-configuration.adoc#L83-L95) — Amazon EKS User Guide @ 8d43223

#### 5.5 `token-request` — kubelet이 Pod 대신 token을 요청한다  ·  `move` kubelet → apiserver, token `request`: `POST serviceaccounts/orders/token`
- **Subtitle:** projected volume을 채우려고 kubelet이 TokenRequest API를 호출한다.
- **Prose:**
  > Pod가 노드에 배정되면 kubelet은 volume을 준비하면서 `orders` SA에 대해 TokenRequest를 만든다.
  > 요청에는 volume에 적힌 audience와 `expirationSeconds`, 그리고 이 Pod를 가리키는 `boundObjectRef`가 들어간다.
  > 그래서 이 token은 Pod나 SA가 지워지면 API에 대해 무효가 된다.
- **Facts:**
  | key | value |
  |---|---|
  | API | `CoreV1().ServiceAccounts(ns).CreateToken` → subresource `serviceaccounts/token` |
  | `spec.audiences` | `["sts.amazonaws.com"]` |
  | `expirationSeconds` 기본값 / 최소 (volume 필드) | 1시간 / 10분(600초) |
  | 이 Pod의 요청값 | `86400` (webhook이 넣은 값) |
- **Event log:** `kubelet → apiserver · HTTPS REST · POST /api/v1/namespaces/shop/serviceaccounts/orders/token · ~400 B E.G.`
- **Record:** R2 (TokenRequest 부분)
- **Sources:**
  - [K8S token_manager.go: getToken → CreateToken](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubelet/token/token_manager.go#L66-L76) — Kubernetes v1.36.2
  - [K8S authentication/v1 types.go: TokenRequestSpec / BoundObjectReference](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/authentication/v1/types.go#L159-L212) — Kubernetes v1.36.2
  - [K8SDOC: projected serviceAccountToken audience, expirationSeconds defaults](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/storage/projected-volumes.md#L50-L68) — Kubernetes 1.36 docs
  - [K8SDOC: token invalid when Pod or SA is deleted](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/configure-pod-container/configure-service-account.md#L418-L422) — Kubernetes 1.36 docs

#### 5.6 `token-issued` — apiserver가 Pod에 묶인 JWT를 서명해 돌려준다  ·  `mutate` kubelet
- **Subtitle:** `sub`, `aud`, `exp`와 `kubernetes.io` private claim(namespace, pod, serviceaccount, node)이 담긴 token이 파일로 쓰인다.
- **Prose:**
  > apiserver는 `sub`를 `system:serviceaccount:shop:orders`로, `iat`와 `nbf`를 지금으로, `exp`를 지금+86400초로 채운다.
  > `kubernetes.io` claim에는 namespace와 SA, Pod의 name/uid가 들어가고, 1.32부터 stable인 기능으로 `jti`와 node name/uid도 들어간다.
  > audience가 kube API audience가 아니므로 `warnafter`는 붙지 않는다. kubelet은 token을 cache에 넣고 volume 파일로 쓴다.
- **Facts:**
  | key | value |
  |---|---|
  | `iss` | `--service-account-issuer`의 첫 번째 값 (EKS: OIDC issuer URL, E.G.) |
  | `jti`, `kubernetes.io.node` | `ServiceAccountTokenJTI`, `ServiceAccountTokenPodNodeInfo` — 둘 다 1.32부터 stable, 기본 on |
  | `warnafter` | kube API audience이면서 3607초 요청일 때만 (여기서는 없음) |
- **Event log:** `apiserver → kubelet · HTTPS REST · 201 TokenRequest (status.token, expirationTimestamp) · JWT ~1 KB E.G.`
- **State:** before: (비어 있음) → after: `shop/orders/sts.amazonaws.com` · exp `2026-11-04T09:00:00Z` (E.G.) · refresh after `2026-11-04T04:12:00Z` (E.G.)
- **Record:** R2
- **Sources:**
  - [K8S claims.go: Claims() — sub, aud, iat, nbf, exp, jti, kubernetes.io](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/serviceaccount/claims.go#L52-L129) — Kubernetes v1.36.2
  - [K8S util.go: MakeUsername → system:serviceaccount:<ns>:<name>](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/apiserver/pkg/authentication/serviceaccount/util.go#L29-L57) — Kubernetes v1.36.2
  - [K8S token.go: warnAfter only for kube audiences](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/registry/core/serviceaccount/storage/token.go#L230-L239) — Kubernetes v1.36.2
  - [K8SDOC: example payload of a pod-bound token, iss = first --service-account-issuer](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/configure-pod-container/configure-service-account.md#L431-L459) — Kubernetes 1.36 docs
  - [K8SDOC: ServiceAccountTokenJTI stable 1.32](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/command-line-tools-reference/feature-gates/ServiceAccountTokenJTI.md#L8-L22) / [ServiceAccountTokenPodNodeInfo stable 1.32](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/command-line-tools-reference/feature-gates/ServiceAccountTokenPodNodeInfo.md#L8-L21) — Kubernetes 1.36 docs

#### 5.7 `sdk-chain-irsa` — SDK가 credential chain을 위에서부터 훑는다  ·  `mutate` pod (SDK chain panel)
- **Subtitle:** Java SDK v2의 기본 chain에서 web identity provider가 세 번째로 응답한다.
- **Prose:**
  > 코드에서 credential을 지정하지 않으면 SDK는 정해진 순서로 provider를 하나씩 묻고, 처음 성공한 것을 쓴다.
  > Java SDK v2 순서는 system property → env(`AWS_ACCESS_KEY_ID`) → web identity token → profile 파일 → container(`AWS_CONTAINER_CREDENTIALS_*`) → instance profile(IMDS)이다.
  > IRSA는 3번에서 잡힌다. Java에서는 `sts` 모듈이 classpath에 없으면 3번이 실패한다.
- **Facts:**
  | key | value |
  |---|---|
  | 3번 provider | `WebIdentityTokenFileCredentialsProvider` (`AWS_ROLE_ARN` + `AWS_WEB_IDENTITY_TOKEN_FILE`) |
  | 필요 의존성 (Java) | `software.amazon.awssdk:sts` ("the 'sts' service module must be on the class path") |
  | IMDS(노드 role) | 6번, 마지막. IMDS를 막지 않으면 Pod도 노드 role에 닿을 수 있음 |
- **Event log:** `pod → pod · in-process · DefaultCredentialsProvider: 1 ✗, 2 ✗, 3 ✓ WebIdentityTokenFile · <1 ms E.G.`
- **State:** before: 6개 모두 "미확인" → after: 1 `SystemProperty` ✗ · 2 `EnvironmentVariable` ✗ · 3 `WebIdentityTokenFile` ✓ (나머지 미시도)
- **Sources:**
  - [JSDK DefaultCredentialsProvider: chain order javadoc](https://github.com/aws/aws-sdk-java-v2/blob/2.57.8/core/auth/src/main/java/software/amazon/awssdk/auth/credentials/DefaultCredentialsProvider.java#L29-L39) / [createChain()](https://github.com/aws/aws-sdk-java-v2/blob/2.57.8/core/auth/src/main/java/software/amazon/awssdk/auth/credentials/DefaultCredentialsProvider.java#L93-L116) — AWS SDK for Java 2.57.8
  - [JSDK WebIdentityCredentialsUtils: sts module required](https://github.com/aws/aws-sdk-java-v2/blob/2.57.8/core/auth/src/main/java/software/amazon/awssdk/auth/credentials/internal/WebIdentityCredentialsUtils.java#L31-L49) — AWS SDK for Java 2.57.8
  - [EKSUG: credential isolation and IMDS](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/iam-roles-for-service-accounts.adoc#L24-L29) — Amazon EKS User Guide @ 8d43223

#### 5.8 `assume-role-web-identity` — SDK가 token을 들고 STS로 간다  ·  `move` pod → sts, token `request`: `AssumeRoleWithWebIdentity`
- **Subtitle:** 서명(SigV4) 없이, JWT 하나로 role을 assume한다.
- **Prose:**
  > SDK는 token 파일을 읽어 `WebIdentityToken`에, `AWS_ROLE_ARN`을 `RoleArn`에 넣어 STS를 호출한다.
  > 이 API는 AWS 자격 증명 없이 부를 수 있다. 호출자의 신원은 token으로 증명한다.
  > EKS 문서는 global endpoint 대신 regional STS endpoint를 권한다. private VPC라면 `com.amazonaws.<region>.sts` interface endpoint가 필요하다.
- **Facts:**
  | key | value |
  |---|---|
  | 필수 입력 | `RoleArn`, `RoleSessionName`, `WebIdentityToken` |
  | `DurationSeconds` | 기본 3600, 최소 900, 최대 role의 max session duration(1–12시간) |
  | global endpoint | `sts.amazonaws.com` — VPC endpoint를 우회 |
- **Event log:** `pod → sts · HTTPS (AWS STS Query API) · AssumeRoleWithWebIdentity RoleArn=…/orders-s3-reader · ~1.5 KB E.G.`
- **Record:** R4 (request)
- **Sources:**
  - [GOSTS: AssumeRoleWithWebIdentity doc — no AWS credentials needed, session duration](https://github.com/aws/aws-sdk-go-v2/blob/service/sts/v1.51.6/service/sts/api_op_AssumeRoleWithWebIdentity.go#L23-L49) — aws-sdk-go-v2 service/sts v1.51.6
  - [GOSTS: Input fields RoleArn / RoleSessionName / WebIdentityToken / DurationSeconds](https://github.com/aws/aws-sdk-go-v2/blob/service/sts/v1.51.6/service/sts/api_op_AssumeRoleWithWebIdentity.go#L155-L223) — aws-sdk-go-v2 service/sts v1.51.6
  - [EKSUG: regional STS endpoint recommendation, VPC endpoint](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/configure-sts-endpoint.adoc#L10-L20) — Amazon EKS User Guide @ 8d43223
  - [EKSUG: IRSA background — pass JWT to AssumeRoleWithWebIdentity](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/iam-roles-for-service-accounts.adoc#L65-L65) — Amazon EKS User Guide @ 8d43223

#### 5.9 `sts-verifies-oidc` — STS는 EKS의 공개 OIDC 엔드포인트로 서명을 확인한다  ·  `move` sts → oidc, token `call`: `GET /keys (JWKS)`
- **Subtitle:** 서명키는 EKS가 호스팅하는 공개 discovery endpoint에 있고, 7일마다 교체된다.
- **Prose:**
  > EKS는 클러스터마다 공개 OIDC discovery endpoint를 두고, projected token을 서명한 키의 공개키를 거기 올린다. IAM 같은 외부 시스템이 이 키로 token을 검증한다.
  > 검증한 뒤 trust policy의 `aud`, `sub` 조건과 token claim을 맞춰 본다.
  > EKS는 서명용 private key를 7일마다 교체하고, 공개키는 만료될 때까지 남겨 둔다.
- **Facts:**
  | key | value |
  |---|---|
  | issuer 예시 | `https://oidc.eks.us-west-2.amazonaws.com/id/8EBDXXXX00BAE` |
  | JWKS 경로 (EKS) | `<issuer>/keys` → `{"kty":"RSA","use":"sig","alg":"RS256",…}` |
  | 서명키 교체 주기 | 7일 |
  | Kubernetes 표준 discovery 경로 | `/.well-known/openid-configuration` → `jwks_uri` |
- **Event log:** `sts → oidc · HTTPS · GET https://oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE/keys · ~0.5 KB E.G.`
- **Sources:**
  - [EKSUG: public OIDC discovery endpoint, key rotates every 7 days](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/iam-roles-for-service-accounts.adoc#L67-L71) — Amazon EKS User Guide @ 8d43223
  - [EKSUG: issuer URL, /keys JWKS, throttling and caching](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/irsa-fetch-keys.adoc#L30-L46) — Amazon EKS User Guide @ 8d43223
  - [K8SDOC: Service account issuer discovery (/.well-known/openid-configuration, jwks_uri)](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/configure-pod-container/configure-service-account.md#L484-L529) — Kubernetes 1.36 docs

#### 5.10 `sts-response` — 1시간짜리 임시 자격 증명이 돌아온다  ·  `move` sts → pod, token `response`: `Credentials (exp 1h)`
- **Subtitle:** `AccessKeyId`/`SecretAccessKey`/`SessionToken`/`Expiration`과 함께, STS가 본 token의 `sub`과 `aud`가 응답에 실린다.
- **Prose:**
  > STS는 `Credentials`와 `AssumedRoleUser`를 돌려준다. `SubjectFromWebIdentityToken`에는 token의 `sub`가, `Audience`에는 `aud`가, `Provider`에는 `iss`가 담긴다.
  > IRSA에는 STS session tag가 없다. role을 여러 SA가 공유하면 모든 Pod가 role의 권한 전부를 받는다.
  > 각 Pod의 SDK가 각자 STS를 부르므로 STS API quota를 Pod 수만큼 쓴다.
- **Facts:**
  | key | value |
  |---|---|
  | 기본 유효 시간 | 1시간 (`DurationSeconds` 기본 3600) |
  | `SubjectFromWebIdentityToken` | `system:serviceaccount:shop:orders` |
  | STS session tags | 지원 안 됨 (IRSA) |
- **Event log:** `sts → pod · HTTPS · 200 AssumeRoleWithWebIdentityResponse · ~2 KB E.G.`
- **Record:** R4 (response)
- **Sources:**
  - [GOSTS: Output fields AssumedRoleUser / Audience / Credentials / Provider / SubjectFromWebIdentityToken](https://github.com/aws/aws-sdk-go-v2/blob/service/sts/v1.51.6/service/sts/api_op_AssumeRoleWithWebIdentity.go#L304-L377) — aws-sdk-go-v2 service/sts v1.51.6
  - [EKSUG: comparison — STS quota usage, no session tags in IRSA](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/service-accounts.adoc#L117-L123) — Amazon EKS User Guide @ 8d43223

#### 5.11 `token-rotate` — kubelet은 TTL의 80% 또는 24시간에 token을 새로 받는다  ·  `mutate` kubelet
- **Subtitle:** 86400초 token은 약 19.2시간(69,120초)째에 갱신된다. 파일을 다시 읽는 것은 앱(SDK)의 몫이다.
- **Prose:**
  > kubelet의 token manager는 token이 TTL의 80%를 넘었거나 발급 후 24시간을 넘으면 새로 요청한다. 둘 다 최대 10초 jitter만큼 앞당겨진다.
  > 갱신에 실패해도 이전 token이 아직 유효하면 그것을 계속 내준다.
  > 앱은 회전된 token을 다시 읽어야 한다. Kubernetes 문서는 예컨대 5분마다 다시 읽으면 충분하다고 말한다.
- **Facts:**
  | key | value |
  |---|---|
  | 갱신 조건 | age > 80% × TTL 또는 age > 24h (`maxTTL`) |
  | jitter | 최대 10초 (`maxJitter`) |
  | 86400초 token | 69,120초(19.2h) 후 갱신 |
  | 만료 token 정리 주기 | 1분 (`gcPeriod`) |
- **Event log:** `kubelet → apiserver · HTTPS REST · POST …/serviceaccounts/orders/token (refresh) · ~400 B E.G.`
- **State:** before: exp `2026-11-04T09:00:00Z`, refresh after `04:12:00Z` (E.G.) → after: 새 iat `2026-11-04T04:12:05Z`, exp `2026-11-05T04:12:05Z`, refresh after `2026-11-05T23:24:05Z` (모두 E.G.)
- **Sources:**
  - [K8S token_manager.go: maxTTL 24h, maxJitter 10s, gcPeriod 1m](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubelet/token/token_manager.go#L39-L43) / [requiresRefresh()](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubelet/token/token_manager.go#L172-L195) / [refresh failure keeps old token](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/kubelet/token/token_manager.go#L96-L132) — Kubernetes v1.36.2
  - [K8SDOC: kubelet refreshes at 80% TTL or 24h; app reloads the token](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/configure-pod-container/configure-service-account.md#L474-L482) — Kubernetes 1.36 docs
  - [EKSUG: kubelet refresh rule for IRSA token](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-configuration.adoc#L97-L97) — Amazon EKS User Guide @ 8d43223

#### 5.12 `agent-daemonset` — 노드마다 Pod Identity Agent가 link-local 주소에 뜬다  ·  `mutate` pidagent
- **Subtitle:** Part B. `eks-pod-identity-agent` DaemonSet이 hostNetwork로 `169.254.170.23:80`과 `[fd00:ec2::23]:80`을 연다.
- **Prose:**
  > Pod Identity는 EKS Auth API와 각 노드의 agent Pod로 동작한다. agent는 같은 노드의 Pod에게만 자격 증명을 준다.
  > agent는 노드의 IAM role로 EKS Auth를 부르므로, 노드 role에 `eks-auth:AssumeRoleForPodIdentity` 권한이 필요하다(`AmazonEKSWorkerNodePolicy`에 포함).
  > private subnet의 노드는 EKS Auth용 PrivateLink endpoint가 있어야 한다. EKS Auto Mode에는 agent가 기본 내장이다.
- **Facts:**
  | key | value |
  |---|---|
  | 주소 / port | `169.254.170.23`, `[fd00:ec2::23]` / `80` (credential), `2703` (health/readiness), `2705` (metrics) |
  | IPv6를 끈 노드 | agent가 시작하지 못함 → IPv6 비활성 설정 필요 |
  | 지원 compute | Linux EC2 노드만 (Fargate, Windows 노드 불가) |
- **Event log:** `kubelet → pidagent · CRI gRPC · start DaemonSet Pod kube-system/eks-pod-identity-agent-gmqp7 (hostNetwork) · ~2 s E.G.`
- **State:** before: (agent 없음) → after: `listen 169.254.170.23:80`, `listen [fd00:ec2::23]:80`, `probe :2703`, cache 0/2000
- **Sources:**
  - [EKSUG: agent is a DaemonSet, hostNetwork, ports 80 and 2703, link-local addresses](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-identities.adoc#L103-L103) — Amazon EKS User Guide @ 8d43223
  - [EKSUG: agent setup — IPv4/IPv6, EKS Auth reachability, node role permission, Auto Mode](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-agent-setup.adoc#L19-L50) — Amazon EKS User Guide @ 8d43223
  - [PIA server.go: port 80, probe 2703, metrics 2705, bind hosts](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/cmd/server.go#L187-L198) / [config.go: 169.254.170.23, fd00:ec2::23](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/configuration/config.go#L4-L5) — eks-pod-identity-agent v0.2.7
  - [EKSUG: not available on Fargate or Windows](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-identities.adoc#L146-L146) — Amazon EKS User Guide @ 8d43223

#### 5.13 `pod-identity-association` — EKS API에 (namespace, SA) → role 연결을 만든다  ·  `move` dev → eksapi, token `request`: `CreatePodIdentityAssociation`
- **Subtitle:** 연결은 Kubernetes가 아니라 EKS API에 저장되고, role의 trust policy는 클러스터와 무관하게 한 번만 쓴다.
- **Prose:**
  > association은 클러스터 안의 namespace/SA 하나를 같은 계정의 IAM role 하나에 묶는다. SA annotation은 필요 없다.
  > role trust policy의 principal은 서비스 `pods.eks.amazonaws.com`, action은 `sts:AssumeRole`과 `sts:TagSession`이다. 새 클러스터에서 같은 role을 써도 trust policy를 고칠 필요가 없다.
  > association은 eventually consistent라 만든 뒤 몇 초 지연될 수 있다.
- **Facts:**
  | key | value |
  |---|---|
  | 클러스터당 association 한도 | 5,000 |
  | SA당 role | 1개, 클러스터와 같은 계정 (교차 계정은 role chaining) |
  | trust policy | `Principal.Service: pods.eks.amazonaws.com`, `Action: [sts:AssumeRole, sts:TagSession]` |
- **Event log:** `dev → eksapi · HTTPS (EKS API) · CreatePodIdentityAssociation cluster=prod-apne2 ns=shop sa=orders · ~300 B E.G.`
- **Record:** R7
- **Sources:**
  - [EKSUG: aws eks create-pod-identity-association](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-association.adoc#L130-L130) — Amazon EKS User Guide @ 8d43223
  - [EKSUG: sts:AssumeRole and sts:TagSession](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-role.adoc#L18-L26) — Amazon EKS User Guide @ 8d43223
  - [EKSUG: trust policy with pods.eks.amazonaws.com principal](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/hybrid-nodes-gateway-getting-started.adoc#L50-L61) — Amazon EKS User Guide @ 8d43223
  - [EKSUG: 5,000 associations, one role per SA, eventual consistency](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-identities.adoc#L97-L104) — Amazon EKS User Guide @ 8d43223
  - [EKSUG: comparison — role extensibility](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/service-accounts.adoc#L105-L107) — Amazon EKS User Guide @ 8d43223

#### 5.14 `pi-pod-mutated` — 새 Pod에는 container credentials env가 들어간다  ·  `mutate` pod
- **Subtitle:** association이 있으면 webhook은 IRSA보다 container credentials 방식을 먼저 고른다.
- **Prose:**
  > `kubectl rollout restart`로 Pod를 다시 만들면 같은 webhook이 다시 돈다. 이번에는 이 SA에 association이 있으므로 container credentials 설정을 쓴다. 코드 주석: "Container credentials method takes precedence".
  > `AWS_ROLE_ARN` 대신 `AWS_CONTAINER_CREDENTIALS_FULL_URI`와 `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE`이 들어가고, token audience는 `pods.eks.amazonaws.com`이다.
  > 기본 만료 86400초를 쓰면 webhook이 79,200–86,400초 사이로 jitter를 준다.
- **Facts:**
  | key | value |
  |---|---|
  | `AWS_CONTAINER_CREDENTIALS_FULL_URI` | `http://169.254.170.23/v1/credentials` |
  | `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE` | `/var/run/secrets/pods.eks.amazonaws.com/serviceaccount/eks-pod-identity-token` |
  | volume / audience | `eks-pod-identity-token` / `pods.eks.amazonaws.com` |
  | `expirationSeconds` | 문서 예시 86400, webhook 코드는 기본값일 때 79200–86400 무작위 |
- **Event log:** `pidwh → apiserver · HTTPS (AdmissionReview response) · JSONPatch: +2 env (container credentials), +1 volume · ~1 KB E.G.`
- **State:** before: (IRSA Pod) `AWS_ROLE_ARN`, `AWS_WEB_IDENTITY_TOKEN_FILE`, `aws-token` → after: (새 Pod) `AWS_CONTAINER_CREDENTIALS_FULL_URI`, `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE`, `eks-pod-identity-token` (aud `pods.eks.amazonaws.com`)
- **Record:** R5
- **Sources:**
  - [EKSUG: content added to the Pod manifest](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-how-it-works.adoc#L30-L53) — Amazon EKS User Guide @ 8d43223
  - [IRSAWH handler.go: container credentials take precedence](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L450-L474) / [env injection (else-if IRSA)](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L243-L266) / [jitter](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L521-L528) — amazon-eks-pod-identity-webhook @ 52496af
  - [IRSAWH main.go: container-credentials audience, path, volume, full URI defaults](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/main.go#L86-L91) / [constants.go: DefaultMinTokenExpiration 79200](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/constants.go#L17-L29) — amazon-eks-pod-identity-webhook @ 52496af

#### 5.15 `sdk-to-agent` — SDK는 token을 Authorization header에 실어 agent에 묻는다  ·  `move` pod → pidagent, token `request`: `GET /v1/credentials`
- **Subtitle:** chain의 5번째 container provider가 잡히고, STS가 아니라 노드의 agent로 간다.
- **Prose:**
  > env에 web identity 변수가 없으므로 chain은 3번을 지나 5번 `ContainerCredentialsProvider`에서 멈춘다.
  > provider는 token 파일 내용을 `Authorization` header에 넣어 `AWS_CONTAINER_CREDENTIALS_FULL_URI`로 GET을 보낸다.
  > HTTPS가 아니면 host가 loopback이거나 ECS/EKS 전용 주소(`169.254.170.2`, `169.254.170.23`, `[fd00:ec2::23]`)여야 한다.
- **Facts:**
  | key | value |
  |---|---|
  | chain 위치 (Java) | 5번 (`ContainerCredentialsProvider`), IMDS보다 앞, web identity보다 뒤 |
  | 요청 | `GET http://169.254.170.23/v1/credentials`, header `Authorization: <JWT>` |
  | agent 쪽 | `/v1/credentials` handler가 `Authorization` header를 SA token으로 읽음 |
- **Event log:** `pod → pidagent · HTTP (link-local) · GET /v1/credentials, Authorization: eyJ… · ~1.2 KB E.G.`
- **Sources:**
  - [JSDK ContainerCredentialsProvider: allowed hosts](https://github.com/aws/aws-sdk-java-v2/blob/2.57.8/core/auth/src/main/java/software/amazon/awssdk/auth/credentials/ContainerCredentialsProvider.java#L78-L84) / [Authorization header from token file](https://github.com/aws/aws-sdk-java-v2/blob/2.57.8/core/auth/src/main/java/software/amazon/awssdk/auth/credentials/ContainerCredentialsProvider.java#L227-L249) / [host check](https://github.com/aws/aws-sdk-java-v2/blob/2.57.8/core/auth/src/main/java/software/amazon/awssdk/auth/credentials/ContainerCredentialsProvider.java#L264-L273) — AWS SDK for Java 2.57.8
  - [JSDK DefaultCredentialsProvider: container provider is 5th](https://github.com/aws/aws-sdk-java-v2/blob/2.57.8/core/auth/src/main/java/software/amazon/awssdk/auth/credentials/DefaultCredentialsProvider.java#L98-L116) — AWS SDK for Java 2.57.8
  - [PIA eks_credential_handler.go: /v1/credentials, Authorization header](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/pkg/handlers/eks_credential_handler.go#L146-L160) — eks-pod-identity-agent v0.2.7
  - [EKSUG: Pod Identity is in the container credential provider step](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-how-it-works.adoc#L22-L28) — Amazon EKS User Guide @ 8d43223

#### 5.16 `assume-role-for-pod-identity` — agent가 노드 role로 EKS Auth를 부른다  ·  `move` pidagent → eksauth, token `request`: `AssumeRoleForPodIdentity`
- **Subtitle:** 입력은 cluster 이름과 Pod의 token. agent는 먼저 audience가 정확히 `pods.eks.amazonaws.com` 하나인지 본다.
- **Prose:**
  > agent는 token의 `aud`가 `pods.eks.amazonaws.com` 하나뿐인지 확인하고, Pod UID로 cache를 찾는다. cache에 없으면 EKS Auth를 호출한다.
  > EKS Auth가 role을 assume한다. 그래서 STS 호출은 Pod마다가 아니라 EKS 서비스가 하고, agent가 노드의 Pod들에 나눠 준다.
  > cache 기본값은 최대 2,000개, 최대 3시간 보관 후 갱신, EKS Auth 호출 3 QPS다.
- **Facts:**
  | key | value |
  |---|---|
  | 필수 입력 | `ClusterName`, `Token` (선택: `Zone`, `InstanceId`, `EksNodeName`) |
  | agent cache key | pod UID (token에서 읽음) |
  | `--max-credential-retention-before-renewal` / `--max-cache-size` / `--max-service-qps` | `3h` / `2000` / `3` |
- **Event log:** `pidagent → eksauth · HTTPS (EKS Auth API, SigV4 with node role) · AssumeRoleForPodIdentity clusterName=prod-apne2 · ~1.3 KB E.G.`
- **Record:** R8 (request)
- **Sources:**
  - [GOEKSAUTH api_op_AssumeRoleForPodIdentity.go: only used by the agent; input fields](https://github.com/aws/aws-sdk-go-v2/blob/service/eksauth/v1.23.1/service/eksauth/api_op_AssumeRoleForPodIdentity.go#L13-L57) — aws-sdk-go-v2 service/eksauth v1.23.1
  - [PIA eksauth/service.go: input ClusterName, Token, Zone](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/cloud/eksauth/service.go#L68-L88) — eks-pod-identity-agent v0.2.7
  - [PIA claims_validation.go: audience must be exactly pods.eks.amazonaws.com](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/validation/claims_validation.go#L114-L130) / [refreshing_cache.go: keyed by pod UID](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/credsretriever/refreshing_cache.go#L112-L123) / [server.go: cache flags](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/cmd/server.go#L191-L196) — eks-pod-identity-agent v0.2.7
  - [EKSUG: scalability — EKS Auth assumes the role, load once per node](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-identities.adoc#L78-L79) — Amazon EKS User Guide @ 8d43223
  - [EKSUG: node role needs AssumeRoleForPodIdentity](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-agent-setup.adoc#L43-L50) — Amazon EKS User Guide @ 8d43223

#### 5.17 `session-tags` — EKS Auth가 session tag 6개를 붙여 role을 assume한다  ·  `move` eksauth → pidagent, token `response`: `Credentials + AssumedRoleUser + Subject`
- **Subtitle:** 세션에는 cluster, namespace, SA, Pod 이름/UID 태그가 붙어 ABAC 조건에 쓸 수 있다.
- **Prose:**
  > EKS Pod Identity는 role을 assume할 때 미리 정한 session tag를 붙인다. 정책에서는 `${aws:PrincipalTag/kubernetes-namespace}`처럼 참조한다.
  > 이 태그는 transitive라, 앱이 다른 계정 role로 다시 `AssumeRole`해도 따라간다.
  > 응답의 `AssumedRoleUser.AssumeRoleId`에서 session name 부분은 `eks-<cluster>-<pod>-<UUID>` 형식이고, `Audience`는 항상 `pods.eks.amazonaws.com`이다.
- **Facts:**
  | key | value |
  |---|---|
  | session tag keys | `eks-cluster-arn`, `eks-cluster-name`, `kubernetes-namespace`, `kubernetes-service-account`, `kubernetes-pod-name`, `kubernetes-pod-uid` |
  | 응답 필드 | `AssumedRoleUser`, `Audience`, `Credentials`, `PodIdentityAssociation`, `Subject` |
  | `PackedPolicyTooLarge` 오류 시 | association에서 session tags 비활성화 가능 |
- **Event log:** `eksauth → pidagent · HTTPS · 200 AssumeRoleForPodIdentity (credentials, association a-…) · ~2 KB E.G.`
- **State:** pidagent cache: before: 0 entries → after: `c3a1…(pod UID, E.G.)` · `role/orders-s3-reader` · Expiration E.G.
- **Record:** R8 (EKS Auth response)
- **Sources:**
  - [EKSUG: session tags list, transitive, PackedPolicyTooLarge](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-abac.adoc#L27-L54) — Amazon EKS User Guide @ 8d43223
  - [GOEKSAUTH: Output fields, session name format, Audience always pods.eks.amazonaws.com](https://github.com/aws/aws-sdk-go-v2/blob/service/eksauth/v1.23.1/service/eksauth/api_op_AssumeRoleForPodIdentity.go#L82-L118) / [types.go: AssumedRoleUser, Credentials, PodIdentityAssociation, Subject](https://github.com/aws/aws-sdk-go-v2/blob/service/eksauth/v1.23.1/service/eksauth/types/types.go#L12-L188) — aws-sdk-go-v2 service/eksauth v1.23.1

#### 5.18 `agent-to-sdk` — agent가 SDK 형식의 JSON으로 자격 증명을 돌려준다  ·  `move` pidagent → pod, token `response`: `{AccessKeyId, …, Expiration}`
- **Subtitle:** SDK는 `Expiration`을 보고 만료 전에 같은 URI를 다시 부른다. Pod는 STS를 한 번도 직접 부르지 않았다.
- **Prose:**
  > agent는 EKS Auth 응답에서 `AccessKeyId`, `SecretAccessKey`, `SessionToken`(→ `Token`), `Expiration`을 꺼내고, role ARN에서 `AccountId`를 뽑아 JSON으로 준다.
  > 이전 단계까지 쓰던 노드 role의 자격 증명은 Pod에 건네지지 않는다. 다만 IMDS를 막지 않으면 Pod는 여전히 노드 role에 닿을 수 있다.
  > IRSA와 비교: STS 호출 주체(Pod SDK ↔ EKS 서비스), trust 대상(클러스터별 OIDC provider ↔ 서비스 principal 하나), session tag(없음 ↔ 6개).
- **Facts:**
  | key | value |
  |---|---|
  | 응답 JSON 키 | `AccessKeyId`, `SecretAccessKey`, `Token`, `AccountId`, `Expiration` |
  | `hostNetwork: true` Pod | 항상 IMDS 접근 가능, 그래도 SDK는 Pod Identity 자격 증명을 씀 |
  | AWS 권장 | 가능하면 EKS Pod Identity 사용 |
- **Event log:** `pidagent → pod · HTTP (link-local) · 200 {"AccessKeyId":"ASIA…","Expiration":"…"} · ~1 KB E.G.`
- **Record:** R8 (agent → SDK JSON)
- **Sources:**
  - [PIA model.go: EksCredentialsResponse JSON fields](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/pkg/credentials/model.go#L83-L89) / [service.go: mapping from EKS Auth response](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/cloud/eksauth/service.go#L100-L116) — eks-pod-identity-agent v0.2.7
  - [EKSUG: credential isolation, hostNetwork note](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-identities.adoc#L50-L55) — Amazon EKS User Guide @ 8d43223
  - [EKSUG: AWS recommends EKS Pod Identities whenever possible](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/service-accounts.adoc#L93-L96) — Amazon EKS User Guide @ 8d43223

### Decoder records

#### R1. ServiceAccount + IRSA로 mutate된 Pod spec (steps 5.2, 5.4) — layer bar: ServiceAccount annotation / Pod env / volumeMount / projected volume
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: orders
  namespace: shop
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::111122223333:role/orders-s3-reader
    eks.amazonaws.com/sts-regional-endpoints: "true"
---
apiVersion: v1
kind: Pod
metadata:
  name: orders-7d9c5b8f6-x2k4q
  namespace: shop
spec:
  serviceAccountName: orders
  containers:
  - name: orders
    image: 111122223333.dkr.ecr.ap-northeast-2.amazonaws.com/orders:1.4.2
    env:                                   # ↓ added by pod-identity-webhook
    - name: AWS_STS_REGIONAL_ENDPOINTS
      value: regional
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
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.annotations["eks.amazonaws.com/role-arn"]` | `arn:aws:iam::111122223333:role/orders-s3-reader` | webhook이 IRSA 대상으로 판단하는 유일한 표시 | E.G. |
| `metadata.annotations["eks.amazonaws.com/sts-regional-endpoints"]` | `"true"` | `AWS_STS_REGIONAL_ENDPOINTS=regional` 주입 | |
| `spec.serviceAccountName` | `orders` | webhook이 SA를 찾는 key (namespace와 함께) | E.G. |
| `spec.containers[].env[AWS_ROLE_ARN]` | role ARN | SDK web identity provider의 `RoleArn` | E.G. |
| `spec.containers[].env[AWS_WEB_IDENTITY_TOKEN_FILE]` | `/var/run/secrets/eks.amazonaws.com/serviceaccount/token` | SDK가 읽는 JWT 파일 | |
| `spec.containers[].volumeMounts[aws-token].readOnly` | `true` | token 파일은 읽기 전용 | |
| `spec.volumes[aws-token].projected.sources[].serviceAccountToken.audience` | `sts.amazonaws.com` | token `aud` = OIDC provider의 audience | |
| `….serviceAccountToken.expirationSeconds` | `86400` | 요청 TTL, kubelet은 80%에 갱신 | |
| `….serviceAccountToken.path` | `token` | mount 경로 아래 파일 이름 | |

Sources: [IRSAWH README L48-L116](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/README.md#L48-L116), [IRSAWH handler.go L173-L288](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L173-L288) — amazon-eks-pod-identity-webhook @ 52496af; [K8S core/v1 ServiceAccountTokenProjection](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/core/v1/types.go#L1937-L1955) — Kubernetes v1.36.2. 주의: 이 webhook은 `--aws-default-region`이 설정된 경우에만 `AWS_REGION`/`AWS_DEFAULT_REGION`을 넣는다. EKS 관리형 webhook에서 이 flag가 켜져 있는지는 unverified라 예시에서 뺐다.

#### R2. TokenRequest와 projected token claims — audience `sts.amazonaws.com` (steps 5.5, 5.6) — layer bar: TokenRequest spec / JWT registered claims / `kubernetes.io` private claims
```yaml
# kubelet → apiserver
apiVersion: authentication.k8s.io/v1
kind: TokenRequest
spec:
  audiences: ["sts.amazonaws.com"]
  expirationSeconds: 86400
  boundObjectRef:
    kind: Pod
    apiVersion: v1
    name: orders-7d9c5b8f6-x2k4q
    uid: 4f6c2a1e-9b7d-4c3e-8a21-5d0e7f3b9c11
status:
  token: eyJhbGciOiJSUzI1NiIsImtpZCI6Ij…   # JWT
  expirationTimestamp: "2026-11-04T09:00:00Z"
```
```json
{
  "aud": ["sts.amazonaws.com"],
  "exp": 1793782800,
  "iat": 1793696400,
  "iss": "https://oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE",
  "jti": "0b8f3f9e-6a2d-4f7c-9e51-2c7d8a4b6e90",
  "kubernetes.io": {
    "namespace": "shop",
    "node": { "name": "ip-10-0-12-34.ap-northeast-2.compute.internal", "uid": "9a1d…" },
    "pod": { "name": "orders-7d9c5b8f6-x2k4q", "uid": "4f6c2a1e-9b7d-4c3e-8a21-5d0e7f3b9c11" },
    "serviceaccount": { "name": "orders", "uid": "d2e4b7a0-3c1f-4e8a-b6d9-7f0a1c2e3b45" }
  },
  "nbf": 1793696400,
  "sub": "system:serviceaccount:shop:orders"
}
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `spec.audiences` | `["sts.amazonaws.com"]` | token을 받아도 되는 수신자 | |
| `spec.expirationSeconds` | `86400` | 요청 TTL (`--service-account-max-token-expiration`으로 줄어들 수 있음) | |
| `spec.boundObjectRef.{kind,name,uid}` | `Pod`, Pod 이름/UID | Pod가 지워지면 token도 무효 | E.G. |
| `status.expirationTimestamp` | `2026-11-04T09:00:00Z` | kubelet 갱신 계산의 기준 | E.G. |
| `aud` | `["sts.amazonaws.com"]` | trust policy `<issuer>:aud` 조건과 비교 | |
| `iss` | EKS OIDC issuer URL | `--service-account-issuer` 첫 값, IAM OIDC provider URL | E.G. |
| `sub` | `system:serviceaccount:shop:orders` | trust policy `<issuer>:sub` 조건과 비교 | E.G. |
| `iat` / `nbf` / `exp` | 발급 시각 / 같음 / +86400 | 유효 구간 | E.G. |
| `jti` | UUID | token 고유 ID, audit log에 기록 | E.G. |
| `kubernetes.io.namespace` | `shop` | SA namespace | E.G. |
| `kubernetes.io.serviceaccount.{name,uid}` | `orders`, UID | SA 신원 | E.G. |
| `kubernetes.io.pod.{name,uid}` | Pod 이름/UID | bound object | E.G. |
| `kubernetes.io.node.{name,uid}` | 노드 이름/UID | `ServiceAccountTokenPodNodeInfo` (1.32+ stable) | E.G. |

Sources: [K8S authentication/v1 types.go L142-L212](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/authentication/v1/types.go#L142-L212), [K8S claims.go L52-L129](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/serviceaccount/claims.go#L52-L129) — Kubernetes v1.36.2; [K8SDOC configure-service-account.md L431-L459](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/configure-pod-container/configure-service-account.md#L431-L459) — Kubernetes 1.36 docs. `kid`, `alg`(JWT header)는 EKS JWKS 예시에서 `RS256`([EKSUG irsa-fetch-keys.adoc L44-L45](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/irsa-fetch-keys.adoc#L44-L45)).

#### R3. IRSA role trust policy (step 5.1) — layer bar: Principal / Action / Condition
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
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `Principal.Federated` | `arn:aws:iam::<account>:oidc-provider/<issuer host+path>` | 클러스터별 IAM OIDC provider | E.G. |
| `Action` | `sts:AssumeRoleWithWebIdentity` | JWT로 assume 허용 | |
| `Condition.StringEquals["<issuer>:aud"]` | `sts.amazonaws.com` | token audience 고정 | |
| `Condition.StringEquals["<issuer>:sub"]` | `system:serviceaccount:shop:orders` | 이 SA만 허용 (`StringLike` + `*`이면 namespace 전체) | E.G. |

Sources: [EKSUG s3files-csi.adoc L279-L293](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/storage/s3files-csi.adoc#L279-L293), [EKSUG associate-service-account-role.adoc L100](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/associate-service-account-role.adoc#L100-L100) — Amazon EKS User Guide @ 8d43223; [IRSAWH README L22-L45](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/README.md#L22-L45) — amazon-eks-pod-identity-webhook @ 52496af.

#### R4. `AssumeRoleWithWebIdentity` request / response (steps 5.8, 5.10) — layer bar: request params / Credentials / identity fields
```text
POST https://sts.ap-northeast-2.amazonaws.com/
Action=AssumeRoleWithWebIdentity
&RoleArn=arn:aws:iam::111122223333:role/orders-s3-reader
&RoleSessionName=aws-sdk-java-1793696460123
&WebIdentityToken=eyJhbGciOiJSUzI1NiIs…
&Version=2011-06-15

<AssumeRoleWithWebIdentityResult>
  <Credentials>
    <AccessKeyId>ASIAEXAMPLE7Q2LHF3VX</AccessKeyId>
    <SecretAccessKey>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</SecretAccessKey>
    <SessionToken>IQoJb3JpZ2luX2Vj…</SessionToken>
    <Expiration>2026-11-03T10:01:00Z</Expiration>
  </Credentials>
  <AssumedRoleUser>
    <Arn>arn:aws:sts::111122223333:assumed-role/orders-s3-reader/aws-sdk-java-1793696460123</Arn>
    <AssumedRoleId>AROAEXAMPLEID:aws-sdk-java-1793696460123</AssumedRoleId>
  </AssumedRoleUser>
  <SubjectFromWebIdentityToken>system:serviceaccount:shop:orders</SubjectFromWebIdentityToken>
  <Audience>sts.amazonaws.com</Audience>
  <Provider>arn:aws:iam::111122223333:oidc-provider/oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE</Provider>
</AssumeRoleWithWebIdentityResult>
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `RoleArn` | `AWS_ROLE_ARN` 값 | assume할 role | E.G. |
| `RoleSessionName` | SDK가 생성 (또는 `AWS_ROLE_SESSION_NAME`) | CloudTrail에 남는 세션 이름 | E.G. (형식 unverified) |
| `WebIdentityToken` | token 파일 내용 | R2의 JWT | E.G. |
| `DurationSeconds` | 생략 → 3600 | 세션 길이 | |
| `Credentials.{AccessKeyId,SecretAccessKey,SessionToken,Expiration}` | 임시 키 | SigV4 서명에 쓰는 자격 증명 | E.G. |
| `AssumedRoleUser.{Arn,AssumedRoleId}` | assumed-role ARN | 이후 API 호출의 주체 | E.G. |
| `SubjectFromWebIdentityToken` | token `sub` | 누가 assume했는지 | E.G. |
| `Audience` | token `aud` | | |
| `Provider` | OIDC ID token이면 `iss` 값 | 어느 IdP가 발급했는지 | E.G. |

Sources: [GOSTS api_op_AssumeRoleWithWebIdentity.go L155-L377](https://github.com/aws/aws-sdk-go-v2/blob/service/sts/v1.51.6/service/sts/api_op_AssumeRoleWithWebIdentity.go#L155-L377) — aws-sdk-go-v2 service/sts v1.51.6. Query/XML wire form와 `Version=2011-06-15`, `Provider` 값의 정확한 형태(ARN인지 issuer URL인지)는 unverified (API Reference를 열지 못함). 모델 주석은 "OpenID Connect ID token이면 `iss` 값"이라고만 한다.

#### R5. Pod Identity로 mutate된 Pod spec (step 5.14) — layer bar: env / volumeMount / projected volume
```yaml
spec:
  serviceAccountName: orders
  containers:
  - name: orders
    env:
    - name: AWS_CONTAINER_CREDENTIALS_FULL_URI
      value: http://169.254.170.23/v1/credentials
    - name: AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE
      value: /var/run/secrets/pods.eks.amazonaws.com/serviceaccount/eks-pod-identity-token
    volumeMounts:
    - name: eks-pod-identity-token
      mountPath: /var/run/secrets/pods.eks.amazonaws.com/serviceaccount
      readOnly: true
  volumes:
  - name: eks-pod-identity-token
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          audience: pods.eks.amazonaws.com
          expirationSeconds: 83127
          path: eks-pod-identity-token
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `env[AWS_CONTAINER_CREDENTIALS_FULL_URI]` | `http://169.254.170.23/v1/credentials` | SDK container provider가 GET할 agent 주소 | |
| `env[AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE]` | `…/eks-pod-identity-token` | 이 파일 내용이 `Authorization` header가 됨 | |
| `volumes[eks-pod-identity-token].projected.defaultMode` | `420` (= 0644) | 파일 권한 | |
| `….serviceAccountToken.audience` | `pods.eks.amazonaws.com` | agent가 정확히 이 값 하나만 허용 | |
| `….serviceAccountToken.expirationSeconds` | 79200–86400 (예: `83127`) | 기본값이면 webhook이 jitter를 넣음 (문서 예시는 86400) | E.G. |
| (없음) `AWS_ROLE_ARN` | — | Pod spec에는 role이 없다. role은 EKS의 association에만 있음 | |

Sources: [EKSUG pod-id-how-it-works.adoc L32-L53](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-how-it-works.adoc#L32-L53) — Amazon EKS User Guide @ 8d43223; [IRSAWH handler.go L243-L254, L450-L473, L521-L528](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/pkg/handler/handler.go#L450-L473), [main.go L86-L91](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/52496af755fbb386af6bbb647876d7f84d5350a0/main.go#L86-L91) — amazon-eks-pod-identity-webhook @ 52496af.

#### R6. projected token claims — audience `pods.eks.amazonaws.com` (step 5.14–5.16) — layer bar: registered claims / `kubernetes.io` private claims
```json
{
  "aud": ["pods.eks.amazonaws.com"],
  "exp": 1793779527,
  "iat": 1793696400,
  "iss": "https://oidc.eks.ap-northeast-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE",
  "jti": "5e2a7c41-0f3b-4d9a-b8c6-1e4f7a2d9b03",
  "kubernetes.io": {
    "namespace": "shop",
    "node": { "name": "ip-10-0-12-34.ap-northeast-2.compute.internal", "uid": "9a1d…" },
    "pod": { "name": "orders-6b8d4f7c9-p7m2z", "uid": "c3a1f0d2-7e4b-4a96-9d58-0b2e6f1a7c34" },
    "serviceaccount": { "name": "orders", "uid": "d2e4b7a0-3c1f-4e8a-b6d9-7f0a1c2e3b45" }
  },
  "nbf": 1793696400,
  "sub": "system:serviceaccount:shop:orders"
}
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `aud` | `["pods.eks.amazonaws.com"]` | 원소가 정확히 1개여야 agent가 받음 | |
| `exp` − `iat` | `83127` | jitter 들어간 TTL | E.G. |
| `kubernetes.io.pod.uid` | Pod UID | agent credential cache key, session tag `kubernetes-pod-uid` | E.G. |
| `kubernetes.io.pod.name` | Pod 이름 | session tag `kubernetes-pod-name`, session name에 포함 | E.G. |
| `kubernetes.io.namespace` / `serviceaccount.name` | `shop` / `orders` | association 조회 key, session tag | E.G. |
| `iss` | IRSA와 같은 issuer | 같은 kube-apiserver가 서명 (EKS에서 값이 같다는 점은 unverified) | E.G. |

Sources: [K8S claims.go L52-L129](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/serviceaccount/claims.go#L52-L129) — Kubernetes v1.36.2; [PIA claims_validation.go L114-L130](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/validation/claims_validation.go#L114-L130), [refreshing_cache.go L112-L123](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/credsretriever/refreshing_cache.go#L112-L123) — eks-pod-identity-agent v0.2.7; [EKSUG pod-id-abac.adoc L31-L38](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-abac.adoc#L31-L38) — Amazon EKS User Guide @ 8d43223.

#### R7. Pod Identity role trust policy (step 5.13) — layer bar: Principal / Action
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "pods.eks.amazonaws.com" },
    "Action": ["sts:AssumeRole", "sts:TagSession"]
  }]
}
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `Principal.Service` | `pods.eks.amazonaws.com` | 모든 클러스터 공통의 서비스 principal 하나 | |
| `Action[0]` | `sts:AssumeRole` | EKS Pod Identity가 role을 assume | |
| `Action[1]` | `sts:TagSession` | session tag 6개를 붙이기 위해 필요 | |
| (선택) `Condition` | session tag로 namespace/SA/cluster 제한 | EKS 문서는 가능하다고만 하고 예시 snippet은 repo 밖 (`iam_snippet:064584d9-…`) | unverified |

Sources: [EKSUG hybrid-nodes-gateway-getting-started.adoc L50-L61](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/nodes/hybrid-nodes-gateway-getting-started.adoc#L50-L61), [EKSUG pod-id-role.adoc L13-L32](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/manage-access/aws-access/pod-id-role.adoc#L13-L32) — Amazon EKS User Guide @ 8d43223.

#### R8. `AssumeRoleForPodIdentity` request / response, agent → SDK JSON (steps 5.16–5.18) — layer bar: EKS Auth input / EKS Auth output / agent JSON
```text
# agent → EKS Auth (SigV4, node IAM role)
AssumeRoleForPodIdentity
  clusterName: prod-apne2
  token:       eyJhbGciOiJSUzI1NiIs…   (R6)
  zone:        apne2-az1

# EKS Auth → agent
assumedRoleUser:
  arn:          arn:aws:sts::111122223333:assumed-role/orders-s3-reader/eks-prod-apne2-orders-6b8-1f2e…
  assumeRoleId: AROAEXAMPLEID:eks-prod-apne2-orders-6b8-1f2e…
audience: pods.eks.amazonaws.com
credentials:
  accessKeyId:     ASIAEXAMPLE4KD8PQ2ZN
  secretAccessKey: (redacted)
  sessionToken:    IQoJb3JpZ2luX2Vj…
  expiration:      2026-11-03T15:00:00Z
podIdentityAssociation:
  associationArn: arn:aws:eks:ap-northeast-2:111122223333:podidentityassociation/prod-apne2/a-abcdefghijklmnop1
  associationId:  a-abcdefghijklmnop1
subject:
  namespace:      shop
  serviceAccount: orders

# agent → SDK (HTTP 200)
{"AccessKeyId":"ASIAEXAMPLE4KD8PQ2ZN","SecretAccessKey":"…","Token":"IQoJb3JpZ2luX2Vj…",
 "AccountId":"111122223333","Expiration":"2026-11-03T15:00:00Z"}
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| input `ClusterName` (required) | `prod-apne2` | agent의 `--cluster-name` | E.G. |
| input `Token` (required) | R6 JWT | Pod가 `Authorization`으로 보낸 token | E.G. |
| input `Zone` / `InstanceId` / `EksNodeName` | optional | 노드 정보 (agent v0.2.7은 `Zone`만 채움) | E.G. |
| `AssumedRoleUser.Arn` / `AssumeRoleId` | session name `eks-<cluster>-<pod>-<UUID>` | CloudTrail에 Pod 이름이 남음 | E.G. |
| `Audience` | `pods.eks.amazonaws.com` | 항상 이 값 | |
| `Credentials.{AccessKeyId,SecretAccessKey,SessionToken,Expiration}` | 임시 키 | | E.G. |
| `PodIdentityAssociation.{AssociationArn,AssociationId}` | association | 어떤 연결이 쓰였는지 | E.G. |
| `Subject.{Namespace,ServiceAccount}` | `shop` / `orders` | token에서 확인된 SA | E.G. |
| agent JSON `Token` | = `SessionToken` | SDK container provider 형식 | E.G. |
| agent JSON `AccountId` | role ARN에서 파싱 | | E.G. |

Sources: [GOEKSAUTH api_op_AssumeRoleForPodIdentity.go L35-L118](https://github.com/aws/aws-sdk-go-v2/blob/service/eksauth/v1.23.1/service/eksauth/api_op_AssumeRoleForPodIdentity.go#L35-L118), [types/types.go L12-L188](https://github.com/aws/aws-sdk-go-v2/blob/service/eksauth/v1.23.1/service/eksauth/types/types.go#L12-L188) — aws-sdk-go-v2 service/eksauth v1.23.1; [PIA service.go L68-L116](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/internal/cloud/eksauth/service.go#L68-L116), [model.go L77-L89](https://github.com/aws/eks-pod-identity-agent/blob/v0.2.7/pkg/credentials/model.go#L77-L89) — eks-pod-identity-agent v0.2.7. 자격 증명 유효 시간(예시의 6시간)과 association ID 형식은 unverified.

### Self-check
1. **Q.** IRSA에서 Pod 안의 SDK는 STS에 무엇을 보내고, STS는 그것이 진짜인지 어떻게 아는가? **A.** token 파일의 JWT(`aud`=`sts.amazonaws.com`, `sub`=`system:serviceaccount:<ns>:<sa>`)와 `RoleArn`을 `AssumeRoleWithWebIdentity`로 보낸다. SigV4 서명은 없다. STS는 IAM OIDC provider(클러스터 issuer URL)를 통해 EKS가 공개한 JWKS로 서명을 확인하고, trust policy의 `aud`/`sub` 조건과 claim을 맞춘다.
2. **Q.** SA에 annotation만 달았는데 왜 기존 Pod는 여전히 AWS 호출에 실패하는가? **A.** env와 projected volume은 Pod CREATE 때 mutating admission webhook(`pod-identity-webhook`)이 넣는다. 기존 Pod는 다시 만들어야(`kubectl rollout restart`) 주입된다. Pod Identity association도 마찬가지다.
3. **Q.** 86400초 projected token은 언제 갱신되며, 앱은 무엇을 해야 하나? **A.** kubelet이 TTL의 80%(69,120초 ≈ 19.2시간) 또는 24시간 중 먼저 오는 때에, 최대 10초 jitter만큼 일찍 TokenRequest를 다시 호출해 파일을 바꾼다. 앱(SDK)은 파일을 다시 읽어야 한다.
4. **Q.** Pod Identity에서 STS를 부르는 것은 누구이고, Pod는 무엇과만 통신하나? **A.** Pod의 SDK는 노드의 `eks-pod-identity-agent`(`169.254.170.23:80`)에 token을 `Authorization` header로 보낸다. agent가 노드 role로 EKS Auth `AssumeRoleForPodIdentity`를 부르고, role assume(`sts:AssumeRole` + `sts:TagSession`)은 EKS 서비스가 한다. 결과는 pod UID 기준으로 cache된다.
5. **Q.** IRSA 대비 Pod Identity의 운영상 이점 세 가지는? **A.** (1) 클러스터마다 IAM OIDC provider가 필요 없다(계정당 100개 한도 없음). (2) trust policy가 `pods.eks.amazonaws.com` 하나라 새 클러스터마다 고치지 않는다(2048자 한도 문제 없음). (3) session tag 6개로 ABAC가 되고, STS quota를 Pod별로 쓰지 않는다. 제약: EKS 전용, Linux EC2 노드만(Fargate 불가), 클러스터당 association 5,000개.
6. **Q.** 같은 SA에 role-arn annotation과 Pod Identity association이 둘 다 있으면 무엇이 쓰이나? Java SDK v2 chain 순서는? **A.** webhook이 container credentials 방식을 우선해 `AWS_CONTAINER_*` env만 넣는다. 그래서 Pod Identity가 쓰인다. Java chain은 system property → env 키 → web identity → profile → container → IMDS다. 사용자가 web identity env를 직접 넣었다면 그쪽이 먼저 잡힌다(EKS 문서: chain 앞쪽 자격 증명이 계속 쓰인다).

### Unverified / open (this lesson)
- EKS에서 `pod-identity-webhook`이 어디서 도는지(control plane 안인지), Pod Identity association이 webhook의 container-credentials 설정으로 어떻게 전달되는지는 공개 문서에 없다. EKS 문서는 "the cluster adds the following content"라고만 한다.
- EKS 관리형 webhook이 `--aws-default-region`과 `--sts-regional-endpoint` flag를 켜는지 모른다. 그래서 `AWS_REGION` 주입과 `AWS_STS_REGIONAL_ENDPOINTS` 기본 동작을 R1에서 단정하지 않았다.
- EKS의 `--service-account-issuer` 값이 OIDC issuer URL과 같다는 것, 즉 Pod Identity token의 `iss`도 같은 값이라는 것. IRSA가 동작하므로 강하게 시사되지만 문장으로 확인하지 못했다.
- STS가 JWKS를 가져오는 정확한 방식(호출 시점, cache)과 `Provider` 응답 값의 정확한 형태. 쓴 것은 EKS 문서의 "IAM can validate"와 API model 주석 수준이다.
- EKS Auth가 돌려주는 자격 증명의 유효 시간, association ID 형식, Pod Identity trust policy `Condition` 예시. snippet `iam_snippet:064584d9-…`이 repo에 없다.
- `AssumeRoleWithWebIdentity`의 Query/XML wire form, Java SDK가 만드는 `RoleSessionName` 형식, Java SDK의 credential 선갱신(prefetch/stale) 시간 기본값.
- EKS 1.36용 `eks-pod-identity-agent` add-on이 정확히 어떤 agent 버전(v0.2.7과 같은지)을 쓰는지. EKS 문서 예시 CLI는 `v1.0.0-eksbuild.1`이라는 add-on 버전을 쓴다.
- 노드 role이 `AssumeRoleForPodIdentity`를 쓰는 정책 snippet `iam_snippet:485a9c6f-…`의 action 이름 철자(`eks-auth:AssumeRoleForPodIdentity`)는 snippet이 repo 밖이라 직접 보지 못했다. 쓴 근거는 API 이름과 `AmazonEKSWorkerNodePolicy` 언급뿐이다.
- Step 5.12의 "CRI gRPC로 DaemonSet Pod 시작" event row는 Lesson 2의 메커니즘을 빌린 그림이다. 이 lesson의 출처로 확인한 사실이 아니다.

## Lesson 6 — `autoscaling`: 부하가 오르면 Pod가 늘고, Pod가 Pending이면 Node가 생긴다

**Goal.** CPU 부하 상승 → metrics-server 수집 → HPA가 replica 수 계산 → 새 Pod가 `Pending` → Karpenter가 `NodeClaim`을 만들고 `CreateFleet`으로 EC2를 띄움 → kube-scheduler가 새 Node에 bind, 그리고 부하가 내려가면 거꾸로 줄어드는 사슬 하나를 따라간다. Cluster Autoscaler와 EKS Auto Mode는 같은 사슬의 다른 구현으로 대비한다.

**Interview questions it answers.**
- HPA는 replica 수를 어떤 공식으로 계산하고, 얼마나 자주 계산하나? tolerance와 stabilization window의 기본값은?
- HPA가 CPU utilization을 계산하려면 Pod spec에 무엇이 꼭 있어야 하나?
- metrics-server는 어디서, 얼마 간격으로 metric을 가져오나? Prometheus 대신 쓰면 안 되는 이유는?
- HPA가 Pod를 늘렸는데 Node가 모자라면 무슨 일이 일어나나? Pod의 어떤 condition이 Karpenter/Cluster Autoscaler를 깨우나?
- Karpenter와 Cluster Autoscaler의 차이는? (ASG/node group 기반 시뮬레이션 vs. Pod 요구사항으로 instance를 직접 고르는 방식)
- Karpenter는 Pod를 Node에 직접 배치하나? (아니오: bind는 kube-scheduler)
- 부하가 내려가면 Pod와 Node는 각각 얼마 뒤에, 무엇의 제한을 받으며 줄어드나? (HPA 300s window, Karpenter consolidation과 disruption budget, CA 10m unneeded)
- EKS Auto Mode에서 autoscaling은 누가 운영하나?

**Pins.** See "Version pins" at the top of this plan.

### Nodes
| id | label / sublabel | kind | layer | appears at step | isometric illustration idea |
|---|---|---|---|---|---|
| users | Traffic / 부하 생성기 | client | Workload | 6.1 | 여러 개의 작은 노트북/휴대폰이 화살표를 쏘는 군중 실루엣 |
| pod | `web` Pods / `app` container, `cpu: 500m` | app | Workload | 6.1 | 컨테이너 상자 2개(나중에 6개); 상자 옆에 CPU 게이지 막대 |
| kubelet | kubelet / `:10250 /metrics/resource` | container | Node | 6.2 | EC2 서버 랙 위 작은 관제탑, cAdvisor 눈금 다이얼 |
| metrics | metrics-server / `metrics.k8s.io` | framework | Control plane | 6.2 | 깔때기 + 작은 메모리 칩(in-memory cache) |
| apiserver | kube-apiserver / aggregation layer | framework | Control plane | 6.4 | 가운데 허브 건물, 옆에 "APIService" 플러그 소켓 |
| hpa | HPA controller / in kube-controller-manager | framework | Control plane | 6.4 | 계산기 + 15초 스톱워치를 든 제어반 |
| kcm | ReplicaSet controller / kube-controller-manager | framework | Control plane | 6.7 | 복사기(템플릿 → 상자 복제) |
| scheduler | kube-scheduler / filter → score → bind | framework | Control plane | 6.8 | 체크리스트 깃발을 든 배차원, 빨간 X 표시 |
| karpenter | Karpenter controller / NodePool `default` | framework | Control plane | 6.9 | 테트리스 블록을 쌓는 크레인(bin-packing) |
| nodeclaim | NodeClaim `default-x9wxq` / `karpenter.sh/v1` | storage | Control plane | 6.10 | 접수증 클립보드, 체크칸 4개(Launched/Registered/Initialized/Ready) |
| ec2api | EC2 API / `CreateFleet` (Type `instant`) | client (proposed kind: cloud) | AWS | 6.11 | AWS 구름 + 서버 공장 굴뚝 |
| node | 새 EC2 Node / `c5a.2xlarge` (E.G.) | container | Node | 6.12 | 새로 떨어지는 서버 블록, 처음엔 반투명 → 등록 후 불투명 |
| ca | Cluster Autoscaler / ASG `SetDesiredCapacity` | framework | Control plane | 6.14 | 같은 모양 서버 블록이 줄지어 있는 컨베이어(Auto Scaling group) |

### State panels
| node | title | view | initial content |
|---|---|---|---|
| metrics | metrics-server cache (Pod별 최신 usage) | table: `pod`, `cpu usage`, `window` | `web-…-a` 240m 15s E.G. · `web-…-b` 260m 15s E.G. |
| hpa | HPA `web` 계산 | table: `field`, `value` | currentReplicas 2 · currentMetric 50% · target 50% · desiredReplicas 2 |
| pod | `web` Pods | table: `pod`, `phase`, `PodScheduled`, `node` | `web-…-a` Running True ip-10-0-1-11 · `web-…-b` Running True ip-10-0-2-22 |
| karpenter | provisioner batch | list | (empty) |
| nodeclaim | NodeClaim conditions | table: `type`, `status` | (none until 6.10) |
| ca | Cluster Autoscaler loop | table: `field`, `value` | scan-interval 10s · expander least-waste · unneeded nodes — |

### Steps

#### 6.1 `load-rises` — 트래픽이 늘고 CPU 사용률이 request의 150%가 된다 · `move` users → pod, token `request`: `GET /api/items ×N`
- **Subtitle:** HPA의 CPU utilization은 "사용량 ÷ container의 `requests.cpu`"다.
- **Prose:**
  > 요청이 몰리면서 `web` Pod 두 개의 CPU 사용량이 각각 약 750m가 된다(E.G.).
  > HPA가 보는 utilization은 Node 전체가 아니라 container의 `resources.requests.cpu` 대비 비율이다. 500m 요청에 750m를 쓰면 150%다.
  > Pod의 container 중 하나라도 해당 resource request가 없으면 CPU utilization이 정의되지 않고, HPA는 그 metric으로 아무것도 하지 않는다.
- **Facts:**
  | key | value |
  |---|---|
  | utilization 기준 | container `requests` 대비 백분율 |
  | request 없는 container가 있으면 | 그 metric으로 scaling 안 함 |
  | 예시 | 750m / 500m = 150% (E.G.) |
- **Event log:** `users → pod · HTTP · GET /api/items (부하 증가) · 2,000 req/s (E.G.)`
- **Sources:**
  - [HPA: How does a HorizontalPodAutoscaler work (resource request, utilization)](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L88-L101) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 6.2 `scrape` — metrics-server가 각 kubelet의 `/metrics/resource`를 긁는다 · `move` metrics → kubelet, token `request`: `GET /metrics/resource`
- **Subtitle:** 수집 주기는 `--metric-resolution`: 바이너리 기본 60s, 공식 manifest와 Helm chart는 15s.
- **Prose:**
  > metrics-server는 Node informer로 Node 목록과 주소를 얻고, 각 Node의 kubelet에 `GET /metrics/resource`를 보낸다.
  > 포트는 Node 객체의 `.status.daemonEndpoints.kubeletEndpoint.port`(기본 10250)다.
  > 수집 간격 `--metric-resolution`의 코드 기본값은 60초지만, 공식 manifest와 Helm chart는 `15s`를 넘긴다. kubelet이 15초 해상도로 계산하므로 15초 미만은 권장하지 않는다.
  > v0.6.0부터 `/metrics/resource`를 쓰고, 그 이전 버전은 `/stats/summary`를 썼다.
- **Facts:**
  | key | value |
  |---|---|
  | `--metric-resolution` 코드 기본값 | `60s` (`options.go`) |
  | 공식 manifest / Helm values | `--metric-resolution=15s` |
  | 최소값 | 10s (validation) |
  | kubelet 포트 | `kubeletEndpoint.port`, 기본 10250 |
- **Event log:** `metrics → kubelet · HTTPS · GET /metrics/resource (node ip-10-0-1-11) · 15s 주기`
- **Sources:**
  - [metrics-server options.go: MetricResolution default 60s, min 10s](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/cmd/metrics-server/app/options/options.go#L74-L86) and [L113](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/cmd/metrics-server/app/options/options.go#L113) — metrics-server v0.9.1
  - [manifests/base/deployment.yaml: `--metric-resolution=15s`](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/manifests/base/deployment.yaml#L28) — metrics-server v0.9.1
  - [FAQ: How often metrics are scraped?](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/FAQ.md#L105-L107) — metrics-server v0.9.1
  - [README: kubelet port 10250, sequence `GET /metrics/resource`](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/README.md#L53) and [L188-L197](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/README.md#L188-L197) — metrics-server v0.9.1
  - [Resource metrics pipeline: `/metrics/resource` since v0.6.0](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/debug/debug-cluster/resource-metrics-pipeline.md#L229-L233) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 6.3 `cache` — kubelet이 누적 CPU 시간을 돌려주고 metrics-server가 메모리에 저장한다 · `mutate` metrics
- **Subtitle:** `container_cpu_usage_seconds_total`(누적 core-seconds)의 rate가 cpu usage가 된다.
- **Prose:**
  > kubelet(내장 cAdvisor)은 container별 누적 CPU 시간 `container_cpu_usage_seconds_total`과 `container_memory_working_set_bytes`를 Prometheus text로 응답한다.
  > CPU usage는 누적 카운터에 rate를 취한 값이고, 그 계산 구간이 Metrics API의 `window` 필드로 보인다.
  > metrics-server는 결과를 디스크가 아니라 in-memory cache에만 보관한다. 그래서 모니터링 용도로 쓰지 말고 autoscaling에만 쓰라고 문서가 경고한다.
- **Facts:**
  | key | value |
  |---|---|
  | metric | `container_cpu_usage_seconds_total` (STABLE, kubelet `/metrics/resource`) |
  | 저장 위치 | metrics-server in-memory cache |
  | 용도 제한 | autoscaling 전용, 모니터링 소스로 쓰지 말 것 |
- **Event log:** `kubelet → metrics · HTTPS · 200 OK text/plain (Prometheus) · ~수 KB (E.G.)`
- **State:** metrics cache `web-…-a` 240m → **750m**, `web-…-b` 260m → **750m** (E.G.)
- **Record:** R2 (PodMetrics, the API view of this cache)
- **Sources:**
  - [Kubernetes metrics reference: container_cpu_usage_seconds_total](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/instrumentation/metrics.md#L98-L103) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Resource metrics pipeline: CPU rate and `window`](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/debug/debug-cluster/resource-metrics-pipeline.md#L186-L195) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [metrics-server README: autoscaling only; in-memory cache sequence](https://github.com/kubernetes-sigs/metrics-server/blob/v0.9.1/README.md#L10-L16) — metrics-server v0.9.1

#### 6.4 `hpa-query` — HPA controller가 15초마다 Metrics API를 묻는다 · `move` hpa → apiserver → metrics, token `request`: `GET /apis/metrics.k8s.io/v1beta1/namespaces/default/pods?labelSelector=app=web`
- **Subtitle:** HPA는 연속 프로세스가 아니라 `--horizontal-pod-autoscaler-sync-period`(기본 15s)마다 도는 control loop다.
- **Prose:**
  > HPA는 별도 Pod가 아니라 `kube-controller-manager` 안의 controller다. 15초마다 `scaleTargetRef`의 `.spec.selector`로 Pod를 고르고 Metrics API를 조회한다.
  > `metrics.k8s.io`는 kube-apiserver의 aggregation layer에 `APIService`로 등록된 확장 API이고, 실제 응답은 metrics-server가 한다.
  > EKS에서는 HPA를 따로 설치할 필요가 없고 metrics source(metrics-server, community add-on으로 설치 가능)만 있으면 된다.
  > EKS는 이 sync period를 control plane 파라미터로 노출하는데, `10s`–`15s` 범위이고 Provisioned Control Plane 클러스터에서만 바꿀 수 있다.
- **Facts:**
  | key | value |
  |---|---|
  | `--horizontal-pod-autoscaler-sync-period` | 기본 `15s` |
  | API group | `metrics.k8s.io/v1beta1` (aggregated `APIService`) |
  | EKS `horizontalPodAutoscalerSyncPeriod` | 기본 `15s`, 허용 `10s`–`15s`, Provisioned Control Plane 필요 |
  | EKS add-on 이름 | `metrics-server` (namespace `kube-system`, community add-on) |
- **Event log:** `hpa → apiserver → metrics · HTTPS REST (aggregated) · GET …/pods?labelSelector=app%3Dweb → PodMetricsList · 15s 주기`
- **Sources:**
  - [HPA: control loop and default 15s](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L74-L86) and [aggregated APIs](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L112-L117) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [kube-controller-manager reference: `--horizontal-pod-autoscaler-sync-period` Default 15s](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/command-line-tools-reference/kube-controller-manager.md#L567) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [podautoscaler config defaults.go](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/config/v1alpha1/defaults.go#L40-L54) — Kubernetes v1.36.2
  - [HPA metrics client lists `PodMetricses` with the label selector](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/metrics/client.go#L66-L68) — Kubernetes v1.36.2
  - [Resource metrics pipeline: APIService registration](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/debug/debug-cluster/resource-metrics-pipeline.md#L170-L174) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [EKS: Horizontal Pod Autoscaler needs only a metrics source](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/horizontal-pod-autoscaler.adoc#L15) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [EKS: control plane parameters table (HPA sync period)](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/control-plane-configuration.adoc#L38-L42) and [Provisioned Control Plane required](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/control-plane-configuration.adoc#L133) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [EKS community add-ons: Kubernetes Metrics Server](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/workloads/community-addons.adoc#L66-L95) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 6.5 `hpa-compute` — desiredReplicas = ceil(2 × 150/50) = 6 · `mutate` hpa
- **Subtitle:** 비율이 1.0 ± tolerance(기본 0.1) 안이면 아무것도 하지 않는다.
- **Prose:**
  > 공식은 `desiredReplicas = ceil(currentReplicas × currentMetricValue / desiredMetricValue)`다. 150% ÷ 50% = 3.0이고, ceil(2 × 3.0) = 6이다.
  > 비율이 0.9 이상 1.1 이하이면 scaling을 건너뛴다. 이 기본 tolerance 0.1은 `--horizontal-pod-autoscaler-tolerance`로 바꾸고, 1.35부터 beta(기본 on)인 `HPAConfigurableTolerance`로 HPA마다 `behavior.*.tolerance`를 줄 수 있다.
  > metric이 없는 Pod와 아직 Ready가 아닌 Pod는 일단 제외했다가, scale 방향이 뒤집히지 않도록 보수적으로(없는 Pod는 scale-up 때 0%, scale-down 때 100%로 가정) 다시 계산한다.
  > 코드에서는 ready Pod 수에 비율을 곱해 `math.Ceil(usageRatio * readyPodCount)`를 쓴다.
- **Facts:**
  | key | value |
  |---|---|
  | 공식 | `ceil(currentReplicas × current / desired)` |
  | tolerance 기본값 | `0.1` (`--horizontal-pod-autoscaler-tolerance`) |
  | 판정 | `1.0 − down ≤ ratio ≤ 1.0 + up`이면 skip |
  | 여러 metric | 각각 계산해 가장 큰 desiredReplicas 채택 |
- **Event log:** `hpa → hpa · in-process · usageRatio 3.00 → desiredReplicas 6 · <1ms (E.G.)`
- **State:** `currentMetric` 50% → **150%**; `desiredReplicas` 2 → **6** (pre-behavior)
- **Sources:**
  - [HPA: Algorithm details (formula, tolerance 0.1, multiple metrics)](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L130-L151) and [missing metrics / not-yet-ready](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L161-L214) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [HPA: Tolerance field and cluster default 10%](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L493-L517) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [Feature gate HPAConfigurableTolerance: alpha 1.33–1.34, beta default true from 1.35](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/command-line-tools-reference/feature-gates/HPAConfigurableTolerance.md#L8-L15) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [replica_calculator.go: `Tolerances.isWithin`](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/replica_calculator.go#L46-L58) and [`GetResourceReplicas` → `math.Ceil(usageRatio * readyPodCount)`](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/replica_calculator.go#L80-L118) — Kubernetes v1.36.2

#### 6.6 `hpa-behavior` — scale-up 정책이 한 번에 늘릴 수 있는 수를 자른다 · `mutate` hpa
- **Subtitle:** 기본 scaleUp: 15초마다 100% 또는 4 Pods 중 큰 쪽(`selectPolicy: Max`), stabilization 0s.
- **Prose:**
  > 계산값 6을 그대로 쓰지 않고 `behavior`로 제한한다. 기본 scaleUp에는 window가 없고(0초) 정책이 두 개다: 15초에 현재의 100%, 또는 15초에 4 Pods.
  > 현재 2개 기준으로 Percent 정책은 ceil(2 × 2) = 4, Pods 정책은 2 + 4 = 6이고, `selectPolicy: Max`라 큰 쪽인 6이 허용된다. 결과는 6이다.
  > scaleDown은 기본 stabilization window 300초 동안의 추천값 중 가장 큰 값을 쓰므로, 줄어드는 쪽은 천천히 움직인다.
- **Facts:**
  | key | value |
  |---|---|
  | scaleUp 기본 | window `0`; `Percent 100 / 15s`, `Pods 4 / 15s`; `selectPolicy: Max` |
  | scaleDown 기본 | window `300`s; `Percent 100 / 15s` |
  | `periodSeconds` 최대 | 1800 |
  | 이 예시 상한 | max(ceil(2×2)=4, 2+4=6) = 6 |
- **Event log:** `hpa → hpa · in-process · scaleUpLimit 6, desired 6 (ScalingLimited=False) · <1ms (E.G.)`
- **State:** `desiredReplicas (after behavior)` — → **6**; `ScalingLimited` — → **False / DesiredWithinRange**
- **Record:** R1 (HPA spec + status)
- **Sources:**
  - [HPA: Default behavior YAML and explanation](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L519-L550) and [periodSeconds max 1800](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L452-L453) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [horizontal.go: `calculateScaleUpLimitWithScalingRules` (Percent uses ceil, Pods adds value, Max selects)](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/horizontal.go#L1383-L1409) — Kubernetes v1.36.2

#### 6.7 `scale-update` — HPA가 Deployment의 `scale` subresource를 6으로 바꾼다 · `move` hpa → apiserver, token `call`: `PUT /apis/apps/v1/namespaces/default/deployments/web/scale {replicas: 6}`
- **Subtitle:** 이후는 일반 Deployment → ReplicaSet → Pod 생성 흐름(Lesson 2)과 같다.
- **Prose:**
  > HPA는 Deployment 전체를 고치지 않고 `scale` subresource만 Update한다. 성공하면 HPA에 `SuccessfulRescale` 이벤트가 남는다.
  > 이벤트 메시지는 `New size: 6; reason: cpu resource utilization (percentage of request) above target` 형태다.
  > Deployment controller가 ReplicaSet의 replicas를 6으로 올리고, ReplicaSet controller가 Pod 4개를 새로 만든다. 새 Pod는 아직 `nodeName`이 비어 있다.
- **Facts:**
  | key | value |
  |---|---|
  | 호출 | `Scales(namespace).Update(…)` (scale subresource) |
  | 성공 이벤트 | `Normal SuccessfulRescale "New size: %d; reason: %s"` |
  | 실패 이벤트 | `Warning FailedRescale`, `AbleToScale=False FailedUpdateScale` |
  | 새 Pod | 4개 생성, `spec.nodeName` 없음 |
- **Event log:** `hpa → apiserver · HTTPS REST · PUT …/deployments/web/scale replicas=6 · 200 OK`
- **Sources:**
  - [HPA: `scale` subresource](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L121-L125) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [horizontal.go: scale Update](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/horizontal.go#L947), [rescale reason "%s above target"](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/horizontal.go#L918-L924), [metric name "… resource utilization (percentage of request)"](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/horizontal.go#L637), [SuccessfulRescale / FailedRescale events](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/horizontal.go#L966-L979) — Kubernetes v1.36.2
  - [ReplicaSet: creating and deleting Pods to reach the desired number](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/controllers/replicaset.md#L33-L36) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 6.8 `pending` — 4개 중 2개는 들어갈 Node가 없어 `PodScheduled=False / Unschedulable` · `mutate` pod (by scheduler)
- **Subtitle:** kube-scheduler의 Filter 단계에서 `NodeResourcesFit`이 `Insufficient cpu`로 모든 Node를 거른다.
- **Prose:**
  > scheduler는 새 Pod 4개 중 2개를 기존 Node 남는 자리에 배치한다. 나머지 2개는 feasible Node가 하나도 없다.
  > Filter가 거부하면 scheduler는 Pod에 `PodScheduled` condition을 `status: False`, `reason: Unschedulable`로 쓰고 `FailedScheduling` Warning 이벤트를 남긴다.
  > 메시지 형식은 `0/X nodes are available: <PreFilterMsg>. <FilterMsg>. <PostFilterMsg>.`이다. Pod `phase`는 여전히 `Pending`이다.
  > 바로 이 condition이 Karpenter와 Cluster Autoscaler가 지켜보는 신호다.
- **Facts:**
  | key | value |
  |---|---|
  | condition | `type: PodScheduled`, `status: "False"`, `reason: Unschedulable` |
  | 이벤트 | `Warning FailedScheduling` (action `Scheduling`) |
  | CPU 부족 사유 문자열 | `Insufficient cpu` (`NodeResourcesFit`) |
  | `phase` | `Pending` (스케줄 대기 시간 포함) |
- **Event log:** `scheduler → apiserver · HTTPS REST · PATCH pods/web-…-e/status PodScheduled=False Unschedulable; Event FailedScheduling · 2 Pods`
- **State:** pod rows added: `web-…-c` Pending True ip-10-0-1-11 · `web-…-d` Pending True ip-10-0-2-22 · **`web-…-e` Pending False —** · **`web-…-f` Pending False —**
- **Record:** R3 (Pending Pod condition + FailedScheduling event)
- **Sources:**
  - [schedule_one.go: reason `Unschedulable` when rejected](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/schedule_one.go#L1210-L1215) and [FailedScheduling event + PodScheduled=False](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/schedule_one.go#L1288-L1297) — Kubernetes v1.36.2
  - [framework/types.go: `0/%v nodes are available` message format](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/framework/types.go#L901-L927) — Kubernetes v1.36.2
  - [noderesources/fit.go: `Insufficient cpu`](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/framework/plugins/noderesources/fit.go#L699-L705) — Kubernetes v1.36.2
  - [core/v1 types.go: `PodReasonUnschedulable = "Unschedulable"`](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/core/v1/types.go#L3557) — Kubernetes v1.36.2
  - [Pod lifecycle: `Pending` phase](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L114) and [`PodScheduled` condition](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/pods/pod-lifecycle.md#L608) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)

#### 6.9 `karpenter-batch` — Karpenter가 Unschedulable Pod를 모아 batch window를 연다 · `mutate` karpenter
- **Subtitle:** 새 Pending Pod가 1초 안에 또 오면 window를 연장, 최대 10초.
- **Prose:**
  > Karpenter는 kube-scheduler가 Unschedulable로 표시한 Pod만 대상으로 한다. 이미 들어갈 자리가 있는 Pod는 건드리지 않는다.
  > Pod를 하나씩 처리하지 않고 batch로 모은다. `--batch-idle-duration`(기본 1s) 동안 새 Pod가 없으면 window를 닫고, 계속 오면 `--batch-max-duration`(기본 10s)까지 늘린다.
  > batch가 클수록 "더 적고 더 큰" Node를 띄우게 된다. 로그에는 `found provisionable pod(s)`가 찍힌다.
- **Facts:**
  | key | value |
  |---|---|
  | 대상 | Unschedulable로 표시된 Pod만 |
  | `BATCH_IDLE_DURATION` | 기본 `1s` |
  | `BATCH_MAX_DURATION` | 기본 `10s` |
  | 로그 | `found provisionable pod(s)` |
- **Event log:** `apiserver → karpenter · watch · Pod web-…-e, web-…-f Unschedulable → batch open · ≤10s`
- **State:** karpenter list — → `default/web-…-e`, `default/web-…-f` (batch 1)
- **Sources:**
  - [Karpenter concepts: only pods marked unschedulable](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/_index.md#L32-L36) — Karpenter (AWS provider) v1.15.1
  - [Karpenter settings: BATCH_IDLE_DURATION / BATCH_MAX_DURATION](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/reference/settings.md#L16-L17) and [Batching Parameters](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/reference/settings.md#L94-L108) — Karpenter (AWS provider) v1.15.1
  - [NodeClaims: step 1 log "found provisionable pod(s)"](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L60-L76) — Karpenter (AWS provider) v1.15.1

#### 6.10 `karpenter-binpack` — NodePool 요구사항과 Pod 요구사항을 겹쳐 NodeClaim을 계산·생성한다 · `move` karpenter → apiserver, token `data`: `create NodeClaim default-x9wxq`
- **Subtitle:** CPU·메모리·GPU에 DaemonSet overhead와 VPC CNI 자원까지 더해 bin-packing한다.
- **Prose:**
  > Karpenter는 batch의 Pod들을 CPU, memory, GPU 요청으로 bin-packing한다. 새 Node에 함께 뜰 DaemonSet의 request, node overhead, VPC CNI 자원도 더한다.
  > 후보 instance type은 NodePool `spec.template.spec.requirements`와 Pod의 nodeSelector/affinity/topology spread를 교집합한 것이다. 여러 NodePool이 맞으면 `weight`가 높은 쪽을 쓴다.
  > 결과는 `NodeClaim`이라는 cluster-scoped, immutable 객체다. NodeClaim은 NodePool 하나가 소유하고 NodeClass 하나를 참조하며, instance 하나와 Node 하나에 1:1로 대응한다.
  > 로그는 `computed new nodeclaim(s) to fit pod(s)` → `created nodeclaim`이다.
- **Facts:**
  | key | value |
  |---|---|
  | 객체 | `karpenter.sh/v1` `NodeClaim`, cluster-scoped, immutable |
  | 소유 | NodePool `ownerReferences`, finalizer `karpenter.sh/termination` |
  | 크기 계산 | Pod requests + DaemonSet requests + overhead + VPC CNI 자원 |
  | NodePool 선택 | 여러 개 맞으면 `weight` 높은 순 |
- **Event log:** `karpenter → apiserver · HTTPS REST · POST /apis/karpenter.sh/v1/nodeclaims (requests cpu 1000m+DS, pods 2) · ~2 KB (E.G.)`
- **Record:** R5 (NodePool) and R6 (NodeClaim)
- **Sources:**
  - [Karpenter FAQ: batches and binpacks on CPU, memory, GPU, overhead, VPC CNI, daemonsets](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/faq.md#L98) — Karpenter (AWS provider) v1.15.1
  - [Scheduling: DaemonSet overhead](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/scheduling.md#L134-L136) — Karpenter (AWS provider) v1.15.1
  - [NodeClaims: definition, ownership, 1:1 mapping](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L9-L23) and [steps 2–3 logs](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L76-L110) — Karpenter (AWS provider) v1.15.1
  - [NodePools: weight when multiple NodePools match](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodepools.md#L23) and [requirements combined with pod constraints](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodepools.md#L85-L88) — Karpenter (AWS provider) v1.15.1

#### 6.11 `createfleet` — NodeClaim 하나를 EC2 `CreateFleet`(instant, capacity 1)로 띄운다 · `move` karpenter → ec2api, token `request`: `CreateFleet Type=instant TotalTargetCapacity=1`
- **Subtitle:** 여러 instance type × subnet 조합을 override로 넘기고 EC2가 고르게 한다.
- **Prose:**
  > Karpenter는 ASG를 쓰지 않고 EC2 `CreateFleet`을 `Type: instant`로 직접 호출한다. `TotalTargetCapacity`는 1이고, 후보 instance type과 subnet(AZ), AMI를 `LaunchTemplateConfigs[].Overrides`에 담는다.
  > spot이면 `SpotOptions.AllocationStrategy: price-capacity-optimized`, on-demand면 `OnDemandOptions.AllocationStrategy: lowest-price`(node overlay가 없을 때)다.
  > Insufficient Capacity 같은 복구 불가 오류가 나면 NodeClaim을 지우고, 그 instance type을 일시적으로 unavailable로 표시한 뒤 필요하면 새 NodeClaim을 만든다.
  > 성공하면 `providerID`(예: `aws:///us-west-2b/i-…`)가 생기고 `launched nodeclaim` 로그가 찍힌다.
- **Facts:**
  | key | value |
  |---|---|
  | `Type` | `instant` |
  | `TargetCapacitySpecification.TotalTargetCapacity` | `1` |
  | spot / on-demand 전략 | `price-capacity-optimized` / `lowest-price` (overlay 없을 때) |
  | 필수 tag (IAM 조건) | `kubernetes.io/cluster/<cluster>=owned`, `eks:eks-cluster-name=<cluster>`, `karpenter.sh/nodepool=*` |
- **Event log:** `karpenter → ec2api · AWS EC2 API (HTTPS) · CreateFleet → InstanceIds [i-01234567adb205c7e] · ~3 s (E.G.)`
- **State:** nodeclaim `Launched` Unknown → **True**
- **Record:** R7 (CreateFleet request)
- **Sources:**
  - [instance/types.go: `CreateFleetInputBuilder.Build`](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/pkg/providers/instance/types.go#L221-L248) — Karpenter (AWS provider) v1.15.1
  - [instance/instance.go: CreateFleet call](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/pkg/providers/instance/instance.go#L405-L421) and [overrides: InstanceType, SubnetId, ImageId, AvailabilityZone, Priority](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/pkg/providers/instance/instance.go#L586-L597) — Karpenter (AWS provider) v1.15.1
  - [NodeClaims: step 4 (launch, ICE handling, log)](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L112-L137) — Karpenter (AWS provider) v1.15.1
  - [CloudFormation reference: AllowScopedResourceCreationTagging conditions](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/reference/cloudformation.md#L198-L231) — Karpenter (AWS provider) v1.15.1

#### 6.12 `node-register` — 새 instance의 kubelet이 Node로 등록되고 NodeClaim이 Ready가 된다 · `mutate` nodeclaim
- **Subtitle:** Launched → Registered → Initialized → Ready. 15분 안에 등록 안 되면 instance를 지우고 다시 만든다.
- **Prose:**
  > instance가 부팅하면 kubelet이 스스로 Node를 등록한다. Karpenter는 Node의 label, annotation, taint, owner ref, finalizer를 NodePool/NodeClaim에 맞게 맞추고 `karpenter.sh/unregistered` taint를 제거한다 → `Registered`.
  > 15분 안에 등록되지 않으면 NodeClaim과 instance를 지우고 필요하면 새 NodeClaim을 만든다.
  > Node가 Ready이고, startup taint가 모두 빠지고, 요청한 resource가 Node에 등록되면 `Initialized`, 세 가지가 모두 True면 `Ready`다.
- **Facts:**
  | key | value |
  |---|---|
  | 등록 신호 | `karpenter.sh/unregistered` taint 제거 |
  | 등록 timeout | 15분 → NodeClaim 삭제, instance 종료 |
  | `Ready` 조건 | `Launched` ∧ `Registered` ∧ `Initialized` |
  | 조건 필드 | `type`, `status`(True/False/Unknown), `reason`, `message`, `lastTransitionTime` |
- **Event log:** `node(kubelet) → apiserver · HTTPS REST · POST /api/v1/nodes ip-10-0-3-33 (E.G.) → NodeClaim Registered/Initialized/Ready · ~40–70 s (E.G., doc example)`
- **State:** nodeclaim `Registered` Unknown → **True**; `Initialized` Unknown → **True**; `Ready` Unknown → **True**
- **Sources:**
  - [NodeClaims: steps 5–6 (registration, unregistered taint, 15 minutes, initialization)](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L139-L185) — Karpenter (AWS provider) v1.15.1
  - [NodeClaims: status.conditions table](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L573-L581) — Karpenter (AWS provider) v1.15.1
  - [NodeClaims: describe example events Launched 70s / Registered 48s / Initialized 36s](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L352-L360) — Karpenter (AWS provider) v1.15.1

#### 6.13 `bind` — Pending Pod를 새 Node에 붙이는 건 Karpenter가 아니라 kube-scheduler다 · `move` scheduler → apiserver, token `call`: `POST pods/web-…-e/binding → ip-10-0-3-33`
- **Subtitle:** Node 추가 event가 unschedulable queue의 Pod를 다시 active/backoff queue로 보낸다.
- **Prose:**
  > Karpenter는 bin-packing을 "시뮬레이션"해서 Node를 띄울 뿐, Pod를 Node에 bind하지 않는다. 배치는 kube-scheduler의 일이다.
  > scheduler는 cluster event(새 Node 등)를 보고 QueueingHint로 거부됐던 Pod를 다시 큐에 넣어 재시도한다.
  > 기본 scoring은 `NodeResourcesFit`의 `LeastAllocated`(분산)라서 Karpenter의 촘촘한 packing과 어긋날 수 있다. Karpenter 문서는 `MostAllocated`를 권장하고, EKS는 이 scoring strategy를 control plane 파라미터로 노출한다.
- **Facts:**
  | key | value |
  |---|---|
  | bind 주체 | kube-scheduler (Karpenter 아님) |
  | 재시도 계기 | cluster event + QueueingHint |
  | EKS `nodeResourcesFit.scoringStrategy` | `LeastAllocated`(기본) 또는 `MostAllocated` |
- **Event log:** `scheduler → apiserver · HTTPS REST · POST …/pods/web-…-e/binding, …-f/binding · 2 Bindings`
- **State:** pod `web-…-e` PodScheduled False → **True**, node — → **ip-10-0-3-33**; same for `web-…-f`
- **Sources:**
  - [Karpenter scheduling: Karpenter does not place pods; MostAllocated recommendation](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/scheduling.md#L705-L707) — Karpenter (AWS provider) v1.15.1
  - [Scheduling framework: unschedulable → returned to queue; QueueingHint](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L41-L43) and [L75-L84](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/scheduling-eviction/scheduling-framework.md#L75-L84) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [EKS control plane parameters: kube-scheduler `nodeResourcesFit.scoringStrategy`](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/control-plane-configuration.adoc#L30-L36) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 6.14 `ca-contrast` — 같은 상황에서 Cluster Autoscaler는 Auto Scaling group의 크기를 올린다 · `mutate` ca
- **Subtitle:** 10초마다 unschedulable Pod를 찾고, node group별 template node로 시뮬레이션한 뒤 expander로 하나를 고른다.
- **Prose:**
  > Cluster Autoscaler는 "node group 안의 machine은 모두 같은 capacity와 label"이라고 가정한다. node group마다 template node를 만들어 Pending Pod가 들어갈지 시뮬레이션한다.
  > 여러 group이 가능하면 `--expander`로 고른다. 1.36.1의 flag 기본값은 `least-waste`다. AWS에서는 ASG의 desired capacity를 `autoscaling:SetDesiredCapacity`로 올린다.
  > 그래서 instance type은 ASG/launch template이 미리 정하고, 새 Node가 `--max-node-provision-time`(기본 15m) 안에 등록되지 않으면 다른 group을 시도한다.
  > Karpenter는 group 없이 Pod 요구사항으로 instance type을 직접 고르고 `CreateFleet`을 부른다는 점이 핵심 차이다.
- **Facts:**
  | key | value |
  |---|---|
  | `--scan-interval` | `10s` |
  | `--expander` 기본 | `least-waste` (random, most-pods, least-waste, price, priority, grpc) |
  | `--max-node-provision-time` | `15m0s` |
  | AWS API | `autoscaling:SetDesiredCapacity`, auto-discovery tag `k8s.io/cluster-autoscaler/enabled`, `k8s.io/cluster-autoscaler/<cluster-name>` |
- **Event log:** `ca → AWS Auto Scaling · AWS API · SetDesiredCapacity asg=web-ng 2→3 (E.G.) · scan 10s`
- **State:** ca `unschedulable pods` — → **2**; `chosen node group` — → **web-ng (least-waste)** (E.G.)
- **Sources:**
  - [CA FAQ: How does scale-up work?](https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-1.36.1/cluster-autoscaler/FAQ.md#L779-L815) — Cluster Autoscaler 1.36.1
  - [CA FAQ: What are Expanders?](https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-1.36.1/cluster-autoscaler/FAQ.md#L940-L975) and [flag table: expander default "least-waste"](https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-1.36.1/cluster-autoscaler/FAQ.md#L1032), [max-node-provision-time](https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-1.36.1/cluster-autoscaler/FAQ.md#L1082), [scan-interval](https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-1.36.1/cluster-autoscaler/FAQ.md#L1132) — Cluster Autoscaler 1.36.1
  - [CA on AWS: IAM `autoscaling:SetDesiredCapacity`](https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-1.36.1/cluster-autoscaler/cloudprovider/aws/README.md#L36-L62) and [Auto-Discovery tags](https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-1.36.1/cluster-autoscaler/cloudprovider/aws/README.md#L163-L169) — Cluster Autoscaler 1.36.1
  - [EKS: Karpenter and Cluster Autoscaler (CA uses Auto Scaling groups)](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/autoscaling.adoc#L31-L40) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

#### 6.15 `scale-down-pods` — 부하가 내려가도 HPA는 300초 window의 최댓값을 따른다 · `mutate` hpa
- **Subtitle:** scale-down 추천값을 5분간 기록해 그중 가장 큰 값을 쓴다 → flapping 방지.
- **Prose:**
  > 트래픽이 줄어 utilization이 20%가 되면 계산값은 ceil(6 × 20/50) = 3이다(E.G.).
  > 하지만 HPA는 지난 300초 동안의 추천값 중 가장 큰 값을 적용하므로 즉시 3으로 줄지 않는다. 이때 `AbleToScale=True / ScaleDownStabilized` condition이 보인다.
  > window가 지나면 기본 scaleDown 정책(15초에 100%)과 `minReplicas: 2` 범위 안에서 줄어든다.
- **Facts:**
  | key | value |
  |---|---|
  | `--horizontal-pod-autoscaler-downscale-stabilization` | 기본 `5m` |
  | `behavior.scaleDown.stabilizationWindowSeconds` 기본 | `300` |
  | 대기 중 condition | `AbleToScale True ScaleDownStabilized` |
  | 예시 | 300s 후 6 → 3 (E.G.) |
- **Event log:** `hpa → apiserver · HTTPS REST · PUT …/deployments/web/scale replicas=3 · after 300 s window`
- **State:** `currentMetric` 150% → **20%**; `desiredReplicas` 6 → **3** (after window)
- **Sources:**
  - [HPA: scale recommendations window, default 5 minutes](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L214-L220) and [Stabilization window](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L471-L491) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e)
  - [defaults.go: DownscaleStabilizationWindow 5m](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/config/v1alpha1/defaults.go#L43-L44) and [horizontal.go: ScaleDownStabilized condition](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/horizontal.go#L1059-L1064) — Kubernetes v1.36.2

#### 6.16 `consolidate` — 빈 Node나 덜 쓰는 Node를 Karpenter가 지우거나 더 싼 Node로 바꾼다 · `mutate` karpenter
- **Subtitle:** 기본 `consolidationPolicy: WhenEmptyOrUnderutilized`, `consolidateAfter: 0s`, budget 없으면 `nodes: 10%`.
- **Prose:**
  > Pod가 줄어 새 Node가 비거나 저활용되면 consolidation 대상이 된다. 방법은 Deletion(다른 Node 남는 자리로 다 옮길 수 있을 때)과 Replace(더 싼 Node 하나 + 남는 자리)다.
  > 순서는 Empty → Multi Node → Single Node consolidation이고, 교체 Node를 먼저 띄워(pre-spin) Ready가 된 뒤 기존 Node를 taint·drain·삭제한다.
  > `spec.disruption.budgets`가 없으면 `nodes: 10%` 하나가 기본이고, PodDisruptionBudget도 존중한다. 비교하면 Cluster Autoscaler는 request 합이 allocatable의 50% 미만인 상태가 10분(`scale-down-unneeded-time`) 지속되어야 지우고, scale-up 후 10분(`scale-down-delay-after-add`)은 scale-down을 평가하지 않는다.
- **Facts:**
  | key | value |
  |---|---|
  | Karpenter 기본 | `consolidationPolicy: WhenEmptyOrUnderutilized`, `consolidateAfter: 0s` |
  | 기본 budget | `nodes: 10%` (정의 안 했을 때) |
  | CA scale-down | `scale-down-utilization-threshold 0.5`, `scale-down-unneeded-time 10m0s` |
  | CA `scale-down-delay-after-add` | `10m0s` |
- **Event log:** `karpenter → apiserver/ec2api · HTTPS REST + EC2 API · delete NodeClaim default-x9wxq → TerminateInstances (E.G.) · consolidateAfter 0s`
- **State:** nodeclaim `Consolidatable` — → **True**; then NodeClaim deleted (E.G.)
- **Sources:**
  - [Disruption: Defaults (WhenEmptyOrUnderutilized, 0s)](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/disruption.md#L75-L83), [Consolidation mechanisms and order](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/disruption.md#L86-L107), [disruption flow (pre-spin, delete)](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/disruption.md#L16-L26), [budgets default nodes: 10%](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/disruption.md#L317) — Karpenter (AWS provider) v1.15.1
  - [CA FAQ: How does scale-down work?](https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-1.36.1/cluster-autoscaler/FAQ.md#L817-L833), [flags: scale-down-delay-after-add, unneeded-time, utilization-threshold](https://github.com/kubernetes/autoscaler/blob/cluster-autoscaler-1.36.1/cluster-autoscaler/FAQ.md#L1118-L1129) — Cluster Autoscaler 1.36.1

#### 6.17 `auto-mode` — EKS Auto Mode에서는 이 Karpenter를 AWS가 운영한다 · `mutate` karpenter (relabel as "EKS Auto Mode (managed)")
- **Subtitle:** 같은 `karpenter.sh/v1` NodePool API, NodeClass는 `eks.amazonaws.com` group, built-in NodePool `system`·`general-purpose`.
- **Prose:**
  > 자체 설치한 Karpenter는 고객이 설치·업그레이드·가용성을 책임지는 오픈소스이고 AWS SLA가 없다.
  > EKS Auto Mode는 Karpenter 위에 만들어졌고, unschedulable Pod를 보고 Node를 만들며 consolidation도 한다. controller는 AWS가 관리한다.
  > NodePool은 `nodeClassRef.group: eks.amazonaws.com`, `kind: NodeClass`를 참조한다. built-in NodePool `system`(taint `CriticalAddonsOnly`, amd64+arm64)과 `general-purpose`(amd64)는 on-demand만, C/M/R 계열 5세대 이상만 쓴다.
- **Facts:**
  | key | value |
  |---|---|
  | 기반 | Karpenter (EKS Auto Mode "builds upon Karpenter") |
  | NodeClass ref | `group: eks.amazonaws.com`, `kind: NodeClass` |
  | built-in NodePools | `system`, `general-purpose` (on-demand, C/M/R, gen ≥ 5) |
  | 자체 Karpenter | 고객 운영, AWS SLA 없음 |
- **Event log:** `— (개념 step; no message)`
- **State:** karpenter label "Karpenter (self-managed)" → **"EKS Auto Mode (AWS-managed Karpenter)"**
- **Sources:**
  - [EKS autoscaling: Auto Mode builds upon Karpenter; self-managed Karpenter has no SLA](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/autoscaling.adoc#L17) and [L36](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/autoscaling.adoc#L36) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [EKS Auto Mode: auto scaling relies on Karpenter](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/automode/automode.adoc#L60) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)
  - [Built-in NodePool reference](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/automode/set-builtin-node-pools.adoc#L10-L24) and [NodePool nodeClassRef group eks.amazonaws.com](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/automode/create-node-pool.adoc#L50-L59) — Amazon EKS User Guide @ 8d43223 (2026-09-16; EKS 1.36, platform eks.10)

### Decoder records

#### R1. HorizontalPodAutoscaler `web` (step 6.6) — layer bar: metadata / spec.scaleTargetRef / spec.metrics / spec.behavior / status
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
  behavior:                      # 생략 시 아래 기본값과 같음
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
status:
  observedGeneration: 1
  lastScaleTime: "2026-11-03T12:00:15Z"
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
    message: the desired replica count is within the acceptable range
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `spec.scaleTargetRef` | `apps/v1 Deployment web` | `scale` subresource를 가진 대상 | E.G. |
| `spec.minReplicas` / `maxReplicas` | 2 / 10 | replica 하한·상한 | E.G. |
| `spec.metrics[0].resource.target.averageUtilization` | 50 | request 대비 목표 % | E.G. |
| `spec.behavior.scaleUp.policies` | Percent 100/15s, Pods 4/15s | 기본 scale-up 속도 제한 | |
| `spec.behavior.scaleUp.selectPolicy` | `Max` | 정책 중 변화량 큰 쪽 | |
| `spec.behavior.scaleDown.stabilizationWindowSeconds` | 300 | 축소 시 5분간 추천 최댓값 사용 | |
| `status.currentReplicas` / `desiredReplicas` | 2 / 6 | 현재 vs 계산된 목표 | E.G. |
| `status.currentMetrics[0].resource.current.averageUtilization` | 150 | Pod 평균 utilization % | E.G. |
| `status.lastScaleTime` | timestamp | 마지막 rescale 시각 | E.G. |
| `status.conditions[AbleToScale]` | True / SucceededRescale | scale 조회·갱신 가능 여부 | |
| `status.conditions[ScalingActive]` | True / ValidMetricFound | metric으로 계산 가능 여부 | |
| `status.conditions[ScalingLimited]` | False / DesiredWithinRange | min/max에 걸렸는지 | |

Sources: [walkthrough autoscaling/v2 YAML](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough.md#L230-L260), [status conditions appendix](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough.md#L455-L498), [default behavior](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale.md#L519-L542) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e); condition reasons and messages: [horizontal.go L358](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/horizontal.go#L358), [L978](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/horizontal.go#L978), [L637](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/controller/podautoscaler/horizontal.go#L637) — Kubernetes v1.36.2. The `DesiredWithinRange` message text is taken from the docs example; the exact v1.36.2 message string is **unverified**.

#### R2. PodMetrics (metrics.k8s.io) for one `web` Pod (step 6.3) — layer bar: type / metadata / timestamp+window / containers[].usage
```json
{
  "kind": "PodMetrics",
  "apiVersion": "metrics.k8s.io/v1beta1",
  "metadata": {
    "name": "web-7c9d8f6b5d-a1b2c",
    "namespace": "default",
    "creationTimestamp": "2026-11-03T12:00:14Z"
  },
  "timestamp": "2026-11-03T12:00:00Z",
  "window": "15s",
  "containers": [
    { "name": "app", "usage": { "cpu": "750m", "memory": "312Mi" } }
  ]
}
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `kind` / `apiVersion` | `PodMetrics` / `metrics.k8s.io/v1beta1` | aggregated Metrics API 타입 | |
| `metadata.name` | `web-7c9d8f6b5d-a1b2c` | 대상 Pod 이름 | E.G. |
| `timestamp` | RFC 3339 | 측정 시점 | E.G. |
| `window` | `15s` | CPU rate 계산 구간 (docs 예시는 `30s`) | E.G. |
| `containers[].name` | `app` | container 이름 | E.G. |
| `containers[].usage.cpu` | `750m` | 평균 core 사용량 (예시 원문은 nanocores `9559630n` 형식도 사용) | E.G. |
| `containers[].usage.memory` | `312Mi` | working set memory | E.G. |

Sources: [Resource metrics pipeline: sample PodMetrics response](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/debug/debug-cluster/resource-metrics-pipeline.md#L147-L168) and [CPU `window`](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/tasks/debug/debug-cluster/resource-metrics-pipeline.md#L186-L195) — Kubernetes 1.36 docs (kubernetes/website release-1.36 @ 1de955e). That memory is the working set: **unverified** at a pinned line (metric `container_memory_working_set_bytes` exists at [metrics.md L105](https://github.com/kubernetes/website/blob/1de955ebabe7e17da1ebb4f582635491227f4157/content/en/docs/reference/instrumentation/metrics.md#L105); mapping to `usage.memory` not checked). That `window` equals 15s with `--metric-resolution=15s`: **unverified**.

#### R3. Pending Pod condition + FailedScheduling Event (step 6.8) — layer bar: Pod.status / conditions[PodScheduled] / Event
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
    message: "0/2 nodes are available: 2 Insufficient cpu. preemption: 0/2 nodes are available: 2 No preemption victims found for incoming pod."
    lastTransitionTime: "2026-11-03T12:00:16Z"
---
# Event (events.k8s.io/v1, excerpt)
type: Warning
reason: FailedScheduling
action: Scheduling
regarding: { kind: Pod, namespace: default, name: web-7c9d8f6b5d-x7k2p }
note: "0/2 nodes are available: 2 Insufficient cpu. preemption: 0/2 nodes are available: 2 No preemption victims found for incoming pod."
reportingController: default-scheduler
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `status.phase` | `Pending` | 스케줄 대기 포함 | |
| `status.conditions[].type` | `PodScheduled` | Node 배정 여부 | |
| `status.conditions[].status` | `"False"` | 아직 배정 안 됨 | |
| `status.conditions[].reason` | `Unschedulable` | Filter가 거부함 (`PodReasonUnschedulable`) | |
| `status.conditions[].message` | `0/2 nodes are available: 2 Insufficient cpu. …` | `0/X nodes are available: <PreFilter>. <Filter>. <PostFilter>.` | E.G. |
| Event `reason` / `action` | `FailedScheduling` / `Scheduling` | scheduler Warning 이벤트 | |
| Event `note` | condition message와 동일 (NoteLengthLimit에서 잘림) | | E.G. |
| `spec.nodeName` | (없음) | bind 전 | |

Sources: [schedule_one.go L1210-L1215, L1288-L1310](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/schedule_one.go#L1288-L1310), [framework/types.go L901-L927](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/framework/types.go#L901-L927), [fit.go L699-L705](https://github.com/kubernetes/kubernetes/blob/v1.36.2/pkg/scheduler/framework/plugins/noderesources/fit.go#L699-L705), [core/v1 types.go L3557](https://github.com/kubernetes/kubernetes/blob/v1.36.2/staging/src/k8s.io/api/core/v1/types.go#L3557) — Kubernetes v1.36.2. The exact PostFilter (`preemption: …`) wording and `reportingController: default-scheduler` are **unverified**; mark both E.G.

#### R4. Cluster Autoscaler view (step 6.14) — no decoder record; CA state is shown in the `ca` state panel only.

#### R5. NodePool `default` (step 6.10) — layer bar: template.metadata / template.spec (nodeClassRef, requirements, expireAfter) / disruption / limits / weight
```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: default
spec:
  template:
    metadata:
      labels:
        billing-team: my-team
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      expireAfter: 720h
      terminationGracePeriod: 48h
      requirements:
      - key: karpenter.k8s.aws/instance-category
        operator: In
        values: ["c", "m", "r"]
      - key: karpenter.k8s.aws/instance-generation
        operator: Gte
        values: ["3"]
      - key: kubernetes.io/arch
        operator: In
        values: ["amd64"]
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["spot", "on-demand"]
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 1m
    budgets:
    - nodes: 10%
  limits:
    cpu: "1000"
    memory: 1000Gi
  weight: 10
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `spec.template.spec.nodeClassRef` | `karpenter.k8s.aws / EC2NodeClass / default` | AWS 설정(AMI, subnet, SG, role) 참조 | E.G. name |
| `spec.template.spec.requirements` | category c/m/r, gen ≥ 3, … | Pod 제약과 교집합 → 후보 instance type | E.G. |
| `spec.template.spec.expireAfter` | `720h` | Node 최대 수명 (변경 시 drift) | E.G. |
| `spec.template.spec.terminationGracePeriod` | `48h` | drain 강제 삭제까지 시간 | E.G. |
| `spec.disruption.consolidationPolicy` | `WhenEmptyOrUnderutilized` | consolidation 대상 범위 (기본값) | |
| `spec.disruption.consolidateAfter` | `1m` (기본 `0s`) | Pod 변화 후 대기 시간 | E.G. |
| `spec.disruption.budgets[].nodes` | `10%` | 동시 voluntary disruption 상한 (정의 없을 때 기본) | |
| `spec.limits.cpu` / `memory` | `1000` / `1000Gi` | pool 총 크기 상한 | E.G. |
| `spec.weight` | 10 | 여러 NodePool 매칭 시 우선순위 | E.G. |

Sources: [NodePools: example YAML](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodepools.md#L33-L165) — Karpenter (AWS provider) v1.15.1; [Disruption: defaults](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/disruption.md#L75-L83), [budget default](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/disruption.md#L317) — Karpenter (AWS provider) v1.15.1. EC2NodeClass fields `subnetSelectorTerms`, `securityGroupSelectorTerms`, `role`, `amiSelectorTerms`: [nodeclasses.md L27-L109](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclasses.md#L27-L109) — Karpenter (AWS provider) v1.15.1.

#### R6. NodeClaim `default-x9wxq` (steps 6.10–6.12) — layer bar: metadata (labels, owner, finalizer) / spec (nodeClassRef, requirements, resources) / status (providerID, capacity, allocatable, conditions)
```yaml
apiVersion: karpenter.sh/v1
kind: NodeClaim
metadata:
  name: default-x9wxq
  labels:
    karpenter.sh/nodepool: default
    karpenter.sh/capacity-type: spot
    node.kubernetes.io/instance-type: c5a.2xlarge
    topology.kubernetes.io/zone: us-west-2c
    kubernetes.io/arch: amd64
    karpenter.k8s.aws/instance-family: c5a
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
  expireAfter: 720h
  requirements:
  - key: karpenter.sh/capacity-type
    operator: In
    values: ["spot"]
  - key: node.kubernetes.io/instance-type
    operator: In
    values: ["c5.xlarge", "c5a.xlarge", "c5a.2xlarge", "m5.xlarge"]
  resources:
    requests:
      cpu: 1150m
      pods: "5"
status:
  providerID: aws:///us-west-2c/i-01234567890123
  nodeName: ip-10-0-3-33.us-west-2.compute.internal
  imageID: ami-08946d4d49fc3f27b
  capacity:    { cpu: "8", memory: 15155Mi, pods: "58" }
  allocatable: { cpu: 7910m, memory: 14162Mi, pods: "58" }
  conditions:
  - { type: Launched,    status: "True", reason: Launched }
  - { type: Registered,  status: "True", reason: Registered }
  - { type: Initialized, status: "True", reason: Initialized }
  - { type: Ready,       status: "True", reason: Ready }
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `metadata.name` | `default-x9wxq` | NodePool 이름 prefix + 자동 생성 | E.G. |
| `metadata.labels[karpenter.sh/nodepool]` | `default` | 소유 NodePool (Node에도 sync) | |
| `metadata.labels[karpenter.sh/capacity-type]` | `spot` | spot / on-demand / reserved | E.G. |
| `metadata.labels[node.kubernetes.io/instance-type]` | `c5a.2xlarge` | 실제 선택된 type | E.G. |
| `metadata.ownerReferences` | NodePool `default` | NodePool 삭제 시 cascading 종료 | |
| `metadata.finalizers` | `karpenter.sh/termination` | 정상 drain 후 삭제 보장 | |
| `spec.requirements` | 해석된 최종 요구사항 | launch에 쓴 instance type 목록 등 | E.G. |
| `spec.resources.requests` | cpu 1150m, pods 5 | 이 NodeClaim을 만든 Pod(+DaemonSet) 합 | E.G. |
| `status.providerID` | `aws:///us-west-2c/i-…` | EC2 instance 식별자 | E.G. |
| `status.nodeName` | `ip-10-0-3-33…` | 연결된 Node | E.G. |
| `status.capacity` / `allocatable` | cpu 8 / 7910m, pods 58 | 전체 vs 스케줄 가능 자원 | E.G. |
| `status.conditions` | Launched, Registered, Initialized, Ready (+ Consolidatable, Drifted …) | lifecycle 단계 | |

Sources: [NodeClaims: describe example](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L209-L350), [annotated NodeClaim YAML](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L364-L486), [metadata.labels](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L488-L490), [conditions table](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/nodeclaims.md#L573-L586) — Karpenter (AWS provider) v1.15.1. Values are a mix of the two doc examples; all per-run values are E.G.

#### R7. EC2 `CreateFleet` request built by Karpenter (step 6.11) — layer bar: Type+Context / LaunchTemplateConfigs (spec + Overrides) / TargetCapacitySpecification / Spot|OnDemandOptions / TagSpecifications
```yaml
# Go struct ec2.CreateFleetInput as built by CreateFleetInputBuilder.Build (field names = AWS SDK for Go v2)
Type: instant
LaunchTemplateConfigs:
- LaunchTemplateSpecification:
    LaunchTemplateName: karpenter.k8s.aws/1234567890123456789   # E.G.
    Version: $Latest                                            # unverified
  Overrides:
  - { InstanceType: c5a.2xlarge, SubnetId: subnet-0aaa, ImageId: ami-08946d4d49fc3f27b, AvailabilityZone: us-west-2c }
  - { InstanceType: c5.2xlarge,  SubnetId: subnet-0bbb, ImageId: ami-08946d4d49fc3f27b, AvailabilityZone: us-west-2b }
TargetCapacitySpecification:
  DefaultTargetCapacityType: spot
  TotalTargetCapacity: 1
SpotOptions:
  AllocationStrategy: price-capacity-optimized
TagSpecifications:
- ResourceType: instance    # also fleet, volume, network-interface … (unverified list)
  Tags:
  - { Key: kubernetes.io/cluster/my-cluster, Value: owned }
  - { Key: eks:eks-cluster-name,             Value: my-cluster }
  - { Key: karpenter.sh/nodepool,            Value: default }
  - { Key: karpenter.k8s.aws/ec2nodeclass,   Value: default }
```
| field (real name) | value | meaning | E.G.? |
|---|---|---|---|
| `Type` | `instant` | 동기 호출, 응답에 instance ID 포함 | |
| `Context` | `nodeClass.spec.context` (설정 시) | EC2 Fleet context | E.G. |
| `LaunchTemplateConfigs[].Overrides[].InstanceType` | 후보 type 여러 개 | EC2가 전략에 따라 선택 | E.G. |
| `…Overrides[].SubnetId` / `AvailabilityZone` | subnet / AZ | AZ는 ICE 오류 해석용으로 중복 기입 | E.G. |
| `…Overrides[].ImageId` | AMI | EC2NodeClass `amiSelectorTerms` 결과 | E.G. |
| `…Overrides[].Priority` | offering price | node overlay가 있을 때만 의미 | E.G. |
| `TargetCapacitySpecification.TotalTargetCapacity` | `1` | NodeClaim 하나 = instance 하나 | |
| `TargetCapacitySpecification.DefaultTargetCapacityType` | `spot` / `on-demand` / `reserved-capacity` / `capacity-block` | capacity type | E.G. |
| `SpotOptions.AllocationStrategy` | `price-capacity-optimized` (overlay 시 `capacity-optimized-prioritized`) | spot 선택 전략 | |
| `OnDemandOptions.AllocationStrategy` | `lowest-price` (overlay 시 `prioritized`) | on-demand 선택 전략 | |
| `TagSpecifications` tags | `kubernetes.io/cluster/<c>=owned`, `eks:eks-cluster-name`, `karpenter.sh/nodepool` | IAM 조건이 요구하는 tag | E.G. values |

Sources: [instance/types.go L205-L248](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/pkg/providers/instance/types.go#L205-L248), [instance/instance.go L405-L421](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/pkg/providers/instance/instance.go#L405-L421), [instance/instance.go L586-L597](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/pkg/providers/instance/instance.go#L586-L597), [cloudformation.md L198-L231](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/reference/cloudformation.md#L198-L231), [labels.go tag keys L183-L189](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/pkg/apis/v1/labels.go#L183-L189) — Karpenter (AWS provider) v1.15.1. Launch template naming, `Version`, the full `ResourceType` list, and whether `karpenter.k8s.aws/ec2nodeclass` is in the CreateFleet tags (vs. added later by the tagging controller) are **unverified**.

### Self-check
1. **Q.** 현재 4 replicas, 평균 CPU utilization 90%, target 60%일 때 HPA의 계산값은? 기본 tolerance에서 scaling이 일어나나? **A.** ratio = 90/60 = 1.5 → ceil(4 × 1.5) = 6. 1.5는 0.9–1.1 범위 밖이므로 scale-up한다. 기본 정책 상한은 max(ceil(4×2)=8, 4+4=8) = 8이라 6이 그대로 적용된다.
2. **Q.** HPA가 `<unknown>`/아무 동작도 안 하는 대표 원인 두 가지는? **A.** (1) metrics-server 등 `metrics.k8s.io` 제공자가 없다. (2) target Pod의 container 중 하나라도 `requests.cpu`가 없어 utilization이 정의되지 않는다.
3. **Q.** metrics-server `--metric-resolution`의 기본값은? **A.** 바이너리 기본 60s, 공식 manifest와 Helm chart는 15s를 지정한다. 10s 미만은 거부되고, kubelet 해상도가 15s라 15s 미만은 권장하지 않는다.
4. **Q.** Karpenter와 Cluster Autoscaler가 Node를 늘리기 시작하는 공통 신호는? 그 뒤 차이는? **A.** Pod의 `PodScheduled=False, reason=Unschedulable`. CA는 10초 주기로 node group(ASG)별 template node 시뮬레이션 후 expander(기본 least-waste)로 group을 고르고 `SetDesiredCapacity`를 호출한다. Karpenter는 Pod를 batch(1s idle/10s max)로 모아 NodePool 요구사항과 교집합한 instance type 목록으로 NodeClaim을 만들고 `CreateFleet`(instant, capacity 1)을 직접 호출한다.
5. **Q.** Karpenter가 띄운 Node에 Pending Pod를 배치하는 주체는? **A.** kube-scheduler. Karpenter는 bin-packing을 시뮬레이션해 capacity만 만든다.
6. **Q.** 부하가 사라졌을 때 Pod와 Node가 줄어드는 기본 지연은? **A.** HPA는 300s stabilization window의 최댓값을 따른 뒤 축소한다. Karpenter는 `consolidateAfter` 기본 0s, `WhenEmptyOrUnderutilized`, budget 기본 `nodes: 10%`, PDB를 존중한다. CA는 utilization < 0.5 상태가 10m 지속돼야 하고, scale-up 후 10m은 scale-down 평가를 미룬다.
7. **Q.** EKS에서 HPA sync period를 10s로 줄일 수 있나? **A.** `horizontalPodAutoscalerSyncPeriod`로 `10s`–`15s` 범위에서 가능하지만 Provisioned Control Plane 클러스터에서만 된다. 기본은 15s다.

### Unverified / open (this lesson)
- Exact PostFilter text in the FailedScheduling message (`preemption: 0/2 nodes are available: 2 No preemption victims found for incoming pod.`) and the Event's `reportingController` value — not traced in v1.36.2 source; shown as E.G.
- The `DesiredWithinRange` message string in v1.36.2 (R1) was taken from the docs example, not from source.
- Whether `PodMetrics.window` equals the `--metric-resolution` value, and that `usage.memory` is the working set — not checked against metrics-server source.
- Karpenter `CreateFleet` launch template name format, `Version`, `TagSpecifications.ResourceType` list, and which tags are on the CreateFleet call vs. added later by `nodeclaim/tagging` controller (R7).
- Karpenter core (kubernetes-sigs/karpenter) code for batching and bin-packing was not read; batching facts rest on the AWS provider docs (`settings.md`). Karpenter's docs say pods with "status condition `Unschedulable=True`" ([_index.md L36](https://github.com/aws/karpenter-provider-aws/blob/v1.15.1/website/content/en/docs/concepts/_index.md#L36)); the actual Kubernetes condition is `PodScheduled=False` with `reason: Unschedulable`. The lesson uses the Kubernetes wording.
- Timings in event-log rows (CreateFleet ~3 s, Node registration 40–70 s) are from doc example logs/events, not guarantees; AWS's "in under a minute" claim for Karpenter ([autoscaling.adoc L32](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/clusters/autoscaling.adoc#L32)) is marketing wording; keep durations marked E.G.
- Allocatable CPU of the existing nodes in the scenario (room for exactly 2 more Pods) is invented for the scenario.
- CA FAQ prose says "5 expanders" while its flag table lists `random, most-pods, least-waste, price, priority, grpc` and the prose also lists `least-nodes`; the lesson cites the flag table and default `least-waste` only.
- Node type: `nodeclaim` is a Karpenter CRD object rather than a component; `kind: storage` was chosen as the closest fit (an object stored in etcd). Engine redesign may want a distinct kind for API objects.

## Open questions and facts not verified

Each lesson ends with its own unverified list. This section collects the items that change the plan or need an owner decision.

### Decisions for the owner or the schema redesign

1. **Node kind for AWS services.** EKS API, EC2 API, IMDS, IAM, STS, EKS Auth, ELB/ALB, Route 53 and ENIs fit none of the five kinds. The plan marks them "proposed kind: cloud". Karpenter's `NodeClaim` is an API object, not a component; lesson 6 uses `storage` for it. A separate kind for API objects may be wanted.
2. **More than one state panel per node.** Lesson 4's `netfilter` node needs two panels (nat table and conntrack). If the new schema allows one panel per node, the plan splits conntrack into a `netfilter-ct` node.
3. **Lesson 5 shape.** IRSA and Pod Identity are planned as one 18-step lesson told as a migration. If the engine cannot show two branches, split at step 5.12 into `pod-iam-irsa` and `pod-iam-pod-identity`.
4. **Client-side vs server-side apply.** Lesson 2 uses server-side apply throughout. The default `kubectl apply` is client-side (a `last-applied-configuration` annotation, then POST on create). Should the lesson show the default path instead, or add a branch?
5. **Kubernetes 1.36 vs 1.37.** Upstream has `v1.37.2`, and the pinned EKS guide snapshot (2026-09-16) does not list EKS 1.37. Re-check the EKS version page before turning this plan into lesson data. If EKS 1.37 is out, move the pins to it and re-run the line-anchor check.
6. **AWS Load Balancer Controller pin.** The plan uses v3.6.2, the latest tag. The pinned EKS install guide still walks through v2.14.1. Annotation defaults were checked only at v3.6.2.
7. **Default-heavy facts are upstream defaults.** EKS does not publish its control plane flags. Leader-election timings, node-monitor grace period, the etcd `/registry` prefix, protobuf storage, scheduler plugins and weights, and HPA sync period (except on Provisioned Control Plane) are upstream Kubernetes v1.36.2 defaults. Lesson text should say "upstream 기본값", not "EKS 값".

### Conflicts between official sources

- **IPVS in 1.36.** The pinned EKS guide says IPVS mode "will be removed in Kubernetes 1.36" ([kubernetes-versions-standard.adoc L72](https://github.com/awsdocs/amazon-eks-user-guide/blob/8d43223e0e0dbb6afec4a6c9d6ba5b837b52ebb8/latest/ug/versioning/kubernetes-versions-standard.adoc#L72)). Upstream v1.36.2 still builds the IPVS proxier with a deprecation warning. Whether the EKS 1.36 kube-proxy add-on accepts `mode: ipvs` is unverified. Lesson 4 teaches iptables mode and marks IPVS as deprecated.
- **Node unreachable timeout.** The 1.36 docs say both "40 second default timeout" (`node-status.md` L152) and "`node-monitor-grace-period` (default is 50 seconds)" (L47). The v1.36.2 source sets 50s, so the plan uses 50s.
- **metrics-server resolution.** The built-in `--metric-resolution` default is 60s, while the official manifest and Helm chart pass 15s. Lesson 6 states both.
- **`WARM_PREFIX_TARGET`.** The VPC CNI README says its default is none; the `aws-node` manifest sets `"1"`. Lesson 3 states both.
- **Karpenter "Unschedulable=True".** Karpenter's docs use that wording, but the real Pod condition is `PodScheduled=False, reason: Unschedulable`. Lesson 6 uses the Kubernetes wording.

### Not verifiable from this session

- **AWS service API references** (EC2, STS, EKS Auth, ELB) and **docs.aws.amazon.com** were blocked. EC2/STS/EKS Auth field names come from the generated aws-sdk-go-v2 models instead. ALB-only behavior (`X-Forwarded-For` contents, the deregistration delay default, the `initial` health state, the cross-zone default, the ALB DNS suffix) is left out of the steps.
- **EKS internals with no public source:** the number of scheduler and controller-manager instances, any load balancer in front of the public endpoint, where the managed `pod-identity-webhook` runs, the AWS IAM Authenticator version, how access-entry authorization is wired next to Node and RBAC, the kube-proxy add-on's default mode and `detectLocalMode`, and the containerd version and pause image on AL2023 AMIs.
- **Per-run formats not seen on a live cluster:** the `iptables-save` probability digits and endpoint order, `ip rule` text and AL2023 interface names, the ipamd `/v1/enis` JSON shape, `managedFields` list-key notation, and the FailedScheduling PostFilter text. Records show them as E.G.
- **Instance facts:** the m5.large vCPU count, and managed node group max-Pods behavior at exactly 30 vCPUs. The prefix-delegation max-Pods value (432 for m5.large) is computed, not quoted.
- **Durations:** no event-log duration is sourced except "ENI attach up to 10 s", ipamd's 5 s pool check, and doc-example log timings in lesson 6. All others are E.G. or left out.
- **Pod Identity details:** credential lifetime from EKS Auth, the association ID format, the trust-policy `Condition` example, the exact node-role action spelling, and whether the Pod Identity token `iss` equals the IRSA OIDC issuer.

### Next steps after the schema redesign

1. Re-check the EKS supported versions; re-pin if EKS 1.37 is out.
2. Map this plan's fields to the new schema: nodes, layers, state panels, steps, event-log rows, records, self-check.
3. Re-run the line-anchor check (every `blob` URL resolves and its range fits; 555 URLs passed on 2026-11-03), then read each range against the fact it supports.

