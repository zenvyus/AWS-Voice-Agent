# Phase 09 PRD: CI/CD Pipeline & Disaster Recovery

## 1. Overview

Phase 9 hardens the existing CI/CD pipeline with automated rollback capabilities, backup automation for stateful resources, and disaster recovery (DR) infrastructure to meet defined RTO/RPO targets. The CI/CD workflow already exists (`.github/workflows/ci.yml`); this phase adds production-readiness features.

## 2. Background and Context

The existing pipeline (created in earlier phases) provides multi-environment deployment with lint → typecheck → unit test → synth → deploy → integration → E2E → regression gates. However, it lacks:

- Automated rollback on failed deployment or smoke test failure
- DynamoDB point-in-time recovery and cross-region backup
- Aurora automated snapshots with cross-region replication
- S3 cross-region replication for critical assets
- Defined RTO/RPO targets with validation
- Pipeline notifications on success/failure
- Canary deployment for the ECS Fargate service

## 3. Goals and Non-Goals

### Goals

| ID  | Goal                                                   | Success Metric                                    |
| --- | ------------------------------------------------------ | ------------------------------------------------- |
| 3.1 | Automated rollback on deployment failure               | Failed deploy auto-reverts to previous known-good |
| 3.2 | DynamoDB backup automation with point-in-time recovery | PITR enabled; daily backup verified               |
| 3.3 | Aurora cross-region snapshot replication               | Snapshots replicated within 1 hour                |
| 3.4 | S3 cross-region replication for transcripts            | Replication active, RPO < 15 minutes              |
| 3.5 | ECS rolling deployment with circuit breaker            | Failed task deployments auto-rollback             |
| 3.6 | Pipeline notifications (success/failure)               | SNS notifications on every deploy outcome         |
| 3.7 | Defined RTO/RPO with automated DR validation           | DR test runbook exists; quarterly test documented |

### Non-Goals

- Active-active multi-region (out of scope — this is pilot/standby DR)
- Database failover automation (manual promotion for Aurora)
- WAF or DDoS protection (no public endpoints)
- Application-level retry/circuit-breaker patterns (already in Phase 4 orchestrator)

## 4. Target Users and Personas

| Persona             | Needs                                                   |
| ------------------- | ------------------------------------------------------- |
| Platform Engineer   | Reliable automated deployments with rollback            |
| Operations Engineer | Backup verification, DR test procedures                 |
| Engineering Manager | Confidence in recovery capabilities, RTO/RPO compliance |

## 5. User Problems and Jobs-to-be-Done

- **Problem:** A failed CDK deploy can leave the environment in a broken state requiring manual intervention.
- **Problem:** No automated backup verification — we trust backups exist but never validate restorability.
- **Problem:** Single-region deployment means a regional AWS outage causes total system loss.
- **Problem:** No visibility into pipeline success/failure without checking GitHub UI.

## 6. Success Metrics

| Metric                         | Target      | Measurement                                        |
| ------------------------------ | ----------- | -------------------------------------------------- |
| RTO (Recovery Time Objective)  | < 4 hours   | DR drill completion time                           |
| RPO (Recovery Point Objective) | < 1 hour    | Time gap between last backup and recovery point    |
| Deploy rollback time           | < 5 minutes | Time from failure detection to rollback completion |
| Pipeline notification delivery | < 1 minute  | SNS delivery after deploy completes                |
| Backup success rate            | 100%        | Daily automated backup check                       |

## 7. Scope

### In Scope

- DynamoDB PITR enablement via CDK
- DynamoDB on-demand backups via AWS Backup
- Aurora automated snapshot + cross-region copy
- S3 cross-region replication for transcripts bucket
- ECS deployment circuit breaker configuration
- GitHub Actions workflow enhancement: rollback step on failure
- GitHub Actions workflow: deploy notification via SNS
- DR runbook with step-by-step recovery procedures
- Automated DR validation test (can we restore from backup?)
- AWS Backup vault and plan for coordinated backups

### Out of Scope

- Active-active multi-region architecture
- Automated database failover (requires Aurora Global Database, cost-prohibitive for pilot)
- Infrastructure-as-Code for the DR region's full stack (documented manual procedure)
- Load testing / chaos engineering

## 8. Constraints and Assumptions

- DR region: `us-west-2` (secondary to primary `us-east-1`)
- AWS Backup is available in both regions
- Cross-region replication incurs additional storage costs
- ECS circuit breaker is natively supported in CDK
- GitHub Actions notifications use existing Phase 7 SNS topic

## 9. Dependencies

| Dependency                                  | Status   | Risk |
| ------------------------------------------- | -------- | ---- |
| Phase 2 (Data Layer — DynamoDB, Aurora, S3) | Complete | Low  |
| Phase 4 (Orchestrator — ECS service)        | Complete | Low  |
| Phase 7 (Observability — SNS topic)         | Complete | Low  |
| GitHub OIDC Stack                           | Complete | Low  |
| Existing CI/CD workflow                     | Complete | Low  |

## 10. Risks and Mitigations

| Risk                                         | Likelihood | Impact | Mitigation                                           |
| -------------------------------------------- | ---------- | ------ | ---------------------------------------------------- |
| Cross-region replication adds cost           | Medium     | Low    | Only replicate critical data (transcripts, sessions) |
| DR drill fails due to stale procedures       | Medium     | High   | Automated DR validation test quarterly               |
| Rollback leaves orphaned resources           | Low        | Medium | CDK handles CloudFormation rollback natively         |
| GitHub Actions rate limiting during rollback | Low        | Low    | Retry logic with backoff                             |

## 11. Open Questions

None — all resolved.

## 12. Approvals

| Role             | Name    | Date       | Status   |
| ---------------- | ------- | ---------- | -------- |
| Product Owner    | zenvyus | 2026-05-06 | Approved |
| Engineering Lead | zenvyus | 2026-05-06 | Approved |
