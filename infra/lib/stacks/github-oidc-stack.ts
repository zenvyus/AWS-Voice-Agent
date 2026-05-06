import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GitHubOidcStackProps extends cdk.StackProps {
  githubOrg: string;
  githubRepo: string;
}

export class GitHubOidcStack extends cdk.Stack {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    // GitHub OIDC Identity Provider
    const oidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidc', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });

    // Deploy role trusted by GitHub Actions for this repo
    this.deployRole = new iam.Role(this, 'GitHubActionsDeployRole', {
      roleName: 'github-actions-deploy-airline-voice-agent',
      assumedBy: new iam.FederatedPrincipal(
        oidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': `repo:${props.githubOrg}/${props.githubRepo}:*`,
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
      maxSessionDuration: cdk.Duration.hours(1),
      description: 'IAM role for GitHub Actions CI/CD pipeline to deploy CDK stacks',
    });

    // CDK deploy permissions (AdministratorAccess for full CDK deploy capability)
    // In production, scope this down to specific services
    this.deployRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
    );

    // Outputs
    new cdk.CfnOutput(this, 'DeployRoleArn', {
      value: this.deployRole.roleArn,
      description: 'ARN of the GitHub Actions deploy role',
      exportName: 'GitHubActionsDeployRoleArn',
    });

    new cdk.CfnOutput(this, 'OidcProviderArn', {
      value: oidcProvider.openIdConnectProviderArn,
      description: 'ARN of the GitHub OIDC provider',
      exportName: 'GitHubOidcProviderArn',
    });

    cdk.Tags.of(this).add('Project', 'airline-voice-agent');
    cdk.Tags.of(this).add('Purpose', 'ci-cd');
  }
}
