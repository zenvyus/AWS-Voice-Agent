# Phase 02 User Stories: Data Layer

## Story 2.1: KMS Encryption Keys

**As a** platform engineer
**I want** customer-managed KMS keys provisioned for data encryption
**So that** all data stores use consistent, auditable encryption under our control

### Acceptance Criteria

**AC1: Keys created**
- **Given** the data layer stack is synthesised
- **When** I inspect the CloudFormation template
- **Then** two KMS keys exist: one for general data, one for transcripts

**AC2: Key policies**
- **Given** the KMS keys
- **When** deployed
- **Then** key policies allow usage only by resources within the same account

**AC3: Aliases**
- **Given** the KMS keys
- **When** deployed
- **Then** aliases `alias/airline-voice-agent-data-key` and `alias/airline-voice-agent-transcript-key` exist

### Definition of Done
- [x] Acceptance criteria mapped to unit tests
- [ ] All tests pass
- [ ] Deployed to dev

---

## Story 2.2: DynamoDB Tables

**As a** platform engineer
**I want** DynamoDB tables for operational state
**So that** the orchestrator and tools can read/write session data with sub-10ms latency

### Acceptance Criteria

**AC1: Sessions table**
- **Given** the data layer stack
- **When** synthesised
- **Then** table `voice-agent-sessions` exists with PK `contactId` (S), billing mode PAY_PER_REQUEST, TTL on `ttl` attribute, encrypted with the data KMS key

**AC2: Utterance queue table**
- **Given** the data layer stack
- **When** synthesised
- **Then** table `voice-agent-utterance-queue` exists with PK `contactId` (S), SK `timestamp` (N), billing mode PAY_PER_REQUEST, TTL on `ttl`

**AC3: Noise counters table**
- **Given** the data layer stack
- **When** synthesised
- **Then** table `voice-agent-noise-counters` exists with PK `contactId` (S), billing mode PAY_PER_REQUEST, TTL on `ttl`

**AC4: Airport codes table**
- **Given** the data layer stack
- **When** synthesised
- **Then** table `airport-codes` exists with PK `iataCode` (S), billing mode PAY_PER_REQUEST, no TTL

**AC5: Point-in-time recovery**
- **Given** all DynamoDB tables
- **When** synthesised
- **Then** point-in-time recovery is enabled on all tables

---

## Story 2.3: Aurora Serverless v2 Cluster

**As a** platform engineer
**I want** an Aurora Serverless v2 PostgreSQL cluster in private subnets
**So that** transactional data (flights, bookings, passengers) has ACID guarantees

### Acceptance Criteria

**AC1: Cluster created**
- **Given** the data layer stack
- **When** synthesised
- **Then** an Aurora Serverless v2 cluster exists with engine PostgreSQL 15, min capacity 0.5 ACU, max capacity 8 ACU

**AC2: Network isolation**
- **Given** the Aurora cluster
- **When** deployed
- **Then** it is placed in private subnets with a security group allowing inbound 5432 only from the VPC CIDR

**AC3: Encryption**
- **Given** the Aurora cluster
- **When** deployed
- **Then** storage encryption uses the data KMS key

**AC4: IAM authentication**
- **Given** the Aurora cluster
- **When** deployed
- **Then** IAM database authentication is enabled

**AC5: No public access**
- **Given** the Aurora cluster
- **When** deployed
- **Then** `publiclyAccessible` is false

---

## Story 2.4: ElastiCache for Redis

**As a** platform engineer
**I want** an ElastiCache Redis cluster in isolated subnets
**So that** hot data (airport codes, filler audio) is served with microsecond latency

### Acceptance Criteria

**AC1: Cluster created**
- **Given** the data layer stack
- **When** synthesised
- **Then** a Redis replication group exists with node type `cache.t4g.micro` (dev), 1 replica

**AC2: Network isolation**
- **Given** the Redis cluster
- **When** deployed
- **Then** it is in isolated subnets with a security group allowing inbound 6379 only from the VPC CIDR

**AC3: Encryption**
- **Given** the Redis cluster
- **When** deployed
- **Then** encryption at rest and in transit are enabled

**AC4: Auth**
- **Given** the Redis cluster
- **When** deployed
- **Then** AUTH token is stored in Secrets Manager

---

## Story 2.5: S3 Buckets

**As a** platform engineer
**I want** S3 buckets for transcripts and assets
**So that** call recordings, transcripts, and audio assets are stored durably with encryption and versioning

### Acceptance Criteria

**AC1: Transcripts bucket**
- **Given** the data layer stack
- **When** synthesised
- **Then** bucket `airline-voice-transcripts-{account}-{region}` exists with versioning enabled, KMS encryption (transcript key), block all public access

**AC2: Assets bucket**
- **Given** the data layer stack
- **When** synthesised
- **Then** bucket `airline-voice-assets-{account}-{region}` exists with versioning enabled, KMS encryption (data key), block all public access

**AC3: Lifecycle rules**
- **Given** the transcripts bucket
- **When** deployed
- **Then** objects transition to Glacier after 90 days and expire after 7 years
