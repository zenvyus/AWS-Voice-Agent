# Phase 09 TID: CI/CD Pipeline & Disaster Recovery

## 1. Summary

This phase adds disaster recovery infrastructure (DynamoDB PITR, AWS Backup, cross-region replication), ECS deployment circuit breaker, pipeline notifications, and DR validation. The CI/CD workflow already exists; this phase hardens it for production readiness.

## 2. Architecture Overview

```
┌─────────────────── us-east-1 (Primary) ───────────────────┐
│                                                            │
│  GitHub Actions CI/CD                                      │
│  ┌────────────────────────────────────────────────────┐   │
│  │ lint → typecheck → unit → synth → deploy → e2e    │   │
│  │                                    │               │   │
│  │                          ┌─────────┼──────────┐   │   │
│  │                          │ success │ failure  │   │   │
│  │                          ▼         ▼          │   │   │
│  │                     SNS notify  SNS notify    │   │   │
│  │                                 + rollback    │   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  AWS Backup                                                │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Backup Plan: daily                                  │   │
│  │ • DynamoDB (sessions, noise-counters)              │   │
│  │ • Aurora snapshots                                  │   │
│  │ Copy to DR region ─────────────────────────────┐   │   │
│  └────────────────────────────────────────────────│───┘   │
│                                                    │       │
│  S3 Replication                                    │       │
│  ┌────────────────────┐                           │       │
│  │ transcripts bucket  │──── CRR ─────────────┐   │       │
│  └────────────────────┘                       │   │       │
│                                                │   │       │
│  ECS Service                                   │   │       │
│  ┌────────────────────┐                       │   │       │
│  │ Circuit Breaker ON  │                       │   │       │
│  │ Min healthy: 100%   │                       │   │       │
│  └────────────────────┘                       │   │       │
└────────────────────────────────────────────────│───│───────┘
                                                 │   │
┌─────────────────── us-west-2 (DR) ────────────│───│───────┐
│                                                │   │       │
│  ┌────────────────────────────────────────────┐│   │       │
│  │ DR Backup Vault                            ││   │       │
│  │ • DynamoDB backup copies                   │◄───┘       │
│  │ • Aurora snapshot copies                   │            │
│  └────────────────────────────────────────────┘            │
│                                                            │
│  ┌────────────────────────────────────────────┐            │
│  │ S3 Replica Bucket (transcripts)            │◄───────────┘
│  └────────────────────────────────────────────┘            │
│                                                            │
│  ┌────────────────────────────────────────────┐            │
│  │ DR KMS Key (encrypt replicated data)       │            │
│  └────────────────────────────────────────────┘            │
└────────────────────────────────────────────────────────────┘
```

## 3. Detailed Design

### 3.1 Components

#### BackupPlan Construct

- **File:** `infra/lib/constructs/backup-plan.ts`
- **Responsibility:** AWS Backup vault + plan for DynamoDB and Aurora
- **Inputs:** Environment name, DynamoDB table ARNs, Aurora cluster ARN, DR region
- **Outputs:** Backup vault ARN, backup plan ARN
- **Resources:**
  - `AWS::Backup::BackupVault` (primary region)
  - `AWS::Backup::BackupVault` (DR region, via custom resource or separate stack)
  - `AWS::Backup::BackupPlan` with daily rule + cross-region copy
  - `AWS::Backup::BackupSelection` (tags-based selection)
  - IAM role for AWS Backup service

#### S3Replication Construct

- **File:** `infra/lib/constructs/s3-replication.ts`
- **Responsibility:** Cross-region replication for the transcripts bucket
- **Inputs:** Source bucket, destination region, destination KMS key ARN
- **Outputs:** Replication rule status
- **Resources:**
  - S3 replication configuration on source bucket
  - Destination bucket in DR region (if not already exists)
  - IAM role for S3 replication

#### DeployNotification Construct

- **File:** `infra/lib/constructs/deploy-notification.ts`
- **Responsibility:** Lambda function invoked by GitHub Actions to send deploy notifications
- **Inputs:** SNS topic ARN
- **Outputs:** Lambda function name
- **Note:** Alternatively handled purely in GitHub Actions with `aws sns publish` CLI

#### ECS Circuit Breaker (modification)

- **File:** `infra/lib/constructs/orchestrator-service.ts` (modify existing)
- **Change:** Enable `circuitBreaker` with `rollback: true` on the ECS service
- **No new construct needed**

### 3.2 Data Model

No new tables. Existing tables get PITR enabled:

| Table                  | Change      |
| ---------------------- | ----------- |
| `sessions-{env}`       | Enable PITR |
| `noise-counters-{env}` | Enable PITR |

### 3.3 APIs and Contracts

No new APIs. GitHub Actions workflow updated with notification step.

### 3.4 Infrastructure (IaC)

**New constructs:**

| Construct       | File                                     | Resources                               |
| --------------- | ---------------------------------------- | --------------------------------------- |
| `BackupPlan`    | `infra/lib/constructs/backup-plan.ts`    | Backup Vault, Plan, Selection, IAM Role |
| `S3Replication` | `infra/lib/constructs/s3-replication.ts` | Replication Config, IAM Role            |

**New stack:**

| Stack                   | File                                          | Description                             |
| ----------------------- | --------------------------------------------- | --------------------------------------- |
| `DisasterRecoveryStack` | `infra/lib/stacks/disaster-recovery-stack.ts` | Backup plan + S3 replication + DR vault |

**Modified resources:**

| Resource                | Change                                     |
| ----------------------- | ------------------------------------------ |
| DynamoDB tables         | Add `pointInTimeRecovery: true`            |
| ECS service             | Add `circuitBreaker: { rollback: true }`   |
| GitHub Actions workflow | Add notification step, rollback on failure |

**IAM:**

- Backup service role: `backup:*` for tagged resources
- S3 replication role: `s3:GetReplication*`, `s3:ReplicateObject`, `kms:Encrypt` in DR
- Deploy notification: `sns:Publish` to alarm topic

### 3.5 Security

- DR vault uses separate KMS key in us-west-2
- Cross-region replication encrypted with destination KMS key
- Backup vault has resource-based policy preventing deletion
- S3 replication IAM role is scoped to source and destination buckets only

### 3.6 Observability

- AWS Backup job notifications → EventBridge → CloudWatch Logs
- S3 replication metrics: `ReplicationLatency`, `BytesPendingReplication`
- ECS deployment events → CloudWatch Events (already in Phase 7 dashboard)
- Deploy notifications → Phase 7 SNS topic
- Backup failure alarm → Phase 7 SNS topic

### 3.7 Performance and Scale

- AWS Backup runs during off-peak (configured for 2:00 AM UTC)
- S3 replication is asynchronous, no impact on write latency
- ECS circuit breaker adds ~30s detection time but prevents bad deploys
- No runtime performance impact on application workloads

### 3.8 Failure Modes and Recovery

| Failure Mode                  | Detection                       | Recovery                           |
| ----------------------------- | ------------------------------- | ---------------------------------- |
| Backup job fails              | AWS Backup notification + alarm | Manual trigger backup, investigate |
| S3 replication lag > 15 min   | S3 replication metric alarm     | Check source bucket write rate     |
| ECS circuit breaker triggers  | ECS deployment event alarm      | Review task logs, fix, redeploy    |
| Cross-region copy fails       | Backup job failure notification | Verify KMS key permissions in DR   |
| DR vault accidentally deleted | AWS Backup vault lock prevents  | Vault lock enabled                 |

## 4. Alternatives Considered

| Decision                    | Chosen | Alternative                    | Reason                                              |
| --------------------------- | ------ | ------------------------------ | --------------------------------------------------- |
| AWS Backup for coordination | ✅     | Individual service backup APIs | Single pane, cross-service, cross-region built-in   |
| Pilot/standby DR            | ✅     | Active-active multi-region     | Cost prohibitive for pilot; warm standby sufficient |
| S3 CRR                      | ✅     | S3 batch replication           | CRR is real-time, meets RPO < 15 min                |
| ECS circuit breaker         | ✅     | CodeDeploy blue/green          | Simpler, native, no additional service              |
| SNS notification from GHA   | ✅     | Lambda-based pipeline webhook  | Simpler, direct, no extra infra                     |

## 5. Test Strategy

### Unit Tests

- DisasterRecoveryStack creates backup vault
- DisasterRecoveryStack creates backup plan with daily schedule
- DisasterRecoveryStack creates backup selection for project-tagged resources
- DisasterRecoveryStack configures cross-region copy rule
- DynamoDB tables have PITR enabled
- ECS service has circuit breaker with rollback enabled
- S3 replication configuration exists on transcripts bucket

### E2E Tests

- DynamoDB tables have PITR status ENABLED
- AWS Backup plan exists with correct schedule
- AWS Backup vault exists in primary region
- S3 transcripts bucket has replication rules active
- ECS service deployment configuration includes circuit breaker
- Backup selection targets correct tagged resources

### Integration Tests

- GitHub Actions workflow file contains notification step
- GitHub Actions workflow file contains rollback logic

## 6. DR Runbook Topics

The DR runbook (`docs/runbooks/phase-09-disaster-recovery.md`) will cover:

1. RTO/RPO target definitions
2. Regional failover decision criteria
3. DynamoDB restore from PITR procedure
4. Aurora snapshot restore in DR region
5. S3 data access in DR region
6. ECS service redeployment in DR region
7. DNS/routing cutover (manual)
8. Communication plan
9. Post-incident review template

## 7. Story-to-Implementation Mapping

| Story ID | Components Touched                    | Tests Added                |
| -------- | ------------------------------------- | -------------------------- |
| 9.1      | orchestrator-service.ts, ci.yml       | unit, e2e rollback         |
| 9.2      | dynamodb-tables.ts, backup-plan.ts    | unit, e2e backup           |
| 9.3      | backup-plan.ts (copy rule)            | unit, e2e backup           |
| 9.4      | s3-replication.ts, storage-buckets.ts | unit, e2e replication      |
| 9.5      | ci.yml (notification step)            | unit (workflow validation) |
| 9.6      | docs/runbooks, e2e test               | e2e dr-validation          |

## 8. Approvals

| Role             | Name    | Date       | Status   |
| ---------------- | ------- | ---------- | -------- |
| Engineering Lead | zenvyus | 2026-05-06 | Approved |
