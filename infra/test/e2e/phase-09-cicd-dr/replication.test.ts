import {
  S3Client,
  GetBucketReplicationCommand,
  GetPublicAccessBlockCommand,
} from '@aws-sdk/client-s3';
import { AWS_REGION, ACCOUNT_ID } from '../../helpers/aws-config';

const s3 = new S3Client({ region: AWS_REGION });

const TRANSCRIPTS_BUCKET = `airline-voice-transcripts-${ACCOUNT_ID}-${AWS_REGION}`;

// CRR tests only run when DR destination bucket is provisioned (CRR_ENABLED=true)
const crrEnabled = process.env.CRR_ENABLED === 'true';
const describeIfCrr = crrEnabled ? describe : describe.skip;

describeIfCrr('Phase 9 E2E: S3 Cross-Region Replication (CRR active)', () => {
  // Story 9.4 AC1: Replication rule configured
  test('transcripts bucket has replication rule enabled', async () => {
    const res = await s3.send(new GetBucketReplicationCommand({ Bucket: TRANSCRIPTS_BUCKET }));
    const rules = res.ReplicationConfiguration?.Rules || [];
    expect(rules.length).toBeGreaterThan(0);
    const activeRule = rules.find((r) => r.Status === 'Enabled');
    expect(activeRule).toBeDefined();
  });

  // Story 9.4 AC2: Destination targets DR region
  test('replication destination targets us-west-2', async () => {
    const res = await s3.send(new GetBucketReplicationCommand({ Bucket: TRANSCRIPTS_BUCKET }));
    const rules = res.ReplicationConfiguration?.Rules || [];
    const rule = rules[0];
    expect(rule?.Destination?.Bucket).toContain('us-west-2');
  });

  // Story 9.4 AC3: Replica encryption uses DR KMS key
  test('replication uses KMS encryption for destination', async () => {
    const res = await s3.send(new GetBucketReplicationCommand({ Bucket: TRANSCRIPTS_BUCKET }));
    const rules = res.ReplicationConfiguration?.Rules || [];
    const rule = rules[0];
    expect(rule?.Destination?.EncryptionConfiguration?.ReplicaKmsKeyID).toBeDefined();
  });
});

describe('Phase 9 E2E: S3 Bucket Security', () => {
  // Buckets block public access (always active regardless of CRR)
  test('transcripts bucket blocks public access', async () => {
    const res = await s3.send(new GetPublicAccessBlockCommand({ Bucket: TRANSCRIPTS_BUCKET }));
    const config = res.PublicAccessBlockConfiguration;
    expect(config?.BlockPublicAcls).toBe(true);
    expect(config?.BlockPublicPolicy).toBe(true);
    expect(config?.IgnorePublicAcls).toBe(true);
    expect(config?.RestrictPublicBuckets).toBe(true);
  });
});
