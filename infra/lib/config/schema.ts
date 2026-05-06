import { z } from 'zod';

export const EnvironmentConfigSchema = z.object({
  environmentName: z.enum(['dev', 'test', 'staging', 'prod']),
  account: z.string().regex(/^\d{12}$/, 'AWS account ID must be 12 digits'),
  region: z.string().min(1),
  vpcCidr: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/, 'Must be valid CIDR'),
  maxAzs: z.number().int().min(2).max(3).default(2),
  natGateways: z.number().int().min(1).max(3).default(1),
  tags: z.record(z.string()).default({}),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

export function validateConfig(config: unknown): EnvironmentConfig {
  return EnvironmentConfigSchema.parse(config);
}
