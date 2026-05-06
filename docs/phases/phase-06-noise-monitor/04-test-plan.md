# Phase 06 Test Plan: Noise Monitor & Speech Quality

## Unit Tests

| ID    | Description                                                                | File                              |
| ----- | -------------------------------------------------------------------------- | --------------------------------- |
| T6.U1 | Speech Quality Gate Lambda resource exists with correct runtime and config | `test/unit/noise-monitor.test.ts` |
| T6.U2 | Noise Monitor state machine resource exists with EXPRESS type              | `test/unit/noise-monitor.test.ts` |
| T6.U3 | IAM roles follow least-privilege (Lambda and SFN roles)                    | `test/unit/noise-monitor.test.ts` |
| T6.U4 | CloudWatch alarm defined for high noise rejection rate                     | `test/unit/noise-monitor.test.ts` |
| T6.U5 | Cross-stack CloudFormation outputs defined                                 | `test/unit/noise-monitor.test.ts` |
| T6.U6 | `cdk synth` exits 0                                                        | CI pipeline                       |

## Integration Tests

| ID    | Description                                  | File                                                            |
| ----- | -------------------------------------------- | --------------------------------------------------------------- |
| T6.I1 | Stack has SpeechQualityGateLambdaArn output  | `test/integration/phase-06-noise-monitor/noise-monitor.test.ts` |
| T6.I2 | Stack has NoiseMonitorStateMachineArn output | `test/integration/phase-06-noise-monitor/noise-monitor.test.ts` |

## E2E Tests

| ID    | Description                                                               | File                                                    |
| ----- | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| T6.E1 | Speech Quality Gate Lambda exists and is invocable                        | `test/e2e/phase-06-noise-monitor/noise-monitor.test.ts` |
| T6.E2 | Gate rejects short/low-confidence/low-entropy/gibberish input correctly   | `test/e2e/phase-06-noise-monitor/noise-monitor.test.ts` |
| T6.E3 | Noise Monitor state machine exists and is ACTIVE                          | `test/e2e/phase-06-noise-monitor/noise-monitor.test.ts` |
| T6.E4 | State machine increments counter and returns correct action at thresholds | `test/e2e/phase-06-noise-monitor/noise-monitor.test.ts` |
| T6.E5 | CloudWatch alarm exists for high rejection rate                           | `test/e2e/phase-06-noise-monitor/noise-monitor.test.ts` |

## Acceptance Criteria Mapping

| Story | AC                                     | Test IDs     |
| ----- | -------------------------------------- | ------------ |
| 6.1   | AC1: Lambda exists with correct config | T6.U1, T6.E1 |
| 6.1   | AC2: Gate 1 minimum length             | T6.E2        |
| 6.1   | AC3: Gate 2 confidence threshold       | T6.E2        |
| 6.1   | AC4: Gate 3 entropy check              | T6.E2        |
| 6.1   | AC5: Gate 4 gibberish filter           | T6.E2        |
| 6.1   | AC6: Valid speech passes               | T6.E2        |
| 6.2   | AC1: State machine exists and ACTIVE   | T6.U2, T6.E3 |
| 6.2   | AC2: Counter increment on rejection    | T6.E4        |
| 6.2   | AC3: Intervention threshold            | T6.E4        |
| 6.2   | AC4: Circuit-breaker activation        | T6.E4        |
| 6.2   | AC5: Counter reset on valid speech     | T6.E4        |
| 6.3   | AC1: Custom metrics emitted            | T6.E5        |
| 6.3   | AC2: Intervention metric emitted       | T6.E5        |
| 6.3   | AC3: Alarm on high rejection rate      | T6.U4, T6.E5 |
| 6.4   | AC1: Stack outputs exist               | T6.I1, T6.I2 |
| 6.4   | AC2: Outputs well-formed               | T6.I1, T6.I2 |
