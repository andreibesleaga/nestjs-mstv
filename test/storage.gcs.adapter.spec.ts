import { GCSStorageAdapter } from '../src/common/storage/adapters/gcs.adapter';

const saveMock = jest.fn(async () => ({}));
const downloadMock = jest.fn(async () => [Buffer.from('hi')]);
const deleteMock = jest.fn(async () => ({}));
const existsMock = jest.fn(async () => [true]);
const getFilesMock = jest.fn(async () => [[{ name: 'a.txt' }, { name: 'b.txt' }]]);
const getSignedUrlMock = jest.fn(async () => ['https://gcs.local/signed']);

jest.mock('@google-cloud/storage', () => {
  class File {
    constructor(public name: string) {}
    save = saveMock;
    download = downloadMock;
    delete = deleteMock;
    exists = existsMock;
    getSignedUrl = getSignedUrlMock;
  }
  class Bucket {
    file(name: string) {
      return new File(name);
    }
    getFiles = getFilesMock;
  }
  class Storage {
    bucket(_name: string) {
      return new Bucket();
    }
    constructor(_cfg?: any) {}
  }
  return { Storage };
});

describe('GCSStorageAdapter (mocked SDK)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, GCS_BUCKET: 'test', GCP_PROJECT_ID: 'p' };
    saveMock.mockClear();
    downloadMock.mockClear();
    deleteMock.mockClear();
    existsMock.mockClear();
    getFilesMock.mockClear();
    getSignedUrlMock.mockClear();
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('basic ops and signed url', async () => {
    const adapter = new GCSStorageAdapter();
    await adapter.upload('f.txt', Buffer.from('x'));
    const b = await adapter.download('f.txt');
    expect(b.toString()).toBe('hi');
    expect(await adapter.exists('f.txt')).toBe(true);
    const list = await adapter.list();
    expect(list).toEqual(['a.txt', 'b.txt']);
    await adapter.delete('f.txt');
    const url = await adapter.getSignedUrl('f.txt', 'get', 60);
    expect(url).toContain('https://');
  });
});
