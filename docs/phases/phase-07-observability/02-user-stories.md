# Phase 07 User Stories: Observability & Dashboards

## Story 7.1: Unified CloudWatch Dashboard

**As an** Operations Engineer
**I want** a single CloudWatch dashboard showing all system components
**So that** I can monitor overall system health at a glance without navigating multiple consoles

### Acceptance Criteria

**AC1: Dashboard exists per environment**

- **Given** the Observability stack is deployed to an environment
- **When** I query CloudWatch for dashboards with the name `airline-voice-agent-{env}`
- **Then** the dashboard exists and returns a valid dashboard body

**AC2: Dashboard includes Lambda widgets**

- **Given** the dashboard is deployed
- **When** I inspect the dashboard body
- **Then** it contains widgets for all deployed Lambda functions (speech-quality-gate, agent-tools, session-bootstrap)
- **And** each widget shows Invocations, Errors, Duration, and Throttles metrics

**AC3: Dashboard includes Step Functions widget**

- **Given** the dashboard is deployed
- **When** I inspect the dashboard body
- **Then** it contains a widget for the Noise Monitor state machine
- **And** the widget shows ExecutionsStarted, ExecutionsFailed, and ExecutionTime metrics

**AC4: Dashboard includes Fargate widget**

- **Given** the dashboard is deployed
- **When** I inspect the dashboard body
- **Then** it contains a widget for the Orchestrator ECS service
- **And** the widget shows CPUUtilization, MemoryUtilization, and RunningTaskCount metrics

**AC5: Dashboard includes DynamoDB widgets**

- **Given** the dashboard is deployed
- **When** I inspect the dashboard body
- **Then** it contains widgets for DynamoDB tables (sessions, noise-counters)
- **And** each widget shows ConsumedReadCapacityUnits, ConsumedWriteCapacityUnits, and ThrottledRequests

**AC6: Dashboard includes custom business metrics**

- **Given** the dashboard is deployed
- **When** I inspect the dashboard body
- **Then** it contains a widget for the AirlineVoiceAgent namespace custom metrics
- **And** it shows NoiseRejectionCount, SpeechPassCount metrics

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.1
- Linked test cases: e2e/phase-07-observability/dashboard.test.ts
- ADRs referenced: None

### Estimates

- Complexity: M
- Confidence: High

---

## Story 7.2: Structured JSON Logging

**As an** On-call Engineer
**I want** all Lambdas to emit structured JSON logs with correlation IDs
**So that** I can trace a single call through all components and quickly diagnose issues

### Acceptance Criteria

**AC1: Logging utility exists**

- **Given** the observability stack is deployed
- **When** I inspect the Lambda layer or shared code
- **Then** a structured logging utility exists that outputs JSON with fields: timestamp, level, correlationId, service, message, and optional metadata

**AC2: Correlation ID propagated**

- **Given** a Lambda is invoked with an event containing a correlationId field
- **When** the Lambda logs during execution
- **Then** every log entry includes the correlationId from the event
- **And** if no correlationId is provided, a new UUID is generated

**AC3: Speech Quality Gate uses structured logging**

- **Given** the speech-quality-gate Lambda is invoked
- **When** it processes a transcript
- **Then** all log output is valid JSON with the required structured fields

**AC4: Error logs include stack traces**

- **Given** a Lambda encounters an unhandled exception
- **When** the error is logged
- **Then** the log entry includes level="ERROR", the error message, and a stackTrace field

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.2
- Linked test cases: e2e/phase-07-observability/logging.test.ts
- ADRs referenced: None

### Estimates

- Complexity: M
- Confidence: High

---

## Story 7.3: Composite Alarm for System Health

**As an** Operations Engineer
**I want** a composite alarm that reflects overall system health
**So that** I receive a single actionable alert when the system is degraded rather than multiple noisy individual alarms

### Acceptance Criteria

**AC1: Composite alarm exists**

- **Given** the Observability stack is deployed
- **When** I query CloudWatch alarms
- **Then** a composite alarm named `airline-voice-agent-{env}-system-health` exists

**AC2: Composite alarm references child alarms**

- **Given** the composite alarm exists
- **When** I inspect its alarm rule
- **Then** it references the Noise Monitor high-rejection alarm
- **And** it references any Lambda error alarms
- **And** it uses OR logic (any child alarm triggers the composite)

**AC3: SNS topic for alarm notifications**

- **Given** the Observability stack is deployed
- **When** I query SNS topics
- **Then** a topic named `airline-voice-agent-{env}-alarms` exists
- **And** the composite alarm's action is configured to publish to this topic

**AC4: Composite alarm transitions correctly**

- **Given** all child alarms are in OK state
- **When** one child alarm transitions to ALARM
- **Then** the composite alarm transitions to ALARM
- **And** a notification is published to the SNS topic

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.3
- Linked test cases: e2e/phase-07-observability/alarms.test.ts
- ADRs referenced: None

### Estimates

- Complexity: M
- Confidence: High

---

## Story 7.4: Runbook Index

**As an** On-call Engineer
**I want** every alarm to link to a runbook with diagnosis and recovery steps
**So that** I can quickly resolve issues without tribal knowledge

### Acceptance Criteria

**AC1: Runbook index exists**

- **Given** the docs/runbooks/ directory exists
- **When** I inspect its contents
- **Then** an index.md file exists listing all runbooks

**AC2: Every alarm has a runbook entry**

- **Given** the system has deployed alarms
- **When** I cross-reference alarms with the runbook index
- **Then** every alarm name has a corresponding runbook entry with diagnosis steps and recovery procedures

**AC3: Runbook format is consistent**

- **Given** any runbook file
- **When** I inspect its structure
- **Then** it contains sections: Overview, Components, Diagnosis, Recovery, Rollback, Metrics, and Escalation

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.5
- Linked test cases: unit/observability.test.ts (runbook validation)
- ADRs referenced: None

### Estimates

- Complexity: S
- Confidence: High

---

## Story 7.5: Lambda Error Alarms

**As an** Operations Engineer
**I want** CloudWatch alarms on all Lambda function error rates
**So that** I am notified when any function starts failing above threshold

### Acceptance Criteria

**AC1: Error alarm per Lambda**

- **Given** the Observability stack is deployed
- **When** I query CloudWatch alarms
- **Then** an alarm exists for each Lambda function with pattern `{function-name}-error-rate`
- **And** each alarm triggers when error rate exceeds 5% over 5 minutes

**AC2: Alarms publish to SNS topic**

- **Given** a Lambda error alarm exists
- **When** I inspect its alarm actions
- **Then** it publishes to the `airline-voice-agent-{env}-alarms` SNS topic

**AC3: Alarm uses appropriate evaluation period**

- **Given** a Lambda error alarm exists
- **When** I inspect its configuration
- **Then** evaluation periods are 5 minutes with 1 datapoint to alarm

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.3, 3.4
- Linked test cases: e2e/phase-07-observability/alarms.test.ts
- ADRs referenced: None

### Estimates

- Complexity: S
- Confidence: High
