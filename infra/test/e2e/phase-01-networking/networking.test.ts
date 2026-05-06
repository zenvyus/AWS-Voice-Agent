/**
 * Phase 1 E2E Tests: Networking Stack
 * Verifies deployed VPC, subnets, NAT gateway, and internet gateway
 * against the live AWS dev environment.
 */
import {
  EC2Client,
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeNatGatewaysCommand,
  DescribeInternetGatewaysCommand,
} from '@aws-sdk/client-ec2';
import { AWS_REGION, ENV_NAME } from '../../helpers/aws-config';

const ec2 = new EC2Client({ region: AWS_REGION });

const VPC_TAG_NAME = `airline-voice-agent-${ENV_NAME}-vpc`;

let vpcId: string;

describe('Phase 1 E2E: Networking', () => {
  beforeAll(async () => {
    const res = await ec2.send(
      new DescribeVpcsCommand({
        Filters: [{ Name: 'tag:Name', Values: [VPC_TAG_NAME] }],
      }),
    );
    vpcId = res.Vpcs?.[0]?.VpcId ?? '';
  });

  test('VPC exists with correct CIDR', async () => {
    expect(vpcId).toBeTruthy();
    const res = await ec2.send(new DescribeVpcsCommand({ VpcIds: [vpcId] }));
    expect(res.Vpcs?.[0]?.CidrBlock).toBe('10.0.0.0/16');
    expect(res.Vpcs?.[0]?.State).toBe('available');
  });

  test('VPC has public subnets', async () => {
    const res = await ec2.send(
      new DescribeSubnetsCommand({
        Filters: [
          { Name: 'vpc-id', Values: [vpcId] },
          { Name: 'tag:aws-cdk:subnet-type', Values: ['Public'] },
        ],
      }),
    );
    expect(res.Subnets!.length).toBeGreaterThanOrEqual(2);
    for (const s of res.Subnets!) {
      expect(s.MapPublicIpOnLaunch).toBe(true);
    }
  });

  test('VPC has private subnets with egress', async () => {
    const res = await ec2.send(
      new DescribeSubnetsCommand({
        Filters: [
          { Name: 'vpc-id', Values: [vpcId] },
          { Name: 'tag:aws-cdk:subnet-type', Values: ['Private'] },
        ],
      }),
    );
    expect(res.Subnets!.length).toBeGreaterThanOrEqual(2);
  });

  test('VPC has isolated subnets', async () => {
    const res = await ec2.send(
      new DescribeSubnetsCommand({
        Filters: [
          { Name: 'vpc-id', Values: [vpcId] },
          { Name: 'tag:aws-cdk:subnet-type', Values: ['Isolated'] },
        ],
      }),
    );
    expect(res.Subnets!.length).toBeGreaterThanOrEqual(2);
  });

  test('NAT gateway exists and is available', async () => {
    const res = await ec2.send(
      new DescribeNatGatewaysCommand({
        Filter: [
          { Name: 'vpc-id', Values: [vpcId] },
          { Name: 'state', Values: ['available'] },
        ],
      }),
    );
    expect(res.NatGateways!.length).toBeGreaterThanOrEqual(1);
  });

  test('Internet gateway is attached to VPC', async () => {
    const res = await ec2.send(
      new DescribeInternetGatewaysCommand({
        Filters: [{ Name: 'attachment.vpc-id', Values: [vpcId] }],
      }),
    );
    expect(res.InternetGateways!.length).toBe(1);
    expect(res.InternetGateways![0].Attachments?.[0]?.State).toBe('available');
  });
});
