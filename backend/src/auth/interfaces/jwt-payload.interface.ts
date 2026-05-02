export interface JWTPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
  iat: number; // Issued at
  exp?: number; // Expiration (optionnel car géré par expiresIn dans JwtModule)
  jti: string; // JWT ID (pour blacklist)
}
