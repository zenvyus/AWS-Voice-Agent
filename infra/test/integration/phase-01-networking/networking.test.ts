/**
 * Phase 1 Integration Tests: Networking Stack
 * Verifies CloudFormation stack outputs and cross-stack exports.
 */
import { getStackOutputs } from '../../helpers/cfn-outputs';
import { STACKS } from '../../helpers/aws-config';

describe('Phase 1 Integration: Networking Stack Outputs', () => {
  let outputs: Record<string, string>;

  beforeAll(async () => {
    outputs = await getStackOutputs(STACKS.networking);
  });

  test('stack has VpcId output', () => {
    const key = Object.keys(outputs).find((k) => k.includes('VpcId'));
    expect(key).toBeDefined();
    expect(outputs[key!]).toMatch(/^vpc-/);
  });

  test('stack has VpcCidr output', () => {
    const key = Object.keys(outputs).find((k) => k.includes('VpcCidr'));
    expect(key).toBeDefined();
    expect(outputs[key!]).toBe('10.0.0.0/16');
  });
});
