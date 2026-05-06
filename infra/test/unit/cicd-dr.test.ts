import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as path from 'path';
import * as fs from 'fs';
import { DisasterRecoveryStack } from '../../lib/stacks/disaster-recovery-stack';
import { OrchestratorStack } from '../../lib/stacks/orchestrator-stack';
import { getConfig } from '../../lib/config';

const config = getConfig('dev');

describe('Phase 9: CI/CD & Disaster Recovery', () => {
  let drTemplate: Template;
  let orchTemplate: Template;

  beforeAll(() => {
    // DR Stack (separate app to avoid synth conflicts)
    const drApp = new cdk.App();
    const drStack = new DisasterRecoveryStack(drApp, 'TestDR', {
      config,
      drRegion: 'us-west-2',
      transcriptsBucketArn: 'arn:aws:s3:::test-transcripts-bucket',
      transcriptsBucketKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
      destinationBucketArn: 'arn:aws:s3:::test-dr-bucket',
      destinationKmsKeyArn: 'arn:aws:kms:us-west-2:123456789012:key/dr-key',
      env: { account: '123456789012', region: 'us-east-1' },
    });
    drTemplate = Template.fromStack(drStack);

    // Orchestrator Stack (separate app for circuit breaker validation)
    const orchApp = new cdk.App();
    const orchStack = new OrchestratorStack(orchApp, 'TestOrch', {
      config,
      dataKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test',
      sessionsTableName: 'sessions-dev',
      utteranceQueueTableName: 'utterance-queue-dev',
      noiseCountersTableName: 'noise-counters-dev',
      kvsStreamArn: 'arn:aws:kinesisvideo:us-east-1:123456789012:stream/test',
      transcriptsBucketName: 'test-bucket',
      redisEndpoint: 'redis.test.local',
      auroraEndpoint: 'aurora.test.local',
      env: { account: '123456789012', region: 'us-east-1' },
    });
    orchTemplate = Template.fromStack(orchStack);
  });

  // Story 9.1 AC2: ECS circuit breaker enabled
  test('ECS service has circuit breaker with rollback enabled', () => {
    orchTemplate.hasResourceProperties('AWS::ECS::Service', {
      DeploymentConfiguration: {
        DeploymentCircuitBreaker: {
          Enable: true,
          Rollback: true,
        },
      },
    });
  });

  // Story 9.2 AC2: AWS Backup plan exists
  test('creates AWS Backup plan with daily schedule', () => {
    drTemplate.hasResourceProperties('AWS::Backup::BackupPlan', {
      BackupPlan: {
        BackupPlanName: 'airline-voice-agent-dev-daily',
      },
    });
  });

  // Story 9.2 AC3: Backup vault exists
  test('creates AWS Backup vault', () => {
    drTemplate.hasResourceProperties('AWS::Backup::BackupVault', {
      BackupVaultName: 'airline-voice-agent-dev-vault',
    });
  });

  // Story 9.2: Backup selection by tag
  test('creates backup selection targeting project-tagged resources', () => {
    drTemplate.hasResourceProperties('AWS::Backup::BackupSelection', {
      BackupSelection: {
        SelectionName: 'TaggedResources',
      },
    });
  });

  // Story 9.4: S3 replication role exists
  test('creates S3 replication IAM role', () => {
    drTemplate.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 's3-replication-role-dev',
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 's3.amazonaws.com' },
            Action: 'sts:AssumeRole',
          },
        ],
      },
    });
  });

  // Story 9.4: Replication role has correct permissions
  test('S3 replication role has source and destination permissions', () => {
    const policies = drTemplate.findResources('AWS::IAM::Policy');
    const policyStatements = Object.values(policies)
      .map((p: Record<string, unknown>) => {
        const props = p['Properties'] as Record<string, unknown>;
        const doc = props['PolicyDocument'] as Record<string, unknown>;
        return doc['Statement'] as Array<Record<string, unknown>>;
      })
      .flat();

    const actions = policyStatements.map((s) => s['Action']).flat();
    expect(actions).toContain('s3:GetReplicationConfiguration');
    expect(actions).toContain('s3:ReplicateObject');
    expect(actions).toContain('kms:Decrypt');
    expect(actions).toContain('kms:Encrypt');
  });

  // Story 9.5: Pipeline notification step exists in workflow
  test('GitHub Actions workflow has deploy notification steps', () => {
    const workflowPath = path.join(__dirname, '../../../.github/workflows/ci.yml');
    const content = fs.readFileSync(workflowPath, 'utf8');
    expect(content).toContain('notify-test-success');
    expect(content).toContain('notify-test-failure');
    expect(content).toContain('aws sns publish');
  });

  // Story 9.5 AC3: Notification uses OIDC
  test('Pipeline notification uses OIDC credentials (no static keys)', () => {
    const workflowPath = path.join(__dirname, '../../../.github/workflows/ci.yml');
    const content = fs.readFileSync(workflowPath, 'utf8');
    expect(content).not.toContain('AWS_ACCESS_KEY_ID');
    expect(content).not.toContain('AWS_SECRET_ACCESS_KEY');
    expect(content).toContain('role-to-assume');
  });

  // Story 9.6 AC1: DR runbook exists
  test('DR runbook exists with required sections', () => {
    const runbookPath = path.join(
      __dirname,
      '../../../docs/runbooks/phase-09-disaster-recovery.md',
    );
    const content = fs.readFileSync(runbookPath, 'utf8');
    expect(content).toContain('RTO');
    expect(content).toContain('RPO');
    expect(content).toContain('Recovery Steps');
    expect(content).toContain('Communication');
  });

  // Story 9.6 AC3: RTO/RPO targets documented
  test('DR runbook documents RTO < 4 hours and RPO < 1 hour', () => {
    const runbookPath = path.join(
      __dirname,
      '../../../docs/runbooks/phase-09-disaster-recovery.md',
    );
    const content = fs.readFileSync(runbookPath, 'utf8');
    expect(content).toContain('4 hour');
    expect(content).toContain('1 hour');
  });

  // Stack outputs
  test('DR stack has expected outputs', () => {
    drTemplate.hasOutput('BackupVaultArn', {});
    drTemplate.hasOutput('BackupPlanId', {});
    drTemplate.hasOutput('ReplicationRoleArn', {});
  });
});
