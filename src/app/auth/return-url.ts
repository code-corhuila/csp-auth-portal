import { BILLBOARD_PATH } from './auth-paths';

/** Only same-application absolute paths are honoured, so login cannot be used as an open redirect. */
export function safeReturnUrl(candidate: string | null | undefined): string {
  return candidate && candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : BILLBOARD_PATH;
}
