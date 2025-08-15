import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '../src/common/cqrs/command-bus';
import { QueryBus } from '../src/common/cqrs/query-bus';
import { EventBus } from '../src/common/cqrs/event-bus';
import { CreateUserCommand } from '../src/modules/users/cqrs/commands/create-user.command';
import { GetUserQuery } from '../src/modules/users/cqrs/queries/get-user.query';
import { UserCreatedEvent } from '../src/modules/users/cqrs/events/user-created.event';
import { CreateUserHandler } from '../src/modules/users/cqrs/handlers/create-user.handler';
import { GetUserHandler } from '../src/modules/users/cqrs/handlers/get-user.handler';

describe('CQRS Implementation', () => {
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let eventBus: EventBus;
  let mockUserRepository: any;

  beforeEach(async () => {
    mockUserRepository = {
      create: jest.fn().mockResolvedValue({
        id: '1',
        email: { getValue: () => 'test@example.com' },
        name: 'Test User',
        role: 'user',
      }),
      findById: jest.fn().mockResolvedValue({
        id: '1',
        email: { getValue: () => 'test@example.com' },
        name: 'Test User',
        role: 'user',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandBus,
        QueryBus,
        EventBus,
        CreateUserHandler,
        GetUserHandler,
        {
          provide: 'IUserRepository',
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
    eventBus = module.get<EventBus>(EventBus);

    const createUserHandler = module.get<CreateUserHandler>(CreateUserHandler);
    const getUserHandler = module.get<GetUserHandler>(GetUserHandler);

    commandBus.register('CreateUserCommand', createUserHandler);
    queryBus.register('GetUserQuery', getUserHandler);
  });

  describe('CommandBus', () => {
    it('should execute create user command', async () => {
      const command = new CreateUserCommand('test@example.com', 'password123', 'Test User');
      const result = await commandBus.execute(command);

      expect(result).toBeDefined();
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should throw error for unregistered command', async () => {
      const command = { type: 'UnknownCommand' };
      await expect(commandBus.execute(command as any)).rejects.toThrow(
        'No handler registered for command: UnknownCommand'
      );
    });
  });

  describe('QueryBus', () => {
    it('should execute get user query', async () => {
      const query = new GetUserQuery('1');
      const result = await queryBus.execute(query);

      expect(result).toBeDefined();
      expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw error for unregistered query', async () => {
      const query = { type: 'UnknownQuery' };
      await expect(queryBus.execute(query as any)).rejects.toThrow(
        'No handler registered for query: UnknownQuery'
      );
    });
  });

  describe('EventBus', () => {
    it('should publish events to registered handlers', async () => {
      const mockHandler = { handle: jest.fn().mockResolvedValue(undefined) };
      eventBus.register('UserCreatedEvent', mockHandler);

      const event = new UserCreatedEvent('1', 'test@example.com', 'Test User');
      await eventBus.publish(event);

      expect(mockHandler.handle).toHaveBeenCalledWith(event);
    });

    it('should handle multiple handlers for same event', async () => {
      const mockHandler1 = { handle: jest.fn().mockResolvedValue(undefined) };
      const mockHandler2 = { handle: jest.fn().mockResolvedValue(undefined) };

      eventBus.register('UserCreatedEvent', mockHandler1);
      eventBus.register('UserCreatedEvent', mockHandler2);

      const event = new UserCreatedEvent('1', 'test@example.com', 'Test User');
      await eventBus.publish(event);

      expect(mockHandler1.handle).toHaveBeenCalledWith(event);
      expect(mockHandler2.handle).toHaveBeenCalledWith(event);
    });
  });

  describe('Commands and Queries', () => {
    it('should create command with correct properties', () => {
      const command = new CreateUserCommand(
        'test@example.com',
        'password123',
        'Test User',
        'admin'
      );

      expect(command.type).toBe('CreateUserCommand');
      expect(command.email).toBe('test@example.com');
      expect(command.password).toBe('password123');
      expect(command.name).toBe('Test User');
      expect(command.role).toBe('admin');
    });

    it('should create query with correct properties', () => {
      const query = new GetUserQuery('user-id-123');

      expect(query.type).toBe('GetUserQuery');
      expect(query.id).toBe('user-id-123');
    });
  });

  describe('Events', () => {
    it('should create event with correct properties', () => {
      const event = new UserCreatedEvent('1', 'test@example.com', 'Test User', 'admin');

      expect(event.type).toBe('UserCreatedEvent');
      expect(event.aggregateId).toBe('1');
      expect(event.email).toBe('test@example.com');
      expect(event.name).toBe('Test User');
      expect(event.role).toBe('admin');
      expect(event.timestamp).toBeInstanceOf(Date);
    });
  });
});
