import { StorageService } from '../src/common/storage/storage.service';
import { MemoryStorageAdapter } from '../src/common/storage/adapters/memory.adapter';

describe('StorageService (memory adapter)', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService(new MemoryStorageAdapter() as any);
  });

  it('uploads and downloads content', async () => {
    const key = 'folder/test.txt';
    const content = 'hello world';
    await service.upload(key, content);
    const buf = await service.download(key);
    expect(buf.toString()).toBe(content);
  });

  it('checks existence', async () => {
    const key = 'exists.txt';
    await service.upload(key, 'x');
    await expect(service.exists(key)).resolves.toBe(true);
    await expect(service.exists('nope.txt')).resolves.toBe(false);
  });

  it('lists by prefix', async () => {
    await service.upload('a/1.txt', '1');
    await service.upload('a/2.txt', '2');
    await service.upload('b/3.txt', '3');
    const a = await service.list('a/');
    expect(a.sort()).toEqual(['a/1.txt', 'a/2.txt']);
  });

  it('deletes objects', async () => {
    const key = 'todelete.txt';
    await service.upload(key, 'data');
    await service.delete(key);
    await expect(service.exists(key)).resolves.toBe(false);
  });

  it('returns signed URLs (format only)', async () => {
    const key = 'signed.txt';
    const url = await service.getSignedUrl(key, 'get', 60);
    expect(url).toContain('memory://get/');
    expect(decodeURIComponent(url.split('/').pop() || '')).toBe(key);
  });
});
