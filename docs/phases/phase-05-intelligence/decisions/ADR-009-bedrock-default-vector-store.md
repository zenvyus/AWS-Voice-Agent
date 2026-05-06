# ADR-009: Bedrock Default (Managed) Vector Store for Knowledge Base

## Status

Accepted

## Context

ADR-008 selected Amazon OpenSearch Serverless (AOSS) as the vector store for the Bedrock Knowledge Base. During implementation, deploying AOSS via CDK proved unreliable:

1. AOSS requires a pre-created vector index before the Bedrock Knowledge Base can reference it.
2. A Lambda-backed custom resource was needed to create the index via signed HTTPS requests.
3. The AOSS data access policy takes an indeterminate amount of time to propagate (observed >15 minutes in some cases), causing the custom resource to fail with HTTP 403 Forbidden — even with async polling and generous timeouts.
4. Multiple deployment attempts failed and rolled back, each requiring 15–20 minutes for AOSS collection deletion.

This made fully automated, single-command IaC deployment (`cdk deploy`) impossible without manual intervention or multi-step deploy scripts.

## Decision

Use Bedrock's managed default vector store by omitting `storageConfiguration` from the `CfnKnowledgeBase` resource. Bedrock automatically provisions and manages the underlying vector storage.

## Consequences

**Positive:**

- Single-command deployment — no custom resources, no pre-deploy scripts, no multi-stack sequencing.
- Zero operational overhead — Bedrock manages indexing, scaling, and storage lifecycle.
- Eliminates ~150 lines of AOSS infrastructure code (collection, encryption/network/data-access policies, custom resource Lambda, IAM roles).
- No propagation delay issues — Bedrock handles internal timing.
- Identical RAG retrieval behavior for the agent.

**Negative:**

- No direct access to query the vector index outside of Bedrock KB API.
- Cannot tune HNSW parameters, vector dimensions, or field mappings.
- Less cost visibility (bundled into Bedrock pricing rather than separate AOSS OCUs).
- Migration to AOSS or another store later requires resource replacement (not in-place update).

**Neutral:**

- For the airline voice agent use case (airline policy FAQs, booking rules), fine-grained vector store control is not required.
- Can revisit in a production hardening phase if retrieval quality tuning is needed.

## Alternatives Considered

**Keep AOSS with pre-deploy script (Option 1):**

- Run a TypeScript/Python script between stack deploys to create the index.
- Rejected because it breaks single-command IaC deployment and complicates CI/CD.

**Two-stack approach (Option 4):**

- Separate VectorStoreStack deploys first, IntelligenceStack second.
- Rejected due to added complexity and still requiring the custom resource (which fails due to AOSS policy propagation).

## References

- Supersedes: [ADR-008: OpenSearch Serverless for Knowledge Base](./ADR-008-opensearch-serverless-kb.md)
- [AWS::Bedrock::KnowledgeBase StorageConfiguration](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-bedrock-knowledgebase-storageconfiguration.html) — `StorageConfiguration` is optional
- Phase 05 TID: `../03-tid.md`
