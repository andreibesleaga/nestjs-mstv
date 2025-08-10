import { ObjectType, Field, ID, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  name?: string;

  @Field()
  role: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class AuthPayload {
  @Field()
  access_token: string;

  @Field()
  refresh_token: string;

  @Field(() => User)
  user: User;
}

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail()
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  email: string;

  @Field()
  @IsString()
  @MinLength(6)
  @ApiProperty({ example: 'password123', description: 'User password (min 6 chars)' })
  password: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'John Doe', description: 'User full name', required: false })
  name?: string;
}

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  email: string;

  @Field()
  @IsString()
  @ApiProperty({ example: 'password123', description: 'User password' })
  password: string;
}

@InputType()
export class RefreshTokenInput {
  @Field()
  @IsString()
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Refresh token' })
  refresh_token: string;
}

@ObjectType()
export class RefreshPayload {
  @Field()
  access_token: string;
}

@ObjectType()
export class LogoutPayload {
  @Field()
  message: string;
}
