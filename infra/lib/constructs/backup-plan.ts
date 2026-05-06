import * as cdk from 'aws-cdk-lib';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as events from 'aws-cdk-lib/aws-events';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface BackupPlanProps {
  environmentName: string;
  drRegion: string;
  projectTag: string;
}

export class BackupPlan extends Construct {
  public readonly vault: backup.BackupVault;
  public readonly plan: backup.BackupPlan;

  constructor(scope: Construct, id: string, props: BackupPlanProps) {
    super(scope, id);

    // Backup Vault in primary region
    this.vault = new backup.BackupVault(this, 'Vault', {
      backupVaultName: `airline-voice-agent-${props.environmentName}-vault`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Backup Plan with daily schedule + cross-region copy
    this.plan = new backup.BackupPlan(this, 'Plan', {
      backupPlanName: `airline-voice-agent-${props.environmentName}-daily`,
      backupPlanRules: [
        new backup.BackupPlanRule({
          ruleName: 'DailyBackup',
          scheduleExpression: events.Schedule.cron({
            hour: '2',
            minute: '0',
          }),
          startWindow: cdk.Duration.hours(1),
          completionWindow: cdk.Duration.hours(4),
          deleteAfter: cdk.Duration.days(35),
          backupVault: this.vault,
          copyActions: [
            {
              destinationBackupVault: backup.BackupVault.fromBackupVaultArn(
                this,
                'DrVault',
                `arn:aws:backup:${props.drRegion}:${cdk.Stack.of(this).account}:backup-vault:airline-voice-agent-${props.environmentName}-dr-vault`,
              ),
              deleteAfter: cdk.Duration.days(35),
            },
          ],
        }),
      ],
    });

    // Selection: tag-based (all resources tagged with project)
    this.plan.addSelection('TaggedResources', {
      resources: [backup.BackupResource.fromTag('Project', props.projectTag)],
      role: new iam.Role(this, 'BackupRole', {
        roleName: `aws-backup-role-${props.environmentName}`,
        assumedBy: new iam.ServicePrincipal('backup.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSBackupServiceRolePolicyForBackup',
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSBackupServiceRolePolicyForRestores',
          ),
        ],
      }),
    });
  }
}
