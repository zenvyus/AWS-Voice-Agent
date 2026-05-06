/**
 * Phase 3 E2E Tests: Connect & Media Stack
 * Verifies deployed Amazon Connect instance, contact flow,
 * KVS stream, Lambda, and Transcribe vocabulary.
 */
import { ConnectClient, DescribeInstanceCommand } from '@aws-sdk/client-connect';
import { KinesisVideoClient, DescribeStreamCommand } from '@aws-sdk/client-kinesis-video';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { TranscribeClient, GetVocabularyCommand } from '@aws-sdk/client-transcribe';
import { getStackOutputs } from '../../helpers/cfn-outputs';
import { AWS_REGION, ENV_NAME, STACKS } from '../../helpers/aws-config';

const connect = new ConnectClient({ region: AWS_REGION });
const kvs = new KinesisVideoClient({ region: AWS_REGION });
const lambda = new LambdaClient({ region: AWS_REGION });
const transcribe = new TranscribeClient({ region: AWS_REGION });

let outputs: Record<string, string>;

describe('Phase 3 E2E: Connect & Media', () => {
  beforeAll(async () => {
    outputs = await getStackOutputs(STACKS.connectMedia);
  });

  // Connect Instance
  test('Connect instance exists and is ACTIVE', async () => {
    const instanceId = outputs['ConnectInstanceId'];
    expect(instanceId).toBeDefined();
    const res = await connect.send(new DescribeInstanceCommand({ InstanceId: instanceId }));
    expect(res.Instance?.InstanceStatus).toBe('ACTIVE');
    expect(res.Instance?.InboundCallsEnabled).toBe(true);
    expect(res.Instance?.OutboundCallsEnabled).toBe(false);
  });

  // Kinesis Video Stream
  test('KVS stream exists and is ACTIVE', async () => {
    const res = await kvs.send(
      new DescribeStreamCommand({ StreamName: `connect-audio-${ENV_NAME}` }),
    );
    expect(res.StreamInfo?.Status).toBe('ACTIVE');
    expect(res.StreamInfo?.DataRetentionInHours).toBe(24);
  });

  // Session Bootstrap Lambda
  test('session-bootstrap Lambda exists and uses Python 3.12', async () => {
    const res = await lambda.send(
      new GetFunctionCommand({
        FunctionName: `session-bootstrap-${ENV_NAME}`,
      }),
    );
    expect(res.Configuration?.Runtime).toBe('python3.12');
    expect(res.Configuration?.State).toBe('Active');
  });

  test('session-bootstrap Lambda is in a VPC', async () => {
    const res = await lambda.send(
      new GetFunctionCommand({
        FunctionName: `session-bootstrap-${ENV_NAME}`,
      }),
    );
    expect(res.Configuration?.VpcConfig?.SubnetIds?.length).toBeGreaterThan(0);
    expect(res.Configuration?.VpcConfig?.SecurityGroupIds?.length).toBeGreaterThan(0);
  });

  // Transcribe Custom Vocabulary
  test('Transcribe custom vocabulary exists and is READY', async () => {
    const res = await transcribe.send(
      new GetVocabularyCommand({
        VocabularyName: `airline-domain-vocab-${ENV_NAME}`,
      }),
    );
    expect(res.VocabularyState).toBe('READY');
    expect(res.LanguageCode).toBe('en-US');
  });
});
