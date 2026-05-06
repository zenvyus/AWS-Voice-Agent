# Runbook: Phase 06 — Noise Monitor & Speech Quality

## Overview

This runbook covers diagnosis and recovery for the Speech Quality Gate Lambda and Noise Monitor Step Functions state machine.

## Components

| Component            | Resource               | ARN Pattern                               |
| -------------------- | ---------------------- | ----------------------------------------- |
| Speech Quality Gate  | Lambda                 | `speech-quality-gate-{env}`               |
| Noise Monitor        | Step Functions Express | `noise-monitor-{env}`                     |
| High Rejection Alarm | CloudWatch Alarm       | `noise-monitor-{env}-high-rejection-rate` |
| Noise Counters       | DynamoDB Table         | `noise-counters-{env}` (Phase 2)          |

## Alarm: High Noise Rejection Rate

**Condition:** >80% of transcripts rejected in a 5-minute window.

### Diagnosis

1. Check CloudWatch Logs for `speech-quality-gate-{env}`:

   ```bash
   aws logs tail /aws/lambda/speech-quality-gate-{env} --since 15m --filter-pattern "REJECTED"
   ```

2. Identify which gate is rejecting most transcripts:
   - Gate 1 (min_length): Very short audio segments — possible silence/noise
   - Gate 2 (confidence): Low ASR confidence — possible background noise
   - Gate 3 (entropy): Low character entropy — repeated characters
   - Gate 4 (gibberish): Low dictionary match — non-speech audio

3. Check DynamoDB counter for affected contact:
   ```bash
   aws dynamodb get-item --table-name noise-counters-{env} --key '{"contactId": {"S": "<contact-id>"}}'
   ```

### Recovery

**If caused by environmental noise (many contacts affected):**

- Thresholds are environment variables on the Lambda. Adjust if needed:
  - `MIN_LENGTH_THRESHOLD` (default: 3)
  - `CONFIDENCE_THRESHOLD` (default: 0.6)
  - `ENTROPY_THRESHOLD` (default: 1.5)
  - `GIBBERISH_THRESHOLD` (default: 0.4)
- Redeploy with adjusted values via CDK config.

**If caused by a single contact (circuit breaker tripped):**

- The state machine resets the counter after intervention. No manual action needed.
- If a contact is stuck, manually delete their counter entry:
  ```bash
  aws dynamodb delete-item --table-name noise-counters-{env} --key '{"contactId": {"S": "<contact-id>"}}'
  ```

**If caused by upstream ASR degradation:**

- Check Amazon Transcribe service health.
- Consider temporarily raising `CONFIDENCE_THRESHOLD` to reduce false rejections.

## Rollback

Redeploy previous stack version:

```bash
cd infra && npx cdk deploy AirlineVoiceAgent-NoiseMonitor-{env} --require-approval never
```

Or revert the git commit and redeploy:

```bash
git revert <commit-sha>
git push origin test
# CI will redeploy
```

## Metrics

| Metric                | Namespace           | Description                               |
| --------------------- | ------------------- | ----------------------------------------- |
| `NoiseRejectionCount` | `AirlineVoiceAgent` | Count of rejected transcripts             |
| `SpeechPassCount`     | `AirlineVoiceAgent` | Count of transcripts passing all gates    |
| `GateFailure`         | `AirlineVoiceAgent` | Per-gate rejection (dimension: gate_name) |

## Escalation

If the alarm persists after threshold adjustment:

1. Check if Amazon Transcribe is producing valid output
2. Verify Kinesis Video Stream is delivering audio correctly (Phase 3)
3. Escalate to on-call engineering lead
