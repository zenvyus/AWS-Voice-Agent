# Phase 06 User Stories: Noise Monitor & Speech Quality

## Story 6.1: Speech Quality Gate Lambda

**As a** platform engineer
**I want** a Lambda function that applies four sequential quality filters to STT transcript segments
**So that** only valid speech reaches the Bedrock Agent, rejecting noise-generated gibberish

### Acceptance Criteria

**AC1: Lambda exists with correct runtime and configuration**

- **Given** the Noise Monitor stack has been deployed
- **When** I describe the Speech Quality Gate Lambda via the AWS SDK
- **Then** the Lambda exists with Python 3.12 runtime
- **And** memory is set to 256 MB
- **And** timeout is set to 10 seconds

**AC2: Gate 1 — Minimum length filter**

- **Given** a transcript segment shorter than the configured minimum character threshold (default: 3 characters)
- **When** the Speech Quality Gate Lambda is invoked
- **Then** the response indicates rejection with reason `MIN_LENGTH`
- **And** the segment is not passed to subsequent gates

**AC3: Gate 2 — Confidence threshold filter**

- **Given** a transcript segment with an average word confidence below the configured threshold (default: 0.6)
- **When** the Speech Quality Gate Lambda is invoked
- **Then** the response indicates rejection with reason `LOW_CONFIDENCE`

**AC4: Gate 3 — Entropy check**

- **Given** a transcript segment with character entropy below the configured threshold (indicating repetitive noise patterns like "uh uh uh uh")
- **When** the Speech Quality Gate Lambda is invoked
- **Then** the response indicates rejection with reason `LOW_ENTROPY`

**AC5: Gate 4 — Gibberish filter**

- **Given** a transcript segment that contains no recognisable English words above a dictionary-match threshold
- **When** the Speech Quality Gate Lambda is invoked
- **Then** the response indicates rejection with reason `GIBBERISH`

**AC6: Valid speech passes all gates**

- **Given** a transcript segment that exceeds minimum length, has high confidence, normal entropy, and recognisable words
- **When** the Speech Quality Gate Lambda is invoked
- **Then** the response indicates `PASS` with the original transcript returned

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals (four-gate speech quality filter)
- Linked test cases: e2e/phase-06-noise-monitor/noise-monitor.test.ts (T6.E1, T6.E2)
- ADRs referenced: ADR-010

### Estimates

- Complexity: M
- Confidence: High

---

## Story 6.2: Noise Monitor Step Functions State Machine

**As a** platform engineer
**I want** a Step Functions Express Workflow that tracks per-contact noise rejection counts and escalates through intervention states
**So that** callers in persistently noisy environments receive spoken feedback and eventual call termination

### Acceptance Criteria

**AC1: State machine exists and is ACTIVE**

- **Given** the Noise Monitor stack has been deployed
- **When** I describe the state machine via the AWS SDK
- **Then** the state machine exists with type `EXPRESS`
- **And** its status is `ACTIVE`

**AC2: Counter increment on noise rejection**

- **Given** a speech quality gate rejection event
- **When** the state machine is executed with the rejection payload
- **Then** the noise counter for that contactId is incremented in DynamoDB
- **And** the current count is returned in the execution output

**AC3: First intervention threshold**

- **Given** the noise counter for a contact reaches the first threshold (default: 3 consecutive rejections)
- **When** the state machine execution evaluates the counter
- **Then** the output includes `action: INTERVENE` with the intervention message text
- **And** the counter is not reset

**AC4: Circuit-breaker activation**

- **Given** the noise counter for a contact reaches the circuit-breaker threshold (default: 10 consecutive rejections)
- **When** the state machine execution evaluates the counter
- **Then** the output includes `action: END_CALL` with a graceful termination message
- **And** a CloudWatch metric `NoiseCircuitBreakerActivated` is emitted

**AC5: Counter reset on valid speech**

- **Given** a contact has accumulated noise rejections
- **When** the state machine receives a `PASS` event (valid speech detected)
- **Then** the noise counter for that contactId is reset to zero in DynamoDB

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals (Step Functions state machine, counter tracking, circuit-breaker)
- Linked test cases: e2e/phase-06-noise-monitor/noise-monitor.test.ts (T6.E3, T6.E4)
- ADRs referenced: ADR-010

### Estimates

- Complexity: L
- Confidence: Medium

---

## Story 6.3: Noise Monitoring Observability

**As an** operations engineer
**I want** CloudWatch metrics and alarms for speech quality gate outcomes and noise interventions
**So that** I can monitor call quality trends and respond to systemic noise issues

### Acceptance Criteria

**AC1: Custom metrics emitted**

- **Given** the Speech Quality Gate Lambda processes a transcript segment
- **When** the invocation completes
- **Then** a CloudWatch metric `SpeechGateOutcome` is emitted with dimensions `Gate` (1–4) and `Result` (PASS/REJECT)

**AC2: Intervention metric emitted**

- **Given** the Noise Monitor state machine triggers an intervention
- **When** the state machine execution completes
- **Then** a CloudWatch metric `NoiseIntervention` is emitted with dimension `Type` (INTERVENE/END_CALL)

**AC3: Alarm on high rejection rate**

- **Given** the CloudWatch metrics are flowing
- **When** the noise rejection rate exceeds 80% of utterances over a 5-minute window
- **Then** a CloudWatch alarm transitions to ALARM state

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals (CloudWatch metrics, alarms)
- Linked test cases: e2e/phase-06-noise-monitor/noise-monitor.test.ts (T6.E5)
- ADRs referenced: None

### Estimates

- Complexity: S
- Confidence: High

---

## Story 6.4: Cross-Stack Exports and Integration Points

**As a** platform engineer
**I want** the Noise Monitor stack to export the Speech Quality Gate Lambda ARN and state machine ARN
**So that** the orchestrator and future phases can reference these resources

### Acceptance Criteria

**AC1: Stack outputs contain resource identifiers**

- **Given** the Noise Monitor stack has been deployed
- **When** I describe the stack outputs via CloudFormation
- **Then** outputs exist for Speech Quality Gate Lambda ARN and Noise Monitor State Machine ARN

**AC2: Outputs are non-empty and well-formed**

- **Given** the stack outputs are retrieved
- **When** I inspect each output value
- **Then** the Lambda ARN matches `arn:aws:lambda:*`
- **And** the State Machine ARN matches `arn:aws:states:*`

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Scope (cross-stack exports)
- Linked test cases: integration/phase-06-noise-monitor/noise-monitor.test.ts (T6.I1, T6.I2)

### Estimates

- Complexity: S
- Confidence: High
