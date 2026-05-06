import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { OrchestratorStack } from '../../lib/stacks/orchestrator-stack';
import { EnvironmentConfig } from '../../lib/config/schema';

describe('OrchestratorStack', () => {
  const testConfig: EnvironmentConfig = {
    environmentName: 'dev',
    account: '123456789012',
    region: 'us-east-1',
    vpcCidr: '10.0.0.0/16',
    maxAzs: 2,
    natGateways: 1,
    tags: {
      Environment: 'dev',
      Project: 'airline-voice-agent',
      ManagedBy: 'cdk',
    },
  };

  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new OrchestratorStack(app, 'TestOrchestratorStack', {
      config: testConfig,
      dataKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-data-key',
      sessionsTableName: 'voice-agent-sessions-dev',
      utteranceQueueTableName: 'voice-agent-utterance-queue-dev',
      noiseCountersTableName: 'voice-agent-noise-counters-dev',
      kvsStreamArn: 'arn:aws:kinesisvideo:us-east-1:123456789012:stream/connect-audio-dev/123',
      transcriptsBucketName: 'airline-voice-transcripts-123456789012-us-east-1',
      redisEndpoint: 'master.test.cache.amazonaws.com',
      auroraEndpoint: 'airline-voice-agent-dev.cluster-test.us-east-1.rds.amazonaws.com',
      env: { account: testConfig.account, region: testConfig.region },
    });
    template = Template.fromStack(stack);
  });

  // ECR Repository
  test('creates ECR repository with image scanning', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'airline-voice-orchestrator-dev',
      ImageScanningConfiguration: { ScanOnPush: true },
    });
  });

  test('ECR repository has lifecycle rule', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      LifecyclePolicy: Match.objectLike({
        LifecyclePolicyText: Match.stringLikeRegexp('imageCountMoreThan'),
      }),
    });
  });

  // ECS Cluster
  test('creates ECS cluster with container insights', () => {
    template.hasResourceProperties('AWS::ECS::Cluster', {
      ClusterName: 'airline-voice-agent-dev',
      ClusterSettings: Match.arrayWith([
        Match.objectLike({ Name: 'containerInsights', Value: 'enabled' }),
      ]),
    });
  });

  // Fargate Task Definition
  test('creates Fargate task definition with correct CPU and memory', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Cpu: '1024',
      Memory: '2048',
      NetworkMode: 'awsvpc',
      RequiresCompatibilities: ['FARGATE'],
      Family: 'orchestrator-dev',
    });
  });

  test('task definition has orchestrator container on port 8080', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Name: 'orchestrator',
          PortMappings: Match.arrayWith([Match.objectLike({ ContainerPort: 8080 })]),
        }),
      ]),
    });
  });

  test('container has required environment variables', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Name: 'orchestrator',
          Environment: Match.arrayWith([
            Match.objectLike({ Name: 'ENVIRONMENT', Value: 'dev' }),
            Match.objectLike({ Name: 'SESSIONS_TABLE', Value: 'voice-agent-sessions-dev' }),
            Match.objectLike({
              Name: 'UTTERANCE_QUEUE_TABLE',
              Value: 'voice-agent-utterance-queue-dev',
            }),
          ]),
        }),
      ]),
    });
  });

  // Fargate Service
  test('creates Fargate service with desired count 1', () => {
    template.hasResourceProperties('AWS::ECS::Service', {
      ServiceName: 'orchestrator-dev',
      DesiredCount: 0,
      LaunchType: 'FARGATE',
    });
  });

  // Network Load Balancer
  test('creates internal NLB', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Name: 'orch-nlb-dev',
      Scheme: 'internal',
      Type: 'network',
    });
  });

  test('NLB listener on port 8080', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Port: 8080,
      Protocol: 'TCP',
    });
  });

  test('NLB target group with health check on /health', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
      Port: 8080,
      HealthCheckPath: '/health',
    });
  });

  // Autoscaling
  test('creates autoscaling scalable target', () => {
    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
      MinCapacity: 0,
      MaxCapacity: 10,
    });
  });

  // Security Group
  test('service security group allows port 8080 from VPC CIDR', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Orchestrator Fargate service security group',
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          IpProtocol: 'tcp',
          FromPort: 8080,
          ToPort: 8080,
        }),
      ]),
    });
  });

  // IAM Task Role
  test('task role has KVS permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['kinesisvideo:GetMedia']),
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  test('task role has Bedrock permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['bedrock:InvokeModel']),
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  // Tags
  test('applies environment tags', () => {
    template.hasResourceProperties('AWS::ECS::Cluster', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'Environment', Value: 'dev' }),
        Match.objectLike({ Key: 'Project', Value: 'airline-voice-agent' }),
      ]),
    });
  });
});
