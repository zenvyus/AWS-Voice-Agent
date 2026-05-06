# Instructions and Guardrails

**Purpose:** Mandatory practices for development, deployment, and testing.
**Status:** Standing instructions. Treat as binding unless explicitly overridden in writing.

---

## 1. Core Principles

These principles are non-negotiable. Every decision below flows from them.

1. **Infrastructure is code.** No environment, resource, or configuration is created by clicking in a console. If it isn't in the IaC repo, it doesn't exist.
2. **Documentation precedes code.** No development starts on a phase until its PRD, user stories with acceptance criteria, and technical implementation document are written, reviewed, and approved.
3. **Phased delivery.** Work ships in small, ordered increments. Each phase has a defined scope, an exit gate, and its own tests.
4. **Tests gate every promotion.** Code does not move from local → test branch → main without passing the tests required at each gate.
5. **Regression coverage only grows.** Every phase appends to the end-to-end suite. Tests are not deleted to make builds green.
6. **Reproducibility over speed.** A second engineer must be able to stand up an identical environment from the repo alone, with no tribal knowledge.

---

## 2. Infrastructure as Code (IaC)

### 2.1 Hard Rules

- **No UI interaction with AWS is permitted** for creating, modifying, or deleting resources. Read-only console use (viewing logs, metrics, CloudWatch dashboards) is allowed.
- All AWS resources must be defined in the IaC repository.
- IAM roles, policies, secrets references (not values), networking, compute, storage, queues, state machines, and observability resources are all in scope.
- Manual changes detected via drift detection must be reverted or codified within one business day.

### 2.2 Tooling

- **Primary IaC framework:** AWS CDK v2 (TypeScript).
- **Package manager:** Match the monorepo standard (e.g., pnpm + Turborepo).
- **Local synth target:** `cdk synth` must succeed cleanly with zero warnings before any deploy.
- **Diff before deploy:** `cdk diff` is mandatory before every `cdk deploy`. The diff is reviewed, not skimmed.

### 2.3 Reusability Requirements

The IaC must be structured so that spinning up a new environment (dev, test, staging, prod, or a per-developer ephemeral stack) is a single command with a single argument.

**Required structure:**

```
infra/
  bin/
    app.ts                 # CDK entry point, reads env config
  lib/
    constructs/            # Reusable L3 constructs (one concern each)
    stacks/                # Composed stacks per logical boundary
    config/
      env.dev.ts
      env.test.ts
      env.staging.ts
      env.prod.ts
      schema.ts            # Zod or equivalent schema validating every env config
  test/
    snapshot/              # CDK template snapshots
    unit/                  # Construct-level unit tests
```

**Construct rules:**

- Every construct accepts a typed `props` interface. No untyped `any`.
- No hardcoded account IDs, region strings, ARNs, or environment names inside constructs.
- All environment-specific values flow from the config files, validated by schema at synth time.
- Constructs are composable: a stack is built from constructs, never inlined.
- Each construct is independently unit-tested.

### 2.4 Environment Promotion

| Environment | Purpose                             | Who deploys                 | Trigger                               |
| ----------- | ----------------------------------- | --------------------------- | ------------------------------------- |
| `dev`       | Active development, may be unstable | Any engineer                | Manual from feature branch            |
| `test`      | Integration & regression validation | CI only                     | Push to `test` branch                 |
| `staging`   | Pre-prod mirror of prod             | CI only                     | Tagged release candidate              |
| `prod`      | Production                          | CI only, with approval gate | Tagged release after staging sign-off |

A new environment is created by adding one config file and running one deploy command. Nothing else.

### 2.5 Secrets and Configuration

- Secrets live in AWS Secrets Manager or Parameter Store, referenced by ARN in IaC.
- No secret values, API keys, or credentials in source control. Pre-commit hooks must scan for them (e.g., `gitleaks`).
- Configuration that is not secret but varies per environment lives in the typed env config files.

---

## 3. Pre-Development Documentation

No development begins on a phase until three documents exist, are reviewed, and are approved: the **PRD**, the **User Stories with Acceptance Criteria**, and the **Technical Implementation Document (TID)**. A phase that lacks any of these is not eligible for development.

### 3.1 Documentation Repository Structure

All phase documentation is version-controlled and lives in the repository under a strict, predictable layout:

```
docs/
  phases/
    phase-01-<slug>/
      00-phase-summary.md         # Executive summary, status, links
      01-prd.md                   # Product Requirements Document
      02-user-stories.md          # Stories + acceptance criteria
      03-tid.md                   # Technical Implementation Document
      04-test-plan.md             # Test plan (links to suites)
      05-exit-gate.md             # Exit gate checklist (filled in at end)
      decisions/
        ADR-001-<slug>.md         # Architecture Decision Records
        ADR-002-<slug>.md
      diagrams/
        architecture.png
        sequence.png
        ...
    phase-02-<slug>/
      ...
  templates/
    prd.template.md
    user-stories.template.md
    tid.template.md
    adr.template.md
  glossary.md                     # Shared domain terms
  index.md                        # Master index of all phases
```

**Storage rules:**

- Documentation is a first-class citizen of the repo. It lives next to code, not in a separate wiki, Confluence space, or shared drive.
- File names are kebab-case, numerically prefixed for ordering, and never renamed once published — links must remain stable.
- Diagrams are stored as both source (e.g., `.drawio`, `.mermaid`, `.excalidraw`) and rendered output (`.png` or `.svg`). The source is the source of truth.
- `/docs/index.md` lists every phase with its status (Draft, Approved, In Development, Complete) and links to its folder.
- Documents are reviewed via pull request, the same as code. No edits land without review.

### 3.2 Document 1 — Product Requirements Document (PRD)

**Purpose:** Define _what_ is being built and _why_, in business and user terms. The PRD answers product questions, not engineering ones.

**Required sections:**

```
# Phase NN PRD: <Title>

## 1. Overview
One paragraph: what this phase delivers and the problem it solves.

## 2. Background and Context
Why now. What preceded this phase. Links to relevant prior phases or research.

## 3. Goals and Non-Goals
- Goals: bulleted, measurable.
- Non-Goals: explicit list of what this phase will NOT do.

## 4. Target Users and Personas
Who uses this. Reference shared persona docs if applicable.

## 5. User Problems and Jobs-to-be-Done
The specific problems this phase solves, framed from the user's perspective.

## 6. Success Metrics
Quantitative measures of success. How we will know this phase worked.
- Leading indicators
- Lagging indicators
- Target values and measurement method

## 7. Scope
- In scope: bulleted features and capabilities.
- Out of scope: explicit exclusions.

## 8. Constraints and Assumptions
Regulatory, technical, time, budget, dependency assumptions.

## 9. Dependencies
Other phases, teams, vendors, or external systems this phase depends on.

## 10. Risks and Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|

## 11. Open Questions
Questions that must be resolved before development starts. Each has an owner and a due date.

## 12. Approvals
| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | | | |
| Engineering Lead | | | |
| Stakeholder (if applicable) | | | |
```

**PRD rules:**

- Written by or with the Product Owner.
- Approved before user stories are written.
- No technical implementation detail. If it describes _how_, it belongs in the TID.
- Open questions must be closed before approval. An "Open Questions" section with unresolved items blocks approval.

### 3.3 Document 2 — User Stories and Acceptance Criteria

**Purpose:** Translate the PRD into discrete, testable units of user-facing value. Each story is independently verifiable and traces back to a PRD goal.

**Story format:**

```
## Story NN.M: <Short Title>

**As a** <persona>
**I want** <capability>
**So that** <outcome / business value>

### Acceptance Criteria

Written in Given/When/Then (Gherkin) format.

**AC1: <Title>**
- **Given** <precondition>
- **When** <action>
- **Then** <observable outcome>
- **And** <additional assertion>

**AC2: <Title>**
- **Given** ...
- **When** ...
- **Then** ...

### Definition of Done
- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability
- Maps to PRD section: <e.g., Goals 3.1, 3.2>
- Linked test cases: <e.g., e2e/phase-NN/story-NN-M.spec.ts>
- ADRs referenced: <e.g., ADR-003>

### Estimates
- Complexity: S / M / L / XL
- Confidence: High / Medium / Low
```

**User story rules:**

- Each story is **INVEST-compliant**: Independent, Negotiable, Valuable, Estimable, Small, Testable.
- Acceptance criteria are written in **Given/When/Then** format. Free-form prose criteria are not accepted.
- Every acceptance criterion must be automatable. Criteria that require human judgment must be flagged and justified.
- Every story has at least one acceptance criterion for the **happy path**, one for an **error path**, and one for a **boundary or edge case**.
- Stories are numbered `<phase>.<story>` (e.g., 3.1, 3.2, 3.3) and never renumbered after approval.
- A story without acceptance criteria is not a story. It does not enter the backlog.

### 3.4 Document 3 — Technical Implementation Document (TID)

**Purpose:** Define _how_ the phase will be built. The TID is the engineering counterpart to the PRD and is the primary reference during implementation.

**Required sections:**

```
# Phase NN TID: <Title>

## 1. Summary
One paragraph technical summary of what is being built.

## 2. Architecture Overview
- High-level diagram (component, deployment, or sequence as appropriate).
- Description of major components introduced or modified.
- How this fits into the broader system.

## 3. Detailed Design

### 3.1 Components
For each new or modified component:
- Responsibility
- Inputs and outputs
- Interfaces (API contracts, event schemas, message formats)
- Dependencies

### 3.2 Data Model
- New tables, collections, or schemas
- Migrations required (additive, then cleanup if destructive)
- Data retention and PII handling

### 3.3 APIs and Contracts
- Endpoints (path, method, request/response schemas)
- Event schemas (producer, consumer, payload, versioning)
- Idempotency, ordering, retry, and failure semantics

### 3.4 Infrastructure (IaC)
- New constructs and stacks introduced
- Resources created (Lambdas, queues, tables, state machines, etc.)
- IAM roles and least-privilege scopes
- Configuration values and where they live

### 3.5 Security
- AuthN / AuthZ approach
- Secrets handling
- Threat model summary (STRIDE or equivalent for new attack surface)
- Data classification and protection

### 3.6 Observability
- Logs (what, level, correlation strategy)
- Metrics (names, units, dimensions)
- Traces (spans, propagation)
- Alarms (condition, severity, runbook link)

### 3.7 Performance and Scale
- Expected load (peak, average, growth)
- Latency and throughput targets
- Bottlenecks and mitigations
- Cost estimate

### 3.8 Failure Modes and Recovery
- Known failure modes
- Detection approach
- Recovery procedure
- Rollback plan

## 4. Alternatives Considered
For each significant decision, document the options weighed and why the chosen path won. Link to or include ADRs.

## 5. Test Strategy
- Unit test approach and key cases
- Integration test approach and boundary mocks
- E2E test approach and scenarios
- Performance / load test plan if applicable
- Mapping from acceptance criteria to test cases

## 6. Migration and Rollout
- Deploy order
- Feature flags
- Backfills or data migrations
- Backward compatibility windows

## 7. Dependencies and Sequencing
What must land before this phase. What this phase enables.

## 8. Story-to-Implementation Mapping
| Story ID | Components Touched | Tests Added | Owner |
|----------|--------------------|-----------  |-------|

## 9. Open Technical Questions
Must be resolved before development starts.

## 10. Approvals
| Role | Name | Date | Status |
|------|------|------|--------|
| Engineering Lead | | | |
| Architect / Tech Lead | | | |
| Security Reviewer | | | |
| SRE / Ops Reviewer (if applicable) | | | |
```

**TID rules:**

- Written by the engineering lead or a senior engineer assigned to the phase.
- Approved by an architect or tech lead before development starts.
- Every architectural decision either appears inline with rationale or links to an ADR. Decisions without recorded rationale are rejected at review.
- The TID is **kept current** during development. If implementation diverges from the TID, the TID is updated in the same PR or a follow-up PR linked from the implementation PR.
- A stale TID is treated as a defect.

### 3.5 Architecture Decision Records (ADRs)

Significant or non-obvious technical decisions are captured as ADRs in `/docs/phases/phase-NN-<slug>/decisions/`.

**ADR template:**

```
# ADR-NNN: <Decision Title>

## Status
Proposed | Accepted | Superseded by ADR-XXX | Deprecated

## Context
The forces at play. Why a decision is needed.

## Decision
The choice made, stated clearly.

## Consequences
Positive, negative, and neutral consequences. What becomes easier. What becomes harder.

## Alternatives Considered
Each alternative, with reasons it was not chosen.

## References
Links to related ADRs, PRDs, TIDs, external sources.
```

ADRs are immutable once accepted. A decision is changed by writing a new ADR that supersedes the old one.

### 3.6 Documentation Approval Workflow

```
Draft PRD ──► PRD Review ──► PRD Approved
                                  │
                                  ▼
                  Draft User Stories ──► Stories Review ──► Stories Approved
                                                                  │
                                                                  ▼
                                                  Draft TID ──► TID Review ──► TID Approved
                                                                                       │
                                                                                       ▼
                                                                          Development may begin
```

- Each document is reviewed via pull request into the phase folder.
- Reviewers are recorded in the approval table inside each document.
- A document moves to "Approved" status only when all required approvers have signed off in the PR.
- The phase's `00-phase-summary.md` tracks the status of each document and is updated as approvals land.

### 3.7 Documentation Quality Standards

- **Clarity over volume.** A short, precise document beats a long, vague one.
- **No copy-paste from prior phases.** Reused content is linked, not duplicated.
- **Every claim is verifiable.** Numbers, SLAs, and assumptions cite a source or are flagged as estimates.
- **Diagrams over walls of text** for architecture, flows, and state machines.
- **Plain language** for the PRD; precise technical language for the TID.
- **Linked, not lost.** Stories link to PRD sections; TID sections link to stories; tests link to acceptance criteria. Traceability is enforced at review.

---

## 4. Phased Development and Deployment

### 4.1 Phase Definition

A phase is a unit of work with:

- **Approved documentation set** (PRD + User Stories + TID) — required before work starts.
- **Scoped deliverable** — one capability or vertical slice, not a grab-bag.
- **Acceptance criteria** — defined in the user stories document, in Given/When/Then format.
- **Test plan** — unit, integration, and end-to-end tests defined up front, mapped to acceptance criteria.
- **Exit gate** — all tests pass on the test branch; documentation is updated; regression suite is extended.

Phases are numbered (Phase 1, Phase 2, …) and tracked in `/docs/phases/`. Each phase has its own folder containing the documentation set defined in Section 3.

### 4.2 Phase Rules

- **No development before documentation approval.** PRD, user stories, and TID must be approved before any feature branch is opened.
- **One phase at a time per workstream.** No starting Phase N+1 until Phase N has cleared its exit gate.
- **No scope creep mid-phase.** New work spawns a new phase or a backlog item, never an expansion of the current one. Changes to scope require updating the PRD via a reviewed PR.
- **Each phase ships independently deployable code.** A phase may be feature-flagged off in production, but it must be deployable.
- **Each phase appends to the regression suite.** Removing a test from the suite requires a documented justification and reviewer sign-off.

### 4.3 Phase Lifecycle

```
1. Phase proposed       → /docs/phases/phase-NN-<slug>/00-phase-summary.md created
2. PRD drafted          → 01-prd.md
3. PRD approved
4. User stories drafted → 02-user-stories.md
5. User stories approved
6. TID drafted          → 03-tid.md
7. TID approved
8. Test plan finalized  → 04-test-plan.md
9. Development begins   → feature branches opened
10. Implementation, testing, review (per Sections 6–8)
11. Exit gate completed → 05-exit-gate.md filled and signed off
12. Phase marked Complete in /docs/index.md
```

### 4.4 Phase Summary Document

Each phase has `00-phase-summary.md` that serves as the entry point:

```
# Phase NN: <Title>

## Status
Draft | Documentation In Review | Approved for Development | In Development | In Test | Complete

## Documents
- [PRD](./01-prd.md) — Status: ...
- [User Stories](./02-user-stories.md) — Status: ...
- [TID](./03-tid.md) — Status: ...
- [Test Plan](./04-test-plan.md) — Status: ...
- [Exit Gate](./05-exit-gate.md) — Status: ...

## Timeline
- Documentation start: <date>
- Documentation approved: <date>
- Development start: <date>
- Test branch: <date>
- Merged to main: <date>
- Production deploy: <date>

## Key Decisions
Links to ADRs.

## Outcome
Filled in at phase close. Did the phase meet its success metrics? What was learned?
```

---

## 5. Testing Strategy

### 4.1 Test Pyramid

| Layer            | Scope                                              | Speed              | Where it runs                                        |
| ---------------- | -------------------------------------------------- | ------------------ | ---------------------------------------------------- |
| Unit             | Single function, class, or construct               | Milliseconds       | Local + CI                                           |
| Integration      | Multiple units, real or mocked external services   | Seconds            | Local + CI                                           |
| End-to-end (E2E) | Full vertical slice across the deployed system     | Seconds to minutes | CI on `test` branch and beyond                       |
| Regression       | Cumulative E2E suite covering all completed phases | Minutes            | CI on `test` branch and before every merge to `main` |

### 4.2 Hard Rules

1. **All tests must pass locally before pushing to the `test` branch.** No exceptions. A failing or skipped test is a blocker.
2. **The full regression suite must pass on the `test` branch before merging to `main`.** Merge protection rules in GitHub enforce this.
3. **Every phase contributes new tests.** A phase with no new tests is presumed incomplete and is rejected at review.
4. **Tests are deterministic.** Flaky tests are quarantined and fixed within one business day, not retried into submission.
5. **Tests do not depend on prod data or shared mutable state.** Each test seeds and cleans its own fixtures.
6. **No commenting out tests to ship.** If a test is wrong, fix the test in a reviewed commit. If a test is obsolete, delete it with justification in the PR description.

### 4.3 End-to-End Suite Structure

```
tests/
  unit/
  integration/
  e2e/
    phase-01-<slug>/
    phase-02-<slug>/
    phase-03-<slug>/
    ...
    regression.suite.ts     # Imports and runs all phase suites in order
  fixtures/
  helpers/
```

- Each phase folder contains the E2E tests added during that phase.
- `regression.suite.ts` imports every phase folder. Adding a phase means adding one import line.
- A phase's tests must be runnable in isolation (`pnpm test:e2e phase-03`) and as part of the full regression run (`pnpm test:regression`).

### 4.4 Test Commands (Standard)

| Command                 | Runs                                     |
| ----------------------- | ---------------------------------------- |
| `pnpm test`             | Unit tests only                          |
| `pnpm test:integration` | Integration tests                        |
| `pnpm test:e2e`         | Full E2E suite against `dev` env         |
| `pnpm test:regression`  | Full regression suite against `test` env |
| `pnpm test:phase <NN>`  | Only the named phase's E2E tests         |
| `pnpm test:all`         | Unit + integration + E2E                 |

These names are mandatory. Scripts in every package use the same vocabulary.

### 4.5 Coverage Thresholds

- **Unit:** ≥ 80% line coverage for application code; ≥ 90% for critical paths (auth, billing, data integrity, risk enforcement).
- **Integration:** Every external boundary (DB, queue, third-party API) has at least one happy-path and one failure-path test.
- **E2E:** Every acceptance criterion in every phase has at least one E2E test that exercises it.

Coverage is enforced in CI. Drops below threshold fail the build.

---

## 6. Branching and Promotion Workflow

### 5.1 Branch Topology

```
main          ← protected, deployable to prod
  ↑
test          ← protected, deployable to test env, full regression runs here
  ↑
feature/*     ← short-lived, one per phase or sub-task
```

### 5.2 Promotion Gates

**Gate 1 — Local → `test` branch (push from `feature/*` → PR into `test`):**

- All unit tests pass locally.
- All integration tests pass locally.
- All E2E tests for the affected phase pass locally against `dev`.
- `cdk diff` reviewed.
- Linter, formatter, type-checker clean.
- Pre-commit hooks pass (secret scan, format).

**Gate 2 — `test` branch → `main` (PR from `test` → `main`):**

- CI runs full regression suite against the `test` environment. Must pass.
- CI runs `cdk synth` and `cdk diff` against `staging` config. Must be reviewed.
- At least one reviewer approval.
- No open `Changes requested` reviews.
- Phase exit gate checklist complete.

**Gate 3 — `main` → production:**

- Tagged release.
- Staging deploy succeeds and smoke tests pass.
- Manual approval in CI.
- Rollback plan documented in the release notes.

### 5.3 Branch Protection (GitHub)

The following must be enforced via repository settings:

- `main` and `test` require pull requests; no direct pushes.
- `main` requires status checks: `unit`, `integration`, `e2e`, `regression`, `cdk-diff`, `lint`.
- `test` requires status checks: `unit`, `integration`, `e2e`, `lint`.
- Stale reviews dismissed on new commits.
- Force-push disabled on protected branches.
- Linear history required on `main`.

---

## 7. CI/CD Pipeline Requirements

### 6.1 Pipeline Stages (in order)

1. **Lint & format check** — fail fast on style violations.
2. **Type check** — `tsc --noEmit` or equivalent.
3. **Unit tests** — must pass.
4. **Build** — produce deployable artifacts.
5. **CDK synth** — validate IaC compiles.
6. **CDK diff** — surface infrastructure changes for review.
7. **Integration tests** — against ephemeral or `dev` resources.
8. **Deploy to target env** (only on `test`, `staging`, or tagged main).
9. **E2E / regression tests** — against the freshly deployed environment.
10. **Smoke tests** — minimal post-deploy sanity check.

### 6.2 Pipeline Rules

- Any stage failure halts the pipeline. No `continue-on-error` on test stages.
- Pipeline definitions live in the repo (`.github/workflows/`).
- No manual steps inside the pipeline except explicit production approval gates.
- Build artifacts are versioned and immutable. The same artifact deployed to `test` is the one promoted to `staging` and `prod`.

---

## 8. Code Review Requirements

A PR is not mergeable until the reviewer has confirmed:

- [ ] PRD, user stories, and TID for the phase are approved and current.
- [ ] Implementation matches the TID; deviations are documented (TID updated or ADR added).
- [ ] Every changed acceptance criterion has a corresponding test that exercises it.
- [ ] The phase summary document is updated.
- [ ] New tests exist and are meaningful (not assertion-free smoke).
- [ ] Regression suite includes the new phase's tests.
- [ ] IaC changes are reviewed via `cdk diff`.
- [ ] No secrets, no hardcoded environment values.
- [ ] No commented-out or skipped tests without written justification.
- [ ] Documentation reflects the change.

Reviewers reject PRs that fail any of these rather than approving with comments.

---

## 9. Observability and Operational Readiness

Each phase that adds runtime behavior must also add:

- **Structured logs** at function boundaries (correlation ID, phase ID, environment).
- **Metrics** for the new capability (count, latency, error rate at minimum).
- **Alarms** for the failure modes the phase introduces.
- **Runbook entry** at `/docs/runbooks/` describing how to diagnose and recover.

A phase without observability is incomplete and does not pass its exit gate.

---

## 10. Rollback and Recovery

- Every deploy must be revertible by redeploying the previous artifact.
- Stateful changes (DB migrations, schema changes) must be backward-compatible for at least one release. Destructive migrations are split across two phases: additive-then-cleanup.
- Rollback procedure is tested at least once per quarter on the staging environment.

---

## 11. Exceptions

Any deviation from this document requires:

1. A written justification in the PR or phase document.
2. Explicit approval from a designated reviewer.
3. A follow-up issue to remove the exception within a defined timeframe.

Exceptions are not precedents. The next similar case is evaluated independently.

---

## 12. Summary Checklist (Per Phase)

Use this as the final gate before marking a phase complete:

**Before development:**

- [ ] PRD drafted, reviewed, and approved
- [ ] User stories with Given/When/Then acceptance criteria drafted, reviewed, and approved
- [ ] Technical Implementation Document drafted, reviewed, and approved
- [ ] All ADRs for significant decisions written and accepted
- [ ] Test plan derived from acceptance criteria and recorded in `04-test-plan.md`
- [ ] Phase summary document (`00-phase-summary.md`) created and status set to "Approved for Development"

**During development:**

- [ ] All code is in IaC; no console clicks
- [ ] IaC is reusable (new env = one config file + one command)
- [ ] Unit, integration, and E2E tests added for this phase
- [ ] Each acceptance criterion is mapped to at least one automated test
- [ ] All tests pass locally
- [ ] TID kept in sync with implementation

**Before merge to `main`:**

- [ ] Pushed to `test` branch; full regression passes on `test`
- [ ] PR opened from `test` to `main`; CI green; reviewer approved
- [ ] Observability (logs, metrics, alarms, runbook) added
- [ ] Phase documentation set updated (PRD, stories, TID still reflect what shipped)
- [ ] Regression suite imports the new phase's tests
- [ ] Exit gate document (`05-exit-gate.md`) filled in and signed off
- [ ] Phase status updated to "Complete" in `/docs/index.md`

If any box is unchecked, the phase is not done.
