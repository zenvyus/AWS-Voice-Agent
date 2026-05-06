/**
 * Phase 4 Integration Tests: Orchestrator Stack
 * Verifies CloudFormation stack outputs and cross-stack exports.
 */
import { getStackOutputs } from '../../helpers/cfn-outputs';
import { STACKS } from '../../helpers/aws-config';

describe('Phase 4 Integration: Orchestrator Stack Outputs', () => {
  let outputs: Record<string, string>;

  beforeAll(async () => {
    outputs = await getStackOutputs(STACKS.orchestrator);
  });

  test('stack has EcsClusterArn output', () => {
    expect(outputs['EcsClusterArn']).toBeDefined();
    expect(outputs['EcsClusterArn']).toMatch(/^arn:aws:ecs:/);
  });

  test('stack has OrchestratorServiceArn output', () => {
    expect(outputs['OrchestratorServiceArn']).toBeDefined();
    expect(outputs['OrchestratorServiceArn']).toMatch(/service/);
  });

  test('stack has OrchestratorNlbDns output', () => {
    expect(outputs['OrchestratorNlbDns']).toBeDefined();
    expect(outputs['OrchestratorNlbDns']).toContain('.elb.');
  });

  test('stack has OrchestratorNlbArn output', () => {
    expect(outputs['OrchestratorNlbArn']).toBeDefined();
    expect(outputs['OrchestratorNlbArn']).toMatch(/loadbalancer/);
  });

  test('stack has EcrRepositoryUri output', () => {
    expect(outputs['EcrRepositoryUri']).toBeDefined();
    expect(outputs['EcrRepositoryUri']).toContain('dkr.ecr.');
  });
});
