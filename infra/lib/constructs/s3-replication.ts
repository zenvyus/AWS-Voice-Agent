import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface S3ReplicationProps {
  environmentName: string;
  sourceBucketArn: string;
  destinationBucketArn: string;
  destinationKmsKeyArn: string;
  sourceKmsKeyArn: string;
}

export class S3Replication extends Construct {
  public readonly replicationRole: iam.Role;

  constructor(scope: Construct, id: string, props: S3ReplicationProps) {
    super(scope, id);

    // IAM Role for S3 replication
    this.replicationRole = new iam.Role(this, 'ReplicationRole', {
      roleName: `s3-replication-role-${props.environmentName}`,
      assumedBy: new iam.ServicePrincipal('s3.amazonaws.com'),
    });

    // Source permissions
    this.replicationRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetReplicationConfiguration', 's3:ListBucket'],
        resources: [props.sourceBucketArn],
      }),
    );

    this.replicationRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          's3:GetObjectVersionForReplication',
          's3:GetObjectVersionAcl',
          's3:GetObjectVersionTagging',
        ],
        resources: [`${props.sourceBucketArn}/*`],
      }),
    );

    // Source KMS decrypt
    this.replicationRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['kms:Decrypt'],
        resources: [props.sourceKmsKeyArn],
      }),
    );

    // Destination permissions
    this.replicationRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:ReplicateObject', 's3:ReplicateDelete', 's3:ReplicateTags'],
        resources: [`${props.destinationBucketArn}/*`],
      }),
    );

    // Destination KMS encrypt
    this.replicationRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['kms:Encrypt'],
        resources: [props.destinationKmsKeyArn],
      }),
    );
  }
}
