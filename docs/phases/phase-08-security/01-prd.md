# Phase 08 PRD: Security Hardening & Compliance

## 1. Overview

Phase 8 applies defense-in-depth security controls across all previously deployed infrastructure. This includes least-privilege IAM refinement, encryption validation, network segmentation verification, security event detection, secrets rotation, and compliance guardrails via AWS Config rules.

## 2. Problem Statement

Phases 1–7 focused on functional delivery. IAM policies were written for correctness but used broad permissions in some areas (e.g., `AdministratorAccess` on the GitHub deploy role, `resources: ['*']` on some policies). As the system prepares for production, all security controls must be hardened, validated, and continuously monitored.

## 3. Goals

| ID  | Goal                                                                 | Success Metric                                              |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| 3.1 | Least-privilege IAM: every role has only the permissions it requires | No `*` resource policies remain; IAM Access Analyzer clean  |
| 3.2 | Encryption at rest and in transit validated for all data stores      | All storage resources use KMS CMK; TLS enforced on all APIs |
| 3.3 | Security event detection with automated alerting                     | GuardDuty enabled; Security Hub findings routed to SNS      |
| 3.4 | Secrets rotation implemented for all credentials                     | Secrets Manager rotation enabled with ≤90 day schedule      |
| 3.5 | Network segmentation validated                                       | No public subnets with direct internet access to services   |
| 3.6 | Compliance guardrails via AWS Config                                 | Config rules for encryption, public access, IAM deployed    |
| 3.7 | Vulnerability scanning for container images                          | ECR image scan on push enabled; no critical vulnerabilities |

## 4. Scope

### In Scope

- IAM policy tightening (remove wildcards, scope to specific ARNs)
- GitHub deploy role scoped down from `AdministratorAccess`
- AWS GuardDuty enablement
- AWS Security Hub enablement with standards (CIS, AWS Foundational)
- AWS Config managed rules for compliance monitoring
- Secrets Manager rotation for Aurora DB credentials
- ECR enhanced scanning
- VPC Flow Logs enablement
- S3 bucket policy enforcement (block public access)
- Security alarm integration with Phase 7 SNS topic

### Out of Scope

- WAF/Shield (no public-facing endpoints currently)
- Penetration testing (separate engagement)
- SOC 2 certification process (future)
- Application-level authentication (Amazon Connect handles caller identity)

## 5. Dependencies

| Dependency                  | Status   | Risk |
| --------------------------- | -------- | ---- |
| Phase 2 (Data Layer)        | Complete | Low  |
| Phase 4 (Orchestrator/ECS)  | Complete | Low  |
| Phase 7 (Observability/SNS) | Complete | Low  |

## 6. Risks

| Risk                                              | Likelihood | Impact | Mitigation                                             |
| ------------------------------------------------- | ---------- | ------ | ------------------------------------------------------ |
| IAM tightening breaks existing functionality      | Medium     | High   | Test all phase E2E suites after IAM changes            |
| GuardDuty/Config incurs unexpected costs          | Low        | Low    | Use free-tier eligible features; budget alert in place |
| Secrets rotation causes temporary connection loss | Medium     | Medium | Implement rotation with multi-user strategy for Aurora |

## 7. Approvals

| Role             | Name    | Date       | Status   |
| ---------------- | ------- | ---------- | -------- |
| Engineering Lead | zenvyus | 2026-05-06 | Approved |
| Security Lead    | zenvyus | 2026-05-06 | Approved |
