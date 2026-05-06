import { EnvironmentConfig } from './schema';

export const stagingConfig: EnvironmentConfig = {
  environmentName: 'staging',
  account: process.env.CDK_DEFAULT_ACCOUNT || '263611243147',
  region: 'us-east-1',
  vpcCidr: '10.2.0.0/16',
  maxAzs: 2,
  natGateways: 2,
  tags: {
    Environment: 'staging',
    Project: 'airline-voice-agent',
    ManagedBy: 'cdk',
  },
};
