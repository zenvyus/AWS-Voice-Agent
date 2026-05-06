# Phase 02 PRD: Data Layer

## 1. Overview
This phase provisions the complete data layer for the airline voice agent: DynamoDB tables for operational state, Aurora Serverless v2 for transactional data, ElastiCache for Redis as a hot cache, S3 buckets for object storage, and customer-managed KMS keys for encryption at rest. All resources are deployed into the VPC established in Phase 1.

## 2. Background and Context
Phase 1 delivered the networking foundation (VPC, subnets, VPC endpoints). The data layer is the next prerequisite — the orchestrator, tool Lambdas, and intelligence layer all depend on these stores being available. No runtime code is deployed in this phase; only the infrastructure and access patterns are established.

## 3. Goals and Non-Goals

**Goals:**
- Provision DynamoDB tables for sessions, utterance queues, noise counters, and airport codes
- Provision Aurora Serverless v2 PostgreSQL cluster in private subnets with IAM authentication
- Provision ElastiCache for Redis cluster in isolated subnets
- Provision S3 buckets for transcripts, recordings, filler audio, and persona versions
- Provision customer-managed KMS keys for all encrypted resources
- Ensure all resources are tagged, encrypted, and accessible only from within the VPC
- Export resource identifiers (ARNs, endpoints) for downstream stacks

**Non-Goals:**
- No application schemas or migrations (deferred to service phases)
- No data seeding (airport codes, filler audio loaded in later phases)
- No Lambda or Fargate compute
- No Bedrock or AI service configuration

## 4. Target Users and Personas
- **Platform Engineer:** Provisions and maintains data infrastructure
- **Application Developer:** Consumes data store endpoints in service code (later phases)

## 5. User Problems and Jobs-to-be-Done
- Services need sub-10ms operational state (DynamoDB)
- Transactional queries need ACID guarantees (Aurora)
- Repeated lookups need microsecond cache hits (ElastiCache)
- Audit/compliance requires encrypted, versioned object storage (S3 + KMS)

## 6. Success Metrics
- `cdk synth` and `cdk deploy` succeed with zero errors
- All resources encrypted with customer-managed KMS keys
- Aurora cluster accessible from private subnets only (no public endpoint)
- ElastiCache accessible only from isolated subnets
- Unit tests validate all resource configurations

## 7. Scope

**In scope:**
- KMS keys (data-key, transcript-key)
- DynamoDB tables (4 tables with GSIs and TTL)
- Aurora Serverless v2 cluster (PostgreSQL 15, min 0.5 ACU, max 8 ACU for dev)
- ElastiCache for Redis (single-node for dev, cluster mode off)
- S3 buckets (transcripts, assets)
- Security groups for Aurora and ElastiCache
- Cross-stack exports for resource ARNs and endpoints

**Out of scope:**
- Database schemas, migrations, or seed data
- Application code or Lambda functions
- Bedrock Knowledge Bases or OpenSearch

## 8. Constraints and Assumptions
- All resources deploy into the Phase 1 VPC (`vpc-0e63836fdde217b05`)
- Aurora and ElastiCache use private/isolated subnets only
- DynamoDB uses on-demand billing (no capacity planning needed)
- Aurora uses IAM authentication (no password-based access)
- Dev environment uses minimal capacity (0.5–8 ACU, single Redis node)

## 9. Dependencies
- Phase 1 networking stack (VPC, subnets, VPC endpoints)

## 10. Risks and Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Aurora cold start latency | Medium | Low | Min ACU set to 0.5 (not 0) to avoid full cold start |
| ElastiCache single-node failure in dev | Low | Low | Acceptable for dev; prod config will use Multi-AZ |
| KMS key deletion blocks decryption | Low | High | 30-day pending deletion window; key policy restricts delete |

## 11. Open Questions
None — all resolved.

## 12. Approvals
| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | — | 2026-05-05 | Approved |
| Engineering Lead | — | 2026-05-05 | Approved |
