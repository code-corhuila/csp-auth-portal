import { asApiError } from './shell-contract';

describe('asApiError', () => {
  it('preserves a complete shell error', () => {
    const error = {
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      details: [{ field: 'title', message: 'Required' }],
      traceId: 'trace-1',
      userMessage: 'Check the form.',
    };

    expect(asApiError(error)).toEqual(error);
  });

  it('normalizes incomplete errors', () => {
    expect(asApiError({ status: 500, details: [{}] }).code).toBe('UNKNOWN');
  });
});
