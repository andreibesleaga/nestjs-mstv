import { S3StorageAdapter } from '../src/common/storage/adapters/s3.adapter';

// Mocks
const sendMock = jest.fn(async (cmd: any) => {
  const name = cmd?.constructor?.name;
  if (name === 'GetObjectCommand') {
    return { Body: { transformToByteArray: async () => Buffer.from('hello') } } as any;
  }
  if (name === 'HeadObjectCommand') {
    const key = (cmd as any).input?.Key;
    if (key === 'missing.txt') {
      const err: any = new Error('NotFound');
      err.$metadata = { httpStatusCode: 404 };
      throw err;
    }
    return {} as any;
  }
  if (name === 'ListObjectsV2Command') {
    return { Contents: [{ Key: 'a.txt' }, { Key: 'b.txt' }] } as any;
  }
  return {} as any;
});

jest.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = sendMock;
    constructor(_cfg?: any) {}
  }
  class PutObjectCommand {
    constructor(public input: any) {}
  }
  class GetObjectCommand {
    constructor(public input: any) {}
  }
  class DeleteObjectCommand {
    constructor(public input: any) {}
  }
  class HeadObjectCommand {
    constructor(public input: any) {}
  }
  class ListObjectsV2Command {
    constructor(public input: any) {}
  }
  return {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(async () => 'https://s3.local/signed'),
}));

describe('S3StorageAdapter (mocked SDK)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, S3_BUCKET: 'test-bucket', S3_REGION: 'us-east-1' };
    sendMock.mockClear();
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('uploads, downloads, lists, checks existence, deletes, and signs URLs', async () => {
    const adapter = new S3StorageAdapter();
    await adapter.upload('foo.txt', Buffer.from('hi'), { contentType: 'text/plain' });
    expect(sendMock).toHaveBeenCalled();

    const buf = await adapter.download('foo.txt');
    expect(buf.toString()).toBe('hello');

    expect(await adapter.exists('foo.txt')).toBe(true);
    expect(await adapter.exists('missing.txt')).toBe(false);

    const list = await adapter.list('');
    expect(list).toEqual(['a.txt', 'b.txt']);

    await adapter.delete('foo.txt');
    expect(sendMock).toHaveBeenCalled();

    const url = await adapter.getSignedUrl('foo.txt', 'get', 60);
    expect(url).toContain('https://');
  });
});
