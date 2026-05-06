# Phase 08 Test Plan: Security Hardening & Compliance

## Test Coverage Matrix

| Story | AC ID | Test Level | Test File                                                    | Test Name                                                  |
| ----- | ----- | ---------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| 8.1   | AC1   | Unit       | `unit/security.test.ts`                                      | No wildcard resource policies without documented exception |
| 8.1   | AC2   | Unit + E2E | `unit/security.test.ts`, `e2e/phase-08-security/iam.test.ts` | GitHub deploy role has no AdministratorAccess              |
| 8.1   | AC3   | Unit       | `unit/security.test.ts`                                      | Lambda execution roles are scoped to specific resources    |
| 8.2   | AC1   | E2E        | `e2e/phase-08-security/encryption.test.ts`                   | DynamoDB tables use KMS CMK                                |
| 8.2   | AC2   | E2E        | `e2e/phase-08-security/encryption.test.ts`                   | S3 buckets use KMS CMK and enforce TLS                     |
| 8.2   | AC3   | E2E        | `e2e/phase-08-security/encryption.test.ts`                   | Aurora cluster uses KMS encryption                         |
| 8.2   | AC4   | E2E        | `e2e/phase-08-security/encryption.test.ts`                   | ElastiCache encryption at rest and in transit              |
| 8.3   | AC1   | E2E        | `e2e/phase-08-security/detection.test.ts`                    | GuardDuty is enabled                                       |
| 8.3   | AC2   | E2E        | `e2e/phase-08-security/detection.test.ts`                    | Security Hub enabled with Foundational standard            |
| 8.3   | AC3   | E2E        | `e2e/phase-08-security/detection.test.ts`                    | EventBridge rules route findings to SNS                    |
| 8.4   | AC1   | E2E        | `e2e/phase-08-security/secrets.test.ts`                      | Aurora secret has rotation enabled ≤90 days                |
| 8.4   | AC2   | E2E        | `e2e/phase-08-security/secrets.test.ts`                      | Rotation Lambda exists with VPC/IAM config                 |
| 8.5   | AC1   | E2E        | `e2e/phase-08-security/network.test.ts`                      | VPC Flow Logs enabled                                      |
| 8.5   | AC2   | E2E        | `e2e/phase-08-security/network.test.ts`                      | No public ingress on application security groups           |
| 8.5   | AC3   | E2E        | `e2e/phase-08-security/network.test.ts`                      | S3 buckets block public access                             |
| 8.6   | AC1   | E2E        | `e2e/phase-08-security/config-rules.test.ts`                 | Config Recorder is enabled                                 |
| 8.6   | AC2   | E2E        | `e2e/phase-08-security/config-rules.test.ts`                 | 5 managed rules deployed                                   |
| 8.6   | AC3   | E2E        | `e2e/phase-08-security/config-rules.test.ts`                 | Non-compliant resources trigger alarm via EventBridge      |
| 8.7   | AC1   | E2E        | `e2e/phase-08-security/ecr.test.ts`                          | ECR enhanced scanning enabled                              |
| 8.7   | AC2   | E2E        | `e2e/phase-08-security/ecr.test.ts`                          | No critical vulnerabilities in current image               |

## Unit Tests

**File:** `infra/test/unit/security.test.ts`

- No IAM policy statement has `Resource: "*"` without documented exception
- GitHub OIDC deploy role does NOT use AdministratorAccess managed policy
- GitHub OIDC deploy role has scoped CDK deploy permissions
- Lambda execution roles are scoped to specific table/bucket/key ARNs
- S3 bucket policies contain `aws:SecureTransport` condition
- VPC Flow Logs resource exists in networking stack
- SecurityStack creates GuardDuty detector
- SecurityStack creates Security Hub
- SecurityStack creates Config recorder + 5 rules
- SecurityStack creates 3 EventBridge rules targeting SNS

## E2E Tests

**Files:**

- `infra/test/e2e/phase-08-security/iam.test.ts`
- `infra/test/e2e/phase-08-security/encryption.test.ts`
- `infra/test/e2e/phase-08-security/detection.test.ts`
- `infra/test/e2e/phase-08-security/secrets.test.ts`
- `infra/test/e2e/phase-08-security/network.test.ts`
- `infra/test/e2e/phase-08-security/config-rules.test.ts`
- `infra/test/e2e/phase-08-security/ecr.test.ts`

## Regression Validation

After IAM tightening, the full regression suite (Phases 1–7) must pass:

```bash
pnpm test:regression
```

## Test Commands

```bash
# Unit tests (includes security)
pnpm test

# Phase 8 E2E only
npx jest --config jest.config.e2e.ts --testPathPattern="phase-08"

# Full regression (critical after IAM changes)
pnpm test:regression
```
