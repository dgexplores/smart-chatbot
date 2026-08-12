import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(5001),
    MONGO_URI: z.string().min(1).default('mongodb://localhost:27017/asep'),
    QDRANT_URL: z.string().url().default('http://localhost:6333'),
    QDRANT_API_KEY: z.string().default(''),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().min(1).default('gemini-flash-lite-latest'),
    MOCK_LLM: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SEED_DEMO_DATA: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    JWT_SECRET: z
      .string()
      .min(16, 'JWT_SECRET must be at least 16 characters and must not be the default placeholder.'),
    JWT_EXPIRES_IN: z.string().min(1).default('24h'),
    CLIENT_URL: z.string().url().default('http://localhost:5173'),
    PUBLIC_BASE_URL: z.string().url().default('http://localhost:5001'),
    SMTP_HOST: z.string().min(1).default('smtp.mailtrap.io'),
    SMTP_PORT: z.coerce.number().int().positive().default(2525),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    SMTP_FROM: z.string().min(1).default('noreply@asep.local'),
    PRICING_REFRESH_HOURS: z.coerce.number().int().positive().default(24),
    MARKET_SCAN_HOURS: z.coerce.number().int().positive().default(24)
  })
  .superRefine((data, ctx) => {
    if (!data.GEMINI_API_KEY && data.MOCK_LLM !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GEMINI_API_KEY is required unless MOCK_LLM is set to "true".'
      });
    }
    if (data.JWT_SECRET === 'your_jwt_signing_secret_here') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_SECRET is still set to the placeholder value. Set a real secret.'
      });
    }
  });

const parsed = envSchema
  .transform((data) => ({
    nodeEnv: data.NODE_ENV,
    port: data.PORT,
    mongoUri: data.MONGO_URI,
    qdrantUrl: data.QDRANT_URL,
    qdrantApiKey: data.QDRANT_API_KEY,
    geminiApiKey: data.GEMINI_API_KEY,
    geminiModel: data.GEMINI_MODEL,
    mockLlm: data.MOCK_LLM,
    seedDemoData: data.SEED_DEMO_DATA,
    jwtSecret: data.JWT_SECRET,
    jwtExpiresIn: data.JWT_EXPIRES_IN,
    clientUrl: data.CLIENT_URL,
    publicBaseUrl: data.PUBLIC_BASE_URL,
    smtpHost: data.SMTP_HOST,
    smtpPort: data.SMTP_PORT,
    smtpUser: data.SMTP_USER,
    smtpPass: data.SMTP_PASS,
    smtpFrom: data.SMTP_FROM,
    pricingRefreshHours: data.PRICING_REFRESH_HOURS,
    marketScanHours: data.MARKET_SCAN_HOURS
  }))
  .safeParse(process.env);

if (!parsed.success) {
  console.error('[Config] Invalid or missing environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  console.error('[Config] Fix the values above in server/.env and restart.');
  process.exit(1);
}

export const config = parsed.data;
