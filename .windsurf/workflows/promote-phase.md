---
description: How to promote a completed phase through git branches and environments
---

# Phase Promotion Workflow

After local dev is complete and all tests pass on `dev`, promote the phase through environments:

## 1. Local Development (dev environment)

```bash
# Work on feature branch
git checkout -b feature/phase-XX-description

# Develop, test locally
cd infra
pnpm test                    # unit tests
npx cdk synth -c env=dev    # validate templates
npx cdk diff -c env=dev     # review changes
npx cdk deploy --all -c env=dev  # deploy to dev

# Run integration/E2E/regression
npx jest --config jest.config.integration.ts --testPathPattern="phase-XX"
npx jest --config jest.config.e2e.ts --testPathPattern="phase-XX"
npx jest --config jest.config.regression.ts
```

## 2. Promote to Test Branch

```bash
# Ensure all local tests pass, formatter/linter clean
pnpm format:check
pnpm lint
pnpm test

# Merge to test branch
git checkout test
git merge feature/phase-XX-description
git push origin test
```

CI will automatically:

- Run lint, typecheck, unit tests, cdk synth
- Deploy to `test` environment (`-c env=test`)
- Run integration tests against test env
- Run E2E tests against test env
- Run full regression suite against test env

## 3. Promote to Main (triggers staging + prod)

```bash
# After CI passes on test branch, open PR: test -> main
# PR must pass: CDK diff review, reviewer approval

git checkout main
git merge test
git push origin main
```

CI will automatically:

- Deploy to `staging` environment
- Run regression smoke tests on staging
- Wait for manual approval (GitHub Environment protection rule)
- Deploy to `prod` environment

## 4. After Promotion

- Update phase exit gate document
- Mark phase as "Complete" in docs/index.md
- Delete feature branch

## Environment VPC CIDRs

| Environment | CIDR        |
| ----------- | ----------- |
| dev         | 10.0.0.0/16 |
| test        | 10.1.0.0/16 |
| staging     | 10.2.0.0/16 |
| prod        | 10.3.0.0/16 |

## Required GitHub Configuration

1. **Settings → General → Default Branch**: Set to `main`
2. **Settings → Branches**: Add branch protection rules for `main` and `test`
3. **Settings → Environments**: Create `test`, `staging`, `production` environments
4. **Settings → Environments → production**: Add required reviewers
5. **Settings → Secrets**: Add `AWS_ACCOUNT_ID` and `AWS_DEPLOY_ROLE_ARN`
6. **Delete old `master` branch** after setting default to `main`
