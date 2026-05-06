/**
 * Phase 4 E2E Tests: Orchestrator Stack
 * Verifies deployed ECS cluster, ECR repository, Fargate service,
 * and Network Load Balancer.
 */
import { ECSClient, DescribeClustersCommand, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { ECRClient, DescribeRepositoriesCommand } from '@aws-sdk/client-ecr';
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
  DescribeTargetGroupsCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { getStackOutputs } from '../../helpers/cfn-outputs';
import { AWS_REGION, ENV_NAME, STACKS } from '../../helpers/aws-config';

const ecs = new ECSClient({ region: AWS_REGION });
const ecr = new ECRClient({ region: AWS_REGION });
const elbv2 = new ElasticLoadBalancingV2Client({ region: AWS_REGION });

let outputs: Record<string, string>;

describe('Phase 4 E2E: Orchestrator', () => {
  beforeAll(async () => {
    outputs = await getStackOutputs(STACKS.orchestrator);
  });

  // ECS Cluster
  test('ECS cluster exists and is ACTIVE', async () => {
    const res = await ecs.send(
      new DescribeClustersCommand({
        clusters: [`airline-voice-agent-${ENV_NAME}`],
        include: ['SETTINGS'],
      }),
    );
    expect(res.clusters?.[0]?.status).toBe('ACTIVE');
    expect(res.clusters?.[0]?.clusterName).toBe(`airline-voice-agent-${ENV_NAME}`);
    // Verify container insights
    const insights = res.clusters?.[0]?.settings?.find((s) => s.name === 'containerInsights');
    expect(insights?.value).toBe('enabled');
  });

  // ECR Repository
  test('ECR repository exists with image scanning enabled', async () => {
    const res = await ecr.send(
      new DescribeRepositoriesCommand({
        repositoryNames: [`airline-voice-orchestrator-${ENV_NAME}`],
      }),
    );
    expect(res.repositories?.[0]?.repositoryName).toBe(`airline-voice-orchestrator-${ENV_NAME}`);
    expect(res.repositories?.[0]?.imageScanningConfiguration?.scanOnPush).toBe(true);
  });

  // Fargate Service
  test('Fargate service exists', async () => {
    const res = await ecs.send(
      new DescribeServicesCommand({
        cluster: `airline-voice-agent-${ENV_NAME}`,
        services: [`orchestrator-${ENV_NAME}`],
      }),
    );
    expect(res.services?.[0]?.status).toBe('ACTIVE');
    expect(res.services?.[0]?.launchType).toBe('FARGATE');
    expect(res.services?.[0]?.desiredCount).toBe(0);
  });

  // Network Load Balancer
  test('NLB exists and is active', async () => {
    const nlbArn = outputs['OrchestratorNlbArn'];
    expect(nlbArn).toBeDefined();
    const res = await elbv2.send(
      new DescribeLoadBalancersCommand({
        LoadBalancerArns: [nlbArn],
      }),
    );
    expect(res.LoadBalancers?.[0]?.State?.Code).toBe('active');
    expect(res.LoadBalancers?.[0]?.Scheme).toBe('internal');
    expect(res.LoadBalancers?.[0]?.Type).toBe('network');
  });

  test('NLB has target group with health check on /health', async () => {
    const nlbArn = outputs['OrchestratorNlbArn'];
    const res = await elbv2.send(
      new DescribeTargetGroupsCommand({
        LoadBalancerArn: nlbArn,
      }),
    );
    expect(res.TargetGroups!.length).toBeGreaterThanOrEqual(1);
    expect(res.TargetGroups?.[0]?.HealthCheckPath).toBe('/health');
  });

  // Cross-stack exports
  test('stack exports ECS cluster ARN', () => {
    expect(outputs['EcsClusterArn']).toBeDefined();
    expect(outputs['EcsClusterArn']).toMatch(/^arn:aws:ecs:/);
  });

  test('stack exports NLB DNS', () => {
    expect(outputs['OrchestratorNlbDns']).toBeDefined();
    expect(outputs['OrchestratorNlbDns']).toContain('elb.');
  });

  test('stack exports ECR repository URI', () => {
    expect(outputs['EcrRepositoryUri']).toBeDefined();
    expect(outputs['EcrRepositoryUri']).toContain('dkr.ecr.');
  });
});
