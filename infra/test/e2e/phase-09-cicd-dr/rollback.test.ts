import { ECSClient, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { AWS_REGION, ENV_NAME } from '../../helpers/aws-config';

const ecs = new ECSClient({ region: AWS_REGION });

describe('Phase 9 E2E: ECS Circuit Breaker', () => {
  // Story 9.1 AC2: ECS deployment circuit breaker enabled
  test('ECS service has circuit breaker with rollback enabled', async () => {
    const res = await ecs.send(
      new DescribeServicesCommand({
        cluster: `airline-voice-agent-${ENV_NAME}`,
        services: [`orchestrator-${ENV_NAME}`],
      }),
    );

    const service = res.services?.[0];
    expect(service).toBeDefined();
    expect(service?.deploymentConfiguration?.deploymentCircuitBreaker?.enable).toBe(true);
    expect(service?.deploymentConfiguration?.deploymentCircuitBreaker?.rollback).toBe(true);
  });
});
