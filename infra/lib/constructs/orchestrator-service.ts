import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as appscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import { Construct } from 'constructs';

export interface OrchestratorServiceProps {
  environmentName: string;
  vpc: ec2.IVpc;
  encryptionKey: kms.IKey;
  containerEnv: Record<string, string>;
}

export class OrchestratorService extends Construct {
  public readonly repository: ecr.Repository;
  public readonly cluster: ecs.Cluster;
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly service: ecs.FargateService;
  public readonly nlb: elbv2.NetworkLoadBalancer;

  constructor(scope: Construct, id: string, props: OrchestratorServiceProps) {
    super(scope, id);

    // ECR Repository
    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName: `airline-voice-orchestrator-${props.environmentName}`,
      imageScanOnPush: true,
      encryptionKey: props.encryptionKey,
      lifecycleRules: [
        {
          maxImageCount: 10,
          description: 'Keep last 10 images',
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ECS Cluster
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: `airline-voice-agent-${props.environmentName}`,
      vpc: props.vpc,
      containerInsights: true,
    });

    // Log Group
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/orchestrator-${props.environmentName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Task Definition
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      family: `orchestrator-${props.environmentName}`,
      cpu: 1024,
      memoryLimitMiB: 2048,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    // Container
    this.taskDefinition.addContainer('orchestrator', {
      containerName: 'orchestrator',
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/docker/library/python:3.12-slim'),
      portMappings: [{ containerPort: 8080, protocol: ecs.Protocol.TCP }],
      environment: {
        ENVIRONMENT: props.environmentName,
        ...props.containerEnv,
      },
      logging: ecs.LogDrivers.awsLogs({
        logGroup,
        streamPrefix: 'orchestrator',
      }),
      // Container health check will be enabled once the real image is deployed
      // healthCheck requires curl which is not in python:3.12-slim
    });

    // Task role permissions
    this.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'kinesisvideo:GetMedia',
          'kinesisvideo:GetDataEndpoint',
          'kinesisvideo:ListStreams',
        ],
        resources: ['*'],
      }),
    );

    this.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['transcribe:StartStreamTranscription'],
        resources: ['*'],
      }),
    );

    this.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['polly:SynthesizeSpeech'],
        resources: ['*'],
      }),
    );

    this.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
          'bedrock:InvokeAgent',
        ],
        resources: ['*'],
      }),
    );

    this.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['connect:StartContactStreaming'],
        resources: ['*'],
      }),
    );

    props.encryptionKey.grantEncryptDecrypt(this.taskDefinition.taskRole);

    // Security Group for service
    const serviceSg = new ec2.SecurityGroup(this, 'ServiceSg', {
      vpc: props.vpc,
      description: 'Orchestrator Fargate service security group',
      allowAllOutbound: true,
    });

    serviceSg.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(8080),
      'Allow traffic from VPC on port 8080',
    );

    // Network Load Balancer (internal)
    this.nlb = new elbv2.NetworkLoadBalancer(this, 'NLB', {
      loadBalancerName: `orch-nlb-${props.environmentName}`,
      vpc: props.vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Fargate Service
    this.service = new ecs.FargateService(this, 'Service', {
      serviceName: `orchestrator-${props.environmentName}`,
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: 0,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [serviceSg],
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      circuitBreaker: { rollback: true },
    });

    // NLB Listener + Target Group
    const listener = this.nlb.addListener('Listener', {
      port: 8080,
      protocol: elbv2.Protocol.TCP,
    });

    listener.addTargets('OrchestratorTarget', {
      port: 8080,
      targets: [this.service],
      healthCheck: {
        path: '/health',
        protocol: elbv2.Protocol.HTTP,
        interval: cdk.Duration.seconds(30),
      },
    });

    // Autoscaling
    const scaling = this.service.autoScaleTaskCount({
      minCapacity: 0,
      maxCapacity: 10,
    });

    scaling.scaleOnMetric('ActiveCallScaling', {
      metric: this.cluster.metricCpuUtilization(),
      scalingSteps: [
        { upper: 10, change: -1 },
        { lower: 50, change: +1 },
        { lower: 80, change: +3 },
      ],
      adjustmentType: appscaling.AdjustmentType.CHANGE_IN_CAPACITY,
    });
  }
}
