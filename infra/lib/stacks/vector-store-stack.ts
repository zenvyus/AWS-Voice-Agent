import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as opensearchserverless from 'aws-cdk-lib/aws-opensearchserverless';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/schema';

export interface VectorStoreStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  dataKeyArn: string;
}

export class VectorStoreStack extends cdk.Stack {
  public readonly collection: opensearchserverless.CfnCollection;
  public readonly docsBucket: s3.Bucket;
  public readonly kbRoleName: string;
  public readonly indexName: string;
  public readonly collectionName: string;

  constructor(scope: Construct, id: string, props: VectorStoreStackProps) {
    super(scope, id, props);

    const dataKey = kms.Key.fromKeyArn(this, 'DataKey', props.dataKeyArn);
    this.collectionName = `airline-kb-${props.config.environmentName}`;
    this.indexName = `bedrock-kb-${props.config.environmentName}`;
    this.kbRoleName = `airline-voice-kb-role-${props.config.environmentName}`;

    // S3 bucket for KB documents
    this.docsBucket = new s3.Bucket(this, 'DocsBucket', {
      bucketName: `airline-voice-kb-docs-${props.config.account}-${props.config.region}`,
      encryptionKey: dataKey,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // OpenSearch Serverless encryption policy
    const encryptionPolicy = new opensearchserverless.CfnSecurityPolicy(this, 'EncryptionPolicy', {
      name: `${this.collectionName}-enc`,
      type: 'encryption',
      policy: JSON.stringify({
        Rules: [
          {
            ResourceType: 'collection',
            Resource: [`collection/${this.collectionName}`],
          },
        ],
        AWSOwnedKey: true,
      }),
    });

    // OpenSearch Serverless network policy
    const networkPolicy = new opensearchserverless.CfnSecurityPolicy(this, 'NetworkPolicy', {
      name: `${this.collectionName}-net`,
      type: 'network',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'collection',
              Resource: [`collection/${this.collectionName}`],
            },
            {
              ResourceType: 'dashboard',
              Resource: [`collection/${this.collectionName}`],
            },
          ],
          AllowFromPublic: true,
        },
      ]),
    });

    // OpenSearch Serverless collection
    this.collection = new opensearchserverless.CfnCollection(this, 'Collection', {
      name: this.collectionName,
      type: 'VECTORSEARCH',
      standbyReplicas: 'DISABLED',
      description: `Knowledge base vector store for airline voice agent (${props.config.environmentName})`,
    });

    this.collection.addDependency(encryptionPolicy);
    this.collection.addDependency(networkPolicy);

    // IAM role for Knowledge Base (created here so the data access policy can reference it)
    const kbRole = new iam.Role(this, 'KbRole', {
      roleName: this.kbRoleName,
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      inlinePolicies: {
        aoss: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['aoss:APIAccessAll'],
              resources: [
                `arn:aws:aoss:${props.config.region}:${props.config.account}:collection/*`,
              ],
            }),
          ],
        }),
        s3: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['s3:GetObject', 's3:ListBucket'],
              resources: [this.docsBucket.bucketArn, `${this.docsBucket.bucketArn}/*`],
            }),
          ],
        }),
        embedding: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['bedrock:InvokeModel'],
              resources: [
                `arn:aws:bedrock:${props.config.region}::foundation-model/amazon.titan-embed-text-v2:0`,
              ],
            }),
          ],
        }),
      },
    });

    // Data access policy — grants KB role, CDK deploy role, and deployer IAM user
    const kbRoleArn = `arn:aws:iam::${props.config.account}:role/${this.kbRoleName}`;
    const cdkDeployRoleArn = `arn:aws:iam::${props.config.account}:role/cdk-hnb659fds-deploy-role-${props.config.account}-${props.config.region}`;
    const deployerUserArn = `arn:aws:iam::${props.config.account}:user/flightsopen-deploy`;

    new opensearchserverless.CfnAccessPolicy(this, 'DataAccessPolicy', {
      name: `${this.collectionName}-access`,
      type: 'data',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'collection',
              Resource: [`collection/${this.collectionName}`],
              Permission: [
                'aoss:CreateCollectionItems',
                'aoss:UpdateCollectionItems',
                'aoss:DescribeCollectionItems',
              ],
            },
            {
              ResourceType: 'index',
              Resource: [`index/${this.collectionName}/*`],
              Permission: [
                'aoss:CreateIndex',
                'aoss:UpdateIndex',
                'aoss:DescribeIndex',
                'aoss:ReadDocument',
                'aoss:WriteDocument',
              ],
            },
          ],
          Principal: [kbRoleArn, cdkDeployRoleArn, deployerUserArn],
        },
      ]),
    });

    // Outputs
    new cdk.CfnOutput(this, 'CollectionEndpoint', {
      value: this.collection.attrCollectionEndpoint,
      description: 'AOSS Collection Endpoint',
      exportName: `${props.config.environmentName}-AossCollectionEndpoint`,
    });

    new cdk.CfnOutput(this, 'CollectionArn', {
      value: this.collection.attrArn,
      description: 'AOSS Collection ARN',
      exportName: `${props.config.environmentName}-AossCollectionArn`,
    });

    new cdk.CfnOutput(this, 'KbRoleArn', {
      value: kbRole.roleArn,
      description: 'Knowledge Base IAM Role ARN',
      exportName: `${props.config.environmentName}-KbRoleArn`,
    });

    new cdk.CfnOutput(this, 'DocsBucketName', {
      value: this.docsBucket.bucketName,
      description: 'KB Documents S3 Bucket',
      exportName: `${props.config.environmentName}-KbDocsBucketName`,
    });

    new cdk.CfnOutput(this, 'IndexName', {
      value: this.indexName,
      description: 'Vector index name',
      exportName: `${props.config.environmentName}-AossIndexName`,
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'airline-voice-agent');
    cdk.Tags.of(this).add('Phase', '05-intelligence');
    cdk.Tags.of(this).add('Environment', props.config.environmentName);
  }
}
