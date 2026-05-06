# Phase 06 PRD: Noise Monitor & Speech Quality

## 1. Overview

This phase delivers a real-time noise monitoring and speech quality gating system that detects persistent background noise during voice calls, rejects non-speech audio before it reaches the LLM, and triggers spoken interventions when noise levels exceed acceptable thresholds.

## 2. Background and Context

The orchestrator (Phase 4) processes audio from Amazon Transcribe and routes utterances to the Bedrock Agent (Phase 5). In noisy environments (airports, streets, vehicles), Transcribe may produce false transcripts from background noise. Without a quality gate, the agent wastes latency and cost responding to nonsense text, degrading the caller experience.

The architecture specifies a four-gate speech quality filter applied to STT transcripts, and a Step Functions state machine ("Noise Monitor") that tracks rejection rates per contact and escalates when persistent noise is detected.

## 3. Goals and Non-Goals

**Goals:**

- Implement a four-gate speech quality filter (minimum length, confidence threshold, entropy check, profanity/gibberish filter) as a Lambda function
- Provision a Step Functions state machine that tracks per-contact noise counters and transitions through escalation states
- Store noise counters in the existing `noise-counters` DynamoDB table (Phase 2)
- Trigger a spoken intervention ("I'm having trouble hearing you clearly — could you move to a quieter area?") when persistent noise is detected
- Expose CloudWatch metrics for noise rejection rate, gate pass/fail counts, and intervention triggers
- Provide a circuit-breaker: after N consecutive noise interventions, gracefully end the call

**Non-Goals:**

- Real-time audio-level (dB) analysis — this phase uses STT output quality, not raw audio waveforms
- Caller-side noise cancellation or echo suppression (handled by Connect)
- Profanity moderation of valid speech content (out of scope for this phase)
- Changes to the orchestrator container — the orchestrator invokes the speech quality Lambda; wiring is done via environment variables and IAM

## 4. Target Users and Personas

- **Caller (end user):** Receives spoken feedback when background noise prevents the agent from understanding them
- **Platform engineer:** Deploys and monitors the noise monitoring infrastructure
- **Operations team:** Views dashboards and responds to alarms related to speech quality degradation

## 5. User Problems and Jobs-to-be-Done

- Callers in noisy environments get confused when the agent responds nonsensically to misheard transcripts
- The system wastes Bedrock invocations (cost + latency) on garbage input
- Without intervention, a noisy call loops indefinitely with no resolution
- Operations has no visibility into how often noise degrades call quality

## 6. Success Metrics

| Metric                                 | Target                               | Measurement              |
| -------------------------------------- | ------------------------------------ | ------------------------ |
| False transcript rejection rate        | >95% of gibberish detected pre-LLM   | CloudWatch custom metric |
| Noise intervention trigger latency     | <2s from detection to spoken message | X-Ray trace              |
| Unnecessary LLM invocations from noise | <5% of total invocations             | Bedrock call logs        |
| Circuit-breaker activation rate        | <1% of calls                         | CloudWatch metric        |

## 7. Scope

**In scope:**

- Speech Quality Gate Lambda (four filters applied sequentially)
- Noise Monitor Step Functions state machine (counter tracking, escalation states)
- DynamoDB writes to existing `noise-counters` table
- CloudWatch metrics and alarms for noise events
- Spoken intervention audio synthesis via Polly
- Circuit-breaker logic for persistent noise
- Unit, integration, and E2E tests

**Out of scope:**

- Modifications to the orchestrator container code (it already has `NOISE_COUNTERS_TABLE` env var)
- Changes to Amazon Connect contact flows
- Real-time audio waveform analysis
- ML-based noise classification

## 8. Constraints and Assumptions

- The orchestrator is expected to invoke the Speech Quality Gate Lambda synchronously before sending utterances to the Bedrock Agent
- The `noise-counters` DynamoDB table already exists (Phase 2)
- Step Functions Express Workflows are used for low-latency synchronous execution
- Amazon Polly is used for intervention TTS (already available to the orchestrator)
- Noise thresholds are configurable per environment via the typed config schema

## 9. Dependencies

| Dependency                                 | Phase   | Status    |
| ------------------------------------------ | ------- | --------- |
| DynamoDB noise-counters table              | Phase 2 | Complete  |
| Orchestrator service (invokes gate Lambda) | Phase 4 | Complete  |
| Bedrock Agent (downstream consumer)        | Phase 5 | Complete  |
| Amazon Polly (TTS for interventions)       | Phase 3 | Available |

## 10. Risks and Mitigations

| Risk                                                       | Likelihood | Impact | Mitigation                                                                     |
| ---------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------ |
| Gate too aggressive — rejects valid speech                 | Medium     | High   | Configurable thresholds; tune with production transcript data                  |
| Step Functions latency adds to call response time          | Low        | Medium | Use Express Workflows (sub-second); gate Lambda <100ms p99                     |
| DynamoDB throttling on high-volume noise events            | Low        | Low    | Table uses on-demand billing; add alarm on throttle events                     |
| Circuit-breaker fires on legitimate calls with brief noise | Low        | Medium | Require N consecutive failures before activation; reset on any valid utterance |

## 11. Open Questions

None — all resolved during architecture review.

## 12. Approvals

| Role             | Name | Date | Status  |
| ---------------- | ---- | ---- | ------- |
| Product Owner    | —    | —    | Pending |
| Engineering Lead | —    | —    | Pending |
