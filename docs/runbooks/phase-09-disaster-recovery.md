# Disaster Recovery Runbook

## Overview

This runbook covers disaster recovery procedures for the Airline Voice Agent system. It defines RTO/RPO targets, recovery procedures for each component, and communication protocols.

## RTO/RPO Targets

| Component         | RTO (Recovery Time Objective)      | RPO (Recovery Point Objective) |
| ----------------- | ---------------------------------- | ------------------------------ |
| DynamoDB Tables   | < 4 hours                          | < 1 hour (PITR continuous)     |
| Aurora Database   | < 4 hours                          | < 1 hour (automated snapshots) |
| S3 Transcripts    | < 1 hour (CRR, already replicated) | < 15 minutes                   |
| ECS Service       | < 30 minutes (redeploy)            | N/A (stateless)                |
| CloudWatch Alarms | < 1 hour (redeploy stack)          | N/A (config in IaC)            |

**Overall System:**

- **RTO: < 4 hours** (limited by database restore time)
- **RPO: < 1 hour** (limited by backup copy frequency)

## Decision Criteria for DR Activation

Activate DR when:

1. AWS Health Dashboard reports regional outage in us-east-1
2. Multiple services are unreachable for > 30 minutes
3. CloudWatch alarms confirm system-wide failure (not isolated component)

Do NOT activate DR for:

- Single AZ failures (handled by multi-AZ architecture)
- Individual service issues (handled by auto-recovery)
- Transient network issues (< 5 minutes)

## Recovery Steps

### Step 1: Assess Impact (0–15 minutes)

1. Check AWS Health Dashboard for regional status
2. Verify CloudWatch alarms are firing across all services
3. Confirm Amazon Connect is unreachable
4. Notify stakeholders via communication plan

### Step 2: DynamoDB Recovery (15–60 minutes)

**Option A: Restore from PITR (same region, if region recovers)**

```bash
aws dynamodb restore-table-to-point-in-time \
  --source-table-name voice-agent-sessions-dev \
  --target-table-name voice-agent-sessions-dev-restored \
  --restore-date-time "2026-01-01T00:00:00Z"
```

**Option B: Restore from AWS Backup (cross-region)**

```bash
aws backup start-restore-job \
  --recovery-point-arn <backup-arn-from-us-west-2-vault> \
  --iam-role-arn arn:aws:iam::263611243147:role/aws-backup-role-dev \
  --resource-type DynamoDB \
  --metadata '{"targetTableName":"voice-agent-sessions-dev"}'
```

### Step 3: Aurora Recovery (30–120 minutes)

1. Identify latest snapshot in DR vault (us-west-2):

```bash
aws rds describe-db-cluster-snapshots \
  --region us-west-2 \
  --db-cluster-identifier airline-voice-agent-aurora-dev
```

2. Restore cluster from snapshot:

```bash
aws rds restore-db-cluster-from-snapshot \
  --region us-west-2 \
  --db-cluster-identifier airline-voice-agent-aurora-dev-dr \
  --snapshot-identifier <snapshot-id> \
  --engine aurora-postgresql
```

### Step 4: S3 Data Access (immediate)

S3 data is already replicated to `airline-voice-transcripts-dr-263611243147-us-west-2`. Update application configuration to point to DR bucket.

### Step 5: ECS Service Recovery (30–60 minutes)

1. Deploy infrastructure to DR region (requires CDK with DR config):

```bash
cd infra && npx cdk deploy --all -c env=dr
```

2. Verify orchestrator service is running:

```bash
aws ecs describe-services \
  --region us-west-2 \
  --cluster airline-voice-agent-dr \
  --services orchestrator-dr
```

### Step 6: Validation (15–30 minutes)

1. Run smoke tests against DR environment
2. Verify database connectivity
3. Test a sample call flow end-to-end
4. Confirm observability (alarms, dashboard) is operational

## Rollback to Primary

Once primary region (us-east-1) is restored:

1. Verify primary region services are healthy
2. Sync data from DR to primary (if writes occurred in DR)
3. Update DNS/routing back to primary
4. Run full regression suite against primary
5. Decommission DR active resources (keep backups)

## Communication Plan

| Time | Action                     | Audience                 | Channel          |
| ---- | -------------------------- | ------------------------ | ---------------- |
| T+0  | Initial assessment started | Engineering team         | Slack #incidents |
| T+15 | DR activation decision     | Engineering + Management | Slack + Email    |
| T+30 | DR in progress update      | All stakeholders         | Email            |
| T+2h | DR complete or escalate    | All stakeholders         | Email + Phone    |
| T+4h | Final status update        | All stakeholders         | Email            |

## Quarterly DR Validation

Run quarterly to validate recovery readiness:

1. Verify DynamoDB PITR is enabled on all tables
2. Verify AWS Backup plan exists with correct schedule
3. Verify latest backup completed successfully (check backup job history)
4. Verify S3 replication is active (check replication metrics)
5. Verify DR vault in us-west-2 has recent backups
6. Document results in incident tracking system

## Escalation

| Condition              | Escalate To      | Contact       |
| ---------------------- | ---------------- | ------------- |
| DR activation decision | Engineering Lead | Slack DM      |
| > 4 hour RTO breach    | VP Engineering   | Phone         |
| Data loss confirmed    | Security + Legal | Email + Phone |
| Customer impact        | Customer Success | Email         |
