# Phase 08 TID: Security Hardening & Compliance

## 1. Summary

This phase deploys a SecurityStack containing GuardDuty, Security Hub, AWS Config rules, VPC Flow Logs, EventBridge rules for security findings, and secrets rotation. It also refactors existing IAM policies to remove wildcard resources and tightens the GitHub deploy role. No new application functionality is added — this is a hardening-only phase.

## 2. Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                     Security Stack                              │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐│
│  │  GuardDuty   │  │ Security Hub │  │   AWS Config         ││
│  │  Detector    │  │ (Foundational│  │   Recorder + Rules   ││
│  └──────┬───────┘  │  Standards)  │  └──────────┬───────────┘│
│         │          └──────┬───────┘             │            │
│         ▼                 ▼                     ▼            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                EventBridge Rules                         │ │
│  │  • GuardDuty HIGH/CRITICAL → SNS                       │ │
│  │  • Security Hub HIGH/CRITICAL → SNS                    │ │
│  │  • Config NON_COMPLIANT → SNS                          │ │
│  └──────────────────────┬──────────────────────────────────┘ │
│                         ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  SNS Topic (from Phase 7): airline-voice-agent-{env}-alarms │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────┐  ┌────────────────────────────────┐│
│  │ Secrets Rotation     │  │  VPC Flow Logs                 ││
│  │ (Aurora credentials) │  │  (to CloudWatch Logs)          ││
│  └──────────────────────┘  └────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

### Components

| Component             | Type                                  | Purpose                         |
| --------------------- | ------------------------------------- | ------------------------------- |
| GuardDuty Detector    | AWS::GuardDuty::Detector              | Threat detection                |
| Security Hub          | AWS::SecurityHub::Hub                 | Security posture management     |
| Config Recorder       | AWS::Config::ConfigurationRecorder    | Resource configuration tracking |
| Config Rules (5)      | AWS::Config::ConfigRule               | Compliance monitoring           |
| EventBridge Rules (3) | AWS::Events::Rule                     | Route findings to SNS           |
| Secrets Rotation      | AWS::SecretsManager::RotationSchedule | Auto-rotate Aurora creds        |
| VPC Flow Logs         | AWS::EC2::FlowLog                     | Network traffic auditing        |
| S3 Bucket Policies    | AWS::S3::BucketPolicy                 | Enforce TLS, block public       |

## 3. Detailed Design

### 3.1 Components

#### SecurityDetection Construct

- **Responsibility:** Enable GuardDuty and Security Hub
- **Inputs:** Environment name, alarm topic ARN
- **Outputs:** Detector ID, Hub ARN
- **Dependencies:** Phase 7 SNS topic

#### ComplianceRules Construct

- **Responsibility:** AWS Config recorder + 5 managed rules + EventBridge rule for non-compliance
- **Inputs:** Environment name, alarm topic ARN
- **Outputs:** Config recorder name, rule ARNs
- **Dependencies:** Phase 7 SNS topic

#### SecurityEventRouting Construct

- **Responsibility:** EventBridge rules routing HIGH/CRITICAL findings to SNS
- **Inputs:** Alarm topic ARN, source services
- **Outputs:** Rule ARNs
- **Dependencies:** GuardDuty, Security Hub, Config

#### SecretsRotation Construct

- **Responsibility:** Rotation schedule + Lambda for Aurora credentials
- **Inputs:** Aurora secret ARN, VPC, security group, Aurora endpoint
- **Outputs:** Rotation Lambda ARN
- **Dependencies:** Phase 2 Aurora cluster

#### IAM Hardening (refactor, no new construct)

- **Responsibility:** Remove `*` resources, scope policies, replace AdministratorAccess
- **Changes in:** Existing constructs (noise-monitor, orchestrator-service, github-oidc-stack)
- **Approach:** Targeted edits to existing policy statements

### 3.2 Data Model

No new tables or data stores.

### 3.3 APIs and Contracts

No new APIs. This phase is infrastructure-only.

### 3.4 Infrastructure (IaC)

**New constructs:**

| Construct              | File                                             | Resources                                       |
| ---------------------- | ------------------------------------------------ | ----------------------------------------------- |
| `SecurityDetection`    | `infra/lib/constructs/security-detection.ts`     | GuardDuty Detector, Security Hub                |
| `ComplianceRules`      | `infra/lib/constructs/compliance-rules.ts`       | Config Recorder, Config Rules, Delivery Channel |
| `SecurityEventRouting` | `infra/lib/constructs/security-event-routing.ts` | EventBridge Rules                               |
| `SecretsRotation`      | `infra/lib/constructs/secrets-rotation.ts`       | Rotation Schedule, Rotation Lambda              |

**New stack:**

| Stack           | File                                 | Description                   |
| --------------- | ------------------------------------ | ----------------------------- |
| `SecurityStack` | `infra/lib/stacks/security-stack.ts` | Wires all security constructs |

**Modified constructs:**

| Construct                 | Change                                                                  |
| ------------------------- | ----------------------------------------------------------------------- |
| `github-oidc-stack.ts`    | Replace AdministratorAccess with scoped policy                          |
| `noise-monitor.ts`        | Scope `logs:*` and `xray:*` to specific resources where possible        |
| `orchestrator-service.ts` | Scope `kinesisvideo:*`, `transcribe:*`, `polly:*` to specific resources |
| `networking.ts`           | Add VPC Flow Logs                                                       |
| `storage-buckets.ts`      | Add bucket policies enforcing TLS                                       |

**IAM:**

- Config Recorder role: read-only access to all resources for configuration recording
- Rotation Lambda role: Secrets Manager read/write, RDS connect, VPC networking
- EventBridge: permission to publish to SNS topic

### 3.5 Security

This phase IS the security layer. Key controls:

- **Least privilege:** Remove all `Resource: "*"` where resource-level permissions are supported
- **Encryption:** Validate all at-rest and in-transit encryption
- **Detection:** GuardDuty + Security Hub + Config for continuous monitoring
- **Rotation:** Credentials auto-rotate ≤90 days
- **Network:** VPC Flow Logs, no public ingress, block public S3 access

### 3.6 Observability

- GuardDuty findings → EventBridge → SNS (Phase 7 topic)
- Security Hub findings → EventBridge → SNS
- Config non-compliance → EventBridge → SNS
- VPC Flow Logs → CloudWatch Logs log group
- All routed through existing alarm infrastructure

### 3.7 Performance and Scale

- No performance impact on application workloads
- GuardDuty/Security Hub/Config are account-level services with no runtime overhead
- VPC Flow Logs: minimal network overhead (sampled, async delivery)
- Secrets rotation: brief connection refresh every 90 days

### 3.8 Failure Modes and Recovery

| Failure Mode                | Detection                         | Recovery                     |
| --------------------------- | --------------------------------- | ---------------------------- |
| GuardDuty disabled          | Config rule / E2E test            | Redeploy SecurityStack       |
| Config recorder stopped     | E2E test                          | Redeploy SecurityStack       |
| Secrets rotation fails      | CloudWatch alarm on Lambda errors | Manual rotation + fix Lambda |
| EventBridge rule not firing | E2E test with test event          | Redeploy SecurityStack       |
| IAM too restrictive         | Phase regression tests fail       | Revert IAM changes           |

## 4. Alternatives Considered

| Decision                 | Chosen | Alternative              | Reason                                                   |
| ------------------------ | ------ | ------------------------ | -------------------------------------------------------- |
| GuardDuty native         | ✅     | Third-party SIEM         | AWS-native, no external dependency, free tier            |
| AWS Config managed rules | ✅     | Custom Config rules      | Simpler, maintained by AWS, sufficient coverage          |
| Secrets Manager rotation | ✅     | Manual rotation schedule | Automated, auditable, no human error                     |
| Scoped deploy role       | ✅     | Keep AdministratorAccess | Least privilege principle                                |
| VPC Flow Logs to CW      | ✅     | Flow Logs to S3          | Real-time queryability, integrated with existing logging |

## 5. Test Strategy

### Unit Tests

- SecurityStack creates GuardDuty detector resource
- SecurityStack creates Security Hub resource
- SecurityStack creates Config recorder and 5 rules
- SecurityStack creates 3 EventBridge rules
- No IAM policy in any stack template has `Resource: "*"` without documented exception
- GitHub deploy role does NOT have AdministratorAccess
- S3 bucket policies deny non-TLS requests
- VPC has Flow Logs resource

### E2E Tests

- GuardDuty detector exists and is enabled
- Security Hub is enabled with Foundational standard
- Config recorder is recording
- 5 Config managed rules exist
- EventBridge rules exist and target SNS
- Aurora secret has rotation enabled with ≤90 day schedule
- VPC Flow Logs are active
- S3 buckets block public access
- No security group allows 0.0.0.0/0 ingress on application ports
- ECR has scan-on-push enabled

### Regression

- All Phases 1–7 E2E tests must still pass after IAM tightening

## 6. Migration and Rollout

- GuardDuty/Security Hub/Config are additive — no existing resource changes
- IAM tightening is the highest-risk change; must run full regression after
- Secrets rotation is backward-compatible (multi-user rotation strategy)
- Deploy order: SecurityStack first, then IAM refactors, then regression validation
- Rollback: revert IAM changes if regression fails

## 7. Dependencies and Sequencing

**Depends on:**

- Phase 1 (Networking — VPC for Flow Logs)
- Phase 2 (Data Layer — Aurora, DynamoDB, S3, KMS)
- Phase 4 (Orchestrator — ECS, ECR)
- Phase 7 (Observability — SNS alarm topic)

**Enables:**

- Phase 09 (CI/CD) — secure deploy role used in pipeline
- Phase 10 (Integration Testing) — security posture validated end-to-end

## 8. Story-to-Implementation Mapping

| Story ID | Components Touched                                    | Tests Added            | Owner   |
| -------- | ----------------------------------------------------- | ---------------------- | ------- |
| 8.1      | IAM policies across all stacks, github-oidc-stack     | unit security tests    | zenvyus |
| 8.2      | storage-buckets, data-layer-stack (validation)        | e2e encryption tests   | zenvyus |
| 8.3      | SecurityDetection construct, SecurityEventRouting     | e2e detection tests    | zenvyus |
| 8.4      | SecretsRotation construct                             | e2e secrets tests      | zenvyus |
| 8.5      | networking.ts (Flow Logs), storage-buckets (policies) | e2e network tests      | zenvyus |
| 8.6      | ComplianceRules construct                             | e2e config-rules tests | zenvyus |
| 8.7      | orchestrator-service.ts (ECR config)                  | e2e ecr tests          | zenvyus |

## 9. Wildcard Resource Exceptions (documented per AC 8.1.AC1)

These services do NOT support resource-level permissions and require `Resource: "*"`:

| Service Action                                            | Reason                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| `cloudwatch:PutMetricData`                                | CloudWatch does not support resource-level restrictions for PutMetricData |
| `xray:PutTraceSegments`, `xray:PutTelemetryRecords`       | X-Ray does not support resource ARNs                                      |
| `xray:GetSamplingRules`, `xray:GetSamplingTargets`        | X-Ray sampling does not support resource ARNs                             |
| `transcribe:StartStreamTranscription`                     | Transcribe streaming does not support resource ARNs                       |
| `polly:SynthesizeSpeech`                                  | Polly does not support resource-level restrictions                        |
| `logs:CreateLogDelivery`, `logs:DescribeResourcePolicies` | CloudWatch Logs delivery APIs require `*`                                 |
| `config:Get*`, `config:Describe*`, `config:List*`         | Config recorder role needs account-wide read                              |

## 10. Approvals

| Role             | Name    | Date       | Status   |
| ---------------- | ------- | ---------- | -------- |
| Engineering Lead | zenvyus | 2026-05-06 | Approved |
| Security Lead    | zenvyus | 2026-05-06 | Approved |
