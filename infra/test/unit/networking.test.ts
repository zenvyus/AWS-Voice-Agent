import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { NetworkingStack } from '../../lib/stacks/networking-stack';
import { EnvironmentConfig } from '../../lib/config/schema';

describe('NetworkingStack', () => {
  const testConfig: EnvironmentConfig = {
    environmentName: 'dev',
    account: '123456789012',
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

  let app: cdk.App;
  let stack: NetworkingStack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();
    stack = new NetworkingStack(app, 'TestNetworkingStack', {
      config: testConfig,
      env: {
        account: testConfig.account,
        region: testConfig.region,
      },
    });
    template = Template.fromStack(stack);
  });

  test('creates a VPC with the specified CIDR', () => {
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16',
    });
  });

  test('creates public, private, and isolated subnets', () => {
    const subnets = template.findResources('AWS::EC2::Subnet');
    const subnetCount = Object.keys(subnets).length;
    // 2 AZs * 3 subnet types = 6 subnets
    expect(subnetCount).toBe(6);
  });

  test('creates a NAT Gateway', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 1);
  });

  test('creates S3 gateway endpoint', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        'Fn::Join': ['', ['com.amazonaws.', { Ref: 'AWS::Region' }, '.s3']],
      },
      VpcEndpointType: 'Gateway',
    });
  });

  test('creates DynamoDB gateway endpoint', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        'Fn::Join': ['', ['com.amazonaws.', { Ref: 'AWS::Region' }, '.dynamodb']],
      },
      VpcEndpointType: 'Gateway',
    });
  });

  test('creates interface endpoints for required services', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      VpcEndpointType: 'Interface',
      PrivateDnsEnabled: true,
    });
  });

  test('creates VPC flow logs', () => {
    template.hasResourceProperties('AWS::EC2::FlowLog', {
      TrafficType: 'REJECT',
    });
  });

  test('applies environment tags', () => {
    template.hasResourceProperties('AWS::EC2::VPC', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'Environment', Value: 'dev' }),
        Match.objectLike({ Key: 'Project', Value: 'airline-voice-agent' }),
      ]),
    });
  });
});
