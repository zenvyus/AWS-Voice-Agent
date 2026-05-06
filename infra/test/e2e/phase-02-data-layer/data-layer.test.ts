/**
 * Phase 2 E2E Tests: Data Layer Stack
 * Verifies deployed DynamoDB tables, KMS keys, S3 buckets, Aurora cluster,
 * and ElastiCache Redis against the live AWS dev environment.
 */
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { KMSClient, DescribeKeyCommand } from '@aws-sdk/client-kms';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { RDSClient, DescribeDBClustersCommand } from '@aws-sdk/client-rds';
import { ElastiCacheClient, DescribeReplicationGroupsCommand } from '@aws-sdk/client-elasticache';
import { AWS_REGION, ENV_NAME, ACCOUNT_ID } from '../../helpers/aws-config';

const ddb = new DynamoDBClient({ region: AWS_REGION });
const kms = new KMSClient({ region: AWS_REGION });
const s3 = new S3Client({ region: AWS_REGION });
const rds = new RDSClient({ region: AWS_REGION });
const elasticache = new ElastiCacheClient({ region: AWS_REGION });

describe('Phase 2 E2E: Data Layer', () => {
  // DynamoDB Tables
  describe('DynamoDB Tables', () => {
    const tableNames = [
      `voice-agent-sessions-${ENV_NAME}`,
      `voice-agent-utterance-queue-${ENV_NAME}`,
      `voice-agent-noise-counters-${ENV_NAME}`,
      `airport-codes-${ENV_NAME}`,
    ];

    test.each(tableNames)('table %s exists and is ACTIVE', async (tableName) => {
      const res = await ddb.send(new DescribeTableCommand({ TableName: tableName }));
      expect(res.Table?.TableStatus).toBe('ACTIVE');
      expect(res.Table?.BillingModeSummary?.BillingMode).toBe('PAY_PER_REQUEST');
    });

    test('sessions table has correct key schema', async () => {
      const res = await ddb.send(
        new DescribeTableCommand({ TableName: `voice-agent-sessions-${ENV_NAME}` }),
      );
      const pk = res.Table?.KeySchema?.find((k) => k.KeyType === 'HASH');
      expect(pk?.AttributeName).toBe('contactId');
    });
  });

  // KMS Keys
  describe('KMS Keys', () => {
    test('data key exists and is enabled', async () => {
      const res = await kms.send(
        new DescribeKeyCommand({
          KeyId: `alias/airline-voice-agent-data-key-${ENV_NAME}`,
        }),
      );
      expect(res.KeyMetadata?.KeyState).toBe('Enabled');
      expect(res.KeyMetadata?.KeyManager).toBe('CUSTOMER');
    });

    test('transcript key exists and is enabled', async () => {
      const res = await kms.send(
        new DescribeKeyCommand({
          KeyId: `alias/airline-voice-agent-transcript-key-${ENV_NAME}`,
        }),
      );
      expect(res.KeyMetadata?.KeyState).toBe('Enabled');
      expect(res.KeyMetadata?.KeyManager).toBe('CUSTOMER');
    });
  });

  // S3 Buckets
  describe('S3 Buckets', () => {
    const buckets = [
      `airline-voice-transcripts-${ACCOUNT_ID}-${AWS_REGION}`,
      `airline-voice-assets-${ACCOUNT_ID}-${AWS_REGION}`,
    ];

    test.each(buckets)('bucket %s exists', async (bucket) => {
      const res = await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      expect(res.$metadata.httpStatusCode).toBe(200);
    });
  });

  // Aurora Cluster
  describe('Aurora Cluster', () => {
    test('Aurora cluster exists and is available', async () => {
      const res = await rds.send(
        new DescribeDBClustersCommand({
          DBClusterIdentifier: `airline-voice-agent-${ENV_NAME}`,
        }),
      );
      expect(res.DBClusters?.[0]?.Status).toBe('available');
      expect(res.DBClusters?.[0]?.Engine).toBe('aurora-postgresql');
      expect(res.DBClusters?.[0]?.EngineVersion).toMatch(/^15\./);
    });

    test('Aurora cluster has IAM authentication enabled', async () => {
      const res = await rds.send(
        new DescribeDBClustersCommand({
          DBClusterIdentifier: `airline-voice-agent-${ENV_NAME}`,
        }),
      );
      expect(res.DBClusters?.[0]?.IAMDatabaseAuthenticationEnabled).toBe(true);
    });
  });

  // ElastiCache Redis
  describe('ElastiCache Redis', () => {
    test('Redis replication group exists and is available', async () => {
      const res = await elasticache.send(new DescribeReplicationGroupsCommand({}));
      const rg = res.ReplicationGroups?.find((g) =>
        g.Description?.includes(`airline-voice-agent Redis ${ENV_NAME}`),
      );
      expect(rg).toBeDefined();
      expect(rg?.Status).toBe('available');
      expect(rg?.TransitEncryptionEnabled).toBe(true);
      expect(rg?.AtRestEncryptionEnabled).toBe(true);
    });
  });
});
