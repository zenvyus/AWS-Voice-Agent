import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Networking } from '../constructs/networking';
import { EnvironmentConfig } from '../config';

export interface NetworkingStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

export class NetworkingStack extends cdk.Stack {
  public readonly networking: Networking;

  constructor(scope: Construct, id: string, props: NetworkingStackProps) {
    super(scope, id, props);

    this.networking = new Networking(this, 'Networking', {
      environmentName: props.config.environmentName,
      vpcCidr: props.config.vpcCidr,
      maxAzs: props.config.maxAzs,
      natGateways: props.config.natGateways,
    });

    // Apply tags from config
    for (const [key, value] of Object.entries(props.config.tags)) {
      cdk.Tags.of(this).add(key, value);
    }
  }
}
