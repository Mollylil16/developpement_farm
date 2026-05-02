export interface AdminJWTPayload {
  sub: string; // Admin ID
  email: string;
  iat: number;
  exp?: number; // Ajouté automatiquement par jwtService.sign() via expiresIn
  jti: string;
  type: 'admin'; // Pour différencier des tokens utilisateurs
}

