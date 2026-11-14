import { FormControl } from '@angular/forms';
import { meetsPasswordRules, passwordRules } from './password-rules';

describe('password rules', () => {
  it('accepts 8 characters with an uppercase letter and a digit', () => {
    expect(meetsPasswordRules('Abcdefg1')).toBeTrue();
  });

  it('rejects fewer than 8 bytes', () => {
    expect(meetsPasswordRules('Abcdef1')).toBeFalse();
  });

  it('rejects a password without an uppercase letter', () => {
    expect(meetsPasswordRules('abcdefg1')).toBeFalse();
  });

  it('rejects a password without a digit', () => {
    expect(meetsPasswordRules('Abcdefgh')).toBeFalse();
  });

  it('counts bytes, not characters: 72 bytes pass and 73 do not', () => {
    expect(meetsPasswordRules('A1' + 'a'.repeat(70))).toBeTrue();
    expect(meetsPasswordRules('A1' + 'a'.repeat(71))).toBeFalse();
    expect(meetsPasswordRules('A1' + 'ñ'.repeat(35))).toBeTrue();
    expect(meetsPasswordRules('A1' + 'ñ'.repeat(36))).toBeFalse();
  });

  it('works as a form validator', () => {
    expect(passwordRules(new FormControl('weak', { nonNullable: true }))).toEqual({ passwordRules: true });
    expect(passwordRules(new FormControl('Strong123', { nonNullable: true }))).toBeNull();
  });
});
