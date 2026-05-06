# Runbook Index

This document maps all CloudWatch alarms to their corresponding runbook procedures.

## Alarm → Runbook Mapping

| Alarm Name Pattern                        | Phase | Runbook                                                  |
| ----------------------------------------- | ----- | -------------------------------------------------------- |
| `noise-monitor-{env}-high-rejection-rate` | 06    | [phase-06-noise-monitor.md](./phase-06-noise-monitor.md) |

## Runbook Format

Every runbook must contain:

1. **Overview** — What the component does
2. **Components** — Table of resources with ARN patterns
3. **Diagnosis** — Steps to identify root cause
4. **Recovery** — Actions to restore service
5. **Rollback** — How to revert to previous state
6. **Metrics** — Key metrics to monitor
7. **Escalation** — When and how to escalate
