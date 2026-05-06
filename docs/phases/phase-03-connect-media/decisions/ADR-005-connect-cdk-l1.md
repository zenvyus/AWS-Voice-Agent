# ADR-005: Amazon Connect Provisioned via CDK L1 Constructs

## Status

Accepted

## Context

Amazon Connect does not have L2 (high-level) CDK constructs. The available CloudFormation resources are `AWS::Connect::Instance`, `AWS::Connect::ContactFlow`, and related L1 constructs. Phone number claiming and some instance configuration require post-deploy manual steps or custom resources.

## Decision

Use **CDK L1 constructs** (`CfnInstance`, `CfnContactFlow`) for the Connect instance and contact flow. Document phone number claiming as a manual post-deploy step. Use custom resources for Transcribe vocabulary and Polly lexicon where CloudFormation lacks native support.

## Consequences

- **Positive:** Instance and contact flow are fully version-controlled in CDK.
- **Positive:** Reproducible across environments with one config change.
- **Negative:** Phone number claiming remains a manual step (no CFN support).
- **Negative:** Some Connect features (hours of operation, queues, routing profiles) require additional L1 resources.
- **Neutral:** Future L2 constructs may simplify this; migration will be straightforward.

## Alternatives Considered

- **Fully manual Connect setup:** Violates IaC-first guardrail.
- **Custom resources for everything:** Over-engineering for Phase 3; can add as needed.
- **Terraform Connect provider:** Would break CDK-only tooling decision (ADR-002).

## References

- Architecture doc Section 3.1: "A single contact flow named airline-voice-agent-flow is provisioned in the Connect instance"
- AWS CloudFormation docs: AWS::Connect::Instance, AWS::Connect::ContactFlow
