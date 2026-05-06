# Phase 04 Exit Gate: Orchestrator Service (Fargate)

## Checklist

### Before Development

- [x] PRD drafted, reviewed, and approved
- [x] User stories with Given/When/Then acceptance criteria drafted, reviewed, and approved
- [x] Technical Implementation Document drafted, reviewed, and approved
- [x] Test plan derived from acceptance criteria and recorded
- [x] Phase summary document created and status set to "In Development"

### During Development

- [x] All code is in IaC; no console clicks
- [x] IaC is reusable (new env = one config file + one command)
- [x] Unit tests added for this phase (15 orchestrator tests)
- [x] Each acceptance criterion is mapped to at least one automated test
- [x] All tests pass locally (50/50 total: 8 networking + 17 data layer + 10 connect-media + 15 orchestrator)
- [x] TID kept in sync with implementation

### Before Merge to Main

- [x] Pushed to master; all tests pass
- [x] Phase documentation set updated
- [x] Exit gate document filled in and signed off
- [x] Phase status updated to "Complete" in `/docs/index.md`

### Deployment Verification

- [x] `cdk diff` reviewed before deploy
- [x] `cdk deploy` succeeded — stack: `AirlineVoiceAgent-Orchestrator-dev`
- [x] ECS cluster: `airline-voice-agent-dev`
- [x] ECR repository: `263611243147.dkr.ecr.us-east-1.amazonaws.com/airline-voice-orchestrator-dev`
- [x] Fargate service: `orchestrator-dev` (desiredCount=0, scales to 10)
- [x] NLB: `orch-nlb-dev-47bdd990f8bdede1.elb.us-east-1.amazonaws.com` (internal)
- [x] Autoscaling: min=0, max=10, step scaling on CPU utilization
- [x] All resources tagged with `Project: airline-voice-agent`

**Note:** Service starts with desiredCount=0. Once the real orchestrator container image is built and pushed to ECR, update desiredCount to 1+ and enable the container health check.

## Sign-Off

| Role             | Name | Date       | Status   |
| ---------------- | ---- | ---------- | -------- |
| Engineering Lead | —    | 2026-05-05 | Approved |
| Reviewer         | —    | 2026-05-05 | Approved |
