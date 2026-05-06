# Phase 09 Test Plan: CI/CD Pipeline & Disaster Recovery

## Test Coverage Matrix

| Story | AC ID | Test Level | Test File                                                       | Test Name                                                 |
| ----- | ----- | ---------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| 9.1   | AC1   | Unit       | `unit/cicd-dr.test.ts`                                          | CloudFormation rollback configured (default CDK behavior) |
| 9.1   | AC2   | Unit + E2E | `unit/cicd-dr.test.ts`, `e2e/phase-09-cicd-dr/rollback.test.ts` | ECS circuit breaker enabled with rollback                 |
| 9.1   | AC3   | Unit       | `unit/cicd-dr.test.ts`                                          | Pipeline notification step exists in workflow             |
| 9.2   | AC1   | E2E        | `e2e/phase-09-cicd-dr/backup.test.ts`                           | DynamoDB PITR enabled on all tables                       |
| 9.2   | AC2   | E2E        | `e2e/phase-09-cicd-dr/backup.test.ts`                           | AWS Backup plan includes DynamoDB tables                  |
| 9.2   | AC3   | E2E        | `e2e/phase-09-cicd-dr/backup.test.ts`                           | Backup vault exists in primary region                     |
| 9.3   | AC1   | E2E        | `e2e/phase-09-cicd-dr/backup.test.ts`                           | Aurora backup retention ≥ 7 days                          |
| 9.3   | AC2   | E2E        | `e2e/phase-09-cicd-dr/backup.test.ts`                           | Backup plan has cross-region copy rule                    |
| 9.4   | AC1   | E2E        | `e2e/phase-09-cicd-dr/replication.test.ts`                      | S3 replication rule exists and is enabled                 |
| 9.4   | AC2   | E2E        | `e2e/phase-09-cicd-dr/replication.test.ts`                      | Destination bucket exists in DR region                    |
| 9.4   | AC3   | E2E        | `e2e/phase-09-cicd-dr/replication.test.ts`                      | Replica encryption uses DR KMS key                        |
| 9.5   | AC1   | Unit       | `unit/cicd-dr.test.ts`                                          | Workflow has SNS publish on success                       |
| 9.5   | AC2   | Unit       | `unit/cicd-dr.test.ts`                                          | Workflow has SNS publish on failure                       |
| 9.5   | AC3   | Unit       | `unit/cicd-dr.test.ts`                                          | Notification step uses OIDC credentials                   |
| 9.6   | AC1   | Unit       | `unit/cicd-dr.test.ts`                                          | DR runbook exists with required sections                  |
| 9.6   | AC2   | E2E        | `e2e/phase-09-cicd-dr/dr-validation.test.ts`                    | DR validation confirms PITR + backup + replication        |
| 9.6   | AC3   | Unit       | `unit/cicd-dr.test.ts`                                          | RTO/RPO targets documented in runbook                     |

## Unit Tests

**File:** `infra/test/unit/cicd-dr.test.ts`

Tests that validate CDK template output:

- DynamoDB tables have `PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled: true`
- ECS service has `DeploymentConfiguration.DeploymentCircuitBreaker.Enable: true`
- ECS service has `DeploymentConfiguration.DeploymentCircuitBreaker.Rollback: true`
- Backup vault resource exists in template
- Backup plan resource exists with daily schedule rule
- Backup selection resource exists with tag-based selection
- S3 bucket has replication configuration
- DR runbook file exists and contains required sections
- CI/CD workflow file contains notification steps
- CI/CD workflow notification uses OIDC (no static credentials)

## E2E Tests

**Files:**

- `infra/test/e2e/phase-09-cicd-dr/backup.test.ts` — Verifies backup plan, vault, PITR
- `infra/test/e2e/phase-09-cicd-dr/replication.test.ts` — Verifies S3 CRR configuration
- `infra/test/e2e/phase-09-cicd-dr/rollback.test.ts` — Verifies ECS circuit breaker config
- `infra/test/e2e/phase-09-cicd-dr/dr-validation.test.ts` — Full DR readiness check

## Test Commands

```bash
# Unit tests (includes cicd-dr)
pnpm test

# Phase 9 E2E only
npx jest --config jest.config.e2e.ts --testPathPattern="phase-09"

# Full regression (all phases)
pnpm test:regression
```

## Regression Impact

- DynamoDB PITR and ECS circuit breaker changes are additive (no breaking changes)
- S3 replication is additive
- Full regression (Phases 1–7) must pass after all changes
