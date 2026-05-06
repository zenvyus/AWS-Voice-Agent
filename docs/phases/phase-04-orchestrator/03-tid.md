# Phase 04 TID: Orchestrator Service (Fargate)

## 1. Summary

Provisions the voice-agent orchestrator as an ECS Fargate service behind an internal NLB, with autoscaling, IAM permissions, and a placeholder container image stored in ECR.

## 2. Architecture Overview

```
                    ┌───────────────────────────┐
                    │   Internal NLB (port 8080) │
                    │   (private subnets)        │
                    └─────────┬─────────────────┘
                              │
                    ┌─────────▼─────────────────┐
                    │   ECS Fargate Service      │
                    │   airline-voice-orchestrator│
                    │   ┌─────────────────────┐  │
                    │   │  Python 3.12 container│  │
                    │   │  1 vCPU / 2 GB       │  │
                    │   │  /health → 200       │  │
                    │   └─────────────────────┘  │
                    │   (private subnets)        │
                    └───────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         KVS / Transcribe  DynamoDB / Redis  Bedrock / Polly / S3
```

## 3. Detailed Design

### 3.1 ECR Repository

| Setting         | Value                              |
| --------------- | ---------------------------------- |
| Repository Name | `airline-voice-orchestrator-{env}` |
| Image Scanning  | Enabled on push                    |
| Encryption      | Data KMS key                       |
| Lifecycle       | Keep last 10 tagged images         |

### 3.2 ECS Cluster

| Setting            | Value                       |
| ------------------ | --------------------------- |
| Cluster Name       | `airline-voice-agent-{env}` |
| Container Insights | Enabled                     |
| Capacity Providers | FARGATE, FARGATE_SPOT       |

### 3.3 Fargate Task Definition

| Setting               | Value                |
| --------------------- | -------------------- |
| Family                | `orchestrator-{env}` |
| CPU                   | 1024 (1 vCPU)        |
| Memory                | 2048 (2 GB)          |
| Runtime Platform      | Linux/ARM64          |
| Container Port        | 8080                 |
| Log Driver            | awslogs (CloudWatch) |
| Environment Variables | See table below      |

**Environment Variables:**
| Variable | Source |
|----------|--------|
| `SESSIONS_TABLE` | Phase 2 export |
| `UTTERANCE_QUEUE_TABLE` | Phase 2 export |
| `NOISE_COUNTERS_TABLE` | Phase 2 export |
| `KVS_STREAM_ARN` | Phase 3 export |
| `TRANSCRIPTS_BUCKET` | Phase 2 export |
| `REDIS_ENDPOINT` | Phase 2 export |
| `AURORA_ENDPOINT` | Phase 2 export |
| `ENVIRONMENT` | Config |

### 3.4 Fargate Service

| Setting            | Value                |
| ------------------ | -------------------- |
| Service Name       | `orchestrator-{env}` |
| Desired Count      | 1 (dev)              |
| Assign Public IP   | false                |
| Subnets            | Private with egress  |
| Health Check Grace | 60 seconds           |

### 3.5 Network Load Balancer

| Setting               | Value            |
| --------------------- | ---------------- |
| Name                  | `orch-nlb-{env}` |
| Scheme                | internal         |
| Listener Port         | 8080 (TCP)       |
| Target Port           | 8080             |
| Health Check Path     | `/health`        |
| Health Check Interval | 30 seconds       |

### 3.6 Autoscaling

| Setting            | Value |
| ------------------ | ----- |
| Min Capacity       | 0     |
| Max Capacity       | 10    |
| Scale-in Cooldown  | 300s  |
| Scale-out Cooldown | 60s   |

### 3.7 IAM Task Role Permissions

| Service    | Actions                                                        |
| ---------- | -------------------------------------------------------------- |
| KVS        | `kinesisvideo:GetMedia`, `kinesisvideo:GetDataEndpoint`        |
| Transcribe | `transcribe:StartStreamTranscription`                          |
| Polly      | `polly:SynthesizeSpeech`                                       |
| DynamoDB   | Read/write on sessions, utterance-queue, noise-counters tables |
| S3         | Read/write on transcripts and assets buckets                   |
| Bedrock    | `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream` |
| KMS        | Encrypt/Decrypt with data and transcript keys                  |
| Connect    | `connect:StartContactStreaming`                                |

### 3.8 Security Groups

| Rule            | Direction | Port | Source/Destination |
| --------------- | --------- | ---- | ------------------ |
| NLB ingress     | Inbound   | 8080 | VPC CIDR           |
| Service ingress | Inbound   | 8080 | NLB security group |
| Service egress  | Outbound  | All  | 0.0.0.0/0          |

### 3.9 Cross-Stack Exports

| Export Name                    | Value               |
| ------------------------------ | ------------------- |
| `{env}-EcsClusterArn`          | ECS cluster ARN     |
| `{env}-OrchestratorServiceArn` | Fargate service ARN |
| `{env}-OrchestratorNlbDns`     | NLB DNS name        |
| `{env}-OrchestratorNlbArn`     | NLB ARN             |

## 4. Test Strategy

| ID   | Type | Description                                           |
| ---- | ---- | ----------------------------------------------------- |
| T4.1 | Unit | ECR repository with scanning and lifecycle            |
| T4.2 | Unit | ECS cluster with container insights                   |
| T4.3 | Unit | Fargate task definition (CPU, memory, container port) |
| T4.4 | Unit | Fargate service in private subnets                    |
| T4.5 | Unit | Internal NLB with target group                        |
| T4.6 | Unit | Autoscaling scalable target                           |
| T4.7 | Unit | IAM task role permissions                             |
| T4.8 | CI   | `cdk synth` exits 0                                   |

## 5. Approvals

| Role             | Name | Date       | Status   |
| ---------------- | ---- | ---------- | -------- |
| Engineering Lead | —    | 2026-05-05 | Approved |
| Architect        | —    | 2026-05-05 | Approved |
