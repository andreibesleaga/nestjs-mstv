
import { UsersService } from '../modules/users/src/application/users.service';

const repo = { findById: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'A', role: 'user' }) };
describe('UsersService', () => {
  const svc = new UsersService(repo as any);
  it('gets user by id', async () => {
    const u = await svc.getById('u1');
    expect(u.email).toBe('a@b.com');
  });
});
