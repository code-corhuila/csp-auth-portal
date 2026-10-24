import { UserSummary } from './user';

/** Request and response types of csp-auth-api, mirrored with the exact field names (camelCase). */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  /** Digits with an optional leading "+", 7 to 15 digits. */
  phone: string;
  address: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  /** Revokes this refresh token. */
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  /** The UUID of the link sent by email; read from the URL fragment, never logged. */
  token: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  user: UserSummary;
}

export interface EmailChangeRequest {
  email: string;
}

export interface EmailVerificationRequest {
  /** Exactly six digits, leading zeros included, so it is always a string. */
  verificationCode: string;
}
