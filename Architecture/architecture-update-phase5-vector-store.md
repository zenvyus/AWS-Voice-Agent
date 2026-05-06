# Architecture Update: Phase 5 — Vector Store Change

> **Purpose:** This document captures the architectural change from OpenSearch Serverless to Bedrock Managed Vector Store for the Knowledge Base component. Use this to update `AWS_AI_Voice_Agent_Architecture_v1.docx`.

---

## Change Summary

| Aspect             | Previous (ADR-008)                                 | Current (ADR-009)                    |
| ------------------ | -------------------------------------------------- | ------------------------------------ |
| Vector Store       | Amazon OpenSearch Serverless (AOSS)                | Bedrock Managed Default Vector Store |
| Index Creation     | Lambda custom resource (SigV4 signed API)          | Automatic (Bedrock-managed)          |
| Encryption         | KMS via AOSS encryption policy                     | AWS-managed (Bedrock internal)       |
| Network Policy     | AOSS network policy (public access)                | Not applicable (Bedrock-managed)     |
| Data Access Policy | AOSS data access policy (IAM principals)           | Not applicable (Bedrock-managed)     |
| CDK Resources      | CfnCollection, 3 policies, custom Lambda, Provider | None — omit `storageConfiguration`   |

---

## Updated Architecture Diagram (Phase 5: Intelligence Layer)

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

---

## Components Removed

- ~~Amazon OpenSearch Serverless Collection~~ (`airline-kb-{env}`)
- ~~AOSS Encryption Policy~~ (`airline-kb-{env}-enc`)
- ~~AOSS Network Policy~~ (`airline-kb-{env}-net`)
- ~~AOSS Data Access Policy~~ (`airline-kb-{env}-access`)
- ~~Index Creator Lambda~~ (`aoss-index-creator-{env}`)
- ~~Index Checker Lambda~~ (`aoss-index-checker-{env}`)
- ~~Index Creator IAM Role~~ (`aoss-index-creator-role-{env}`)
- ~~CDK Provider framework resources~~ (waiter state machine, framework Lambdas)

## Components Retained (unchanged)

- **Bedrock Agent** (`airline-voice-agent-{env}`) — Claude 3 Sonnet, Rachel persona
- **Bedrock Agent Alias** (`live`)
- **Action Group Lambda** (`agent-tools-{env}`) — Python 3.12, VPC-placed
- **Bedrock Knowledge Base** (`airline-voice-kb-{env}`) — VECTOR type, Bedrock-managed storage
- **S3 KB Documents Bucket** (`airline-voice-kb-docs-{accountId}-{region}`)
- **KB IAM Role** (`airline-voice-kb-role-{env}`) — `bedrock:InvokeModel`, `s3:GetObject`
- **Agent IAM Role** (`airline-voice-agent-bedrock-{env}`)

---

## IAM Changes

### Knowledge Base Role (updated)

| Action                          | Resource                      | Status      |
| ------------------------------- | ----------------------------- | ----------- |
| ~~`aoss:APIAccessAll`~~         | ~~OpenSearch collection ARN~~ | **Removed** |
| `bedrock:InvokeModel`           | Embedding model ARN           | Retained    |
| `s3:GetObject`, `s3:ListBucket` | KB documents bucket           | Retained    |

---

## Rationale

OpenSearch Serverless data access policies take an indeterminate time to propagate (>15 minutes observed), making fully automated single-command IaC deployment impossible. The Lambda custom resource consistently failed with HTTP 403 Forbidden even with:

- Explicit IAM role names for predictable ARNs
- Async polling (CDK Provider `isComplete` pattern) with 15-minute timeout
- Multiple retry strategies

Bedrock's managed default vector store provides identical RAG retrieval functionality with zero external infrastructure, eliminating the deployment blocker entirely.

---

## Decision Record

- **ADR-008** (OpenSearch Serverless): **Superseded**
- **ADR-009** (Bedrock Default Vector Store): **Accepted**

See `docs/phases/phase-05-intelligence/decisions/` for full ADR documents.
