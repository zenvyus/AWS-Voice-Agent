# Phase 05 TID: Intelligence Layer (Bedrock Agent & Tools)

## 1. Summary

Provisions the AI intelligence layer as a new CDK stack (`IntelligenceStack`) containing an Amazon Bedrock Agent with an action group Lambda for airline-domain tools, a Bedrock Knowledge Base using Bedrock's managed default vector store for RAG, and the supporting IAM roles, S3 data source bucket, and cross-stack exports.

## 2. Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │       Orchestrator (Fargate)         │
                    │       bedrock:InvokeAgent            │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │       Bedrock Agent                  │
                    │       "Rachel" airline persona       │
                    │       Foundation Model: Claude 3     │
                    │                                     │
                    │  ┌──────────┐   ┌────────────────┐  │
                    │  │ Action   │   │ Knowledge Base │  │
                    │  │ Group    │   │ (RAG)          │  │
                    │  └────┬─────┘   └───────┬────────┘  │
                    └───────┼─────────────────┼───────────┘
                            │                 │
                 ┌──────────▼───┐   ┌─────────▼──────────┐
                 │ Action Group │   │ Bedrock Managed     │
                 │ Lambda       │   │ Vector Store        │
                 │ (tools stub) │   │ (default)           │
                 └──────────────┘   └─────────────────────┘
                                              │
                                    ┌─────────▼──────────┐
                                    │ S3 KB Documents     │
                                    │ Bucket              │
                                    └─────────────────────┘
```

### Major Components

- **IntelligenceStack** — new CDK stack, depends on DataLayerStack and NetworkingStack.
- **BedrockAgent construct** — wraps `CfnAgent`, `CfnAgentAlias`, `CfnAgentActionGroup`.
- **ActionGroupLambda construct** — Python 3.12 Lambda with placeholder tool stubs.
- **KnowledgeBase construct** — wraps `CfnKnowledgeBase`, `CfnDataSource`, S3 docs bucket. Uses Bedrock managed vector store (no external vector store infrastructure).

## 3. Detailed Design

### 3.1 Components

#### Bedrock Agent

| Setting              | Value                                                         |
| -------------------- | ------------------------------------------------------------- |
| Agent Name           | `airline-voice-agent-{env}`                                   |
| Foundation Model     | `anthropic.claude-3-sonnet-20240229-v1:0`                     |
| Idle Session Timeout | 600 seconds                                                   |
| Instruction          | Rachel persona prompt (airline CS rep, professional, concise) |

#### Bedrock Agent Alias

| Setting     | Value                                              |
| ----------- | -------------------------------------------------- |
| Alias Name  | `live`                                             |
| Description | Production-ready alias for orchestrator invocation |

#### Action Group

| Setting           | Value                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------- |
| Action Group Name | `airline-tools-{env}`                                                                   |
| API Schema        | OpenAPI 3.0 JSON defining: `searchFlights`, `createBooking`, `getBooking`, `selectSeat` |
| Lambda            | Action group Lambda ARN                                                                 |

#### Action Group Lambda

| Setting               | Value                                            |
| --------------------- | ------------------------------------------------ |
| Function Name         | `agent-tools-{env}`                              |
| Runtime               | Python 3.12                                      |
| Handler               | `index.handler`                                  |
| Memory                | 256 MB                                           |
| Timeout               | 30 seconds                                       |
| VPC                   | Private subnets (for future Aurora/Redis access) |
| Environment Variables | `SESSIONS_TABLE`, `ENVIRONMENT`                  |

Tool stubs return placeholder responses:

| Tool            | Stub Response                                              |
| --------------- | ---------------------------------------------------------- |
| `searchFlights` | Returns sample flight list JSON                            |
| `createBooking` | Returns sample booking confirmation with generated OrderID |
| `getBooking`    | Returns sample booking details                             |
| `selectSeat`    | Returns seat assignment confirmation                       |

### 3.2 Data Model

#### S3 KB Documents Bucket

| Setting             | Value                                        |
| ------------------- | -------------------------------------------- |
| Bucket Name         | `airline-voice-kb-docs-{accountId}-{region}` |
| Encryption          | KMS (data key from Phase 2)                  |
| Versioning          | Enabled                                      |
| Block Public Access | All blocked                                  |

No new DynamoDB tables. No migrations.

### 3.3 APIs and Contracts

#### Bedrock Agent Invocation (consumed by orchestrator)

```
POST bedrock-agent-runtime:InvokeAgent
  agentId: {exported from stack}
  agentAliasId: {exported from stack}
  sessionId: {contactId from call}
  inputText: {transcribed caller utterance}
```

#### Action Group Lambda Event Schema (Bedrock → Lambda)

```json
{
  "messageVersion": "1.0",
  "agent": { "name": "...", "id": "...", "alias": "...", "version": "..." },
  "inputText": "...",
  "sessionId": "...",
  "actionGroup": "airline-tools-{env}",
  "apiPath": "/searchFlights",
  "httpMethod": "GET",
  "parameters": [ { "name": "origin", "value": "JFK" }, ... ],
  "sessionAttributes": {},
  "promptSessionAttributes": {}
}
```

### 3.4 Infrastructure (IaC)

#### New Constructs

| Construct          | File                                   | Resources                                                                                                                |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `BedrockAgent`     | `lib/constructs/bedrock-agent.ts`      | CfnAgent, CfnAgentAlias, CfnAgentActionGroup, IAM role                                                                   |
| `AgentToolsLambda` | `lib/constructs/agent-tools-lambda.ts` | Lambda function, IAM role, log group                                                                                     |
| `KnowledgeBase`    | `lib/constructs/knowledge-base.ts`     | CfnKnowledgeBase, CfnDataSource, S3 bucket, IAM role (Bedrock managed vector store — no external vector store resources) |

#### New Stack

| Stack               | File                               |
| ------------------- | ---------------------------------- |
| `IntelligenceStack` | `lib/stacks/intelligence-stack.ts` |

#### IAM Roles

**Bedrock Agent Execution Role:**

| Action                  | Resource                |
| ----------------------- | ----------------------- |
| `bedrock:InvokeModel`   | Foundation model ARN    |
| `bedrock:Retrieve`      | Knowledge Base ARN      |
| `lambda:InvokeFunction` | Action group Lambda ARN |
| `s3:GetObject`          | KB documents bucket     |

**Knowledge Base Role:**

| Action                          | Resource            |
| ------------------------------- | ------------------- |
| `bedrock:InvokeModel`           | Embedding model ARN |
| `s3:GetObject`, `s3:ListBucket` | KB documents bucket |

**Action Group Lambda Role:**

| Action                                                   | Resource                          |
| -------------------------------------------------------- | --------------------------------- |
| `dynamodb:GetItem`, `dynamodb:Query`, `dynamodb:PutItem` | Sessions table ARN                |
| `kms:Decrypt`, `kms:GenerateDataKey`                     | Data key ARN                      |
| Managed policy                                           | `AWSLambdaVPCAccessExecutionRole` |

### 3.5 Security

- All data encrypted with customer-managed KMS keys (Phase 2 data key).
- Bedrock managed vector store encrypted by Bedrock (AWS-managed keys).
- Lambda in VPC private subnets — no public internet access except through NAT.
- No secrets stored; all configuration via environment variables and IAM.
- Bedrock Agent execution role follows least-privilege.

### 3.6 Observability

- Action group Lambda logs to CloudWatch `/aws/lambda/agent-tools-{env}`.
- Bedrock Agent invocation metrics available via CloudWatch Bedrock namespace.
- Log retention: 30 days (dev).

### 3.7 Performance and Scale

- Bedrock Agent: managed service, auto-scales.
- Bedrock managed vector store: fully managed by Bedrock, auto-scales.
- Action group Lambda: concurrent execution limit default (1000); sufficient for dev.
- Expected load (dev): < 10 concurrent agent invocations.
- Latency target: Agent response < 5 seconds for simple queries.

### 3.8 Failure Modes and Recovery

| Failure Mode                   | Detection                | Recovery                                                      |
| ------------------------------ | ------------------------ | ------------------------------------------------------------- |
| Bedrock Agent fails to prepare | Deploy error             | Check model access, re-deploy                                 |
| KB sync fails                  | CloudWatch alarm         | Check S3 permissions, re-sync                                 |
| Action group Lambda timeout    | CloudWatch Errors metric | Increase timeout or optimize                                  |
| Model access not enabled       | Agent invocation error   | Enable model access in Bedrock console (one-time manual step) |

**Rollback plan:** `cdk deploy` the previous stack version. All resources use `DESTROY` removal policy in dev.

## 4. Alternatives Considered

See [ADR-007](./decisions/ADR-007-bedrock-agent.md) and [ADR-009](./decisions/ADR-009-bedrock-default-vector-store.md). (ADR-008 superseded.)

## 5. Test Strategy

### Unit Tests

| ID    | Description                                                      |
| ----- | ---------------------------------------------------------------- |
| T5.U1 | Bedrock Agent resource exists with correct model and instruction |
| T5.U2 | Agent alias resource exists                                      |
| T5.U3 | Action group attached to agent                                   |
| T5.U4 | Action group Lambda with Python 3.12 runtime                     |
| T5.U5 | Knowledge Base resource with VECTOR type configuration           |
| T5.U6 | S3 KB documents bucket with encryption and versioning            |
| T5.U7 | IAM roles follow least-privilege                                 |
| T5.U8 | Cross-stack exports defined                                      |
| T5.U9 | `cdk synth` exits 0                                              |

### Integration Tests

| ID    | Description                          |
| ----- | ------------------------------------ |
| T5.I1 | Stack has BedrockAgentId output      |
| T5.I2 | Stack has BedrockAgentAliasId output |
| T5.I3 | Stack has KnowledgeBaseId output     |

### E2E Tests

| ID    | Description                                     |
| ----- | ----------------------------------------------- |
| T5.E1 | Bedrock Agent exists and is PREPARED            |
| T5.E2 | Agent alias exists and is routable              |
| T5.E3 | Action group Lambda exists and uses Python 3.12 |
| T5.E4 | Action group is attached to the agent           |
| T5.E5 | Knowledge Base exists and is ACTIVE             |
| T5.E7 | KB documents S3 bucket exists                   |
| T5.E8 | Stack exports agent and KB identifiers          |

### Acceptance Criteria → Test Mapping

| AC      | Test IDs            |
| ------- | ------------------- |
| 5.1 AC1 | T5.E1               |
| 5.1 AC2 | T5.E2               |
| 5.1 AC3 | T5.E1               |
| 5.2 AC1 | T5.E3               |
| 5.2 AC2 | T5.E4               |
| 5.3 AC1 | T5.E5               |
| 5.3 AC2 | T5.E7               |
| 5.4 AC1 | T5.I1, T5.I2, T5.I3 |
| 5.4 AC2 | T5.I1, T5.I2, T5.I3 |

## 6. Migration and Rollout

- Deploy order: Intelligence stack after Orchestrator stack.
- No feature flags required — agent is invoked only when orchestrator is updated (future phase).
- No data migrations.
- Backward compatible — no existing resources modified.

## 7. Dependencies and Sequencing

**Must land before this phase:**

- Phase 1: VPC and private subnets (Lambda VPC placement).
- Phase 2: KMS data key, S3 buckets, DynamoDB tables.
- Phase 4: Orchestrator stack (dependency chain).

**This phase enables:**

- Phase 6+: Orchestrator call loop integration with Bedrock Agent.
- Prompt iteration and guardrails configuration.

## 8. Story-to-Implementation Mapping

| Story ID | Components Touched                                    | Tests Added                  | Owner |
| -------- | ----------------------------------------------------- | ---------------------------- | ----- |
| 5.1      | BedrockAgent construct, IntelligenceStack             | T5.U1-U3, T5.E1-E2, T5.I1-I2 | —     |
| 5.2      | AgentToolsLambda construct, BedrockAgent action group | T5.U3-U4, T5.E3-E4           | —     |
| 5.3      | KnowledgeBase construct                               | T5.U5-U6, T5.E5-E7           | —     |
| 5.4      | IntelligenceStack exports                             | T5.U8, T5.I1-I3, T5.E8       | —     |

## 9. Open Technical Questions

None — all resolved.

## 10. Approvals

| Role                  | Name | Date       | Status   |
| --------------------- | ---- | ---------- | -------- |
| Engineering Lead      | —    | 2026-05-06 | Approved |
| Architect / Tech Lead | —    | 2026-05-06 | Approved |
| Security Reviewer     | —    | 2026-05-06 | Approved |
