export const JwtConfig = {
  secret: process.env.JWT_SECRET || 'change-me-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-in-production',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};
