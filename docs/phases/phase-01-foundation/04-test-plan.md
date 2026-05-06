# Phase 01 Test Plan: Foundation & Repo Scaffold

## Overview

Phase 1 tests validate infrastructure synthesis and repository structure. No runtime tests exist since no services are deployed.

## Test Matrix

| ID    | Type | Description                          | File                                 | AC Reference |
| ----- | ---- | ------------------------------------ | ------------------------------------ | ------------ |
| T1.1  | Unit | VPC created with correct CIDR        | `infra/test/unit/networking.test.ts` | AC 1.2.1     |
| T1.2  | Unit | 6 subnets across 2 AZs               | `infra/test/unit/networking.test.ts` | AC 1.2.2     |
| T1.3  | Unit | NAT Gateway count matches config     | `infra/test/unit/networking.test.ts` | AC 1.2.2     |
| T1.4  | Unit | S3 gateway endpoint exists           | `infra/test/unit/networking.test.ts` | AC 1.2.3     |
| T1.5  | Unit | DynamoDB gateway endpoint exists     | `infra/test/unit/networking.test.ts` | AC 1.2.3     |
| T1.6  | Unit | Interface endpoints with private DNS | `infra/test/unit/networking.test.ts` | AC 1.2.3     |
| T1.7  | Unit | VPC flow logs enabled                | `infra/test/unit/networking.test.ts` | Security     |
| T1.8  | Unit | Tags applied from config             | `infra/test/unit/networking.test.ts` | AC 1.2.1     |
| T1.9  | CI   | `cdk synth` exits 0                  | `.github/workflows/ci.yml`           | AC 1.2.1     |
| T1.10 | CI   | `pnpm lint` passes                   | `.github/workflows/ci.yml`           | AC 1.4.2     |

## Running Tests

```bash
# Unit tests (infra package)
cd infra && pnpm test

# Full monorepo test
pnpm test

# CDK synth validation
cd infra && pnpm synth
```

## Coverage Requirements

- Unit: ≥ 80% line coverage for `infra/lib/`
- No integration or E2E tests in this phase (no deployed runtime)
