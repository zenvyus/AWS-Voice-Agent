# Phase 03 User Stories: Amazon Connect & Media Transport

## Story 3.1: Amazon Connect Instance

**As a** platform engineer
**I want** an Amazon Connect instance provisioned via CDK
**So that** the voice agent has a telephony entry point for inbound calls

### Acceptance Criteria

**AC1: Instance created**

- **Given** the connect stack is synthesised
- **When** I inspect the CloudFormation template
- **Then** a `AWS::Connect::Instance` resource exists with identity management type and instance alias

**AC2: Storage configured**

- **Given** the Connect instance
- **When** deployed
- **Then** storage configs for call recordings, transcripts, and media streams reference the S3 buckets and KMS keys from Phase 2

---

## Story 3.2: Contact Flow

**As a** platform engineer
**I want** a basic contact flow defined in CDK
**So that** inbound calls are greeted and routed to the AI pipeline

### Acceptance Criteria

**AC1: Flow created**

- **Given** the connect stack
- **When** synthesised
- **Then** a `AWS::Connect::ContactFlow` resource exists with type CONTACT_FLOW

**AC2: Flow content**

- **Given** the contact flow
- **When** deployed
- **Then** the flow JSON includes: set logging, set contact attributes, play prompt, start media streaming, and disconnect blocks

---

## Story 3.3: Kinesis Video Stream

**As a** platform engineer
**I want** a Kinesis Video Stream provisioned for audio transport
**So that** caller audio can be streamed to the orchestrator in real time

### Acceptance Criteria

**AC1: Stream created**

- **Given** the connect stack
- **When** synthesised
- **Then** a `AWS::KinesisVideo::Stream` resource exists with 24-hour retention

**AC2: Encryption**

- **Given** the KVS stream
- **When** deployed
- **Then** the stream is encrypted with the data KMS key

---

## Story 3.4: Transcribe Custom Vocabulary

**As a** platform engineer
**I want** a custom vocabulary for Amazon Transcribe with airline domain terms
**So that** speech recognition accuracy is improved for IATA codes and airline terminology

### Acceptance Criteria

**AC1: Vocabulary file created**

- **Given** the infra assets
- **When** I inspect the vocabulary file
- **Then** it contains IATA airport codes, fare class letters, and common airline terms

**AC2: Vocabulary deployed**

- **Given** the connect stack
- **When** deployed
- **Then** a custom vocabulary named `airline-domain-vocab-{env}` exists in Transcribe

---

## Story 3.5: Polly Lexicon

**As a** platform engineer
**I want** a Polly lexicon for airline-specific pronunciation
**So that** text-to-speech output correctly pronounces airport codes and airline terms

### Acceptance Criteria

**AC1: Lexicon created**

- **Given** the connect stack
- **When** synthesised
- **Then** a Polly lexicon resource is defined via custom resource

---

## Story 3.6: Session Bootstrap Lambda

**As a** platform engineer
**I want** a Lambda function that initialises call sessions in DynamoDB
**So that** when a call arrives, a session record is created for the orchestrator

### Acceptance Criteria

**AC1: Lambda created**

- **Given** the connect stack
- **When** synthesised
- **Then** a Lambda function `session-bootstrap-{env}` exists with Python 3.12 runtime

**AC2: VPC placement**

- **Given** the Lambda function
- **When** deployed
- **Then** it runs in private subnets with access to DynamoDB via VPC endpoint

**AC3: Permissions**

- **Given** the Lambda function
- **When** deployed
- **Then** it has permissions to write to the sessions DynamoDB table and decrypt with the data KMS key

**AC4: Connect invocation**

- **Given** the Lambda function
- **When** deployed
- **Then** Connect has permission to invoke it
