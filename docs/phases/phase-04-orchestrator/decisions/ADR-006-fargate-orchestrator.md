# ADR-006: Fargate over Lambda for Voice Orchestrator

## Status
Accepted

## Context
The voice-agent orchestrator manages the full lifecycle of a phone call: reading audio from KVS, streaming to Transcribe, invoking the LLM, synthesising speech via Polly, and streaming audio back to Connect. A single call can last 30+ minutes. Lambda has a 15-minute maximum execution time and lacks persistent in-memory state.

## Decision
Use **AWS Fargate** for the orchestrator service. One Fargate task per active call, with autoscaling driven by a custom CloudWatch metric (`ActiveCallCount`). The service runs behind an internal Network Load Balancer.

## Consequences
- **Positive:** No execution time limit; tasks persist for entire call duration.
- **Positive:** Persistent in-memory state for audio buffers, Transcribe connection, and utterance queue.
- **Positive:** NLB provides stable endpoint for internal routing.
- **Negative:** Higher baseline cost vs Lambda (mitigated by min capacity = 0 in dev).
- **Negative:** Slower cold-start than Lambda (~30s vs ~1s); acceptable for voice calls where Connect holds the caller.

## Alternatives Considered
- **Lambda:** 15-minute limit disqualifies it for long calls.
- **EC2:** No serverless scaling; operational overhead for patching and AMI management.
- **EKS:** Over-engineering for a single-service workload at this stage.

## References
- Architecture doc Section 3.2: "implemented as an AWS Fargate service, not a Lambda function, because a single voice call typically lasts longer than the Lambda 15-minute maximum"
