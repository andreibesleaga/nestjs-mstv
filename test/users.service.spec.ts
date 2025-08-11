import { UsersService } from '../src/modules/users/src/application/users.service';

const mockCommandBus = {
  execute: jest.fn(),
};

const mockQueryBus = {
  execute: jest
    .fn()
    .mockResolvedValue({ id: 'u1', email: { getValue: () => 'a@b.com' }, name: 'A', role: 'user' }),
};

describe('UsersService', () => {
  const svc = new UsersService(mockCommandBus as any, mockQueryBus as any);

  it('gets user by id', async () => {
    const u = await svc.getById('u1');
    expect(u.email.getValue()).toBe('a@b.com');
    expect(mockQueryBus.execute).toHaveBeenCalled();
  });

  it('gets all users', async () => {
    mockQueryBus.execute.mockResolvedValueOnce([
      { id: 'u1', email: { getValue: () => 'a@b.com' } },
    ]);
    const users = await svc.getAllUsers();
    expect(users).toHaveLength(1);
    expect(mockQueryBus.execute).toHaveBeenCalled();
  });

  it('creates user', async () => {
    const mockUser = {
      id: 'u1',
      email: { getValue: () => 'test@example.com' },
      name: 'Test',
      role: 'user',
    };
    mockCommandBus.execute.mockResolvedValueOnce(mockUser);

    const user = await svc.createUser('test@example.com', 'password123', 'Test');
    expect(user.email.getValue()).toBe('test@example.com');
    expect(mockCommandBus.execute).toHaveBeenCalled();
  });
});
