# Phase 01 TID: Foundation & Repo Scaffold

## 1. Summary

This phase establishes the monorepo structure (pnpm + Turborepo), AWS CDK v2 application with Zod-validated environment configurations, a networking stack (VPC, subnets, NAT, VPC endpoints) targeting us-east-1, documentation templates, a CI pipeline stub, and pre-commit hooks. No runtime services are deployed.

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Monorepo Root                    │
│  pnpm-workspace.yaml │ turbo.json │ package.json │
├─────────────────────────────────────────────────┤
│  infra/                                          │
│  ├── bin/app.ts          (CDK entry point)       │
│  ├── lib/config/         (Zod-validated configs) │
│  ├── lib/constructs/     (Networking construct)  │
│  ├── lib/stacks/         (Networking stack)      │
│  └── test/unit/          (Jest tests)            │
├─────────────────────────────────────────────────┤
│  docs/                                           │
│  ├── templates/          (PRD, stories, TID, ADR)│
│  ├── phases/phase-01-foundation/                 │
│  ├── index.md                                    │
│  └── glossary.md                                 │
├─────────────────────────────────────────────────┤
│  tests/                                          │
│  ├── unit/ │ integration/ │ e2e/ │ fixtures/     │
│  └── helpers/                                    │
├─────────────────────────────────────────────────┤
│  .github/workflows/ci.yml                        │
└─────────────────────────────────────────────────┘
```

### Components Introduced

- **Networking Construct** (`infra/lib/constructs/networking.ts`) — L3 construct encapsulating VPC, subnets, NAT, and VPC endpoints.
- **Networking Stack** (`infra/lib/stacks/networking-stack.ts`) — Composes the networking construct with environment config and applies tags.
- **Config Module** (`infra/lib/config/`) — Zod schema + per-environment config files + loader function.

### How This Fits

This is the base layer. All future stacks (data, compute, AI, observability) will import the VPC from this stack via cross-stack references or SSM parameters.

## 3. Detailed Design

### 3.1 Components

**Networking Construct**

- Responsibility: Provision a VPC with 3 subnet tiers, NAT, flow logs, and VPC endpoints
- Inputs: `environmentName`, `vpcCidr`, `maxAzs`, `natGateways`
- Outputs: `vpc` (ec2.Vpc) exposed as a public property
- Dependencies: aws-cdk-lib/aws-ec2

**Config Module**

- Responsibility: Load and validate per-environment configuration at synth time
- Inputs: Environment name (from CDK context or env var)
- Outputs: Validated `EnvironmentConfig` object
- Dependencies: zod

### 3.2 Data Model

No data stores in this phase.

### 3.3 APIs and Contracts

No APIs in this phase. Cross-stack contract: `vpc.vpcId` exported as `${env}-VpcId`.

### 3.4 Infrastructure (IaC)

| Resource                  | Type                  | Notes                                                                                                              |
| ------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| VPC                       | AWS::EC2::VPC         | CIDR from config                                                                                                   |
| 6 Subnets                 | AWS::EC2::Subnet      | 2 AZs × 3 tiers                                                                                                    |
| NAT Gateway               | AWS::EC2::NatGateway  | Count from config                                                                                                  |
| S3 Gateway Endpoint       | AWS::EC2::VPCEndpoint | Gateway type                                                                                                       |
| DynamoDB Gateway Endpoint | AWS::EC2::VPCEndpoint | Gateway type                                                                                                       |
| 12 Interface Endpoints    | AWS::EC2::VPCEndpoint | Bedrock, Transcribe, Polly, SecretsManager, KMS, ECR, ECR Docker, CW Logs, CW Monitoring, STS, Lambda, EventBridge |
| VPC Flow Log              | AWS::EC2::FlowLog     | REJECT traffic to CloudWatch                                                                                       |

IAM: No custom roles — CDK-managed flow log role only.

### 3.5 Security

- VPC flow logs capture rejected traffic for forensics
- Interface endpoints use private DNS — services accessed without internet
- No public-facing resources

### 3.6 Observability

- VPC flow logs → CloudWatch Logs (auto-created log group)
- CDK synth warnings surfaced in CI

### 3.7 Performance and Scale

Not applicable — no runtime workload in this phase.

### 3.8 Failure Modes and Recovery

- **Failure:** `cdk synth` fails due to invalid config → caught by Zod at synth time
- **Failure:** VPC endpoint service not available in region → detected in `cdk diff`; remove or replace endpoint
- **Rollback:** `cdk destroy` removes all networking resources

## 4. Alternatives Considered

| Decision       | Alternative    | Why Not                                                                |
| -------------- | -------------- | ---------------------------------------------------------------------- |
| Turborepo      | Nx             | Turborepo is lighter, faster for task graphs, matches CDK TS ecosystem |
| pnpm           | yarn/npm       | pnpm has strict isolation and disk-efficient linking                   |
| Zod for config | io-ts, Joi     | Zod is TypeScript-native, zero dependencies, best DX                   |
| CDK v2         | Terraform, SAM | Architecture doc mandates CDK v2 TypeScript                            |

See ADR-001 and ADR-002.

## 5. Test Strategy

| Layer | What                                            | File                                      |
| ----- | ----------------------------------------------- | ----------------------------------------- |
| Unit  | Networking construct produces correct resources | `infra/test/unit/networking.test.ts`      |
| Unit  | Config schema rejects invalid input             | `infra/test/unit/config.test.ts` (future) |
| E2E   | `cdk synth` exits 0 with valid config           | CI workflow                               |

### Mapping from Acceptance Criteria

- AC 1.2.1 (VPC CIDR) → `networking.test.ts` "creates a VPC with the specified CIDR"
- AC 1.2.2 (subnets) → `networking.test.ts` "creates public, private, and isolated subnets"
- AC 1.2.3 (endpoints) → `networking.test.ts` "creates interface endpoints"
- AC 1.2.5 (invalid config) → config unit test

## 6. Migration and Rollout

- No migration — greenfield
- Deploy order: networking stack first (it has no dependencies)
- No feature flags needed

## 7. Dependencies and Sequencing

- **Before this phase:** Nothing
- **This phase enables:** Phase 2 (Data Layer) needs the VPC for Aurora, ElastiCache, and Lambda VPC access

## 8. Story-to-Implementation Mapping

| Story ID | Components Touched                                                                            | Tests Added           | Owner |
| -------- | --------------------------------------------------------------------------------------------- | --------------------- | ----- |
| 1.1      | Root configs (package.json, turbo.json, pnpm-workspace.yaml)                                  | Workspace resolution  | —     |
| 1.2      | infra/lib/constructs/networking.ts, infra/lib/stacks/networking-stack.ts, infra/lib/config/\* | networking.test.ts    | —     |
| 1.3      | docs/                                                                                         | File existence checks | —     |
| 1.4      | .github/workflows/ci.yml                                                                      | CI green              | —     |

## 9. Open Technical Questions

None — all resolved.

## 10. Approvals

| Role                  | Name | Date       | Status   |
| --------------------- | ---- | ---------- | -------- |
| Engineering Lead      | —    | 2026-05-05 | Approved |
| Architect / Tech Lead | —    | 2026-05-05 | Approved |
