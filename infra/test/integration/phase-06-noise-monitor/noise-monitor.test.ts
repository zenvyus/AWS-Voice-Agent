/**
 * Phase 6 Integration Tests: Noise Monitor Stack
 * Verifies CloudFormation stack outputs and cross-stack exports.
 * Maps to: T6.I1, T6.I2
 */
import { getStackOutputs } from '../../helpers/cfn-outputs';
import { STACKS } from '../../helpers/aws-config';

describe('Phase 6 Integration: Noise Monitor Stack Outputs', () => {
  let outputs: Record<string, string>;

  beforeAll(async () => {
    outputs = await getStackOutputs(STACKS.noiseMonitor);
  });

  // T6.I1: Stack has SpeechQualityGateLambdaArn output
  test('stack has SpeechQualityGateLambdaArn output', () => {
    expect(outputs['SpeechQualityGateLambdaArn']).toBeDefined();
    expect(outputs['SpeechQualityGateLambdaArn']).toMatch(/^arn:aws:lambda:/);
  });

  // T6.I2: Stack has NoiseMonitorStateMachineArn output
  test('stack has NoiseMonitorStateMachineArn output', () => {
    expect(outputs['NoiseMonitorStateMachineArn']).toBeDefined();
    expect(outputs['NoiseMonitorStateMachineArn']).toMatch(/^arn:aws:states:/);
  });
});
