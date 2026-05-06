import {
  BackupClient,
  ListBackupPlansCommand,
  ListBackupVaultsCommand,
  ListBackupSelectionsCommand,
} from '@aws-sdk/client-backup';
import { DynamoDBClient, DescribeContinuousBackupsCommand } from '@aws-sdk/client-dynamodb';
import { AWS_REGION, ENV_NAME } from '../../helpers/aws-config';

const backup = new BackupClient({ region: AWS_REGION });
const dynamodb = new DynamoDBClient({ region: AWS_REGION });

const TABLE_NAMES = [
  `voice-agent-sessions-${ENV_NAME}`,
  `voice-agent-utterance-queue-${ENV_NAME}`,
  `voice-agent-noise-counters-${ENV_NAME}`,
  `airport-codes-${ENV_NAME}`,
];

describe('Phase 9 E2E: Backup & DR', () => {
  // Story 9.2 AC1: DynamoDB PITR enabled
  test.each(TABLE_NAMES)('DynamoDB table %s has PITR enabled', async (tableName) => {
    const res = await dynamodb.send(new DescribeContinuousBackupsCommand({ TableName: tableName }));
    expect(
      res.ContinuousBackupsDescription?.PointInTimeRecoveryDescription?.PointInTimeRecoveryStatus,
    ).toBe('ENABLED');
  });

  // Story 9.2 AC2: AWS Backup plan exists
  test('AWS Backup plan exists with correct name', async () => {
    const res = await backup.send(new ListBackupPlansCommand({}));
    const plans = res.BackupPlansList || [];
    const plan = plans.find((p) => p.BackupPlanName?.includes(`airline-voice-agent-${ENV_NAME}`));
    expect(plan).toBeDefined();
  });

  // Story 9.2 AC3: Backup vault exists
  test('backup vault exists in primary region', async () => {
    const res = await backup.send(new ListBackupVaultsCommand({}));
    const vaults = res.BackupVaultList || [];
    const vault = vaults.find((v) => v.BackupVaultName === `airline-voice-agent-${ENV_NAME}-vault`);
    expect(vault).toBeDefined();
  });

  // Story 9.2: Backup selection exists
  test('backup plan has selection targeting tagged resources', async () => {
    const plansRes = await backup.send(new ListBackupPlansCommand({}));
    const plan = (plansRes.BackupPlansList || []).find((p) =>
      p.BackupPlanName?.includes(`airline-voice-agent-${ENV_NAME}`),
    );
    expect(plan).toBeDefined();

    if (plan?.BackupPlanId) {
      const selectionsRes = await backup.send(
        new ListBackupSelectionsCommand({ BackupPlanId: plan.BackupPlanId }),
      );
      expect((selectionsRes.BackupSelectionsList || []).length).toBeGreaterThan(0);
    }
  });
});
