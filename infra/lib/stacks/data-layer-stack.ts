import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/schema';
import { Encryption } from '../constructs/encryption';
import { DynamoDbTables } from '../constructs/dynamodb-tables';
import { Aurora } from '../constructs/aurora';
import { RedisCache } from '../constructs/redis-cache';
import { StorageBuckets } from '../constructs/storage-buckets';

export interface DataLayerStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class DataLayerStack extends cdk.Stack {
  public readonly encryption: Encryption;
  public readonly tables: DynamoDbTables;
  public readonly aurora: Aurora;
  public readonly redis: RedisCache;
  public readonly storage: StorageBuckets;

  constructor(scope: Construct, id: string, props: DataLayerStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Import VPC from networking stack
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      tags: { Name: `airline-voice-agent-${config.environmentName}-vpc` },
    });

    // KMS Keys
    this.encryption = new Encryption(this, 'Encryption', {
      environmentName: config.environmentName,
    });

    // DynamoDB Tables
    this.tables = new DynamoDbTables(this, 'DynamoDb', {
      environmentName: config.environmentName,
      encryptionKey: this.encryption.dataKey,
    });

    // Aurora Serverless v2
    this.aurora = new Aurora(this, 'Aurora', {
      environmentName: config.environmentName,
      vpc,
      encryptionKey: this.encryption.dataKey,
    });

    // ElastiCache Redis
    this.redis = new RedisCache(this, 'Redis', {
      environmentName: config.environmentName,
      vpc,
    });

    // S3 Buckets
    this.storage = new StorageBuckets(this, 'Storage', {
      environmentName: config.environmentName,
      account: config.account,
      region: config.region,
      dataKey: this.encryption.dataKey,
      transcriptKey: this.encryption.transcriptKey,
    });

    // Cross-stack exports
    new cdk.CfnOutput(this, 'DataKeyArn', {
      value: this.encryption.dataKey.keyArn,
      exportName: `${config.environmentName}-DataKeyArn`,
    });
    new cdk.CfnOutput(this, 'TranscriptKeyArn', {
      value: this.encryption.transcriptKey.keyArn,
      exportName: `${config.environmentName}-TranscriptKeyArn`,
    });
    new cdk.CfnOutput(this, 'SessionsTableName', {
      value: this.tables.sessionsTable.tableName,
      exportName: `${config.environmentName}-SessionsTableName`,
    });
    new cdk.CfnOutput(this, 'UtteranceQueueTableName', {
      value: this.tables.utteranceQueueTable.tableName,
      exportName: `${config.environmentName}-UtteranceQueueTableName`,
    });
    new cdk.CfnOutput(this, 'NoiseCountersTableName', {
      value: this.tables.noiseCountersTable.tableName,
      exportName: `${config.environmentName}-NoiseCountersTableName`,
    });
    new cdk.CfnOutput(this, 'AirportCodesTableName', {
      value: this.tables.airportCodesTable.tableName,
      exportName: `${config.environmentName}-AirportCodesTableName`,
    });
    new cdk.CfnOutput(this, 'AuroraClusterEndpoint', {
      value: this.aurora.cluster.clusterEndpoint.hostname,
      exportName: `${config.environmentName}-AuroraClusterEndpoint`,
    });
    new cdk.CfnOutput(this, 'AuroraClusterPort', {
      value: this.aurora.cluster.clusterEndpoint.port.toString(),
      exportName: `${config.environmentName}-AuroraClusterPort`,
    });
    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.redis.replicationGroup.attrPrimaryEndPointAddress,
      exportName: `${config.environmentName}-RedisEndpoint`,
    });
    new cdk.CfnOutput(this, 'RedisPort', {
      value: this.redis.replicationGroup.attrPrimaryEndPointPort,
      exportName: `${config.environmentName}-RedisPort`,
    });
    new cdk.CfnOutput(this, 'TranscriptsBucketArn', {
      value: this.storage.transcriptsBucket.bucketArn,
      exportName: `${config.environmentName}-TranscriptsBucketArn`,
    });
    new cdk.CfnOutput(this, 'AssetsBucketArn', {
      value: this.storage.assetsBucket.bucketArn,
      exportName: `${config.environmentName}-AssetsBucketArn`,
    });

    // Apply tags
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }
}
