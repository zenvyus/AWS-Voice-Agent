# Phase 03 PRD: Amazon Connect & Media Transport

## 1. Overview

This phase provisions Amazon Connect, Kinesis Video Streams for audio transport, Amazon Transcribe custom vocabulary, and Amazon Polly lexicon. Together, these form the telephony and media pipeline for inbound voice calls.

## 2. Background and Context

Phase 1 delivered networking (VPC, endpoints), Phase 2 delivered the data layer (DynamoDB, Aurora, ElastiCache, S3, KMS). This phase adds the telephony entry point (Connect), audio transport (KVS), speech configuration (Transcribe vocabulary, Polly lexicon), and a session-bootstrap Lambda for initialising call sessions.

## 3. Goals and Non-Goals

**Goals:**

- Provision an Amazon Connect instance via CDK (`CfnInstance`)
- Create a basic contact flow that greets the caller and starts media streaming
- Provision a Kinesis Video Stream for caller audio
- Create a Transcribe custom vocabulary for airline domain terms
- Create a Polly lexicon for airline-specific pronunciation
- Provision a session-bootstrap Lambda that writes to the DynamoDB sessions table
- Create IAM roles for Connect, Lambda, and KVS interactions
- Export Connect instance ARN, contact flow ID, KVS stream ARN

**Non-Goals:**

- No phone number claiming (requires Connect instance to be active first; manual step documented)
- No orchestrator Fargate service (Phase 4)
- No Bedrock or agent intelligence (Phase 5)
- No Contact Lens configuration (Phase 7)

## 4. Success Metrics

- `cdk synth` and `cdk deploy` succeed
- Connect instance is created and accessible
- KVS stream is provisioned
- Transcribe vocabulary and Polly lexicon are created
- Session-bootstrap Lambda deploys and can be invoked
- Unit tests validate all resource configurations

## 5. Scope

**In scope:**

- Connect instance (CfnInstance)
- Contact flow (CfnContactFlow) — basic greeting + media streaming
- Kinesis Video Stream for audio transport
- Transcribe custom vocabulary (airline IATA codes, terms)
- Polly lexicon (airline pronunciation rules)
- Session-bootstrap Lambda function
- IAM roles and policies
- Security group for Lambda (VPC-based)
- Cross-stack exports

**Out of scope:**

- Phone number assignment (manual after deploy, documented in exit gate)
- Full orchestrator pipeline
- Bedrock Agent or tool Lambdas
- Contact Lens, analytics

## 6. Constraints and Assumptions

- Amazon Connect instance provisioned via CfnInstance (L1 construct)
- Contact flow defined as JSON content within CDK
- Connect instance uses SAML or local identity store
- KVS stream retention set to 24 hours (dev)
- Lambda runs in private subnets with VPC access to DynamoDB via endpoint

## 7. Dependencies

- Phase 1: Networking (VPC, subnets, VPC endpoints)
- Phase 2: Data layer (DynamoDB sessions table, KMS keys)

## 8. Risks and Mitigations

| Risk                               | Likelihood | Impact | Mitigation                                       |
| ---------------------------------- | ---------- | ------ | ------------------------------------------------ |
| Connect instance limits per region | Low        | High   | Only one instance needed; check service quota    |
| Contact flow JSON complexity       | Medium     | Low    | Start with minimal flow; iterate in later phases |
| Phone number availability          | Low        | Medium | Document as manual step; claim after deploy      |

## 9. Approvals

| Role             | Name | Date       | Status   |
| ---------------- | ---- | ---------- | -------- |
| Product Owner    | —    | 2026-05-05 | Approved |
| Engineering Lead | —    | 2026-05-05 | Approved |
