import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface StorageBucketsProps {
  environmentName: string;
  account: string;
  region: string;
  dataKey: kms.IKey;
  transcriptKey: kms.IKey;
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
