# Phase 03 TID: Amazon Connect & Media Transport

## 1. Summary

Provisions the telephony entry point and media pipeline: Amazon Connect instance, contact flow, Kinesis Video Streams, Transcribe custom vocabulary, Polly lexicon, and a session-bootstrap Lambda. All resources integrate with the Phase 1 VPC and Phase 2 data layer.

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Amazon Connect Instance                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  airline-voice-agent-flow (Contact Flow)                    │  │
│  │  ├── Set logging → CloudWatch                               │  │
│  │  ├── Set contact attributes (callerPhone, contactId)        │  │
│  │  ├── Invoke session-bootstrap Lambda                        │  │
│  │  ├── Start media streaming → KVS                            │  │
│  │  ├── Play greeting prompt (Polly Generative)                │  │
│  │  ├── Loop (hold for orchestrator-driven prompts)            │  │
│  │  └── Disconnect / Stop streaming                            │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐     ┌──────────────────────┐
│  Kinesis Video   │     │  session-bootstrap   │
│  Streams (KVS)   │     │  Lambda (Python 3.12)│
│  24h retention   │     │  → DynamoDB sessions │
│  KMS encrypted   │     │  (private subnets)   │
└─────────────────┘     └──────────────────────┘

┌────────────────────────────────────────────────┐
│  Speech Services Configuration                  │
│  ├── Transcribe: airline-domain-vocab-{env}     │
│  │   (IATA codes, fare classes, airline terms)  │
│  └── Polly: airline-lexicon-{env}               │
│      (airport code pronunciation)               │
└────────────────────────────────────────────────┘
```

## 3. Detailed Design

### 3.1 Amazon Connect Instance

| Setting                  | Value                        |
| ------------------------ | ---------------------------- |
| Instance Alias           | `airline-voice-agent-{env}`  |
| Identity Management      | `CONNECT_MANAGED`            |
| Inbound Calls            | Enabled                      |
| Outbound Calls           | Disabled                     |
| Contact Flow Logs        | Enabled                      |
| Media Streaming          | Enabled                      |
| S3 Storage (recordings)  | Assets bucket (Phase 2)      |
| S3 Storage (transcripts) | Transcripts bucket (Phase 2) |
| Encryption               | Data KMS key (Phase 2)       |

**Note:** Phone number claiming is a manual post-deploy step. The exit gate documents this requirement.

### 3.2 Contact Flow

A minimal contact flow defined as JSON in CDK:

1. **SetLoggingBehavior** — Enable CloudWatch logging
2. **SetContactAttributes** — Stamp `callerPhone`, `contactId`, `locale`
3. **InvokeLambda** — Call `session-bootstrap` to create DynamoDB session row
4. **StartMediaStreaming** — Open KVS for caller audio
5. **PlayPrompt** — Greeting via Polly Generative voice
6. **Loop** — Hold while orchestrator drives conversation (Phase 4)
7. **DisconnectParticipant** — End call and stop streaming

### 3.3 Kinesis Video Streams

| Setting                | Dev Value             |
| ---------------------- | --------------------- |
| Stream Name            | `connect-audio-{env}` |
| Data Retention (hours) | 24                    |
| Encryption             | Data KMS key          |

### 3.4 Transcribe Custom Vocabulary

Vocabulary name: `airline-domain-vocab-{env}`
Language: `en-US`

Includes:

- IATA airport codes (SYD, MEL, BNE, PER, LAX, SFO, JFK, LHR, SIN, NRT, etc.)
- Fare class letters (F, J, W, Y, B, M, H, Q)
- Airline terms (booking reference, frequent flyer, economy, business class)
- Phonetic hints for disambiguation

Deployed as an S3 asset referenced by a Custom Resource (CloudFormation does not natively support Transcribe vocabularies).

### 3.5 Polly Lexicon

Lexicon name: `airline-lexicon-{env}`

Includes SSML phoneme mappings for:

- Airport codes spoken as individual letters
- Fare class letters
- Common airline abbreviations

### 3.6 Session Bootstrap Lambda

| Setting       | Value                                                     |
| ------------- | --------------------------------------------------------- |
| Function Name | `session-bootstrap-{env}`                                 |
| Runtime       | Python 3.12                                               |
| Handler       | `index.handler`                                           |
| Memory        | 256 MB                                                    |
| Timeout       | 10 seconds                                                |
| VPC           | Private subnets                                           |
| Permissions   | DynamoDB PutItem (sessions table), KMS Decrypt (data key) |

The Lambda creates a session row with:

- `contactId` (PK)
- `callerPhone`
- `startTime`
- `status: "active"`
- `ttl` (24 hours from now)

### 3.7 IAM Roles

| Role                     | Permissions                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| Connect Service Role     | KVS PutMedia, S3 PutObject (recordings/transcripts), KMS Encrypt/Decrypt |
| Session Bootstrap Lambda | DynamoDB PutItem (sessions), KMS Decrypt, CloudWatch Logs                |
| Connect → Lambda Invoke  | `lambda:InvokeFunction` on session-bootstrap                             |

### 3.8 Cross-Stack Exports

| Export Name                       | Value                |
| --------------------------------- | -------------------- |
| `{env}-ConnectInstanceArn`        | Connect instance ARN |
| `{env}-ConnectInstanceId`         | Connect instance ID  |
| `{env}-ContactFlowId`             | Contact flow ID      |
| `{env}-KvsStreamArn`              | KVS stream ARN       |
| `{env}-SessionBootstrapLambdaArn` | Lambda function ARN  |

## 4. Test Strategy

| ID   | Type | Description                              | File                                    |
| ---- | ---- | ---------------------------------------- | --------------------------------------- |
| T3.1 | Unit | Connect instance with correct config     | `infra/test/unit/connect-media.test.ts` |
| T3.2 | Unit | Contact flow resource exists             | `infra/test/unit/connect-media.test.ts` |
| T3.3 | Unit | KVS stream with encryption and retention | `infra/test/unit/connect-media.test.ts` |
| T3.4 | Unit | Session bootstrap Lambda config          | `infra/test/unit/connect-media.test.ts` |
| T3.5 | Unit | IAM roles and permissions                | `infra/test/unit/connect-media.test.ts` |
| T3.6 | CI   | `cdk synth` exits 0                      | CI workflow                             |

## 5. Post-Deploy Manual Steps

1. Claim a phone number in the Connect console for the instance
2. Associate the phone number with the `airline-voice-agent-flow` contact flow
3. Test inbound dialling to verify greeting plays

## 6. Approvals

| Role             | Name | Date       | Status   |
| ---------------- | ---- | ---------- | -------- |
| Engineering Lead | —    | 2026-05-05 | Approved |
| Architect        | —    | 2026-05-05 | Approved |
