const DEFAULT_DEV_JWT_SECRET = 'fitforecast-dev-secret-change-in-production';
const DEFAULT_JWT_ISSUER = 'fitforecast';
const DEFAULT_JWT_AUDIENCE = 'fitforecast-web';

export const isProduction = process.env.NODE_ENV === 'production';

export const jwtSecret = (() => {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }

  if (isProduction) {
    throw new Error('JWT_SECRET must be set in production');
  }

  return DEFAULT_DEV_JWT_SECRET;
})();

export const jwtIssuer = process.env.JWT_ISSUER ?? DEFAULT_JWT_ISSUER;
export const jwtAudience = process.env.JWT_AUDIENCE ?? DEFAULT_JWT_AUDIENCE;
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
export const jsonBodyLimit = process.env.JSON_BODY_LIMIT ?? '1mb';
export const allowDevAuthBypass = !isProduction && process.env.ALLOW_DEV_AUTH_BYPASS !== 'false';
export const metricsApiKey = process.env.METRICS_API_KEY;

export const allowedCorsOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);