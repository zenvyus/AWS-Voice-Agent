import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { VectorStoreStack } from '../../lib/stacks/vector-store-stack';
import { EnvironmentConfig } from '../../lib/config/schema';

describe('VectorStoreStack', () => {
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

  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();

    const stack = new VectorStoreStack(app, 'TestVectorStoreStack', {
      config: testConfig,
      dataKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-data-key',
      env: { account: '123456789012', region: 'us-east-1' },
    });

    template = Template.fromStack(stack);
  });

  test('creates OpenSearch Serverless collection for vector search', () => {
    template.hasResourceProperties('AWS::OpenSearchServerless::Collection', {
      Name: 'airline-kb-dev',
      Type: 'VECTORSEARCH',
    });
  });

  test('creates OpenSearch Serverless encryption policy', () => {
    template.hasResourceProperties('AWS::OpenSearchServerless::SecurityPolicy', {
      Name: 'airline-kb-dev-enc',
      Type: 'encryption',
    });
  });

  test('creates OpenSearch Serverless network policy', () => {
    template.hasResourceProperties('AWS::OpenSearchServerless::SecurityPolicy', {
      Name: 'airline-kb-dev-net',
      Type: 'network',
    });
  });

  test('creates AOSS data access policy', () => {
    template.hasResourceProperties('AWS::OpenSearchServerless::AccessPolicy', {
      Name: 'airline-kb-dev-access',
      Type: 'data',
    });
  });

  test('creates S3 KB documents bucket with versioning', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'airline-voice-kb-docs-123456789012-us-east-1',
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    });
  });

  test('creates KB role for Bedrock service', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'airline-voice-kb-role-dev',
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: { Service: 'bedrock.amazonaws.com' },
          }),
        ]),
      }),
    });
  });

  test('exports CollectionEndpoint', () => {
    template.hasOutput('CollectionEndpoint', {
      Export: { Name: 'dev-AossCollectionEndpoint' },
    });
  });

  test('exports CollectionArn', () => {
    template.hasOutput('CollectionArn', {
      Export: { Name: 'dev-AossCollectionArn' },
    });
  });

  test('exports KbRoleArn', () => {
    template.hasOutput('KbRoleArn', {
      Export: { Name: 'dev-KbRoleArn' },
    });
  });

  test('exports DocsBucketName', () => {
    template.hasOutput('DocsBucketName', {
      Export: { Name: 'dev-KbDocsBucketName' },
    });
  });
});
