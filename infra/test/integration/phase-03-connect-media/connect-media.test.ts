/**
 * Phase 3 Integration Tests: Connect & Media Stack
 * Verifies CloudFormation stack outputs and cross-stack exports.
 */
import { getStackOutputs } from '../../helpers/cfn-outputs';
import { STACKS } from '../../helpers/aws-config';

describe('Phase 3 Integration: Connect & Media Stack Outputs', () => {
  let outputs: Record<string, string>;

  beforeAll(async () => {
    outputs = await getStackOutputs(STACKS.connectMedia);
  });

  test('stack has ConnectInstanceArn output', () => {
    expect(outputs['ConnectInstanceArn']).toBeDefined();
    expect(outputs['ConnectInstanceArn']).toMatch(/^arn:aws:connect:/);
  });

  test('stack has ConnectInstanceId output', () => {
    expect(outputs['ConnectInstanceId']).toBeDefined();
    expect(outputs['ConnectInstanceId']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  test('stack has ContactFlowId output', () => {
    expect(outputs['ContactFlowId']).toBeDefined();
    expect(outputs['ContactFlowId']).toMatch(/contact-flow/);
  });

  test('stack has KvsStreamArn output', () => {
    expect(outputs['KvsStreamArn']).toBeDefined();
    expect(outputs['KvsStreamArn']).toMatch(/^arn:aws:kinesisvideo:/);
  });

  test('stack has SessionBootstrapLambdaArn output', () => {
    expect(outputs['SessionBootstrapLambdaArn']).toBeDefined();
    expect(outputs['SessionBootstrapLambdaArn']).toMatch(/^arn:aws:lambda:/);
  });
});
