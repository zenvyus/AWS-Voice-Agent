# Phase 07 PRD: Observability & Dashboards

## 1. Overview

This phase delivers a unified observability layer for the Airline Voice Agent system, providing centralized CloudWatch dashboards, structured logging with correlation IDs, custom metrics aggregation, composite alarms, and operational runbooks. It ensures that all prior phases (1–6) and future phases have consistent, actionable observability coverage.

## 2. Background and Context

Phases 1–6 have deployed networking, data, media transport, orchestration, intelligence, and noise monitoring infrastructure. Each phase added some metrics and alarms independently, but there is no unified dashboard, no cross-phase correlation, and no single pane of glass for operations. As the system grows, operators need a centralized way to monitor health, detect anomalies, and diagnose issues across all components.

This phase exists to consolidate and extend observability before adding more complexity in later phases.

## 3. Goals and Non-Goals

### Goals

- Provide a single CloudWatch dashboard covering all deployed services and phases
- Implement structured JSON logging with correlation IDs across all Lambdas and services
- Create composite alarms that reflect system-level health (not just individual component status)
- Aggregate custom metrics into a unified namespace with consistent dimensions
- Deliver operational runbook index linking alarms to diagnosis/recovery procedures
- Enable per-environment dashboard deployment (dev, test, staging, prod)

### Non-Goals

- APM or distributed tracing with X-Ray (future phase)
- Third-party observability tools (Datadog, Grafana Cloud)
- Cost anomaly detection and budgets (Phase 09 scope)
- Log archival and compliance retention policies (Phase 08 scope)
- Real-time alerting to PagerDuty/Slack (future integration)

## 4. Target Users and Personas

- **Operations Engineer:** Monitors system health, responds to alarms, uses dashboards for triage
- **Engineering Lead:** Reviews trends, identifies capacity issues, validates deployments
- **On-call Engineer:** Receives alarm notifications, follows runbooks to diagnose and resolve

## 5. User Problems and Jobs-to-be-Done

- **Fragmented visibility:** Metrics exist per-phase but no unified view across the system
- **Slow triage:** When an alarm fires, operators must manually navigate multiple log groups
- **No correlation:** Difficult to trace a single call through Connect → Orchestrator → Intelligence → Noise Monitor
- **Missing composite health:** Individual alarms don't reflect whether the overall system is healthy
- **Runbook gaps:** Not all alarms have documented recovery procedures

## 6. Success Metrics

### Leading Indicators

- Dashboard created and accessible in all environments
- All Lambdas emit structured JSON logs with correlation ID
- Composite alarm covers 100% of critical paths

### Lagging Indicators

- Mean time to detect (MTTD) for issues: < 2 minutes
- Mean time to diagnose (MTTD) with runbook: < 10 minutes
- Zero "unknown" alarms (every alarm maps to a runbook)

### Target Values

| Metric                   | Target                         | Measurement                   |
| ------------------------ | ------------------------------ | ----------------------------- |
| Dashboard coverage       | 100% of deployed services      | Widget count vs service count |
| Structured log adoption  | 100% of Lambdas                | Audit of log formats          |
| Runbook coverage         | 100% of alarms                 | Alarm → runbook mapping       |
| Composite alarm accuracy | Zero false positives in 7 days | Alarm history review          |

## 7. Scope

### In Scope

- CloudWatch Dashboard construct (per-environment, one per deploy)
- Dashboard widgets: Lambda metrics, Step Functions metrics, DynamoDB metrics, Fargate metrics, custom business metrics
- Structured logging layer (shared utility for all Lambdas)
- Correlation ID propagation via Lambda context / event headers
- Composite alarm aggregating critical individual alarms
- Alarm action: SNS topic for notifications
- Runbook index document linking all alarms to procedures
- Unit, integration, and E2E tests for all new constructs

### Out of Scope

- X-Ray distributed tracing
- Log insights saved queries (manual, not IaC)
- Third-party integrations
- Cost dashboards

## 8. Constraints and Assumptions

- CloudWatch dashboards are limited to 500 metrics per dashboard
- All environments share the same AWS account (263611243147) with isolation via naming
- SNS topic for alarms does not require subscription management in this phase (operators subscribe manually)
- Existing Lambdas will be updated to use the structured logging utility in a backward-compatible way

## 9. Dependencies

| Dependency           | Phase   | Status   |
| -------------------- | ------- | -------- |
| Networking & VPC     | Phase 1 | Complete |
| DynamoDB tables      | Phase 2 | Complete |
| Connect & KVS        | Phase 3 | Complete |
| Orchestrator Fargate | Phase 4 | Complete |
| Intelligence Lambdas | Phase 5 | Complete |
| Noise Monitor        | Phase 6 | Complete |

## 10. Risks and Mitigations

| Risk                                               | Likelihood | Impact | Mitigation                                                       |
| -------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------- |
| Dashboard widget limit exceeded                    | Low        | Medium | Split into overview + detail dashboards                          |
| Structured logging breaks existing Lambda behavior | Low        | High   | Add logging as additive layer, don't modify function logic       |
| Composite alarm too sensitive (false positives)    | Medium     | Medium | Tune evaluation periods, use M-of-N alarm logic                  |
| SNS topic cost from excessive alarm transitions    | Low        | Low    | Configure alarm actions with OK/ALARM only, no INSUFFICIENT_DATA |

## 11. Open Questions

_None — all questions resolved._

## 12. Approvals

| Role             | Name    | Date       | Status   |
| ---------------- | ------- | ---------- | -------- |
| Product Owner    | zenvyus | 2026-05-06 | Approved |
| Engineering Lead | zenvyus | 2026-05-06 | Approved |
