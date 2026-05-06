import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/schema';
import { BackupPlan } from '../constructs/backup-plan';
import { S3Replication } from '../constructs/s3-replication';

export interface DisasterRecoveryStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  drRegion: string;
  transcriptsBucketArn: string;
  transcriptsBucketKeyArn: string;
  destinationBucketArn: string;
  destinationKmsKeyArn: string;
}

export class DisasterRecoveryStack extends cdk.Stack {
  public readonly backupPlan: BackupPlan;
  public readonly s3Replication: S3Replication;

  constructor(scope: Construct, id: string, props: DisasterRecoveryStackProps) {
    super(scope, id, props);

    // AWS Backup: vault + daily plan + cross-region copy
    this.backupPlan = new BackupPlan(this, 'BackupPlan', {
      environmentName: props.config.environmentName,
      drRegion: props.drRegion,
      projectTag: 'airline-voice-agent',
    });

    // S3 Cross-Region Replication IAM Role
    this.s3Replication = new S3Replication(this, 'S3Replication', {
      environmentName: props.config.environmentName,
      sourceBucketArn: props.transcriptsBucketArn,
      destinationBucketArn: props.destinationBucketArn,
      destinationKmsKeyArn: props.destinationKmsKeyArn,
      sourceKmsKeyArn: props.transcriptsBucketKeyArn,
    });

    // Stack outputs
    new cdk.CfnOutput(this, 'BackupVaultArn', {
      value: this.backupPlan.vault.backupVaultArn,
      description: 'ARN of the primary backup vault',
    });

    new cdk.CfnOutput(this, 'BackupPlanId', {
      value: this.backupPlan.plan.backupPlanId,
      description: 'ID of the backup plan',
    });

    new cdk.CfnOutput(this, 'ReplicationRoleArn', {
      value: this.s3Replication.replicationRole.roleArn,
      description: 'ARN of the S3 replication role',
    });

    cdk.Tags.of(this).add('Project', 'airline-voice-agent');
    cdk.Tags.of(this).add('Phase', '09');
  }
}
