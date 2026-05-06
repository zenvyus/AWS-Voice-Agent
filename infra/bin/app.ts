#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkingStack } from '../lib/stacks/networking-stack';
import { DataLayerStack } from '../lib/stacks/data-layer-stack';
import { ConnectMediaStack } from '../lib/stacks/connect-media-stack';
import { OrchestratorStack } from '../lib/stacks/orchestrator-stack';
import { IntelligenceStack } from '../lib/stacks/intelligence-stack';
import { VectorStoreStack } from '../lib/stacks/vector-store-stack';
import { NoiseMonitorStack } from '../lib/stacks/noise-monitor-stack';
import { GitHubOidcStack } from '../lib/stacks/github-oidc-stack';
import { ObservabilityStack } from '../lib/stacks/observability-stack';
import { DisasterRecoveryStack } from '../lib/stacks/disaster-recovery-stack';
import { DrDestinationStack } from '../lib/stacks/dr-destination-stack';
import { getConfig } from '../lib/config';

const app = new cdk.App();

const envName = app.node.tryGetContext('env') || process.env.TARGET_ENV || 'dev';
const config = getConfig(envName);

const networkingStack = new NetworkingStack(
  app,
  `AirlineVoiceAgent-Networking-${config.environmentName}`,
  {
    config,
    env: {
      account: config.account,
      region: config.region,
    },
    description: `Airline Voice Agent - Networking Stack (${config.environmentName})`,
  },
);

// DR configuration (deterministic values for S3 cross-region replication)
const drRegion = 'us-west-2';
const replicationRoleArn = `arn:aws:iam::${config.account}:role/s3-replication-role-${config.environmentName}`;
const destinationBucketArn = `arn:aws:s3:::airline-voice-transcripts-dr-${config.account}-${drRegion}`;
const destinationKmsKeyArn = `arn:aws:kms:${drRegion}:${config.account}:alias/airline-voice-agent-dr-key`;

// CRR is enabled by default now that DrDestinationStack provisions the DR bucket.
// Set CRR_ENABLED=false to explicitly disable replication.
const crrEnabled = process.env.CRR_ENABLED !== 'false';

const dataLayerStack = new DataLayerStack(
  app,
  `AirlineVoiceAgent-DataLayer-${config.environmentName}`,
  {
    config,
    replication: crrEnabled
      ? {
          roleArn: replicationRoleArn,
          destinationBucketArn,
          destinationKmsKeyArn,
          ruleId: `crr-transcripts-${config.environmentName}`,
        }
      : undefined,
    env: {
      account: config.account,
      region: config.region,
    },
    description: `Airline Voice Agent - Data Layer Stack (${config.environmentName})`,
  },
);

dataLayerStack.addDependency(networkingStack);

const connectMediaStack = new ConnectMediaStack(
  app,
  `AirlineVoiceAgent-ConnectMedia-${config.environmentName}`,
  {
    config,
    dataKeyArn: dataLayerStack.encryption.dataKey.keyArn,
    transcriptKeyArn: dataLayerStack.encryption.transcriptKey.keyArn,
    sessionsTableName: dataLayerStack.tables.sessionsTable.tableName,
    transcriptsBucketArn: dataLayerStack.storage.transcriptsBucket.bucketArn,
    assetsBucketArn: dataLayerStack.storage.assetsBucket.bucketArn,
    env: {
      account: config.account,
      region: config.region,
    },
    description: `Airline Voice Agent - Connect & Media Stack (${config.environmentName})`,
  },
);

connectMediaStack.addDependency(dataLayerStack);

const orchestratorStack = new OrchestratorStack(
  app,
  `AirlineVoiceAgent-Orchestrator-${config.environmentName}`,
  {
    config,
    dataKeyArn: dataLayerStack.encryption.dataKey.keyArn,
    sessionsTableName: dataLayerStack.tables.sessionsTable.tableName,
    utteranceQueueTableName: dataLayerStack.tables.utteranceQueueTable.tableName,
    noiseCountersTableName: dataLayerStack.tables.noiseCountersTable.tableName,
    kvsStreamArn: connectMediaStack.kinesisVideo.stream.attrArn,
    transcriptsBucketName: dataLayerStack.storage.transcriptsBucket.bucketName,
    redisEndpoint: dataLayerStack.redis.replicationGroup.attrPrimaryEndPointAddress,
    auroraEndpoint: dataLayerStack.aurora.cluster.clusterEndpoint.hostname,
    env: {
      account: config.account,
      region: config.region,
    },
    description: `Airline Voice Agent - Orchestrator Stack (${config.environmentName})`,
  },
);

orchestratorStack.addDependency(connectMediaStack);

const vectorStoreStack = new VectorStoreStack(
  app,
  `AirlineVoiceAgent-VectorStore-${config.environmentName}`,
  {
    config,
    dataKeyArn: dataLayerStack.encryption.dataKey.keyArn,
    env: {
      account: config.account,
      region: config.region,
    },
    description: `Airline Voice Agent - Vector Store Stack (${config.environmentName})`,
  },
);

vectorStoreStack.addDependency(dataLayerStack);

const intelligenceStack = new IntelligenceStack(
  app,
  `AirlineVoiceAgent-Intelligence-${config.environmentName}`,
  {
    config,
    vpc: networkingStack.networking.vpc,
    dataKeyArn: dataLayerStack.encryption.dataKey.keyArn,
    sessionsTableArn: dataLayerStack.tables.sessionsTable.tableArn,
    sessionsTableName: dataLayerStack.tables.sessionsTable.tableName,
    collectionArn: vectorStoreStack.collection.attrArn,
    kbRoleArn: `arn:aws:iam::${config.account}:role/${vectorStoreStack.kbRoleName}`,
    docsBucketArn: vectorStoreStack.docsBucket.bucketArn,
    docsBucketName: vectorStoreStack.docsBucket.bucketName,
    indexName: vectorStoreStack.indexName,
    env: {
      account: config.account,
      region: config.region,
    },
    description: `Airline Voice Agent - Intelligence Stack (${config.environmentName})`,
  },
);

intelligenceStack.addDependency(vectorStoreStack);
intelligenceStack.addDependency(orchestratorStack);

const noiseMonitorStack = new NoiseMonitorStack(
  app,
  `AirlineVoiceAgent-NoiseMonitor-${config.environmentName}`,
  {
    config,
    noiseCountersTableName: dataLayerStack.tables.noiseCountersTable.tableName,
    noiseCountersTableArn: dataLayerStack.tables.noiseCountersTable.tableArn,
    env: {
      account: config.account,
      region: config.region,
    },
    description: `Airline Voice Agent - Noise Monitor Stack (${config.environmentName})`,
  },
);

noiseMonitorStack.addDependency(dataLayerStack);

// Observability: Dashboard, Alarms, SNS Topic
const observabilityStack = new ObservabilityStack(
  app,
  `AirlineVoiceAgent-Observability-${config.environmentName}`,
  {
    config,
    lambdaFunctionNames: [
      `speech-quality-gate-${config.environmentName}`,
      `agent-tools-${config.environmentName}`,
      `session-bootstrap-${config.environmentName}`,
    ],
    stateMachineName: `noise-monitor-${config.environmentName}`,
    ecsClusterName: `airline-voice-agent-${config.environmentName}`,
    ecsServiceName: `orchestrator-${config.environmentName}`,
    dynamoTableNames: [
      dataLayerStack.tables.sessionsTable.tableName,
      dataLayerStack.tables.noiseCountersTable.tableName,
    ],
    existingAlarmArns: [
      `arn:aws:cloudwatch:${config.region}:${config.account}:alarm:noise-rejection-rate-high-${config.environmentName}`,
    ],
    env: {
      account: config.account,
      region: config.region,
    },
    description: `Airline Voice Agent - Observability Stack (${config.environmentName})`,
  },
);

observabilityStack.addDependency(noiseMonitorStack);
observabilityStack.addDependency(orchestratorStack);
observabilityStack.addDependency(intelligenceStack);

// Disaster Recovery: AWS Backup + S3 Cross-Region Replication
const disasterRecoveryStack = new DisasterRecoveryStack(
  app,
  `AirlineVoiceAgent-DR-${config.environmentName}`,
  {
    config,
    drRegion,
    transcriptsBucketArn: dataLayerStack.storage.transcriptsBucket.bucketArn,
    transcriptsBucketKeyArn: dataLayerStack.encryption.transcriptKey.keyArn,
    destinationBucketArn,
    destinationKmsKeyArn,
    env: {
      account: config.account,
      region: config.region,
    },
    description: `Airline Voice Agent - Disaster Recovery Stack (${config.environmentName})`,
  },
);

disasterRecoveryStack.addDependency(dataLayerStack);
disasterRecoveryStack.addDependency(observabilityStack);

// CI/CD: GitHub OIDC provider and deploy role (deployed once, not per-environment)
const githubOidcStack = new GitHubOidcStack(app, 'AirlineVoiceAgent-GitHubOidc', {
  githubOrg: 'zenvyus',
  githubRepo: 'AWS-Voice-Agent',
  env: {
    account: config.account,
    region: config.region,
  },
  description: 'Airline Voice Agent - GitHub OIDC Provider & Deploy Role',
});

// DR Destination: S3 bucket + KMS key in us-west-2 for cross-region replication
const drDestinationStack = new DrDestinationStack(
  app,
  `AirlineVoiceAgent-DrDestination-${config.environmentName}`,
  {
    config,
    sourceAccountId: config.account,
    sourceReplicationRoleName: `s3-replication-role-${config.environmentName}`,
    env: {
      account: config.account,
      region: drRegion,
    },
    description: `Airline Voice Agent - DR Destination Stack (${config.environmentName})`,
    crossRegionReferences: true,
  },
);

app.synth();
