import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationError extends HttpException {
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`, HttpStatus.BAD_REQUEST);
  }

  getResponse() {
    return {
      error: 'VALIDATION_ERROR',
      message: this.message,
      statusCode: this.getStatus(),
    };
  }
}

export class UserAlreadyExistsError extends HttpException {
  constructor(email: string) {
    super(`User with email ${email} already exists`, HttpStatus.CONFLICT);
  }
}

export class InvalidCredentialsError extends HttpException {
  constructor() {
    super('Invalid email or password', HttpStatus.UNAUTHORIZED);
  }
}

export class InvalidTokenError extends HttpException {
  constructor(message = 'Invalid or expired token') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}
