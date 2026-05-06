import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export interface AuroraProps {
  environmentName: string;
  vpc: ec2.IVpc;
  encryptionKey: kms.IKey;
  minCapacity?: number;
  maxCapacity?: number;
  backupRetentionDays?: number;
}

export class Aurora extends Construct {
  public readonly cluster: rds.DatabaseCluster;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: AuroraProps) {
    super(scope, id);

    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      description: 'Aurora Serverless v2 security group',
      allowAllOutbound: false,
    });

    this.securityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from VPC',
    );

    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      clusterIdentifier: `airline-voice-agent-${props.environmentName}`,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_8,
      }),
      serverlessV2MinCapacity: props.minCapacity ?? 0.5,
      serverlessV2MaxCapacity: props.maxCapacity ?? 8,
      writer: rds.ClusterInstance.serverlessV2('writer', {
        publiclyAccessible: false,
      }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this.securityGroup],
      storageEncryptionKey: props.encryptionKey,
      iamAuthentication: true,
      backup: {
        retention: cdk.Duration.days(props.backupRetentionDays ?? 7),
      },
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      defaultDatabaseName: 'airline_voice_agent',
    });
  }
}
