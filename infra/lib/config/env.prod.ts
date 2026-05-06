import { EnvironmentConfig } from './schema';

export const prodConfig: EnvironmentConfig = {
  environmentName: 'prod',
  account: process.env.CDK_DEFAULT_ACCOUNT || '263611243147',
  region: 'us-east-1',
  vpcCidr: '10.3.0.0/16',
  maxAzs: 2,
  natGateways: 2,
  tags: {
    Environment: 'prod',
    Project: 'airline-voice-agent',
    ManagedBy: 'cdk',
  },
};
