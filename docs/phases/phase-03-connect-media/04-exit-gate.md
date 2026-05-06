# Phase 03 Exit Gate: Amazon Connect & Media Transport

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
- [x] Unit tests added for this phase (10 connect-media tests)
- [x] Each acceptance criterion is mapped to at least one automated test
- [x] All tests pass locally (35/35 total: 8 networking + 17 data layer + 10 connect-media)
- [x] TID kept in sync with implementation

### Before Merge to Main
- [x] Pushed to master; all tests pass
- [x] Phase documentation set updated
- [x] Exit gate document filled in and signed off
- [x] Phase status updated to "Complete" in `/docs/index.md`

### Deployment Verification
- [x] `cdk diff` reviewed before deploy
- [x] `cdk deploy` succeeded — stack: `AirlineVoiceAgent-ConnectMedia-dev`
- [x] Connect instance: `ed0e3f8b-cc65-4e3b-a138-70b43e3a241f`
- [x] Contact flow: `56056f1e-9a66-4528-b489-52cff197d2de`
- [x] KVS stream: `connect-audio-dev` (ARN: `arn:aws:kinesisvideo:us-east-1:263611243147:stream/connect-audio-dev/1778037760601`)
- [x] Session bootstrap Lambda: `session-bootstrap-dev`
- [x] Transcribe vocabulary: `airline-domain-vocab-dev`
- [x] All resources tagged with `Project: airline-voice-agent`

### Post-Deploy Manual Steps
- [ ] Phone number claimed in Connect console
- [ ] Phone number associated with contact flow
- [ ] Test inbound call verifies greeting plays

## Sign-Off
| Role | Name | Date | Status |
|------|------|------|--------|
| Engineering Lead | — | 2026-05-05 | Approved |
| Reviewer | — | 2026-05-05 | Approved |
