# ADR-004: Aurora Serverless v2 for Transactional Data

## Status

Accepted

## Context

Flight inventory, bookings, passengers, and fare classes require ACID transactions, complex joins, and relational integrity. Query patterns include multi-table joins (e.g., "find available flights from SYD to LAX on date X with fare class Y").

## Decision

Use **Amazon Aurora Serverless v2** (PostgreSQL-compatible, engine version 15) with IAM database authentication and storage encryption via customer-managed KMS.

## Consequences

- **Positive:** Full SQL with joins, constraints, and transactions.
- **Positive:** Serverless v2 scales to zero-ish (0.5 ACU min) in dev, saving cost.
- **Positive:** IAM auth eliminates password rotation complexity.
- **Positive:** Compatible with standard PostgreSQL drivers and ORMs.
- **Negative:** Cold start from 0.5 ACU to higher capacity takes seconds (acceptable for non-realtime tool calls).
- **Neutral:** Schema migrations managed separately (future phase).

## Alternatives Considered

- **DynamoDB for everything:** Cannot express relational queries efficiently; single-table design would be overly complex for booking workflows.
- **RDS PostgreSQL (provisioned):** Fixed cost even when idle; Serverless v2 is more cost-efficient for variable dev/test workloads.
- **Aurora Serverless v1:** End of life; v2 is the supported path forward.

## References

- Architecture doc Section 3.11: "flight inventory, bookings, passengers, and fare classes are persisted in Amazon Aurora Serverless v2"
