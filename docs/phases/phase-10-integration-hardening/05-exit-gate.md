# Phase 10 Exit Gate: Integration Testing & Hardening

## Checklist

### Before Development

- [ ] PRD drafted, reviewed, and approved
- [ ] User stories with Given/When/Then acceptance criteria drafted, reviewed, and approved
- [ ] Technical Implementation Document drafted, reviewed, and approved
- [ ] All ADRs for significant decisions written and accepted
- [ ] Test plan derived from acceptance criteria and recorded in `04-test-plan.md`
- [ ] Phase summary document created and status set to "Approved for Development"

### During Development

- [ ] All code is in IaC; no console clicks
- [ ] IaC is reusable (new env = one config file + one command)
- [ ] Unit, integration, and E2E tests added for this phase
- [ ] Each acceptance criterion is mapped to at least one automated test
- [ ] Every acceptance criterion in `02-user-stories.md` has a passing automated test locally
- [ ] All tests pass locally
- [ ] TID kept in sync with implementation

### Before Merge to Main

- [ ] Pushed to `test` branch; full regression passes on `test`
- [ ] Every acceptance criterion test passes on the `test` branch in CI
- [ ] PR opened from `test` to `main`; CI green; reviewer approved
- [ ] Observability (logs, metrics, alarms, runbook) added
- [ ] Phase documentation set updated
- [ ] Regression suite imports the new phase's tests
- [ ] Exit gate document filled in and signed off
- [ ] Phase status updated to "Complete" in `/docs/index.md`

## Sign-off

| Role             | Name | Date | Status  |
| ---------------- | ---- | ---- | ------- |
| Engineering Lead | —    | —    | Pending |
| QA               | —    | —    | Pending |
