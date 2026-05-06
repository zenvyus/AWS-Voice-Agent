# ADR-010: Step Functions Express Workflow for Noise Monitor

## Status

Accepted

## Context

The voice agent needs a mechanism to track per-contact noise rejection counts, evaluate escalation thresholds, and return an action (CONTINUE, INTERVENE, or END_CALL) synchronously within the real-time voice processing loop. The logic involves conditional branching, DynamoDB state updates, and metric emission — a workflow that exceeds the reasonable scope of a single Lambda function.

Key constraints:

- Must execute synchronously (orchestrator waits for result)
- Must complete in <500ms (voice call latency budget)
- Must handle concurrent contacts independently (partition by contactId)
- Must emit CloudWatch metrics as side-effects

## Decision

Use **AWS Step Functions Express Workflows** for the Noise Monitor state machine.

Express Workflows support synchronous execution (`StartSyncExecution`) with sub-second latency, direct DynamoDB and CloudWatch SDK integrations (no Lambda intermediary), and pay-per-execution pricing suitable for high-volume, short-lived workflows.

The state machine will:

1. Accept a rejection or pass event with contactId
2. Update DynamoDB counter (increment or reset)
3. Evaluate thresholds via Choice state
4. Emit CloudWatch metrics via SDK integration
5. Return the action to the caller

## Consequences

**Positive:**

- Declarative workflow logic (ASL) is auditable and testable without code changes
- Direct SDK integrations avoid Lambda cold-start latency for DynamoDB/CloudWatch calls
- Express Workflows support up to 100,000 concurrent executions
- Built-in X-Ray tracing for end-to-end latency visibility
- State machine can be versioned and rolled back independently

**Negative:**

- ASL syntax is verbose compared to equivalent Lambda code
- Testing requires either deploying the state machine or using Step Functions Local
- Express Workflow execution history is only available via CloudWatch Logs (no console history like Standard)

## Alternatives Considered

1. **Single Lambda function with all logic inline:** Simpler to write initially but harder to extend; DynamoDB calls add latency; no built-in workflow visualization; mixing concerns (gating + counting + escalation) in one function.

2. **Standard Step Functions Workflow:** Supports only async execution; not suitable for synchronous voice processing where the orchestrator needs an immediate response.

3. **DynamoDB Streams + EventBridge:** Event-driven approach; too much latency for real-time voice calls; complex to coordinate synchronous response back to orchestrator.

## References

- [AWS Step Functions Express Workflows](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-standard-vs-express.html)
- Architecture glossary: "Noise Monitor" definition
- Phase 06 TID Section 3.2
