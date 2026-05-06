import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DataLayerStack } from '../../lib/stacks/data-layer-stack';
import { EnvironmentConfig } from '../../lib/config/schema';

describe('DataLayerStack', () => {
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
    const stack = new DataLayerStack(app, 'TestDataLayerStack', {
      config: testConfig,
      env: { account: testConfig.account, region: testConfig.region },
    });
    template = Template.fromStack(stack);
  });

  // KMS Keys
  test('creates two KMS keys with rotation enabled', () => {
    template.resourceCountIs('AWS::KMS::Key', 2);
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });

  test('creates KMS key aliases', () => {
    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: 'alias/airline-voice-agent-data-key-dev',
    });
    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: 'alias/airline-voice-agent-transcript-key-dev',
    });
  });

  // DynamoDB Tables
  test('creates voice-agent-sessions table with correct schema', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'voice-agent-sessions-dev',
      KeySchema: [{ AttributeName: 'contactId', KeyType: 'HASH' }],
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    });
  });

  test('creates voice-agent-utterance-queue table with sort key', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'voice-agent-utterance-queue-dev',
      KeySchema: Match.arrayWith([
        Match.objectLike({ AttributeName: 'contactId', KeyType: 'HASH' }),
        Match.objectLike({ AttributeName: 'timestamp', KeyType: 'RANGE' }),
      ]),
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
    });
  });

  test('creates voice-agent-noise-counters table', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'voice-agent-noise-counters-dev',
      KeySchema: [{ AttributeName: 'contactId', KeyType: 'HASH' }],
      BillingMode: 'PAY_PER_REQUEST',
      TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
    });
  });

  test('creates airport-codes table without TTL', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'airport-codes-dev',
      KeySchema: [{ AttributeName: 'iataCode', KeyType: 'HASH' }],
      BillingMode: 'PAY_PER_REQUEST',
      PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    });
  });

  test('all DynamoDB tables use customer-managed KMS encryption', () => {
    const tables = template.findResources('AWS::DynamoDB::Table');
    const tableKeys = Object.keys(tables);
    expect(tableKeys.length).toBe(4);
    tableKeys.forEach((key) => {
      expect(tables[key].Properties.SSESpecification).toBeDefined();
      expect(tables[key].Properties.SSESpecification.SSEEnabled).toBe(true);
      expect(tables[key].Properties.SSESpecification.SSEType).toBe('KMS');
    });
  });

  // Aurora
  test('creates Aurora Serverless v2 cluster with PostgreSQL', () => {
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
      ServerlessV2ScalingConfiguration: {
        MinCapacity: 0.5,
        MaxCapacity: 8,
      },
      DatabaseName: 'airline_voice_agent',
      EnableIAMDatabaseAuthentication: true,
      DeletionProtection: false,
    });
  });

  test('Aurora cluster is not publicly accessible', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      PubliclyAccessible: false,
    });
  });

  test('Aurora security group allows port 5432 from VPC CIDR', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Aurora Serverless v2 security group',
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          IpProtocol: 'tcp',
          FromPort: 5432,
          ToPort: 5432,
        }),
      ]),
    });
  });

  // ElastiCache Redis
  test('creates ElastiCache Redis replication group', () => {
    template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
      Engine: 'redis',
      EngineVersion: '7.1',
      CacheNodeType: 'cache.t4g.micro',
      AtRestEncryptionEnabled: true,
      TransitEncryptionEnabled: true,
    });
  });

  test('Redis security group allows port 6379 from VPC CIDR', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'ElastiCache Redis security group',
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          IpProtocol: 'tcp',
          FromPort: 6379,
          ToPort: 6379,
        }),
      ]),
    });
  });

  test('Redis AUTH token stored in Secrets Manager', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'airline-voice-agent/dev/redis-auth-token',
    });
  });

  // S3 Buckets
  test('creates transcripts bucket with versioning and KMS encryption', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'airline-voice-transcripts-123456789012-us-east-1',
      VersioningConfiguration: { Status: 'Enabled' },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('creates assets bucket with versioning and KMS encryption', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'airline-voice-assets-123456789012-us-east-1',
      VersioningConfiguration: { Status: 'Enabled' },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('transcripts bucket has lifecycle rules', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'airline-voice-transcripts-123456789012-us-east-1',
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Status: 'Enabled',
            Transitions: Match.arrayWith([
              Match.objectLike({
                StorageClass: 'GLACIER',
                TransitionInDays: 90,
              }),
            ]),
          }),
        ]),
      },
    });
  });

  // Tags
  test('applies environment tags', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      Tags: Match.arrayWith([
        Match.objectLike({ Key: 'Environment', Value: 'dev' }),
        Match.objectLike({ Key: 'Project', Value: 'airline-voice-agent' }),
      ]),
    });
  });
});
