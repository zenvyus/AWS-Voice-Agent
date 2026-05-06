# Phase 10 User Stories: Integration Testing & Hardening

## Story 10.1: Cross-Stack Call Flow Integration Tests

**As a** platform engineer
**I want** automated tests that validate the full inbound call flow across all stacks
**So that** I have confidence that cross-stack interactions work correctly after any deployment

### Acceptance Criteria

**AC1: Session bootstrap → DynamoDB write**

- **Given** the deployed test environment with all stacks healthy
- **When** the session-bootstrap Lambda is invoked with a valid Connect contact event
- **Then** a session record is created in the sessions DynamoDB table within 5 seconds
- **And** the record contains contactId, startTime, and status fields

**AC2: Transcript storage end-to-end**

- **Given** a session exists in DynamoDB
- **When** a simulated transcript payload is written by the orchestrator
- **Then** the transcript appears in the S3 transcripts bucket within 10 seconds
- **And** the object is encrypted with the transcript KMS key

**AC3: Intelligence layer retrieval**

- **Given** the Bedrock agent and knowledge base are deployed
- **When** the agent-tools Lambda is invoked with a lookup query
- **Then** a response is returned within 10 seconds
- **And** the response contains structured data matching the expected schema

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Tests added to regression suite
- [ ] Documentation updated

### Traceability

- Maps to PRD section: Goals (cross-stack integration coverage)
- Linked test cases: e2e/phase-10-integration/call-flow.test.ts

### Estimates

- Complexity: M
- Confidence: High

---

## Story 10.2: Contract Tests for Internal Interfaces

**As a** platform engineer
**I want** contract tests that validate the data shapes exchanged between services
**So that** interface-breaking changes are caught before they reach the test environment

### Acceptance Criteria

**AC1: Lambda → DynamoDB session schema**

- **Given** the session-bootstrap Lambda produces a session record
- **When** the record is validated against the defined session schema
- **Then** all required fields are present with correct types
- **And** no unexpected fields exist

**AC2: Orchestrator → S3 transcript schema**

- **Given** the orchestrator writes a transcript object
- **When** the object metadata is inspected
- **Then** it contains required metadata keys (contactId, timestamp, format)
- **And** the body is valid JSON matching the transcript schema

**AC3: Agent tools response contract**

- **Given** the agent-tools Lambda returns flight data
- **When** the response is validated against the tools API schema
- **Then** the response matches the OpenAPI schema defined in api-schema.json
- **And** error responses follow the standard error envelope

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Contract schemas defined as JSON Schema or Zod validators
- [ ] Tests added to unit test suite (fast, no AWS calls)
- [ ] Documentation updated

### Traceability

- Maps to PRD section: Goals (contract tests)
- Linked test cases: unit/contracts.test.ts

### Estimates

- Complexity: M
- Confidence: High

---

## Story 10.3: Load Testing Harness

**As a** platform engineer
**I want** a repeatable load test that simulates concurrent call sessions
**So that** I can verify the system handles expected production load without errors

### Acceptance Criteria

**AC1: Load test runs to completion**

- **Given** the test environment is deployed and healthy
- **When** a k6 load test is executed with 100 virtual users for 5 minutes
- **Then** the test completes without crashing
- **And** results are written to a report file

**AC2: Zero error rate under load**

- **Given** the load test is running with 100 VUs
- **When** 5 minutes of sustained traffic completes
- **Then** the HTTP error rate is < 1%
- **And** no ECS tasks crash during the test window

**AC3: Load test is automated in CI (optional gate)**

- **Given** the load test script exists
- **When** a CI workflow step invokes the load test
- **Then** results are captured as artifacts
- **And** the step fails if error rate exceeds threshold

### Definition of Done

- [ ] Load test script exists (k6 or Artillery)
- [ ] Can be run with a single command
- [ ] Results exported to JSON/HTML report
- [ ] Documentation includes load test instructions

### Traceability

- Maps to PRD section: Goals (prove stability under load)
- Linked test cases: load/load-test.js

### Estimates

- Complexity: L
- Confidence: Medium

---

## Story 10.4: Latency Budget Validation

**As a** platform engineer
**I want** automated tests that assert P95 latency stays within budget
**So that** latency regressions are caught before production deployment

### Acceptance Criteria

**AC1: Lambda cold-start latency**

- **Given** a freshly deployed Lambda (no warm instances)
- **When** invoked 20 times in sequence
- **Then** P95 execution time is < 3 seconds
- **And** P50 execution time is < 1.5 seconds

**AC2: End-to-end response time**

- **Given** a simulated call session
- **When** a request traverses session-bootstrap → orchestrator → agent-tools → response
- **Then** total P95 latency is < 5 seconds
- **And** individual component times are logged for profiling

**AC3: DynamoDB latency**

- **Given** the sessions table exists with data
- **When** 50 GetItem requests are made in parallel
- **Then** P95 response time is < 50 ms
- **And** no throttle exceptions occur

### Definition of Done

- [ ] Latency tests pass in test environment
- [ ] Thresholds are configurable
- [ ] Tests added to E2E suite
- [ ] Documentation updated

### Traceability

- Maps to PRD section: Goals (latency budget validation)
- Linked test cases: e2e/phase-10-integration/latency.test.ts

### Estimates

- Complexity: M
- Confidence: High

---

## Story 10.5: Failure Injection & Alarm Validation

**As an** on-call engineer
**I want** proof that alarms fire correctly when components fail
**So that** I have confidence the monitoring system will alert me during real incidents

### Acceptance Criteria

**AC1: ECS task failure triggers alarm**

- **Given** the orchestrator ECS service is running
- **When** a task is stopped via AWS API (simulating crash)
- **Then** the ECS-related CloudWatch alarm transitions to ALARM within 5 minutes
- **And** the circuit breaker prevents cascading failures

**AC2: Lambda error spike triggers alarm**

- **Given** a Lambda function is deployed and healthy
- **When** 10 invocations are forced to error (via invalid input)
- **Then** the per-Lambda error alarm transitions to ALARM
- **And** the composite system-health alarm fires

**AC3: System recovers after injection**

- **Given** a failure has been injected and alarm is firing
- **When** the failure condition is removed (task restarts, valid input resumes)
- **Then** the alarm returns to OK within 10 minutes
- **And** the service is fully operational

### Definition of Done

- [ ] Failure injection tests pass
- [ ] Tests clean up after themselves (restore healthy state)
- [ ] Alarm validation confirmed
- [ ] Documented in DR runbook as validation procedure

### Traceability

- Maps to PRD section: Goals (failure injection, alarm validation)
- Linked test cases: e2e/phase-10-integration/failure-injection.test.ts

### Estimates

- Complexity: L
- Confidence: Medium

---

## Story 10.6: Coverage Gap Backfill

**As a** platform engineer
**I want** any missing integration tests for existing stacks to be added
**So that** the regression suite provides comprehensive protection

### Acceptance Criteria

**AC1: Every stack has at least one integration test**

- **Given** the current test inventory
- **When** a coverage analysis is performed
- **Then** every deployed stack has at least one integration test exercising its resources
- **And** any missing tests are added

**AC2: Regression suite includes all phases**

- **Given** the regression suite file
- **When** all phase E2E test imports are checked
- **Then** phases 1–10 are all imported
- **And** the suite runs cleanly end-to-end

**AC3: Test commands documented**

- **Given** the project README or test plan
- **When** an engineer reads test documentation
- **Then** all test commands are documented (unit, integration, e2e, regression, load, phase)
- **And** each command works as documented

### Definition of Done

- [ ] Coverage analysis complete
- [ ] Missing tests added
- [ ] Regression suite updated
- [ ] README updated with all test commands

### Traceability

- Maps to PRD section: Goals (coverage gap analysis)
- Linked test cases: regression.suite.ts

### Estimates

- Complexity: S
- Confidence: High
