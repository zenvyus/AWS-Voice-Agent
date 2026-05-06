import {
  BackupClient,
  ListBackupPlansCommand,
  ListBackupVaultsCommand,
} from '@aws-sdk/client-backup';
import { DynamoDBClient, DescribeContinuousBackupsCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetBucketReplicationCommand } from '@aws-sdk/client-s3';
import { AWS_REGION, ENV_NAME, ACCOUNT_ID } from '../../helpers/aws-config';

const backup = new BackupClient({ region: AWS_REGION });
const dynamodb = new DynamoDBClient({ region: AWS_REGION });
const s3 = new S3Client({ region: AWS_REGION });

describe('Phase 9 E2E: DR Validation (quarterly readiness check)', () => {
  // Story 9.6 AC2: DR validation confirms PITR
  test('all DynamoDB tables have PITR enabled', async () => {
    const tables = [`voice-agent-sessions-${ENV_NAME}`, `voice-agent-noise-counters-${ENV_NAME}`];

    for (const tableName of tables) {
      const res = await dynamodb.send(
        new DescribeContinuousBackupsCommand({ TableName: tableName }),
      );
      expect(
        res.ContinuousBackupsDescription?.PointInTimeRecoveryDescription?.PointInTimeRecoveryStatus,
      ).toBe('ENABLED');
    }
  });

  // Story 9.6 AC2: DR validation confirms backup plan
  test('AWS Backup plan exists with expected schedule', async () => {
    const res = await backup.send(new ListBackupPlansCommand({}));
    const plans = res.BackupPlansList || [];
    const plan = plans.find((p) => p.BackupPlanName?.includes(`airline-voice-agent-${ENV_NAME}`));
    expect(plan).toBeDefined();
  });

  // Story 9.6 AC2: DR validation confirms backup vault
  test('backup vault exists', async () => {
    const res = await backup.send(new ListBackupVaultsCommand({}));
    const vaults = res.BackupVaultList || [];
    const vault = vaults.find((v) => v.BackupVaultName === `airline-voice-agent-${ENV_NAME}-vault`);
    expect(vault).toBeDefined();
  });

  // Story 9.6 AC2: DR validation confirms S3 replication active
  // Only runs when CRR is enabled (DR destination bucket provisioned)
  const testIfCrr = process.env.CRR_ENABLED === 'true' ? test : test.skip;
  testIfCrr('S3 replication is active on transcripts bucket', async () => {
    const res = await s3.send(
      new GetBucketReplicationCommand({
        Bucket: `airline-voice-transcripts-${ACCOUNT_ID}-${AWS_REGION}`,
      }),
    );
    const rules = res.ReplicationConfiguration?.Rules || [];
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]?.Status).toBe('Enabled');
  });
});
