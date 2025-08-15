import { User } from '../../domain/user.entity';
import { UserResponseDto } from '../dto';

export class UserMapper {
  static toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email.getValue(),
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toResponseDtoArray(users: User[]): UserResponseDto[] {
    return users.map((user) => this.toResponseDto(user));
  }
}
