# Phase 07 TID: Observability & Dashboards

## 1. Summary

This phase introduces a centralized Observability stack deployed per environment, containing a CloudWatch dashboard, structured logging utility, composite alarm, per-Lambda error alarms, SNS notification topic, and runbook documentation. The stack imports ARNs from existing phases and creates read-only observability resources.

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                   CloudWatch Dashboard                     │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐ │
│  │ Lambda  │ │ StepFn   │ │ Fargate │ │ Custom Biz   │ │
│  │ Widgets │ │ Widgets  │ │ Widgets │ │ Metrics      │ │
│  └─────────┘ └──────────┘ └─────────┘ └──────────────┘ │
└──────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│                   Alarm Architecture                       │
│                                                           │
│  ┌────────────────────┐                                  │
│  │ Composite Alarm    │◄── system-health                 │
│  │   (OR logic)       │                                  │
│  └────────┬───────────┘                                  │
│           │                                              │
│     ┌─────┼─────────────────┐                           │
│     ▼     ▼                 ▼                           │
│  ┌──────┐ ┌──────────┐ ┌──────────┐                    │
│  │Noise │ │Lambda Err│ │Lambda Err│  ...                │
│  │Reject│ │ Gate     │ │ Tools    │                     │
│  └──────┘ └──────────┘ └──────────┘                    │
│           │                                              │
│           ▼                                              │
│  ┌─────────────────────┐                                │
│  │ SNS Topic           │──► Email/SMS (manual sub)      │
│  │ airline-voice-agent- │                                │
│  │ {env}-alarms        │                                │
│  └─────────────────────┘                                │
└──────────────────────────────────────────────────────────┘
```

### Components

| Component              | Type                 | Purpose                      |
| ---------------------- | -------------------- | ---------------------------- |
| ObservabilityDashboard | CloudWatch Dashboard | Unified system view          |
| SystemHealthAlarm      | Composite Alarm      | Aggregated health signal     |
| LambdaErrorAlarms      | CloudWatch Alarms    | Per-function error detection |
| AlarmTopic             | SNS Topic            | Notification delivery        |
| StructuredLogger       | Python utility       | Consistent log format        |

## 3. Detailed Design

### 3.1 Components

#### ObservabilityDashboard Construct

- **Responsibility:** Create a CloudWatch dashboard with widgets for all deployed services
- **Inputs:** Function names, state machine names, ECS service/cluster names, DynamoDB table names, custom metric namespace
- **Outputs:** Dashboard ARN
- **Dependencies:** Imports ARNs/names from Phases 2–6 stacks via cross-stack exports or SSM parameters

#### AlarmConstruct

- **Responsibility:** Create per-Lambda error alarms, composite alarm, and SNS topic
- **Inputs:** List of Lambda function names, existing alarm ARNs to include in composite
- **Outputs:** Composite alarm ARN, SNS topic ARN
- **Dependencies:** Existing alarms from Phase 6

#### StructuredLogger (Python utility)

- **Responsibility:** Provide a logging utility that all Python Lambdas import
- **Inputs:** Event (for correlationId extraction), service name
- **Outputs:** JSON-formatted log entries to stdout
- **Dependencies:** None (pure Python, no external packages)

### 3.2 Data Model

No new tables or data stores. This phase is read-only on existing infrastructure.

### 3.3 APIs and Contracts

No new APIs. The structured logger is a utility module, not a service.

**Structured Log Schema:**

```json
{
  "timestamp": "2026-05-06T18:00:00.000Z",
  "level": "INFO|WARN|ERROR",
  "correlationId": "uuid-v4",
  "service": "speech-quality-gate",
  "message": "Gate 1 passed: minimum length check",
  "metadata": {},
  "stackTrace": "optional, only on ERROR"
}
```

### 3.4 Infrastructure (IaC)

**New constructs:**

| Construct                | File                                              | Resources                             |
| ------------------------ | ------------------------------------------------- | ------------------------------------- |
| `ObservabilityDashboard` | `infra/lib/constructs/observability-dashboard.ts` | CW Dashboard                          |
| `ObservabilityAlarms`    | `infra/lib/constructs/observability-alarms.ts`    | CW Alarms, Composite Alarm, SNS Topic |

**New stack:**

| Stack                | File                                      | Description                         |
| -------------------- | ----------------------------------------- | ----------------------------------- |
| `ObservabilityStack` | `infra/lib/stacks/observability-stack.ts` | Wires dashboard + alarms constructs |

**New utility:**

| File                                               | Description                        |
| -------------------------------------------------- | ---------------------------------- |
| `infra/lib/constructs/shared/structured-logger.py` | Python logging utility for Lambdas |

**IAM:**

- Dashboard: No IAM needed (CloudWatch dashboard is an account-level resource)
- Alarms: `cloudwatch:SetAlarmState` not needed (alarms are automated)
- SNS: Alarm service principal allowed to publish

### 3.5 Security

- No new secrets
- SNS topic uses default encryption (SSE with AWS-managed key)
- No PII in metrics or dashboard titles
- Dashboard is account-scoped, not publicly accessible

### 3.6 Observability

This phase IS the observability layer. It adds:

- **Logs:** Structured logger utility + correlation ID propagation
- **Metrics:** Aggregated in dashboard from existing namespace `AirlineVoiceAgent`
- **Alarms:** Per-Lambda error alarms + composite system health alarm
- **Runbooks:** Index at `/docs/runbooks/index.md`

### 3.7 Performance and Scale

- CloudWatch Dashboard: No performance impact (read-only queries)
- Alarms: Standard CloudWatch alarm evaluation (no cost for < 10 alarms in free tier)
- SNS: Negligible cost for alarm notifications
- Structured logger: Minimal overhead (string formatting only)

### 3.8 Failure Modes and Recovery

| Failure Mode                    | Detection                       | Recovery                       |
| ------------------------------- | ------------------------------- | ------------------------------ |
| Dashboard missing widgets       | E2E test validates widget count | Redeploy stack                 |
| Alarm misconfigured             | E2E test validates alarm config | Redeploy stack                 |
| SNS topic permissions wrong     | Integration test                | Fix IAM in construct           |
| Structured logger breaks Lambda | Unit test                       | Revert to previous Lambda code |

## 4. Alternatives Considered

| Decision                  | Chosen | Alternative                       | Reason                                                |
| ------------------------- | ------ | --------------------------------- | ----------------------------------------------------- |
| Native CloudWatch         | ✅     | Grafana Cloud                     | Stay AWS-native, no external dependencies, free tier  |
| Composite alarm           | ✅     | EventBridge rule                  | Composite alarm is native CW feature, simpler         |
| Python utility (no layer) | ✅     | Lambda layer                      | Simpler deployment, avoid layer versioning complexity |
| JSON structured logs      | ✅     | CloudWatch Embedded Metric Format | JSON is universal, EMF adds complexity                |

## 5. Test Strategy

### Unit Tests

- Dashboard construct creates correct number of widgets
- Alarm construct creates alarms with correct thresholds
- Composite alarm references all child alarms
- SNS topic has correct policy
- Structured logger outputs valid JSON
- Structured logger extracts correlation ID from event

### Integration Tests

- Stack outputs include dashboard ARN, composite alarm ARN, SNS topic ARN
- Dashboard exists in CloudWatch after deploy

### E2E Tests

- Dashboard contains expected widgets (Lambda, StepFn, Fargate, DynamoDB, custom)
- Per-Lambda error alarms exist and are configured correctly
- Composite alarm exists with correct alarm rule
- SNS topic exists with alarm action configured
- Invoking Lambda with structured logger produces valid JSON log output

### Acceptance Criteria → Test Mapping

| Story | AC  | Test File                      | Test Name                                   |
| ----- | --- | ------------------------------ | ------------------------------------------- |
| 7.1   | AC1 | e2e/phase-07/dashboard.test.ts | Dashboard exists per environment            |
| 7.1   | AC2 | e2e/phase-07/dashboard.test.ts | Dashboard includes Lambda widgets           |
| 7.1   | AC3 | e2e/phase-07/dashboard.test.ts | Dashboard includes Step Functions widget    |
| 7.1   | AC4 | e2e/phase-07/dashboard.test.ts | Dashboard includes Fargate widget           |
| 7.1   | AC5 | e2e/phase-07/dashboard.test.ts | Dashboard includes DynamoDB widgets         |
| 7.1   | AC6 | e2e/phase-07/dashboard.test.ts | Dashboard includes custom business metrics  |
| 7.2   | AC1 | unit/observability.test.ts     | Structured logger utility exists            |
| 7.2   | AC2 | e2e/phase-07/logging.test.ts   | Correlation ID propagated                   |
| 7.2   | AC3 | e2e/phase-07/logging.test.ts   | Speech Quality Gate uses structured logging |
| 7.2   | AC4 | e2e/phase-07/logging.test.ts   | Error logs include stack traces             |
| 7.3   | AC1 | e2e/phase-07/alarms.test.ts    | Composite alarm exists                      |
| 7.3   | AC2 | e2e/phase-07/alarms.test.ts    | Composite alarm references child alarms     |
| 7.3   | AC3 | e2e/phase-07/alarms.test.ts    | SNS topic for alarm notifications           |
| 7.3   | AC4 | e2e/phase-07/alarms.test.ts    | Composite alarm transitions correctly       |
| 7.4   | AC1 | unit/observability.test.ts     | Runbook index exists                        |
| 7.4   | AC2 | unit/observability.test.ts     | Every alarm has a runbook entry             |
| 7.4   | AC3 | unit/observability.test.ts     | Runbook format is consistent                |
| 7.5   | AC1 | e2e/phase-07/alarms.test.ts    | Error alarm per Lambda                      |
| 7.5   | AC2 | e2e/phase-07/alarms.test.ts    | Alarms publish to SNS topic                 |
| 7.5   | AC3 | e2e/phase-07/alarms.test.ts    | Alarm uses appropriate evaluation period    |

## 6. Migration and Rollout

- No data migration required
- Deploy order: ObservabilityStack depends on all prior stacks (reads their exports)
- Structured logger is additive — existing Lambda code continues to work without it
- Logger adoption in existing Lambdas via a follow-up update (backward compatible)

## 7. Dependencies and Sequencing

**Depends on:**

- Phase 2 (DynamoDB table names)
- Phase 3 (session-bootstrap Lambda)
- Phase 4 (Orchestrator ECS service)
- Phase 5 (agent-tools Lambda, Bedrock Agent)
- Phase 6 (speech-quality-gate Lambda, noise-monitor state machine, existing alarm)

**Enables:**

- Phase 08 (Security) — uses alarms for security event detection
- Phase 09 (CI/CD) — uses dashboard for deploy validation
- Phase 10 (Integration Testing) — uses metrics for load test validation

## 8. Story-to-Implementation Mapping

| Story ID | Components Touched                                   | Tests Added                | Owner   |
| -------- | ---------------------------------------------------- | -------------------------- | ------- |
| 7.1      | ObservabilityDashboard construct, ObservabilityStack | unit + e2e dashboard tests | zenvyus |
| 7.2      | structured-logger.py, speech-quality-gate Lambda     | unit + e2e logging tests   | zenvyus |
| 7.3      | ObservabilityAlarms construct                        | unit + e2e alarm tests     | zenvyus |
| 7.4      | docs/runbooks/                                       | unit validation test       | zenvyus |
| 7.5      | ObservabilityAlarms construct                        | e2e alarm tests            | zenvyus |

## 9. Open Technical Questions

_None — all questions resolved._

## 10. Approvals

| Role                  | Name    | Date       | Status   |
| --------------------- | ------- | ---------- | -------- |
| Engineering Lead      | zenvyus | 2026-05-06 | Approved |
| Architect / Tech Lead | zenvyus | 2026-05-06 | Approved |
