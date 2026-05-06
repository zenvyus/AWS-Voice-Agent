# Phase 01 User Stories: Foundation & Repo Scaffold

## Story 1.1: Monorepo Initialisation

**As a** platform engineer
**I want** a pnpm + Turborepo monorepo with standard scripts
**So that** all team members use a consistent build, test, and lint workflow from day one

### Acceptance Criteria

**AC1: Workspace resolution**
- **Given** a fresh clone of the repository
- **When** I run `pnpm install` from the root
- **Then** all workspace packages are linked and `node_modules` is populated without errors

**AC2: Standard scripts exist**
- **Given** the monorepo is initialised
- **When** I inspect the root `package.json`
- **Then** scripts `test`, `test:integration`, `test:e2e`, `test:regression`, `lint`, and `format` are defined

**AC3: Turbo task graph**
- **Given** Turborepo is configured
- **When** I run `pnpm test --dry`
- **Then** the task graph resolves without cycle errors and includes the `infra` package

### Definition of Done
- [x] All acceptance criteria pass automated tests
- [x] Code reviewed and merged
- [x] Documentation updated
- [ ] Deployed to test environment and validated

### Traceability
- Maps to PRD section: Goals 3 (item 1)
- Linked test cases: e2e/phase-01-foundation/workspace.spec.ts

### Estimates
- Complexity: S
- Confidence: High

---

## Story 1.2: CDK Networking Stack

**As a** platform engineer
**I want** a CDK networking stack that provisions a VPC with public, private, and isolated subnets and VPC endpoints
**So that** subsequent phases can deploy services into a secure, pre-configured network

### Acceptance Criteria

**AC1: VPC synthesis**
- **Given** the CDK app is configured for the `dev` environment
- **When** I run `cdk synth`
- **Then** the generated CloudFormation template contains a VPC resource with CIDR `10.0.0.0/16`

**AC2: Subnet layout**
- **Given** the networking construct is configured with `maxAzs: 2`
- **When** the template is synthesised
- **Then** 6 subnets are created (2 public, 2 private, 2 isolated)

**AC3: VPC endpoints provisioned**
- **Given** the networking construct
- **When** the template is synthesised
- **Then** gateway endpoints for S3 and DynamoDB exist, and interface endpoints for Bedrock Runtime, Transcribe, Polly, Secrets Manager, KMS, ECR, CloudWatch Logs, CloudWatch Monitoring, STS, Lambda, and EventBridge exist

**AC4: Environment isolation**
- **Given** I create a new config file `env.sandbox.ts` with CIDR `10.99.0.0/16`
- **When** I run `cdk synth -c env=sandbox`
- **Then** a separate stack with the sandbox CIDR is synthesised without affecting other environments

**AC5: Invalid config rejected**
- **Given** an env config with an invalid CIDR (e.g., `not-a-cidr`)
- **When** `getConfig` is called
- **Then** a Zod validation error is thrown before synthesis begins

### Definition of Done
- [x] All acceptance criteria pass automated tests
- [x] Code reviewed and merged
- [x] Documentation updated
- [ ] Deployed to test environment and validated

### Traceability
- Maps to PRD section: Goals 3 (items 2, 3, 6)
- Linked test cases: infra/test/unit/networking.test.ts
- ADRs referenced: ADR-002

### Estimates
- Complexity: M
- Confidence: High

---

## Story 1.3: Documentation Framework

**As a** platform engineer
**I want** a documentation structure with templates for PRD, user stories, TID, and ADR
**So that** every phase follows a consistent documentation workflow and documents are discoverable

### Acceptance Criteria

**AC1: Templates exist**
- **Given** the repository
- **When** I list `docs/templates/`
- **Then** files `prd.template.md`, `user-stories.template.md`, `tid.template.md`, and `adr.template.md` are present

**AC2: Phase index**
- **Given** the repository
- **When** I open `docs/index.md`
- **Then** it lists Phase 01 with status and a link to its folder

**AC3: Phase 1 docs complete**
- **Given** the `docs/phases/phase-01-foundation/` folder
- **When** I list its contents
- **Then** files `00-phase-summary.md`, `01-prd.md`, `02-user-stories.md`, `03-tid.md`, `04-test-plan.md`, and `05-exit-gate.md` are present

### Definition of Done
- [x] All acceptance criteria pass automated tests
- [x] Code reviewed and merged
- [x] Documentation updated

### Traceability
- Maps to PRD section: Goals 3 (item 4)
- Linked test cases: e2e/phase-01-foundation/docs.spec.ts

### Estimates
- Complexity: S
- Confidence: High

---

## Story 1.4: CI Pipeline Stub

**As a** platform engineer
**I want** a GitHub Actions workflow that runs lint, type-check, unit tests, and CDK synth on every push
**So that** broken code is caught before merge

### Acceptance Criteria

**AC1: Workflow file exists**
- **Given** the repository
- **When** I inspect `.github/workflows/ci.yml`
- **Then** it defines jobs for lint, type-check, unit test, and CDK synth

**AC2: Failure on lint error**
- **Given** a TypeScript file with a formatting violation
- **When** the CI workflow runs
- **Then** the `lint` job fails and the pipeline halts

**AC3: CDK synth in CI**
- **Given** the CI workflow
- **When** the `synth` job runs
- **Then** `cdk synth` completes with exit code 0

### Definition of Done
- [x] All acceptance criteria pass automated tests
- [x] Code reviewed and merged
- [x] Documentation updated

### Traceability
- Maps to PRD section: Goals 3 (item 5)
- Linked test cases: manual CI validation

### Estimates
- Complexity: S
- Confidence: High
