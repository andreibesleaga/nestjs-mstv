import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from '../application/users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { UserMapper } from './mappers/user.mapper';
import { PoliciesGuard, CheckPolicies } from '../../auth/policies.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AppAbility } from '../../auth/abilities/user.ability';
import { UserEntity } from '../../auth/abilities/user.ability';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @CheckPolicies((ability: AppAbility) => ability.can('read', UserEntity))
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve a list of all users with optional pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<UserResponseDto[]> {
    const users = await this.usersService.getAllUsers();

    // Apply pagination if provided
    if (page && limit) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = users.slice(startIndex, endIndex);
      return UserMapper.toResponseDtoArray(paginatedUsers);
    }

    return UserMapper.toResponseDtoArray(users);
  }

  @Get(':id')
  @CheckPolicies((ability: AppAbility) => ability.can('read', UserEntity))
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their unique identifier',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'User unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User found successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUser(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.getById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return UserMapper.toResponseDto(user);
  }

  @Post()
  @CheckPolicies((ability: AppAbility) => ability.can('create', 'all'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Create a new user account with email, password, and optional profile information',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'User creation data',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createUser(@Body(ValidationPipe) createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.createUser(
        createUserDto.email,
        createUserDto.password,
        createUserDto.name,
        createUserDto.role
      );

      return UserMapper.toResponseDto(user);
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw new ConflictException(`User with email ${createUserDto.email} already exists`);
      }
      throw error;
    }
  }

  @Put(':id')
  @CheckPolicies((ability: AppAbility) => ability.can('update', 'all'))
  @ApiOperation({
    summary: 'Update user by ID',
    description: "Update an existing user's profile information",
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'User unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'User update data',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUser(
    @Param('id') id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto
  ): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.updateUser(
        id,
        updateUserDto.email,
        updateUserDto.name,
        updateUserDto.role
      );

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return UserMapper.toResponseDto(user);
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw new ConflictException(`User with email ${updateUserDto.email} already exists`);
      }
      if (error.message.includes('not found')) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }

  @Delete(':id')
  @CheckPolicies((ability: AppAbility) => ability.can('delete', 'all'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user by ID',
    description: 'Permanently delete a user account',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'User unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteUser(@Param('id') id: string): Promise<void> {
    try {
      await this.usersService.deleteUser(id);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }
}
