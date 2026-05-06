# ADR-002: AWS CDK v2 TypeScript for Infrastructure as Code

## Status

Accepted

## Context

All AWS resources must be defined as code (INSTRUCTIONS_AND_GUARDRAILS.md Section 2). The architecture document specifies AWS CDK v2 in TypeScript. A choice must be confirmed and documented.

## Decision

Use **AWS CDK v2 written in TypeScript** as the sole IaC framework. All environments (dev, test, staging, prod) are created by varying a single Zod-validated config file.

## Consequences

- **Positive:** Type-safe constructs; compile-time validation catches errors before deploy.
- **Positive:** L3 constructs enable reuse; one construct per concern.
- **Positive:** Same language (TypeScript) for IaC and tooling reduces context-switching.
- **Negative:** CDK abstractions can obscure generated CloudFormation; requires `cdk diff` discipline.
- **Neutral:** Python services cannot share types with CDK; contract is at the infrastructure boundary (ARNs, env vars).

## Alternatives Considered

- **Terraform:** More provider breadth, but HCL is less expressive for complex compositions; architecture doc mandates CDK.
- **AWS SAM:** Good for Lambda-only; cannot express VPCs, ECS, Connect constructs natively.
- **Pulumi:** Similar to CDK but smaller AWS community; not mandated by architecture.

## References

- Architecture doc Section 10.1: "All infrastructure is defined in AWS CDK v2 written in TypeScript"
- INSTRUCTIONS_AND_GUARDRAILS.md Section 2.2: "Primary IaC framework: AWS CDK v2 (TypeScript)"
