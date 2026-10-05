/** Roles of the contract (auth-service 1.1.0). */
export type Role = 'CLIENT' | 'ADMIN';

export interface UserSummary {
  id: string;
  email: string;
  name?: string;
  roles: Role[];
  /** Format "[resource]:[action]". */
  permissions?: string[];
}
