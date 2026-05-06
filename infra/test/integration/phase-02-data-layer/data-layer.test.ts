/**
 * Phase 2 Integration Tests: Data Layer Stack
 * Verifies CloudFormation stack outputs and cross-stack exports.
 */
import { getStackOutputs } from '../../helpers/cfn-outputs';
import { STACKS } from '../../helpers/aws-config';

describe('Phase 2 Integration: Data Layer Stack Outputs', () => {
  let outputs: Record<string, string>;

  beforeAll(async () => {
    outputs = await getStackOutputs(STACKS.dataLayer);
  });

  test('stack has DataKeyArn output', () => {
    const key = Object.keys(outputs).find((k) => k.includes('DataKey'));
    expect(key).toBeDefined();
    expect(outputs[key!]).toMatch(/^arn:aws:kms:/);
  });

  test('stack has TranscriptKeyArn output', () => {
    const key = Object.keys(outputs).find((k) => k.includes('TranscriptKey'));
    expect(key).toBeDefined();
    expect(outputs[key!]).toMatch(/^arn:aws:kms:/);
  });

  test('stack has SessionsTable output', () => {
    const key = Object.keys(outputs).find((k) => k.includes('Sessions'));
    expect(key).toBeDefined();
  });

  test('stack has TranscriptsBucket output', () => {
    const key = Object.keys(outputs).find((k) => k.includes('Transcript') && k.includes('Bucket'));
    expect(key).toBeDefined();
  });

  test('stack has Aurora endpoint output', () => {
    const key = Object.keys(outputs).find((k) => k.includes('Aurora') || k.includes('Cluster'));
    expect(key).toBeDefined();
  });

  test('stack has Redis endpoint output', () => {
    const key = Object.keys(outputs).find((k) => k.includes('Redis'));
    expect(key).toBeDefined();
  });
});
