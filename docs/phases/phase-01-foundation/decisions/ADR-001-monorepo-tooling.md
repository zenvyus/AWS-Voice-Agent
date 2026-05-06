# ADR-001: Monorepo with Turborepo and pnpm

## Status

Accepted

## Context

The airline voice agent project contains TypeScript infrastructure (CDK), Python services (orchestrator, Lambdas), documentation, and test suites. A consistent build and dependency management strategy is needed across all packages.

## Decision

Use a **pnpm workspace** with **Turborepo** for task orchestration. Python packages are managed with **uv** alongside the pnpm workspace.

## Consequences

- **Positive:** Single repo, atomic commits across infra + services, shared tooling config, Turborepo caching speeds CI.
- **Positive:** pnpm strict isolation prevents phantom dependencies.
- **Negative:** Requires all contributors to install pnpm (not npm/yarn).
- **Neutral:** Python packages live in the same repo but are managed by uv, not pnpm.

## Alternatives Considered

- **Nx:** More feature-rich but heavier; unnecessary complexity for this project size.
- **Yarn workspaces:** Less strict dependency isolation than pnpm.
- **Multi-repo:** Increases coordination cost; cross-cutting changes span multiple PRs.

## References

- Architecture doc Section 11: "TypeScript and Python monorepo managed with Turborepo and uv"
- INSTRUCTIONS_AND_GUARDRAILS.md Section 2.2: "Package manager: Match the monorepo standard (e.g., pnpm + Turborepo)"
