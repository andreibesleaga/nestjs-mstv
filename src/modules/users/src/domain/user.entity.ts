import { Email, Password } from './value-objects';

export class User {
  id: string;
  email: Email;
  password?: Password;
  name?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id?: string;
    email: string | Email;
    password?: string | Password;
    name?: string;
    role?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id || '';
    this.email = data.email instanceof Email ? data.email : new Email(data.email);
    this.password = data.password
      ? data.password instanceof Password
        ? data.password
        : new Password(data.password)
      : undefined;
    this.name = data.name;
    this.role = data.role || 'user';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  public updateEmail(email: string): void {
    this.email = new Email(email);
    this.updatedAt = new Date();
  }

  public updatePassword(password: string): void {
    this.password = new Password(password);
    this.updatedAt = new Date();
  }

  public updateName(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
  }

  public isAdmin(): boolean {
    return this.role === 'admin';
  }
}
