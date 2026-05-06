import * as cdk from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface SpeechConfigProps {
  environmentName: string;
}

export class SpeechConfig extends Construct {
  public readonly vocabularyName: string;

  constructor(scope: Construct, id: string, props: SpeechConfigProps) {
    super(scope, id);

    this.vocabularyName = `airline-domain-vocab-${props.environmentName}`;

    // Transcribe custom vocabulary via AwsCustomResource
    const vocabularyPhrases = [
      // IATA Airport Codes - Australia
      'SYD', 'MEL', 'BNE', 'PER', 'ADL', 'CBR', 'OOL', 'CNS', 'HBA', 'DRW',
      // New Zealand
      'AKL', 'WLG', 'CHC', 'ZQN',
      // Asia
      'SIN', 'HKG', 'NRT', 'HND', 'KIX', 'BKK', 'DPS', 'JKT', 'MNL', 'KUL',
      // Pacific
      'NAN', 'APW', 'PPT',
      // Europe
      'LHR', 'CDG', 'FCO',
      // Americas
      'LAX', 'SFO', 'DFW', 'JFK',
      // Fare Classes
      'First', 'Business', 'Premium-Economy', 'Economy',
      // Fare class letters spoken individually
      'Foxtrot', 'Juliet', 'Whiskey', 'Yankee', 'Bravo', 'Mike', 'Hotel', 'Quebec',
      // Airline terms
      'booking-reference', 'frequent-flyer', 'fare-class', 'baggage-allowance',
      'boarding-pass', 'check-in', 'departure-gate', 'connecting-flight',
    ].join('\n');

    new cr.AwsCustomResource(this, 'TranscribeVocabulary', {
      onCreate: {
        service: 'Transcribe',
        action: 'createVocabulary',
        parameters: {
          VocabularyName: this.vocabularyName,
          LanguageCode: 'en-US',
          Phrases: vocabularyPhrases.split('\n'),
        },
        physicalResourceId: cr.PhysicalResourceId.of(this.vocabularyName),
      },
      onDelete: {
        service: 'Transcribe',
        action: 'deleteVocabulary',
        parameters: {
          VocabularyName: this.vocabularyName,
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            'transcribe:CreateVocabulary',
            'transcribe:DeleteVocabulary',
            'transcribe:GetVocabulary',
          ],
          resources: ['*'],
        }),
      ]),
    });
  }
}
