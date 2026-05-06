# Phase 05 Test Plan: Intelligence Layer (Bedrock Agent & Tools)

## Unit Tests

| ID    | Description                                                 | File                             |
| ----- | ----------------------------------------------------------- | -------------------------------- |
| T5.U1 | Bedrock Agent resource exists with correct foundation model | `test/unit/intelligence.test.ts` |
| T5.U2 | Agent alias resource exists                                 | `test/unit/intelligence.test.ts` |
| T5.U3 | Action group attached to agent with Lambda                  | `test/unit/intelligence.test.ts` |
| T5.U4 | Action group Lambda uses Python 3.12 runtime                | `test/unit/intelligence.test.ts` |
| T5.U5 | Knowledge Base resource with VECTOR type configuration      | `test/unit/intelligence.test.ts` |
| T5.U6 | S3 KB documents bucket with encryption and versioning       | `test/unit/intelligence.test.ts` |
| T5.U7 | IAM roles follow least-privilege                            | `test/unit/intelligence.test.ts` |
| T5.U8 | Cross-stack CloudFormation outputs defined                  | `test/unit/intelligence.test.ts` |
| T5.U9 | `cdk synth` exits 0                                         | CI pipeline                      |

## Integration Tests

| ID    | Description                          | File                                                          |
| ----- | ------------------------------------ | ------------------------------------------------------------- |
| T5.I1 | Stack has BedrockAgentId output      | `test/integration/phase-05-intelligence/intelligence.test.ts` |
| T5.I2 | Stack has BedrockAgentAliasId output | `test/integration/phase-05-intelligence/intelligence.test.ts` |
| T5.I3 | Stack has KnowledgeBaseId output     | `test/integration/phase-05-intelligence/intelligence.test.ts` |

## E2E Tests

| ID    | Description                                     | File                                                  |
| ----- | ----------------------------------------------- | ----------------------------------------------------- |
| T5.E1 | Bedrock Agent exists and is PREPARED            | `test/e2e/phase-05-intelligence/intelligence.test.ts` |
| T5.E2 | Agent alias exists and is routable              | `test/e2e/phase-05-intelligence/intelligence.test.ts` |
| T5.E3 | Action group Lambda exists and uses Python 3.12 | `test/e2e/phase-05-intelligence/intelligence.test.ts` |
| T5.E4 | Action group is attached to the agent           | `test/e2e/phase-05-intelligence/intelligence.test.ts` |
| T5.E5 | Knowledge Base exists and is ACTIVE             | `test/e2e/phase-05-intelligence/intelligence.test.ts` |
| T5.E7 | KB documents S3 bucket exists                   | `test/e2e/phase-05-intelligence/intelligence.test.ts` |
| T5.E8 | Stack exports agent and KB identifiers          | `test/e2e/phase-05-intelligence/intelligence.test.ts` |

## Acceptance Criteria Mapping

| Story | AC                                | Test IDs            |
| ----- | --------------------------------- | ------------------- |
| 5.1   | AC1: Agent exists and PREPARED    | T5.E1               |
| 5.1   | AC2: Alias is routable            | T5.E2               |
| 5.1   | AC3: Correct foundation model     | T5.E1, T5.U1        |
| 5.2   | AC1: Lambda exists and invocable  | T5.E3               |
| 5.2   | AC2: Action group attached        | T5.E4, T5.U3        |
| 5.3   | AC1: KB active with managed store | T5.E5               |
| 5.3   | AC2: S3 data source configured    | T5.E7               |
| 5.4   | AC1: Stack outputs exist          | T5.I1, T5.I2, T5.I3 |
| 5.4   | AC2: Outputs well-formed          | T5.I1, T5.I2, T5.I3 |
