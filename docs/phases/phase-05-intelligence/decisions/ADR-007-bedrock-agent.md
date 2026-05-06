# ADR-007: Bedrock Agent over Custom LLM Orchestration

## Status

Accepted

## Context

The voice agent needs an AI "brain" that interprets caller intent, executes structured airline-domain tools, and generates natural language responses. Two broad approaches exist: (1) use Amazon Bedrock Agents, a managed service that handles prompt chaining, tool use, and session state; (2) build a custom LLM orchestration layer using direct Bedrock `InvokeModel` calls with hand-rolled tool-use logic in the orchestrator.

## Decision

Use Amazon Bedrock Agents as the primary intelligence layer.

## Consequences

**Positive:**

- Managed tool-use loop — Bedrock Agents handle ReAct-style reasoning, parameter extraction, and multi-step tool chaining without custom code.
- Built-in session management — agent maintains conversation context across turns.
- Knowledge Base integration — native RAG retrieval without custom embedding/search pipeline.
- Reduced operational burden — no custom prompt-chaining code to maintain.
- Versioning and aliases — safe deployment of prompt/tool changes.

**Negative:**

- L1 CDK constructs only (`CfnAgent`) — less ergonomic than L2 constructs.
- Less control over intermediate reasoning steps compared to hand-rolled orchestration.
- Vendor lock-in to Bedrock Agent API surface.

**Neutral:**

- Action group Lambda is a standard Lambda — can be migrated to direct invocation if needed.

## Alternatives Considered

**Custom LLM orchestration in the Fargate service:**

- More control over prompt engineering and tool dispatch.
- Rejected because it significantly increases code complexity and maintenance burden for capabilities Bedrock Agents provide out of the box.

**LangChain/LlamaIndex agent framework:**

- Open-source agent frameworks with tool-use support.
- Rejected because they add a heavy dependency, and Bedrock Agents provide equivalent managed functionality without the operational overhead.

## References

- [Amazon Bedrock Agents documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- Phase 05 PRD: `../01-prd.md`
- Phase 05 TID: `../03-tid.md`
