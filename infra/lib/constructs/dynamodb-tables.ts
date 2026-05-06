import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface DynamoDbTablesProps {
  environmentName: string;
  encryptionKey: kms.IKey;
}

export class DynamoDbTables extends Construct {
  public readonly sessionsTable: dynamodb.Table;
  public readonly utteranceQueueTable: dynamodb.Table;
  public readonly noiseCountersTable: dynamodb.Table;
  public readonly airportCodesTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDbTablesProps) {
    super(scope, id);

    this.sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      tableName: `voice-agent-sessions-${props.environmentName}`,
      partitionKey: { name: 'contactId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.encryptionKey,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.utteranceQueueTable = new dynamodb.Table(this, 'UtteranceQueueTable', {
      tableName: `voice-agent-utterance-queue-${props.environmentName}`,
      partitionKey: { name: 'contactId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.encryptionKey,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.noiseCountersTable = new dynamodb.Table(this, 'NoiseCountersTable', {
      tableName: `voice-agent-noise-counters-${props.environmentName}`,
      partitionKey: { name: 'contactId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.encryptionKey,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.airportCodesTable = new dynamodb.Table(this, 'AirportCodesTable', {
      tableName: `airport-codes-${props.environmentName}`,
      partitionKey: { name: 'iataCode', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.encryptionKey,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
