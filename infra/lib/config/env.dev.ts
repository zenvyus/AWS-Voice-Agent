import { EnvironmentConfig } from './schema';

export const devConfig: EnvironmentConfig = {
  environmentName: 'dev',
  account: process.env.CDK_DEFAULT_ACCOUNT || '000000000000',
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
