import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from '../application/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async get(@Param('id') id: string) {
    const user = await this.usersService.getById(id);
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email.getValue(),
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
