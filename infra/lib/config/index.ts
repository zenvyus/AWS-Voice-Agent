import { devConfig } from './env.dev';
import { testConfig } from './env.test';
import { stagingConfig } from './env.staging';
import { prodConfig } from './env.prod';
import { EnvironmentConfig, validateConfig } from './schema';

const configs: Record<string, EnvironmentConfig> = {
  dev: devConfig,
  test: testConfig,
  staging: stagingConfig,
  prod: prodConfig,
};

export function getConfig(envName?: string): EnvironmentConfig {
  const targetEnv = envName || process.env.TARGET_ENV || 'dev';
  const config = configs[targetEnv];

  if (!config) {
    throw new Error(
      `Unknown environment: ${targetEnv}. Valid environments: ${Object.keys(configs).join(', ')}`,
    );
  }

  return validateConfig(config);
}

export { EnvironmentConfig } from './schema';
