import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/schema';
import { OrchestratorService } from '../constructs/orchestrator-service';

export interface OrchestratorStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  dataKeyArn: string;
  sessionsTableName: string;
  utteranceQueueTableName: string;
  noiseCountersTableName: string;
  kvsStreamArn: string;
  transcriptsBucketName: string;
  redisEndpoint: string;
  auroraEndpoint: string;
}

export class OrchestratorStack extends cdk.Stack {
  public readonly orchestrator: OrchestratorService;

  constructor(scope: Construct, id: string, props: OrchestratorStackProps) {
    super(scope, id, props);

    const { config } = props;

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      tags: { Name: `airline-voice-agent-${config.environmentName}-vpc` },
    });

    const dataKey = kms.Key.fromKeyArn(this, 'DataKey', props.dataKeyArn);

    this.orchestrator = new OrchestratorService(this, 'Orchestrator', {
      environmentName: config.environmentName,
      vpc,
      encryptionKey: dataKey,
      containerEnv: {
        SESSIONS_TABLE: props.sessionsTableName,
        UTTERANCE_QUEUE_TABLE: props.utteranceQueueTableName,
        NOISE_COUNTERS_TABLE: props.noiseCountersTableName,
        KVS_STREAM_ARN: props.kvsStreamArn,
        TRANSCRIPTS_BUCKET: props.transcriptsBucketName,
        REDIS_ENDPOINT: props.redisEndpoint,
        AURORA_ENDPOINT: props.auroraEndpoint,
      },
    });

    // Cross-stack exports
    new cdk.CfnOutput(this, 'EcsClusterArn', {
      value: this.orchestrator.cluster.clusterArn,
      exportName: `${config.environmentName}-EcsClusterArn`,
    });
    new cdk.CfnOutput(this, 'OrchestratorServiceArn', {
      value: this.orchestrator.service.serviceArn,
      exportName: `${config.environmentName}-OrchestratorServiceArn`,
    });
    new cdk.CfnOutput(this, 'OrchestratorNlbDns', {
      value: this.orchestrator.nlb.loadBalancerDnsName,
      exportName: `${config.environmentName}-OrchestratorNlbDns`,
    });
    new cdk.CfnOutput(this, 'OrchestratorNlbArn', {
      value: this.orchestrator.nlb.loadBalancerArn,
      exportName: `${config.environmentName}-OrchestratorNlbArn`,
    });
    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: this.orchestrator.repository.repositoryUri,
      exportName: `${config.environmentName}-EcrRepositoryUri`,
    });

    // Apply tags
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}
