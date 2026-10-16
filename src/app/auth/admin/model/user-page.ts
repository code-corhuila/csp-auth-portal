import { UserSummary } from '../../model/user';

/** Pagination metadata of the contract (`PaginatedMeta`). */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Response of `GET /users` (`UserListResponse`). */
export interface UserPage {
  data: UserSummary[];
  meta: PageMeta;
}

export interface UserQuery {
  /** Email prefix, case-insensitive, 1 to 254 characters; omitted lists every account. */
  email?: string;
  page: number;
  limit: number;
}
