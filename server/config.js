import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  DATABASE_URL: z.string().min(1),
  APP_ORIGIN: z.string().url(),
  FRONTEND_URL: z.string().url().optional(),
  DATABASE_SSL_MODE: z.enum(['require','no-verify','disable']).optional(),
  DATABASE_CA_CERT: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().min(20).optional()),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).optional(),
  SESSION_COOKIE_NAME: z.string().min(3).default('sarex_session'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(720),
  SESSION_IDLE_TIMEOUT_HOURS: z.coerce.number().int().min(1).max(720).default(720),
  COOKIE_SAME_SITE: z.enum(['lax','strict','none']).optional(),
  CSRF_SECRET: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().min(32).optional()),
  GOOGLE_CLIENT_ID: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().min(20).optional()),
  PAYSTACK_SECRET_KEY: z.preprocess(
    value => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().min(10).optional()
  ),
  RESEND_API_KEY: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().min(10).optional()),
  EMAIL_FROM: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().email().optional()),
  CLOUDINARY_CLOUD_NAME: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().min(2).optional()),
  CLOUDINARY_API_KEY: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().min(2).optional()),
  CLOUDINARY_API_SECRET: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().min(8).optional()),
  TRUST_PROXY: z.enum(['true', 'false']).default('false')
});

export function loadConfig(env = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid server configuration: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  const data=parsed.data, production=data.NODE_ENV==='production';
  if (production && !data.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is required in production');
  if (production && !data.FRONTEND_URL) throw new Error('FRONTEND_URL is required in production');
  if (production && !data.CSRF_SECRET) throw new Error('CSRF_SECRET is required in production');
  if (production && (!data.CLOUDINARY_CLOUD_NAME||!data.CLOUDINARY_API_KEY||!data.CLOUDINARY_API_SECRET)) {
    throw new Error('Cloudinary configuration is required in production');
  }
  const frontendUrl=(data.FRONTEND_URL||data.APP_ORIGIN).replace(/\/$/,'');
  return {
    ...data,
    APP_ORIGIN:data.APP_ORIGIN.replace(/\/$/,''),
    FRONTEND_URL:frontendUrl,
    DATABASE_SSL_MODE:data.DATABASE_SSL_MODE||(production?'require':'disable'),
    DATABASE_CA_CERT:data.DATABASE_CA_CERT?.replace(/\\n/g,'\n'),
    DATABASE_POOL_MAX:data.DATABASE_POOL_MAX||(production?5:10),
    COOKIE_SAME_SITE:data.COOKIE_SAME_SITE||(production?'none':'lax'),
    secureCookies:production
  };
}
