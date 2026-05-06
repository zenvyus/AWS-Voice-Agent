import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface KnowledgeBaseProps {
  environmentName: string;
  region: string;
  collectionArn: string;
  kbRoleArn: string;
  docsBucketArn: string;
  indexName: string;
}

export class KnowledgeBase extends Construct {
  public readonly knowledgeBase: bedrock.CfnKnowledgeBase;
  public readonly dataSource: bedrock.CfnDataSource;

  constructor(scope: Construct, id: string, props: KnowledgeBaseProps) {
    super(scope, id);

    // Bedrock Knowledge Base — references AOSS collection from VectorStoreStack
    this.knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: `airline-voice-kb-${props.environmentName}`,
      roleArn: props.kbRoleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${props.region}::foundation-model/amazon.titan-embed-text-v2:0`,
        },
      },
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: props.collectionArn,
          fieldMapping: {
            metadataField: 'metadata',
            textField: 'text',
            vectorField: 'vector',
          },
          vectorIndexName: props.indexName,
        },
      },
    });

    // S3 Data Source
    this.dataSource = new bedrock.CfnDataSource(this, 'DataSource', {
      name: `airline-docs-${props.environmentName}`,
      knowledgeBaseId: this.knowledgeBase.attrKnowledgeBaseId,
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: {
          bucketArn: props.docsBucketArn,
        },
      },
    });
  }
}
