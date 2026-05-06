#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkingStack } from '../lib/stacks/networking-stack';
import { getConfig } from '../lib/config';

const app = new cdk.App();

const envName = app.node.tryGetContext('env') || process.env.TARGET_ENV || 'dev';
const config = getConfig(envName);

const networkingStack = new NetworkingStack(app, `AirlineVoiceAgent-Networking-${config.environmentName}`, {
  config,
  env: {
    account: config.account,
    region: config.region,
  },
  description: `Airline Voice Agent - Networking Stack (${config.environmentName})`,
});

app.synth();
