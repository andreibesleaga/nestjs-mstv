import { ValidationError } from '../src/exceptions/auth.exceptions';

describe('AuthExceptions', () => {
  describe('ValidationError', () => {
    it('should create validation error with correct message', () => {
      const error = new ValidationError('email', 'Invalid format');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Validation failed for email: Invalid format');
      expect(error.getStatus()).toBe(400);
    });

    it('should have correct error response structure', () => {
      const error = new ValidationError('password', 'Too short');
      const response = error.getResponse() as any;

      expect(response.error).toBe('VALIDATION_ERROR');
      expect(response.message).toBe('Validation failed for password: Too short');
      expect(response.statusCode).toBe(400);
    });
  });
});
