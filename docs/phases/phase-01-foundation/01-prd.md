# Phase 01 PRD: Foundation & Repo Scaffold

## 1. Overview
This phase establishes the foundational monorepo structure, IaC skeleton, networking infrastructure, documentation framework, and CI pipeline for the AWS-native airline voice agent project. It delivers no runtime customer-facing functionality but creates the platform on which all subsequent phases build.

## 2. Background and Context
The project is a re-platforming of an existing Twilio/Deepgram/ElevenLabs proof-of-concept into a fully AWS-native architecture. Before any service code can be written, a standardised repository structure, validated IaC patterns, and environment promotion workflow must be established. This phase is a prerequisite for all other work.

## 3. Goals and Non-Goals

**Goals:**
- Establish a reproducible monorepo structure with pnpm and Turborepo
- Create an AWS CDK v2 application with environment-validated configuration
- Deploy a production-grade VPC with private subnets and VPC endpoints in us-east-1
- Create documentation templates and the Phase 1 documentation set
- Configure CI pipeline stubs for lint, type-check, unit test, and CDK synth
- Ensure any engineer can stand up a new environment with one config file and one command

**Non-Goals:**
- No runtime services (no Lambda, Fargate, or Connect resources)
- No application code (no Python orchestrator, no tool implementations)
- No data stores (Aurora, DynamoDB, ElastiCache deferred to Phase 2)
- No secrets or API keys provisioned

## 4. Target Users and Personas
- **Platform Engineer:** Sets up and maintains the repo, CI/CD, and IaC patterns
- **Application Developer:** Consumes the monorepo structure and networking to build services in later phases

## 5. User Problems and Jobs-to-be-Done
- Engineers need a single, consistent repo structure to contribute to without tribal knowledge
- Infrastructure must be reproducible across environments without manual steps
- Documentation must be discoverable and linked to implementation

## 6. Success Metrics
- **Leading:** `cdk synth` produces a valid CloudFormation template with zero warnings
- **Leading:** `pnpm test` passes all unit tests in CI
- **Lagging:** A second engineer can clone the repo and deploy a new `dev` environment in under 15 minutes with no guidance beyond the README

## 7. Scope

**In scope:**
- pnpm workspace + Turborepo configuration
- Root tooling (prettier, husky, gitleaks)
- CDK app entry point with Zod-validated environment configs
- Networking construct (VPC, subnets, NAT, VPC endpoints)
- Networking stack composing the construct
- CDK unit tests for networking
- Documentation templates (PRD, user stories, TID, ADR)
- Phase 1 documentation set
- GitHub Actions CI workflow (lint, type-check, test, synth)
- Python tooling placeholder (pyproject.toml)

**Out of scope:**
- Any AWS resource beyond networking (databases, compute, AI services)
- Application runtime code
- Production deployment

## 8. Constraints and Assumptions
- AWS region: us-east-1
- Node.js >= 20 required
- pnpm 9.x as package manager
- AWS CDK v2 >= 2.150.0
- Assumes AWS account access with CDK bootstrap already performed

## 9. Dependencies
- None (this is the first phase)

## 10. Risks and Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CDK version incompatibility with VPC endpoint services | Low | Medium | Pin CDK version; test synth in CI |
| Turborepo task graph misconfiguration | Low | Low | Validate with `turbo run test --dry` |

## 11. Open Questions
None — all resolved.

## 12. Approvals
| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | — | 2026-05-05 | Approved |
| Engineering Lead | — | 2026-05-05 | Approved |
