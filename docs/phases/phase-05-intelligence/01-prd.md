# Phase 05 PRD: Intelligence Layer (Bedrock Agent & Tools)

## 1. Overview

This phase provisions the AI intelligence layer that powers the airline voice agent's conversational ability. It creates an Amazon Bedrock Agent with action groups (tools) for flight lookup, booking management, and FAQ retrieval, backed by a Bedrock Knowledge Base using Bedrock's managed default vector store for retrieval-augmented generation (RAG). The orchestrator service (Phase 4) will invoke the Bedrock Agent to generate contextual, grounded responses during live calls.

## 2. Background and Context

Phases 1–4 established networking, persistent storage, the Amazon Connect media pipeline, and the Fargate orchestrator service. The orchestrator currently runs a placeholder container with no AI capability. This phase adds the "brain" — a managed Bedrock Agent that the orchestrator calls to interpret caller intent, execute airline-domain tools, and produce grounded responses using airline policy documents stored in a knowledge base.

- [Phase 02 — Data Layer](../phase-02-data-layer/00-phase-summary.md): DynamoDB tables, Aurora, S3 buckets, KMS keys.
- [Phase 03 — Connect & Media](../phase-03-connect-media/00-phase-summary.md): Connect instance, KVS, session bootstrap Lambda.
- [Phase 04 — Orchestrator](../phase-04-orchestrator/00-phase-summary.md): ECS Fargate service, NLB, ECR.

## 3. Goals and Non-Goals

### Goals

- Provision an Amazon Bedrock Agent with a defined instruction prompt for the "Rachel" airline agent persona.
- Create action groups that expose airline-domain tools (flight search, booking creation, booking lookup, seat selection) as Lambda-backed functions.
- Provision a Bedrock Knowledge Base using Bedrock's managed default vector store for RAG over airline policy and FAQ documents.
- Create an S3 data source bucket for knowledge base ingestion.
- Configure a Bedrock Agent alias for versioned, stable invocation from the orchestrator.
- Grant the orchestrator task role permissions to invoke the agent.

### Non-Goals

- Implementing the actual orchestrator call loop (Phase 6+).
- Real-time audio streaming integration (already handled by Phase 3/4).
- Fine-tuning or custom model training.
- Production-grade prompt engineering — initial prompts will be functional; iteration follows in later phases.
- Polly lexicon for airline-specific pronunciation (future phase).

## 4. Target Users and Personas

- **Airline caller**: Phones in to check flights, make bookings, modify reservations, or ask policy questions. Interacts with the "Rachel" AI persona.
- **Platform engineer**: Deploys and maintains the intelligence infrastructure.
- **Data/ML engineer**: Manages knowledge base documents and prompt iterations.

## 5. User Problems and Jobs-to-be-Done

- **Caller**: "I want to ask about flight availability and get an accurate, policy-compliant answer without waiting on hold."
- **Caller**: "I want to make or look up a booking through a natural voice conversation."
- **Platform engineer**: "I need the AI inference layer to be fully defined in IaC so I can reproduce it across environments."
- **Data/ML engineer**: "I need a managed knowledge base I can update with new policy documents without code changes."

## 6. Success Metrics

| Metric                                     | Target                           | Measurement                                  |
| ------------------------------------------ | -------------------------------- | -------------------------------------------- |
| Bedrock Agent responds to test invocation  | 100% success                     | E2E test: invoke agent with sample utterance |
| Knowledge Base returns relevant passages   | ≥ 1 result for seeded test query | E2E test: retrieve from KB                   |
| All IaC resources deploy without error     | `cdk deploy` exits 0             | CI/CD pipeline                               |
| Agent alias is stable and invocable        | Alias ID resolvable              | Integration test                             |
| Action group Lambda responds to test event | 200 response                     | E2E test                                     |

- **Leading indicators**: Agent creation succeeds, KB sync completes, action group Lambda invocable.
- **Lagging indicators**: End-to-end caller conversations produce grounded responses (measured in Phase 6+).

## 7. Scope

### In Scope

- Bedrock Agent resource (CfnAgent) with instruction prompt.
- Bedrock Agent alias (CfnAgentAlias) for stable invocation.
- Bedrock Agent action group with OpenAPI schema defining airline tools.
- Action group Lambda function (Python 3.12, placeholder tool implementations).
- Bedrock Knowledge Base using Bedrock's managed default vector store.
- S3 data source for knowledge base document ingestion.
- IAM roles for Bedrock Agent execution, KB access, and data source sync.
- Cross-stack exports: Agent ID, Agent alias ID, KB ID.
- Unit, integration, and E2E tests.

### Out of Scope

- Real tool logic (flight search queries against Aurora, booking writes to DynamoDB) — placeholder stubs only.
- Prompt iteration and tuning.
- Guardrails configuration (future phase).
- Multi-turn conversation state management in the orchestrator.

## 8. Constraints and Assumptions

- Amazon Bedrock is available in `us-east-1` with Claude 3 Sonnet (or Haiku) model access.
- Bedrock Agent CDK support is via L1 constructs (`CfnAgent`, `CfnAgentAlias`, `CfnKnowledgeBase`, `CfnDataSource`).
- The caller's AWS account (`263611243147`) has Bedrock model access enabled for Anthropic Claude models.
- Knowledge base documents will be seeded with a sample FAQ markdown file for testing.

## 9. Dependencies

| Dependency              | Phase   | What is needed                                           |
| ----------------------- | ------- | -------------------------------------------------------- |
| VPC and private subnets | Phase 1 | Lambda VPC placement                                     |
| KMS data key            | Phase 2 | Encryption for S3 docs bucket                            |
| S3 assets bucket        | Phase 2 | Potential document source                                |
| DynamoDB tables         | Phase 2 | Action group stubs reference table names                 |
| Orchestrator task role  | Phase 4 | Needs `bedrock:InvokeAgent` permission (already granted) |

## 10. Risks and Mitigations

| Risk                                         | Likelihood | Impact | Mitigation                                                   |
| -------------------------------------------- | ---------- | ------ | ------------------------------------------------------------ |
| Bedrock Agent L1 construct API changes       | Low        | Medium | Pin CDK version; wrap in L3 construct                        |
| Model access not enabled in account          | Low        | High   | Verify model access before deploy; document enablement steps |
| Knowledge base sync fails on empty bucket    | Low        | Low    | Seed bucket with sample document in IaC                      |
| Bedrock Agent instruction prompt too generic | Medium     | Medium | Iterate in subsequent phases; functional for E2E testing now |

## 11. Open Questions

None — all questions resolved.

## 12. Approvals

| Role             | Name | Date       | Status   |
| ---------------- | ---- | ---------- | -------- |
| Product Owner    | —    | 2026-05-06 | Approved |
| Engineering Lead | —    | 2026-05-06 | Approved |
