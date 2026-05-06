# ADR-008: OpenSearch Serverless for Knowledge Base Vector Store

## Status

Superseded by [ADR-009: Bedrock Default Vector Store](./ADR-009-bedrock-default-vector-store.md)

## Context

The Bedrock Knowledge Base requires a vector store to index and retrieve document embeddings. Available options include Amazon OpenSearch Serverless, Amazon Aurora PostgreSQL with pgvector, Pinecone, and Redis with vector search. The choice affects cost, operational complexity, and integration with Bedrock.

## Decision

Use Amazon OpenSearch Serverless (AOSS) as the vector store for the Bedrock Knowledge Base.

## Consequences

**Positive:**

- Native Bedrock integration — AOSS is a first-class Bedrock KB storage option with zero-config index management.
- Serverless — no capacity planning, cluster management, or patching.
- Auto-scales based on indexing and search workload.
- Encryption at rest and in transit by default.
- Access policies via IAM — consistent with the rest of the stack.

**Negative:**

- Higher base cost than pgvector on existing Aurora cluster.
- Additional service to monitor (AOSS metrics in CloudWatch).
- AOSS has cold start latency for infrequent queries.

**Neutral:**

- Aurora pgvector would reuse existing infrastructure but couples the KB tightly to the relational database and requires manual index management.

## Alternatives Considered

**Aurora PostgreSQL with pgvector:**

- Reuses existing Phase 2 Aurora cluster.
- Rejected because Bedrock KB does not natively support Aurora pgvector as a storage backend (requires custom Lambda for retrieval), adding significant complexity.

**Pinecone:**

- Managed vector database with excellent performance.
- Rejected because it introduces an external vendor dependency outside AWS, complicating IAM and networking.

**Redis with vector search (ElastiCache):**

- Reuses existing Phase 2 Redis cluster.
- Rejected because Bedrock KB does not natively support Redis as a vector store backend.

## References

- [Amazon OpenSearch Serverless documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless.html)
- [Bedrock Knowledge Base storage options](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html)
- Phase 05 PRD: `../01-prd.md`
- Phase 05 TID: `../03-tid.md`
