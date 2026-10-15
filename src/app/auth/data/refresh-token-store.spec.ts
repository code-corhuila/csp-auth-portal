import { TestBed } from '@angular/core/testing';
import { RefreshTokenStore } from './refresh-token-store';

const KEY = 'csp.auth.refresh';

describe('RefreshTokenStore', () => {
  let store: RefreshTokenStore;

  beforeEach(() => {
    sessionStorage.removeItem(KEY);
    store = TestBed.inject(RefreshTokenStore);
  });

  afterAll(() => sessionStorage.removeItem(KEY));

  it('keeps the token in sessionStorage and never in localStorage', () => {
    store.save('refresh-1');
    expect(sessionStorage.getItem(KEY)).toBe('refresh-1');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('reads the token stored by a previous page load', () => {
    sessionStorage.setItem(KEY, 'from-before');
    expect(store.read()).toBe('from-before');
  });

  it('has no token when nothing was stored', () => {
    expect(store.read()).toBeNull();
  });

  it('ignores a corrupted stored value', () => {
    sessionStorage.setItem(KEY, '   ');
    expect(store.read()).toBeNull();
    sessionStorage.setItem(KEY, 'two words');
    expect(store.read()).toBeNull();
  });

  it('forgets the token in memory and in storage', () => {
    store.save('refresh-1');
    store.clear();
    expect(store.read()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  describe('with the storage unavailable', () => {
    beforeEach(() => {
      spyOn(Storage.prototype, 'getItem').and.throwError('blocked');
      spyOn(Storage.prototype, 'setItem').and.throwError('blocked');
      spyOn(Storage.prototype, 'removeItem').and.throwError('blocked');
    });

    it('still serves the token of this page load from memory', () => {
      store.save('refresh-1');
      expect(store.read()).toBe('refresh-1');
    });

    it('reads nothing and clears without failing', () => {
      expect(store.read()).toBeNull();
      expect(() => store.clear()).not.toThrow();
    });
  });
});
