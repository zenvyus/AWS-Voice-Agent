# ADR-003: DynamoDB for Operational State

## Status
Accepted

## Context
The orchestrator needs sub-10ms reads/writes for session state, utterance queues, and noise counters during active calls. Data is accessed by a single key (contactId) and has a natural TTL (call duration + 24h).

## Decision
Use **Amazon DynamoDB** in on-demand (PAY_PER_REQUEST) mode for all operational state. Each concern gets its own table for isolation and independent scaling.

## Consequences
- **Positive:** Single-digit millisecond latency at any scale.
- **Positive:** On-demand mode means zero capacity planning for dev/staging.
- **Positive:** TTL auto-deletes expired sessions without cron jobs.
- **Negative:** No joins — relational queries must go to Aurora.
- **Neutral:** Point-in-time recovery adds ~20% cost but is required for compliance.

## Alternatives Considered
- **Aurora for everything:** Higher latency for simple key-value lookups; overkill for TTL-based ephemeral data.
- **ElastiCache for sessions:** Volatile (no durability); recovery on node failure would lose active call state.

## References
- Architecture doc Section 3.11: "Operational state lives in Amazon DynamoDB"
