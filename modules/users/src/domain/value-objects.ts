export abstract class ValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this._value = Object.freeze(value);
  }

  public getValue(): T {
    return this._value;
  }

  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    return JSON.stringify(this._value) === JSON.stringify(vo._value);
  }
}

export class Email extends ValueObject<string> {
  constructor(value: string) {
    if (!Email.isValid(value)) {
      throw new Error('Invalid email address');
    }
    super(value);
  }

  private static isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export class Password extends ValueObject<string> {
  constructor(value: string) {
    if (!Password.isValid(value)) {
      throw new Error('Password must be at least 8 characters long');
    }
    super(value);
  }

  private static isValid(password: string): boolean {
    return password.length >= 8;
  }
}
