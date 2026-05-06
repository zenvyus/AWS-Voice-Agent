# Phase 02 TID: Data Layer

## 1. Summary
Provisions all persistent data stores for the airline voice agent: KMS keys, DynamoDB tables (sessions, utterance queue, noise counters, airport codes), Aurora Serverless v2 (PostgreSQL 15), ElastiCache for Redis, and S3 buckets (transcripts, assets). All resources are encrypted, tagged, and deployed into the Phase 1 VPC.

## 2. Architecture Overview

```
┌─────────────────── Phase 1 VPC (10.0.0.0/16) ───────────────────┐
│                                                                   │
│  ┌─── Private Subnets ────────────────────────────────────────┐  │
│  │  Aurora Serverless v2 (PostgreSQL 15)                       │  │
│  │  ├── Writer instance (0.5–8 ACU)                           │  │
│  │  └── Security Group: inbound 5432 from VPC CIDR            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─── Isolated Subnets ───────────────────────────────────────┐  │
│  │  ElastiCache Redis (cache.t4g.micro, 1 node)               │  │
│  │  └── Security Group: inbound 6379 from VPC CIDR            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─── Regional (VPC Endpoint access) ─────────────────────────┐  │
│  │  DynamoDB Tables (on-demand, KMS encrypted)                 │  │
│  │  ├── voice-agent-sessions                                   │  │
│  │  ├── voice-agent-utterance-queue                            │  │
│  │  ├── voice-agent-noise-counters                             │  │
│  │  └── airport-codes                                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─── Regional (VPC Endpoint access) ─────────────────────────┐  │
│  │  S3 Buckets (versioned, KMS encrypted)                      │  │
│  │  ├── airline-voice-transcripts-{acct}-{region}              │  │
│  │  └── airline-voice-assets-{acct}-{region}                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─── KMS ────────────────────────────────────────────────────┐  │
│  │  alias/airline-voice-agent-data-key                          │  │
│  │  alias/airline-voice-agent-transcript-key                    │  │
│  └────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

## 3. Detailed Design

### 3.1 KMS Keys

| Key | Alias | Usage |
|-----|-------|-------|
| Data Key | `alias/airline-voice-agent-data-key` | DynamoDB, Aurora, ElastiCache, assets bucket |
| Transcript Key | `alias/airline-voice-agent-transcript-key` | Transcripts bucket (separate for compliance) |

Both keys: symmetric, single-region, 30-day pending deletion.

### 3.2 DynamoDB Tables

| Table | PK | SK | GSIs | TTL | Encryption |
|-------|----|----|------|-----|-----------|
| `voice-agent-sessions` | `contactId` (S) | — | — | `ttl` | Data key |
| `voice-agent-utterance-queue` | `contactId` (S) | `timestamp` (N) | — | `ttl` | Data key |
| `voice-agent-noise-counters` | `contactId` (S) | — | — | `ttl` | Data key |
| `airport-codes` | `iataCode` (S) | — | — | None | Data key |

All tables: PAY_PER_REQUEST billing, point-in-time recovery enabled, deletion protection in prod.

### 3.3 Aurora Serverless v2

| Setting | Dev Value | Prod Value |
|---------|-----------|-----------|
| Engine | PostgreSQL 15.4 | PostgreSQL 15.4 |
| Min ACU | 0.5 | 2 |
| Max ACU | 8 | 64 |
| Instances | 1 writer | 1 writer + 1 reader |
| Subnet group | Private subnets | Private subnets |
| IAM Auth | Enabled | Enabled |
| Storage Encryption | Data KMS key | Data KMS key |
| Backup Retention | 7 days | 35 days |
| Deletion Protection | false (dev) | true |

### 3.4 ElastiCache for Redis

| Setting | Dev Value | Prod Value |
|---------|-----------|-----------|
| Node Type | cache.t4g.micro | cache.r7g.large |
| Num Nodes | 1 | 3 (1 primary + 2 replicas) |
| Subnet Group | Isolated subnets | Isolated subnets |
| Encryption at rest | Yes (Data key) | Yes (Data key) |
| Encryption in transit | Yes | Yes |
| Auth | AUTH token in Secrets Manager | AUTH token in Secrets Manager |
| Engine Version | 7.1 | 7.1 |

### 3.5 S3 Buckets

| Bucket | Encryption | Versioning | Lifecycle | Public Access |
|--------|-----------|-----------|-----------|--------------|
| `airline-voice-transcripts-{acct}-{region}` | Transcript key | Yes | Glacier 90d, expire 7y | Blocked |
| `airline-voice-assets-{acct}-{region}` | Data key | Yes | None | Blocked |

### 3.6 Security
- All encryption uses customer-managed KMS keys
- Aurora uses IAM authentication (no passwords)
- ElastiCache AUTH token rotated via Secrets Manager
- Security groups restrict access to VPC CIDR only
- No public endpoints on any resource

### 3.7 Cross-Stack Exports

| Export Name | Value |
|-------------|-------|
| `{env}-DataKeyArn` | KMS data key ARN |
| `{env}-TranscriptKeyArn` | KMS transcript key ARN |
| `{env}-SessionsTableName` | DynamoDB sessions table |
| `{env}-UtteranceQueueTableName` | DynamoDB utterance queue table |
| `{env}-NoiseCountersTableName` | DynamoDB noise counters table |
| `{env}-AirportCodesTableName` | DynamoDB airport codes table |
| `{env}-AuroraClusterEndpoint` | Aurora writer endpoint |
| `{env}-AuroraClusterPort` | Aurora port |
| `{env}-RedisEndpoint` | ElastiCache primary endpoint |
| `{env}-RedisPort` | ElastiCache port |
| `{env}-TranscriptsBucketArn` | Transcripts bucket ARN |
| `{env}-AssetsBucketArn` | Assets bucket ARN |

## 4. Test Strategy

| ID | Type | Description | File |
|----|------|-------------|------|
| T2.1 | Unit | KMS keys with correct aliases | `infra/test/unit/data-layer.test.ts` |
| T2.2 | Unit | DynamoDB tables with correct schema and TTL | `infra/test/unit/data-layer.test.ts` |
| T2.3 | Unit | Aurora cluster in private subnets, encrypted | `infra/test/unit/data-layer.test.ts` |
| T2.4 | Unit | ElastiCache in isolated subnets, encrypted | `infra/test/unit/data-layer.test.ts` |
| T2.5 | Unit | S3 buckets versioned, encrypted, no public access | `infra/test/unit/data-layer.test.ts` |
| T2.6 | CI | `cdk synth` exits 0 | CI workflow |

## 5. Approvals
| Role | Name | Date | Status |
|------|------|------|--------|
| Engineering Lead | — | 2026-05-05 | Approved |
| Architect | — | 2026-05-05 | Approved |
