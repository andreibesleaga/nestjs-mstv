import { AzureBlobStorageAdapter } from '../src/common/storage/adapters/azure.adapter';

const uploadDataMock = jest.fn(async () => ({}));
const downloadMock = jest.fn(async () => ({ readableStreamBody: mockStream(Buffer.from('hi')) }));
const deleteIfExistsMock = jest.fn(async () => ({}));
const existsMock = jest.fn(async () => true);
const listBlobsFlatAsync = async function* (_opts?: any) {
  yield { name: 'a.txt' };
  yield { name: 'b.txt' };
};

function mockStream(buf: Buffer) {
  const { Readable } = require('stream');
  const s = new Readable();
  s.push(buf);
  s.push(null);
  return s;
}

jest.mock('@azure/storage-blob', () => {
  class BlockBlobClient {
    uploadData = uploadDataMock;
    download = downloadMock;
    deleteIfExists = deleteIfExistsMock;
    exists = existsMock;
    generateSasUrl = async (_opts?: any) => 'https://blob.local/signed';
    constructor(public url: string) {}
  }
  class ContainerClient {
    getBlockBlobClient(name: string) {
      return new BlockBlobClient(name);
    }
    async *listBlobsFlat(_opts?: any) {
      yield* listBlobsFlatAsync();
    }
  }
  class BlobServiceClient {
    static fromConnectionString(_s: string) {
      return new BlobServiceClient();
    }
    getContainerClient(_name: string) {
      return new ContainerClient();
    }
    constructor(_url?: string, _cred?: any) {}
  }
  class StorageSharedKeyCredential {
    constructor(_a: string, _k: string) {}
  }
  const generateBlobSASQueryParameters = jest.fn(() => ({ toString: () => 'sig=abc' }));
  const BlobSASPermissions = { parse: (_s: string) => ({}) } as any;
  const SASProtocol = { Https: 'https' } as any;
  return {
    BlobServiceClient,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
    SASProtocol,
  };
});

describe('AzureBlobStorageAdapter (mocked SDK)', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...OLD_ENV,
      AZURE_BLOB_CONTAINER: 'test',
      AZURE_STORAGE_CONNECTION_STRING: 'UseDevelopmentStorage=true',
    };
    uploadDataMock.mockClear();
    downloadMock.mockClear();
    deleteIfExistsMock.mockClear();
    existsMock.mockClear();
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('basic ops and signed url', async () => {
    const adapter = new AzureBlobStorageAdapter();
    await adapter.upload('f.txt', Buffer.from('x'), { contentType: 'text/plain' });
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
