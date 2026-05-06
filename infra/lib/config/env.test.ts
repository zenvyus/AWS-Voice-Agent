import { EnvironmentConfig } from './schema';

export const testConfig: EnvironmentConfig = {
  environmentName: 'test',
  account: process.env.CDK_DEFAULT_ACCOUNT || '000000000000',
  region: 'us-east-1',
  vpcCidr: '10.1.0.0/16',
  maxAzs: 2,
  natGateways: 1,
  tags: {
    Environment: 'test',
    Project: 'airline-voice-agent',
    ManagedBy: 'cdk',
  },
};
