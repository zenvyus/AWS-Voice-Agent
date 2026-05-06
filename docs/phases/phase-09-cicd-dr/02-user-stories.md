# Phase 09 User Stories: CI/CD Pipeline & Disaster Recovery

## Story 9.1: Automated Deployment Rollback

**As a** Platform Engineer
**I want** failed deployments to automatically rollback to the last known-good state
**So that** broken deploys do not leave the environment in an unstable state

### Acceptance Criteria

**AC1: CloudFormation rollback on stack update failure**

- **Given** a CDK deploy is in progress
- **When** the CloudFormation stack update fails
- **Then** CloudFormation automatically rolls back to the previous template version
- **And** the pipeline job reports failure with the rollback status

**AC2: ECS deployment circuit breaker enabled**

- **Given** the ECS Fargate service is configured
- **When** new tasks fail health checks during deployment
- **Then** the deployment is rolled back to the previous task definition
- **And** a CloudWatch alarm fires to notify the team

**AC3: Pipeline reports rollback events**

- **Given** a rollback occurs (CloudFormation or ECS)
- **When** the rollback completes
- **Then** an SNS notification is sent with the rollback details
- **And** the GitHub Actions job is marked as failed

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.1, 3.5
- Linked test cases: unit/cicd-dr.test.ts, e2e/phase-09-cicd-dr/rollback.test.ts
- ADRs referenced: None

### Estimates

- Complexity: M
- Confidence: High

---

## Story 9.2: DynamoDB Backup Automation

**As an** Operations Engineer
**I want** DynamoDB tables protected with point-in-time recovery and scheduled backups
**So that** data can be recovered to any point within the retention window

### Acceptance Criteria

**AC1: PITR enabled on all DynamoDB tables**

- **Given** the Data Layer stack is deployed
- **When** I describe each DynamoDB table
- **Then** PointInTimeRecoveryStatus is `ENABLED`

**AC2: AWS Backup plan includes DynamoDB tables**

- **Given** the DR stack is deployed
- **When** I describe the backup plan
- **Then** a selection rule includes all DynamoDB tables tagged with the project
- **And** the backup schedule is daily

**AC3: Backup vault exists in DR region**

- **Given** the DR stack is deployed
- **When** I query AWS Backup vaults in `us-west-2`
- **Then** a vault exists named `airline-voice-agent-dr-vault`

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.2
- Linked test cases: e2e/phase-09-cicd-dr/backup.test.ts
- ADRs referenced: None

### Estimates

- Complexity: M
- Confidence: High

---

## Story 9.3: Aurora Cross-Region Snapshot Replication

**As an** Operations Engineer
**I want** Aurora database snapshots replicated to the DR region
**So that** the database can be restored in a different region during a regional outage

### Acceptance Criteria

**AC1: Aurora automated snapshots enabled**

- **Given** the Aurora cluster is deployed
- **When** I describe the cluster
- **Then** BackupRetentionPeriod is ≥ 7 days

**AC2: AWS Backup plan copies Aurora snapshots to DR region**

- **Given** the DR stack is deployed
- **When** I describe the backup plan copy actions
- **Then** a copy rule targets `us-west-2` for RDS resources
- **And** copies are encrypted with a KMS key in the DR region

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.3
- Linked test cases: e2e/phase-09-cicd-dr/backup.test.ts
- ADRs referenced: None

### Estimates

- Complexity: M
- Confidence: High

---

## Story 9.4: S3 Cross-Region Replication

**As an** Operations Engineer
**I want** the transcripts S3 bucket replicated to the DR region
**So that** call recordings and transcripts survive a regional outage

### Acceptance Criteria

**AC1: Replication rule configured on transcripts bucket**

- **Given** the Data Layer stack is deployed
- **When** I describe the transcripts bucket replication configuration
- **Then** a replication rule exists targeting `us-west-2`
- **And** the rule status is `Enabled`

**AC2: Replication destination bucket exists in DR region**

- **Given** the DR stack is deployed
- **When** I query S3 buckets in `us-west-2`
- **Then** a replica bucket exists for transcripts

**AC3: Replicated objects are encrypted with DR region KMS key**

- **Given** the replication rule is configured
- **When** I inspect the replication encryption configuration
- **Then** the replica encryption uses a KMS key in `us-west-2`

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.4
- Linked test cases: e2e/phase-09-cicd-dr/replication.test.ts
- ADRs referenced: None

### Estimates

- Complexity: L
- Confidence: Medium

---

## Story 9.5: Pipeline Notifications

**As a** Platform Engineer
**I want** deployment success/failure notifications sent to the alarm SNS topic
**So that** the team is immediately aware of deployment outcomes without checking GitHub

### Acceptance Criteria

**AC1: GitHub Actions sends SNS notification on deploy success**

- **Given** a CDK deploy completes successfully
- **When** the deploy step finishes
- **Then** an SNS message is published to the alarm topic with deploy status and environment

**AC2: GitHub Actions sends SNS notification on deploy failure**

- **Given** a CDK deploy fails
- **When** the deploy step fails
- **Then** an SNS message is published to the alarm topic with failure details and environment
- **And** the message includes the commit SHA and actor

**AC3: Notification workflow step uses OIDC credentials**

- **Given** the notification step runs
- **When** it authenticates with AWS
- **Then** it uses the GitHub OIDC role (no static credentials)

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.6
- Linked test cases: unit/cicd-dr.test.ts (workflow validation)
- ADRs referenced: None

### Estimates

- Complexity: S
- Confidence: High

---

## Story 9.6: Disaster Recovery Runbook & Validation

**As an** Operations Engineer
**I want** a documented DR procedure with an automated validation test
**So that** recovery can be executed confidently during an actual disaster

### Acceptance Criteria

**AC1: DR runbook exists with step-by-step procedure**

- **Given** the docs/runbooks directory
- **When** I check for a DR runbook
- **Then** `phase-09-disaster-recovery.md` exists
- **And** it contains sections: overview, RTO/RPO targets, recovery steps, validation steps, communication plan

**AC2: DR validation test confirms backup restorability**

- **Given** the DR stack is deployed
- **When** I run the DR validation test
- **Then** it verifies DynamoDB PITR is enabled on all tables
- **And** it verifies AWS Backup plan exists with expected schedule
- **And** it verifies S3 replication is active

**AC3: RTO/RPO targets documented**

- **Given** the DR runbook
- **When** I read the RTO/RPO section
- **Then** RTO target is defined (< 4 hours)
- **And** RPO target is defined (< 1 hour)
- **And** measurement method is documented

### Definition of Done

- [ ] All acceptance criteria pass automated tests
- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Observability instrumented
- [ ] Deployed to test environment and validated

### Traceability

- Maps to PRD section: Goals 3.7
- Linked test cases: e2e/phase-09-cicd-dr/dr-validation.test.ts
- ADRs referenced: None

### Estimates

- Complexity: M
- Confidence: High
