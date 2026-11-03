---
status: accepted
date: 2026-11-04
---

# 0013. Shared schema rules, record formats, icons, and the `cloud` node kind

## Context

Decision 0010 puts shared engine work before the four topic sessions (MySQL InnoDB, Kafka, Redis, EKS). Their plans in `docs/research/` showed four gaps:

- `move` steps carried state changes, and `mutate` steps targeted nodes with no state view.
- Decoder records were listed apart from the steps that show them.
- Many records are binary (InnoDB page headers, Kafka requests) or not bytes at all (Kubernetes objects, CLI output). The schema only handled text.
- The icon set covered only Spring nodes.

The EKS plan also proposed a `cloud` node kind for AWS-managed services.

## Decision

- **Rules**, enforced by `validate.ts` and the schema test:
  - unknown keys at the lesson, step, record, and field level are errors, so a state change on a move or a lesson-level record list cannot slip in;
  - a mutate gives a state-bearing node's whole view, with the same columns, and must change it;
  - every listed node is used by a step.
- **Records**: three formats.
  - `text` (`wire: true`) keeps the `raw` text and its field `span`s.
  - `binary` (`wire: true`) uses `hex` bytes and field `offset`/`length`; the decoder shows a hex dump.
  - `fields` (`wire: false`) has no raw data, and the decoder shows a field table.
- **Decoder**: a step without a record cannot be decoded. Its event-log row seeks to the step, and decoder navigation skips it. This removes the filler "이 단계의 사실" rows.
- **Icons**: 44 `IconKind`s, mapped to the plans' nodes in `docs/DESIGN.md` (Icons), with a dev-only gallery at `gallery.html`.
- **Node kind `cloud`**: a managed cloud service the team does not run (EKS API, STS, EC2 API, IMDS, ALB, IAM).

## Reason

- Unknown-key checks turn the review's structural findings into test failures.
- Byte offsets are the natural key for binary formats; text spans are easier to write for text.
- `cloud` is needed because none of the five existing kinds says "run by the provider, not by us". `container` means a runtime we host, and `framework` means infrastructure inside our process. That distinction matters in incidents: who can fix it, and where its limits are set.
- Only one kind was added. The proposed `controller` kind is already covered by `framework` (KRaft controller, kube-controller-manager).

## Alternatives

- Byte offsets for text records too — exact, but authors would count CRLFs by hand.
- Draw AWS services as `framework` — hides whether the team or the provider operates the component.
- Let each topic session add its own icons — conflicts in `src/scene/icons.ts` (decision 0010).
