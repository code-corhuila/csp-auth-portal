import { Injectable } from '@angular/core';

/**
 * Source of the Idempotency-Key of an operation that creates (norm 5.3.8; 8 to 128 characters).
 * Behind an injectable so a test can give a fixed key; the caller keeps the key of a submission for as long as it retries it.
 */
@Injectable({ providedIn: 'root' })
export class IdempotencyKeyGenerator {
  next(): string {
    return crypto.randomUUID();
  }
}
