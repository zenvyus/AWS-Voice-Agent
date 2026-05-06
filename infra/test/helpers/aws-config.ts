/**
 * Shared AWS configuration for integration and E2E tests.
 * All tests run against the deployed dev environment.
 */
export const AWS_REGION = 'us-east-1';
export const ENV_NAME = 'dev';
export const ACCOUNT_ID = '263611243147';

// Stack names
export const STACKS = {
  networking: `AirlineVoiceAgent-Networking-${ENV_NAME}`,
  dataLayer: `AirlineVoiceAgent-DataLayer-${ENV_NAME}`,
  connectMedia: `AirlineVoiceAgent-ConnectMedia-${ENV_NAME}`,
  orchestrator: `AirlineVoiceAgent-Orchestrator-${ENV_NAME}`,
  vectorStore: `AirlineVoiceAgent-VectorStore-${ENV_NAME}`,
  intelligence: `AirlineVoiceAgent-Intelligence-${ENV_NAME}`,
  noiseMonitor: `AirlineVoiceAgent-NoiseMonitor-${ENV_NAME}`,
} as const;
