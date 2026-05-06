#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkingStack } from '../lib/stacks/networking-stack';
import { DataLayerStack } from '../lib/stacks/data-layer-stack';
import { ConnectMediaStack } from '../lib/stacks/connect-media-stack';
import { OrchestratorStack } from '../lib/stacks/orchestrator-stack';
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

app.synth();
