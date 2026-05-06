# Phase 04 PRD: Orchestrator Service (Fargate)

## 1. Overview
This phase provisions the voice-agent orchestrator as an AWS Fargate service behind a Network Load Balancer. The orchestrator is the central control plane for each voice call — it reads audio from KVS, manages Transcribe streaming, invokes the intelligence layer, synthesises speech via Polly, and streams audio back to Connect.

## 2. Background
The architecture document specifies Fargate (not Lambda) because voice calls typically exceed Lambda's 15-minute limit and require persistent in-memory state for the audio pipeline. One Fargate task handles one active call, with autoscaling driven by a custom CloudWatch metric.

## 3. Goals and Non-Goals

**Goals:**
- Provision an ECR repository for the orchestrator container image
- Create a Fargate service (ECS cluster, task definition, service) in private subnets
- Place the service behind a Network Load Balancer (NLB)
- Configure autoscaling based on `ActiveCallCount` custom metric
- Deploy a placeholder Python 3.12 container with health-check endpoint
- Grant IAM permissions for KVS, Transcribe, Polly, DynamoDB, ElastiCache, Bedrock, S3
- Create security groups restricting traffic to NLB and VPC-internal
- Export service ARN, NLB DNS, ECS cluster name

**Non-Goals:**
- Full orchestrator application logic (streaming audio, Bedrock calls) — implemented incrementally
- Bedrock Agent configuration (Phase 5)
- Contact Lens integration (Phase 7)

## 4. Success Metrics
- `cdk deploy` succeeds; Fargate service reaches RUNNING state
- Health-check endpoint returns 200
- Autoscaling policy is configured
- Unit tests validate all resource configurations

## 5. Scope

**In scope:**
- ECR repository
- ECS cluster
- Fargate task definition (Python 3.12, 1 vCPU, 2 GB memory)
- Fargate service with desired count = 1 (dev)
- Network Load Balancer (internal, private subnets)
- Target group with health-check on `/health`
- Autoscaling policy (min 0, max 10, target tracking on ActiveCallCount)
- Security groups
- IAM task role and execution role
- Placeholder Dockerfile and health-check app
- Cross-stack exports

**Out of scope:**
- Full audio pipeline code
- WebSocket/streaming endpoints (added in later phases)
- Public-facing API Gateway (Phase 5+)

## 6. Dependencies
- Phase 1: VPC, private subnets
- Phase 2: DynamoDB, Aurora, ElastiCache, S3, KMS
- Phase 3: Connect, KVS

## 7. Approvals
| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | — | 2026-05-05 | Approved |
| Engineering Lead | — | 2026-05-05 | Approved |
