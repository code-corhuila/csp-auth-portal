import { Role } from '../model/user';

export interface SyntheticUser {
  id: string;
  email: string;
  password: string;
  name: string;
  roles: Role[];
}

/** Cut 2 dataset, burned into the portal until csp-auth-api exists. Not real credentials. */
export const SYNTHETIC_USERS: readonly SyntheticUser[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'maria@cinesync.com',
    password: 'SecurePass123!',
    name: 'Maria Garcia',
    roles: ['CLIENT'],
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'admin@cinesync.com',
    password: 'SecurePass123!',
    name: 'Admin CineSync',
    roles: ['CLIENT', 'ADMIN'],
  },
];
