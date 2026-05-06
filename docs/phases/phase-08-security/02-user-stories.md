# Phase 08 User Stories: Security Hardening & Compliance

## Story 8.1: Least-Privilege IAM Policies

**As a** Security Engineer
**I want** all IAM roles scoped to the minimum permissions required
**So that** a compromised credential cannot access resources beyond its intended scope

### Acceptance Criteria

**AC1: No wildcard resource policies remain**

- **Given** the CDK stacks are synthesized
- **When** I search all IAM policy statements in the template
- **Then** no policy statement has `Resource: "*"` unless it is for a service that does not support resource-level permissions (e.g., `cloudwatch:PutMetricData`, `xray:PutTraceSegments`)
- **And** each exception is documented with justification in the TID

**AC2: GitHub deploy role uses scoped permissions**

- **Given** the GitHub OIDC stack is deployed
- **When** I inspect the deploy role's attached policies
- **Then** it does NOT have `AdministratorAccess`
- **And** it has only the permissions needed for CDK deploys (CloudFormation, S3, IAM passRole, SSM, specific service permissions)

**AC3: Lambda execution roles are scoped**

- **Given** any Lambda function deployed in the system
- **When** I inspect its execution role
- **Then** it can only access the specific DynamoDB tables, S3 buckets, or KMS keys it requires
- **And** it cannot access resources belonging to other Lambdas

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.1
- Linked test cases: unit/security.test.ts
- ADRs referenced: None

### Estimates

- Complexity: L
- Confidence: Medium

---

## Story 8.2: Encryption Validation

**As a** Compliance Officer
**I want** all data encrypted at rest with customer-managed KMS keys and in transit with TLS
**So that** data meets regulatory requirements for protection

### Acceptance Criteria

**AC1: All DynamoDB tables use KMS CMK**

- **Given** the Data Layer stack is deployed
- **When** I describe each DynamoDB table
- **Then** each table has `SSESpecification.SSEType` = `KMS` with our CMK ARN

**AC2: All S3 buckets use KMS CMK and enforce TLS**

- **Given** the Data Layer stack is deployed
- **When** I inspect S3 bucket configurations
- **Then** each bucket has default encryption with our KMS CMK
- **And** each bucket policy denies requests where `aws:SecureTransport` = `false`

**AC3: Aurora cluster uses KMS encryption**

- **Given** the Data Layer stack is deployed
- **When** I describe the Aurora cluster
- **Then** `StorageEncrypted` = `true` with our CMK ARN

**AC4: ElastiCache uses encryption at rest and in transit**

- **Given** the Data Layer stack is deployed
- **When** I describe the Redis replication group
- **Then** `AtRestEncryptionEnabled` = `true`
- **And** `TransitEncryptionEnabled` = `true`

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.2
- Linked test cases: e2e/phase-08-security/encryption.test.ts
- ADRs referenced: None

### Estimates

- Complexity: M
- Confidence: High

---

## Story 8.3: Security Event Detection

**As an** Operations Engineer
**I want** GuardDuty and Security Hub enabled with findings routed to our alarm topic
**So that** security threats are detected and alerted automatically

### Acceptance Criteria

**AC1: GuardDuty is enabled**

- **Given** the Security stack is deployed
- **When** I query GuardDuty detectors in the account
- **Then** a detector exists and is enabled

**AC2: Security Hub is enabled with AWS Foundational standard**

- **Given** the Security stack is deployed
- **When** I query Security Hub
- **Then** it is enabled
- **And** the AWS Foundational Security Best Practices standard is enabled

**AC3: High-severity findings routed to SNS**

- **Given** GuardDuty or Security Hub produces a HIGH/CRITICAL finding
- **When** the finding is published
- **Then** an EventBridge rule matches it
- **And** the event is delivered to the alarm SNS topic from Phase 7

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.3
- Linked test cases: e2e/phase-08-security/detection.test.ts
- ADRs referenced: None

### Estimates

- Complexity: M
- Confidence: High

---

## Story 8.4: Secrets Rotation

**As a** Security Engineer
**I want** all database credentials rotated automatically on a ≤90 day schedule
**So that** stale credentials do not become a security liability

### Acceptance Criteria

**AC1: Aurora credentials stored in Secrets Manager**

- **Given** the Data Layer stack is deployed
- **When** I query Secrets Manager for Aurora credentials
- **Then** a secret exists with rotation enabled
- **And** the rotation schedule is ≤90 days

**AC2: Rotation Lambda exists and is configured**

- **Given** the Security stack is deployed
- **When** I inspect the rotation configuration
- **Then** a rotation Lambda is attached to the Aurora secret
- **And** the Lambda has appropriate VPC and IAM permissions

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.4
- Linked test cases: e2e/phase-08-security/secrets.test.ts
- ADRs referenced: None

### Estimates

- Complexity: M
- Confidence: Medium

---

## Story 8.5: Network Segmentation & VPC Flow Logs

**As a** Security Engineer
**I want** VPC Flow Logs enabled and no services directly exposed to the internet
**So that** network traffic is auditable and the attack surface is minimized

### Acceptance Criteria

**AC1: VPC Flow Logs enabled**

- **Given** the Networking stack is deployed
- **When** I describe the VPC
- **Then** Flow Logs are enabled and delivered to CloudWatch Logs

**AC2: No public ingress to application services**

- **Given** all stacks are deployed
- **When** I inspect security groups for ECS, Lambda, Aurora, Redis
- **Then** no security group allows ingress from `0.0.0.0/0` on application ports

**AC3: S3 buckets block public access**

- **Given** the Data Layer stack is deployed
- **When** I query public access block configuration for each bucket
- **Then** all four block settings are `true`

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.5
- Linked test cases: e2e/phase-08-security/network.test.ts
- ADRs referenced: None

### Estimates

- Complexity: M
- Confidence: High

---

## Story 8.6: AWS Config Compliance Rules

**As a** Compliance Officer
**I want** AWS Config rules that continuously monitor for security drift
**So that** misconfigurations are detected before they become vulnerabilities

### Acceptance Criteria

**AC1: Config Recorder is enabled**

- **Given** the Security stack is deployed
- **When** I query AWS Config
- **Then** a configuration recorder exists and is recording

**AC2: Managed rules deployed for key controls**

- **Given** the Security stack is deployed
- **When** I list Config rules
- **Then** rules exist for:
  - `encrypted-volumes`
  - `s3-bucket-server-side-encryption-enabled`
  - `iam-policy-no-statements-with-admin-access`
  - `rds-storage-encrypted`
  - `vpc-flow-logs-enabled`

**AC3: Non-compliant resources trigger alarm**

- **Given** a Config rule evaluates a resource as non-compliant
- **When** the evaluation is published
- **Then** an EventBridge rule routes it to the alarm SNS topic

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.6
- Linked test cases: e2e/phase-08-security/config-rules.test.ts
- ADRs referenced: None

### Estimates

- Complexity: M
- Confidence: High

---

## Story 8.7: Container Image Scanning

**As a** Security Engineer
**I want** ECR enhanced scanning enabled for all repositories
**So that** container vulnerabilities are detected before deployment

### Acceptance Criteria

**AC1: ECR enhanced scanning is enabled**

- **Given** the Orchestrator stack is deployed
- **When** I describe the ECR repository scanning configuration
- **Then** scan-on-push is enabled
- **And** scan type is `ENHANCED`

**AC2: No critical vulnerabilities in current image**

- **Given** an image has been pushed and scanned
- **When** I query scan findings for the latest image
- **Then** there are zero CRITICAL severity findings

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.7
- Linked test cases: e2e/phase-08-security/ecr.test.ts
- ADRs referenced: None

### Estimates

- Complexity: S
- Confidence: High
