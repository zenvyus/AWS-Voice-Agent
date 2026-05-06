# Phase NN TID: <Title>

## 1. Summary
One paragraph technical summary of what is being built.

## 2. Architecture Overview
- High-level diagram (component, deployment, or sequence as appropriate).
- Description of major components introduced or modified.
- How this fits into the broader system.

## 3. Detailed Design

### 3.1 Components
For each new or modified component:
- Responsibility
- Inputs and outputs
- Interfaces (API contracts, event schemas, message formats)
- Dependencies

### 3.2 Data Model
- New tables, collections, or schemas
- Migrations required (additive, then cleanup if destructive)
- Data retention and PII handling

### 3.3 APIs and Contracts
- Endpoints (path, method, request/response schemas)
- Event schemas (producer, consumer, payload, versioning)
- Idempotency, ordering, retry, and failure semantics

### 3.4 Infrastructure (IaC)
- New constructs and stacks introduced
- Resources created (Lambdas, queues, tables, state machines, etc.)
- IAM roles and least-privilege scopes
- Configuration values and where they live

### 3.5 Security
- AuthN / AuthZ approach
- Secrets handling
- Threat model summary (STRIDE or equivalent for new attack surface)
- Data classification and protection

### 3.6 Observability
- Logs (what, level, correlation strategy)
- Metrics (names, units, dimensions)
- Traces (spans, propagation)
- Alarms (condition, severity, runbook link)

### 3.7 Performance and Scale
- Expected load (peak, average, growth)
- Latency and throughput targets
- Bottlenecks and mitigations
- Cost estimate

### 3.8 Failure Modes and Recovery
- Known failure modes
- Detection approach
- Recovery procedure
- Rollback plan

## 4. Alternatives Considered
For each significant decision, document the options weighed and why the chosen path won. Link to or include ADRs.

## 5. Test Strategy
- Unit test approach and key cases
- Integration test approach and boundary mocks
- E2E test approach and scenarios
- Performance / load test plan if applicable
- Mapping from acceptance criteria to test cases

## 6. Migration and Rollout
- Deploy order
- Feature flags
- Backfills or data migrations
- Backward compatibility windows

## 7. Dependencies and Sequencing
What must land before this phase. What this phase enables.

## 8. Story-to-Implementation Mapping
| Story ID | Components Touched | Tests Added | Owner |
|----------|--------------------|-----------  |-------|

## 9. Open Technical Questions
Must be resolved before development starts.

## 10. Approvals
| Role | Name | Date | Status |
|------|------|------|--------|
| Engineering Lead | | | |
| Architect / Tech Lead | | | |
| Security Reviewer | | | |
| SRE / Ops Reviewer (if applicable) | | | |
