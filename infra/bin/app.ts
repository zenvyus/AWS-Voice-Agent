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

const dataLayerStack = new DataLayerStack(
  app,
  `AirlineVoiceAgent-DataLayer-${config.environmentName}`,
  {
    config,
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

app.synth();
