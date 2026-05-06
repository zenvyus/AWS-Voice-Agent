# Phase 04 User Stories: Orchestrator Service (Fargate)

## Story 4.1: ECR Repository

**As a** platform engineer
**I want** an ECR repository provisioned for the orchestrator container
**So that** container images can be stored and versioned securely

### Acceptance Criteria

**AC1: Repository created**
- **Given** the orchestrator stack is synthesised
- **When** I inspect the template
- **Then** an ECR repository exists with image scanning enabled and lifecycle policy

**AC2: Encryption**
- **Given** the ECR repository
- **When** deployed
- **Then** images are encrypted with the data KMS key

---

## Story 4.2: ECS Cluster and Fargate Service

**As a** platform engineer
**I want** a Fargate service running the orchestrator container
**So that** voice calls can be processed by a persistent compute service

### Acceptance Criteria

**AC1: ECS cluster created**
- **Given** the orchestrator stack
- **When** synthesised
- **Then** an ECS cluster exists with container insights enabled

**AC2: Task definition**
- **Given** the task definition
- **When** synthesised
- **Then** it uses Fargate compatibility, Python 3.12 container, 1 vCPU, 2 GB memory

**AC3: Service in private subnets**
- **Given** the Fargate service
- **When** deployed
- **Then** tasks run in private subnets with no public IP assignment

**AC4: Health check**
- **Given** the service
- **When** a task is running
- **Then** the NLB target group health-check on `/health` returns 200

---

## Story 4.3: Network Load Balancer

**As a** platform engineer
**I want** an internal NLB in front of the Fargate service
**So that** other services can route traffic to the orchestrator

### Acceptance Criteria

**AC1: NLB created**
- **Given** the orchestrator stack
- **When** synthesised
- **Then** an internal NLB exists in private subnets

**AC2: Target group**
- **Given** the NLB
- **When** deployed
- **Then** it has a target group pointing to the Fargate service on port 8080

---

## Story 4.4: Autoscaling

**As a** platform engineer
**I want** autoscaling configured for the Fargate service
**So that** the service scales with call volume

### Acceptance Criteria

**AC1: Scalable target**
- **Given** the orchestrator stack
- **When** synthesised
- **Then** an Application Auto Scaling scalable target exists with min=0, max=10

---

## Story 4.5: IAM Permissions

**As a** platform engineer
**I want** the Fargate task role to have least-privilege access to AWS services
**So that** the orchestrator can interact with KVS, Transcribe, Polly, DynamoDB, Redis, S3, Bedrock

### Acceptance Criteria

**AC1: Task role policy**
- **Given** the task definition
- **When** synthesised
- **Then** the task role has policies for kinesisvideo, transcribe, polly, dynamodb, s3, bedrock, kms
