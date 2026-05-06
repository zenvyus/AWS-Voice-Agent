import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetworkingProps {
  readonly environmentName: string;
  readonly vpcCidr: string;
  readonly maxAzs: number;
  readonly natGateways: number;
}

export class Networking extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: NetworkingProps) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: `airline-voice-agent-${props.environmentName}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr),
      maxAzs: props.maxAzs,
      natGateways: props.natGateways,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
      flowLogs: {
        default: {
          destination: ec2.FlowLogDestination.toCloudWatchLogs(),
          trafficType: ec2.FlowLogTrafficType.REJECT,
        },
      },
    });

    // Gateway endpoints (no cost)
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    this.vpc.addGatewayEndpoint('DynamoDbEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    // Interface endpoints for AWS services used by the voice agent
    const interfaceEndpoints: Array<{ id: string; service: ec2.InterfaceVpcEndpointAwsService }> = [
      { id: 'BedrockRuntime', service: ec2.InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME },
      { id: 'Transcribe', service: ec2.InterfaceVpcEndpointAwsService.TRANSCRIBE_STREAMING },
      { id: 'Polly', service: ec2.InterfaceVpcEndpointAwsService.POLLY },
      { id: 'SecretsManager', service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER },
      { id: 'Kms', service: ec2.InterfaceVpcEndpointAwsService.KMS },
      { id: 'Ecr', service: ec2.InterfaceVpcEndpointAwsService.ECR },
      { id: 'EcrDocker', service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER },
      { id: 'CloudWatchLogs', service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS },
      { id: 'CloudWatchMonitoring', service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING },
      { id: 'Sts', service: ec2.InterfaceVpcEndpointAwsService.STS },
      { id: 'Lambda', service: ec2.InterfaceVpcEndpointAwsService.LAMBDA },
      { id: 'EventBridge', service: ec2.InterfaceVpcEndpointAwsService.EVENTBRIDGE },
    ];

    for (const endpoint of interfaceEndpoints) {
      this.vpc.addInterfaceEndpoint(endpoint.id, {
        service: endpoint.service,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      });
    }

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${props.environmentName}-VpcId`,
    });

    new cdk.CfnOutput(this, 'VpcCidr', {
      value: this.vpc.vpcCidrBlock,
      description: 'VPC CIDR',
      exportName: `${props.environmentName}-VpcCidr`,
    });
  }
}
