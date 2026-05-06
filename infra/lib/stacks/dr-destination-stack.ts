import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/schema';

export interface DrDestinationStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  sourceAccountId: string;
  sourceReplicationRoleName: string;
}

/**
 * Provisions the DR destination bucket and KMS key in the DR region (us-west-2).
 * This stack must be deployed before enabling S3 CRR on the source bucket.
 */
export class DrDestinationStack extends cdk.Stack {
  public readonly drKey: kms.Key;
  public readonly drBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: DrDestinationStackProps) {
    super(scope, id, props);

    // KMS key in DR region for encrypting replicated objects
    this.drKey = new kms.Key(this, 'DrKey', {
      alias: 'airline-voice-agent-dr-key',
      description: `DR encryption key for airline voice agent (${props.config.environmentName})`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Grant the source account's replication role access to encrypt with this key
    this.drKey.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowS3ReplicationEncrypt',
        actions: ['kms:Encrypt', 'kms:GenerateDataKey'],
        principals: [
          new iam.ArnPrincipal(
            `arn:aws:iam::${props.sourceAccountId}:role/${props.sourceReplicationRoleName}`,
          ),
        ],
        resources: ['*'],
      }),
    );

    // DR destination bucket
    this.drBucket = new s3.Bucket(this, 'DrTranscriptsBucket', {
      bucketName: `airline-voice-transcripts-dr-${props.sourceAccountId}-${this.region}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.drKey,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'DrRetention',
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
          expiration: cdk.Duration.days(2555),
        },
      ],
    });

    // Stack outputs
    new cdk.CfnOutput(this, 'DrBucketArn', {
      value: this.drBucket.bucketArn,
      description: 'ARN of the DR destination bucket',
    });

    new cdk.CfnOutput(this, 'DrBucketName', {
      value: this.drBucket.bucketName,
      description: 'Name of the DR destination bucket',
    });

    new cdk.CfnOutput(this, 'DrKeyArn', {
      value: this.drKey.keyArn,
      description: 'ARN of the DR KMS key',
    });

    cdk.Tags.of(this).add('Project', 'airline-voice-agent');
    cdk.Tags.of(this).add('Phase', '09');
    cdk.Tags.of(this).add('Purpose', 'disaster-recovery');
  }
}
