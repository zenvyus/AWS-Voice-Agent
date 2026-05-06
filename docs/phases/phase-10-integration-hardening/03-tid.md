# Phase 10 TID: Integration Testing & Hardening

## 1. Summary

This phase adds cross-stack integration tests, contract validators, a load testing harness, latency-budget assertions, and failure-injection tests. No new infrastructure is created — this is purely a testing/validation phase that exercises and validates existing deployed resources.

## 2. Architecture Overview

No new AWS resources. All additions are test code, test harnesses, and CI pipeline enhancements.

```
┌─────────────────────────────────────────────────┐
│             Test Environment (dev)               │
├─────────────────────────────────────────────────┤
│  Integration Tests (Jest + AWS SDK)             │
│  Contract Tests (Jest + Zod schemas)            │
│  Load Tests (k6 scripts)                        │
│  Failure Injection (AWS SDK: ECS, Lambda, DDB)  │
│  Latency Validation (Jest + CloudWatch)         │
└─────────────────────────────────────────────────┘
```

## 3. Detailed Design

### 3.1 Components

| Component                     | Purpose                                  | Location                                                        |
| ----------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| Cross-stack integration tests | Validate call flow across stacks         | `infra/test/integration/phase-10-integration/`                  |
| Contract validators           | Schema validation for inter-service data | `infra/test/unit/contracts.test.ts`                             |
| Load test harness             | k6 script for sustained load             | `infra/test/load/load-test.js`                                  |
| Latency tests                 | P95 assertions                           | `infra/test/e2e/phase-10-integration/latency.test.ts`           |
| Failure injection tests       | Alarm validation under failure           | `infra/test/e2e/phase-10-integration/failure-injection.test.ts` |

### 3.2 Data Model

No new data models. Contract tests validate existing schemas:

- **Session record schema:** contactId (string, required), startTime (ISO 8601), status (enum), ttl (number)
- **Transcript object metadata:** contactId, timestamp, format (json|text)
- **Agent tools response:** matches `infra/lib/constructs/agent-tools-lambda/api-schema.json`

### 3.3 APIs and Contracts

No new APIs. Contract tests validate:

1. Session-bootstrap Lambda → DynamoDB PutItem shape
2. Orchestrator → S3 PutObject metadata
3. Agent-tools Lambda response → OpenAPI schema compliance
4. Noise monitor Step Functions → state input/output shapes

### 3.4 Infrastructure (IaC)

No new infrastructure. Existing resources are exercised:

- Lambda functions (session-bootstrap, agent-tools, speech-quality-gate)
- DynamoDB tables (sessions, utterance-queue, noise-counters)
- S3 buckets (transcripts, assets)
- ECS service (orchestrator)
- Bedrock agent + knowledge base
- CloudWatch alarms + composite alarm

### 3.5 Security

- Load tests use the same IAM role as E2E tests (OIDC deploy role)
- Failure injection requires `ecs:StopTask` and `lambda:PutFunctionConcurrency` — already granted by admin policy on deploy role
- No new secrets or credentials
- Tests never write to production resources

### 3.6 Observability

- Load test results exported as JSON artifact in CI
- Latency tests log P50/P95/P99 to stdout for CI visibility
- Failure injection tests validate alarm transitions (confirming observability works)

### 3.7 Failure Modes

| Failure                               | Detection             | Response                     |
| ------------------------------------- | --------------------- | ---------------------------- |
| Load test exceeds error threshold     | k6 threshold check    | Test fails, report generated |
| Failure injection doesn't recover     | Test timeout (10 min) | Force-restore in teardown    |
| Flaky tests from eventual consistency | Retry with backoff    | Max 3 retries, then fail     |

### 3.8 Alternatives Considered

| Alternative                   | Decision | Reason                                               |
| ----------------------------- | -------- | ---------------------------------------------------- |
| AWS FIS for failure injection | Rejected | Overkill for current scale; direct SDK calls simpler |
| Locust instead of k6          | Rejected | k6 has better CI integration and JS ecosystem fit    |
| Pact for contract testing     | Rejected | Zod schemas are simpler; no cross-team contracts     |

## 4. Test Strategy

| Test Type                | Count | Run Where  | Duration |
| ------------------------ | ----- | ---------- | -------- |
| Contract tests (unit)    | ~6    | Local + CI | < 5 s    |
| Cross-stack integration  | ~5    | Test env   | < 60 s   |
| Latency validation (E2E) | ~3    | Test env   | < 30 s   |
| Failure injection (E2E)  | ~3    | Test env   | < 15 min |
| Load test                | 1     | Test env   | 5 min    |

**Commands:**

```bash
pnpm test                           # Unit + contract tests
pnpm test:integration               # Cross-stack integration
pnpm test:e2e                       # All E2E including latency
pnpm test:load                      # Load test (k6)
pnpm test:phase 10                  # All Phase 10 tests
pnpm test:regression                # Full regression suite
```

## 5. Runbook

No new runtime components. Failure injection tests serve as alarm validation procedures and are referenced from the Phase 7 and Phase 9 runbooks.
