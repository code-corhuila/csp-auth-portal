import { UserSummary } from './user';

/** Request and response types of csp-auth-api, mirrored with the exact field names (camelCase). */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  user: UserSummary;
}
