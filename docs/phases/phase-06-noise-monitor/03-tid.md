# Phase 06 TID: Noise Monitor & Speech Quality

## 1. Summary

Provisions a Speech Quality Gate Lambda and a Noise Monitor Step Functions Express Workflow that together filter non-speech transcripts, track per-contact noise counters in DynamoDB, and trigger spoken interventions or call termination when persistent noise is detected.

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Orchestrator (Fargate)                         │
│                                                                      │
│   STT Transcript ──► Speech Quality Gate Lambda ──► Pass? ──► Bedrock│
│                              │                          │            │
│                              │ Reject                   │ Yes        │
│                              ▼                          │            │
│                   Noise Monitor (Step Functions)         │            │
│                              │                          │            │
│                              ▼                          │            │
│                   DynamoDB noise-counters                │            │
│                              │                          │            │
│                   ┌──────────┼──────────┐               │            │
│                   │          │          │               │            │
│                   ▼          ▼          ▼               │            │
│                CONTINUE  INTERVENE   END_CALL           │            │
│                              │          │               │            │
│                              ▼          ▼               │            │
│                         Polly TTS (spoken message)      │            │
└──────────────────────────────────────────────────────────────────────┘
```

**Components introduced:**

- `SpeechQualityGateLambda` — Python 3.12 Lambda applying four sequential filters
- `NoiseMonitorStateMachine` — Step Functions Express Workflow for counter logic
- CloudWatch metrics, alarms, and dashboard widgets

**Integration points:**

- Orchestrator invokes Speech Quality Gate Lambda synchronously (via Lambda Invoke)
- On rejection, orchestrator starts Noise Monitor state machine execution (sync Express)
- Noise Monitor reads/writes DynamoDB `noise-counters` table
- Intervention text returned to orchestrator → Polly TTS → audio back to caller

## 3. Detailed Design

### 3.1 Speech Quality Gate Lambda

| Setting       | Value                       |
| ------------- | --------------------------- |
| Function Name | `speech-quality-gate-{env}` |
| Runtime       | Python 3.12                 |
| Memory        | 256 MB                      |
| Timeout       | 10 seconds                  |
| Handler       | `index.handler`             |

**Input schema:**

```json
{
  "contactId": "string",
  "transcript": "string",
  "words": [
    { "word": "string", "confidence": 0.0-1.0 }
  ],
  "timestamp": "ISO-8601"
}
```

**Output schema:**

```json
{
  "result": "PASS | REJECT",
  "reason": "null | MIN_LENGTH | LOW_CONFIDENCE | LOW_ENTROPY | GIBBERISH",
  "transcript": "string (original, returned on PASS)",
  "gate": "1-4 (which gate rejected, null on PASS)",
  "metrics": {
    "processingTimeMs": 0
  }
}
```

**Gate logic (sequential, short-circuit on first failure):**

| Gate | Name           | Default Threshold    | Logic                                                     |
| ---- | -------------- | -------------------- | --------------------------------------------------------- |
| 1    | Minimum Length | 3 characters         | `len(transcript.strip()) < threshold`                     |
| 2    | Confidence     | 0.6 average          | `mean(word.confidence for word in words) < threshold`     |
| 3    | Entropy        | 1.5 bits             | Shannon entropy of character distribution < threshold     |
| 4    | Gibberish      | 0.4 dict match ratio | Fraction of words found in English dictionary < threshold |

**Configuration:** Thresholds read from environment variables, sourced from CDK config.

### 3.2 Noise Monitor State Machine

| Setting | Value                 |
| ------- | --------------------- |
| Name    | `noise-monitor-{env}` |
| Type    | EXPRESS               |
| Logging | ALL (CloudWatch Logs) |
| Tracing | Enabled (X-Ray)       |

**State machine definition (ASL):**

```
StartAt: DetermineAction
States:
  DetermineAction:
    Type: Choice
    Choices:
      - Variable: $.event
        StringEquals: PASS
        Next: ResetCounter
      - Variable: $.event
        StringEquals: REJECT
        Next: IncrementCounter

  ResetCounter:
    Type: Task
    Resource: arn:aws:states:::dynamodb:updateItem
    Parameters:
      TableName: noise-counters-{env}
      Key: { contactId: { S: $.contactId } }
      UpdateExpression: "SET noiseCount = :zero"
      ExpressionAttributeValues: { ":zero": { N: "0" } }
    ResultPath: $.dbResult
    Next: ReturnContinue

  IncrementCounter:
    Type: Task
    Resource: arn:aws:states:::dynamodb:updateItem
    Parameters:
      TableName: noise-counters-{env}
      Key: { contactId: { S: $.contactId } }
      UpdateExpression: "SET noiseCount = if_not_exists(noiseCount, :zero) + :one"
      ExpressionAttributeValues:
        ":zero": { N: "0" }
        ":one": { N: "1" }
      ReturnValues: UPDATED_NEW
    ResultPath: $.dbResult
    Next: EvaluateThreshold

  EvaluateThreshold:
    Type: Choice
    Choices:
      - Variable: $.dbResult.Attributes.noiseCount.N
        NumericGreaterThanEquals: 10
        Next: CircuitBreaker
      - Variable: $.dbResult.Attributes.noiseCount.N
        NumericGreaterThanEquals: 3
        Next: Intervene
    Default: ReturnContinue

  Intervene:
    Type: Pass
    Result:
      action: INTERVENE
      message: "I'm having trouble hearing you clearly. Could you move to a quieter area?"
    ResultPath: $.output
    Next: EmitInterventionMetric

  CircuitBreaker:
    Type: Pass
    Result:
      action: END_CALL
      message: "I'm sorry, I'm unable to hear you clearly enough to continue. Please try calling back from a quieter location."
    ResultPath: $.output
    Next: EmitCircuitBreakerMetric

  EmitInterventionMetric:
    Type: Task
    Resource: arn:aws:states:::cloudwatch:putMetricData
    Parameters:
      Namespace: AirlineVoiceAgent
      MetricData:
        - MetricName: NoiseIntervention
          Value: 1
          Unit: Count
          Dimensions:
            - Name: Type
              Value: INTERVENE
            - Name: Environment
              Value: {env}
    ResultPath: null
    Next: ReturnAction

  EmitCircuitBreakerMetric:
    Type: Task
    Resource: arn:aws:states:::cloudwatch:putMetricData
    Parameters:
      Namespace: AirlineVoiceAgent
      MetricData:
        - MetricName: NoiseIntervention
          Value: 1
          Unit: Count
          Dimensions:
            - Name: Type
              Value: END_CALL
            - Name: Environment
              Value: {env}
    ResultPath: null
    Next: ReturnAction

  ReturnContinue:
    Type: Pass
    Result:
      action: CONTINUE
    End: true

  ReturnAction:
    Type: Pass
    InputPath: $.output
    End: true
```

### 3.3 IAM Roles

**Speech Quality Gate Lambda Role:**

| Service    | Actions                                                            |
| ---------- | ------------------------------------------------------------------ |
| CloudWatch | `cloudwatch:PutMetricData`                                         |
| Logs       | `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` |

**Noise Monitor State Machine Role:**

| Service    | Actions                                                            |
| ---------- | ------------------------------------------------------------------ |
| DynamoDB   | `dynamodb:UpdateItem`, `dynamodb:GetItem` on noise-counters table  |
| CloudWatch | `cloudwatch:PutMetricData`                                         |
| Logs       | `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` |
| X-Ray      | `xray:PutTraceSegments`, `xray:PutTelemetryRecords`                |

### 3.4 Infrastructure (IaC)

**New constructs:**

| Construct           | File                                    | Resources                                                |
| ------------------- | --------------------------------------- | -------------------------------------------------------- |
| `SpeechQualityGate` | `lib/constructs/speech-quality-gate.ts` | Lambda function, IAM role                                |
| `NoiseMonitor`      | `lib/constructs/noise-monitor.ts`       | Step Functions state machine, IAM role, CloudWatch alarm |

**New stack:**

| Stack               | File                                |
| ------------------- | ----------------------------------- |
| `NoiseMonitorStack` | `lib/stacks/noise-monitor-stack.ts` |

**Cross-stack exports:**

| Export Name                         | Value               |
| ----------------------------------- | ------------------- |
| `{env}-SpeechQualityGateLambdaArn`  | Lambda function ARN |
| `{env}-NoiseMonitorStateMachineArn` | State machine ARN   |

### 3.5 Security

- Lambda runs in VPC (private subnets) with no internet access (uses VPC endpoints)
- State machine has no network access (uses SDK integrations only)
- DynamoDB access scoped to single table with partition-key condition
- No secrets required; all configuration via environment variables

### 3.6 Observability

**Metrics:**

| Metric              | Namespace         | Dimensions                                    |
| ------------------- | ----------------- | --------------------------------------------- |
| `SpeechGateOutcome` | AirlineVoiceAgent | Gate (1–4), Result (PASS/REJECT), Environment |
| `NoiseIntervention` | AirlineVoiceAgent | Type (INTERVENE/END_CALL), Environment        |
| `SpeechGateLatency` | AirlineVoiceAgent | Environment                                   |

**Alarms:**

| Alarm                       | Condition                  | Action           |
| --------------------------- | -------------------------- | ---------------- |
| High noise rejection rate   | >80% rejections over 5 min | SNS notification |
| Circuit-breaker activations | >5 in 15 min               | SNS notification |

**Logs:**

- Speech Quality Gate Lambda: structured JSON, correlation by `contactId`
- Noise Monitor State Machine: ALL level logging to CloudWatch Logs

### 3.7 Performance and Scale

| Metric                         | Target |
| ------------------------------ | ------ |
| Speech Gate Lambda p50 latency | <20ms  |
| Speech Gate Lambda p99 latency | <100ms |
| State Machine execution time   | <500ms |
| Concurrent executions (peak)   | 1000   |

### 3.8 Failure Modes and Recovery

| Failure Mode            | Detection                           | Recovery                                        |
| ----------------------- | ----------------------------------- | ----------------------------------------------- |
| Lambda cold start delay | X-Ray traces                        | Provisioned concurrency (prod only)             |
| DynamoDB throttling     | CloudWatch ThrottledRequests metric | On-demand billing handles burst                 |
| State machine timeout   | Execution history                   | Retry from orchestrator; treat as CONTINUE      |
| Lambda invocation error | CloudWatch Errors metric            | Orchestrator falls through to agent (fail-open) |

## 4. Alternatives Considered

- **Inline gate logic in orchestrator container:** Rejected — Lambda allows independent deployment, scaling, and language choice; easier to test in isolation
- **Standard Step Functions (not Express):** Rejected — Express Workflows provide synchronous execution with sub-second latency required for real-time voice processing
- **EventBridge for noise event routing:** Rejected — adds unnecessary async complexity; synchronous invoke from orchestrator is simpler and faster

See: [ADR-010: Step Functions for Noise Monitor](./decisions/ADR-010-step-functions-noise-monitor.md)

## 5. Test Strategy

| ID    | Type        | Description                                                    |
| ----- | ----------- | -------------------------------------------------------------- |
| T6.U1 | Unit        | Speech Quality Gate Lambda resource exists with correct config |
| T6.U2 | Unit        | Noise Monitor state machine resource exists with EXPRESS type  |
| T6.U3 | Unit        | IAM roles follow least-privilege                               |
| T6.U4 | Unit        | CloudWatch alarm defined for high rejection rate               |
| T6.U5 | Unit        | Cross-stack exports defined                                    |
| T6.I1 | Integration | Stack has SpeechQualityGateLambdaArn output                    |
| T6.I2 | Integration | Stack has NoiseMonitorStateMachineArn output                   |
| T6.E1 | E2E         | Speech Quality Gate Lambda exists and is invocable             |
| T6.E2 | E2E         | Gate rejects short/low-confidence/low-entropy/gibberish input  |
| T6.E3 | E2E         | Noise Monitor state machine exists and is ACTIVE               |
| T6.E4 | E2E         | State machine increments counter and returns correct action    |
| T6.E5 | E2E         | CloudWatch alarm exists                                        |

## 6. Migration and Rollout

- No breaking changes to existing stacks
- Orchestrator will be updated in a future phase to invoke the Speech Quality Gate Lambda
- This phase deploys infrastructure only; orchestrator integration is wired separately
- Fail-open design: if the gate Lambda is unavailable, utterances pass through to the agent

## 7. Dependencies and Sequencing

| Depends on                              | Status   |
| --------------------------------------- | -------- |
| Phase 2: DynamoDB noise-counters table  | Complete |
| Phase 4: Orchestrator (future consumer) | Complete |

**Enables:**

- Phase 7: Observability dashboards will include noise metrics
- Future orchestrator update to invoke Speech Quality Gate

## 8. Story-to-Implementation Mapping

| Story ID | Components Touched                         | Tests Added         |
| -------- | ------------------------------------------ | ------------------- |
| 6.1      | SpeechQualityGate construct, Lambda code   | T6.U1, T6.E1, T6.E2 |
| 6.2      | NoiseMonitor construct, Step Functions ASL | T6.U2, T6.E3, T6.E4 |
| 6.3      | CloudWatch alarm, metrics in Lambda/SFN    | T6.U4, T6.E5        |
| 6.4      | Stack outputs                              | T6.U5, T6.I1, T6.I2 |

## 9. Open Technical Questions

None — all resolved.

## 10. Approvals

| Role                  | Name | Date | Status  |
| --------------------- | ---- | ---- | ------- |
| Engineering Lead      | —    | —    | Pending |
| Architect / Tech Lead | —    | —    | Pending |
