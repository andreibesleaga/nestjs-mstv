import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../src/modules/users/interface/users.controller';
import { UsersService } from '../src/modules/users/application/users.service';
import { CreateUserDto, UpdateUserDto } from '../src/modules/users/interface/dto';
import { User } from '../src/modules/users/domain/user.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUser = new User({
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockUsersService = {
    getAllUsers: jest.fn(),
    getById: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return an array of users', async () => {
      const mockUsers = [mockUser];
      mockUsersService.getAllUsers.mockResolvedValue(mockUsers);

      const result = await controller.getAllUsers();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', mockUser.id);
      expect(result[0]).toHaveProperty('email', 'test@example.com');
      expect(result[0]).toHaveProperty('name', mockUser.name);
      expect(usersService.getAllUsers).toHaveBeenCalled();
    });

    it('should handle pagination', async () => {
      const mockUsers = Array.from(
        { length: 20 },
        (_, i) =>
          new User({
            id: `user-${i}`,
            email: `user${i}@example.com`,
            password: 'password123',
            name: `User ${i}`,
            role: 'user',
          })
      );
      mockUsersService.getAllUsers.mockResolvedValue(mockUsers);

      const result = await controller.getAllUsers(1, 10);

      expect(result).toHaveLength(10);
      expect(usersService.getAllUsers).toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    it('should return a user by id', async () => {
      mockUsersService.getById.mockResolvedValue(mockUser);

      const result = await controller.getUser(mockUser.id);

      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(usersService.getById).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.getById.mockResolvedValue(null);

      await expect(controller.getUser('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(usersService.getById).toHaveBeenCalledWith('non-existent-id');
    });
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      role: 'user',
    };

    it('should create and return a new user', async () => {
      const createdUser = new User({
        id: 'new-user-id',
        email: createUserDto.email,
        password: createUserDto.password,
        name: createUserDto.name,
        role: createUserDto.role,
      });
      mockUsersService.createUser.mockResolvedValue(createdUser);

      const result = await controller.createUser(createUserDto);

      expect(result).toHaveProperty('id', 'new-user-id');
      expect(result).toHaveProperty('email', createUserDto.email);
      expect(usersService.createUser).toHaveBeenCalledWith(
        createUserDto.email,
        createUserDto.password,
        createUserDto.name,
        createUserDto.role
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      const error = new Error('User with email newuser@example.com already exists');
      mockUsersService.createUser.mockRejectedValue(error);

      await expect(controller.createUser(createUserDto)).rejects.toThrow(ConflictException);
      expect(usersService.createUser).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    const updateUserDto: UpdateUserDto = {
      email: 'updated@example.com',
      name: 'Updated User',
      role: 'admin',
    };

    it('should update and return the user', async () => {
      const updatedUser = new User({
        ...mockUser,
        email: updateUserDto.email,
        name: updateUserDto.name,
        role: updateUserDto.role,
        updatedAt: new Date(),
      });
      mockUsersService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(mockUser.id, updateUserDto);

      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('email', updateUserDto.email);
      expect(result).toHaveProperty('name', updateUserDto.name);
      expect(usersService.updateUser).toHaveBeenCalledWith(
        mockUser.id,
        updateUserDto.email,
        updateUserDto.name,
        updateUserDto.role
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.updateUser.mockResolvedValue(null);

      await expect(controller.updateUser('non-existent-id', updateUserDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      const error = new Error('User with email updated@example.com already exists');
      mockUsersService.updateUser.mockRejectedValue(error);

      await expect(controller.updateUser(mockUser.id, updateUserDto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      mockUsersService.deleteUser.mockResolvedValue(undefined);

      await expect(controller.deleteUser(mockUser.id)).resolves.toBeUndefined();
      expect(usersService.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException when user not found', async () => {
      const error = new Error('User with ID non-existent-id not found');
      mockUsersService.deleteUser.mockRejectedValue(error);

      await expect(controller.deleteUser('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
