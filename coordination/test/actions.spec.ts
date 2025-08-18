import { action1, action2, action3, reaction1, reaction2, healthCheck } from '../src/activities';
import { TestConfig } from '../src/types';

describe('actions & reactions', () => {
  const input = { jobId: 'test-123', payload: { foo: 'bar' } };

  it('action1 succeeds', async () => {
    const res = await action1(input);
    expect(res.ok).toBe(true);
    expect(res.action1Id).toContain('action1-');
  });

  it('action2 succeeds', async () => {
    const res = await action2(input);
    expect(res.ok).toBe(true);
    expect(res.action2Id).toContain('action2-');
  });

  it('action3 succeeds', async () => {
    const res = await action3(input);
    expect(res.ok).toBe(true);
    expect(res.action3Id).toContain('action3-');
  });

  it('reactions succeed', async () => {
    await expect(reaction1(input)).resolves.toEqual({ ok: true });
    await expect(reaction2(input)).resolves.toEqual({ ok: true });
  });
});

describe('healthCheck', () => {
  it('checks the URL and returns status', async () => {
    const url = TestConfig.defaultEnv.HEALTHCHECK_URL;
    const res = await healthCheck(url);
    expect(typeof res.ok).toBe('boolean');
    expect(typeof res.status).toBe('number');
  });
});
