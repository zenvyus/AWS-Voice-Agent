import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface RedisCacheProps {
  environmentName: string;
  vpc: ec2.IVpc;
  nodeType?: string;
  numCacheClusters?: number;
}

export class RedisCache extends Construct {
  public readonly replicationGroup: elasticache.CfnReplicationGroup;
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly authSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: RedisCacheProps) {
    super(scope, id);

    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      description: 'ElastiCache Redis security group',
      allowAllOutbound: false,
    });

    this.securityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(6379),
      'Allow Redis from VPC',
    );

    this.authSecret = new secretsmanager.Secret(this, 'AuthToken', {
      secretName: `airline-voice-agent/${props.environmentName}/redis-auth-token`,
      description: 'ElastiCache Redis AUTH token',
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    const isolatedSubnets = props.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    });

    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'SubnetGroup', {
      description: 'ElastiCache Redis subnet group (isolated subnets)',
      subnetIds: isolatedSubnets.subnetIds,
      cacheSubnetGroupName: `airline-voice-agent-redis-${props.environmentName}`,
    });

    this.replicationGroup = new elasticache.CfnReplicationGroup(this, 'ReplicationGroup', {
      replicationGroupDescription: `airline-voice-agent Redis ${props.environmentName}`,
      cacheNodeType: props.nodeType ?? 'cache.t4g.micro',
      engine: 'redis',
      engineVersion: '7.1',
      numCacheClusters: props.numCacheClusters ?? 1,
      cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName,
      securityGroupIds: [this.securityGroup.securityGroupId],
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      authToken: this.authSecret.secretValue.unsafeUnwrap(),
      automaticFailoverEnabled: (props.numCacheClusters ?? 1) > 1,
      port: 6379,
    });

    this.replicationGroup.addDependency(subnetGroup);
  }
}
