import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthenticationError extends HttpException {
  constructor(message: string = 'Authentication failed') {
    super({
      error: 'AUTHENTICATION_ERROR',
      message,
      statusCode: HttpStatus.UNAUTHORIZED,
    }, HttpStatus.UNAUTHORIZED);
  }
}

export class AuthorizationError extends HttpException {
  constructor(message: string = 'Insufficient permissions') {
    super({
      error: 'AUTHORIZATION_ERROR', 
      message,
      statusCode: HttpStatus.FORBIDDEN,
    }, HttpStatus.FORBIDDEN);
  }
}

export class UserAlreadyExistsError extends HttpException {
  constructor(email: string) {
    super({
      error: 'USER_ALREADY_EXISTS',
      message: `User with email ${email} already exists`,
      statusCode: HttpStatus.CONFLICT,
    }, HttpStatus.CONFLICT);
  }
}

export class InvalidCredentialsError extends HttpException {
  constructor() {
    super({
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
      statusCode: HttpStatus.UNAUTHORIZED,
    }, HttpStatus.UNAUTHORIZED);
  }
}

export class InvalidTokenError extends HttpException {
  constructor(message: string = 'Invalid or expired token') {
    super({
      error: 'INVALID_TOKEN',
      message,
      statusCode: HttpStatus.UNAUTHORIZED,
    }, HttpStatus.UNAUTHORIZED);
  }
}

export class ValidationError extends HttpException {
  constructor(field: string, message: string) {
    super({
      error: 'VALIDATION_ERROR',
      message: `Validation failed for ${field}: ${message}`,
      statusCode: HttpStatus.BAD_REQUEST,
    }, HttpStatus.BAD_REQUEST);
  }
}
