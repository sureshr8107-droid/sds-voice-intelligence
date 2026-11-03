import dotenv from 'dotenv';
import { z } from 'zod';

// Load local .env if present
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val < 65536, {
      message: 'PORT must be a valid integer between 1 and 65535',
    })
    .default('5000'),
  HOST: z.string().default('0.0.0.0'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  API_PREFIX: z.string().default('/api/v1'),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters long')
    .default('sds-voice-intelligence-secure-jwt-secret-key-32-chars-min'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // Future phase optional placeholders (validated if provided)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().optional(),
  ASTERISK_ARI_URL: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedEnv: EnvConfig;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const formattedErrors = error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    console.error(`\n❌ Configuration Error: Invalid environment variables:\n${formattedErrors}\n`);
  } else {
    console.error('❌ Configuration Error: Unexpected error while validating environment variables.');
  }
  process.exit(1);
}

export const env = parsedEnv;
