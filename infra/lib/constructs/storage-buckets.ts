import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface ReplicationConfig {
  roleArn: string;
  destinationBucketArn: string;
  destinationKmsKeyArn: string;
  ruleId: string;
}

export interface StorageBucketsProps {
  environmentName: string;
  account: string;
  region: string;
  dataKey: kms.IKey;
  transcriptKey: kms.IKey;
  replication?: ReplicationConfig;
}

export class StorageBuckets extends Construct {
  public readonly transcriptsBucket: s3.Bucket;
  public readonly assetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageBucketsProps) {
    super(scope, id);

    this.transcriptsBucket = new s3.Bucket(this, 'TranscriptsBucket', {
      bucketName: `airline-voice-transcripts-${props.account}-${props.region}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: props.transcriptKey,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'TransitionToGlacier',
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
          expiration: cdk.Duration.days(2555), // ~7 years
        },
      ],
    });

    // Apply cross-region replication if configured
    if (props.replication) {
      const cfnBucket = this.transcriptsBucket.node.defaultChild as s3.CfnBucket;
      cfnBucket.addPropertyOverride('ReplicationConfiguration', {
        Role: props.replication.roleArn,
        Rules: [
          {
            Id: props.replication.ruleId,
            Status: 'Enabled',
            Destination: {
              Bucket: props.replication.destinationBucketArn,
              StorageClass: 'STANDARD',
              EncryptionConfiguration: {
                ReplicaKmsKeyID: props.replication.destinationKmsKeyArn,
              },
            },
            SourceSelectionCriteria: {
              SseKmsEncryptedObjects: {
                Status: 'Enabled',
              },
            },
          },
        ],
      });
    }

    this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: `airline-voice-assets-${props.account}-${props.region}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: props.dataKey,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}
