# Runbook: Phase 07 — Observability & Dashboards

## Overview

This runbook covers diagnosis and recovery for the Observability stack including the composite system health alarm, per-Lambda error alarms, SNS notification topic, and CloudWatch dashboard.

## Components

| Component           | Resource             | ARN Pattern                               |
| ------------------- | -------------------- | ----------------------------------------- |
| Dashboard           | CloudWatch Dashboard | `airline-voice-agent-{env}`               |
| System Health       | Composite Alarm      | `airline-voice-agent-{env}-system-health` |
| Lambda Error Alarms | CloudWatch Alarms    | `{function-name}-error-rate-{env}`        |
| Notification Topic  | SNS Topic            | `airline-voice-agent-{env}-alarms`        |

## Diagnosis

### Composite Alarm in ALARM state

1. Check which child alarm triggered:

   ```bash
   aws cloudwatch describe-alarms --alarm-names "airline-voice-agent-{env}-system-health" --alarm-types CompositeAlarm --query "CompositeAlarms[0].AlarmRule"
   ```

2. List all alarms currently in ALARM state:

   ```bash
   aws cloudwatch describe-alarms --state-value ALARM --alarm-name-prefix "airline-voice-agent-{env}"
   ```

3. For Lambda error alarms, check the specific function logs:
   ```bash
   aws logs tail /aws/lambda/{function-name}-{env} --since 15m --filter-pattern "ERROR"
   ```

### Dashboard not showing data

1. Verify dashboard exists:

   ```bash
   aws cloudwatch get-dashboard --dashboard-name airline-voice-agent-{env}
   ```

2. If missing, redeploy the Observability stack:
   ```bash
   cd infra && npx cdk deploy AirlineVoiceAgent-Observability-{env} --require-approval never
   ```

## Recovery

**Lambda error alarm firing:**

- Check the specific Lambda's CloudWatch logs for error patterns
- Identify if the error is transient (throttling) or persistent (code bug)
- For throttle-related errors: increase reserved concurrency
- For code errors: roll back the Lambda to previous version

**SNS topic not delivering:**

- Check topic subscriptions:
  ```bash
  aws sns list-subscriptions-by-topic --topic-arn arn:aws:sns:{region}:{account}:airline-voice-agent-{env}-alarms
  ```
- Verify subscription is confirmed

## Rollback

Redeploy previous Observability stack:

```bash
cd infra && npx cdk deploy AirlineVoiceAgent-Observability-{env} --require-approval never
```

## Metrics

| Metric                 | Namespace  | Description                   |
| ---------------------- | ---------- | ----------------------------- |
| Per-Lambda Errors      | AWS/Lambda | Error count per function      |
| Per-Lambda Invocations | AWS/Lambda | Invocation count per function |
| Error Rate             | Calculated | (Errors / Invocations) \* 100 |

## Escalation

1. If composite alarm fires and no individual alarm is in ALARM: investigate composite alarm rule definition
2. If multiple Lambda alarms fire simultaneously: possible upstream dependency failure (network, DynamoDB, etc.)
3. Escalate to on-call engineering lead if alarm persists > 15 minutes after initial diagnosis
