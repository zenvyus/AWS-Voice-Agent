# Phase 10 Test Plan: Integration Testing & Hardening

## Story → Test Mapping

| Story | AC  | Test Type   | Test File                                            | Description                                   |
| ----- | --- | ----------- | ---------------------------------------------------- | --------------------------------------------- |
| 10.1  | AC1 | Integration | `integration/phase-10-integration/call-flow.test.ts` | Invoke session-bootstrap, verify DDB record   |
| 10.1  | AC2 | Integration | `integration/phase-10-integration/call-flow.test.ts` | Write transcript, verify S3 object with KMS   |
| 10.1  | AC3 | Integration | `integration/phase-10-integration/call-flow.test.ts` | Invoke agent-tools, validate response schema  |
| 10.2  | AC1 | Unit        | `unit/contracts.test.ts`                             | Validate session record schema                |
| 10.2  | AC2 | Unit        | `unit/contracts.test.ts`                             | Validate transcript metadata schema           |
| 10.2  | AC3 | Unit        | `unit/contracts.test.ts`                             | Validate agent-tools response against OpenAPI |
| 10.3  | AC1 | Load        | `load/load-test.js`                                  | k6 load test completes                        |
| 10.3  | AC2 | Load        | `load/load-test.js`                                  | Error rate < 1% under 100 VUs                 |
| 10.3  | AC3 | CI          | `.github/workflows/ci.yml`                           | Load test step in pipeline                    |
| 10.4  | AC1 | E2E         | `e2e/phase-10-integration/latency.test.ts`           | Lambda cold-start P95 < 3s                    |
| 10.4  | AC2 | E2E         | `e2e/phase-10-integration/latency.test.ts`           | End-to-end P95 < 5s                           |
| 10.4  | AC3 | E2E         | `e2e/phase-10-integration/latency.test.ts`           | DynamoDB P95 < 50ms                           |
| 10.5  | AC1 | E2E         | `e2e/phase-10-integration/failure-injection.test.ts` | ECS task stop → alarm fires                   |
| 10.5  | AC2 | E2E         | `e2e/phase-10-integration/failure-injection.test.ts` | Lambda errors → alarm fires                   |
| 10.5  | AC3 | E2E         | `e2e/phase-10-integration/failure-injection.test.ts` | Recovery → alarm clears                       |
| 10.6  | AC1 | Meta        | Coverage analysis script                             | Every stack has integration test              |
| 10.6  | AC2 | Meta        | `regression.suite.ts`                                | All phases imported                           |
| 10.6  | AC3 | Meta        | README.md                                            | Commands documented                           |

## Test Commands

```bash
# Unit/contract tests
npx jest --config jest.config.ts --testPathPattern="unit/contracts" --no-coverage

# Cross-stack integration
npx jest --config jest.config.integration.ts --testPathPattern="phase-10" --no-coverage

# E2E (latency + failure injection)
npx jest --config jest.config.e2e.ts --testPathPattern="phase-10" --no-coverage

# Load test
npx k6 run infra/test/load/load-test.js --out json=results.json

# Phase 10 all
npx jest --config jest.config.ts --testPathPattern="contracts" --no-coverage && \
npx jest --config jest.config.integration.ts --testPathPattern="phase-10" --no-coverage && \
npx jest --config jest.config.e2e.ts --testPathPattern="phase-10" --no-coverage

# Full regression
npx jest --config jest.config.regression.ts --no-coverage
```

## Regression Impact

- Adds ~15 new tests to the regression suite
- Load test is optional (runs on-demand, not in standard CI gate)
- Failure injection tests have longer timeout (15 min) — marked as slow tests
- No existing tests are modified or removed

## Prerequisites

- Test environment deployed and healthy
- k6 installed locally for load test execution
- All Phase 1–9 stacks deployed to dev
