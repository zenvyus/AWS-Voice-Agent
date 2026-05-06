# Phase 05 User Stories: Intelligence Layer (Bedrock Agent & Tools)

## Story 5.1: Bedrock Agent Provisioned via IaC

**As a** platform engineer
**I want** an Amazon Bedrock Agent defined entirely in CDK
**So that** the intelligence layer is reproducible across environments without manual console steps

### Acceptance Criteria

**AC1: Agent resource exists after deploy**

- **Given** the Intelligence stack has been deployed to the target environment
- **When** I describe the Bedrock Agent via the AWS SDK
- **Then** the agent exists with status `PREPARED`
- **And** the agent's instruction prompt contains the "Rachel" airline persona description

**AC2: Agent alias is created and resolvable**

- **Given** the Bedrock Agent exists
- **When** I list agent aliases via the AWS SDK
- **Then** at least one alias exists with a routing configuration pointing to the agent version

**AC3: Agent uses the correct foundation model**

- **Given** the Bedrock Agent exists
- **When** I describe the agent
- **Then** the `foundationModel` field references an Anthropic Claude model

### Definition of Done

- [x] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [x] Documentation updated
- [x] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals (provision Bedrock Agent)
- Linked test cases: e2e/phase-05-intelligence/intelligence.test.ts (T5.1, T5.2, T5.3)
- ADRs referenced: ADR-007

### Estimates

- Complexity: M
- Confidence: High

---

## Story 5.2: Action Group with Airline Tools

**As a** platform engineer
**I want** a Bedrock Agent action group backed by a Lambda function with airline-domain tool definitions
**So that** the agent can execute structured actions (flight search, booking, seat selection) during conversations

### Acceptance Criteria

**AC1: Action group Lambda exists and is invocable**

- **Given** the Intelligence stack has been deployed
- **When** I invoke the action group Lambda with a test event
- **Then** the Lambda returns a successful response with status code 200
- **And** the Lambda runtime is Python 3.12

**AC2: Action group is attached to the agent**

- **Given** the Bedrock Agent exists
- **When** I list the agent's action groups via the AWS SDK
- **Then** at least one action group exists with the airline tools API schema

**AC3: Action group Lambda handles unknown action gracefully**

- **Given** the action group Lambda is deployed
- **When** I invoke it with an unrecognized action name
- **Then** the Lambda returns a structured error response indicating the action is not implemented
- **And** the response status code is 200 (Bedrock expects 200 with error body)

### Definition of Done

- [x] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [x] Documentation updated
- [x] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals (action groups with airline tools)
- Linked test cases: e2e/phase-05-intelligence/intelligence.test.ts (T5.4, T5.5)
- ADRs referenced: ADR-007

### Estimates

- Complexity: M
- Confidence: High

---

## Story 5.3: Knowledge Base with Bedrock Managed Vector Store

**As a** data/ML engineer
**I want** a Bedrock Knowledge Base using Bedrock's managed default vector store with an S3 data source
**So that** the agent can retrieve airline policy and FAQ information to ground its responses

### Acceptance Criteria

**AC1: Knowledge Base exists and is active**

- **Given** the Intelligence stack has been deployed
- **When** I describe the Knowledge Base via the AWS SDK
- **Then** the KB exists with status `ACTIVE`
- **And** it uses Bedrock's managed default vector store

**AC2: S3 data source is configured**

- **Given** the Knowledge Base exists
- **When** I list the KB's data sources
- **Then** at least one S3 data source exists pointing to the knowledge base documents bucket

**AC3: Knowledge Base handles empty data source gracefully**

- **Given** the KB data source bucket contains no documents
- **When** a sync is triggered
- **Then** the sync completes without error (zero documents indexed)

### Definition of Done

- [x] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [x] Documentation updated
- [x] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals (Knowledge Base with Bedrock managed vector store)
- Linked test cases: e2e/phase-05-intelligence/intelligence.test.ts (T5.5, T5.7)
- ADRs referenced: ADR-009

### Estimates

- Complexity: L
- Confidence: Medium

---

## Story 5.4: Cross-Stack Exports for Downstream Consumption

**As a** platform engineer
**I want** the Intelligence stack to export Agent ID, Agent Alias ID, and Knowledge Base ID as CloudFormation outputs
**So that** downstream stacks and the orchestrator can reference these resources

### Acceptance Criteria

**AC1: Stack outputs contain agent identifiers**

- **Given** the Intelligence stack has been deployed
- **When** I describe the stack outputs via CloudFormation
- **Then** outputs exist for Agent ID, Agent Alias ID, and Knowledge Base ID

**AC2: Outputs are non-empty and well-formed**

- **Given** the stack outputs are retrieved
- **When** I inspect each output value
- **Then** Agent ID matches the pattern of a Bedrock Agent ID (alphanumeric, 10 chars)
- **And** Knowledge Base ID is a non-empty string

### Definition of Done

- [x] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [x] Documentation updated
- [x] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals (cross-stack exports)
- Linked test cases: integration/phase-05-intelligence/intelligence.test.ts (T5.I1–T5.I3)

### Estimates

- Complexity: S
- Confidence: High
