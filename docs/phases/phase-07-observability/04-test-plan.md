# Phase 07 Test Plan: Observability & Dashboards

## Test Coverage Matrix

| Story | AC ID | Test Level | Test File                                      | Test Name                                    |
| ----- | ----- | ---------- | ---------------------------------------------- | -------------------------------------------- |
| 7.1   | AC1   | E2E        | `e2e/phase-07-observability/dashboard.test.ts` | Dashboard exists per environment             |
| 7.1   | AC2   | E2E        | `e2e/phase-07-observability/dashboard.test.ts` | Dashboard includes Lambda widgets            |
| 7.1   | AC3   | E2E        | `e2e/phase-07-observability/dashboard.test.ts` | Dashboard includes Step Functions widget     |
| 7.1   | AC4   | E2E        | `e2e/phase-07-observability/dashboard.test.ts` | Dashboard includes Fargate widget            |
| 7.1   | AC5   | E2E        | `e2e/phase-07-observability/dashboard.test.ts` | Dashboard includes DynamoDB widgets          |
| 7.1   | AC6   | E2E        | `e2e/phase-07-observability/dashboard.test.ts` | Dashboard includes custom business metrics   |
| 7.2   | AC1   | Unit       | `unit/observability.test.ts`                   | Structured logger utility outputs valid JSON |
| 7.2   | AC2   | E2E        | `e2e/phase-07-observability/logging.test.ts`   | Correlation ID propagated in Lambda logs     |
| 7.2   | AC3   | E2E        | `e2e/phase-07-observability/logging.test.ts`   | Speech Quality Gate uses structured logging  |
| 7.2   | AC4   | E2E        | `e2e/phase-07-observability/logging.test.ts`   | Error logs include stack traces              |
| 7.3   | AC1   | E2E        | `e2e/phase-07-observability/alarms.test.ts`    | Composite alarm exists                       |
| 7.3   | AC2   | E2E        | `e2e/phase-07-observability/alarms.test.ts`    | Composite alarm references child alarms      |
| 7.3   | AC3   | E2E        | `e2e/phase-07-observability/alarms.test.ts`    | SNS topic for alarm notifications            |
| 7.3   | AC4   | E2E        | `e2e/phase-07-observability/alarms.test.ts`    | Composite alarm transitions correctly        |
| 7.4   | AC1   | Unit       | `unit/observability.test.ts`                   | Runbook index exists                         |
| 7.4   | AC2   | Unit       | `unit/observability.test.ts`                   | Every alarm has a runbook entry              |
| 7.4   | AC3   | Unit       | `unit/observability.test.ts`                   | Runbook format is consistent                 |
| 7.5   | AC1   | E2E        | `e2e/phase-07-observability/alarms.test.ts`    | Error alarm per Lambda                       |
| 7.5   | AC2   | E2E        | `e2e/phase-07-observability/alarms.test.ts`    | Alarms publish to SNS topic                  |
| 7.5   | AC3   | E2E        | `e2e/phase-07-observability/alarms.test.ts`    | Alarm uses appropriate evaluation period     |

## Unit Tests

**File:** `infra/test/unit/observability.test.ts`

- ObservabilityStack creates a CloudWatch Dashboard resource
- Dashboard has correct number of widgets (≥6 widget groups)
- Composite alarm is created with correct alarm rule
- Per-Lambda error alarms created for each function name
- SNS topic created with correct name pattern
- Composite alarm action targets SNS topic
- Structured logger outputs valid JSON format
- Structured logger extracts correlationId from event
- Structured logger generates UUID if no correlationId
- Runbook index file exists
- All deployed alarms have runbook entries

## Integration Tests

**File:** `infra/test/integration/phase-07-observability/observability.test.ts`

- Stack has DashboardArn output
- Stack has CompositeAlarmArn output
- Stack has AlarmTopicArn output

## E2E Tests

**Files:**

- `infra/test/e2e/phase-07-observability/dashboard.test.ts`
- `infra/test/e2e/phase-07-observability/alarms.test.ts`
- `infra/test/e2e/phase-07-observability/logging.test.ts`

See matrix above for specific test cases.

## Test Commands

```bash
# Unit tests
pnpm test

# Phase 7 only
npx jest --config jest.config.e2e.ts --testPathPattern="phase-07"

# Integration
npx jest --config jest.config.integration.ts --testPathPattern="phase-07"

# Regression (all phases)
npx jest --config jest.config.regression.ts
```
